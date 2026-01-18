//
//  HomeView.swift
//  nexhacks-ios
//
//  Home screen showing real-time status from all tracking features
//

import SwiftUI
import Foundation

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @StateObject var viewModel: HomeViewModel
    @State private var showingRoomScanner = false

    init(viewModel: HomeViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Welcome Back, \(greetingName)")
                        .font(AppTheme.Typography.title)
                        .foregroundColor(.textPrimary)

                    Spacer()
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.top, AppTheme.Spacing.md)
                .padding(.bottom, AppTheme.Spacing.md)

                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Health Breakdown
                        healthBreakdownSection

                        // Quick Stats
                        quickStatsSection

                        // Upcoming Reminders
                        upcomingRemindersSection

                        // Scan Room Button
                        scanRoomButton
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.vertical, AppTheme.Spacing.lg)
                }
            }
        }
        .sheet(isPresented: $showingRoomScanner) {
            RoomPlanScannerView(viewModel: appState.roomViewModel)
        }
        .onAppear {
            viewModel.refreshData()
        }
    }

    // MARK: - Welcome Section
    private var greetingName: String {
        if let name = appState.currentUser?.name.trimmingCharacters(in: .whitespacesAndNewlines),
           !name.isEmpty,
           !isPlaceholderName(name) {
            return firstName(fromFullName: name)
        }

        if let authName = authFullName()?.trimmingCharacters(in: .whitespacesAndNewlines),
           !authName.isEmpty {
            return firstName(fromFullName: authName)
        }

        if let authEmail = supabase.auth.currentUser?.email,
           let gmailName = firstNameFromGmail(email: authEmail) {
            return gmailName
        }

        if let email = appState.currentUser?.email,
           let gmailName = firstNameFromGmail(email: email) {
            return gmailName
        }

        return "User"
    }
    
    // MARK: - Scan Room Button
    private var scanRoomButton: some View {
        Button {
            showingRoomScanner = true
        } label: {
            HStack(spacing: AppTheme.Spacing.md) {
                Image(systemName: "camera.fill")
                    .font(.title3)
                    .foregroundColor(.white)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Scan Room")
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                    
                    Text("Create 3D room model")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.white.opacity(0.9))
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.callout)
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(AppTheme.Spacing.md)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.appPrimary, Color.appPrimary.opacity(0.8)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(AppTheme.CornerRadius.md)
            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Health Breakdown Section
    private var healthBreakdownSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Health Breakdown")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            // Nutrition Score
            HealthBreakdownRow(
                icon: "fork.knife",
                title: "Nutrition",
                score: viewModel.mealHealthRating,
                detail: viewModel.todaysMeals.isEmpty ? "No meals logged" : "\(viewModel.todaysMeals.count) meals logged",
                color: healthScoreColor(viewModel.mealHealthRating)
            )
            
            // Exercise Score
            HealthBreakdownRow(
                icon: "figure.run",
                title: "Exercise",
                score: viewModel.exerciseScore,
                detail: viewModel.todayExerciseMinutes == 0 ? "No exercise logged" : "\(viewModel.todayExerciseMinutes) min of 30 min goal",
                color: healthScoreColor(viewModel.exerciseScore)
            )
            
            // Medication Adherence
            HealthBreakdownRow(
                icon: "pills.fill",
                title: "Medication",
                score: viewModel.medicationAdherenceScore,
                detail: viewModel.todayMedications.isEmpty ? "No medications scheduled" : "\(viewModel.todayMedications.count) medications active",
                color: healthScoreColor(viewModel.medicationAdherenceScore)
            )
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Helper Methods
    
    private func healthScoreColor(_ score: Double) -> Color {
        if score >= 80 { return .success }
        if score >= 60 { return .appPrimary }
        if score >= 40 { return .warning }
        if score > 0 { return .error }
        return .textSecondary
    }

    private func firstName(fromFullName name: String) -> String {
        let parts = name.split(whereSeparator: { $0.isWhitespace })
        return parts.first.map { String($0) } ?? name
    }

    private func authFullName() -> String? {
        supabase.auth.currentUser?.userMetadata["full_name"]?.stringValue
            ?? supabase.auth.currentUser?.userMetadata["name"]?.stringValue
    }

    private func isPlaceholderName(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.lowercased() == "user"
    }

    private func firstNameFromGmail(email: String) -> String? {
        let parts = email.lowercased().split(separator: "@", maxSplits: 1)
        guard parts.count == 2 else { return nil }
        let domain = parts[1]
        guard domain == "gmail.com" || domain == "googlemail.com" else { return nil }
        let local = parts[0]
        let nameParts = local.split(whereSeparator: { $0 == "." || $0 == "_" || $0 == "-" || $0 == "+" })
        guard let first = nameParts.first, !first.isEmpty else { return nil }
        return first.prefix(1).uppercased() + first.dropFirst()
    }
    
    // MARK: - Tracking Features Section
    private var trackingFeaturesSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Text("Tracking Features")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Location Tracking
            TrackingFeatureCard(
                icon: "location.fill",
                title: "Location Tracking",
                status: viewModel.locationStatus,
                isActive: appState.locationService.isTracking,
                onToggle: {
                    if appState.locationService.isTracking {
                        viewModel.stopLocationTracking()
                    } else {
                        viewModel.startLocationTracking()
                    }
                }
            )

            // Room Scanning
            TrackingFeatureCard(
                icon: "camera.fill",
                title: "Room Scanning",
                status: viewModel.roomScanStatus,
                isActive: appState.roomPlanService.isScanning,
                onToggle: {
                    if !appState.roomPlanService.isScanning {
                        viewModel.startRoomScan()
                    }
                }
            )
        }
    }

    // MARK: - Quick Stats Section
    private var quickStatsSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Text("Today's Summary")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: AppTheme.Spacing.md) {
                StatCard(
                    icon: "pills.fill",
                    title: "Medications",
                    value: "\(viewModel.todayMedications.count)",
                    color: .appPrimary
                )

                StatCard(
                    icon: "flame.fill",
                    title: "Calories",
                    value: "\(Int(viewModel.todayCalories))",
                    color: .appAccent
                )
            }

            HStack(spacing: AppTheme.Spacing.md) {
                StatCard(
                    icon: "figure.run",
                    title: "Exercise",
                    value: "\(viewModel.todayExerciseMinutes)m",
                    color: .success
                )

                StatCard(
                    icon: "book.fill",
                    title: "Journals",
                    value: "\(viewModel.todayJournalEntries.count)",
                    color: .appSecondary
                )
            }
        }
    }

    // MARK: - Upcoming Reminders Section
    private var upcomingRemindersSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Upcoming Reminders")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)

                Spacer()

                if !viewModel.upcomingReminders.isEmpty {
                    Text("\(viewModel.upcomingReminders.count)")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.appAccent)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
            }

            if viewModel.upcomingReminders.isEmpty {
                Text("No upcoming reminders")
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .cornerRadius(AppTheme.CornerRadius.md)
            } else {
                ForEach(viewModel.upcomingReminders) { medication in
                    Button {
                        appState.openMedicationDetail(medication)
                    } label: {
                        MedicationReminderCard(medication: medication)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
}

// MARK: - Supporting Views

struct TrackingFeatureCard: View {
    let icon: String
    let title: String
    let status: String
    let isActive: Bool
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Image(systemName: icon)
            .font(.title3)
            .foregroundColor(isActive ? .appPrimary : .textSecondary)
            .frame(width: 40)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(title)
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)

                Text(status)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Button(action: onToggle) {
                Text(isActive ? "Stop" : "Start")
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.white)
                    .padding(.horizontal, AppTheme.Spacing.md)
                    .padding(.vertical, AppTheme.Spacing.sm)
                    .background(isActive ? Color.appAccent : Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

private struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: AppTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct MedicationReminderCard: View {
    let medication: Medication

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(medication.name)
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)

                Text(medication.dosage)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            if let nextReminder = medication.reminderTimes.first {
                Text(nextReminder, style: .time)
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.appPrimary)
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct HealthBreakdownRow: View {
    let icon: String
    let title: String
    let score: Double
    let detail: String
    let color: Color
    
    var body: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 40, height: 40)
                
                Image(systemName: icon)
                    .font(.body)
                    .foregroundColor(color)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Text(detail)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
            
            Spacer()
            
            // Score with progress
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Int(score))")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(color)
                
                // Mini progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.divider)
                            .frame(width: 60, height: 4)
                        
                        RoundedRectangle(cornerRadius: 2)
                            .fill(color)
                            .frame(width: 60 * CGFloat(score / 100), height: 4)
                    }
                }
                .frame(width: 60, height: 4)
            }
        }
        .padding(AppTheme.Spacing.sm)
        .background(Color.appBackground)
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
}
