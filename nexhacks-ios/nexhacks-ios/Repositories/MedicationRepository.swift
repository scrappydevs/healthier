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
    
    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    private let isoFormatterWithoutFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
    
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    // MARK: - Initialization
    init(supabaseService: SupabaseService? = nil) {
        self.supabaseService = supabaseService
        loadInitialData()
    }

    // MARK: - Public Methods

    /// Create a new medication
    func create(_ medication: Medication) throws {
        storage.append(medication)
        updatePublished()
        
        guard let supabaseService = supabaseService,
              let userId = supabaseService.getCurrentUserId() else {
            return
        }
        
        Task {
            await syncMedicationToSupabase(medication, userId: userId)
        }
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
        
        guard let supabaseService = supabaseService,
              let userId = supabaseService.getCurrentUserId() else {
            return
        }
        
        Task {
            await syncMedicationToSupabase(updatedMedication, userId: userId)
        }
    }

    /// Delete medication
    func delete(_ medication: Medication) throws {
        storage.removeAll { $0.id == medication.id }
        updatePublished()
        
        guard let supabaseService = supabaseService,
              let userId = supabaseService.getCurrentUserId() else {
            return
        }
        
        Task {
            do {
                try await supabaseService.deleteMedication(id: medication.id)
            } catch {
                print("Failed to delete medication from Supabase for user \(userId): \(error)")
            }
        }
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
        
        let updatedMedication = storage[index]
        
        // Persist to Supabase
        if let supabaseService = supabaseService,
           let userId = supabaseService.getCurrentUserId() {
            Task {
                await syncMedicationToSupabase(updatedMedication, userId: userId)
                
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
    
    private func loadInitialData() {
        guard let supabaseService = supabaseService,
              let userId = supabaseService.getCurrentUserId() else {
            loadSampleData()
            return
        }
        
        storage = []
        updatePublished()
        
        Task {
            await loadFromSupabase(userId: userId)
        }
    }
    
    private func loadFromSupabase(userId: UUID) async {
        guard let supabaseService = supabaseService else { return }
        
        do {
            let supabaseMedications = try await supabaseService.fetchMedications(userId: userId)
            let supabaseLogs = try await supabaseService.fetchMedicationLogs(userId: userId)
            let logsByMedicationId = mapSupabaseLogsByMedicationId(supabaseLogs)
            
            storage = supabaseMedications.map { medication in
                let logs = logsByMedicationId[medication.id] ?? []
                return mapSupabaseMedication(medication, logs: logs)
            }
            updatePublished()
        } catch {
            print("Failed to load medications from Supabase for user \(userId): \(error)")
        }
    }
    
    private func syncMedicationToSupabase(_ medication: Medication, userId: UUID) async {
        guard let supabaseService = supabaseService else { return }
        let supabaseMedication = mapToSupabaseMedication(medication, userId: userId)
        
        do {
            try await supabaseService.saveMedication(supabaseMedication)
        } catch {
            do {
                try await supabaseService.updateMedication(supabaseMedication)
            } catch {
                print("Failed to sync medication to Supabase for user \(userId): \(error)")
            }
        }
    }
    
    private func mapSupabaseMedication(_ medication: SupabaseMedication, logs: [MedicationLog]) -> Medication {
        Medication(
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            frequency: mapFrequency(medication.frequency),
            form: mapForm(medication.form),
            instructions: medication.instructions,
            prescribedBy: medication.prescribedBy,
            startDate: medication.startDate ?? Date(),
            endDate: medication.endDate,
            reminderTimes: parseReminderTimes(medication.reminderTimes),
            isActive: medication.isActive,
            sideEffects: medication.sideEffects,
            takenLog: logs.sorted { $0.takenAt > $1.takenAt },
            planImageURL: medication.planImageUrl,
            pillDescription: medication.pillDescription,
            bottleImageURL: nil,
            pillImageURL: nil,
            expectedPillCount: 1,
            createdAt: medication.createdAt ?? Date(),
            updatedAt: medication.updatedAt ?? Date()
        )
    }
    
    private func mapToSupabaseMedication(_ medication: Medication, userId: UUID) -> SupabaseMedication {
        SupabaseMedication(
            id: medication.id,
            userId: userId,
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency.rawValue,
            form: medication.form.rawValue,
            instructions: medication.instructions,
            prescribedBy: medication.prescribedBy,
            startDate: medication.startDate,
            endDate: medication.endDate,
            reminderTimes: formatReminderTimes(medication.reminderTimes),
            isActive: medication.isActive,
            sideEffects: medication.sideEffects,
            planImageUrl: medication.planImageURL,
            pillDescription: medication.pillDescription,
            createdAt: medication.createdAt,
            updatedAt: medication.updatedAt
        )
    }
    
    private func mapSupabaseLogsByMedicationId(
        _ logs: [SupabaseMedicationLog]
    ) -> [UUID: [MedicationLog]] {
        var result: [UUID: [MedicationLog]] = [:]
        
        for log in logs {
            let mappedLog = mapSupabaseLog(log)
            result[log.medicationId, default: []].append(mappedLog)
        }
        
        return result
    }
    
    private func mapSupabaseLog(_ log: SupabaseMedicationLog) -> MedicationLog {
        let takenAt = log.takenAt ?? log.createdAt ?? Date()
        
        return MedicationLog(
            id: log.id,
            medicationId: log.medicationId,
            takenAt: takenAt,
            wasOnTime: log.wasOnTime,
            notes: log.notes,
            verificationStatus: .notVerified,
            verificationImageURL: nil,
            detectedPillCount: nil
        )
    }
    
    private func mapFrequency(_ value: String) -> MedicationFrequency {
        if let frequency = MedicationFrequency(rawValue: value) {
            return frequency
        }
        
        switch value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "daily":
            return .daily
        case "twice daily", "twicedaily", "twice_daily":
            return .twiceDaily
        case "three times daily", "threetimesdaily", "three_times_daily":
            return .threeTimesDaily
        case "as needed", "as_needed":
            return .asNeeded
        case "weekly":
            return .weekly
        default:
            return .custom
        }
    }
    
    private func mapForm(_ value: String) -> MedicationForm {
        if let form = MedicationForm(rawValue: value) {
            return form
        }
        
        switch value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "tablet":
            return .tablet
        case "capsule":
            return .capsule
        case "liquid":
            return .liquid
        case "injection":
            return .injection
        case "topical":
            return .topical
        case "inhaler":
            return .inhaler
        case "drops":
            return .drops
        case "patch":
            return .patch
        default:
            return .tablet
        }
    }
    
    private func formatReminderTimes(_ times: [Date]) -> [String] {
        times.map { isoFormatter.string(from: $0) }
    }
    
    private func parseReminderTimes(_ times: [String]) -> [Date] {
        times.compactMap { parseReminderTime($0) }
    }
    
    private func parseReminderTime(_ value: String) -> Date? {
        if let date = isoFormatter.date(from: value) {
            return date
        }
        
        if let date = isoFormatterWithoutFraction.date(from: value) {
            return date
        }
        
        if let time = timeFormatter.date(from: value) {
            let calendar = Calendar.current
            let components = calendar.dateComponents([.hour, .minute], from: time)
            return calendar.date(
                bySettingHour: components.hour ?? 0,
                minute: components.minute ?? 0,
                second: 0,
                of: Date()
            )
        }
        
        return nil
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
