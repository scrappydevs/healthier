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
    
    func addMeal(_ meal: Meal) {
        do {
            try mealRepository.create(meal)
            loadMeals()
            
            // Sync to Supabase in background
            Task {
                await syncMealToSupabase(meal)
            }
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
    
    /// Capture and analyze a meal from an image
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
            vitaminsSummary: analysis.vitaminsSummary,
            foodGroups: foodGroups,
            aiAnalysis: analysis.analysis,
            imageURL: imageURL
        )
        
        // Save the meal
        addMeal(meal)
        
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
    
    private func syncMealToSupabase(_ meal: Meal) async {
        guard let currentUserId = supabaseService.getCurrentUserId() else {
            print("Cannot sync meal: No authenticated user")
            return
        }
        
        let supabaseMeal = SupabaseMeal(
            id: meal.id,
            userId: currentUserId,
            name: meal.name,
            mealType: meal.mealType.rawValue.lowercased(),
            consumedAt: meal.consumedAt,
            imageUrl: meal.imageURL,
            totalCalories: meal.totalCalories,
            totalProtein: meal.totalProtein,
            totalCarbs: meal.totalCarbs,
            totalFat: meal.totalFat,
            healthRating: meal.healthRating,
            vitaminsSummary: meal.vitaminsSummary,
            foodGroups: meal.foodGroups.map { $0.rawValue },
            aiAnalysis: meal.aiAnalysis,
            notes: meal.notes
        )
        
        do {
            try await supabaseService.saveMeal(supabaseMeal)
        } catch {
            print("Failed to sync meal to Supabase: \(error)")
        }
    }
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
