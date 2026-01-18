//
//  MedicationAssistantService.swift
//  nexhacks-ios
//
//  Service combining Overshoot vision analysis with LiveKit voice agent
//  for medication identification and Q&A
//

import Foundation
import AVFoundation
import Combine
import Speech
import LiveKit
import CommonCrypto

@MainActor
class MedicationAssistantService: NSObject, ObservableObject {
    // MARK: - Vision State (Overshoot)
    @Published var visionDescription: String = ""
    @Published var isVisionConnected: Bool = false
    @Published var isAnalyzing: Bool = false
    
    // MARK: - Voice State (LiveKit)
    @Published var connectionState: ConnectionState = .disconnected
    @Published var isVoiceConnected: Bool = false
    @Published var userTranscript: String = ""
    @Published var agentResponse: String = ""
    @Published var errorMessage: String?
    
    enum ConnectionState {
        case disconnected
        case connecting
        case connected
        case error(String)
    }
    
    // MARK: - LiveKit Configuration
    private let liveKitUrl: String = "wss://nexhacks-voice-agent-cijvwvbe.livekit.cloud"
    private let liveKitApiKey: String = "APIXngdedEtCPKf"
    private let liveKitApiSecret: String = "mgJhaxW6LkifWzvjdp9WLrOx1QSg7SdDYdD87aNXcZH"
    private let agentName: String = "medication-assistant-agent"
    
    // MARK: - Vision WebSocket Configuration
    private var visionWebSocket: URLSessionWebSocketTask?
    private var visionURLSession: URLSession!
    private var visionWSURL: URL {
        #if targetEnvironment(simulator)
        return URL(string: "ws://localhost:3001/ws/medication")!
        #else
        // Update to your computer's local IP for physical device
        return URL(string: "ws://172.26.114.222:3001/ws/medication")!
        #endif
    }
    
    // MARK: - Private Properties
    private var liveKitRoom: LiveKit.Room?
    private var currentRoomName: String?
    private var medicationContext: String = ""
    
    // Speech recognition for user transcription
    private let speechRecognizer: SFSpeechRecognizer? = SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var committedTranscript: String = ""
    
    // MARK: - Initialization
    override init() {
        super.init()
        visionURLSession = URLSession(configuration: .default, delegate: nil, delegateQueue: .main)
    }
    
    // MARK: - Public Methods
    
    /// Start the medication assistant with given medication context
    func start(medicationContext: String) async throws {
        self.medicationContext = medicationContext
        errorMessage = nil
        
        // Request permissions
        guard await requestSpeechAuthorizationIfNeeded() else {
            throw MedicationAssistantError.speechRecognitionNotAuthorized
        }
        
        guard await requestMicrophonePermissionIfNeeded() else {
            throw MedicationAssistantError.microphonePermissionDenied
        }
        
        // Start vision analysis
        await connectVision()
        
        // Start voice agent
        try await connectVoice()
    }
    
    /// Stop all services
    func stop() async {
        await disconnectVision()
        await disconnectVoice()
        
        visionDescription = ""
        userTranscript = ""
        agentResponse = ""
        medicationContext = ""
    }
    
    /// Send a camera frame for vision analysis
    func sendFrame(_ imageData: Data) async {
        guard isVisionConnected && isAnalyzing else { return }
        
        let base64Frame = imageData.base64EncodedString()
        let message: [String: Any] = [
            "type": "frame",
            "frame": base64Frame
        ]
        
        await sendVisionJSON(message)
    }
    
    /// Update vision context with current description for voice agent
    func updateAgentContext() async {
        guard isVoiceConnected, let room = liveKitRoom else { return }
        
        // Send vision context to agent via data message
        let contextMessage = """
        [VISION UPDATE]
        I can see: \(visionDescription)
        
        [USER'S MEDICATIONS]
        \(medicationContext)
        """
        
        let data = contextMessage.data(using: .utf8) ?? Data()
        do {
            try await room.localParticipant.publish(data: data, options: DataPublishOptions(reliable: true))
        } catch {
            print("MedicationAssistant: Failed to send context update - \(error)")
        }
    }
    
    // MARK: - Vision WebSocket Methods
    
