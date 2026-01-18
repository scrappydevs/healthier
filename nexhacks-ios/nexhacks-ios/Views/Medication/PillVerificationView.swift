//
//  PillVerificationView.swift
//  nexhacks-ios
//
//  View for scanning and verifying pills before taking them - REQUIRED verification
//

import SwiftUI
import PhotosUI

struct PillVerificationView: View {
    @Environment(\.dismiss) private var dismiss
    let medication: Medication
    let onVerified: (VerificationStatus) -> Void
    private let isClaudeVerification = true

    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var isVerifying = false
    @State private var verificationResult: PillVerificationResult?
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showContinueAlert = false
    @State private var boundedImageUrl: String?
    @State private var boundedImage: UIImage?
    private let claudeService = ClaudeAPIService()
    private let backendService = BackendAPIService()

    // Determine if verification passed (correct medication AND correct dose)
    private var canConfirm: Bool {
        guard let result = verificationResult else { return false }
        return result.isMatch && result.isCorrectDose
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Medication Info with expected pill count
                        medicationInfoSection

                        if selectedImage == nil {
                            captureSection
                        } else {
                            imagePreviewSection
                        }

                        if isVerifying {
                            verifyingSection
                        }

                        if let result = verificationResult {
                            verificationResultSection(result)
                        }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Verify Dose")
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
                        await verifyPill()
                    }
                }
            }
            .onChange(of: selectedImage) { _, newValue in
                if newValue != nil && verificationResult == nil {
                    Task {
                        await verifyPill()
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An error occurred")
            }
        }
    }

    // MARK: - Medication Info Section

    private var medicationInfoSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("EXPECTED MEDICATION")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text(medication.name)
                            .font(AppTheme.Typography.title3)
                            .foregroundColor(.textPrimary)

                        Text(medication.dosage)
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.textSecondary)

                        HStack {
                            Label(medication.frequency.rawValue, systemImage: "clock")
                            Label(medication.form.rawValue, systemImage: "pills")
                        }
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "pills.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.appPrimary)
                }

                // Expected pill count highlight
                HStack {
                    Image(systemName: "number.circle.fill")
                        .foregroundColor(.appAccent)
                    Text("Expected: \(medication.expectedPillCount) pill\(medication.expectedPillCount == 1 ? "" : "s")")
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.appAccent)
                }
                .padding(AppTheme.Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.appAccent.opacity(0.15))
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
            .padding(AppTheme.Spacing.md)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
        }
    }

    // MARK: - Capture Section

    private var captureSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "camera.viewfinder")
                .font(.system(size: 60))
                .foregroundColor(.appPrimary)

            Text("Verify Your Dose")
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)

            Text("Take a clear photo of the pills you're about to take. We'll verify both the medication type AND the correct number of pills.")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            VStack(spacing: AppTheme.Spacing.md) {
                Button {
                    showCamera = true
                } label: {
                    HStack {
                        Image(systemName: "camera.fill")
                        Text("Take Photo")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }

                Button {
                    showPhotoPicker = true
                } label: {
                    HStack {
                        Image(systemName: "photo.on.rectangle")
                        Text("Choose from Library")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.appPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                            .stroke(Color.appPrimary, lineWidth: 2)
                    )
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
        }
        .padding(AppTheme.Spacing.lg)
    }

    // MARK: - Image Preview Section

    private var imagePreviewSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let bounded = boundedImage {
                VStack(spacing: AppTheme.Spacing.sm) {
                    Text("Detected Pills")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                    
                    Image(uiImage: bounded)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 200)
                        .cornerRadius(AppTheme.CornerRadius.md)
                }
            } else if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }

            if verificationResult == nil && !isVerifying {
                Button {
                    selectedImage = nil
                    boundedImage = nil
                    boundedImageUrl = nil
                    verificationResult = nil
                } label: {
                    Text("Retake Photo")
                        .font(AppTheme.Typography.callout)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Verifying Section

    private var verifyingSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Verifying your dose...")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text("Checking medication type and counting pills")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppTheme.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Verification Result Section

    private func verificationResultSection(_ result: PillVerificationResult) -> some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            // Status Icon - based on both medication match AND dose correctness
            statusIconSection(result)

            if isClaudeVerification {
                claudeWarningsSection(result)
            } else {
                if !canConfirm {
                    // Pill Count Section (always show if we have a detected count)
                    if let detected = result.detectedPillCount {
                        pillCountSection(detected: detected, expected: medication.expectedPillCount, isCorrect: result.isCorrectDose)
                    }

                    // Dosage Warning (if any)
                    if let warning = result.dosageWarning {
                        dosageWarningSection(warning: warning, isOverdose: (result.detectedPillCount ?? 0) > medication.expectedPillCount)
                    }
                }

                // Medication match info
                if result.isMatch {
                    medicationMatchSection(result)
                } else {
                    if !canConfirm {
                        medicationMismatchSection(result)
                    }
                }

                if !canConfirm {
                    // Recommendation
                    recommendationSection(result)

                    // Warnings
                    if !result.warnings.isEmpty {
                        warningsSection(result.warnings)
                    }
                }
            }

            // Action Buttons
            actionButtonsSection(result)
        }
        .padding(AppTheme.Spacing.lg)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private func statusIconSection(_ result: PillVerificationResult) -> some View {
        VStack(spacing: AppTheme.Spacing.sm) {
            ZStack {
                Circle()
                    .fill(canConfirm ? Color.success.opacity(0.2) : Color.error.opacity(0.2))
                    .frame(width: 100, height: 100)

                Image(systemName: canConfirm ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(canConfirm ? .success : .error)
            }

            if !canConfirm {
                Text(statusText(result))
                    .font(AppTheme.Typography.title2)
                    .foregroundColor(.error)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private func statusText(_ result: PillVerificationResult) -> String {
        if !result.isMatch {
            return "Wrong Medication"
        } else if !result.isCorrectDose {
            if let detected = result.detectedPillCount, detected > medication.expectedPillCount {
                return "Too Many Pills"
            } else {
                return "Not Enough Pills"
            }
        } else {
            return "Verified"
        }
    }

    private func pillCountSection(detected: Int, expected: Int, isCorrect: Bool) -> some View {
        HStack(spacing: AppTheme.Spacing.lg) {
            VStack {
                Text("\(detected)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(isCorrect ? .success : .error)
                Text("Detected")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Image(systemName: isCorrect ? "equal.circle.fill" : "xmark.circle.fill")
                .font(.title)
                .foregroundColor(isCorrect ? .success : .error)

            VStack {
                Text("\(expected)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.textPrimary)
                Text("Expected")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(AppTheme.Spacing.md)
        .frame(maxWidth: .infinity)
        .background(isCorrect ? Color.success.opacity(0.1) : Color.error.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private func dosageWarningSection(warning: String, isOverdose: Bool) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack {
                Image(systemName: isOverdose ? "exclamationmark.octagon.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(isOverdose ? .error : .warning)
                Text(isOverdose ? "OVERDOSE WARNING" : "UNDERDOSE WARNING")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(isOverdose ? .error : .warning)
            }

            Text(warning)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(isOverdose ? Color.error.opacity(0.15) : Color.warning.opacity(0.15))
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private func medicationMatchSection(_ result: PillVerificationResult) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(.success)
                Text("Medication Verified")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.success)
            }

            Text(result.detectedDescription)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)

            HStack {
                Text("Confidence:")
                    .foregroundColor(.textSecondary)
                Text("\(Int(result.confidence * 100))%")
                    .fontWeight(.semibold)
                    .foregroundColor(result.confidence > 0.8 ? .success : (result.confidence > 0.5 ? .warning : .error))
            }
            .font(AppTheme.Typography.caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.success.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }

    private func medicationMismatchSection(_ result: PillVerificationResult) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack {
                Image(systemName: "xmark.seal.fill")
                    .foregroundColor(.error)
                Text("Medication Mismatch")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.error)
            }

            Text("What we detected:")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)

            Text(result.detectedDescription)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.error.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }

    private func recommendationSection(_ result: PillVerificationResult) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Label("Recommendation", systemImage: "lightbulb.fill")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.appPrimary)

            Text(result.recommendation)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.appPrimary.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }

    private func warningsSection(_ warnings: [String]) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Label("Warnings", systemImage: "exclamationmark.triangle.fill")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.warning)

            ForEach(warnings, id: \.self) { warning in
                Text("• \(warning)")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.textPrimary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.warning.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
    
    private func claudeWarningsSection(_ result: PillVerificationResult) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("We could not confidently identify this pill. Please double-check before taking it.")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
            
            warningsSection(result.warnings.isEmpty
                            ? ["Please double-check the pill with the label or packaging."]
                            : result.warnings)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func actionButtonsSection(_ result: PillVerificationResult) -> some View {
        VStack(spacing: AppTheme.Spacing.md) {
            // Only show confirm button if verification passed
            if canConfirm {
                Button {
                    onVerified(.verified)
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Confirm & Log Taken")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.success)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
            
            if isClaudeVerification && !canConfirm {
                Button {
                    showContinueAlert = true
                } label: {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("Continue Anyway")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.warning)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }

            // Always show retake button
            Button {
                selectedImage = nil
                boundedImage = nil
                boundedImageUrl = nil
                verificationResult = nil
            } label: {
                HStack {
                    Image(systemName: "camera.viewfinder")
                    Text(canConfirm ? "Scan Again" : "Retake Photo")
                }
                .font(AppTheme.Typography.headline)
                .foregroundColor(canConfirm ? .appPrimary : .white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.md)
                .background(canConfirm ? Color.cardBackground : Color.appPrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                        .stroke(Color.appPrimary, lineWidth: canConfirm ? 2 : 0)
                )
                .cornerRadius(AppTheme.CornerRadius.md)
            }

            // Show warning message if verification failed
            if !canConfirm && !isClaudeVerification {
                Text("You must take a photo showing the correct number of pills before logging this dose.")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, AppTheme.Spacing.sm)
            }
        }
        .padding(.top, AppTheme.Spacing.md)
        .alert("Continue anyway?", isPresented: $showContinueAlert) {
            Button("Go Ahead Anyway", role: .destructive) {
                onVerified(.warning)
                dismiss()
            }
            Button("Retake Photo") {
                selectedImage = nil
                boundedImage = nil
                boundedImageUrl = nil
                verificationResult = nil
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("We could not confirm this pill. If you proceed, it will be logged as a warning.")
        }
    }

    // MARK: - Methods

    private func verifyPill() async {
        guard let image = selectedImage,
              let imageData = image.jpegData(compressionQuality: 0.8) else {
            return
        }

        isVerifying = true
        verificationResult = nil
        boundedImage = nil
        boundedImageUrl = nil

        do {
            let bounded = try await fetchBoundedImage(from: imageData)
            boundedImage = bounded.image
            boundedImageUrl = bounded.url

            let result = try await claudeService.verifyPill(
                imageData: imageData,
                expectedMedication: medication
            )
            verificationResult = result
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isVerifying = false
    }

    private func fetchBoundedImage(from imageData: Data) async throws -> (image: UIImage, url: String) {
        let maxAttempts = 5
        let retryDelay: UInt64 = 1_000_000_000
        var lastError: Error?

        for attempt in 1...maxAttempts {
            do {
                let response = try await backendService.detectPills(imageData: imageData)
                let url = response.boundedImageUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                if !url.isEmpty {
                    let image = try await backendService.downloadImage(from: url)
                    return (image, url)
                }
                lastError = NSError(
                    domain: "PillVerificationView",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "No bounded image URL returned (attempt \(attempt))"]
                )
            } catch {
                lastError = error
            }

            if attempt < maxAttempts {
                try await Task.sleep(nanoseconds: retryDelay)
            }
        }

        throw lastError ?? NSError(
            domain: "PillVerificationView",
            code: 2,
            userInfo: [NSLocalizedDescriptionKey: "Failed to fetch bounded image after retries"]
        )
    }
    
}
