//
//  MedicationViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Medication management with proper data binding
//

import Foundation
import Combine

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

    enum FilterOption {
        case all
        case active
        case inactive
    }

    // MARK: - Dependencies
    private let medicationRepository: MedicationRepository
    private let notificationService: NotificationService

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(
        medicationRepository: MedicationRepository,
        notificationService: NotificationService
    ) {
        self.medicationRepository = medicationRepository
        self.notificationService = notificationService

        setupBindings()
        loadMedications()
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

            // Update notifications
            notificationService.cancelMedicationReminders(medicationId: medication.id)
            if medication.isActive {
                scheduleNotifications(for: medication)
            }

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
}
