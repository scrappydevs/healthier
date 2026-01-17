//
//  ExerciseView.swift
//  nexhacks-ios
//
//  Main view for exercise tracking with video upload
//

import SwiftUI
import PhotosUI
import AVKit
import UIKit

struct ExerciseView: View {
    @StateObject var viewModel: ExerciseViewModel
    @State private var showingAddExercise = false
    @State private var showingVideoCapture = false
    
    init(viewModel: ExerciseViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Today's Summary
                        todaySummaryCard
                        
                        // Quick Log Section
                        quickLogSection
                        
                        // Today's Exercises
                        todayExercisesSection
                    }
                    .padding(AppTheme.Spacing.md)
                }
                
                // Floating Action Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            showingVideoCapture = true
                        } label: {
                            Image(systemName: "video.fill")
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
            .navigationTitle("Exercise")
            .sheet(isPresented: $showingAddExercise) {
                QuickExerciseSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showingVideoCapture) {
                VideoUploadView(viewModel: viewModel)
            }
        }
    }
    
    // MARK: - Today's Summary Card
    
    private var todaySummaryCard: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Today's Activity")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Spacer()
            }
            
            HStack(spacing: AppTheme.Spacing.lg) {
                // Exercise Score Circle
                ZStack {
                    Circle()
                        .stroke(Color.divider, lineWidth: 8)
                        .frame(width: 100, height: 100)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(viewModel.exerciseScore / 100))
                        .stroke(
                            exerciseScoreColor(viewModel.exerciseScore),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 100, height: 100)
                        .rotationEffect(.degrees(-90))
                    
                    VStack(spacing: 2) {
                        Text("\(Int(viewModel.exerciseScore))")
                            .font(AppTheme.Typography.title)
                            .foregroundColor(.textPrimary)
                        
                        Text("/ 100")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
                
                VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                    Text(exerciseScoreMessage(viewModel.exerciseScore))
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                    
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.appPrimary)
                        Text("\(viewModel.totalMinutesToday) min")
                            .foregroundColor(.textPrimary)
                    }
                    .font(AppTheme.Typography.body)
                    
                    HStack {
                        Image(systemName: "flame.fill")
                            .foregroundColor(.appAccent)
                        Text("\(Int(viewModel.totalCaloriesBurnedToday)) cal burned")
                            .foregroundColor(.textPrimary)
                    }
                    .font(AppTheme.Typography.body)
                }
                
                Spacer()
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Quick Log Section
    
    private var quickLogSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Quick Log")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Spacer()
                
                Button {
                    showingAddExercise = true
                } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("Add")
                    }
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.appPrimary)
                }
            }
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.Spacing.md) {
                QuickExerciseButton(
                    icon: "figure.walk",
                    title: "10 min Walk",
                    color: .appPrimary
                ) {
                    viewModel.logQuickExercise(name: "Walking", type: .walking, durationMinutes: 10)
                }
                
                QuickExerciseButton(
                    icon: "figure.run",
                    title: "15 min Run",
                    color: .appAccent
                ) {
                    viewModel.logQuickExercise(name: "Running", type: .running, durationMinutes: 15)
                }
                
                QuickExerciseButton(
                    icon: "figure.yoga",
                    title: "20 min Yoga",
                    color: .success
                ) {
                    viewModel.logQuickExercise(name: "Yoga", type: .yoga, durationMinutes: 20)
                }
                
                QuickExerciseButton(
                    icon: "dumbbell.fill",
                    title: "30 min Weights",
                    color: .warning
                ) {
                    viewModel.logQuickExercise(name: "Weight Training", type: .weightlifting, durationMinutes: 30)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    // MARK: - Today's Exercises Section
    
    private var todayExercisesSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Today's Exercises")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            if viewModel.todaysExercises.isEmpty {
                emptyExerciseState
            } else {
                ForEach(viewModel.todaysExercises) { exercise in
                    ExerciseCard(exercise: exercise) {
                        viewModel.selectedExercise = exercise
                    }
                }
            }
        }
    }
    
    // MARK: - Empty State
    
    private var emptyExerciseState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "figure.run.circle")
                .font(.system(size: 50))
                .foregroundColor(.textSecondary)
            
            Text("No exercises logged today")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            Text("Use quick log buttons or record a video of your exercise")
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
    
    private func exerciseScoreColor(_ score: Double) -> Color {
        if score >= 80 { return .success }
        if score >= 50 { return .appPrimary }
        if score >= 25 { return .warning }
        return .error
    }
    
    private func exerciseScoreMessage(_ score: Double) -> String {
        if score >= 100 { return "Goal achieved!" }
        if score >= 80 { return "Almost there!" }
        if score >= 50 { return "Good progress" }
        if score > 0 { return "Keep moving" }
        return "Start exercising"
    }
}

// MARK: - Supporting Views

