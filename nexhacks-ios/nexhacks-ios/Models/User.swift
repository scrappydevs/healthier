//
//  User.swift
//  nexhacks-ios
//
//  User model with Codable support
//

import Foundation

struct User: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var email: String
    var age: Int?
    var height: Double? // in cm
    var weight: Double? // in kg
    var medicalConditions: [String]
    var allergies: [String]
    var emergencyContact: EmergencyContact?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        email: String,
        age: Int? = nil,
        height: Double? = nil,
        weight: Double? = nil,
        medicalConditions: [String] = [],
        allergies: [String] = [],
        emergencyContact: EmergencyContact? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.email = email
        self.age = age
        self.height = height
        self.weight = weight
        self.medicalConditions = medicalConditions
        self.allergies = allergies
        self.emergencyContact = emergencyContact
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct EmergencyContact: Codable, Equatable {
    var name: String
    var phoneNumber: String
    var relationship: String
}
