//
//  MedicationScheduleView.swift
//  nexhacks-ios
//
//  Timeline view showing daily medication schedule with status indicators
//

import SwiftUI

struct MedicationScheduleView: View {
    @ObservedObject var viewModel: MedicationViewModel
    @State private var selectedDate: Date = Date()
    @State private var medicationForVerification: Medication?
    @State private var medicationForDetail: Medication?

    private var calendar: Calendar { Calendar.current }

    // Group medications by their scheduled times for the selected date
    private var scheduledSlots: [ScheduleTimeSlot] {
        let medications = viewModel.activeMedications
        let now = Date()

        var timeSlotMap: [Int: [ScheduledMedicationItem]] = [:]

        for medication in medications {
            for reminderTime in medication.reminderTimes {
                let hour = calendar.component(.hour, from: reminderTime)
                let minute = calendar.component(.minute, from: reminderTime)

                let status = getMedicationStatus(medication: medication, hour: hour, minute: minute)
                
                // Only include upcoming or due now medications
                guard status == .upcoming || status == .dueNow else { continue }

                let item = ScheduledMedicationItem(
                    medication: medication,
                    scheduledTime: reminderTime,
                    status: status
                )

                let key = hour * 100 + minute // Unique key for hour:minute
                if timeSlotMap[key] == nil {
                    timeSlotMap[key] = []
                }
                timeSlotMap[key]?.append(item)
            }
        }

        return timeSlotMap.keys.sorted().compactMap { key in
            guard let items = timeSlotMap[key], !items.isEmpty else { return nil }
            let hour = key / 100
            let minute = key % 100

            if let slotTime = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: selectedDate) {
                return ScheduleTimeSlot(time: slotTime, medications: items)
            }
            return nil
        }
    }

    var body: some View {
        ZStack {
            // Background matching other views
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                headerSection
                
                if scheduledSlots.isEmpty {
                    emptyState
                } else {
                    // Medication Cards
                    ScrollView {
                        VStack(spacing: AppTheme.Spacing.lg) {
                            ForEach(scheduledSlots) { slot in
                                LiquidGlassMedicationSlotView(
                                    slot: slot,
                                    onTakeMedication: { medication in
                                        medicationForVerification = medication
                                    },
                                    onCardTap: { medication in
                                        medicationForDetail = medication
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        .padding(.vertical, AppTheme.Spacing.lg)
                    }
                }
            }
        }
        .sheet(item: $medicationForVerification) { medication in
            PillVerificationView(medication: medication) { verified in
                if verified {
                    viewModel.logMedicationTaken(medication, wasOnTime: true, verificationStatus: .verified)
                }
            }
        }
        .sheet(isPresented: $viewModel.showingAddMedication) {
            AddMedicationView(viewModel: viewModel)
        }
        .sheet(isPresented: $viewModel.showingScanMedication) {
            MedicationScanView(viewModel: viewModel)
        }
        .sheet(item: $medicationForDetail) { medication in
            MedicationDetailView(viewModel: viewModel, medication: medication)
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            // Title
            HStack {
                Text("Medications")
                    .font(AppTheme.Typography.title)
                    .foregroundColor(.textPrimary)

                Spacer()

                Menu {
                    Button {
                        viewModel.showingScanMedication = true
                    } label: {
                        Label("Add New Medication", systemImage: "camera.viewfinder")
                    }
                    
                    Button {
                        viewModel.showingAddMedication = true
                    } label: {
                        Label("Add Manually", systemImage: "square.and.pencil")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.title2)
                        .foregroundColor(.textPrimary)
                        .frame(width: 50, height: 50)
                        .background(Color.cardBackground)
                        .clipShape(Circle())
                        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
                        .accessibilityLabel("Medication actions")
                }
            }
            .padding(.horizontal, AppTheme.Spacing.lg)
            .padding(.top, AppTheme.Spacing.md)

            // Date selector
            datePickerSection
        }
        .padding(.bottom, AppTheme.Spacing.md)
    }
    
    private var datePickerSection: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            // Date display button with pill shape
            Button {
                // Show date picker
            } label: {
                HStack(spacing: AppTheme.Spacing.sm) {
                    Image(systemName: "calendar")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                    
                    Text(selectedDate, format: .dateTime.month(.abbreviated).day())
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.primary)
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.vertical, AppTheme.Spacing.md)
                .background(.white)
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
            }
            
            Spacer()
        }
        .padding(.horizontal, AppTheme.Spacing.lg)
    }


    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            let allDone = !viewModel.activeMedications.isEmpty
            
            Image(systemName: allDone ? "checkmark.circle.fill" : "calendar.badge.clock")
                .font(.system(size: 60))
                .foregroundColor(allDone ? .success : .textSecondary)

            Text(allDone ? "All done for today" : "No medications scheduled")
                .font(AppTheme.Typography.title3)
                .foregroundColor(.textPrimary)

            if !allDone {
                Text("Add medications with reminder times to see them in your daily schedule")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, AppTheme.Spacing.xl)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helper Methods

    private func getMedicationStatus(medication: Medication, hour: Int, minute: Int) -> MedicationScheduleStatus {
        let now = Date()

        // Check if the selected date is in the past
        if !calendar.isDateInToday(selectedDate) {
            if selectedDate < now {
                // Check if taken on this date
                let dayStart = calendar.startOfDay(for: selectedDate)
                let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart

                let takenOnDate = medication.takenLog.contains { log in
                    log.takenAt >= dayStart && log.takenAt < dayEnd
                }

                return takenOnDate ? .taken : .missed
            } else {
                return .upcoming
            }
        }

        // Today's logic
        guard let scheduledTime = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: now) else {
            return .upcoming
        }

        let todayStart = calendar.startOfDay(for: now)
        let todayEnd = calendar.date(byAdding: .day, value: 1, to: todayStart) ?? todayStart

        // Check if already taken today
        let takenToday = medication.takenLog.contains { log in
            log.takenAt >= todayStart && log.takenAt < todayEnd
        }

        if takenToday {
            return .taken
        }

        // Check if due now (within 30 minutes window)
        let timeDiff = scheduledTime.timeIntervalSince(now)
        if abs(timeDiff) <= 1800 { // 30 minutes
            return .dueNow
        }

        // Check if missed (scheduled time has passed by more than 30 minutes)
        if timeDiff < -1800 {
            return .missed
        }

        return .upcoming
    }
}

