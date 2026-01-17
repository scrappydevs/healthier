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

    // MARK: - Initialization
    init() {
        loadSampleData()
    }

    // MARK: - Public Methods

    /// Create a new meal
    func create(_ meal: Meal) throws {
        storage.append(meal)
        updatePublished()
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
    }

    /// Delete meal
    func delete(_ meal: Meal) throws {
        storage.removeAll { $0.id == meal.id }
        updatePublished()
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

    // MARK: - Private Methods

    private func updatePublished() {
        meals = storage.sorted { $0.consumedAt > $1.consumedAt }
    }

    private func loadSampleData() {
        let breakfast = Meal(
            name: "Oatmeal with Berries",
            mealType: .breakfast,
            consumedAt: Calendar.current.date(bySettingHour: 8, minute: 0, second: 0, of: Date())!,
            foods: [
                Food(name: "Oatmeal", servingSize: "1 cup", calories: 150, protein: 5, carbs: 27, fat: 3),
                Food(name: "Blueberries", servingSize: "1/2 cup", calories: 40, protein: 0.5, carbs: 10, fat: 0.5)
            ],
            totalCalories: 190,
            totalProtein: 5.5,
            totalCarbs: 37,
            totalFat: 3.5
        )

        storage = [breakfast]
        updatePublished()
    }
}