    private func connectVision() async {
        guard visionWebSocket == nil else { return }
        
        visionWebSocket = visionURLSession.webSocketTask(with: visionWSURL)
        visionWebSocket?.resume()
        
        isVisionConnected = true
        receiveVisionMessages()
        
        // Start session with medication context
        let startMessage: [String: Any] = [
            "type": "start",
            "medicationContext": medicationContext
        ]
        await sendVisionJSON(startMessage)
        isAnalyzing = true
        
        print("MedicationAssistant: Vision connected")
    }
    
    private func disconnectVision() async {
        isAnalyzing = false
        
        // Send stop message
        let stopMessage: [String: Any] = ["type": "stop"]
        await sendVisionJSON(stopMessage)
        
        visionWebSocket?.cancel(with: .normalClosure, reason: nil)
        visionWebSocket = nil
        isVisionConnected = false
        
        print("MedicationAssistant: Vision disconnected")
    }
    
    private func sendVisionJSON(_ dict: [String: Any]) async {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        
        do {
            try await visionWebSocket?.send(.string(string))
        } catch {
            print("MedicationAssistant: Vision send error - \(error)")
        }
    }
    
    private func receiveVisionMessages() {
        visionWebSocket?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                Task { @MainActor in
                    self.handleVisionMessage(message)
                    self.receiveVisionMessages()
                }
                
            case .failure(let error):
                print("MedicationAssistant: Vision receive error - \(error)")
                Task { @MainActor in
                    self.isVisionConnected = false
                }
            }
        }
    }
    
    private func handleVisionMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            processVisionResult(json)
            
        case .data(let data):
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            processVisionResult(json)
            
        @unknown default:
            break
        }
    }
    
    private func processVisionResult(_ json: [String: Any]) {
        guard let type = json["type"] as? String else { return }
        
        switch type {
        case "vision":
            if let description = json["description"] as? String {
                visionDescription = description
                // Update agent with new vision context
                Task {
                    await updateAgentContext()
                }
            }
            
        case "started":
            print("MedicationAssistant: Vision session started")
            
        case "stopped":
            print("MedicationAssistant: Vision session stopped")
            
        case "error":
            if let errorMsg = json["message"] as? String {
                print("MedicationAssistant: Vision error - \(errorMsg)")
            }
            
        default:
            break
        }
    }
    
    // MARK: - Voice (LiveKit) Methods
    
    private func connectVoice() async throws {
        connectionState = .connecting
        
        try configureAudioSession()
        
        do {
            let token = try generateAccessToken()
            let room = LiveKit.Room(delegate: self)
            liveKitRoom = room
            
            let connectOptions = ConnectOptions(
                autoSubscribe: true,
                enableMicrophone: true
            )
            
            print("MedicationAssistant: Connecting to LiveKit room")
            try await room.connect(url: liveKitUrl, token: token, connectOptions: connectOptions)
            
            // Start speech recognition for user transcript display
            try startTranscription()
            
            connectionState = .connected
            isVoiceConnected = true
            
            // Wait for agent
            for i in 1...10 {
                try await Task.sleep(nanoseconds: 1_000_000_000)
                if !room.agentParticipants.isEmpty {
                    print("MedicationAssistant: Agent connected after \(i)s")
                    break
                }
            }
            
            if room.agentParticipants.isEmpty {
                print("MedicationAssistant: Warning - no agent found")
            }
            
        } catch {
            connectionState = .error(error.localizedDescription)
            throw MedicationAssistantError.connectionFailed
        }
    }
    
    private func disconnectVoice() async {
        stopTranscription()
        
        await liveKitRoom?.disconnect()
        liveKitRoom = nil
        currentRoomName = nil
        
        connectionState = .disconnected
        isVoiceConnected = false
        
        print("MedicationAssistant: Voice disconnected")
    }
    
    private func configureAudioSession() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
    }
    
    // MARK: - Speech Recognition
    
    private func startTranscription() throws {
        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            throw MedicationAssistantError.speechRecognitionNotAvailable
        }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }
        
        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            if let result = result {
                Task { @MainActor in
                    self.userTranscript = result.bestTranscription.formattedString
                }
            }
            
            if error != nil {
                Task { @MainActor in
                    self.stopTranscription()
                }
            }
        }
        
        audioEngine.prepare()
        try audioEngine.start()
    }
    
    private func stopTranscription() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionTask?.cancel()
        recognitionTask = nil
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
    }
    
    // MARK: - Token Generation
    
    private func generateAccessToken() throws -> String {
        currentRoomName = "medication-assistant-\(UUID().uuidString.prefix(8))"
        guard let roomName = currentRoomName else {
            throw MedicationAssistantError.tokenGenerationFailed
        }
        
        let identity = "user-\(UUID().uuidString.prefix(8))"
        
        // JWT Header
        let header: [String: Any] = ["alg": "HS256", "typ": "JWT"]
        
        // JWT Claims with medication context in metadata
        let now = Date()
        let exp = now.addingTimeInterval(3600)
        
        let claims: [String: Any] = [
            "iss": liveKitApiKey,
            "sub": identity,
            "iat": Int(now.timeIntervalSince1970),
            "exp": Int(exp.timeIntervalSince1970),
            "nbf": Int(now.timeIntervalSince1970),
            "jti": UUID().uuidString,
            "video": [
                "roomJoin": true,
                "room": roomName,
                "canPublish": true,
                "canSubscribe": true,
                "canPublishData": true
            ],
            "name": "Medication User",
            "metadata": """
            {"type":"medication_assistant","context":"\(medicationContext.prefix(500))"}
            """,
            "roomConfig": [
                "agents": [
                    ["agentName": agentName]
                ]
            ]
        ]
        
        let headerData = try JSONSerialization.data(withJSONObject: header)
        let claimsData = try JSONSerialization.data(withJSONObject: claims)
        
        let headerBase64 = headerData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        let claimsBase64 = claimsData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        let signatureInput = "\(headerBase64).\(claimsBase64)"
        
        guard let keyData = liveKitApiSecret.data(using: .utf8),
              let inputData = signatureInput.data(using: .utf8) else {
            throw MedicationAssistantError.tokenGenerationFailed
        }
        
        var hmac = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        inputData.withUnsafeBytes { inputBytes in
            keyData.withUnsafeBytes { keyBytes in
                CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256),
                       keyBytes.baseAddress, keyData.count,
                       inputBytes.baseAddress, inputData.count,
                       &hmac)
            }
        }
        
        let signatureData = Data(hmac)
        let signatureBase64 = signatureData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        return "\(headerBase64).\(claimsBase64).\(signatureBase64)"
    }
    
    // MARK: - Permission Helpers
    
    private func requestSpeechAuthorizationIfNeeded() async -> Bool {
        let status = SFSpeechRecognizer.authorizationStatus()
        
        if status == .authorized {
            return true
        }
        
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }
    
    private func requestMicrophonePermissionIfNeeded() async -> Bool {
        let status = AVAudioSession.sharedInstance().recordPermission
        
        if status == .granted {
            return true
        }
        
        return await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }
}

