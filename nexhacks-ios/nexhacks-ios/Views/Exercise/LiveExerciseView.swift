//
//  LiveExerciseView.swift
//  nexhacks-ios
//
//  Live exercise recording with real-time AI feedback
//

import SwiftUI
import AVFoundation
import UIKit

struct LiveExerciseView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ExerciseViewModel
    @StateObject private var analysisService = ExerciseAnalysisService()
    @StateObject private var cameraManager = CameraManager()
    
    // Optional initial values from plan item
    var initialExerciseType: ExerciseType?
    var planItemName: String?
    
    @State private var selectedType: ExerciseType = .other
    @State private var isRecording = false
    @State private var recordingStartTime: Date?
    @State private var showingSaveSheet = false
    @State private var recordedVideoURL: URL?
    @State private var finalDuration: TimeInterval = 0
    
    // Frame capture timer
    let frameTimer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect() // Send frame every 0.5s
    
    var body: some View {
        ZStack {
            // Camera Preview or Permission Denied
            if cameraManager.permissionDenied {
                // Permission denied view
                Color.black.ignoresSafeArea()
                VStack(spacing: 20) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.white.opacity(0.5))
                    
                    Text("Camera Access Required")
                        .font(.title2.bold())
                        .foregroundColor(.white)
                    
                    Text("Please enable camera access in Settings to record your exercise.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    Button {
                        if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(settingsURL)
                        }
                    } label: {
                        Text("Open Settings")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.appPrimary)
                            .cornerRadius(10)
                    }
                }
            } else {
                // Camera Preview
                CameraPreviewView(session: cameraManager.session)
                    .ignoresSafeArea()
            }
            
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
                if !cameraManager.permissionDenied {
                    bottomControls
                }
            }
            .padding()
        }
        .onAppear {
            cameraManager.checkPermissions()
            if let initialType = initialExerciseType {
                selectedType = initialType
            }
        }
        .onDisappear {
            if isRecording {
                isRecording = false
                Task {
                    await analysisService.stopSession()
                }
                _ = cameraManager.stopRecording()
            }
            Task {
                await analysisService.disconnect()
            }
            cameraManager.stopSession()
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
                duration: finalDuration,
                repCount: analysisService.repCount,
                videoURL: recordedVideoURL,
                initialName: planItemName,
                onSave: { dismiss() }
            )
        }
    }
    
    // MARK: - Top Bar
    
    private var topBar: some View {
        HStack {
            Button {
                if isRecording {
                    isRecording = false
                    Task {
                        await analysisService.stopSession()
                        _ = cameraManager.stopRecording()
                    }
                }
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
                    .shadow(radius: 4)
            }
            
            Spacer()
            
            // Timer with TimelineView for reliable updates
            TimelineView(.periodic(from: .now, by: 1.0)) { context in
                let seconds: Int = {
                    guard isRecording, let startTime = recordingStartTime else { return 0 }
                    return Int(context.date.timeIntervalSince(startTime))
                }()
                
                Text(formatTime(seconds))
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(isRecording ? Color.red : Color.black.opacity(0.5))
                    .cornerRadius(8)
            }
            
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
            // Exercise Type Picker (only before recording, and not when from plan)
            if !isRecording && planItemName == nil {
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
            } else if !isRecording, let planName = planItemName {
                // Show locked plan item name when from plan
                Text(planName)
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.appPrimary)
                    .cornerRadius(20)
            }
            
            // Record Button
            Button {
                if isRecording {
                    // Stop recording - capture final duration first
                    if let startTime = recordingStartTime {
                        finalDuration = Date().timeIntervalSince(startTime)
                    }
                    isRecording = false
                    Task {
                        await analysisService.stopSession()
                        recordedVideoURL = cameraManager.stopRecording()
                        showingSaveSheet = true
                    }
                } else {
                    // Start recording - update state first, then do async work
                    isRecording = true
                    recordingStartTime = Date()
                    finalDuration = 0
                    cameraManager.startRecording()
                    Task {
                        await analysisService.connect()
                        await analysisService.startSession(exerciseType: selectedType.rawValue)
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
    var initialName: String?
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
            .onAppear {
                if let initialName = initialName {
                    name = initialName
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
        let view = CameraPreviewUIView()
        view.session = session
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewView = uiView as? CameraPreviewUIView {
            previewView.session = session
        }
    }
}

class CameraPreviewUIView: UIView {
    var session: AVCaptureSession? {
        didSet {
            if let layer = self.layer as? AVCaptureVideoPreviewLayer {
                layer.session = session
            }
        }
    }
    
    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        if let layer = self.layer as? AVCaptureVideoPreviewLayer {
            layer.videoGravity = .resizeAspectFill
        }
    }
}

// MARK: - Camera Manager

class CameraManager: NSObject, ObservableObject {
    @Published var session = AVCaptureSession()
    @Published var isAuthorized = false
    @Published var permissionDenied = false
    @Published var isSessionRunning = false
    
    private var videoOutput: AVCaptureVideoDataOutput?
    private var movieOutput: AVCaptureMovieFileOutput?
    private var currentFrame: Data?
    private var recordingURL: URL?
    
    func checkPermissions() {
        // Check camera permission
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            checkMicrophoneAndSetup()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.checkMicrophoneAndSetup()
                    } else {
                        self?.permissionDenied = true
                        self?.isAuthorized = false
                    }
                }
            }
        case .denied, .restricted:
            DispatchQueue.main.async {
                self.permissionDenied = true
                self.isAuthorized = false
            }
        @unknown default:
            permissionDenied = true
            isAuthorized = false
        }
    }
    
    private func checkMicrophoneAndSetup() {
        // Check microphone permission (optional but good for recording)
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            setupCamera(withAudio: true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
                DispatchQueue.main.async {
                    self?.setupCamera(withAudio: granted)
                }
            }
        default:
            // Proceed without audio if denied
            setupCamera(withAudio: false)
        }
    }
    
    private func setupCamera(withAudio: Bool) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            self.session.beginConfiguration()
            self.session.sessionPreset = .high
            
            // Video input
            guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else {
                DispatchQueue.main.async {
                    self.isAuthorized = false
                }
                return
            }
            
            if self.session.canAddInput(videoInput) {
                self.session.addInput(videoInput)
            }
            
            // Audio input (if authorized)
            if withAudio,
               let audioDevice = AVCaptureDevice.default(for: .audio),
               let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
               self.session.canAddInput(audioInput) {
                self.session.addInput(audioInput)
            }
            
            // Video data output (for frame capture)
            let videoOutput = AVCaptureVideoDataOutput()
            videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "videoQueue"))
            if self.session.canAddOutput(videoOutput) {
                self.session.addOutput(videoOutput)
                self.videoOutput = videoOutput
            }
            
            // Movie file output (for recording)
            let movieOutput = AVCaptureMovieFileOutput()
            if self.session.canAddOutput(movieOutput) {
                self.session.addOutput(movieOutput)
                self.movieOutput = movieOutput
            }
            
            self.session.commitConfiguration()
            
            // Start session
            self.session.startRunning()
            
            DispatchQueue.main.async {
                self.isAuthorized = true
                self.isSessionRunning = self.session.isRunning
            }
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
