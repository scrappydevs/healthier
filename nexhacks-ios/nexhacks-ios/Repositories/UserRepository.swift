//
//  UserRepository.swift
//  nexhacks-ios
//
//  Repository for User data access
//

import Foundation
import Combine

@MainActor
class UserRepository: ObservableObject {
    @Published var currentUser: User?

    // In-memory storage (will be replaced with Core Data/SwiftData)
    private var users: [User] = []

    // MARK: - Initialization
    init() {
        // Load sample data
        loadSampleData()
    }

    // MARK: - Public Methods

    /// Create a new user
    func create(_ user: User) throws {
        users.append(user)
        if currentUser == nil {
            currentUser = user
        }
    }

    /// Get user by ID
    func getById(_ id: UUID) -> User? {
        return users.first { $0.id == id }
    }

    /// Update user
    func update(_ user: User) throws {
        guard let index = users.firstIndex(where: { $0.id == user.id }) else {
            throw RepositoryError.notFound
        }

        var updatedUser = user
        updatedUser.updatedAt = Date()
        users[index] = updatedUser

        if currentUser?.id == user.id {
            currentUser = updatedUser
        }
    }

    /// Delete user
    func delete(_ user: User) throws {
        users.removeAll { $0.id == user.id }
        if currentUser?.id == user.id {
            currentUser = nil
        }
    }

    /// Get all users
    func getAll() -> [User] {
        return users
    }

    /// Set current user
    func setCurrentUser(_ user: User) {
        currentUser = user
    }

    // MARK: - Private Methods

    private func loadSampleData() {
        let sampleUser = User(
            name: "John Doe",
            email: "john.doe@example.com",
            age: 35,
            height: 175,
            weight: 75,
            medicalConditions: ["Hypertension"],
            allergies: ["Penicillin"],
            emergencyContact: EmergencyContact(
                name: "Jane Doe",
                phoneNumber: "+1234567890",
                relationship: "Spouse"
            )
        )

        users.append(sampleUser)
        currentUser = sampleUser
    }
}
