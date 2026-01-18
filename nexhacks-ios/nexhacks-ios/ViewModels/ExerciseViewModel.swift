//
//  ExerciseViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Exercise management with video upload
//

import Foundation
import Combine
import AVFoundation
import Supabase

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
    
    // Clinician-assigned exercise plan (web -> iOS)
    @Published var exercisePlanItems: [ExercisePlanItem] = []

    // Exercise summary
    @Published var totalMinutesToday: Int = 0
    @Published var totalCaloriesBurnedToday: Double = 0
    @Published var exerciseScore: Double = 0 // 0-100
    
    // MARK: - Dependencies
    private let exerciseRepository: ExerciseRepository
    private let supabaseService: SupabaseService
    private let notificationService: NotificationService
    
    private var cancellables = Set<AnyCancellable>()
    private var authStateListener: Task<Void, Never>?
    
    private let reminderTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
    
    // Exercise goals
    private let dailyExerciseGoalMinutes: Double = 30
    
    // MARK: - Initialization
    init(
        exerciseRepository: ExerciseRepository,
        supabaseService: SupabaseService? = nil,
        notificationService: NotificationService? = nil
    ) {
        self.exerciseRepository = exerciseRepository
        self.supabaseService = supabaseService ?? SupabaseService()
        self.notificationService = notificationService ?? NotificationService()
        
        setupBindings()
        loadExercises()
        startAuthStateListener()
        
        Task {
            await loadExercisePlanFromSupabase()
        }
    }
    
    deinit {
        authStateListener?.cancel()
    }
    
    // MARK: - Public Methods
    
    func loadExercises() {
        Task {
            do {
                try await exerciseRepository.loadExercises()
                exercises = exerciseRepository.getAll()
                todaysExercises = exerciseRepository.getExercises(for: Date())
                updateExerciseSummary()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func addExercise(_ exercise: Exercise) {
        Task {
            do {
                isLoading = true
                defer { isLoading = false }

                try await exerciseRepository.create(exercise)
                exercises = exerciseRepository.getAll()
                todaysExercises = exerciseRepository.getExercises(for: Date())
                updateExerciseSummary()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func updateExercise(_ exercise: Exercise) {
        Task {
            do {
                isLoading = true
                defer { isLoading = false }

                try await exerciseRepository.update(exercise)
                exercises = exerciseRepository.getAll()
                todaysExercises = exerciseRepository.getExercises(for: Date())
                updateExerciseSummary()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func deleteExercise(_ exercise: Exercise) {
        Task {
            do {
                isLoading = true
                defer { isLoading = false }

                try await exerciseRepository.delete(exercise)
                exercises = exerciseRepository.getAll()
                todaysExercises = exerciseRepository.getExercises(for: Date())
                updateExerciseSummary()
            } catch {
                errorMessage = error.localizedDescription
            }
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
    
    private func startAuthStateListener() {
        authStateListener = Task { @MainActor in
            for await state in supabase.auth.authStateChanges {
                await handleAuthStateChange(state.event)
            }
        }
    }
    
    private func handleAuthStateChange(_ event: AuthChangeEvent) async {
        switch event {
        case .signedIn, .tokenRefreshed, .userUpdated:
            await loadExercisePlanFromSupabase()
        case .signedOut:
            let ids = exercisePlanItems.map(\.id)
            exercisePlanItems = []
            for id in ids {
                notificationService.cancelExerciseReminders(planItemId: id)
            }
        default:
            break
        }
    }
    
    private func loadExercisePlanFromSupabase() async {
        guard supabaseService.getCurrentUserId() != nil else {
            exercisePlanItems = []
            return
        }
        
        do {
            let rows = try await supabaseService.fetchExercisePlanItems()
            let mapped = rows.map { mapSupabaseExercisePlanItem($0) }
            exercisePlanItems = mapped
            
            // Schedule (or cancel) reminders for all items (idempotent)
            for item in mapped {
                do {
                    try await notificationService.scheduleExerciseReminder(planItem: item)
                } catch {
                    // Best-effort scheduling, keep UI functional
                    print("Failed to schedule exercise reminder: \(error)")
                }
            }
        } catch {
            print("Failed to load exercise plan from Supabase: \(error)")
        }
    }
    
    private func mapSupabaseExercisePlanItem(_ row: SupabaseExercisePlanItem) -> ExercisePlanItem {
        let times = row.reminderTimes.compactMap { parseReminderTime($0) }
        return ExercisePlanItem(
            id: row.id,
            name: row.name,
            category: row.category,
            frequency: row.frequency,
            reminderTimes: times,
            daysOfWeek: row.daysOfWeek ?? [],
            sets: row.sets,
            reps: row.reps,
            durationSeconds: row.durationSeconds,
            formNotes: row.formNotes,
            priority: row.priority,
            isActive: row.isActive,
            createdAt: row.createdAt ?? Date(),
            updatedAt: row.updatedAt ?? Date()
        )
    }
    
    private func parseReminderTime(_ value: String) -> Date? {
        guard let date = reminderTimeFormatter.date(from: value) else { return nil }
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: Date())
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
    
}
