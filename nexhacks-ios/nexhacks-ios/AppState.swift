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
    // MARK: - Auth
    let authService: AuthService
    let authViewModel: AuthViewModel
    
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
    
    // MARK: - Computed Properties
    var isAuthenticated: Bool {
        authViewModel.authState == .ready
    }

    // MARK: - Initialization
    init() {
        // Initialize Services first
        self.supabaseService = SupabaseService()
        self.syncService = SyncService()
        self.locationService = LocationTrackingService()
        self.roomPlanService = RoomPlanService()
        self.notificationService = NotificationService()
        self.liveKitService = LiveKitService()
        self.claudeAPIService = ClaudeAPIService()
        
        // Initialize Auth Services
        self.authService = AuthService()
        self.authViewModel = AuthViewModel(authService: authService, supabaseService: supabaseService)
        
        // Initialize Repositories
        self.userRepository = UserRepository(supabaseService: supabaseService)
        self.medicationRepository = MedicationRepository(supabaseService: supabaseService)
        self.mealRepository = MealRepository(supabaseService: supabaseService)
        self.exerciseRepository = ExerciseRepository(supabaseService: supabaseService)
        self.roomRepository = RoomRepository()
        self.journalRepository = JournalRepository(supabaseService: supabaseService)

        // Initialize ViewModels with dependencies
        self.homeViewModel = HomeViewModel(
            medicationRepository: medicationRepository,
            mealRepository: mealRepository,
            exerciseRepository: exerciseRepository,
            roomRepository: roomRepository,
            journalRepository: journalRepository,
            syncService: syncService,
            locationService: locationService,
            roomPlanService: roomPlanService,
            notificationService: notificationService
        )

        self.medicationViewModel = MedicationViewModel(
            medicationRepository: medicationRepository,
            notificationService: notificationService,
            supabaseService: supabaseService
        )
        
        self.mealViewModel = MealViewModel(
            mealRepository: mealRepository,
            claudeService: claudeAPIService,
            supabaseService: supabaseService
        )
        
        self.exerciseViewModel = ExerciseViewModel(
            exerciseRepository: exerciseRepository,
            supabaseService: supabaseService,
            notificationService: notificationService
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
        // Check auth state first
        await authViewModel.checkAuthState()
        
        // Only proceed if authenticated
        if authViewModel.authState == .ready {
            // Load current user from AuthViewModel
            currentUser = authViewModel.currentUser
            
            // Request necessary permissions
            await requestPermissions()
            refreshDailyMedicationDosesIfNeeded()
        }

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
    
    func refreshDailyMedicationDosesIfNeeded() {
        guard authViewModel.authState == .ready else { return }
        medicationViewModel.generateDailyDosesIfNeeded()
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
