//
//  Meal.swift
//  nexhacks-ios
//
//  Meal tracking model with nutritional information
//

import Foundation

struct Meal: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var mealType: MealType
    var consumedAt: Date
    var foods: [Food]
    var totalCalories: Double
    var totalProtein: Double // in grams
    var totalCarbs: Double // in grams
    var totalFat: Double // in grams
    var healthRating: Double // 0-100 scale
    var vitaminsSummary: String?
    var foodGroups: [FoodGroup]
    var aiAnalysis: String?
    var notes: String?
    var imageURL: String?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        mealType: MealType,
        consumedAt: Date = Date(),
        foods: [Food] = [],
        totalCalories: Double = 0,
        totalProtein: Double = 0,
        totalCarbs: Double = 0,
        totalFat: Double = 0,
        healthRating: Double = 0,
        vitaminsSummary: String? = nil,
        foodGroups: [FoodGroup] = [],
        aiAnalysis: String? = nil,
        notes: String? = nil,
        imageURL: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.mealType = mealType
        self.consumedAt = consumedAt
        self.foods = foods
        self.totalCalories = totalCalories
        self.totalProtein = totalProtein
        self.totalCarbs = totalCarbs
        self.totalFat = totalFat
        self.healthRating = healthRating
        self.vitaminsSummary = vitaminsSummary
        self.foodGroups = foodGroups
        self.aiAnalysis = aiAnalysis
        self.notes = notes
        self.imageURL = imageURL
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

enum FoodGroup: String, Codable, CaseIterable {
    case protein = "Protein"
    case vegetables = "Vegetables"
    case fruits = "Fruits"
    case grains = "Grains"
    case dairy = "Dairy"
    case fats = "Fats/Oils"
}

enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"
}

struct Food: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var servingSize: String
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double

    init(
        id: UUID = UUID(),
        name: String,
        servingSize: String,
        calories: Double,
        protein: Double,
        carbs: Double,
        fat: Double
    ) {
        self.id = id
        self.name = name
        self.servingSize = servingSize
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
    }
}