struct QuickExerciseButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: AppTheme.Spacing.sm) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(AppTheme.Spacing.md)
            .background(color.opacity(0.1))
            .cornerRadius(AppTheme.CornerRadius.md)
        }
    }
}

struct ExerciseCard: View {
    let exercise: Exercise
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            // Exercise Type Icon
            ZStack {
                Circle()
                    .fill(exerciseTypeColor(exercise.type).opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Image(systemName: exerciseTypeIcon(exercise.type))
                    .font(.title3)
                    .foregroundColor(exerciseTypeColor(exercise.type))
            }
            
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(exercise.name)
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
                
                Text(exercise.type.rawValue)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
                
                HStack(spacing: AppTheme.Spacing.md) {
                    Label(exercise.durationFormatted, systemImage: "clock.fill")
                    Label("\(Int(exercise.caloriesBurned)) cal", systemImage: "flame.fill")
                }
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
            }
            
            Spacer()
            
            if exercise.videoURL != nil {
                Image(systemName: "video.fill")
                    .font(.caption)
                    .foregroundColor(.appPrimary)
                    .padding(AppTheme.Spacing.sm)
                    .background(Color.appPrimary.opacity(0.1))
                    .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .onTapGesture {
            onTap()
        }
    }
    
    private func exerciseTypeIcon(_ type: ExerciseType) -> String {
        switch type {
        case .running: return "figure.run"
        case .walking: return "figure.walk"
        case .cycling: return "bicycle"
        case .swimming: return "figure.pool.swim"
        case .yoga: return "figure.yoga"
        case .weightlifting: return "dumbbell.fill"
        case .hiit: return "bolt.fill"
        case .sports: return "sportscourt.fill"
        case .other: return "figure.mixed.cardio"
        }
    }
    
    private func exerciseTypeColor(_ type: ExerciseType) -> Color {
        switch type {
        case .running: return .appAccent
        case .walking: return .appPrimary
        case .cycling: return .warning
        case .swimming: return .success
        case .yoga: return .appSecondary
        case .weightlifting: return .warning
        case .hiit: return .error
        case .sports: return .appPrimary
        case .other: return .textSecondary
        }
    }
}

// MARK: - Quick Exercise Sheet

struct QuickExerciseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ExerciseViewModel
    
    @State private var name = ""
    @State private var selectedType: ExerciseType = .other
    @State private var durationMinutes: Int = 30
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Name
                        FormSection(title: "EXERCISE NAME") {
                            FormTextField(title: "Name", text: $name, placeholder: "e.g., Morning Run")
                        }
                        
                        // Type
                        FormSection(title: "TYPE") {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.Spacing.sm) {
                                ForEach(ExerciseType.allCases, id: \.self) { type in
                                    ExerciseTypeButton(
                                        type: type,
                                        isSelected: selectedType == type,
                                        onTap: { selectedType = type }
                                    )
                                }
                            }
                            .padding(AppTheme.Spacing.md)
                        }
                        
                        // Duration
                        FormSection(title: "DURATION (MINUTES)") {
                            Stepper(value: $durationMinutes, in: 5...180, step: 5) {
                                Text("\(durationMinutes) minutes")
                                    .font(AppTheme.Typography.headline)
                                    .foregroundColor(.textPrimary)
                            }
                            .padding(AppTheme.Spacing.md)
                        }
                        
                        // Add Button
                        Button {
                            viewModel.logQuickExercise(
                                name: name.isEmpty ? selectedType.rawValue : name,
                                type: selectedType,
                                durationMinutes: durationMinutes
                            )
                            dismiss()
                        } label: {
                            Text("Log Exercise")
                                .font(AppTheme.Typography.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AppTheme.Spacing.md)
                                .background(Color.appPrimary)
                                .cornerRadius(AppTheme.CornerRadius.md)
                        }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Log Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
            }
        }
    }
}

struct ExerciseTypeButton: View {
    let type: ExerciseType
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: AppTheme.Spacing.xs) {
                Image(systemName: icon)
                    .font(.title3)
                
                Text(type.rawValue)
                    .font(AppTheme.Typography.caption)
                    .lineLimit(1)
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
        case .running: return "figure.run"
        case .walking: return "figure.walk"
        case .cycling: return "bicycle"
        case .swimming: return "figure.pool.swim"
        case .yoga: return "figure.yoga"
        case .weightlifting: return "dumbbell.fill"
        case .hiit: return "bolt.fill"
        case .sports: return "sportscourt.fill"
        case .other: return "figure.mixed.cardio"
        }
    }
}

// MARK: - Video Upload View

