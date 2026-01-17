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
        guard isAuthorized else {
            try await requestPermissions()
            return
        }

        for reminderTime in medication.reminderTimes {
            let content = UNMutableNotificationContent()
            content.title = "Medication Reminder"
            content.body = "Time to take \(medication.name) - \(medication.dosage)"
            content.sound = .default
            content.categoryIdentifier = "MEDICATION_REMINDER"

            // Create date components for the reminder
            let dateComponents = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

            let request = UNNotificationRequest(
                identifier: "\(medication.id.uuidString)-\(reminderTime.timeIntervalSince1970)",
                content: content,
                trigger: trigger
            )

            try await notificationCenter.add(request)

            // Track scheduled notification
            scheduledNotifications.append(ScheduledNotification(
                id: request.identifier,
                title: content.title,
                body: content.body,
                scheduledDate: reminderTime,
                medicationId: medication.id
            ))
        }

        print("Scheduled reminders for \(medication.name)")
    }

    /// Cancel medication reminders
    func cancelMedicationReminders(medicationId: UUID) {
        let identifiersToRemove = scheduledNotifications
            .filter { $0.medicationId == medicationId }
            .map { $0.id }

        notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
        scheduledNotifications.removeAll { $0.medicationId == medicationId }

        print("Cancelled reminders for medication \(medicationId)")
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
