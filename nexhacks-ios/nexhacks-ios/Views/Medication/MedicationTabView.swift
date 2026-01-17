//
//  MedicationTabView.swift
//  nexhacks-ios
//
//  Container view for the Pills tab with sub-navigation between Schedule, Medications, and Analytics
//

import SwiftUI

struct MedicationTabView: View {
    @ObservedObject var viewModel: MedicationViewModel
    @State private var selectedTab: MedicationSubTab = .schedule
    @State private var showingAddMedication = false
    @State private var showingScanMedication = false
    @State private var selectedMedication: Medication?

    enum MedicationSubTab: String, CaseIterable {
        case schedule = "Schedule"
        case medications = "Medications"
        case analytics = "Analytics"

        var icon: String {
            switch self {
            case .schedule: return "calendar.badge.clock"
            case .medications: return "pills.fill"
            case .analytics: return "chart.bar.fill"
            }
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Sub-tab selector
                subTabSelector

                // Content based on selected tab
                Group {
                    switch selectedTab {
                    case .schedule:
                        MedicationScheduleView(viewModel: viewModel)
                    case .medications:
                        medicationListContent
                    case .analytics:
                        MedicationAnalyticsView(viewModel: viewModel)
                    }
                }
            }
            .background(Color.appBackground)
            .navigationTitle(selectedTab.rawValue)
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingAddMedication) {
                AddMedicationView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingScanMedication) {
                MedicationScanView(viewModel: viewModel)
            }
            .sheet(item: $selectedMedication) { medication in
                MedicationDetailView(viewModel: viewModel, medication: medication)
            }
        }
    }

    // MARK: - Sub Tab Selector

    private var subTabSelector: some View {
        HStack(spacing: 0) {
            ForEach(MedicationSubTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: AppTheme.Spacing.xs) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 18))

                        Text(tab.rawValue)
                            .font(AppTheme.Typography.caption)
                    }
                    .foregroundColor(selectedTab == tab ? .appPrimary : .textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.sm)
                    .background(
                        selectedTab == tab ?
                        Color.appPrimary.opacity(0.1) :
                        Color.clear
                    )
                }
            }
        }
        .background(Color.cardBackground)
        .overlay(
            Rectangle()
                .fill(Color.divider)
                .frame(height: 1),
            alignment: .bottom
        )
    }

    // MARK: - Medication List Content

    private var medicationListContent: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Medication List
                if viewModel.filteredMedications.isEmpty {
                    emptyState
                } else {
                    medicationList
                }
                
                // Bottom action buttons
                bottomActionButtons
            }
        }
    }
    
    private var bottomActionButtons: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            Spacer()
            
            Button {
                showingScanMedication = true
            } label: {
                Image(systemName: "doc.text.viewfinder")
                    .font(.title2)
                    .foregroundColor(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.appSecondary)
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
            }
            
            Button {
                showingAddMedication = true
            } label: {
                Image(systemName: "plus")
                    .font(.title2.bold())
                    .foregroundColor(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.appPrimary)
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
            }
        }
        .padding(AppTheme.Spacing.md)
    }

    private var medicationList: some View {
        ScrollView {
            LazyVStack(spacing: AppTheme.Spacing.md) {
                ForEach(viewModel.filteredMedications) { medication in
                    MedicationCardCompact(
                        medication: medication,
                        adherenceRate: viewModel.getAdherenceRate(for: medication),
                        onTap: {
                            selectedMedication = medication
                        }
                    )
                }
            }
            .padding(AppTheme.Spacing.md)
        }
    }

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
                showingAddMedication = true
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

struct FilterChip: View {
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

struct MedicationCardCompact: View {
    let medication: Medication
    let adherenceRate: Double
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: AppTheme.Spacing.md) {
                // Icon
                Image(systemName: iconForForm(medication.form))
                    .font(.title2)
                    .foregroundColor(.appPrimary)
                    .frame(width: 50, height: 50)
                    .background(Color.appPrimary.opacity(0.1))
                    .cornerRadius(AppTheme.CornerRadius.sm)

                // Info
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    HStack {
                        Text(medication.name)
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.textPrimary)

                        Spacer()

                        // Status badge
                        if medication.isActive {
                            Circle()
                                .fill(Color.success)
                                .frame(width: 8, height: 8)
                        }
                    }

                    Text("\(medication.dosage) • \(medication.frequency.rawValue)")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)

                    HStack {
                        // Reminder times
                        if !medication.reminderTimes.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "bell.fill")
                                    .font(.caption2)
                                    .foregroundColor(.appAccent)

                                Text("\(medication.reminderTimes.count) reminder\(medication.reminderTimes.count == 1 ? "" : "s")")
                                    .font(AppTheme.Typography.caption)
                                    .foregroundColor(.textSecondary)
                            }
                        }

                        Spacer()

                        // Adherence rate
                        Text("\(Int(adherenceRate))% adherence")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(adherenceRate > 80 ? .success : (adherenceRate > 50 ? .warning : .error))
                    }
                }

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            .padding(AppTheme.Spacing.md)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
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
}
