//
//  MedicationHistoryView.swift
//  nexhacks-ios
//
//  View displaying a history of all medication logs
//

import SwiftUI

struct MedicationHistoryView: View {
    @ObservedObject var viewModel: MedicationViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedMedicationFilter: UUID? = nil
    
    // Aggregated and sorted logs
    private var historyLogs: [HistoryLogItem] {
        var logs: [HistoryLogItem] = []
        
        for medication in viewModel.medications {
            // optimized: if filtering, skip medications that don't match
            if let filterId = selectedMedicationFilter, medication.id != filterId {
                continue
            }
            
            for log in medication.takenLog {
                logs.append(HistoryLogItem(medication: medication, log: log))
            }
        }
        
        return logs.sorted { $0.log.takenAt > $1.log.takenAt }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Bar
                filterBar
                
                // Content
                if historyLogs.isEmpty {
                    emptyState
                } else {
                    logsList
                }
            }
            .background(Color.appBackground)
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Components
    
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppTheme.Spacing.sm) {
                FilterChip(
                    title: "All",
                    isSelected: selectedMedicationFilter == nil,
                    action: { selectedMedicationFilter = nil }
                )
                
                ForEach(viewModel.medications) { medication in
                    FilterChip(
                        title: medication.name,
                        isSelected: selectedMedicationFilter == medication.id,
                        action: { selectedMedicationFilter = medication.id }
                    )
                }
            }
            .padding(AppTheme.Spacing.md)
        }
        .background(Color.cardBackground)
    }
    
    private var logsList: some View {
        ScrollView {
            LazyVStack(spacing: AppTheme.Spacing.md) {
                ForEach(historyLogs) { item in
                    HistoryLogCard(item: item)
                }
            }
            .padding(AppTheme.Spacing.md)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.textSecondary)
            Text("No logs found")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textSecondary)
            Spacer()
        }
    }
}

// MARK: - Models

struct HistoryLogItem: Identifiable {
    let id = UUID()
    let medication: Medication
    let log: MedicationLog
}

// MARK: - Subviews

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(isSelected ? .white : .textPrimary)
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(isSelected ? Color.appPrimary : Color.appBackground)
                .cornerRadius(AppTheme.CornerRadius.full) // Pill shape
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.full)
                        .stroke(Color.divider, lineWidth: isSelected ? 0 : 1)
                )
        }
    }
}

struct HistoryLogCard: View {
    let item: HistoryLogItem
    
    var body: some View {
        HStack(alignment: .top, spacing: AppTheme.Spacing.md) {
            // Icon / Status Indicator
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.1))
                    .frame(width: 40, height: 40)
                
                Image(systemName: statusIcon)
                    .foregroundColor(statusColor)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.medication.name)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                    
                    Spacer()
                    
                    Text(item.log.takenAt.formatted(date: .abbreviated, time: .shortened))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Text(item.medication.dosage)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                
                if let notes = item.log.notes, !notes.isEmpty {
                    Text(notes)
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textPrimary)
                        .padding(.top, 4)
                }
                
                // Verification Badge
                if item.log.verificationStatus != .notVerified {
                    HStack {
                        Image(systemName: "camera.fill")
                            .font(.caption2)
                        Text(item.log.verificationStatus.rawValue)
                            .font(.caption2)
                    }
                    .foregroundColor(verificationColor)
                    .padding(.top, 2)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        // Brutalist border style if desired, matching other cards
        //.overlay(RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md).stroke(Color.divider, lineWidth: 1))
    }
    
    private var statusColor: Color {
        if item.log.wasOnTime {
            return .success
        } else {
            return .warning
        }
    }
    
    private var statusIcon: String {
        if item.log.wasOnTime {
            return "checkmark"
        } else {
            return "clock.exclamation"
        }
    }
    
    private var verificationColor: Color {
        switch item.log.verificationStatus {
        case .verified: return .success
        case .warning: return .warning
        case .notVerified: return .textSecondary
        }
    }
}
