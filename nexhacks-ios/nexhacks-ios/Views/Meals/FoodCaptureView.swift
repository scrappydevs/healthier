//
//  FoodCaptureView.swift
//  nexhacks-ios
//
//  View for capturing and analyzing food images
//

import SwiftUI
import PhotosUI

struct FoodCaptureView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: MealViewModel
    
    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var selectedMealType: MealType = .lunch
    @State private var isAnalyzing = false
    @State private var analyzedMeal: Meal?
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var currentAnalyzingMessage = ""
    @State private var messageTimer: Timer?
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        if selectedImage == nil {
                            captureSection
                        } else if isAnalyzing {
                            analyzingSection
                        } else if let meal = analyzedMeal {
                            analysisResultSection(meal)
                        } else {
                            imagePreviewSection
                        }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Add Meal")
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
    
    // MARK: - Capture Section
    
    private var captureSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "camera.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.appPrimary)
            
            Text("Capture Your Meal")
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)
            
            Text("Take a photo of your food and we'll analyze its nutrition content")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, AppTheme.Spacing.md)
            
            // Meal Type Picker
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                Text("MEAL TYPE")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .tracking(1)
                
                HStack(spacing: AppTheme.Spacing.sm) {
                    ForEach(MealType.allCases, id: \.self) { type in
                        MealTypeButton(
                            type: type,
                            isSelected: selectedMealType == type,
                            onTap: { selectedMealType = type }
                        )
                    }
                }
            }
            .padding(.vertical, AppTheme.Spacing.md)
            
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
        VStack(spacing: AppTheme.Spacing.lg) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 250)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            // Meal Type Picker
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                Text("MEAL TYPE")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .tracking(1)
                
                HStack(spacing: AppTheme.Spacing.sm) {
                    ForEach(MealType.allCases, id: \.self) { type in
                        MealTypeButton(
                            type: type,
                            isSelected: selectedMealType == type,
                            onTap: { selectedMealType = type }
                        )
                    }
                }
            }
            
            HStack(spacing: AppTheme.Spacing.md) {
                Button {
                    selectedImage = nil
                    analyzedMeal = nil
                } label: {
                    Text("Retake")
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppTheme.Spacing.md)
                        .background(Color.cardBackground)
                        .cornerRadius(AppTheme.CornerRadius.md)
                }
                
                Button {
                    Task {
                        await analyzeFood()
                    }
                } label: {
                    HStack {
                        Image(systemName: "wand.and.stars")
                        Text("Analyze")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Analyzing Section
    
    private var analyzingSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 250)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            ProgressView()
                .scaleEffect(1.5)
                .padding(.top, AppTheme.Spacing.md)
            
            Text(currentAnalyzingMessage)
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)
                .animation(.easeInOut(duration: 0.3), value: currentAnalyzingMessage)
            
            Text("We're identifying the food and estimating nutrition content")
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppTheme.Spacing.md)
        .frame(maxWidth: .infinity)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Analysis Result Section
    
    private func analysisResultSection(_ meal: Meal) -> some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            // Image
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 150)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            // Meal Name and Health Rating
            HStack {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text(meal.name)
                        .font(AppTheme.Typography.title3)
                        .foregroundColor(.textPrimary)
                    
                    Text(meal.mealType.rawValue)
                        .font(AppTheme.Typography.subheadline)
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
                
                ScoreRow(title: "Gut Health", score: meal.gutHealthScore, color: .appPrimary)
                ScoreRow(title: "Protein Quality", score: meal.proteinQualityScore, color: .appPrimary)
                ScoreRow(title: "Fiber Richness", score: meal.fiberScore, color: .appPrimary)
                ScoreRow(title: "Low Sugar", score: meal.sugarScore, color: .appPrimary) // Higher score = Lower sugar (better)
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
            
            // Actions
            HStack(spacing: AppTheme.Spacing.md) {
                Button {
                    selectedImage = nil
                    analyzedMeal = nil
                } label: {
                    Text("Retake")
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, AppTheme.Spacing.md)
                        .background(Color.cardBackground)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                                .stroke(Color.divider, lineWidth: 1)
                        )
                        .cornerRadius(AppTheme.CornerRadius.md)
                }
                
                Button {
                    // Log the meal
                    if let meal = analyzedMeal {
                        viewModel.addMeal(meal)
                    }
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Log Meal")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Methods
    
    private let analyzingMessages = [
        "Looking at your delicious meal...",
        "Identifying ingredients...",
        "Calculating nutrition...",
        "Almost there...",
        "Checking vitamin content...",
        "Analyzing food groups...",
        "Wrapping up the analysis..."
    ]
    
    private func startMessageCycling() {
        var currentIndex = 0
        currentAnalyzingMessage = analyzingMessages[currentIndex]
        
        messageTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            currentIndex = (currentIndex + 1) % analyzingMessages.count
            withAnimation {
                currentAnalyzingMessage = analyzingMessages[currentIndex]
            }
        }
    }
    
    private func stopMessageCycling() {
        messageTimer?.invalidate()
        messageTimer = nil
    }
    
    private func analyzeFood() async {
        guard let image = selectedImage else { return }
        
        isAnalyzing = true
        analyzedMeal = nil
        startMessageCycling()
        
        do {
            let meal = try await viewModel.captureAndAnalyzeMeal(image: image, mealType: selectedMealType)
            analyzedMeal = meal
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        
        stopMessageCycling()
        isAnalyzing = false
    }
    
    private func healthRatingColor(_ rating: Double) -> Color {
        if rating >= 80 { return .success }
        if rating >= 60 { return .appPrimary }
        if rating >= 40 { return .warning }
        return .error
    }
}

// MARK: - Supporting Views

struct ScoreRow: View {
    let title: String
    let score: Double // 0-10
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textPrimary)
                
                Spacer()
                
                Text(String(format: "%.1f/10", score))
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    Rectangle()
                        .fill(Color.neutral200)
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    // Filled track
                    Rectangle()
                        .fill(color)
                        .frame(width: CGFloat(score / 10.0) * geometry.size.width, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
        }
    }
}

struct MealTypeButton: View {
    let type: MealType
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: AppTheme.Spacing.xs) {
                Image(systemName: icon)
                    .font(.title3)
                
                Text(type.rawValue)
                    .font(AppTheme.Typography.caption)
            }
            .foregroundColor(isSelected ? .white : .textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppTheme.Spacing.sm)
            .background(isSelected ? Color.appPrimary : Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.sm)
        }
    }
    
    private var icon: String {
        switch type {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.fill"
        case .snack: return "carrot.fill"
        }
    }
}

struct NutritionItem: View {
    let label: String
    let value: String
    let unit: String
    
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            Text(unit)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
            
            Text(label)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct FlexibleView<Data: Collection, Content: View>: View where Data.Element: Hashable {
    let data: Data
    let content: (Data.Element) -> Content
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: AppTheme.Spacing.xs) {
            ForEach(Array(data), id: \.self) { item in
                content(item)
            }
        }
    }
}
