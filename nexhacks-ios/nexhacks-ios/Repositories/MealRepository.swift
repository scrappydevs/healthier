//
//  MealRepository.swift
//  nexhacks-ios
//
//  Repository for Meal data access
//

import Foundation
import Combine

@MainActor
class MealRepository: ObservableObject {
    @Published var meals: [Meal] = []

    // In-memory storage (will be replaced with Core Data/SwiftData)
    private var storage: [Meal] = []
    
    private let supabaseService: SupabaseService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(supabaseService: SupabaseService? = nil) {
        self.supabaseService = supabaseService ?? SupabaseService()
        loadLocalMeals()
        
        Task {
            try? await syncFromSupabase()
        }
    }

    // MARK: - Public Methods

    /// Create a new meal
    func create(_ meal: Meal) throws {
        storage.append(meal)
        updatePublished()
        saveLocalMeals()
        
        Task {
            do {
                let supabaseMeal = meal.toSupabaseMeal(userId: supabaseService.getCurrentUserId() ?? UUID())
                try await supabaseService.saveMeal(supabaseMeal)
            } catch {
                print("Failed to sync meal creation to Supabase: \(error)")
            }
        }
    }

    /// Get meal by ID
    func getById(_ id: UUID) -> Meal? {
        return storage.first { $0.id == id }
    }

    /// Update meal
    func update(_ meal: Meal) throws {
        guard let index = storage.firstIndex(where: { $0.id == meal.id }) else {
            throw RepositoryError.notFound
        }

        var updatedMeal = meal
        updatedMeal.updatedAt = Date()
        storage[index] = updatedMeal
        updatePublished()
        saveLocalMeals()
        
        Task {
            do {
                let supabaseMeal = updatedMeal.toSupabaseMeal(userId: supabaseService.getCurrentUserId() ?? UUID())
                try await supabaseService.updateMeal(supabaseMeal)
            } catch {
                print("Failed to sync meal update to Supabase: \(error)")
            }
        }
    }

    /// Delete meal
    func delete(_ meal: Meal) throws {
        storage.removeAll { $0.id == meal.id }
        updatePublished()
        saveLocalMeals()
        
        Task {
            do {
                try await supabaseService.deleteMeal(id: meal.id)
            } catch {
                print("Failed to sync meal deletion to Supabase: \(error)")
            }
        }
    }

    /// Get all meals
    func getAll() -> [Meal] {
        return storage
    }

    /// Get meals for a specific date
    func getMeals(for date: Date) -> [Meal] {
        let calendar = Calendar.current
        return storage.filter { calendar.isDate($0.consumedAt, inSameDayAs: date) }
    }

    /// Get meals by type
    func getMeals(ofType type: MealType) -> [Meal] {
        return storage.filter { $0.mealType == type }
    }

    /// Get total calories for a date
    func getTotalCalories(for date: Date) -> Double {
        return getMeals(for: date).reduce(0) { $0 + $1.totalCalories }
    }
    
    /// Sync meals from Supabase
    func syncFromSupabase() async throws {
        let remoteMeals = try await supabaseService.fetchMeals()
        let convertedMeals = remoteMeals.map { $0.toMeal() }
        
        // Merge strategy: remote wins if newer
        for remoteMeal in convertedMeals {
            if let localIndex = storage.firstIndex(where: { $0.id == remoteMeal.id }) {
                if remoteMeal.updatedAt > storage[localIndex].updatedAt {
                    storage[localIndex] = remoteMeal
                }
            } else {
                storage.append(remoteMeal)
            }
        }
        
        updatePublished()
        saveLocalMeals()
    }

    // MARK: - Private Methods

    private func updatePublished() {
        meals = storage.sorted { $0.consumedAt > $1.consumedAt }
    }
    
    private func loadLocalMeals() {
        if let data = UserDefaults.standard.data(forKey: "meals_cache"),
           let decoded = try? JSONDecoder().decode([Meal].self, from: data) {
            storage = decoded
            updatePublished()
        }
    }
    
    private func saveLocalMeals() {
        if let encoded = try? JSONEncoder().encode(storage) {
            UserDefaults.standard.set(encoded, forKey: "meals_cache")
        }
    }
}

// MARK: - Extensions for Conversion

extension Meal {
    func toSupabaseMeal(userId: UUID) -> SupabaseMeal {
        return SupabaseMeal(
            id: id,
            userId: userId,
            name: name,
            mealType: mealType.rawValue,
            consumedAt: consumedAt,
            imageUrl: imageURL,
            totalCalories: totalCalories,
            totalProtein: totalProtein,
            totalCarbs: totalCarbs,
            totalFat: totalFat,
            healthRating: healthRating,
            gutHealthScore: gutHealthScore,
            proteinQualityScore: proteinQualityScore,
            fiberScore: fiberScore,
            sugarScore: sugarScore,
            vitaminsSummary: vitaminsSummary,
            foodGroups: foodGroups.map { $0.rawValue },
            aiAnalysis: aiAnalysis,
            notes: notes,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

extension SupabaseMeal {
    func toMeal() -> Meal {
        return Meal(
            id: id,
            name: name,
            mealType: MealType(rawValue: mealType) ?? .lunch,
            consumedAt: consumedAt ?? Date(),
            foods: [], // Foods details not in simple SupabaseMeal yet, could expand later
            totalCalories: totalCalories,
            totalProtein: totalProtein,
            totalCarbs: totalCarbs,
            totalFat: totalFat,
            healthRating: healthRating,
            gutHealthScore: gutHealthScore ?? 0,
            proteinQualityScore: proteinQualityScore ?? 0,
            fiberScore: fiberScore ?? 0,
            sugarScore: sugarScore ?? 0,
            vitaminsSummary: vitaminsSummary,
            foodGroups: foodGroups.compactMap { FoodGroup(rawValue: $0) },
            aiAnalysis: aiAnalysis,
            notes: notes,
            imageURL: imageUrl,
            createdAt: createdAt ?? Date(),
            updatedAt: updatedAt ?? Date()
        )
    }
}
