//
//  MedicationRepository.swift
//  nexhacks-ios
//
//  Repository for Medication data access
//

import Foundation
import Combine

@MainActor
class MedicationRepository: ObservableObject {
    @Published var medications: [Medication] = []
    
    private let supabaseService: SupabaseService?

    // In-memory storage (will be replaced with Core Data/SwiftData)
    private var storage: [Medication] = []

    // MARK: - Initialization
    init(supabaseService: SupabaseService? = nil) {
        self.supabaseService = supabaseService
        loadSampleData()
    }

    // MARK: - Public Methods

    /// Create a new medication
    func create(_ medication: Medication) throws {
        storage.append(medication)
        updatePublished()
    }

    /// Get medication by ID
    func getById(_ id: UUID) -> Medication? {
        return storage.first { $0.id == id }
    }

    /// Update medication
    func update(_ medication: Medication) throws {
        guard let index = storage.firstIndex(where: { $0.id == medication.id }) else {
            throw RepositoryError.notFound
        }

        var updatedMedication = medication
        updatedMedication.updatedAt = Date()
        storage[index] = updatedMedication
        updatePublished()
    }

    /// Delete medication
    func delete(_ medication: Medication) throws {
        storage.removeAll { $0.id == medication.id }
        updatePublished()
    }

    /// Get all medications
    func getAll() -> [Medication] {
        return storage
    }

    /// Get active medications
    func getActive() -> [Medication] {
        return storage.filter { $0.isActive }
    }

    /// Log medication taken with verification status
    func logMedicationTaken(
        _ medicationId: UUID,
        takenAt: Date = Date(),
        wasOnTime: Bool = true,
        notes: String? = nil,
        verificationStatus: VerificationStatus = .notVerified,
        verificationImageURL: String? = nil,
        detectedPillCount: Int? = nil
    ) throws {
        guard let index = storage.firstIndex(where: { $0.id == medicationId }) else {
            throw RepositoryError.notFound
        }

        let log = MedicationLog(
            medicationId: medicationId,
            takenAt: takenAt,
            wasOnTime: wasOnTime,
            notes: notes,
            verificationStatus: verificationStatus,
            verificationImageURL: verificationImageURL,
            detectedPillCount: detectedPillCount
        )

        storage[index].takenLog.append(log)
        storage[index].updatedAt = Date()
        updatePublished()
        
        // Persist to Supabase
        if let supabaseService = supabaseService,
           let userId = supabaseService.getCurrentUserId() {
            Task {
                let supabaseLog = SupabaseMedicationLog(
                    id: log.id,
                    medicationId: log.medicationId,
                    userId: userId,
                    takenAt: log.takenAt,
                    wasOnTime: log.wasOnTime,
                    notes: log.notes,
                    createdAt: Date()
                )
                
                do {
                    try await supabaseService.logMedicationTaken(supabaseLog)
                } catch {
                    print("Failed to sync medication log to Supabase: \(error)")
                }
            }
        }
    }

    /// Get medication logs for a specific medication
    func getLogs(for medicationId: UUID) -> [MedicationLog] {
        return storage.first { $0.id == medicationId }?.takenLog ?? []
    }

    // MARK: - Private Methods

    private func updatePublished() {
        medications = storage
    }

    private func loadSampleData() {
        let medication1 = Medication(
            name: "Lisinopril",
            dosage: "10mg",
            frequency: .daily,
            form: .tablet,
            instructions: "Take with water in the morning",
            prescribedBy: "Dr. Smith",
            reminderTimes: [
                Calendar.current.date(bySettingHour: 8, minute: 0, second: 0, of: Date())!
            ]
        )

        let medication2 = Medication(
            name: "Metformin",
            dosage: "500mg",
            frequency: .twiceDaily,
            form: .tablet,
            instructions: "Take with meals",
            prescribedBy: "Dr. Johnson",
            reminderTimes: [
                Calendar.current.date(bySettingHour: 8, minute: 0, second: 0, of: Date())!,
                Calendar.current.date(bySettingHour: 20, minute: 0, second: 0, of: Date())!
            ]
        )

        storage = [medication1, medication2]
        updatePublished()
    }
}