struct VideoUploadView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ExerciseViewModel
    
    @State private var selectedVideoURL: URL?
    @State private var selectedVideoItem: PhotosPickerItem?
    @State private var showVideoPicker = false
    @State private var showCameraRecorder = false
    @State private var name = ""
    @State private var selectedType: ExerciseType = .other
    @State private var durationMinutes: Int = 30
    @State private var isUploading = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Video Selection
                        if selectedVideoURL == nil {
                            videoSelectionSection
                        } else {
                            videoPreviewSection
                        }
                        
                        if selectedVideoURL != nil {
                            // Exercise Details
                            FormSection(title: "EXERCISE NAME") {
                                FormTextField(title: "Name", text: $name, placeholder: "e.g., Morning Yoga Session")
                            }
                            
                            FormSection(title: "TYPE") {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.Spacing.sm) {
                                    ForEach(ExerciseType.allCases, id: \.self) { type in
                                        ExerciseTypeButton(
                                            type: type,
                                            isSelected: selectedType == type,
                                            onTap: { selectedType = type }
                                        )
                                    }
                                }
                                .padding(AppTheme.Spacing.md)
                            }
                            
                            FormSection(title: "DURATION (MINUTES)") {
                                Stepper(value: $durationMinutes, in: 5...180, step: 5) {
                                    Text("\(durationMinutes) minutes")
                                        .font(AppTheme.Typography.headline)
                                        .foregroundColor(.textPrimary)
                                }
                                .padding(AppTheme.Spacing.md)
                            }
                            
                            // Upload Button
                            Button {
                                Task {
                                    await uploadVideo()
                                }
                            } label: {
                                HStack {
                                    if isUploading {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Image(systemName: "icloud.and.arrow.up.fill")
                                    }
                                    Text(isUploading ? "Uploading..." : "Upload & Log Exercise")
                                }
                                .font(AppTheme.Typography.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, AppTheme.Spacing.md)
                                .background(isUploading ? Color.textSecondary : Color.appPrimary)
                                .cornerRadius(AppTheme.CornerRadius.md)
                            }
                            .disabled(isUploading)
                        }
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Upload Exercise Video")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.appPrimary)
                }
            }
            .photosPicker(isPresented: $showVideoPicker, selection: $selectedVideoItem, matching: .videos)
            .onChange(of: selectedVideoItem) { _, newValue in
                Task {
                    if let newValue = newValue {
                        if let movie = try? await newValue.loadTransferable(type: VideoTransferable.self) {
                            selectedVideoURL = movie.url
                        }
                    }
                }
            }
            .alert("Success!", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Your exercise video has been uploaded and logged.")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .fullScreenCover(isPresented: $showCameraRecorder) {
                VideoCameraRecorder(videoURL: $selectedVideoURL)
            }
        }
    }
    
    private var videoSelectionSection: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "video.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.appPrimary)
            
            Text("Record Your Exercise")
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)
            
            Text("Upload a video of your exercise for caregivers to review")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
            
            VStack(spacing: AppTheme.Spacing.md) {
                Button {
                    showCameraRecorder = true
                } label: {
                    HStack {
                        Image(systemName: "video.fill")
                        Text("Record New Video")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appAccent)
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
                
                Button {
                    showVideoPicker = true
                } label: {
                    HStack {
                        Image(systemName: "photo.on.rectangle")
                        Text("Choose from Library")
                    }
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.appPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .background(Color.appPrimary.opacity(0.1))
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
        }
        .padding(AppTheme.Spacing.lg)
    }
    
    private var videoPreviewSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            if let url = selectedVideoURL {
                VideoPlayer(player: AVPlayer(url: url))
                    .frame(height: 200)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            Button {
                selectedVideoURL = nil
                selectedVideoItem = nil
            } label: {
                Text("Choose Different Video")
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    private func uploadVideo() async {
        guard let videoURL = selectedVideoURL else { return }
        
        isUploading = true
        
        do {
            _ = try await viewModel.uploadExerciseVideo(
                videoURL: videoURL,
                name: name.isEmpty ? selectedType.rawValue : name,
                type: selectedType,
                duration: TimeInterval(durationMinutes * 60)
            )
            showSuccess = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        
        isUploading = false
    }
}

// MARK: - Video Transferable

struct VideoTransferable: Transferable {
    let url: URL
    
    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { video in
            SentTransferredFile(video.url)
        } importing: { received in
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension("mp4")
            try FileManager.default.copyItem(at: received.file, to: tempURL)
            return Self(url: tempURL)
        }
    }
}

// MARK: - Video Camera Recorder

struct VideoCameraRecorder: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    @Binding var videoURL: URL?
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.mediaTypes = ["public.movie"]
        picker.videoQuality = .typeMedium
        picker.videoMaximumDuration = 300 // 5 minutes max
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: VideoCameraRecorder
        
        init(_ parent: VideoCameraRecorder) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let url = info[.mediaURL] as? URL {
                // Copy to temp location
                let tempURL = FileManager.default.temporaryDirectory
                    .appendingPathComponent(UUID().uuidString)
                    .appendingPathExtension("mp4")
                
                do {
                    try FileManager.default.copyItem(at: url, to: tempURL)
                    parent.videoURL = tempURL
                } catch {
                    print("Failed to copy video: \(error)")
                }
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
