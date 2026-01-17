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
        
        // Ensure user record exists in users table
        try await ensureUserRecordExists(session: session, email: email)
    }
    
    func signInWithEmail(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(
            email: email,
            password: password
        )
        
        currentSession = session
        currentUserId = session.user.id
        isAuthenticated = true
        
        // Ensure user record exists in users table
        try await ensureUserRecordExists(session: session, email: email)
    }
    
    private func ensureUserRecordExists(session: Session, email: String) async throws {
        let supabaseService = SupabaseService()
        
        // Try to fetch existing user
        do {
            let existingUser = try await supabaseService.fetchUser(userId: session.user.id)
            if existingUser != nil {
                return
            }
        } catch {
            // User doesn't exist, we'll create it below
        }
        
        // Create user record - try multiple fields for name from OAuth providers
        let fullName: String
        if let name = session.user.userMetadata["full_name"]?.stringValue {
            fullName = name
        } else if let name = session.user.userMetadata["name"]?.stringValue {
            fullName = name
        } else if let firstName = session.user.userMetadata["given_name"]?.stringValue,
                  let lastName = session.user.userMetadata["family_name"]?.stringValue {
            fullName = "\(firstName) \(lastName)"
        } else {
            fullName = email.components(separatedBy: "@").first ?? email
        }
        
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
        
        do {
            try await supabaseService.createUser(newUser)
        } catch {
            // If creation fails, try to fetch again in case of race condition
            let existingUser = try await supabaseService.fetchUser(userId: session.user.id)
            if existingUser == nil {
                throw AuthError.userCreationFailed
            }
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
        try await supabase.auth.session(from: url)
        
        // Get the session and ensure user record exists
        let session = try await supabase.auth.session
        let email = session.user.email ?? ""
        try await ensureUserRecordExists(session: session, email: email)
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
    
}
