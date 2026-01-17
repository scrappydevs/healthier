//
//  AppState.swift
//  nexhacks-ios
//
//  Central app state management with @StateObject and @EnvironmentObject
//

import Foundation
import Combine

@MainActor
class AppState: ObservableObject {
    // MARK: - Repositories
    let userRepository: UserRepository
    let medicationRepository: MedicationRepository
    let mealRepository: MealRepository
    let exerciseRepository: ExerciseRepository
    let roomRepository: RoomRepository
    let journalRepository: JournalRepository

    // MARK: - Services
    let syncService: SyncService
    let locationService: LocationTrackingService
    let roomPlanService: RoomPlanService
    let notificationService: NotificationService
    let liveKitService: LiveKitService
    let supabaseService: SupabaseService
    let claudeAPIService: ClaudeAPIService

    // MARK: - ViewModels
    let homeViewModel: HomeViewModel
    let medicationViewModel: MedicationViewModel
    let roomViewModel: RoomViewModel
    let journalViewModel: JournalViewModel
    let mealViewModel: MealViewModel
    let exerciseViewModel: ExerciseViewModel

    // MARK: - Published State
    @Published var isInitialized: Bool = false
    @Published var currentUser: User?

    // MARK: - Initialization
    init() {
        // Initialize Repositories
        self.userRepository = UserRepository()
        self.medicationRepository = MedicationRepository()
        self.mealRepository = MealRepository()
        self.exerciseRepository = ExerciseRepository()
        self.roomRepository = RoomRepository()

        // Initialize Services
        self.syncService = SyncService()
        self.locationService = LocationTrackingService()
        self.roomPlanService = RoomPlanService()
        self.notificationService = NotificationService()
        self.liveKitService = LiveKitService()
        self.supabaseService = SupabaseService()
        self.claudeAPIService = ClaudeAPIService()

        // Initialize Journal Repository (depends on SupabaseService)
        self.journalRepository = JournalRepository(supabaseService: supabaseService)

        // Initialize ViewModels with dependencies
        self.homeViewModel = HomeViewModel(
            medicationRepository: medicationRepository,
            mealRepository: mealRepository,
            exerciseRepository: exerciseRepository,
            roomRepository: roomRepository,
            syncService: syncService,
            locationService: locationService,
            roomPlanService: roomPlanService,
            notificationService: notificationService
        )

        self.medicationViewModel = MedicationViewModel(
            medicationRepository: medicationRepository,
            notificationService: notificationService
        )
        
        self.mealViewModel = MealViewModel(
            mealRepository: mealRepository,
            claudeService: claudeAPIService,
            supabaseService: supabaseService
        )
        
        self.exerciseViewModel = ExerciseViewModel(
            exerciseRepository: exerciseRepository,
            supabaseService: supabaseService
        )

        self.roomViewModel = RoomViewModel(
            roomRepository: roomRepository,
            roomPlanService: roomPlanService,
            syncService: syncService
        )

        self.journalViewModel = JournalViewModel(
            journalRepository: journalRepository,
            liveKitService: liveKitService
        )

        // Setup
        Task {
            await initialize()
        }
    }

    // MARK: - Lifecycle Methods

    func initialize() async {
        // Request necessary permissions
        await requestPermissions()

        // Load current user
        currentUser = userRepository.currentUser

        // Mark as initialized
        isInitialized = true

        print("App state initialized successfully")
    }

    func requestPermissions() async {
        // Request notification permissions
        do {
            try await notificationService.requestPermissions()
        } catch {
            print("Failed to request notification permissions: \(error)")
        }

        // Request location permissions
        locationService.requestPermissions()
    }

    // MARK: - Convenience Methods

    /// Quick access to sync all data
    func syncAllData() async throws {
        try await syncService.syncAll()
    }

    /// Quick access to start tracking
    func startAllTracking() {
        locationService.startTracking()
    }

    /// Quick access to stop tracking
    func stopAllTracking() {
        locationService.stopTracking()
    }
}
