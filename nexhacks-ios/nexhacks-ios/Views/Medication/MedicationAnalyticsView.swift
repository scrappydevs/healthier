//
//  MedicationAnalyticsView.swift
//  nexhacks-ios
//
//  Analytics dashboard showing medication adherence tracking
//

import SwiftUI

struct MedicationAnalyticsView: View {
    @ObservedObject var viewModel: MedicationViewModel

    private var overallAdherence: Double {
        viewModel.getOverallAdherenceRate() / 100 // Convert to 0-1 scale
    }

    private var totalDosesTaken: Int {
        viewModel.medications.reduce(0) { $0 + $1.takenLog.count }
    }

    private var onTimeDoses: Int {
        viewModel.medications.reduce(0) { total, med in
            total + med.takenLog.filter { $0.wasOnTime }.count
        }
    }

    private var verifiedDoses: Int {
        viewModel.medications.reduce(0) { total, med in
            total + med.takenLog.filter { $0.verificationStatus == .verified }.count
        }
    }

    private var currentStreak: Int {
        calculateStreak()
    }

    private var weeklyData: [DayAdherence] {
        calculateWeeklyData()
    }

    private var mostMissedMedications: [(Medication, Int)] {
        getMostMissed()
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.Spacing.lg) {
                // Overall Adherence Card
                overallAdherenceCard

                // Quick Stats
                quickStatsSection

                // Weekly Trend
                weeklyTrendSection

                // Most Missed Medications
                if !mostMissedMedications.isEmpty {
                    mostMissedSection
                }

                // Time of Day Analysis
                timeOfDaySection
            }
            .padding(AppTheme.Spacing.md)
        }
        .background(Color.appBackground)
    }

    // MARK: - Overall Adherence Card

    private var overallAdherenceCard: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Text("OVERALL ADHERENCE")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            ZStack {
                // Background circle
                Circle()
                    .stroke(Color.divider, lineWidth: 16)
                    .frame(width: 160, height: 160)

                // Progress circle
                Circle()
                    .trim(from: 0, to: overallAdherence)
                    .stroke(
                        adherenceColor(overallAdherence),
                        style: StrokeStyle(lineWidth: 16, lineCap: .round)
                    )
                    .frame(width: 160, height: 160)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.8), value: overallAdherence)

                // Percentage text
                VStack(spacing: 4) {
                    Text("\(Int(overallAdherence * 100))%")
                        .font(.system(size: 42, weight: .bold))
                        .foregroundColor(.textPrimary)

                    Text(adherenceLabel(overallAdherence))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(adherenceColor(overallAdherence))
                }
            }

            Text("\(totalDosesTaken) doses logged total")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.xl)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
    }

    // MARK: - Quick Stats Section

    private var quickStatsSection: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            StatCard(
                title: "Total Doses",
                value: "\(totalDosesTaken)",
                icon: "pill.fill",
                color: .appPrimary
            )

            StatCard(
                title: "On Time",
                value: "\(onTimeDoses)",
                icon: "clock.fill",
                color: .success
            )

            StatCard(
                title: "Verified",
                value: "\(verifiedDoses)",
                icon: "checkmark.seal.fill",
                color: .appAccent
            )
        }
    }

    // MARK: - Weekly Trend Section

    private var weeklyTrendSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("WEEKLY TREND")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            HStack(alignment: .bottom, spacing: AppTheme.Spacing.sm) {
                ForEach(weeklyData) { day in
                    VStack(spacing: AppTheme.Spacing.xs) {
                        // Bar
                        RoundedRectangle(cornerRadius: 4)
                            .fill(day.adherence > 0.8 ? Color.success : (day.adherence > 0.5 ? Color.warning : Color.error))
                            .frame(width: 36, height: max(10, day.adherence * 100))
                            .animation(.easeInOut(duration: 0.5), value: day.adherence)

                        // Day label
                        Text(day.dayLabel)
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(day.isToday ? .appPrimary : .textSecondary)
                            .fontWeight(day.isToday ? .semibold : .regular)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 130)
            .padding(.top, AppTheme.Spacing.sm)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Streak Section


    // MARK: - Most Missed Section

    private var mostMissedSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("NEEDS ATTENTION")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            ForEach(mostMissedMedications.prefix(3), id: \.0.id) { medication, missedCount in
                HStack {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text(medication.name)
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.textPrimary)

                        Text(medication.dosage)
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Text("\(missedCount) missed")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.error)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.error.opacity(0.1))
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
                .padding(AppTheme.Spacing.md)
                .background(Color.appBackground)
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Time of Day Section

    private var timeOfDaySection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("TIME OF DAY ANALYSIS")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            let stats = getTimeOfDayStats()

            HStack(spacing: AppTheme.Spacing.md) {
                TimeOfDayCard(
                    title: "Morning",
                    icon: "sunrise.fill",
                    adherence: stats.morning,
                    color: .yellow
                )

                TimeOfDayCard(
                    title: "Afternoon",
                    icon: "sun.max.fill",
                    adherence: stats.afternoon,
                    color: .orange
                )

                TimeOfDayCard(
                    title: "Evening",
                    icon: "sunset.fill",
                    adherence: stats.evening,
                    color: .purple
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Helper Methods

    private func adherenceColor(_ rate: Double) -> Color {
        if rate > 0.8 { return .success }
        if rate > 0.5 { return .warning }
        return .error
    }

    private func adherenceLabel(_ rate: Double) -> String {
        if rate > 0.8 { return "Excellent" }
        if rate > 0.6 { return "Good" }
        if rate > 0.4 { return "Needs Improvement" }
        return "Critical"
    }

    private func calculateStreak() -> Int {
        let calendar = Calendar.current
        var streak = 0
        var currentDate = calendar.startOfDay(for: Date())

        // Check each day going backwards
        while true {
            let dayEnd = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate

            // Check if any medications were taken on this day
            let takenOnDay = viewModel.medications.contains { medication in
                medication.takenLog.contains { log in
                    log.takenAt >= currentDate && log.takenAt < dayEnd
                }
            }

            if takenOnDay {
                streak += 1
                currentDate = calendar.date(byAdding: .day, value: -1, to: currentDate) ?? currentDate
            } else {
                break
            }
        }

        return streak
    }

    private func calculateWeeklyData() -> [DayAdherence] {
        let calendar = Calendar.current
        var data: [DayAdherence] = []

        for dayOffset in (0..<7).reversed() {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else { continue }
            let dayStart = calendar.startOfDay(for: date)
            let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart

            // Calculate adherence for this day
            var totalExpected = 0
            var totalTaken = 0

            for medication in viewModel.activeMedications {
                totalExpected += medication.reminderTimes.count

                let takenCount = medication.takenLog.filter { log in
                    log.takenAt >= dayStart && log.takenAt < dayEnd
                }.count

                totalTaken += min(takenCount, medication.reminderTimes.count)
            }

            let adherence = totalExpected > 0 ? Double(totalTaken) / Double(totalExpected) : 0

            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEE"
            let dayLabel = dayFormatter.string(from: date)

            data.append(DayAdherence(
                date: date,
                dayLabel: dayLabel,
                adherence: adherence,
                isToday: calendar.isDateInToday(date)
            ))
        }

        return data
    }

    private func getMostMissed() -> [(Medication, Int)] {
        let calendar = Calendar.current
        let thirtyDaysAgo = calendar.date(byAdding: .day, value: -30, to: Date()) ?? Date()

        return viewModel.activeMedications.compactMap { medication -> (Medication, Int)? in
            // Calculate expected doses in last 30 days
            let daysActive = 30
            let expectedPerDay = medication.reminderTimes.count
            let totalExpected = daysActive * expectedPerDay

            // Count actual doses in last 30 days
            let actualTaken = medication.takenLog.filter { $0.takenAt >= thirtyDaysAgo }.count

            let missed = max(0, totalExpected - actualTaken)

            if missed > 0 {
                return (medication, missed)
            }
            return nil
        }
        .sorted { $0.1 > $1.1 }
    }

    private func getTimeOfDayStats() -> (morning: Double, afternoon: Double, evening: Double) {
        var morningTotal = 0, morningTaken = 0
        var afternoonTotal = 0, afternoonTaken = 0
        var eveningTotal = 0, eveningTaken = 0

        let calendar = Calendar.current

        for medication in viewModel.activeMedications {
            for time in medication.reminderTimes {
                let hour = calendar.component(.hour, from: time)

                if hour < 12 {
                    morningTotal += 1
                    if medication.takenLog.contains(where: { calendar.component(.hour, from: $0.takenAt) < 12 }) {
                        morningTaken += 1
                    }
                } else if hour < 17 {
                    afternoonTotal += 1
                    if medication.takenLog.contains(where: {
                        let h = calendar.component(.hour, from: $0.takenAt)
                        return h >= 12 && h < 17
                    }) {
                        afternoonTaken += 1
                    }
                } else {
                    eveningTotal += 1
                    if medication.takenLog.contains(where: { calendar.component(.hour, from: $0.takenAt) >= 17 }) {
                        eveningTaken += 1
                    }
                }
            }
        }

        return (
            morning: morningTotal > 0 ? Double(morningTaken) / Double(morningTotal) : 0,
            afternoon: afternoonTotal > 0 ? Double(afternoonTaken) / Double(afternoonTotal) : 0,
            evening: eveningTotal > 0 ? Double(eveningTaken) / Double(eveningTotal) : 0
        )
    }
}

// MARK: - Supporting Views

struct DayAdherence: Identifiable {
    let id = UUID()
    let date: Date
    let dayLabel: String
    let adherence: Double
    let isToday: Bool
}

private struct StatCard: View {
    let title: String
    let value: String
    let icon: String
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
    }
}

struct TimeOfDayCard: View {
    let title: String
    let icon: String
    let adherence: Double
    let color: Color

    var body: some View {
        VStack(spacing: AppTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text("\(Int(adherence * 100))%")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.sm)
        .background(Color.appBackground)
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
}
