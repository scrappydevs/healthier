//
//  VoiceMedicationAssistantView.swift
//  nexhacks-ios
//
//  Voice-enabled medication assistant with camera vision
//  Uses Overshoot for pill identification and LiveKit for Q&A
//

import SwiftUI
import AVFoundation

struct VoiceMedicationAssistantView: View {
    @ObservedObject var viewModel: MedicationViewModel
    @StateObject private var assistantService = MedicationAssistantService()
    @StateObject private var cameraManager = MedicationCameraManager()
    @Environment(\.dismiss) private var dismiss
    
    @State private var isStarted = false
    @State private var isStarting = false
    @State private var startTask: Task<Void, Never>?
    @State private var showingError = false
    @State private var waveformAmplitude: CGFloat = 0.3
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Camera Preview
                cameraPreviewSection
                
                // Vision Description
                visionDescriptionCard
                
                // Voice Interaction Area
                voiceInteractionSection
                
                // Controls
                controlButtons
            }
        }
        .onDisappear {
            stopAssistant()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(assistantService.errorMessage ?? "An error occurred")
        }
        .onChange(of: assistantService.errorMessage) { _, newValue in
            showingError = newValue != nil
        }
    }
    
    // MARK: - Header
    
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Medication Assistant")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                
                HStack(spacing: AppTheme.Spacing.sm) {
                    connectionStatusBadge(
                        label: "Vision",
                        isConnected: assistantService.isVisionConnected
                    )
                    connectionStatusBadge(
                        label: "Voice",
                        isConnected: assistantService.isVoiceConnected
                    )
                }
            }
            
            Spacer()
            
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(AppTheme.Spacing.md)
    }
    
    private func connectionStatusBadge(label: String, isConnected: Bool) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isConnected ? Color.success : Color.warning)
                .frame(width: 6, height: 6)
            Text(label)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.white.opacity(0.8))
        }
        .padding(.horizontal, AppTheme.Spacing.sm)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
    
    // MARK: - Camera Preview
    
    private var cameraPreviewSection: some View {
        ZStack {
            // Camera preview
            MedicationCameraPreviewView(cameraManager: cameraManager)
                .frame(height: 280)
                .cornerRadius(AppTheme.CornerRadius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
            
            // Scanning overlay
            if assistantService.isAnalyzing {
                VStack {
                    Spacer()
                    HStack {
                        Image(systemName: "viewfinder")
                            .foregroundColor(.appPrimary)
                        Text("Point camera at medication")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, AppTheme.Spacing.md)
                    .padding(.vertical, AppTheme.Spacing.sm)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(AppTheme.CornerRadius.sm)
                    .padding(.bottom, AppTheme.Spacing.md)
                }
            }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
    }
    
    // MARK: - Vision Description
    
    private var visionDescriptionCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack {
                Image(systemName: "eye.fill")
                    .foregroundColor(.appPrimary)
                Text("I see:")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.white)
                Spacer()
                Text(assistantService.visionStatus)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Text(assistantService.visionDescription.isEmpty 
                 ? "Waiting for camera input..." 
                 : assistantService.visionDescription)
                .font(AppTheme.Typography.body)
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            Text("Vision endpoint: \(assistantService.visionEndpointDescription)")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.white.opacity(0.5))
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.white.opacity(0.1))
        .cornerRadius(AppTheme.CornerRadius.md)
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.top, AppTheme.Spacing.md)
    }
    
    // MARK: - Voice Interaction
    
    private var voiceInteractionSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            // Waveform visualization
            waveformView
            
            // Agent response
            if !assistantService.agentResponse.isEmpty {
                ScrollView {
                    Text(assistantService.agentResponse)
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxHeight: 100)
                .padding(AppTheme.Spacing.md)
                .background(Color.appPrimary.opacity(0.2))
                .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            // User transcript (only show when connected and listening)
            if assistantService.isVoiceConnected && !assistantService.userTranscript.isEmpty {
                Text(assistantService.userTranscript)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(2)
            }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.top, AppTheme.Spacing.md)
    }
    
    private var waveformView: some View {
        HStack(spacing: 3) {
            ForEach(0..<30, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.appPrimary, Color.appAccent]),
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(width: 4)
                    .frame(height: waveformHeight(for: index))
            }
        }
        .frame(height: 50)
        .onReceive(Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()) { _ in
            if assistantService.isVoiceConnected {
                waveformAmplitude = CGFloat.random(in: 0.3...1.0)
            } else {
                waveformAmplitude = 0.15
            }
        }
    }
    
    private func waveformHeight(for index: Int) -> CGFloat {
        let baseHeight: CGFloat = 6
        let time = Date().timeIntervalSince1970
        let frequency = Double(index) * 0.3
        let variation = sin(frequency + time * 4) * 0.5 + 0.5
        let height = baseHeight + (variation * waveformAmplitude * 40)
        return max(baseHeight, min(height, 50))
    }
    
    // MARK: - Controls
    
    private var controlButtons: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            // Status text
            Text(statusText)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.white.opacity(0.7))
            
            // Main action button
            Button {
                if isStarted || isStarting || assistantService.isConnecting {
                    stopAssistant()
                } else {
                    startAssistant()
                }
            } label: {
                HStack(spacing: AppTheme.Spacing.sm) {
                    Image(systemName: mainButtonIcon)
                    Text(mainButtonTitle)
                }
                .font(AppTheme.Typography.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(AppTheme.Spacing.md)
                .background(
                    Group {
                        if isStarted || isStarting || assistantService.isConnecting {
                            Color.error
                        } else {
                            LinearGradient(
                                gradient: Gradient(colors: [Color.appPrimary, Color.appAccent]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        }
                    }
                )
                .cornerRadius(AppTheme.CornerRadius.md)
            }
            
            // Tip
            Text("Ask questions about your medications or show them to the camera")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
        }
        .padding(AppTheme.Spacing.md)
        .padding(.bottom, AppTheme.Spacing.lg)
    }
    
    private var mainButtonTitle: String {
        if isStarted {
            return "Stop Assistant"
        }
        if isStarting || assistantService.isConnecting {
            return "Cancel"
        }
        return "Start Assistant"
    }

    private var mainButtonIcon: String {
        if isStarted || isStarting || assistantService.isConnecting {
            return "stop.fill"
        }
        return "mic.fill"
    }

    private var statusText: String {
        switch assistantService.connectionState {
        case .disconnected:
            return isStarting ? "Starting..." : "Ready to start"
        case .connecting:
            return "Connecting..."
        case .connected:
            return "Listening - speak your question"
        case .error(let message):
            return "Error: \(message)"
        }
    }
    
    // MARK: - Actions
    
    private func startAssistant() {
        if isStarted || isStarting || startTask != nil {
            return
        }
        isStarting = true

        startTask = Task { @MainActor in
            defer {
                startTask = nil
            }

            do {
                // Get medication context from viewModel
                let context = viewModel.getMedicationContextString()

                var cameraAllowed = false
                #if targetEnvironment(simulator)
                assistantService.visionDescription = "Camera is not available on the iOS Simulator. Run on a physical device for vision."
                #else
                // Camera permission (needed to provide vision context)
                cameraAllowed = await requestCameraPermissionIfNeeded()
                if Task.isCancelled {
                    await assistantService.stop()
                    cameraManager.stopCapture()
                    isStarting = false
                    return
                }
                #endif

                // Start assistant service
                try await assistantService.start(medicationContext: context)
                if Task.isCancelled {
                    await assistantService.stop()
                    cameraManager.stopCapture()
                    isStarting = false
                    return
                }

                #if !targetEnvironment(simulator)
                if cameraAllowed {
                    // Start camera after vision websocket is ready
                    cameraManager.startCapture { imageData in
                        Task {
                            await assistantService.sendFrame(imageData)
                        }
                    }
                } else {
                    assistantService.visionDescription = "Camera access denied. Voice assistant can still answer based on your medication plan."
                }
                #endif

                isStarted = true
            } catch {
                assistantService.errorMessage = error.localizedDescription
            }

            isStarting = false
        }
    }
    
    private func stopAssistant() {
        startTask?.cancel()
        startTask = nil
        isStarting = false

        Task { @MainActor in
            cameraManager.stopCapture()
            await assistantService.stop()
            isStarted = false
        }
    }

    private func requestCameraPermissionIfNeeded() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            return true
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    continuation.resume(returning: granted)
                }
            }
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }
}

