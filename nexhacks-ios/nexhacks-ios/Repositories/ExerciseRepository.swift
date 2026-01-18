//
//  ExerciseRepository.swift
//  nexhacks-ios
//
//  Repository for Exercise data access with Supabase sync
//

import Foundation
import Combine
import Supabase

@MainActor
class ExerciseRepository: ObservableObject {
    @Published var exercises: [Exercise] = []

    private let supabaseService: SupabaseService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(supabaseService: SupabaseService? = nil) {
        self.supabaseService = supabaseService ?? SupabaseService()
    }

    // MARK: - Public Methods

    /// Create a new exercise and sync to Supabase
    func create(_ exercise: Exercise) async throws {
        try await supabaseService.saveExercise(exercise)
        try await loadExercises()
    }

    /// Get exercise by ID
    func getById(_ id: UUID) -> Exercise? {
        return exercises.first { $0.id == id }
    }

    /// Update exercise in Supabase
    func update(_ exercise: Exercise) async throws {
        try await supabaseService.updateExercise(exercise)
        try await loadExercises()
    }

    /// Delete exercise from Supabase
    func delete(_ exercise: Exercise) async throws {
        try await supabase.from("exercises")
            .delete()
            .eq("id", value: exercise.id.uuidString)
            .execute()

        try await loadExercises()
    }

    /// Get all exercises
    func getAll() -> [Exercise] {
        return exercises
    }

    /// Get exercises for a specific date
    func getExercises(for date: Date) -> [Exercise] {
        let calendar = Calendar.current
        return exercises.filter { calendar.isDate($0.startTime, inSameDayAs: date) }
    }

    /// Get exercises by type
    func getExercises(ofType type: ExerciseType) -> [Exercise] {
        return exercises.filter { $0.type == type }
    }

    /// Get total calories burned for a date
    func getTotalCaloriesBurned(for date: Date) -> Double {
        return getExercises(for: date).reduce(0) { $0 + $1.caloriesBurned }
    }

    /// Get total duration for a date
    func getTotalDuration(for date: Date) -> TimeInterval {
        return getExercises(for: date).reduce(0) { $0 + $1.duration }
    }

    /// Reload exercises from Supabase
    func loadExercises() async throws {
        exercises = try await supabaseService.fetchExercises()
    }

    // MARK: - Private Methods

    private func updatePublished() {
        exercises = exercises.sorted { $0.startTime > $1.startTime }
    }
}
