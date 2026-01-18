//
//  ExerciseViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Exercise management with video upload
//

import Foundation
import Combine
import AVFoundation

@MainActor
class ExerciseViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var exercises: [Exercise] = []
    @Published var todaysExercises: [Exercise] = []
    @Published var isLoading: Bool = false
    @Published var isUploading: Bool = false
    @Published var uploadProgress: Double = 0.0
    @Published var errorMessage: String?
    @Published var showingAddExercise: Bool = false
    @Published var selectedExercise: Exercise?
    
    // Exercise summary
    @Published var totalMinutesToday: Int = 0
    @Published var totalCaloriesBurnedToday: Double = 0
    @Published var exerciseScore: Double = 0 // 0-100
    
    // MARK: - Dependencies
    private let exerciseRepository: ExerciseRepository
    private let supabaseService: SupabaseService
    
    private var cancellables = Set<AnyCancellable>()
    
    // Exercise goals
    private let dailyExerciseGoalMinutes: Double = 30
    
    // MARK: - Initialization
    init(
        exerciseRepository: ExerciseRepository,
        supabaseService: SupabaseService? = nil
    ) {
        self.exerciseRepository = exerciseRepository
        self.supabaseService = supabaseService ?? SupabaseService()
        
        setupBindings()
        loadExercises()
    }
    
    // MARK: - Public Methods
    
    func loadExercises() {
        exercises = exerciseRepository.getAll()
        todaysExercises = exerciseRepository.getExercises(for: Date())
        updateExerciseSummary()
    }
    
    func addExercise(_ exercise: Exercise) {
        do {
            try exerciseRepository.create(exercise)
            loadExercises()
            
            // Sync to Supabase in background
            Task {
                await syncExerciseToSupabase(exercise)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func updateExercise(_ exercise: Exercise) {
        do {
            try exerciseRepository.update(exercise)
            loadExercises()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func deleteExercise(_ exercise: Exercise) {
        do {
            try exerciseRepository.delete(exercise)
            loadExercises()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    /// Upload exercise video and create exercise entry
    func uploadExerciseVideo(videoURL: URL, name: String, type: ExerciseType, duration: TimeInterval) async throws -> Exercise {
        isUploading = true
        defer { isUploading = false }
        
        // Read video data
        let videoData = try Data(contentsOf: videoURL)
        
        // Upload to Supabase
        let uploadedURL = try await supabaseService.uploadExerciseVideo(data: videoData)
        
        // Estimate calories burned based on type and duration
        let caloriesBurned = estimateCaloriesBurned(type: type, durationMinutes: duration / 60)
        
        // Create exercise
        let exercise = Exercise(
            name: name,
            type: type,
            duration: duration,
            caloriesBurned: caloriesBurned,
            startTime: Date().addingTimeInterval(-duration),
            endTime: Date(),
            videoURL: uploadedURL
        )
        
        addExercise(exercise)
        
        return exercise
    }
    
    /// Create a quick exercise entry without video
    func logQuickExercise(name: String, type: ExerciseType, durationMinutes: Int) {
        let duration = TimeInterval(durationMinutes * 60)
        let caloriesBurned = estimateCaloriesBurned(type: type, durationMinutes: Double(durationMinutes))
        
        let exercise = Exercise(
            name: name,
            type: type,
            duration: duration,
            caloriesBurned: caloriesBurned,
            startTime: Date().addingTimeInterval(-duration),
            endTime: Date()
        )
        
        addExercise(exercise)
    }
    
    /// Calculate exercise score based on daily goal
    func calculateExerciseScore() -> Double {
        let minutesExercised = Double(totalMinutesToday)
        let score = min((minutesExercised / dailyExerciseGoalMinutes) * 100, 100)
        return score
    }
    
    /// Get exercises grouped by type
    func getExercisesByType() -> [ExerciseType: [Exercise]] {
        var grouped: [ExerciseType: [Exercise]] = [:]
        for type in ExerciseType.allCases {
            let filtered = todaysExercises.filter { $0.type == type }
            if !filtered.isEmpty {
                grouped[type] = filtered
            }
        }
        return grouped
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        exerciseRepository.$exercises
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.loadExercises()
            }
            .store(in: &cancellables)
    }
    
    private func updateExerciseSummary() {
        let totalDuration = exerciseRepository.getTotalDuration(for: Date())
        totalMinutesToday = Int(totalDuration / 60)
        totalCaloriesBurnedToday = exerciseRepository.getTotalCaloriesBurned(for: Date())
        exerciseScore = calculateExerciseScore()
    }
    
    private func estimateCaloriesBurned(type: ExerciseType, durationMinutes: Double) -> Double {
        // Rough MET values for different exercise types
        let metValue: Double
        switch type {
        case .running:
            metValue = 9.8
        case .walking:
            metValue = 3.5
        case .cycling:
            metValue = 7.5
        case .swimming:
            metValue = 8.0
        case .yoga:
            metValue = 2.5
        case .weightlifting:
            metValue = 6.0
        case .hiit:
            metValue = 12.0
        case .sports:
            metValue = 7.0
        case .other:
            metValue = 5.0
        }
        
        // Calories = MET * weight(kg) * time(hours)
        // Using average weight of 70kg
        let weightKg = 70.0
        let timeHours = durationMinutes / 60.0
        return metValue * weightKg * timeHours
    }
    
    private func syncExerciseToSupabase(_ exercise: Exercise) async {
        do {
            try await supabaseService.saveExercise(exercise)
        } catch {
            print("Failed to sync exercise to Supabase: \(error)")
            await MainActor.run {
                errorMessage = "Failed to sync exercise: \(error.localizedDescription)"
            }
        }
    }
}
