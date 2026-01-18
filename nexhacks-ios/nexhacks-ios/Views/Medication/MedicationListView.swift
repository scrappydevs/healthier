//
//  MedicationListView.swift
//  nexhacks-ios
//
//  Medication list view with proper data binding
//

import SwiftUI

struct MedicationListView: View {
    @StateObject var viewModel: MedicationViewModel
    @State private var medicationToVerify: Medication?

    init(viewModel: MedicationViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search Bar
                    searchBar

                    // Filter Options
                    filterOptions

                    // Medication List
                    if viewModel.filteredMedications.isEmpty {
                        emptyState
                    } else {
                        medicationList
                    }
                }
            }
            .navigationTitle("Medications")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        viewModel.showingScanMedication = true
                    } label: {
                        Image(systemName: "doc.text.viewfinder")
                            .foregroundColor(.appPrimary)
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        viewModel.showingAddMedication = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundColor(.appPrimary)
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingAddMedication) {
                AddMedicationView(viewModel: viewModel)
            }
            .sheet(isPresented: $viewModel.showingScanMedication) {
                MedicationScanView(viewModel: viewModel)
            }
            .sheet(item: $medicationToVerify) { medication in
                PillVerificationView(medication: medication) { verified in
                    if verified {
                        viewModel.logMedicationTaken(medication)
                    }
                }
            }
            .sheet(item: $viewModel.selectedMedication) { medication in
                MedicationDetailView(viewModel: viewModel, medication: medication)
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textSecondary)

            TextField("Search medications...", text: $viewModel.searchText)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)

            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.top, AppTheme.Spacing.md)
    }

    // MARK: - Filter Options
    private var filterOptions: some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            FilterButton(
                title: "All",
                isSelected: viewModel.filterOption == .all,
                action: { viewModel.filterOption = .all }
            )

            FilterButton(
                title: "Active",
                isSelected: viewModel.filterOption == .active,
                action: { viewModel.filterOption = .active }
            )

            FilterButton(
                title: "Inactive",
                isSelected: viewModel.filterOption == .inactive,
                action: { viewModel.filterOption = .inactive }
            )

            Spacer()
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.vertical, AppTheme.Spacing.sm)
    }

    // MARK: - Medication List
    private var medicationList: some View {
        ScrollView {
            LazyVStack(spacing: AppTheme.Spacing.md) {
                ForEach(viewModel.filteredMedications) { medication in
                    MedicationCard(
                        medication: medication,
                        onTap: {
                            viewModel.selectedMedication = medication
                        },
                        onToggleActive: {
                            viewModel.toggleMedicationActive(medication)
                        },
                        onLogTaken: {
                            viewModel.logMedicationTaken(medication)
                        },
                        onVerify: {
                            medicationToVerify = medication
                        }
                    )
                }
            }
            .padding(AppTheme.Spacing.md)
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "pills.circle")
                .font(.system(size: 60))
                .foregroundColor(.textSecondary)

            Text("No medications found")
                .font(AppTheme.Typography.title3)
                .foregroundColor(.textPrimary)

            Text("Add your first medication to get started")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            Button {
                viewModel.showingAddMedication = true
            } label: {
                Text("Add Medication")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Supporting Views

struct FilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTheme.Typography.callout)
                .foregroundColor(isSelected ? .white : .textSecondary)
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(isSelected ? Color.appPrimary : Color.cardBackground)
                .cornerRadius(AppTheme.CornerRadius.sm)
        }
    }
}

struct MedicationCard: View {
    let medication: Medication
    let onTap: () -> Void
    let onToggleActive: () -> Void
    let onLogTaken: () -> Void
    let onVerify: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            // Header
            HStack {
                pillIcon
                
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text(medication.name)
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textPrimary)

                    Text(medication.dosage)
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Active badge
                if medication.isActive {
                    Text("Active")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.success)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                } else {
                    Text("Inactive")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.textSecondary)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
            }

            // Details
            HStack(spacing: AppTheme.Spacing.md) {
                DetailItem(icon: "calendar", text: medication.frequency.rawValue)
                DetailItem(icon: "pill", text: medication.form.rawValue)

                if let prescribedBy = medication.prescribedBy {
                    DetailItem(icon: "stethoscope", text: prescribedBy)
                }
            }

            // Reminder Times
            if !medication.reminderTimes.isEmpty {
                HStack {
                    Image(systemName: "bell.fill")
                        .font(.caption)
                        .foregroundColor(.appAccent)

                    ForEach(medication.reminderTimes.prefix(3), id: \.self) { time in
                        Text(time, style: .time)
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    }

                    if medication.reminderTimes.count > 3 {
                        Text("+\(medication.reminderTimes.count - 3)")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
            }

            // Actions
            HStack(spacing: AppTheme.Spacing.sm) {
                Button {
                    onVerify()
                } label: {
                    HStack {
                        Image(systemName: "camera.viewfinder")
                        Text("Verify")
                    }
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.appPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.xs)
                    .background(Color.appPrimary.opacity(0.1))
                    .cornerRadius(AppTheme.CornerRadius.sm)
                }
                
                Button {
                    onLogTaken()
                } label: {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Log Taken")
                    }
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.xs)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.sm)
                }

                Button {
                    onToggleActive()
                } label: {
                    Image(systemName: medication.isActive ? "pause.circle" : "play.circle")
                        .font(.title3)
                        .foregroundColor(.textSecondary)
                        .padding(AppTheme.Spacing.xs)
                        .background(Color.cardBackground)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
            }
        }
        .padding(AppTheme.Spacing.sm)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .onTapGesture {
            onTap()
        }
    }

    private var pillIcon: some View {
        Group {
            if let urlString = medication.bottleImageURL ?? medication.planImageURL,
               let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Image(systemName: "pill.fill")
                            .resizable()
                            .scaledToFit()
                            .padding(8)
                            .foregroundColor(.appPrimary)
                    case .empty:
                        ProgressView()
                    @unknown default:
                        Image(systemName: "pill.fill")
                            .resizable()
                            .scaledToFit()
                            .padding(8)
                            .foregroundColor(.appPrimary)
                    }
                }
            } else {
                Image(systemName: "pill.fill")
                    .resizable()
                    .scaledToFit()
                    .padding(8)
                    .foregroundColor(.appPrimary)
            }
        }
        .frame(width: 36, height: 36)
        .background(Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                .stroke(Color.divider, lineWidth: 1)
        )
        .cornerRadius(AppTheme.CornerRadius.sm)
        .clipped()
    }
}

struct DetailItem: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: AppTheme.Spacing.xs) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.appPrimary)

            Text(text)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
    }
}
