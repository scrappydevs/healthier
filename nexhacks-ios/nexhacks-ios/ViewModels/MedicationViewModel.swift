//
//  MedicationViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Medication management with proper data binding
//

import Foundation
import Combine
import UIKit

@MainActor
class MedicationViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var medications: [Medication] = []
    @Published var activeMedications: [Medication] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showingAddMedication: Bool = false
    @Published var showingScanMedication: Bool = false
    @Published var selectedMedication: Medication?

    // Filter options
    @Published var filterOption: FilterOption = .all
    @Published var searchText: String = ""
    
    // Daily schedule
    @Published private(set) var dailyDoses: [DailyMedicationDose] = []
    @Published private(set) var dailyDoseDate: Date?

    enum FilterOption {
        case all
        case active
        case inactive
    }
    
    struct DailyMedicationDose: Identifiable, Equatable {
        let id: UUID
        let medication: Medication
        let scheduledTime: Date
    }

    // MARK: - Dependencies
    private let medicationRepository: MedicationRepository
    private let notificationService: NotificationService
    private let supabaseService: SupabaseService
    private let dailyDoseStorageKey = "medication.dailyDoses.lastGeneratedDate"
    private let dayKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        return formatter
    }()

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(
        medicationRepository: MedicationRepository,
        notificationService: NotificationService,
        supabaseService: SupabaseService
    ) {
        self.medicationRepository = medicationRepository
        self.notificationService = notificationService
        self.supabaseService = supabaseService

        setupBindings()
        loadMedications()
    }
    
    /// Convenience initializer for previews/testing
    convenience init(medicationRepository: MedicationRepository) {
        self.init(
            medicationRepository: medicationRepository,
            notificationService: NotificationService()
        )
    }

    // MARK: - Computed Properties

    var filteredMedications: [Medication] {
        var result = medications

        // Apply filter
        switch filterOption {
        case .all:
            break
        case .active:
            result = result.filter { $0.isActive }
        case .inactive:
            result = result.filter { !$0.isActive }
        }

        // Apply search
        if !searchText.isEmpty {
            result = result.filter { medication in
                medication.name.localizedCaseInsensitiveContains(searchText) ||
                medication.dosage.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    // MARK: - Public Methods

    func loadMedications() {
        medications = medicationRepository.getAll()
        activeMedications = medicationRepository.getActive()
        refreshDailyDosesIfGenerated()
    }

    func addMedication(_ medication: Medication) {
        do {
            try medicationRepository.create(medication)
            scheduleNotifications(for: medication)
            loadMedications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateMedication(_ medication: Medication) {
        do {
            try medicationRepository.update(medication)

            // Update notifications (idempotent: clears old + reschedules current)
            scheduleNotifications(for: medication)

            loadMedications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteMedication(_ medication: Medication) {
        do {
            // Cancel notifications
            notificationService.cancelMedicationReminders(medicationId: medication.id)

            try medicationRepository.delete(medication)
            loadMedications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func toggleMedicationActive(_ medication: Medication) {
        var updated = medication
        updated.isActive.toggle()
        updateMedication(updated)
    }

    func logMedicationTaken(
        _ medication: Medication,
        wasOnTime: Bool = true,
        verificationStatus: VerificationStatus = .notVerified,
        verificationImageURL: String? = nil,
        detectedPillCount: Int? = nil
    ) {
        do {
            try medicationRepository.logMedicationTaken(
                medication.id,
                takenAt: Date(),
                wasOnTime: wasOnTime,
                verificationStatus: verificationStatus,
                verificationImageURL: verificationImageURL,
                detectedPillCount: detectedPillCount
            )
            loadMedications()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func getMedicationLogs(for medication: Medication) -> [MedicationLog] {
        return medicationRepository.getLogs(for: medication.id)
    }

    func getAdherenceRate(for medication: Medication) -> Double {
        let logs = getMedicationLogs(for: medication)
        guard !logs.isEmpty else { return 0 }

        let onTimeLogs = logs.filter { $0.wasOnTime }.count
        return Double(onTimeLogs) / Double(logs.count) * 100
    }
    
    /// Get the next scheduled medication
    func getNextScheduledMedication() -> Medication? {
        let now = Date()
        let calendar = Calendar.current
        
        return activeMedications
            .filter { medication in
                medication.reminderTimes.contains { reminderTime in
                    let reminderDate = calendar.date(bySettingHour: calendar.component(.hour, from: reminderTime),
                                                      minute: calendar.component(.minute, from: reminderTime),
                                                      second: 0,
                                                      of: now)!
                    return reminderDate >= now
                }
            }
            .first
    }
    
    /// Check if medication is due now (within 30 minutes)
    func isMedicationDueNow(_ medication: Medication) -> Bool {
        let now = Date()
        let calendar = Calendar.current
        
        return medication.reminderTimes.contains { reminderTime in
            let reminderDate = calendar.date(bySettingHour: calendar.component(.hour, from: reminderTime),
                                              minute: calendar.component(.minute, from: reminderTime),
                                              second: 0,
                                              of: now)!
            let diff = abs(reminderDate.timeIntervalSince(now))
            return diff <= 1800 // 30 minutes
        }
    }
    
    /// Get overall adherence rate for all medications
    func getOverallAdherenceRate() -> Double {
        let allRates = activeMedications.map { getAdherenceRate(for: $0) }
        guard !allRates.isEmpty else { return 100 }
        return allRates.reduce(0, +) / Double(allRates.count)
    }
    
    /// Get medication context string for voice assistant
    func getMedicationContextString() -> String {
        guard !activeMedications.isEmpty else {
            return "No active medications on file."
        }
        
        var context = "Active Medications:\n"
        
        for (index, med) in activeMedications.enumerated() {
            context += "\n\(index + 1). \(med.name)"
            context += "\n   - Dosage: \(med.dosage)"
            context += "\n   - Form: \(med.form.rawValue)"
            context += "\n   - Frequency: \(med.frequency.rawValue)"
            
            if let description = med.pillDescription, !description.isEmpty {
                context += "\n   - Appearance: \(description)"
            }
            
            if let instructions = med.instructions, !instructions.isEmpty {
                context += "\n   - Instructions: \(instructions)"
            }
            
            if !med.reminderTimes.isEmpty {
                let timeFormatter = DateFormatter()
                timeFormatter.dateFormat = "h:mm a"
                let times = med.reminderTimes.map { timeFormatter.string(from: $0) }.joined(separator: ", ")
                context += "\n   - Schedule: \(times)"
            }
        }
        
        return context
    }

    func updateMedicationImage(_ medication: Medication, image: UIImage?) async {
        do {
            var updated = medication

            if let image = image,
               let data = image.jpegData(compressionQuality: 0.8) {
                let url = try await supabaseService.uploadMedicationPlanImage(data: data)
                updated.bottleImageURL = url
                updated.planImageURL = url
            } else {
                updated.bottleImageURL = nil
                updated.planImageURL = nil
            }

            updateMedication(updated)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func generateDailyDosesIfNeeded(for date: Date = Date()) {
        let dayKey = dayKey(for: date)
        let lastGeneratedKey = UserDefaults.standard.string(forKey: dailyDoseStorageKey)
        
        if let dailyDoseDate = dailyDoseDate,
           Calendar.current.isDate(dailyDoseDate, inSameDayAs: date),
           lastGeneratedKey == dayKey {
            return
        }
        
        dailyDoseDate = Calendar.current.startOfDay(for: date)
        dailyDoses = buildDailyDoses(for: date)
        UserDefaults.standard.set(dayKey, forKey: dailyDoseStorageKey)
    }
    
    func getDailyDoses(for date: Date) -> [DailyMedicationDose] {
        if let dailyDoseDate = dailyDoseDate,
           Calendar.current.isDate(dailyDoseDate, inSameDayAs: date) {
            return dailyDoses
        }
        
        return buildDailyDoses(for: date)
    }

    // MARK: - Private Methods

    private func setupBindings() {
        medicationRepository.$medications
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.loadMedications()
            }
            .store(in: &cancellables)
    }

    private func scheduleNotifications(for medication: Medication) {
        Task {
            do {
                try await notificationService.scheduleMedicationReminder(medication: medication)
            } catch {
                errorMessage = "Failed to schedule notifications: \(error.localizedDescription)"
            }
        }
    }
    
    private func buildDailyDoses(for date: Date) -> [DailyMedicationDose] {
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: date)
        let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart
        
        var doses: [DailyMedicationDose] = []
        
        for medication in activeMedications where medication.isActive {
            if medication.startDate > dayEnd {
                continue
            }
            
            if let endDate = medication.endDate, endDate < dayStart {
                continue
            }
            
            for reminderTime in medication.reminderTimes {
                let components = calendar.dateComponents([.hour, .minute], from: reminderTime)
                if let scheduledTime = calendar.date(
                    bySettingHour: components.hour ?? 0,
                    minute: components.minute ?? 0,
                    second: 0,
                    of: dayStart
                ) {
                    doses.append(DailyMedicationDose(
                        id: UUID(),
                        medication: medication,
                        scheduledTime: scheduledTime
                    ))
                }
            }
        }
        
        return doses.sorted { $0.scheduledTime < $1.scheduledTime }
    }
    
    private func refreshDailyDosesIfGenerated() {
        guard let dailyDoseDate = dailyDoseDate else { return }
        dailyDoses = buildDailyDoses(for: dailyDoseDate)
    }
    
    private func dayKey(for date: Date) -> String {
        let dayStart = Calendar.current.startOfDay(for: date)
        return dayKeyFormatter.string(from: dayStart)
    }
}