// MARK: - LiveKit Room Delegate

extension MedicationAssistantService: RoomDelegate {
    nonisolated func room(_ room: Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String) {
        guard let message = String(data: data, encoding: .utf8) else { return }
        
        Task { @MainActor in
            // Agent responses come through data channel
            if participant?.kind == .agent {
                self.agentResponse = message
            }
        }
    }
    
    nonisolated func room(_ room: Room, participant: Participant, trackPublication: TrackPublication, didUpdateIsMuted isMuted: Bool) {
        // Handle mute state changes
    }
    
    nonisolated func room(_ room: Room, didDisconnectWithError error: (any Error)?) {
        Task { @MainActor in
            self.connectionState = .disconnected
            self.isVoiceConnected = false
            if let error = error {
                self.errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Errors

enum MedicationAssistantError: LocalizedError {
    case speechRecognitionNotAuthorized
    case speechRecognitionNotAvailable
    case microphonePermissionDenied
    case connectionFailed
    case tokenGenerationFailed
    
    var errorDescription: String? {
        switch self {
        case .speechRecognitionNotAuthorized:
            return "Speech recognition not authorized"
        case .speechRecognitionNotAvailable:
            return "Speech recognition not available"
        case .microphonePermissionDenied:
            return "Microphone permission denied"
        case .connectionFailed:
            return "Failed to connect to voice service"
        case .tokenGenerationFailed:
            return "Failed to generate access token"
        }
    }
}