// MARK: - Supporting Types

enum MedicationScheduleStatus {
    case upcoming
    case dueNow
    case taken
    case missed

    var color: Color {
        switch self {
        case .upcoming: return .textSecondary
        case .dueNow: return .appAccent
        case .taken: return .success
        case .missed: return .error
        }
    }

    var icon: String {
        switch self {
        case .upcoming: return "clock"
        case .dueNow: return "bell.fill"
        case .taken: return "checkmark.circle.fill"
        case .missed: return "xmark.circle.fill"
        }
    }

    var label: String {
        switch self {
        case .upcoming: return "Upcoming"
        case .dueNow: return "Due Now"
        case .taken: return "Taken"
        case .missed: return "Missed"
        }
    }
}

struct ScheduledMedicationItem: Identifiable {
    let id = UUID()
    let medication: Medication
    let scheduledTime: Date
    let status: MedicationScheduleStatus
}

struct ScheduleTimeSlot: Identifiable {
    let id = UUID()
    let time: Date
    let medications: [ScheduledMedicationItem]
}

// MARK: - Liquid Glass Medication Slot View

struct LiquidGlassMedicationSlotView: View {
    let slot: ScheduleTimeSlot
    let onTakeMedication: (Medication) -> Void
    let onCardTap: (Medication) -> Void

