//
//  ExerciseRepository.swift
//  nexhacks-ios
//
//  Repository for Exercise data access
//

import Foundation
import Combine

@MainActor
class ExerciseRepository: ObservableObject {
    @Published var exercises: [Exercise] = []

    // In-memory storage (will be replaced with Core Data/SwiftData)
    private var storage: [Exercise] = []

    // MARK: - Initialization
    init() {
        loadSampleData()
    }

    // MARK: - Public Methods

    /// Create a new exercise
    func create(_ exercise: Exercise) throws {
        storage.append(exercise)
        updatePublished()
    }

    /// Get exercise by ID
    func getById(_ id: UUID) -> Exercise? {
        return storage.first { $0.id == id }
    }

    /// Update exercise
    func update(_ exercise: Exercise) throws {
        guard let index = storage.firstIndex(where: { $0.id == exercise.id }) else {
            throw RepositoryError.notFound
        }

        var updatedExercise = exercise
        updatedExercise.updatedAt = Date()
        storage[index] = updatedExercise
        updatePublished()
    }

    /// Delete exercise
    func delete(_ exercise: Exercise) throws {
        storage.removeAll { $0.id == exercise.id }
        updatePublished()
    }

    /// Get all exercises
    func getAll() -> [Exercise] {
        return storage
    }

    /// Get exercises for a specific date
    func getExercises(for date: Date) -> [Exercise] {
        let calendar = Calendar.current
        return storage.filter { calendar.isDate($0.startTime, inSameDayAs: date) }
    }

    /// Get exercises by type
    func getExercises(ofType type: ExerciseType) -> [Exercise] {
        return storage.filter { $0.type == type }
    }

    /// Get total calories burned for a date
    func getTotalCaloriesBurned(for date: Date) -> Double {
        return getExercises(for: date).reduce(0) { $0 + $1.caloriesBurned }
    }

    /// Get total duration for a date
    func getTotalDuration(for date: Date) -> TimeInterval {
        return getExercises(for: date).reduce(0) { $0 + $1.duration }
    }

    // MARK: - Private Methods

    private func updatePublished() {
        exercises = storage.sorted { $0.startTime > $1.startTime }
    }

    private func loadSampleData() {
        let running = Exercise(
            name: "Morning Run",
            type: .running,
            duration: 1800, // 30 minutes
            caloriesBurned: 300,
            distance: 5000, // 5 km
            startTime: Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date())!,
            endTime: Calendar.current.date(bySettingHour: 7, minute: 30, second: 0, of: Date())!,
            heartRateAvg: 145,
            heartRateMax: 165
        )

        storage = [running]
        updatePublished()
    }
}
