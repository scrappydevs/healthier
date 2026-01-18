//
//  HomeViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Home screen with real-time tracking features
//

import Foundation
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    // Real-time tracking status
    @Published var syncStatus: String = "Not synced"
    @Published var locationStatus: String = "Not tracking"
    @Published var roomScanStatus: String = "No rooms scanned"

    // Quick stats
    @Published var todayMedications: [Medication] = []
    @Published var upcomingReminders: [Medication] = []
    @Published var todayCalories: Double = 0
    @Published var todayExerciseMinutes: Int = 0
    @Published var scannedRoomsCount: Int = 0
    @Published var todayJournalEntries: [JournalEntry] = []
    
    // Health scores
    @Published var mealHealthRating: Double = 0
    @Published var exerciseScore: Double = 0
    @Published var medicationAdherenceScore: Double = 0
    @Published var todaysMeals: [Meal] = []
    @Published var todaysExercises: [Exercise] = []
    
    // Goals
    private let dailyExerciseGoalMinutes: Double = 30
    private let dailyMealGoal: Int = 3

    // MARK: - Dependencies
    private let medicationRepository: MedicationRepository
    private let mealRepository: MealRepository
    private let exerciseRepository: ExerciseRepository
    private let roomRepository: RoomRepository
    private let journalRepository: JournalRepository
    private let syncService: SyncService
    private let locationService: LocationTrackingService
    private let roomPlanService: RoomPlanService
    private let notificationService: NotificationService

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(
        medicationRepository: MedicationRepository,
        mealRepository: MealRepository,
        exerciseRepository: ExerciseRepository,
        roomRepository: RoomRepository,
        journalRepository: JournalRepository,
        syncService: SyncService,
        locationService: LocationTrackingService,
        roomPlanService: RoomPlanService,
        notificationService: NotificationService
    ) {
        self.medicationRepository = medicationRepository
        self.mealRepository = mealRepository
        self.exerciseRepository = exerciseRepository
        self.roomRepository = roomRepository
        self.journalRepository = journalRepository
        self.syncService = syncService
        self.locationService = locationService
        self.roomPlanService = roomPlanService
        self.notificationService = notificationService

        setupBindings()
        loadData()
    }

    // MARK: - Public Methods

    func refreshData() {
        // Reload from Supabase to ensure latest data
        medicationRepository.reloadFromSupabase()
        loadData()
    }

    func triggerSync() {
        Task {
            do {
                try await syncService.syncAll()
                updateSyncStatus()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func startLocationTracking() {
        locationService.startTracking()
        updateLocationStatus()
    }

    func stopLocationTracking() {
        locationService.stopTracking()
        updateLocationStatus()
    }

    func startRoomScan() {
        // Room scanning is now initiated from RoomsListView
        // This method kept for compatibility but doesn't directly start scanning
        print("Navigate to Rooms tab to start scanning")
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // Observe medication changes
        medicationRepository.$medications
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateMedicationData()
            }
            .store(in: &cancellables)

        // Observe meal changes
        mealRepository.$meals
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateMealData()
            }
            .store(in: &cancellables)

        // Observe exercise changes
        exerciseRepository.$exercises
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateExerciseData()
            }
            .store(in: &cancellables)

        // Observe room changes
        roomRepository.$rooms
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateRoomData()
            }
            .store(in: &cancellables)

        // Observe journal changes
        journalRepository.$entries
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateJournalData()
            }
            .store(in: &cancellables)

        // Observe sync status
        syncService.$isSyncing
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateSyncStatus()
            }
            .store(in: &cancellables)

        // Observe location tracking
        locationService.$isTracking
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateLocationStatus()
            }
            .store(in: &cancellables)

        // Observe room scanning
        roomPlanService.$isScanning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateRoomScanStatus()
            }
            .store(in: &cancellables)
    }

    private func loadData() {
        updateMedicationData()
        updateMealData()
        updateExerciseData()
        updateRoomData()
        updateJournalData()
        updateSyncStatus()
        updateLocationStatus()
        updateRoomScanStatus()
        updateHealthScores()
    }

    private func updateMedicationData() {
        let activeMedications = medicationRepository.getActive()
        todayMedications = activeMedications

        // Get upcoming reminders (next 4 hours)
        let now = Date()
        let fourHoursLater = Calendar.current.date(byAdding: .hour, value: 4, to: now)!

        upcomingReminders = activeMedications.filter { medication in
            medication.reminderTimes.contains { reminderTime in
                let reminderDate = Calendar.current.date(bySettingHour: Calendar.current.component(.hour, from: reminderTime),
                                                          minute: Calendar.current.component(.minute, from: reminderTime),
                                                          second: 0,
                                                          of: now)!
                return reminderDate >= now && reminderDate <= fourHoursLater
            }
        }
    }

    private func updateMealData() {
        todaysMeals = mealRepository.getMeals(for: Date())
        todayCalories = mealRepository.getTotalCalories(for: Date())
        updateHealthScores()
    }

    private func updateExerciseData() {
        todaysExercises = exerciseRepository.getExercises(for: Date())
        let totalDuration = exerciseRepository.getTotalDuration(for: Date())
        todayExerciseMinutes = Int(totalDuration / 60)
        updateHealthScores()
    }

    private func updateRoomData() {
        scannedRoomsCount = roomRepository.getAll().count
    }

    private func updateJournalData() {
        todayJournalEntries = journalRepository.getByDate(Date())
    }

    private func updateSyncStatus() {
        if syncService.isSyncing {
            syncStatus = "Syncing..."
        } else if let lastSync = syncService.lastSyncDate {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .abbreviated
            syncStatus = "Synced \(formatter.localizedString(for: lastSync, relativeTo: Date()))"
        } else {
            syncStatus = "Not synced"
        }
    }

    private func updateLocationStatus() {
        if locationService.isTracking {
            locationStatus = "Tracking active"
        } else {
            locationStatus = "Not tracking"
        }
    }

    private func updateRoomScanStatus() {
        switch roomPlanService.scanningStatus {
        case .idle:
            roomScanStatus = scannedRoomsCount > 0 ? "\(scannedRoomsCount) rooms scanned" : "No rooms scanned"
        case .scanning:
            roomScanStatus = "Scanning in progress..."
        case .processing:
            roomScanStatus = "Processing scan..."
        case .completed:
            roomScanStatus = "\(scannedRoomsCount) rooms scanned"
        case .error(let error):
            roomScanStatus = "Error: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Health Score Calculations
    
    private func updateHealthScores() {
        // Calculate meal health rating (average of all meal ratings)
        if !todaysMeals.isEmpty {
            let totalRating = todaysMeals.reduce(0.0) { $0 + $1.healthRating }
            mealHealthRating = totalRating / Double(todaysMeals.count)
        } else {
            mealHealthRating = 0
        }
        
        // Calculate exercise score (based on goal)
        let minutesExercised = Double(todayExerciseMinutes)
        exerciseScore = min((minutesExercised / dailyExerciseGoalMinutes) * 100, 100)
        
        // Calculate medication adherence score
        medicationAdherenceScore = calculateMedicationAdherence()
        
    }
    
    private func calculateMedicationAdherence() -> Double {
        guard !todayMedications.isEmpty else { return 100 }
        
        let now = Date()
        let calendar = Calendar.current
        var scheduledCount = 0
        var takenCount = 0
        
        for medication in todayMedications {
            for reminderTime in medication.reminderTimes {
                let reminderDate = calendar.date(bySettingHour: calendar.component(.hour, from: reminderTime),
                                                  minute: calendar.component(.minute, from: reminderTime),
                                                  second: 0,
                                                  of: now)!
                
                // Only count reminders that have passed
                if reminderDate <= now {
                    scheduledCount += 1
                    
                    // Check if medication was taken around this time
                    let taken = medication.takenLog.contains { log in
                        abs(log.takenAt.timeIntervalSince(reminderDate)) <= 3600 // Within 1 hour
                    }
                    
                    if taken {
                        takenCount += 1
                    }
                }
            }
        }
        
        guard scheduledCount > 0 else { return 100 }
        return (Double(takenCount) / Double(scheduledCount)) * 100
    }
    
}
