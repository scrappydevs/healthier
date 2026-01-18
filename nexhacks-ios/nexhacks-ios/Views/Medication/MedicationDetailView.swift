//
//  MedicationDetailView.swift
//  nexhacks-ios
//
//  Detailed view for a single medication with bottle image, dosage info, and verification flow
//

import SwiftUI
import PhotosUI

struct MedicationDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MedicationViewModel
    let medication: Medication

    @State private var showingVerification = false
    @State private var showingEditSheet = false
    @State private var showingTimingWarning = false
    @State private var timingWarningMessage = ""

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
            .sheet(isPresented: $showingEditSheet) {
                MedicationImageEditSheet(
                    viewModel: viewModel,
                    medication: medication
                )
            }
            .alert("Do Not Take This Pill Now", isPresented: $showingTimingWarning) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(timingWarningMessage)
            }
        }
    }

    // MARK: - Bottle Image Section

    private var bottleImageSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let bottleURL = medication.bottleImageURL ?? medication.planImageURL,
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
            if let warning = timingWarningMessage(for: medication) {
                timingWarningMessage = warning
                showingTimingWarning = true
            } else {
                showingVerification = true
            }
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

    private func timingWarningMessage(for medication: Medication) -> String? {
        guard let scheduled = nearestScheduledDoseTime(for: medication) else {
            return nil
        }

        let now = Date()
        let diff = scheduled.timeIntervalSince(now)
        let threshold: TimeInterval = 2 * 60 * 60

        if abs(diff) <= threshold {
            return nil
        }

        let timeFormatter = DateFormatter()
        timeFormatter.dateStyle = .none
        timeFormatter.timeStyle = .short

        let direction = diff > 0 ? "early" : "late"
        let minutes = Int(abs(diff) / 60)
        let hoursPart = minutes / 60
        let minutesPart = minutes % 60
        let offset = hoursPart > 0
            ? "\(hoursPart)h \(minutesPart)m"
            : "\(minutesPart)m"

        return "You are \(offset) \(direction). This dose is scheduled for \(timeFormatter.string(from: scheduled)). Taking medications at the right time is important for safety and effectiveness."
    }

    private func nearestScheduledDoseTime(for medication: Medication) -> Date? {
        guard !medication.reminderTimes.isEmpty else { return nil }
        let calendar = Calendar.current
        let now = Date()

        var nearest: Date?
        var smallestDiff = TimeInterval.greatestFiniteMagnitude

        for reminderTime in medication.reminderTimes {
            let components = calendar.dateComponents([.hour, .minute], from: reminderTime)
            let candidateToday = calendar.date(bySettingHour: components.hour ?? 0,
                                               minute: components.minute ?? 0,
                                               second: 0,
                                               of: now)
            let candidateYesterday = calendar.date(byAdding: .day, value: -1, to: candidateToday ?? now)
            let candidateTomorrow = calendar.date(byAdding: .day, value: 1, to: candidateToday ?? now)

            for candidate in [candidateYesterday, candidateToday, candidateTomorrow] {
                guard let candidate = candidate else { continue }
                let diff = abs(candidate.timeIntervalSince(now))
                if diff < smallestDiff {
                    smallestDiff = diff
                    nearest = candidate
                }
            }
        }

        return nearest
    }
}

struct MedicationImageEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MedicationViewModel
    let medication: Medication

    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var removeImage = false

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        imagePreview
                        actionButtons

                        Button {
                            Task {
                                await saveImage()
                            }
                        } label: {
                            Text(isSaving ? "Saving..." : "Save")
                                .font(AppTheme.Typography.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AppTheme.Spacing.md)
                                .background(isSaving ? Color.textSecondary : Color.appPrimary)
                                .cornerRadius(AppTheme.CornerRadius.md)
                        }
                        .disabled(isSaving)
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Edit Pill Image")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraView(image: $selectedImage)
            }
            .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
            .onChange(of: selectedPhotoItem) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        selectedImage = uiImage
                        removeImage = false
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "Unable to update image.")
            }
        }
        .onAppear {
            removeImage = false
        }
    }

    private var imagePreview: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: 15))
            } else if let urlString = medication.bottleImageURL ?? medication.planImageURL,
                      let url = URL(string: urlString),
                      !removeImage {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .frame(height: 220)
                            .clipShape(RoundedRectangle(cornerRadius: 15))
                    case .failure:
                        placeholderImage
                    case .empty:
                        ProgressView()
                            .frame(height: 220)
                    @unknown default:
                        placeholderImage
                    }
                }
            } else {
                placeholderImage
            }
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private var placeholderImage: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "photo")
                .font(.system(size: 48))
                .foregroundColor(.appPrimary)
            Text("No pill image")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
        }
        .frame(height: 180)
    }

    private var actionButtons: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Button {
                showCamera = true
            } label: {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Take Photo")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(Color.appPrimary)
                .cornerRadius(AppTheme.CornerRadius.sm)
            }

            Button {
                showPhotoPicker = true
            } label: {
                HStack {
                    Image(systemName: "photo")
                    Text("Choose from Library")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.appPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(Color.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                        .stroke(Color.appPrimary, lineWidth: 1)
                )
                .cornerRadius(AppTheme.CornerRadius.sm)
            }

            Button {
                selectedImage = nil
                removeImage = true
            } label: {
                HStack {
                    Image(systemName: "trash")
                    Text("Remove Image")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.error)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(Color.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                        .stroke(Color.error, lineWidth: 1)
                )
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
    }

    private func saveImage() async {
        isSaving = true
        defer { isSaving = false }

        if !removeImage && selectedImage == nil {
            dismiss()
            return
        }

        let imageToSave: UIImage? = removeImage ? nil : selectedImage
        await viewModel.updateMedicationImage(medication, image: imageToSave)
        if let message = viewModel.errorMessage, !message.isEmpty {
            errorMessage = message
            showError = true
            return
        }
        dismiss()
    }
}
