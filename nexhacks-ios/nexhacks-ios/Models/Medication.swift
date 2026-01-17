//
//  Medication.swift
//  nexhacks-ios
//
//  Medication model with Codable support for reminders and tracking
//

import Foundation

struct Medication: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var dosage: String
    var frequency: MedicationFrequency
    var form: MedicationForm
    var instructions: String?
    var prescribedBy: String?
    var startDate: Date
    var endDate: Date?
    var reminderTimes: [Date]
    var isActive: Bool
    var sideEffects: [String]
    var takenLog: [MedicationLog]
    var planImageURL: String?
    var pillDescription: String?
    var bottleImageURL: String?
    var pillImageURL: String?
    var expectedPillCount: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        dosage: String,
        frequency: MedicationFrequency,
        form: MedicationForm,
        instructions: String? = nil,
        prescribedBy: String? = nil,
        startDate: Date = Date(),
        endDate: Date? = nil,
        reminderTimes: [Date] = [],
        isActive: Bool = true,
        sideEffects: [String] = [],
        takenLog: [MedicationLog] = [],
        planImageURL: String? = nil,
        pillDescription: String? = nil,
        bottleImageURL: String? = nil,
        pillImageURL: String? = nil,
        expectedPillCount: Int = 1,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.dosage = dosage
        self.frequency = frequency
        self.form = form
        self.instructions = instructions
        self.prescribedBy = prescribedBy
        self.startDate = startDate
        self.endDate = endDate
        self.reminderTimes = reminderTimes
        self.isActive = isActive
        self.sideEffects = sideEffects
        self.takenLog = takenLog
        self.planImageURL = planImageURL
        self.pillDescription = pillDescription
        self.bottleImageURL = bottleImageURL
        self.pillImageURL = pillImageURL
        self.expectedPillCount = expectedPillCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

enum MedicationFrequency: String, Codable, CaseIterable {
    case daily = "Daily"
    case twiceDaily = "Twice Daily"
    case threeTimesDaily = "Three Times Daily"
    case asNeeded = "As Needed"
    case weekly = "Weekly"
    case custom = "Custom"
}

enum MedicationForm: String, Codable, CaseIterable {
    case tablet = "Tablet"
    case capsule = "Capsule"
    case liquid = "Liquid"
    case injection = "Injection"
    case topical = "Topical"
    case inhaler = "Inhaler"
    case drops = "Drops"
    case patch = "Patch"
}

enum VerificationStatus: String, Codable, CaseIterable {
    case verified = "Verified"
    case warning = "Warning"
    case notVerified = "Not Verified"
}

struct MedicationLog: Identifiable, Codable, Equatable {
    let id: UUID
    var medicationId: UUID
    var takenAt: Date
    var wasOnTime: Bool
    var notes: String?
    var verificationStatus: VerificationStatus
    var verificationImageURL: String?
    var detectedPillCount: Int?

    init(
        id: UUID = UUID(),
        medicationId: UUID,
        takenAt: Date = Date(),
        wasOnTime: Bool = true,
        notes: String? = nil,
        verificationStatus: VerificationStatus = .notVerified,
        verificationImageURL: String? = nil,
        detectedPillCount: Int? = nil
    ) {
        self.id = id
        self.medicationId = medicationId
        self.takenAt = takenAt
        self.wasOnTime = wasOnTime
        self.notes = notes
        self.verificationStatus = verificationStatus
        self.verificationImageURL = verificationImageURL
        self.detectedPillCount = detectedPillCount
    }
}
