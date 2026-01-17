//
//  MealsView.swift
//  nexhacks-ios
//
//  Main view for meal tracking and nutrition overview
//

import SwiftUI

struct MealsView: View {
    @StateObject var viewModel: MealViewModel
    @State private var showingFoodCapture = false
    
    init(viewModel: MealViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header with title at top
                    HStack {
                        Text("Meals")
                            .font(AppTheme.Typography.title)
                            .foregroundColor(.textPrimary)

                        Spacer()
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.top, AppTheme.Spacing.md)
                    .padding(.bottom, AppTheme.Spacing.md)

                    ScrollView {
                        VStack(spacing: AppTheme.Spacing.lg) {
                            // Today's Summary
                            todaySummaryCard

                            // Nutrition Breakdown
                            nutritionBreakdownCard

                            // Today's Meals
                            todayMealsSection
                        }
                        .padding(.horizontal, AppTheme.Spacing.lg)
                        .padding(.vertical, AppTheme.Spacing.lg)
                    }
                }

                // Floating Action Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            showingFoodCapture = true
                        } label: {
                            Image(systemName: "camera.fill")
                                .font(.title2)
                                .foregroundColor(.white)
                                .frame(width: 60, height: 60)
                                .background(Color.appPrimary)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                        }
                        .padding(.trailing, AppTheme.Spacing.lg)
                        .padding(.bottom, AppTheme.Spacing.lg)
                    }
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .sheet(isPresented: $showingFoodCapture) {
                FoodCaptureView(viewModel: viewModel)
            }
            .sheet(item: $viewModel.selectedMeal) { meal in
                MealDetailView(viewModel: viewModel, meal: meal)
            }
        }
    }
    
    // MARK: - Today's Summary Card
    
    private var todaySummaryCard: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Today's Nutrition Score")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Spacer()
            }
            
            HStack(spacing: AppTheme.Spacing.lg) {
                // Health Rating Circle
                ZStack {
                    Circle()
                        .stroke(Color.divider, lineWidth: 8)
                        .frame(width: 100, height: 100)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(viewModel.todayHealthRating / 100))
                        .stroke(
                            healthRatingColor(viewModel.todayHealthRating),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 100, height: 100)
                        .rotationEffect(.degrees(-90))
                    
                    VStack(spacing: 2) {
                        Text("\(Int(viewModel.todayHealthRating))")
                            .font(AppTheme.Typography.title)
                            .foregroundColor(.textPrimary)
                        
                        Text("/ 100")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
                
                VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                    Text(healthRatingMessage(viewModel.todayHealthRating))
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                    
                    Text("\(viewModel.todaysMeals.count) meals logged today")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textSecondary)
                    
                    Text("\(Int(viewModel.todayCalories)) calories")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Nutrition Breakdown Card
    
    private var nutritionBreakdownCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Nutrition Breakdown")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            HStack(spacing: AppTheme.Spacing.md) {
                NutrientCard(
                    name: "Protein",
                    value: viewModel.todayProtein,
                    unit: "g",
                    color: .appPrimary
                )
                
                NutrientCard(
                    name: "Carbs",
                    value: viewModel.todayCarbs,
                    unit: "g",
                    color: .appAccent
                )
                
                NutrientCard(
                    name: "Fat",
                    value: viewModel.todayFat,
                    unit: "g",
                    color: .warning
                )
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Today's Meals Section
    
    private var todayMealsSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Today's Meals")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            if viewModel.todaysMeals.isEmpty {
                emptyMealsState
            } else {
                ForEach(viewModel.todaysMeals) { meal in
                    MealCard(meal: meal) {
                        viewModel.selectedMeal = meal
                    }
                }
            }
        }
    }
    
    // MARK: - Empty State
    
    private var emptyMealsState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 50))
                .foregroundColor(.textSecondary)
            
            Text("No meals logged today")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            Text("Tap the camera button to add your first meal")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.xl)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Helper Methods
    
    private func healthRatingColor(_ rating: Double) -> Color {
        if rating >= 80 { return .success }
        if rating >= 60 { return .appPrimary }
        if rating >= 40 { return .warning }
        return .error
    }
    
    private func healthRatingMessage(_ rating: Double) -> String {
        if rating >= 80 { return "Excellent!" }
        if rating >= 60 { return "Good job!" }
        if rating >= 40 { return "Keep trying" }
        if rating > 0 { return "Room to improve" }
        return "Start logging meals"
    }
}

// MARK: - Supporting Views

struct NutrientCard: View {
    let name: String
    let value: Double
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppTheme.Spacing.xs) {
            Text("\(Int(value))")
                .font(AppTheme.Typography.title2)
                .foregroundColor(color)
            
            Text(unit)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
            
            Text(name)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.md)
        .background(color.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
}

struct MealCard: View {
    let meal: Meal
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            // Meal Type Icon or Image
            ZStack {
                if let imageURL = meal.imageURL, let url = URL(string: imageURL) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 50, height: 50)
                            .clipShape(Circle())
                    } placeholder: {
                        Circle()
                            .fill(mealTypeColor(meal.mealType).opacity(0.2))
                            .frame(width: 50, height: 50)
                    }
                } else {
                    Circle()
                        .fill(mealTypeColor(meal.mealType).opacity(0.2))
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: mealTypeIcon(meal.mealType))
                        .font(.title3)
                        .foregroundColor(mealTypeColor(meal.mealType))
                }
            }
            
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                HStack {
                    Text(meal.name)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    // Health Rating Badge
                    Text("\(Int(meal.healthRating))")
                        .font(AppTheme.Typography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, 2)
                        .background(healthRatingColor(meal.healthRating))
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
                
                Text(meal.mealType.rawValue)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
                
                HStack(spacing: AppTheme.Spacing.md) {
                    Label("\(Int(meal.totalCalories)) cal", systemImage: "flame.fill")
                    Label("\(Int(meal.totalProtein))g protein", systemImage: "leaf.fill")
                }
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
                
                if !meal.foodGroups.isEmpty {
                    HStack {
                        ForEach(meal.foodGroups.prefix(3), id: \.self) { group in
                            Text(group.rawValue)
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.appPrimary)
                                .padding(.horizontal, AppTheme.Spacing.sm)
                                .padding(.vertical, 2)
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
        .onTapGesture {
            onTap()
        }
    }
    
    private func mealTypeIcon(_ type: MealType) -> String {
        switch type {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.fill"
        case .snack: return "carrot.fill"
        }
    }
    
    private func mealTypeColor(_ type: MealType) -> Color {
        switch type {
        case .breakfast: return .appAccent
        case .lunch: return .appPrimary
        case .dinner: return .appSecondary
        case .snack: return .warning
        }
    }
    
    private func healthRatingColor(_ rating: Double) -> Color {
        if rating >= 80 { return .success }
        if rating >= 60 { return .appPrimary }
        if rating >= 40 { return .warning }
        return .error
    }
}
