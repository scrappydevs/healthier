//
//  NotificationService.swift
//  nexhacks-ios
//
//  Service for reminders and notifications
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
        var exercisePlanItemId: UUID?
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
                    medicationId: medication.id,
                    exercisePlanItemId: nil
                )
            )
        }
    }

    /// Schedule exercise plan reminder (clinician-assigned)
    func scheduleExerciseReminder(planItem: ExercisePlanItem) async throws {
        if !isAuthorized {
            try await requestPermissions()
            await checkAuthorizationStatus()
            guard isAuthorized else { return }
        }

        let prefix = "ex-\(planItem.id.uuidString)-"

        let pending = await notificationCenter.pendingNotificationRequests()
        let identifiersToRemove = pending
            .map(\.identifier)
            .filter { $0.hasPrefix(prefix) }

        if !identifiersToRemove.isEmpty {
            notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
        }
        scheduledNotifications.removeAll { $0.exercisePlanItemId == planItem.id }

        guard planItem.isActive else { return }
        guard !planItem.reminderTimes.isEmpty else { return }

        let calendar = Calendar.current

        let timeFormatter: DateFormatter = {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            return formatter
        }()

        for reminderTime in planItem.reminderTimes {
            let hour = calendar.component(.hour, from: reminderTime)
            let minute = calendar.component(.minute, from: reminderTime)

            let content = UNMutableNotificationContent()
            content.title = "Exercise time"
            let timeLabel = timeFormatter.string(from: reminderTime)

            var details = ""
            if let sets = planItem.sets, let reps = planItem.reps {
                details = " \(sets) sets of \(reps)."
            } else if let durationSeconds = planItem.durationSeconds, durationSeconds > 0 {
                let minutes = max(Int(round(Double(durationSeconds) / 60.0)), 1)
                details = " About \(minutes) minutes."
            }

            content.body = "It is \(timeLabel). Do \(planItem.name).\(details)"
            content.sound = .default
            content.categoryIdentifier = "EXERCISE_REMINDER"
            content.userInfo = [
                "type": "exercise_reminder",
                "exercise_plan_item_id": planItem.id.uuidString,
                "scheduled_time": String(format: "%02d:%02d", hour, minute)
            ]

            // If daysOfWeek is empty, treat as daily. Otherwise schedule on those weekdays.
            let days = planItem.daysOfWeek.isEmpty ? nil : planItem.daysOfWeek

            if let days {
                for day in days {
                    let weekday = ((day + 1) % 7) + 1 // backend Monday=0...Sunday=6 -> iOS Sunday=1...Saturday=7
                    let identifier = "\(prefix)\(weekday)-\(String(format: "%02d%02d", hour, minute))"

                    var dateComponents = DateComponents()
                    dateComponents.weekday = weekday
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
                            medicationId: nil,
                            exercisePlanItemId: planItem.id
                        )
                    )
                }
            } else {
                let identifier = "\(prefix)\(String(format: "%02d%02d", hour, minute))"

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
                        medicationId: nil,
                        exercisePlanItemId: planItem.id
                    )
                )
            }
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

    /// Cancel exercise reminders
    func cancelExerciseReminders(planItemId: UUID) {
        let prefix = "ex-\(planItemId.uuidString)-"

        Task { @MainActor in
            let pending = await notificationCenter.pendingNotificationRequests()
            let identifiersToRemove = pending
                .map(\.identifier)
                .filter { $0.hasPrefix(prefix) }

            if !identifiersToRemove.isEmpty {
                notificationCenter.removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
            }

            scheduledNotifications.removeAll { $0.exercisePlanItemId == planItemId }
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