    var body: some View {
        ForEach(slot.medications) { item in
            LiquidGlassMedicationCard(
                item: item,
                onTake: { onTakeMedication(item.medication) },
                onCardTap: { onCardTap(item.medication) }
            )
        }
    }
}

// MARK: - Liquid Glass Medication Card

struct LiquidGlassMedicationCard: View {
    let item: ScheduledMedicationItem
    let onTake: () -> Void
    let onCardTap: () -> Void

    var body: some View {
        Button {
            onCardTap()
        } label: {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
                HStack(spacing: AppTheme.Spacing.md) {
                    // Circular medication icon
                    ZStack {
                        Circle()
                            .fill(Color.appPrimary.opacity(0.2))
                            .frame(width: 60, height: 60)

                        Image(systemName: iconForForm(item.medication.form))
                            .font(.title2)
                            .foregroundColor(.appPrimary)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.medication.name)
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(.textPrimary)

                        // Wavy line decoration
                        Wave()
                            .stroke(Color.appPrimary, lineWidth: 2)
                            .frame(width: 60, height: 8)
                    }

                    Spacer()
                }

                // Next pill intake section
                VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Next pill intake")
                                .font(.system(size: 14))
                                .foregroundColor(.textSecondary)

                            HStack(spacing: 0) {
                                Text(item.scheduledTime, format: .dateTime.month(.abbreviated).day())
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.textPrimary)
                                Text(", ")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.textPrimary)
                                Text(item.scheduledTime, format: .dateTime.hour().minute())
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.textPrimary)
                            }
                        }

                        Spacer()

                        // Show future doses if any
                        if let nextDose = getNextDose() {
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Next pill intake")
                                    .font(.system(size: 12))
                                    .foregroundColor(.textSecondary)

                                HStack(spacing: 0) {
                                    Text(nextDose, format: .dateTime.month(.abbreviated).day())
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.textSecondary)
                                    Text(", ")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.textSecondary)
                                    Text(nextDose, format: .dateTime.hour().minute())
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.textSecondary)
                                }
                            }
                        }
                    }

                }
            }
            .padding(AppTheme.Spacing.lg)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.lg)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func iconForForm(_ form: MedicationForm) -> String {
        switch form {
        case .tablet: return "pill.fill"
        case .capsule: return "capsule.fill"
        case .liquid: return "drop.fill"
        case .injection: return "syringe.fill"
        case .topical: return "hand.raised.fill"
        case .inhaler: return "wind"
        case .drops: return "drop.fill"
        case .patch: return "bandage.fill"
        }
    }
    
    private func getNextDose() -> Date? {
        // Get next scheduled dose after this one
        let calendar = Calendar.current
        if let nextTime = item.medication.reminderTimes
            .sorted()
            .first(where: { time in
                let components = calendar.dateComponents([.hour, .minute], from: time)
                if let scheduledComponents = calendar.dateComponents([.hour, .minute], from: item.scheduledTime) as DateComponents?,
                   let hour = components.hour,
                   let minute = components.minute,
                   let scheduledHour = scheduledComponents.hour,
                   let scheduledMinute = scheduledComponents.minute {
                    return hour > scheduledHour || (hour == scheduledHour && minute > scheduledMinute)
                }
                return false
            }) {
            return calendar.date(bySettingHour: calendar.component(.hour, from: nextTime),
                               minute: calendar.component(.minute, from: nextTime),
                               second: 0,
                               of: item.scheduledTime)
        }
        return nil
    }
}

// MARK: - Custom Shapes

struct Wave: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let width = rect.width
        let height = rect.height
        
        path.move(to: CGPoint(x: 0, y: height / 2))
        
        for i in stride(from: 0, to: width, by: 10) {
            let x = i
            let y = height / 2 + sin(i / 5) * (height / 4)
            path.addLine(to: CGPoint(x: x, y: y))
        }
        
        return path
    }
}
