//
//  MealViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Meal management with AI-powered nutrition analysis
//

import Foundation
import Combine
import UIKit

@MainActor
class MealViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var meals: [Meal] = []
    @Published var todaysMeals: [Meal] = []
    @Published var isLoading: Bool = false
    @Published var isAnalyzing: Bool = false
    @Published var errorMessage: String?
    @Published var showingAddMeal: Bool = false
    @Published var selectedMeal: Meal?

    // Analytics
    @Published var analyticsMeals: [Meal] = []
    @Published var analyticsDaily: [MealAnalyticsDay] = []
    @Published var analyticsSummary: MealAnalyticsSummary?
    @Published var isAnalyticsLoading: Bool = false
    @Published var analyticsErrorMessage: String?
    
    // Nutrition summary
    @Published var todayHealthRating: Double = 0
    @Published var todayCalories: Double = 0
    @Published var todayProtein: Double = 0
    @Published var todayCarbs: Double = 0
    @Published var todayFat: Double = 0
    
    // MARK: - Dependencies
    private let mealRepository: MealRepository
    private let claudeService: ClaudeAPIService
    private let supabaseService: SupabaseService
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(
        mealRepository: MealRepository,
        claudeService: ClaudeAPIService? = nil,
        supabaseService: SupabaseService? = nil
    ) {
        self.mealRepository = mealRepository
        self.claudeService = claudeService ?? ClaudeAPIService()
        self.supabaseService = supabaseService ?? SupabaseService()
        
        setupBindings()
        loadMeals()
    }
    
    // MARK: - Public Methods
    
    func loadMeals() {
        meals = mealRepository.getAll()
        todaysMeals = mealRepository.getMeals(for: Date())
        updateNutritionSummary()
    }

    func loadAnalytics(days: Int = 7) async {
        isAnalyticsLoading = true
        analyticsErrorMessage = nil
        defer { isAnalyticsLoading = false }

        guard let userId = supabaseService.getCurrentUserId() else {
            analyticsMeals = []
            analyticsDaily = []
            analyticsSummary = nil
            analyticsErrorMessage = "Sign in to view meal analytics."
            return
        }

        let calendar = Calendar.current
        let endOfToday = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: Date())) ?? Date()
        let startDate = calendar.date(byAdding: .day, value: -(days - 1), to: calendar.startOfDay(for: Date())) ?? Date()

        do {
            let remoteMeals = try await supabaseService.fetchMeals(userId: userId, from: startDate, to: endOfToday)
            let convertedMeals = remoteMeals.map { $0.toMeal() }
            analyticsMeals = convertedMeals.sorted { $0.consumedAt > $1.consumedAt }
            analyticsDaily = buildAnalyticsDaily(days: days, startDate: startDate)
            analyticsSummary = buildAnalyticsSummary(days: days)
        } catch {
            analyticsMeals = []
            analyticsDaily = []
            analyticsSummary = nil
            analyticsErrorMessage = "Unable to load analytics. Please try again."
        }
    }
    
    func addMeal(_ meal: Meal) {
        do {
            try mealRepository.create(meal)
            loadMeals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func updateMeal(_ meal: Meal) {
        do {
            try mealRepository.update(meal)
            loadMeals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func deleteMeal(_ meal: Meal) {
        do {
            try mealRepository.delete(meal)
            loadMeals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    /// Capture and analyze a meal from an image (does not persist)
    func captureAndAnalyzeMeal(image: UIImage, mealType: MealType) async throws -> Meal {
        isAnalyzing = true
        defer { isAnalyzing = false }
        
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw MealError.invalidImage
        }
        
        // Analyze the food image with Claude
        let analysis = try await claudeService.analyzeFoodImage(imageData: imageData, mealType: mealType)
        
        // Upload image to Supabase
        var imageURL: String?
        do {
            imageURL = try await supabaseService.uploadMealImage(data: imageData)
        } catch {
            print("Failed to upload image: \(error)")
            // Continue without image URL
        }
        
        // Create meal from analysis
        let foodGroups = analysis.foodGroups.compactMap { FoodGroup(rawValue: $0) }
        
        let meal = Meal(
            name: analysis.mealName,
            mealType: mealType,
            totalCalories: analysis.estimatedCalories,
            totalProtein: analysis.estimatedProtein,
            totalCarbs: analysis.estimatedCarbs,
            totalFat: analysis.estimatedFat,
            healthRating: analysis.healthRating,
            gutHealthScore: analysis.gutHealthScore,
            proteinQualityScore: analysis.proteinQualityScore,
            fiberScore: analysis.fiberScore,
            sugarScore: analysis.sugarScore,
            vitaminsSummary: analysis.vitaminsSummary,
            foodGroups: foodGroups,
            aiAnalysis: analysis.analysis,
            imageURL: imageURL
        )
        
        return meal
    }
    
    /// Get average health rating for today
    func getTodayAverageHealthRating() -> Double {
        guard !todaysMeals.isEmpty else { return 0 }
        let total = todaysMeals.reduce(0) { $0 + $1.healthRating }
        return total / Double(todaysMeals.count)
    }
    
    /// Get health rating color
    func getHealthRatingColor(for rating: Double) -> String {
        if rating >= 80 { return "success" }
        if rating >= 60 { return "appPrimary" }
        if rating >= 40 { return "warning" }
        return "error"
    }
    
    /// Get meals grouped by type for today
    func getTodayMealsByType() -> [MealType: [Meal]] {
        var grouped: [MealType: [Meal]] = [:]
        for type in MealType.allCases {
            grouped[type] = todaysMeals.filter { $0.mealType == type }
        }
        return grouped
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        mealRepository.$meals
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.loadMeals()
            }
            .store(in: &cancellables)
    }
    
    private func updateNutritionSummary() {
        todayHealthRating = getTodayAverageHealthRating()
        todayCalories = todaysMeals.reduce(0) { $0 + $1.totalCalories }
        todayProtein = todaysMeals.reduce(0) { $0 + $1.totalProtein }
        todayCarbs = todaysMeals.reduce(0) { $0 + $1.totalCarbs }
        todayFat = todaysMeals.reduce(0) { $0 + $1.totalFat }
    }

    private func buildAnalyticsDaily(days: Int, startDate: Date) -> [MealAnalyticsDay] {
        let calendar = Calendar.current
        var daysData: [MealAnalyticsDay] = []

        for dayOffset in 0..<days {
            guard let dayDate = calendar.date(byAdding: .day, value: dayOffset, to: startDate) else { continue }
            let dayStart = calendar.startOfDay(for: dayDate)
            let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart

            let mealsForDay = analyticsMeals.filter { $0.consumedAt >= dayStart && $0.consumedAt < dayEnd }

            let healthAvg = average(mealsForDay.map { $0.healthRating })
            let gutAvg = average(mealsForDay.map { $0.gutHealthScore })
            let proteinQualityAvg = average(mealsForDay.map { $0.proteinQualityScore })
            let fiberAvg = average(mealsForDay.map { $0.fiberScore })
            let sugarAvg = average(mealsForDay.map { $0.sugarScore })

            let caloriesTotal = mealsForDay.reduce(0) { $0 + $1.totalCalories }
            let proteinTotal = mealsForDay.reduce(0) { $0 + $1.totalProtein }

            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEE"
            let dayLabel = dayFormatter.string(from: dayDate)

            daysData.append(MealAnalyticsDay(
                date: dayDate,
                dayLabel: dayLabel,
                isToday: calendar.isDateInToday(dayDate),
                healthRatingAvg: healthAvg,
                caloriesTotal: caloriesTotal,
                proteinTotal: proteinTotal,
                fiberScoreAvg: fiberAvg,
                gutHealthScoreAvg: gutAvg,
                proteinQualityScoreAvg: proteinQualityAvg,
                sugarScoreAvg: sugarAvg
            ))
        }

        return daysData
    }

    private func buildAnalyticsSummary(days: Int) -> MealAnalyticsSummary? {
        guard !analyticsMeals.isEmpty else { return nil }

        let totalCalories = analyticsMeals.reduce(0) { $0 + $1.totalCalories }
        let totalProtein = analyticsMeals.reduce(0) { $0 + $1.totalProtein }

        let averageHealth = average(analyticsMeals.map { $0.healthRating })
        let averageGut = average(analyticsMeals.map { $0.gutHealthScore })
        let averageProteinQuality = average(analyticsMeals.map { $0.proteinQualityScore })
        let averageFiber = average(analyticsMeals.map { $0.fiberScore })
        let averageSugar = average(analyticsMeals.map { $0.sugarScore })

        let averageCaloriesPerDay = totalCalories / Double(max(days, 1))
        let averageProteinPerDay = totalProtein / Double(max(days, 1))

        return MealAnalyticsSummary(
            totalCalories: totalCalories,
            totalProtein: totalProtein,
            averageHealthRating: averageHealth,
            averageGutHealthScore: averageGut,
            averageProteinQualityScore: averageProteinQuality,
            averageFiberScore: averageFiber,
            averageSugarScore: averageSugar,
            averageCaloriesPerDay: averageCaloriesPerDay,
            averageProteinPerDay: averageProteinPerDay
        )
    }

    private func average(_ values: [Double]) -> Double {
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }
}

struct MealAnalyticsDay: Identifiable {
    let id = UUID()
    let date: Date
    let dayLabel: String
    let isToday: Bool
    let healthRatingAvg: Double
    let caloriesTotal: Double
    let proteinTotal: Double
    let fiberScoreAvg: Double
    let gutHealthScoreAvg: Double
    let proteinQualityScoreAvg: Double
    let sugarScoreAvg: Double
}

struct MealAnalyticsSummary {
    let totalCalories: Double
    let totalProtein: Double
    let averageHealthRating: Double
    let averageGutHealthScore: Double
    let averageProteinQualityScore: Double
    let averageFiberScore: Double
    let averageSugarScore: Double
    let averageCaloriesPerDay: Double
    let averageProteinPerDay: Double
}

// MARK: - Errors

enum MealError: LocalizedError {
    case invalidImage
    case analysisFailure
    
    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Could not process the image"
        case .analysisFailure:
            return "Failed to analyze the meal"
        }
    }
}
