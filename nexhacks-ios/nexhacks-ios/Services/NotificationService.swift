//
//  NotificationService.swift
//  nexhacks-ios
//
//  Service for medication reminders and notifications
//

import Foundation
import UserNotifications
import Combine

@MainActor
class NotificationService: ObservableObject {
    @Published var isAuthorized: Bool = false
    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var scheduledNotifications: [ScheduledNotification] = []

    private let notificationCenter = UNUserNotificationCenter.current()
    private var cancellables = Set<AnyCancellable>()

    struct ScheduledNotification: Identifiable {
        let id: String
        var title: String
        var body: String
        var scheduledDate: Date
        var medicationId: UUID?
    }

    // MARK: - Initialization
    init() {
        Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Public Methods

    /// Request notification permissions
    func requestPermissions() async throws {
        let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
        isAuthorized = granted
        await checkAuthorizationStatus()
    }

    /// Check authorization status
    func checkAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()
        authorizationStatus = settings.authorizationStatus
        isAuthorized = settings.authorizationStatus == .authorized
    }

    /// Schedule medication reminder
    func scheduleMedicationReminder(medication: Medication) async throws {
        if !isAuthorized {
            try await requestPermissions()
            await checkAuthorizationStatus()
            guard isAuthorized else { return }
        }

        let newPrefix = "med-\(medication.id.uuidString)-"
        let legacyPrefix = "\(medication.id.uuidString)-"

        let pending = await notificationCenter.pendingNotificationRequests()
        let identifiersToRemove = pending
            .map(\.identifier)
            .filter { $0.hasPrefix(newPrefix) || $0.hasPrefix(legacyPrefix) }

        if !identifiersToRemove.isEmpty {
            notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
        }
        scheduledNotifications.removeAll { $0.medicationId == medication.id }

        guard medication.isActive else { return }
        guard !medication.reminderTimes.isEmpty else { return }

        let calendar = Calendar.current

        let timeFormatter: DateFormatter = {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            return formatter
        }()

        for reminderTime in medication.reminderTimes {
            let hour = calendar.component(.hour, from: reminderTime)
            let minute = calendar.component(.minute, from: reminderTime)
            let identifier = "\(newPrefix)\(String(format: "%02d%02d", hour, minute))"

            let content = UNMutableNotificationContent()
            content.title = "Medication time"
            let timeLabel = timeFormatter.string(from: reminderTime)
            let doseLabel = "\(medication.name) \(medication.dosage)".trimmingCharacters(in: .whitespacesAndNewlines)
            content.body = "It is \(timeLabel). Take \(doseLabel)."
            content.sound = .default
            content.categoryIdentifier = "MEDICATION_REMINDER"
            content.userInfo = [
                "type": "medication_reminder",
                "medication_id": medication.id.uuidString,
                "scheduled_time": String(format: "%02d:%02d", hour, minute)
            ]

            var dateComponents = DateComponents()
            dateComponents.hour = hour
            dateComponents.minute = minute
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

            let request = UNNotificationRequest(
                identifier: identifier,
                content: content,
                trigger: trigger
            )

            try await notificationCenter.add(request)

            scheduledNotifications.append(
                ScheduledNotification(
                    id: request.identifier,
                    title: content.title,
                    body: content.body,
                    scheduledDate: reminderTime,
                    medicationId: medication.id
                )
            )
        }
    }

    /// Cancel medication reminders
    func cancelMedicationReminders(medicationId: UUID) {
        let newPrefix = "med-\(medicationId.uuidString)-"
        let legacyPrefix = "\(medicationId.uuidString)-"

        Task { @MainActor in
            let pending = await notificationCenter.pendingNotificationRequests()
            let identifiersToRemove = pending
                .map(\.identifier)
                .filter { $0.hasPrefix(newPrefix) || $0.hasPrefix(legacyPrefix) }

            if !identifiersToRemove.isEmpty {
                notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
            }

            scheduledNotifications.removeAll { $0.medicationId == medicationId }
        }
    }

    /// Cancel all notifications
    func cancelAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
        scheduledNotifications.removeAll()
        print("Cancelled all notifications")
    }

    /// Get pending notifications
    func getPendingNotifications() async -> [UNNotificationRequest] {
        return await notificationCenter.pendingNotificationRequests()
    }

    /// Schedule one-time notification
    func scheduleNotification(title: String, body: String, date: Date) async throws {
        guard isAuthorized else {
            try await requestPermissions()
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let dateComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        try await notificationCenter.add(request)
    }
}
