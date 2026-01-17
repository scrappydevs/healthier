//
//  MedicationDetailView.swift
//  nexhacks-ios
//
//  Detailed view for a single medication with bottle image, dosage info, and verification flow
//

import SwiftUI

struct MedicationDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MedicationViewModel
    let medication: Medication

    @State private var showingVerification = false
    @State private var showingEditSheet = false

    private var nextDoseTime: Date? {
        let calendar = Calendar.current
        let now = Date()

        for time in medication.reminderTimes.sorted() {
            let components = calendar.dateComponents([.hour, .minute], from: time)
            if let todayTime = calendar.date(bySettingHour: components.hour ?? 0,
                                             minute: components.minute ?? 0,
                                             second: 0, of: now) {
                if todayTime > now {
                    return todayTime
                }
            }
        }

        // If no more doses today, return first dose tomorrow
        if let firstTime = medication.reminderTimes.sorted().first {
            let components = calendar.dateComponents([.hour, .minute], from: firstTime)
            if let tomorrow = calendar.date(byAdding: .day, value: 1, to: now),
               let tomorrowTime = calendar.date(bySettingHour: components.hour ?? 0,
                                                minute: components.minute ?? 0,
                                                second: 0, of: tomorrow) {
                return tomorrowTime
            }
        }

        return nil
    }

    private var recentLogs: [MedicationLog] {
        medication.takenLog
            .sorted { $0.takenAt > $1.takenAt }
            .prefix(5)
            .map { $0 }
    }

    private var adherenceRate: Double {
        viewModel.getAdherenceRate(for: medication)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        VStack(spacing: AppTheme.Spacing.lg) {
                            // Bottle Image Section
                            bottleImageSection

                            // Instructions Section
                            if let instructions = medication.instructions, !instructions.isEmpty {
                                instructionsSection(instructions)
                            }

                            // Medication Info & Next Dose Combined
                            combinedInfoSection

                            // Take Now Button (requires verification)
                            takeNowButton
                        }
                        .padding(.horizontal, AppTheme.Spacing.md)

                        // Recent History (full width)
                        recentHistorySection
                    }
                    .padding(.top, AppTheme.Spacing.md)
                }
            }
            .navigationTitle(medication.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingEditSheet = true
                    } label: {
                        Image(systemName: "pencil")
                            .foregroundColor(.appPrimary)
                    }
                }
            }
            .sheet(isPresented: $showingVerification) {
                PillVerificationView(medication: medication) { verified in
                    if verified {
                        viewModel.logMedicationTaken(medication, wasOnTime: true, verificationStatus: .verified)
                    }
                }
            }
        }
    }

    // MARK: - Bottle Image Section

    private var bottleImageSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let bottleURL = medication.bottleImageURL,
               let url = URL(string: bottleURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(height: 200)
                            .clipShape(RoundedRectangle(cornerRadius: 15))
                    case .failure:
                        placeholderBottleImage
                    case .empty:
                        ProgressView()
                            .frame(height: 200)
                    @unknown default:
                        placeholderBottleImage
                    }
                }
            } else {
                placeholderBottleImage
            }
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.lg)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
    }

    private var placeholderBottleImage: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: iconForForm(medication.form))
                .font(.system(size: 80))
                .foregroundColor(.appPrimary)

            Text(medication.form.rawValue)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(height: 200)
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

    // MARK: - Combined Info Section

    private var combinedInfoSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
            // Header with status
            HStack {
                Text("MEDICATION DETAILS")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .tracking(1)
                
                Spacer()
                
                // Status badge
                if medication.isActive {
                    Text("Active")
                        .font(AppTheme.Typography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.md)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.success)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                } else {
                    Text("Inactive")
                        .font(AppTheme.Typography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.md)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.textSecondary)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
            }
            
            // Medication info grid
            VStack(spacing: AppTheme.Spacing.sm) {
                infoRow(label: "Dosage", value: medication.dosage)
                infoRow(label: "Form", value: medication.form.rawValue)
                infoRow(label: "Frequency", value: medication.frequency.rawValue)
                infoRow(label: "Pills per dose", value: "\(medication.expectedPillCount)")

                if let prescribedBy = medication.prescribedBy {
                    infoRow(label: "Prescribed by", value: prescribedBy)
                }
            }
            
            Divider()
            
            // Next dose with adherence
            HStack(spacing: AppTheme.Spacing.lg) {
                // Next Dose
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.appAccent)
                        Text("Next Dose")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                            .textCase(.uppercase)
                            .tracking(1)
                    }
                    
                    if let nextDose = nextDoseTime {
                        Text(nextDose, style: .time)
                            .font(AppTheme.Typography.title3)
                            .foregroundColor(.textPrimary)
                        
                        Text(nextDose, style: .relative)
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    } else {
                        Text("None scheduled")
                            .font(AppTheme.Typography.body)
                            .foregroundColor(.textSecondary)
                    }
                }
                
                Spacer()
                
                // Adherence circle
                ZStack {
                    Circle()
                        .stroke(Color.divider, lineWidth: 8)
                        .frame(width: 70, height: 70)

                    Circle()
                        .trim(from: 0, to: adherenceRate)
                        .stroke(
                            adherenceRate > 0.8 ? Color.success :
                            (adherenceRate > 0.5 ? Color.warning : Color.error),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 70, height: 70)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 0) {
                        Text("\(Int(adherenceRate * 100))%")
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.textPrimary)
                        Text("adherence")
                            .font(.system(size: 8))
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            
            // Reminder times
            if !medication.reminderTimes.isEmpty {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text("DAILY SCHEDULE")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                    
                    HStack(spacing: AppTheme.Spacing.sm) {
                        ForEach(medication.reminderTimes.sorted(), id: \.self) { time in
                            Text(time, style: .time)
                                .font(AppTheme.Typography.body)
                                .fontWeight(.medium)
                                .foregroundColor(.appPrimary)
                                .padding(.horizontal, AppTheme.Spacing.md)
                                .padding(.vertical, AppTheme.Spacing.sm)
                                .background(Color.appPrimary.opacity(0.1))
                                .cornerRadius(AppTheme.CornerRadius.sm)
                        }
                    }
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
            Spacer()
            Text(value)
                .font(AppTheme.Typography.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
        }
    }

    // MARK: - Take Now Button

    private var takeNowButton: some View {
        Button {
            showingVerification = true
        } label: {
            HStack {
                Image(systemName: "camera.viewfinder")
                    .font(.title3)
                Text("Take Now")
                    .font(AppTheme.Typography.headline)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppTheme.Spacing.md)
            .background(Color.appPrimary)
            .cornerRadius(AppTheme.CornerRadius.md)
        }
        .padding(.vertical, AppTheme.Spacing.sm)
    }

    // MARK: - Instructions Section

    private func instructionsSection(_ instructions: String) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
            // Header with status
            HStack {
                Text("INSTRUCTIONS")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .tracking(1)
                
                Spacer()
            }
            
            HStack(alignment: .top) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.appPrimary)

                Text(instructions)
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.textPrimary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
    }

    // MARK: - Recent History Section

    private var recentHistorySection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack {
                Text("RECENT HISTORY")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .tracking(1)
                
                Spacer()
                
                if !recentLogs.isEmpty {
                    Text("\(medication.takenLog.count) total doses")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                }
            }

            if recentLogs.isEmpty {
                VStack(spacing: AppTheme.Spacing.sm) {
                    Image(systemName: "clock.badge")
                    // ... rest of empty state content
                    .font(.title)
                    .foregroundColor(.textSecondary)
                    Text("No doses logged yet")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.xl)
            } else {
                VStack(spacing: 0) {
                    ForEach(recentLogs) { log in
                        HStack(spacing: AppTheme.Spacing.md) {
                            // Verification status icon
                            Image(systemName: iconForVerificationStatus(log.verificationStatus))
                                .font(.title3)
                                .foregroundColor(colorForVerificationStatus(log.verificationStatus))
                                .frame(width: 40)

                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text(log.takenAt, style: .date)
                                    .font(AppTheme.Typography.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.textPrimary)

                                HStack(spacing: AppTheme.Spacing.sm) {
                                    Text(log.takenAt, style: .time)
                                        .font(AppTheme.Typography.caption)
                                        .foregroundColor(.textSecondary)

                                    Text("•")
                                        .foregroundColor(.textSecondary)

                                    if log.wasOnTime {
                                        Text("On time")
                                            .font(AppTheme.Typography.caption)
                                            .foregroundColor(.success)
                                    } else {
                                        Text("Late")
                                            .font(AppTheme.Typography.caption)
                                            .foregroundColor(.warning)
                                    }
                                    
                                    if let count = log.detectedPillCount {
                                        Text("•")
                                            .foregroundColor(.textSecondary)
                                        Text("\(count) pills")
                                            .font(AppTheme.Typography.caption)
                                            .foregroundColor(.textSecondary)
                                    }
                                }
                            }

                            Spacer()
                            
                            // Verification badge
                            Text(log.verificationStatus.rawValue)
                                .font(AppTheme.Typography.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                                .padding(.horizontal, AppTheme.Spacing.sm)
                                .padding(.vertical, AppTheme.Spacing.xs)
                                .background(colorForVerificationStatus(log.verificationStatus))
                                .cornerRadius(AppTheme.CornerRadius.sm)
                        }
                        .padding(.horizontal, AppTheme.Spacing.md)
                        .padding(.vertical, AppTheme.Spacing.md)

                        if log.id != recentLogs.last?.id {
                            Divider()
                                .padding(.leading, 56)
                        }
                    }
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
        .padding(.horizontal, AppTheme.Spacing.md)
    }

    private func iconForVerificationStatus(_ status: VerificationStatus) -> String {
        switch status {
        case .verified: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .notVerified: return "questionmark.circle.fill"
        }
    }

    private func colorForVerificationStatus(_ status: VerificationStatus) -> Color {
        switch status {
        case .verified: return .success
        case .warning: return .warning
        case .notVerified: return .textSecondary
        }
    }
}
