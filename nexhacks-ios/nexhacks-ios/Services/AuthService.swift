//
//  AuthService.swift
//  nexhacks-ios
//
//  Authentication service handling Supabase Auth operations
//

import Foundation
import Supabase
import Combine

enum AuthError: LocalizedError {
    case noSession
    case invalidCredentials
    case userCreationFailed
    case profileIncomplete
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .noSession:
            return "No active session found"
        case .invalidCredentials:
            return "Invalid email or password"
        case .userCreationFailed:
            return "Failed to create user record"
        case .profileIncomplete:
            return "Profile setup required"
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}

@MainActor
class AuthService: ObservableObject {
    @Published var currentSession: Session?
    @Published var isAuthenticated = false
    @Published var currentUserId: UUID?
    
    private var authStateListener: Task<Void, Never>?
    
    init() {
        setupAuthStateListener()
        Task {
            await restoreSession()
        }
    }
    
    deinit {
        authStateListener?.cancel()
    }
    
    // MARK: - Session Management
    
    private func setupAuthStateListener() {
        authStateListener = Task {
            for await state in await supabase.auth.authStateChanges {
                await handleAuthStateChange(state.event, session: state.session)
            }
        }
    }
    
    private func handleAuthStateChange(_ event: AuthChangeEvent, session: Session?) async {
        switch event {
        case .signedIn, .tokenRefreshed, .userUpdated:
            currentSession = session
            currentUserId = session?.user.id
            isAuthenticated = session != nil
        case .signedOut:
            currentSession = nil
            currentUserId = nil
            isAuthenticated = false
        default:
            break
        }
    }
    
    func restoreSession() async {
        do {
            let session = try await supabase.auth.session
            currentSession = session
            currentUserId = session.user.id
            isAuthenticated = true
        } catch {
            currentSession = nil
            currentUserId = nil
            isAuthenticated = false
        }
    }
    
    func checkSession() async -> Bool {
        do {
            let session = try await supabase.auth.session
            currentSession = session
            currentUserId = session.user.id
            isAuthenticated = true
            return true
        } catch {
            currentSession = nil
            currentUserId = nil
            isAuthenticated = false
            return false
        }
    }
    
    // MARK: - Email/Password Authentication
    
    func signUpWithEmail(email: String, password: String, fullName: String) async throws {
        do {
            let response = try await supabase.auth.signUp(
                email: email,
                password: password,
                data: ["full_name": .string(fullName)]
            )
            
            guard let session = response.session else {
                throw AuthError.noSession
            }
            
            currentSession = session
            currentUserId = session.user.id
            isAuthenticated = true
            
            // Create user record in users table
            let newUser = SupabaseUser(
                id: session.user.id,
                email: email,
                fullName: fullName,
                role: "patient",
                isActive: true,
                lastLoginAt: Date(),
                createdAt: Date(),
                updatedAt: Date()
            )
            
            let supabaseService = SupabaseService()
            try await supabaseService.createUser(newUser)
            
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.unknown(error)
        }
    }
    
    func signInWithEmail(email: String, password: String) async throws {
        do {
            let session = try await supabase.auth.signIn(
                email: email,
                password: password
            )
            
            currentSession = session
            currentUserId = session.user.id
            isAuthenticated = true
            
            // Ensure user record exists in users table
            let supabaseService = SupabaseService()
            let existingUser = try? await supabaseService.fetchUser(userId: session.user.id)
            
            if existingUser == nil {
                // Create user record if it doesn't exist
                let fullName = session.user.userMetadata["full_name"]?.stringValue ?? email
                let newUser = SupabaseUser(
                    id: session.user.id,
                    email: email,
                    fullName: fullName,
                    role: "patient",
                    isActive: true,
                    lastLoginAt: Date(),
                    createdAt: Date(),
                    updatedAt: Date()
                )
                
                try await supabaseService.createUser(newUser)
            }
            
        } catch {
            throw AuthError.invalidCredentials
        }
    }
    
    func resetPassword(email: String) async throws {
        do {
            try await supabase.auth.resetPasswordForEmail(email)
        } catch {
            throw AuthError.unknown(error)
        }
    }
    
    // MARK: - OAuth Authentication
    
    func signInWithGoogle() async throws {
        do {
            try await supabase.auth.signInWithOAuth(
                provider: .google,
                redirectTo: URL(string: "com.nexhacks.healthier://auth/callback")
            )
        } catch {
            throw AuthError.unknown(error)
        }
    }
    
    func handleOAuthCallback(url: URL) async throws {
        do {
            try await supabase.auth.session(from: url)
            
            // Check if we need to create user record
            if let userId = currentUserId {
                let supabaseService = SupabaseService()
                let existingUser = try? await supabaseService.fetchUser(userId: userId)
                
                if existingUser == nil {
                    // Create user record for OAuth sign-in
                    let session = try await supabase.auth.session
                    let email = session.user.email ?? ""
                    let fullName = session.user.userMetadata["full_name"]?.stringValue ?? email
                    
                    let newUser = SupabaseUser(
                        id: userId,
                        email: email,
                        fullName: fullName,
                        role: "patient",
                        isActive: true,
                        lastLoginAt: Date(),
                        createdAt: Date(),
                        updatedAt: Date()
                    )
                    
                    try await supabaseService.createUser(newUser)
                }
            }
        } catch {
            throw AuthError.unknown(error)
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() async throws {
        do {
            try await supabase.auth.signOut()
            currentSession = nil
            currentUserId = nil
            isAuthenticated = false
        } catch {
            throw AuthError.unknown(error)
        }
    }
    
    // MARK: - Profile Check
    
    func checkProfileComplete() async throws -> Bool {
        guard let userId = currentUserId else {
            throw AuthError.noSession
        }
        
        let supabaseService = SupabaseService()
        let patient = try await supabaseService.fetchPatient(userId: userId)
        return patient != nil
    }
}