// MARK: - Medication Camera Manager

class MedicationCameraManager: NSObject, ObservableObject {
    @Published var isRunning = false
    
    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var frameCallback: ((Data) -> Void)?
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private var frameCount = 0
    
    var previewLayer: AVCaptureVideoPreviewLayer? {
        guard let session = captureSession else { return nil }
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        return layer
    }
    
    func startCapture(onFrame: @escaping (Data) -> Void) {
        frameCallback = onFrame
        
        sessionQueue.async { [weak self] in
            self?.setupCaptureSession()
            self?.captureSession?.startRunning()
            
            DispatchQueue.main.async {
                self?.isRunning = true
            }
        }
    }
    
    func stopCapture() {
        sessionQueue.async { [weak self] in
            self?.captureSession?.stopRunning()
            
            DispatchQueue.main.async {
                self?.isRunning = false
            }
        }
    }
    
    private func setupCaptureSession() {
        let session = AVCaptureSession()
        session.sessionPreset = .medium
        
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            return
        }
        
        if session.canAddInput(input) {
            session.addInput(input)
        }
        
        let output = AVCaptureVideoDataOutput()
        output.setSampleBufferDelegate(self, queue: DispatchQueue(label: "camera.frame.queue"))
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        
        if session.canAddOutput(output) {
            session.addOutput(output)
        }
        
