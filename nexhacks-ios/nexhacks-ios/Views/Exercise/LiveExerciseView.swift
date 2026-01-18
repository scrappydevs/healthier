//
//  LiveExerciseView.swift
//  nexhacks-ios
//
//  Live exercise recording with real-time AI feedback
//

import SwiftUI
import AVFoundation

struct LiveExerciseView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ExerciseViewModel
    @StateObject private var analysisService = ExerciseAnalysisService()
    @StateObject private var cameraManager = CameraManager()
    
    @State private var selectedType: ExerciseType = .other
    @State private var isRecording = false
    @State private var recordingStartTime: Date?
    @State private var elapsedSeconds: Int = 0
    @State private var showingSaveSheet = false
    @State private var recordedVideoURL: URL?
    
    let recordingTimer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    let frameTimer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect() // Send frame every 0.5s
    
    var body: some View {
        ZStack {
            // Camera Preview
            CameraPreviewView(session: cameraManager.session)
                .ignoresSafeArea()
            
            // Overlay
            VStack {
                // Top Bar
                topBar
                
                Spacer()
                
                // Analysis Feedback Overlay
                if isRecording {
                    feedbackOverlay
                }
                
                // Bottom Controls
                bottomControls
            }
            .padding()
        }
        .onAppear {
            cameraManager.checkPermissions()
        }
        .onDisappear {
            Task {
                if isRecording {
                    await stopRecording()
                }
                await analysisService.disconnect()
            }
            cameraManager.stopSession()
        }
        .onReceive(recordingTimer) { _ in
            if isRecording {
                elapsedSeconds += 1
            }
        }
        .onReceive(frameTimer) { _ in
            if isRecording && analysisService.isAnalyzing {
                captureAndAnalyzeFrame()
            }
        }
        .sheet(isPresented: $showingSaveSheet) {
            SaveExerciseSheet(
                viewModel: viewModel,
                exerciseType: analysisService.currentExerciseType.flatMap { ExerciseType(rawValue: $0) } ?? selectedType,
                duration: TimeInterval(elapsedSeconds),
                repCount: analysisService.repCount,
                videoURL: recordedVideoURL,
                onSave: { dismiss() }
            )
        }
    }
    
    // MARK: - Top Bar
    
    private var topBar: some View {
        HStack {
            Button {
                Task {
                    if isRecording {
                        await stopRecording()
                    }
                    dismiss()
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
                    .shadow(radius: 4)
            }
            
            Spacer()
            
            // Timer
            Text(formatTime(elapsedSeconds))
                .font(.system(size: 24, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isRecording ? Color.red : Color.black.opacity(0.5))
                .cornerRadius(8)
            
            Spacer()
            
            // Connection indicator
            Circle()
                .fill(analysisService.isConnected ? Color.green : Color.orange)
                .frame(width: 12, height: 12)
                .shadow(radius: 2)
        }
        .padding(.top, 20)
    }
    
    // MARK: - Feedback Overlay
    
    private var feedbackOverlay: some View {
        VStack(spacing: 16) {
            // Exercise Type & Reps
            HStack(spacing: 20) {
                // Exercise Type
                VStack(spacing: 4) {
                    Text(analysisService.currentExerciseType ?? "Detecting...")
                        .font(.headline)
                        .foregroundColor(.white)
                    Text("EXERCISE")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.black.opacity(0.6))
                .cornerRadius(12)
                
                // Rep Counter
                VStack(spacing: 4) {
                    Text("\(analysisService.repCount)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("REPS")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.appPrimary.opacity(0.8))
                .cornerRadius(12)
                
                // Form Score
                VStack(spacing: 4) {
                    Text("\(analysisService.formScore)/10")
                        .font(.headline)
                        .foregroundColor(formScoreColor)
                    Text("FORM")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.black.opacity(0.6))
                .cornerRadius(12)
            }
            
            // Feedback Banner
            if !analysisService.lastFeedback.isEmpty {
                Text(analysisService.lastFeedback)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(20)
                    .transition(.opacity)
            }
            
            // Safety Alert
            if let alert = analysisService.safetyAlert {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.yellow)
                    Text(alert)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.red.opacity(0.9))
                .cornerRadius(20)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: analysisService.lastFeedback)
        .animation(.easeInOut(duration: 0.3), value: analysisService.safetyAlert)
    }
    
    private var formScoreColor: Color {
        if analysisService.formScore >= 8 { return .green }
        if analysisService.formScore >= 5 { return .yellow }
        return .red
    }
    
    // MARK: - Bottom Controls
    
    private var bottomControls: some View {
        VStack(spacing: 20) {
            // Exercise Type Picker (only before recording)
            if !isRecording {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(ExerciseType.allCases, id: \.self) { type in
                            ExerciseTypeChip(
                                type: type,
                                isSelected: selectedType == type,
                                onTap: { selectedType = type }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
            
            // Record Button
            Button {
                Task {
                    if isRecording {
                        await stopRecording()
                        showingSaveSheet = true
                    } else {
                        await startRecording()
                    }
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 80, height: 80)
                    
                    if isRecording {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.red)
                            .frame(width: 32, height: 32)
                    } else {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 64, height: 64)
                    }
                }
                .shadow(radius: 4)
            }
            
            Text(isRecording ? "Tap to stop" : "Tap to start recording")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(.bottom, 30)
    }
    
    // MARK: - Recording Methods
    
    private func startRecording() async {
        isRecording = true
        elapsedSeconds = 0
        recordingStartTime = Date()
        
        // Start camera recording
        cameraManager.startRecording()
        
        // Connect and start analysis
        await analysisService.connect()
        await analysisService.startSession(exerciseType: selectedType.rawValue)
    }
    
    private func stopRecording() async {
        isRecording = false
        
        // Stop analysis
        await analysisService.stopSession()
        
        // Stop camera and get video URL
        recordedVideoURL = cameraManager.stopRecording()
    }
    
    private func captureAndAnalyzeFrame() {
        guard let imageData = cameraManager.captureCurrentFrame() else { return }
        
        Task {
            await analysisService.analyzeFrame(imageData)
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }
}

// MARK: - Exercise Type Chip

struct ExerciseTypeChip: View {
    let type: ExerciseType
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            Text(type.rawValue)
                .font(.subheadline)
                .foregroundColor(isSelected ? .white : .white.opacity(0.8))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.appPrimary : Color.black.opacity(0.5))
                .cornerRadius(20)
        }
    }
}

// MARK: - Save Exercise Sheet

struct SaveExerciseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ExerciseViewModel
    
    let exerciseType: ExerciseType
    let duration: TimeInterval
    let repCount: Int
    let videoURL: URL?
    let onSave: () -> Void
    
    @State private var name: String = ""
    @State private var isSaving = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: AppTheme.Spacing.lg) {
                        // Summary
                        VStack(spacing: AppTheme.Spacing.md) {
                            Text("Workout Complete!")
                                .font(AppTheme.Typography.title2)
                                .foregroundColor(.textPrimary)
                            
                            HStack(spacing: AppTheme.Spacing.xl) {
                                SummaryItem(value: "\(Int(duration / 60))", label: "MIN")
                                SummaryItem(value: "\(repCount)", label: "REPS")
                                SummaryItem(value: exerciseType.rawValue, label: "TYPE")
                            }
                        }
                        .padding(AppTheme.Spacing.lg)
                        .background(Color.cardBackground)
                        .cornerRadius(AppTheme.CornerRadius.md)
                        
                        // Name Input
                        FormSection(title: "EXERCISE NAME") {
                            FormTextField(
                                title: "Name",
                                text: $name,
                                placeholder: exerciseType.rawValue
                            )
                        }
                        
                        // Save Button
                        Button {
                            saveExercise()
                        } label: {
                            HStack {
                                if isSaving {
                                    ProgressView().tint(.white)
                                }
                                Text(isSaving ? "Saving..." : "Save Exercise")
                            }
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(AppTheme.Spacing.md)
                            .background(isSaving ? Color.textSecondary : Color.appPrimary)
                            .cornerRadius(AppTheme.CornerRadius.md)
                        }
                        .disabled(isSaving)
                    }
                    .padding(AppTheme.Spacing.md)
                }
            }
            .navigationTitle("Save Workout")
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
    
    private func saveExercise() {
        isSaving = true
        
        Task {
            let exerciseName = name.isEmpty ? exerciseType.rawValue : name
            
            if let videoURL = videoURL {
                // Upload video and save
                do {
                    _ = try await viewModel.uploadExerciseVideo(
                        videoURL: videoURL,
                        name: exerciseName,
                        type: exerciseType,
                        duration: duration
                    )
                } catch {
                    print("Failed to upload video: \(error)")
                }
            } else {
                // Save without video
                viewModel.logQuickExercise(
                    name: exerciseName,
                    type: exerciseType,
                    durationMinutes: Int(duration / 60)
                )
            }
            
            isSaving = false
            dismiss()
            onSave()
        }
    }
}

