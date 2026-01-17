//
//  AuthViewModel.swift
//  nexhacks-ios
//
//  Manages authentication state and user flow
//

import Foundation
import Combine

enum AuthState: Equatable {
    case loading
    case unauthenticated
    case ready
}

@MainActor
class AuthViewModel: ObservableObject {
    @Published var authState: AuthState = .loading
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let authService: AuthService
    private let supabaseService: SupabaseService
    private var cancellables = Set<AnyCancellable>()
    
    init(authService: AuthService, supabaseService: SupabaseService) {
        self.authService = authService
        self.supabaseService = supabaseService
        
        setupObservers()
        
        Task {
            await checkAuthState()
        }
    }
    
    // MARK: - Setup
    
    private func setupObservers() {
        authService.$isAuthenticated
            .sink { [weak self] isAuthenticated in
                if !isAuthenticated {
                    self?.authState = .unauthenticated
                    self?.currentUser = nil
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Auth State Management
    
    func checkAuthState() async {
        isLoading = true
        defer { isLoading = false }
        
        let hasSession = await authService.checkSession()
        
        if !hasSession {
            authState = .unauthenticated
            return
        }
        
        await loadUserData()
        authState = .ready
    }
    
    func loadUserData() async {
        guard let userId = authService.currentUserId else {
            return
        }
        
        do {
            let supabaseUser = try await supabaseService.fetchUser(userId: userId)
            let supabasePatient = try? await supabaseService.fetchPatient(userId: userId)
            
            if let supabaseUser = supabaseUser {
                currentUser = User(
                    id: supabaseUser.id,
                    name: supabaseUser.fullName,
                    email: supabaseUser.email,
                    age: supabasePatient?.age,
                    height: supabasePatient?.heightCm,
                    weight: supabasePatient?.weightKg,
                    medicalConditions: supabasePatient?.medicalConditions ?? [],
                    allergies: supabasePatient?.allergies ?? [],
                    emergencyContact: supabasePatient?.emergencyContactName != nil ? EmergencyContact(
                        name: supabasePatient?.emergencyContactName ?? "",
                        phoneNumber: supabasePatient?.emergencyContactPhone ?? "",
                        relationship: supabasePatient?.emergencyContactRelationship ?? ""
                    ) : nil,
                    createdAt: supabaseUser.createdAt ?? Date(),
                    updatedAt: supabaseUser.updatedAt ?? Date()
                )
            }
        } catch {
            errorMessage = "Failed to load user data: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Sign In / Sign Up
    
    func signUpWithEmail(email: String, password: String, fullName: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            try await authService.signUpWithEmail(email: email, password: password, fullName: fullName)
            await checkAuthState()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func signInWithEmail(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            try await authService.signInWithEmail(email: email, password: password)
            await checkAuthState()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            try await authService.signInWithGoogle()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func handleOAuthCallback(url: URL) async {
        do {
            try await authService.handleOAuthCallback(url: url)
            await checkAuthState()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func resetPassword(email: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            try await authService.resetPassword(email: email)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await authService.signOut()
            authState = .unauthenticated
            currentUser = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Helpers
    
    func clearError() {
        errorMessage = nil
    }
}
