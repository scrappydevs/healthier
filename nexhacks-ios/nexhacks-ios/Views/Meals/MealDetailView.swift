//
//  MealDetailView.swift
//  nexhacks-ios
//
//  Detail view for a logged meal
//

import SwiftUI

struct MealDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MealViewModel
    let meal: Meal
    
    @State private var showingDeleteConfirmation = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Image
                        if let imageURL = meal.imageURL, let url = URL(string: imageURL) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                            } placeholder: {
                                ZStack {
                                    Color.neutral200
                                    ProgressView()
                                }
                            }
                            .frame(height: 250)
                            .clipped()
                            .cornerRadius(AppTheme.CornerRadius.md)
                        } else {
                            // Fallback icon if no image
                            ZStack {
                                Color.cardBackground
                                Image(systemName: "fork.knife")
                                    .font(.system(size: 60))
                                    .foregroundColor(.textSecondary)
                            }
                            .frame(height: 200)
                            .frame(maxWidth: .infinity)
                            .cornerRadius(AppTheme.CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                                    .stroke(Color.divider, lineWidth: 1)
                            )
                        }
                        
                        // Header Info
                        HStack {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text(meal.name)
                                    .font(AppTheme.Typography.title3)
                                    .foregroundColor(.textPrimary)
                                
                                Text(meal.mealType.rawValue)
                                    .font(AppTheme.Typography.subheadline)
                                    .foregroundColor(.textSecondary)
                                
                                Text(meal.consumedAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(AppTheme.Typography.caption)
                                    .foregroundColor(.textSecondary)
                            }
                            
                            Spacer()
                            
                            // Health Rating
                            VStack {
                                Text("\(Int(meal.healthRating))")
                                    .font(AppTheme.Typography.title)
                                    .foregroundColor(healthRatingColor(meal.healthRating))
                                
                                Text("Health Score")
                                    .font(AppTheme.Typography.caption)
                                    .foregroundColor(.textSecondary)
                            }
                            .padding(AppTheme.Spacing.md)
                            .background(healthRatingColor(meal.healthRating).opacity(0.1))
                            .cornerRadius(AppTheme.CornerRadius.md)
                        }
                        
                        // Nutrition Info
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                            Text("ESTIMATED NUTRITION")
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.textSecondary)
                                .tracking(1)
                            
                            HStack(spacing: AppTheme.Spacing.md) {
                                NutritionItem(label: "Calories", value: "\(Int(meal.totalCalories))", unit: "cal")
                                NutritionItem(label: "Protein", value: "\(Int(meal.totalProtein))", unit: "g")
                                NutritionItem(label: "Carbs", value: "\(Int(meal.totalCarbs))", unit: "g")
                                NutritionItem(label: "Fat", value: "\(Int(meal.totalFat))", unit: "g")
                            }
                        }
                        .padding(AppTheme.Spacing.md)
                        .background(Color.appBackground)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                        
                        // Nutritional Breakdown (Scales)
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
                            Text("NUTRITIONAL BREAKDOWN")
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.textSecondary)
                                .tracking(1)
                            
                            // Using consistent color as requested
                            ScoreRow(title: "Gut Health", score: meal.gutHealthScore, color: .appPrimary)
                            ScoreRow(title: "Protein Quality", score: meal.proteinQualityScore, color: .appPrimary)
                            ScoreRow(title: "Fiber Richness", score: meal.fiberScore, color: .appPrimary)
                            ScoreRow(title: "Low Sugar", score: meal.sugarScore, color: .appPrimary)
                        }
                        .padding(AppTheme.Spacing.md)
                        .background(Color.cardBackground)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                                .stroke(Color.divider, lineWidth: 1)
                        )
                        .cornerRadius(AppTheme.CornerRadius.sm)
                        
                        // Food Groups
                        if !meal.foodGroups.isEmpty {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                                Text("FOOD GROUPS")
                                    .font(AppTheme.Typography.caption)
                                    .foregroundColor(.textSecondary)
                                    .tracking(1)
                                
                                FlexibleView(data: meal.foodGroups.map { $0.rawValue }) { group in
                                    Text(group)
                                        .font(AppTheme.Typography.caption)
                                        .foregroundColor(.appPrimary)
                                        .padding(.horizontal, AppTheme.Spacing.sm)
                                        .padding(.vertical, AppTheme.Spacing.xs)
                                        .background(Color.appPrimary.opacity(0.1))
                                        .cornerRadius(AppTheme.CornerRadius.sm)
                                }
                            }
                        }
                        
                        // AI Analysis (Summary)
                        if let analysis = meal.aiAnalysis, !analysis.isEmpty {
                             VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                                 Text("SUMMARY")
                                     .font(AppTheme.Typography.caption)
                                     .foregroundColor(.textSecondary)
                                     .tracking(1)
                                 
                                 Text(analysis)
                                     .font(AppTheme.Typography.body)
                                     .foregroundColor(.textPrimary)
                             }
                             .frame(maxWidth: .infinity, alignment: .leading)
                         }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Meal Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            showingDeleteConfirmation = true
                        } label: {
                            Label("Delete Meal", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundColor(.appPrimary)
                    }
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
            }
            .alert("Delete Meal?", isPresented: $showingDeleteConfirmation) {
                Button("Delete", role: .destructive) {
                    viewModel.deleteMeal(meal)
                    dismiss()
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This action cannot be undone.")
            }
        }
    }
    
    private func healthRatingColor(_ rating: Double) -> Color {
        if rating >= 80 { return .success }
        if rating >= 60 { return .appPrimary }
        if rating >= 40 { return .warning }
        return .error
    }
}