struct SummaryItem: View {
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundColor(.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundColor(.textSecondary)
        }
    }
}

// MARK: - Camera Preview

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        
        DispatchQueue.main.async {
            previewLayer.frame = view.bounds
        }
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            previewLayer.frame = uiView.bounds
        }
    }
}

// MARK: - Camera Manager

class CameraManager: NSObject, ObservableObject {
    @Published var session = AVCaptureSession()
    @Published var isAuthorized = false
    
    private var videoOutput: AVCaptureVideoDataOutput?
    private var movieOutput: AVCaptureMovieFileOutput?
    private var currentFrame: Data?
    private var recordingURL: URL?
    
    func checkPermissions() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            isAuthorized = true
            setupCamera()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    self?.isAuthorized = granted
                    if granted {
                        self?.setupCamera()
                    }
                }
            }
        default:
            isAuthorized = false
        }
    }
    
    private func setupCamera() {
        session.beginConfiguration()
        session.sessionPreset = .high
        
        // Video input
        guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else {
            return
        }
        
        if session.canAddInput(videoInput) {
            session.addInput(videoInput)
        }
        
        // Audio input
        if let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
           session.canAddInput(audioInput) {
            session.addInput(audioInput)
        }
        
        // Video data output (for frame capture)
        let videoOutput = AVCaptureVideoDataOutput()
        videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "videoQueue"))
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            self.videoOutput = videoOutput
        }
        
        // Movie file output (for recording)
        let movieOutput = AVCaptureMovieFileOutput()
        if session.canAddOutput(movieOutput) {
            session.addOutput(movieOutput)
            self.movieOutput = movieOutput
        }
        
        session.commitConfiguration()
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }
    
    func startRecording() {
        guard let movieOutput = movieOutput else { return }
        
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp4")
        
        recordingURL = tempURL
        movieOutput.startRecording(to: tempURL, recordingDelegate: self)
    }
    
    func stopRecording() -> URL? {
        movieOutput?.stopRecording()
        return recordingURL
    }
    
    func captureCurrentFrame() -> Data? {
        return currentFrame
    }
    
    func stopSession() {
        session.stopRunning()
    }
}

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        
        let uiImage = UIImage(cgImage: cgImage)
        
        // Compress to JPEG for transmission
        if let jpegData = uiImage.jpegData(compressionQuality: 0.5) {
            currentFrame = jpegData
        }
    }
}

extension CameraManager: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        if let error = error {
            print("Recording error: \(error)")
        } else {
            print("Recording saved to: \(outputFileURL)")
        }
    }
}
