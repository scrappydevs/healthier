//
//  UserRepository.swift
//  nexhacks-ios
//
//  Repository for User data access with Supabase sync
//

import Foundation
import Combine

@MainActor
class UserRepository: ObservableObject {
    @Published var currentUser: User?
    
    private let supabaseService: SupabaseService

    // MARK: - Initialization
    init(supabaseService: SupabaseService) {
        self.supabaseService = supabaseService
    }

    // MARK: - Public Methods
    
    /// Load user from Supabase by user ID
    func loadUser(userId: UUID) async throws {
        let supabaseUser = try await supabaseService.fetchUser(userId: userId)
        let supabasePatient = try await supabaseService.fetchPatient(userId: userId)
        
        if let supabaseUser = supabaseUser, let supabasePatient = supabasePatient {
            currentUser = User(
                id: supabaseUser.id,
                name: supabaseUser.fullName,
                email: supabaseUser.email,
                age: supabasePatient.age,
                height: supabasePatient.heightCm,
                weight: supabasePatient.weightKg,
                medicalConditions: supabasePatient.medicalConditions,
                allergies: supabasePatient.allergies,
                emergencyContact: supabasePatient.emergencyContactName != nil ? EmergencyContact(
                    name: supabasePatient.emergencyContactName ?? "",
                    phoneNumber: supabasePatient.emergencyContactPhone ?? "",
                    relationship: supabasePatient.emergencyContactRelationship ?? ""
                ) : nil,
                createdAt: supabaseUser.createdAt ?? Date(),
                updatedAt: supabaseUser.updatedAt ?? Date()
            )
        }
    }

    /// Get user by ID
    func getById(_ id: UUID) async throws -> User? {
        let supabaseUser = try await supabaseService.fetchUser(userId: id)
        let supabasePatient = try await supabaseService.fetchPatient(userId: id)
        
        if let supabaseUser = supabaseUser, let supabasePatient = supabasePatient {
            return User(
                id: supabaseUser.id,
                name: supabaseUser.fullName,
                email: supabaseUser.email,
                age: supabasePatient.age,
                height: supabasePatient.heightCm,
                weight: supabasePatient.weightKg,
                medicalConditions: supabasePatient.medicalConditions,
                allergies: supabasePatient.allergies,
                emergencyContact: supabasePatient.emergencyContactName != nil ? EmergencyContact(
                    name: supabasePatient.emergencyContactName ?? "",
                    phoneNumber: supabasePatient.emergencyContactPhone ?? "",
                    relationship: supabasePatient.emergencyContactRelationship ?? ""
                ) : nil,
                createdAt: supabaseUser.createdAt ?? Date(),
                updatedAt: supabaseUser.updatedAt ?? Date()
            )
        }
        
        return nil
    }

    /// Update user
    func update(_ user: User) async throws {
        let updatedUser = SupabaseUser(
            id: user.id,
            email: user.email,
            fullName: user.name,
            role: "patient",
            isActive: true,
            lastLoginAt: Date(),
            createdAt: user.createdAt,
            updatedAt: Date()
        )
        
        try await supabaseService.updateUser(updatedUser)
        
        // Update patient record if it exists
        if let patient = try await supabaseService.fetchPatient(userId: user.id) {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            
            let updatedPatient = SupabasePatient(
                id: patient.id,
                userId: user.id,
                clinicianId: patient.clinicianId,
                dateOfBirth: patient.dateOfBirth,
                age: user.age,
                gender: patient.gender,
                heightCm: user.height,
                weightKg: user.weight,
                bloodType: patient.bloodType,
                medicalConditions: user.medicalConditions,
                allergies: user.allergies,
                emergencyContactName: user.emergencyContact?.name,
                emergencyContactPhone: user.emergencyContact?.phoneNumber,
                emergencyContactRelationship: user.emergencyContact?.relationship,
                address: patient.address,
                notes: patient.notes,
                status: patient.status,
                createdAt: patient.createdAt,
                updatedAt: Date()
            )
            
            try await supabaseService.updatePatient(updatedPatient)
        }
        
        if currentUser?.id == user.id {
            currentUser = user
        }
    }

    /// Set current user
    func setCurrentUser(_ user: User) {
        currentUser = user
    }
}
