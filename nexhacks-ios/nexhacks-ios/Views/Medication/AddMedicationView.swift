//
//  AddMedicationView.swift
//  nexhacks-ios
//
//  Form for manually adding a new medication with bottle image capture
//

import SwiftUI
import PhotosUI

struct AddMedicationView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MedicationViewModel

    @State private var name = ""
    @State private var dosage = ""
    @State private var frequency: MedicationFrequency = .daily
    @State private var form: MedicationForm = .tablet
    @State private var instructions = ""
    @State private var prescribedBy = ""
    @State private var reminderTime = Date()
    @State private var reminderTimes: [Date] = []
    @State private var expectedPillCount = 1
    @State private var pillDescription = ""

    // Image capture states
    @State private var bottleImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPhotoPicker = false

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Bottle Image Section
                        bottleImageSection

                        // Basic Info Section
                        FormSection(title: "MEDICATION INFO") {
                            FormTextField(title: "Name", text: $name, placeholder: "e.g., Lisinopril")
                            FormTextField(title: "Dosage", text: $dosage, placeholder: "e.g., 10mg")
                        }

                        // Type Section
                        FormSection(title: "TYPE") {
                            FormPicker(title: "Frequency", selection: $frequency) {
                                ForEach(MedicationFrequency.allCases, id: \.self) { freq in
                                    Text(freq.rawValue).tag(freq)
                                }
                            }

                            FormPicker(title: "Form", selection: $form) {
                                ForEach(MedicationForm.allCases, id: \.self) { f in
                                    Text(f.rawValue).tag(f)
                                }
                            }
                        }

                        // Dose Details Section
                        FormSection(title: "DOSE DETAILS") {
                            pillCountPicker
                            FormTextField(title: "Pill Description", text: $pillDescription, placeholder: "e.g., White round tablet with 'M10' imprint")
                        }

                        // Instructions Section
                        FormSection(title: "DETAILS") {
                            FormTextField(title: "Instructions", text: $instructions, placeholder: "e.g., Take with food")
                            FormTextField(title: "Prescribed by", text: $prescribedBy, placeholder: "e.g., Dr. Smith")
                        }

                        // Reminder Times Section
                        FormSection(title: "REMINDERS") {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                                ForEach(reminderTimes.indices, id: \.self) { index in
                                    HStack {
                                        Text(reminderTimes[index], style: .time)
                                            .font(AppTheme.Typography.body)
                                            .foregroundColor(.textPrimary)

                                        Spacer()

                                        Button {
                                            reminderTimes.remove(at: index)
                                        } label: {
                                            Image(systemName: "minus.circle.fill")
                                                .foregroundColor(.error)
                                        }
                                    }
                                    .padding(.vertical, AppTheme.Spacing.xs)
                                }

                                HStack {
                                    DatePicker("Add time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                                        .labelsHidden()

                                    Spacer()

                                    Button {
                                        reminderTimes.append(reminderTime)
                                    } label: {
                                        Image(systemName: "plus.circle.fill")
                                            .foregroundColor(.appPrimary)
                                            .font(.title2)
                                    }
                                }
                            }
                        }

                        // Add Button
                        Button {
                            addMedication()
                        } label: {
                            Text("Add Medication")
                                .font(AppTheme.Typography.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AppTheme.Spacing.md)
                                .background(isValid ? Color.appPrimary : Color.textSecondary)
                                .cornerRadius(AppTheme.CornerRadius.md)
                        }
                        .disabled(!isValid)
                        .padding(.top, AppTheme.Spacing.md)
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Add Medication")
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
                CameraView(image: $bottleImage)
            }
            .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
            .onChange(of: selectedPhotoItem) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        bottleImage = uiImage
                    }
                }
            }
        }
    }

    // MARK: - Bottle Image Section

    private var bottleImageSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("MEDICATION BOTTLE")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            if let image = bottleImage {
                // Show captured image
                VStack(spacing: AppTheme.Spacing.md) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 150)
                        .clipShape(RoundedRectangle(cornerRadius: 15))

                    Button {
                        bottleImage = nil
                    } label: {
                        HStack {
                            Image(systemName: "xmark.circle.fill")
                            Text("Remove Photo")
                        }
                        .font(AppTheme.Typography.callout)
                        .foregroundColor(.error)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(AppTheme.Spacing.md)
                .background(Color.cardBackground)
                .cornerRadius(AppTheme.CornerRadius.md)
            } else {
                // Show capture options
                VStack(spacing: AppTheme.Spacing.md) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 40))
                        .foregroundColor(.appPrimary)

                    Text("Add a photo of the medication bottle")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    HStack(spacing: AppTheme.Spacing.md) {
                        Button {
                            showCamera = true
                        } label: {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Camera")
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
                                Text("Library")
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
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(AppTheme.Spacing.lg)
                .background(Color.cardBackground)
                .cornerRadius(AppTheme.CornerRadius.md)
            }
        }
    }

    // MARK: - Pill Count Picker

    private var pillCountPicker: some View {
        HStack {
            Text("Pills per dose")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)

            Spacer()

            HStack(spacing: AppTheme.Spacing.md) {
                Button {
                    if expectedPillCount > 1 {
                        expectedPillCount -= 1
                    }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundColor(expectedPillCount > 1 ? .appPrimary : .textSecondary)
                }
                .disabled(expectedPillCount <= 1)

                Text("\(expectedPillCount)")
                    .font(AppTheme.Typography.title3)
                    .foregroundColor(.textPrimary)
                    .frame(minWidth: 40)

                Button {
                    if expectedPillCount < 10 {
                        expectedPillCount += 1
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(expectedPillCount < 10 ? .appPrimary : .textSecondary)
                }
                .disabled(expectedPillCount >= 10)
            }
        }
        .padding(AppTheme.Spacing.md)
    }

    private var isValid: Bool {
        !name.isEmpty && !dosage.isEmpty
    }

    private func addMedication() {
        let medication = Medication(
            name: name,
            dosage: dosage,
            frequency: frequency,
            form: form,
            instructions: instructions.isEmpty ? nil : instructions,
            prescribedBy: prescribedBy.isEmpty ? nil : prescribedBy,
            reminderTimes: reminderTimes,
            pillDescription: pillDescription.isEmpty ? nil : pillDescription,
            expectedPillCount: expectedPillCount
        )
        viewModel.addMedication(medication)
        dismiss()
    }
}

// MARK: - Form Components

struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            VStack(spacing: 0) {
                content
            }
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
        }
    }
}

struct FormTextField: View {
    let title: String
    @Binding var text: String
    var placeholder: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)

            TextField(placeholder, text: $text)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
        }
        .padding(AppTheme.Spacing.md)
    }
}

struct FormPicker<SelectionValue: Hashable, Content: View>: View {
    let title: String
    @Binding var selection: SelectionValue
    @ViewBuilder let content: Content

    var body: some View {
        HStack {
            Text(title)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)

            Spacer()

            Picker(title, selection: $selection) {
                content
            }
            .pickerStyle(.menu)
            .tint(.appPrimary)
        }
        .padding(AppTheme.Spacing.md)
    }
}