        captureSession = session
        videoOutput = output
    }
}

extension MedicationCameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        frameCount += 1
        
        // Send every 5th frame (reduce bandwidth)
        guard frameCount % 5 == 0 else { return }
        
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext()
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        
        let uiImage = UIImage(cgImage: cgImage)
        let resizedImage = resizeForVision(uiImage)
        
        // Compress to JPEG
        guard let jpegData = resizedImage.jpegData(compressionQuality: 0.35) else { return }
        
        frameCallback?(jpegData)
    }

    private func resizeForVision(_ image: UIImage) -> UIImage {
        let maxWidth: CGFloat = 640
        let originalSize = image.size
        guard originalSize.width > 0, originalSize.height > 0 else { return image }

        // If already small enough, still enforce even dimensions
        let scale = min(1.0, maxWidth / originalSize.width)
        var targetWidth = floor(originalSize.width * scale)
        var targetHeight = floor(originalSize.height * scale)

        // Force even dimensions (helps some YUV conversions downstream)
        if Int(targetWidth) % 2 != 0 { targetWidth -= 1 }
        if Int(targetHeight) % 2 != 0 { targetHeight -= 1 }
        if targetWidth < 2 || targetHeight < 2 { return image }

        let targetSize = CGSize(width: targetWidth, height: targetHeight)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }
}

// MARK: - Camera Preview View

struct MedicationCameraPreviewView: UIViewRepresentable {
    @ObservedObject var cameraManager: MedicationCameraManager
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black
        
        if let previewLayer = cameraManager.previewLayer {
            previewLayer.frame = view.bounds
            view.layer.addSublayer(previewLayer)
        }
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            previewLayer.frame = uiView.bounds
        } else if let previewLayer = cameraManager.previewLayer {
            previewLayer.frame = uiView.bounds
            uiView.layer.addSublayer(previewLayer)
        }
    }
}

// MARK: - Preview

#Preview {
    VoiceMedicationAssistantView(
        viewModel: MedicationViewModel(
            medicationRepository: MedicationRepository()
        )
    )
}
