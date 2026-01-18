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
    @Published var visionStatus: String = "Idle"
    
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

    var isConnecting: Bool {
        if case .connecting = connectionState { return true }
        return false
    }
    
    // MARK: - LiveKit Configuration
    private let liveKitUrl: String = "wss://nexhacks-voice-agent-cijvwvbe.livekit.cloud"
    private let liveKitApiKey: String = "APIXngdedEtCPKf"
    private let liveKitApiSecret: String = "mgJhaxW6LkifWzvjdp9WLrOx1QSg7SdDYdD87aNXcZH"
    // Deployed agent for medication assistant
    private let agentName: String = "medication-assistant"
    
    // MARK: - Vision WebSocket Configuration
    private var visionWebSocket: URLSessionWebSocketTask?
    private var visionURLSession: URLSession!
    private var visionWSURL: URL {
        #if targetEnvironment(simulator)
        return URL(string: "ws://localhost:3001/ws/medication")!
        #else
        // Update to your computer's local IP for physical device
        return URL(string: "ws://10.0.0.70:3001/ws/medication")!
        #endif
    }
    
    var visionEndpointDescription: String {
        visionWSURL.absoluteString
    }
    
    // MARK: - Private Properties
    private var liveKitRoom: LiveKit.Room?
    private var currentRoomName: String?
    private var medicationContext: String = ""
    private var isStarting: Bool = false
    private var agentParticipant: RemoteParticipant?
    private var hasRequestedIntro: Bool = false
    private var lastVisionSent: String = ""
    private var lastVisionSentAt: Date = .distantPast
    private let visionUpdateCooldown: TimeInterval = 10.0
    private var isAgentResponding: Bool = false
    private var lastAgentActivityAt: Date = .distantPast
    private var lastUserFinalUtteranceSentAt: Date = .distantPast
    private var lastUserFinalUtteranceSent: String = ""
    private let userUtteranceCooldown: TimeInterval = 3.0
    
    // Speech recognition for user transcription
    private let speechRecognizer: SFSpeechRecognizer? = SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var committedTranscript: String = ""
    private var isTranscribing: Bool = false
    private var isStoppingTranscription: Bool = false
    private var isRestartingTranscription: Bool = false
    
    // MARK: - Initialization
    override init() {
        super.init()
        visionURLSession = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
    }
    
    // MARK: - Public Methods
    
    /// Start the medication assistant with given medication context
    func start(medicationContext: String) async throws {
        if isStarting || isVoiceConnected || isVisionConnected {
            return
        }
        isStarting = true
        defer { isStarting = false }

        self.medicationContext = medicationContext
        errorMessage = nil
        agentResponse = ""
        userTranscript = ""
        hasRequestedIntro = false
        agentParticipant = nil
        lastVisionSent = ""
        lastVisionSentAt = .distantPast
        
        // Request permissions
        let speechAuthorized = await requestSpeechAuthorizationIfNeeded()
        if !speechAuthorized {
            errorMessage = "Speech recognition not authorized. Voice transcript will be unavailable."
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
        hasRequestedIntro = false
        agentParticipant = nil
        lastVisionSent = ""
        lastVisionSentAt = .distantPast
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
        // Intentionally no-op: we do NOT push vision updates automatically.
        // We only send vision context when the user asks (see speech recognition final utterances).
    }

    func sendMessage(_ message: String) async throws {
        guard let room = liveKitRoom else {
            throw MedicationAssistantError.roomNotInitialized
        }

        // Use LiveKit text stream convention so Agents + SDK tooling can route messages.
        try await room.localParticipant.sendText(message, for: "lk.chat")
    }

    private func markAgentActivity() {
        lastAgentActivityAt = Date()
        isAgentResponding = true

        // Clear "responding" after a short idle period
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            let now = Date()
            if now.timeIntervalSince(self.lastAgentActivityAt) >= 2.0 {
                self.isAgentResponding = false
            }
        }
    }

    private func agentSeemsToNeedVision(_ text: String) -> Bool {
        let t = text.lowercased()
        if t.contains("don't have an image") { return true }
        if t.contains("do not have an image") { return true }
        if t.contains("no image") { return true }
        if t.contains("no photo") { return true }
        if t.contains("no picture") { return true }
        if t.contains("can't see") { return true }
        if t.contains("cannot see") { return true }
        if t.contains("don't see") { return true }
        if t.contains("do not see") { return true }
        if t.contains("no description") { return true }
        if t.contains("don't have a description") { return true }
        if t.contains("do not have a description") { return true }
        return false
    }

    private func currentVisionDescriptionForAgent() -> String? {
        let vision = visionDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !vision.isEmpty else { return nil }

        let lower = vision.lowercased()
        if lower.contains("connecting to vision") { return nil }
        if lower.contains("analyzing what the camera sees") { return nil }
        if lower.contains("analyzing camera") { return nil }
        if lower.contains("waiting for camera input") { return nil }
        if lower.contains("vision connection error") { return nil }
        if lower.contains("vision handshake failed") { return nil }

        return vision
    }

    private func sendVisionContextNow(trigger: String) async {
        guard isVoiceConnected else { return }
        guard let room = liveKitRoom else { return }

        let vision = currentVisionDescriptionForAgent()
        guard let vision else { return }

        let now = Date()
        if vision == lastVisionSent && now.timeIntervalSince(lastVisionSentAt) < visionUpdateCooldown {
            return
        }

        lastVisionSent = vision
        lastVisionSentAt = now

        let meds = medicationContext.trimmingCharacters(in: .whitespacesAndNewlines)
        let medsText = meds.isEmpty ? "No active medications on file." : meds

        let message = """
        [VISION UPDATE]
        Trigger: \(trigger)
        Camera view:
        \(vision)

        User's medication plan:
        \(medsText)

        Context update only. Do not claim you have no image/description if you can read this.
        """

        do {
            try await room.localParticipant.sendText(message, for: "lk.chat")
        } catch {
            print("MedicationAssistant: Failed to send vision context - \(error)")
        }
    }

    private func maybeSendVisionContextForUserUtterance(_ utterance: String) async {
        guard isVoiceConnected else { return }

        let trimmed = utterance.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let now = Date()
        if now.timeIntervalSince(lastUserFinalUtteranceSentAt) < userUtteranceCooldown { return }
        if trimmed == lastUserFinalUtteranceSent { return }

        let vision = visionDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !vision.isEmpty else { return }

        lastUserFinalUtteranceSentAt = now
        lastUserFinalUtteranceSent = trimmed
        lastVisionSent = vision
        lastVisionSentAt = now

        let meds = medicationContext.trimmingCharacters(in: .whitespacesAndNewlines)
        let medsText = meds.isEmpty ? "No active medications on file." : meds

        let contextMessage = """
        [VISION UPDATE]
        Camera view:
        \(vision)

        User just asked (transcribed on-device):
        "\(trimmed)"

        User's medication plan:
        \(medsText)
        """

        await sendContextMessageSafely(contextMessage)
    }

    private func sendContextMessageSafely(_ message: String) async {
        do {
            print("MedicationAssistant: Sending context to agent \(message.prefix(120))")
            try await sendMessage(message)
        } catch {
            print("MedicationAssistant: Failed to send context message - \(error)")
        }
    }

    private func sendVisionStartMessage() async {
        let startMessage: [String: Any] = [
            "type": "start",
            "medicationContext": medicationContext
        ]
        visionStatus = "Start sent"
        print("MedicationAssistant: Vision start sent to \(visionEndpointDescription)")
        await sendVisionJSON(startMessage)
    }
    
    // MARK: - Vision WebSocket Methods
    
    private func connectVision() async {
        guard visionWebSocket == nil else { return }
        
        visionDescription = "Connecting to vision..."
        visionStatus = "Connecting..."
        visionWebSocket = visionURLSession.webSocketTask(with: visionWSURL)
        visionWebSocket?.resume()
        isAnalyzing = false
        print("MedicationAssistant: Vision connecting...")
    }
    
    private func disconnectVision() async {
        isAnalyzing = false
        visionStatus = "Stopped"
        
        // Send stop message
        let stopMessage: [String: Any] = ["type": "stop"]
        await sendVisionJSON(stopMessage)
        
        visionWebSocket?.cancel(with: .normalClosure, reason: nil)
        visionWebSocket = nil
        isVisionConnected = false
        
        print("MedicationAssistant: Vision disconnected")
    }
    
    private func sendVisionJSON(_ dict: [String: Any]) async {
        guard visionWebSocket != nil else { return }
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        
        do {
            print("MedicationAssistant: Vision WS send \(string.prefix(120))")
            try await visionWebSocket?.send(.string(string))
        } catch {
            print("MedicationAssistant: Vision send error - \(error)")
            errorMessage = "Vision send error: \(error.localizedDescription)"
            visionStatus = "Send error"
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
                    self.isAnalyzing = false
                    self.visionDescription = "Vision connection error. Is the overshoot-service running?"
                    self.errorMessage = "Vision error: \(error.localizedDescription)"
                    self.visionStatus = "Connection error"
                }
            }
        }
    }
    
    private func handleVisionMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            print("MedicationAssistant: Vision WS recv \(text.prefix(200))")
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            processVisionResult(json)
            
        case .data(let data):
            print("MedicationAssistant: Vision WS recv binary \(data.count) bytes")
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
                visionStatus = "Receiving"

                // Prime the agent with the first real vision description so it has context even
                // if on-device speech recognition is not enabled/authorized.
                if isVoiceConnected && lastVisionSent.isEmpty {
                    Task { @MainActor in
                        await self.sendVisionContextNow(trigger: "first_vision_result")
                    }
                }
            }
            
        case "started":
            print("MedicationAssistant: Vision session started")
            visionStatus = "Started"
            if visionDescription.isEmpty || visionDescription == "Connecting to vision..." {
                visionDescription = "Analyzing camera..."
            }
            
        case "stopped":
            print("MedicationAssistant: Vision session stopped")
            
        case "error":
            if let errorMsg = json["message"] as? String {
                print("MedicationAssistant: Vision error - \(errorMsg)")
                errorMessage = "Vision error: \(errorMsg)"
                if visionDescription.isEmpty || visionDescription == "Analyzing camera..." {
                    visionDescription = "Vision error. Check overshoot-service logs."
                }
            }
            
        default:
            break
        }
    }
    
    // MARK: - Voice (LiveKit) Methods
    
    private func connectVoice() async throws {
        if isVoiceConnected || liveKitRoom != nil {
            return
        }
        if case .connecting = connectionState {
            return
        }

        connectionState = .connecting
        
        try configureAudioSessionForLiveKit()
        
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

            connectionState = .connected
            isVoiceConnected = true

            // Start speech recognition for user transcript display (optional)
            if SFSpeechRecognizer.authorizationStatus() == .authorized {
                do {
                    try startTranscriptionSession(resetTranscript: true)
                } catch {
                    errorMessage = "Transcription unavailable: \(error.localizedDescription)"
                }
            }
            
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
        stopTranscriptionSession()
        
        await liveKitRoom?.disconnect()
        liveKitRoom = nil
        currentRoomName = nil
        
        connectionState = .disconnected
        isVoiceConnected = false
        
        print("MedicationAssistant: Voice disconnected")
    }
    
    private func configureAudioSessionForLiveKit() throws {
        // Keep playAndRecord while connected so agent audio isn't muted.
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .videoChat, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
    }

    private func configureAudioSessionForRecording() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func deactivateAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            // ignore
        }
    }

    // MARK: - Speech Recognition (User Transcript)

    private func startTranscriptionSession(resetTranscript: Bool) throws {
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            throw MedicationAssistantError.speechRecognitionNotAvailable
        }

        isTranscribing = true
        isStoppingTranscription = false

        if resetTranscript {
            userTranscript = ""
            committedTranscript = ""
        }

        stopRecognitionPipeline()

        // When connected to LiveKit we must keep playAndRecord so agent audio isn't muted.
        if liveKitRoom != nil {
            try configureAudioSessionForLiveKit()
        } else {
            try configureAudioSessionForRecording()
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            Task { @MainActor in
                if let error {
                    if self.isStoppingTranscription { return }
                    self.errorMessage = "Transcription error: \(error.localizedDescription)"
                    self.stopTranscriptionSession()
                    return
                }

                guard let result else { return }
                let segment = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)

                if result.isFinal {
                    self.committedTranscript = self.combineTranscript(self.committedTranscript, segment)
                    self.userTranscript = self.committedTranscript
                    Task { @MainActor in
                        await self.maybeSendVisionContextForUserUtterance(segment)
                    }
                    self.restartAfterFinalIfNeeded()
                } else {
                    self.userTranscript = self.combineTranscript(self.committedTranscript, segment)
                }
            }
        }
    }

    private func stopTranscriptionSession() {
        isTranscribing = false
        isStoppingTranscription = true
        stopRecognitionPipeline()

        // Do not deactivate the audio session while connected to LiveKit (agent audio can cut out).
        if liveKitRoom == nil {
            deactivateAudioSession()
        }

        isStoppingTranscription = false
    }

    private func restartAfterFinalIfNeeded() {
        guard isVoiceConnected, isTranscribing, !isRestartingTranscription else { return }
        isRestartingTranscription = true

        Task {
            try? await Task.sleep(nanoseconds: 150_000_000)
            guard self.isVoiceConnected, self.isTranscribing else {
                self.isRestartingTranscription = false
                return
            }
            do {
                try self.startTranscriptionSession(resetTranscript: false)
            } catch {
                self.errorMessage = "Transcription error: \(error.localizedDescription)"
                self.stopTranscriptionSession()
            }
            self.isRestartingTranscription = false
        }
    }

    private func combineTranscript(_ committed: String, _ current: String) -> String {
        let committedTrimmed = committed.trimmingCharacters(in: .whitespacesAndNewlines)
        let currentTrimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if committedTrimmed.isEmpty { return currentTrimmed }
        if currentTrimmed.isEmpty { return committedTrimmed }
        return committedTrimmed + " " + currentTrimmed
    }

    private func stopRecognitionPipeline() {
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)

        recognitionTask?.cancel()
        recognitionTask = nil

        recognitionRequest?.endAudio()
        recognitionRequest = nil
    }
    
    // MARK: - Token Generation
    
    private func generateAccessToken() throws -> String {
        let identity = "ios-user-\(UUID().uuidString)"
        let roomNameSuffix = String(UUID().uuidString.prefix(8))
        let roomName = "medication-assistant-\(roomNameSuffix)"
        currentRoomName = roomName

        let now = Int(Date().timeIntervalSince1970)
        let exp = now + 3600

        let header: [String: Any] = [
            "alg": "HS256",
            "typ": "JWT"
        ]

        // Agent dispatch config (same pattern as LiveKitService to ensure dispatch works)
        let greetingMetadata = "{\"greeting\": \"Hi! I can help with your medications. What do you need help with?\"}"

        let roomConfigSnakeCase: [String: Any] = [
            "agents": [
                [
                    "agent_name": agentName,
                    "metadata": greetingMetadata
                ]
            ]
        ]

        let roomConfigCamelCase: [String: Any] = [
            "agents": [
                [
                    "agentName": agentName,
                    "metadata": greetingMetadata
                ]
            ]
        ]

        let claims: [String: Any] = [
            "iss": liveKitApiKey,
            "sub": identity,
            "iat": now,
            "exp": exp,
            "video": [
                "room": roomName,
                "roomJoin": true,
                "canPublish": true,
                "canSubscribe": true
            ],
            "room_config": roomConfigSnakeCase,
            "roomConfig": roomConfigCamelCase
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
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            return true
        case .denied, .restricted:
            return false
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                SFSpeechRecognizer.requestAuthorization { status in
                    continuation.resume(returning: status == .authorized)
                }
            }
        @unknown default:
            return false
        }
    }
    
    private func requestMicrophonePermissionIfNeeded() async -> Bool {
        let session = AVAudioSession.sharedInstance()
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted:
                return true
            case .denied:
                return false
            case .undetermined:
                return await AVAudioApplication.requestRecordPermission()
            @unknown default:
                return false
            }
        } else {
            switch session.recordPermission {
            case .granted:
                return true
            case .denied:
                return false
            case .undetermined:
                return await withCheckedContinuation { continuation in
                    session.requestRecordPermission { granted in
                        continuation.resume(returning: granted)
                    }
                }
            @unknown default:
                return false
            }
        }
    }
}

