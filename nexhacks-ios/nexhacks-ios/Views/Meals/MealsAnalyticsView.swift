//
//  MealsAnalyticsView.swift
//  nexhacks-ios
//
//  Analytics dashboard showing meal nutrition trends
//

import SwiftUI

struct MealsAnalyticsView: View {
    @ObservedObject var viewModel: MealViewModel
    @State private var hasLoaded = false

    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.Spacing.lg) {
                if viewModel.isAnalyticsLoading {
                    loadingState
                } else if let errorMessage = viewModel.analyticsErrorMessage {
                    errorState(message: errorMessage)
                } else if viewModel.analyticsDaily.isEmpty {
                    emptyState
                } else {
                    summarySection
                    weeklyHealthSection
                    nutritionTrendsSection
                    gutHealthTrendsSection
                }
            }
            .padding(AppTheme.Spacing.md)
        }
        .background(Color.appBackground)
        .onAppear {
            if !hasLoaded {
                hasLoaded = true
                Task {
                    await viewModel.loadAnalytics(days: 7)
                }
            }
        }
        .refreshable {
            await viewModel.loadAnalytics(days: 7)
        }
    }

    private var loadingState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            ProgressView()
            Text("Loading analytics...")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.xl)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.warning)
            Text(message)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
            Button {
                Task {
                    await viewModel.loadAnalytics(days: 7)
                }
            } label: {
                Text("Retry")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.vertical, AppTheme.Spacing.sm)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.xl)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 50))
                .foregroundColor(.textSecondary)
            Text("No meal data for the last 7 days")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            Text("Log meals to see your nutrition trends.")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.xl)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("7-DAY SUMMARY")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            if let summary = viewModel.analyticsSummary {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.Spacing.md) {
                    SummaryStatCard(title: "Avg Health", value: "\(Int(summary.averageHealthRating))", unit: "/100", color: .success)
                    SummaryStatCard(title: "Avg Gut", value: String(format: "%.1f", summary.averageGutHealthScore), unit: "/10", color: .appPrimary)
                    SummaryStatCard(title: "Avg Fiber", value: String(format: "%.1f", summary.averageFiberScore), unit: "/10", color: .appAccent)
                    SummaryStatCard(title: "Protein Quality", value: String(format: "%.1f", summary.averageProteinQualityScore), unit: "/10", color: .appPrimary)
                    SummaryStatCard(title: "Avg Sugar", value: String(format: "%.1f", summary.averageSugarScore), unit: "/10", color: .warning)
                    SummaryStatCard(title: "Avg Calories", value: "\(Int(summary.averageCaloriesPerDay))", unit: "cal/day", color: .appPrimary)
                    SummaryStatCard(title: "Avg Protein", value: "\(Int(summary.averageProteinPerDay))", unit: "g/day", color: .appAccent)
                }
            }
        }
    }

    private var weeklyHealthSection: some View {
        TrendChartCard(
            title: "WEEKLY HEALTH SCORES",
            subtitle: "Average meal health rating",
            values: viewModel.analyticsDaily.map {
                TrendValue(label: $0.dayLabel, value: $0.healthRatingAvg, isToday: $0.isToday)
            },
            maxValue: 100,
            color: .success
        )
    }

    private var nutritionTrendsSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            TrendChartCard(
                title: "CALORIES TREND",
                subtitle: "Total calories per day",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.caloriesTotal, isToday: $0.isToday)
                },
                maxValue: maxValue(for: viewModel.analyticsDaily.map { $0.caloriesTotal }),
                color: .appPrimary
            )

            TrendChartCard(
                title: "PROTEIN TREND",
                subtitle: "Total protein per day",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.proteinTotal, isToday: $0.isToday)
                },
                maxValue: maxValue(for: viewModel.analyticsDaily.map { $0.proteinTotal }),
                color: .appAccent
            )

            TrendChartCard(
                title: "FIBER SCORE",
                subtitle: "Average fiber score per day",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.fiberScoreAvg, isToday: $0.isToday)
                },
                maxValue: 10,
                color: .appPrimary
            )
        }
    }

    private var gutHealthTrendsSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            TrendChartCard(
                title: "GUT HEALTH",
                subtitle: "Average gut health score",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.gutHealthScoreAvg, isToday: $0.isToday)
                },
                maxValue: 10,
                color: .success
            )

            TrendChartCard(
                title: "PROTEIN QUALITY",
                subtitle: "Average protein quality score",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.proteinQualityScoreAvg, isToday: $0.isToday)
                },
                maxValue: 10,
                color: .appPrimary
            )

            TrendChartCard(
                title: "SUGAR SCORE",
                subtitle: "Average sugar score",
                values: viewModel.analyticsDaily.map {
                    TrendValue(label: $0.dayLabel, value: $0.sugarScoreAvg, isToday: $0.isToday)
                },
                maxValue: 10,
                color: .warning
            )
        }
    }

    private func maxValue(for values: [Double]) -> Double {
        let maxValue = values.max() ?? 1
        return max(maxValue, 1)
    }
}

struct SummaryStatCard: View {
    let title: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(AppTheme.Typography.title2)
                    .foregroundColor(color)
                Text(unit)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
}

struct TrendValue: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    let isToday: Bool
}

struct TrendChartCard: View {
    let title: String
    let subtitle: String
    let values: [TrendValue]
    let maxValue: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text(title)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                .tracking(1)

            Text(subtitle)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textPrimary)

            HStack(alignment: .bottom, spacing: AppTheme.Spacing.sm) {
                ForEach(values) { item in
                    VStack(spacing: AppTheme.Spacing.xs) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(color.opacity(item.value > 0 ? 1 : 0.2))
                            .frame(width: 32, height: max(8, normalizedHeight(item.value)))

                        Text(item.label)
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(item.isToday ? .appPrimary : .textSecondary)
                            .fontWeight(item.isToday ? .semibold : .regular)
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

    private func normalizedHeight(_ value: Double) -> CGFloat {
        guard maxValue > 0 else { return 8 }
        return CGFloat((value / maxValue) * 100)
    }
}