// MARK: - LiveKit Room Delegate

extension MedicationAssistantService: RoomDelegate {
    nonisolated func roomDidConnect(_ room: LiveKit.Room) {
        Task { @MainActor in
            self.connectionState = .connected
            self.isVoiceConnected = true
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participantDidConnect participant: RemoteParticipant) {
        Task { @MainActor in
            let identityStr = participant.identity?.stringValue ?? "unknown"
            let nameStr = participant.name ?? "nil"
            print("MedicationAssistant: Participant connected - identity: \(identityStr), name: \(nameStr), isAgent: \(participant.isAgent)")

            if participant.isAgent {
                self.agentParticipant = participant
                print("MedicationAssistant: Agent participant connected")

                if !self.hasRequestedIntro {
                    self.hasRequestedIntro = true

                    // Give agent a moment to initialize, then send context + greeting
                    try? await Task.sleep(nanoseconds: 1_500_000_000)

                    let meds = self.medicationContext.trimmingCharacters(in: .whitespacesAndNewlines)
                    let vision = self.visionDescription.trimmingCharacters(in: .whitespacesAndNewlines)

                    var intro = "You are a medication assistant. Use the user's medication plan below to answer questions. "
                    intro += "You will receive camera descriptions tagged [VISION UPDATE] when available. "
                    intro += "Greet the user and ask what medication they need help with.\n\n"
                    intro += "[USER'S MEDICATION PLAN]\n"
                    intro += meds.isEmpty ? "No active medications on file.\n" : "\(meds)\n"

                    if !vision.isEmpty {
                        intro += "\n[CURRENT CAMERA VIEW]\n\(vision)\n"
                    }

                    do {
                        try await self.sendMessage(intro)
                    } catch {
                        print("MedicationAssistant: Failed to send intro - \(error)")
                    }
                }
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: RemoteParticipant, didPublishTrack publication: RemoteTrackPublication) {
        Task { @MainActor in
            // Auto-subscribe to agent audio tracks (reliability)
            if participant.isAgent && publication.kind == .audio {
                do {
                    try await publication.set(subscribed: true)
                } catch {
                    print("MedicationAssistant: Failed to subscribe to agent audio: \(error)")
                }
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String, encryptionType: EncryptionType) {
        Task { @MainActor in
            if topic == "lk.chat" || topic.isEmpty {
                if let message = String(data: data, encoding: .utf8) {
                    self.agentResponse = message
                    self.markAgentActivity()

                    if self.agentSeemsToNeedVision(message) {
                        await self.sendVisionContextNow(trigger: "agent_requested_vision")
                    }
                }
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, didDisconnectWithError error: (any Error)?) {
        Task { @MainActor in
            self.connectionState = .disconnected
            self.isVoiceConnected = false
            self.agentParticipant = nil
            self.stopTranscriptionSession()
            if let error = error {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: Participant, trackPublication: TrackPublication, didReceiveTranscriptionSegments segments: [TranscriptionSegment]) {
        Task { @MainActor in
            for segment in segments {
                if segment.isFinal && !segment.text.isEmpty, participant.isAgent {
                    self.agentResponse = segment.text
                    self.markAgentActivity()

                    if self.agentSeemsToNeedVision(segment.text) {
                        await self.sendVisionContextNow(trigger: "agent_requested_vision_transcription")
                    }
                }
            }
        }
    }
}

// MARK: - Vision WebSocket Delegate

extension MedicationAssistantService: URLSessionWebSocketDelegate {
    nonisolated func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let error else { return }
        Task { @MainActor in
            self.isVisionConnected = false
            self.isAnalyzing = false
            self.visionStatus = "Handshake failed"
            self.errorMessage = "Vision task error: \(error.localizedDescription)"
            self.visionDescription = "Vision handshake failed. Check overshoot-service is reachable at \(self.visionEndpointDescription)."
            print("MedicationAssistant: Vision task error - \(error)")
        }
    }

    nonisolated func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        Task { @MainActor in
            self.isVisionConnected = true
            self.isAnalyzing = true
            self.visionStatus = "Connected"
            if self.visionDescription.isEmpty || self.visionDescription == "Connecting to vision..." {
                self.visionDescription = "Analyzing what the camera sees..."
            }
            self.receiveVisionMessages()
            await self.sendVisionStartMessage()
            print("MedicationAssistant: Vision websocket opened")
        }
    }

    nonisolated func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        Task { @MainActor in
            self.isVisionConnected = false
            self.isAnalyzing = false
            self.visionStatus = "Closed"
            self.visionWebSocket = nil
            let reasonText = reason.flatMap { String(data: $0, encoding: .utf8) } ?? "unknown"
            self.errorMessage = "Vision socket closed: \(closeCode.rawValue) (\(reasonText))"
            print("MedicationAssistant: Vision websocket closed - \(closeCode.rawValue) \(reasonText)")
        }
    }
}

// MARK: - Errors

enum MedicationAssistantError: LocalizedError {
    case roomNotInitialized
    case speechRecognitionNotAuthorized
    case speechRecognitionNotAvailable
    case microphonePermissionDenied
    case connectionFailed
    case tokenGenerationFailed
    
    var errorDescription: String? {
        switch self {
        case .roomNotInitialized:
            return "Voice room not initialized"
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
