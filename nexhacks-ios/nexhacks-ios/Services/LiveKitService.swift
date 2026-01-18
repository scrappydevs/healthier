//
//  LiveKitService.swift
//  nexhacks-ios
//
//  Service for voice journaling with LiveKit agent integration.
//  Connects to LiveKit room, enables agent audio playback, and transcribes user speech.
//

import Foundation
import Combine
import AVFoundation
import Speech
import LiveKit
import CommonCrypto

@MainActor
class LiveKitService: NSObject, ObservableObject {
    @Published var connectionState: ConnectionState = .disconnected
    @Published var isConnected: Bool = false
    @Published var transcript: String = ""
    @Published var agentMessage: String = ""
    @Published var errorMessage: String?

    enum ConnectionState {
        case disconnected
        case connecting
        case connected
        case error(String)
    }

    private let url: String = "wss://nexhacks-voice-agent-cijvwvbe.livekit.cloud"
    private let apiKey: String = "APIXngdedEtCPKf"
    private let apiSecret: String = "mgJhaxW6LkifWzvjdp9WLrOx1QSg7SdDYdD87aNXcZH"
    
    // Agent name - matches deployed LiveKit agent
    private let agentName: String = "voice-journal-agent"

    private var liveKitRoom: LiveKit.Room?
    private var currentRoomName: String?
    private var sessionStartTime: Date?
    private var hasReceivedGreeting: Bool = false
    private var hasRequestedGreeting: Bool = false
    private var agentParticipant: RemoteParticipant?

    // On-device Speech recognition for user transcription
    private let speechRecognizer: SFSpeechRecognizer? = SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var committedTranscript: String = ""
    private var isTranscribing: Bool = false
    private var isStopping: Bool = false
    private var isRestarting: Bool = false

    override init() {
        super.init()
    }

    func connect() async throws {
        connectionState = .connecting
        errorMessage = nil
        hasRequestedGreeting = false

        guard await requestSpeechAuthorizationIfNeeded() else {
            connectionState = .error(LiveKitError.speechRecognitionNotAuthorized.errorDescription ?? "Speech recognition not authorized")
            throw LiveKitError.speechRecognitionNotAuthorized
        }

        guard await requestMicrophonePermissionIfNeeded() else {
            connectionState = .error(LiveKitError.microphonePermissionDenied.errorDescription ?? "Microphone permission denied")
            throw LiveKitError.microphonePermissionDenied
        }

        // Configure audio session for both recording and playback
        try configureAudioSessionForLiveKit()

        // Connect to LiveKit room
        do {
            let token = try generateAccessToken()
            let room = LiveKit.Room(delegate: self)
            liveKitRoom = room

            let connectOptions = ConnectOptions(
                autoSubscribe: true,
                enableMicrophone: true
            )

            print("LiveKit: Connecting to room '\(currentRoomName ?? "unknown")' with agent: \(agentName)")
            try await room.connect(url: url, token: token, connectOptions: connectOptions)
            
            print("LiveKit: Room connected successfully")
            print("LiveKit: Room region: \(room.serverRegion ?? "unknown")")
            print("LiveKit: Remote participants: \(room.remoteParticipants.count)")
            print("LiveKit: All participants: \(room.allParticipants.count)")
            
            // Start transcription for user speech (for display only)
            try startTranscriptionSession(resetTranscript: true)
            
            connectionState = .connected
            isConnected = true
            sessionStartTime = Date()
            hasReceivedGreeting = false
            
            // Wait for agent to join (will be handled by participantDidConnect delegate)
            // Give it more time - agent dispatch can take 5-10 seconds
            print("LiveKit: Waiting for agent dispatch...")
            for i in 1...10 {
                try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                
                // Check if agent joined
                let agentParticipants = room.agentParticipants
                let allRemote = room.remoteParticipants
                
                print("LiveKit: [\(i)s] Remote participants: \(allRemote.count), Agent participants: \(agentParticipants.count)")
                
                if !agentParticipants.isEmpty {
                    for (identity, participant) in agentParticipants {
                        print("LiveKit: ✅ Found agent - identity: \(identity.stringValue), name: \(participant.name ?? "nil")")
                        agentParticipant = participant as? RemoteParticipant
                    }
                    break
                }
            }
            
            // Final check
            let agentParticipants = room.agentParticipants
            if agentParticipant == nil && agentParticipants.isEmpty {
                print("LiveKit: WARNING - No agent participant found after 10 seconds.")
                print("LiveKit: Agent name in token: '\(agentName)'")
                print("LiveKit: Room region: \(room.serverRegion ?? "unknown")")
                print("LiveKit: Possible issues:")
                print("  1. Agent name mismatch (check dashboard)")
                print("  2. Agent region mismatch (agent in us-east, room in US East B)")
                print("  3. Agent not configured for auto-dispatch")
                print("  4. Check agent logs: lk agent logs")
                errorMessage = "Agent '\(agentName)' not found. Check agent name and region match."
            }
        } catch {
            connectionState = .error(error.localizedDescription)
            errorMessage = error.localizedDescription
            throw LiveKitError.connectionFailed
        }
    }

    func disconnect() async {
        stopTranscriptionSession()
        
        await liveKitRoom?.disconnect()
        liveKitRoom = nil
        currentRoomName = nil

        connectionState = .disconnected
        isConnected = false
        transcript = ""
        agentMessage = ""
        sessionStartTime = nil
        hasReceivedGreeting = false
        
        deactivateAudioSession()
    }

    func enableMicrophone() async {
        guard let room = liveKitRoom, isConnected else { return }
        if isTranscribing { return }
        do {
            try await room.localParticipant.setMicrophone(enabled: true)
            try startTranscriptionSession(resetTranscript: false)
        } catch {
            errorMessage = error.localizedDescription
            connectionState = .error(error.localizedDescription)
        }
    }

    func disableMicrophone() async {
        guard let room = liveKitRoom else { return }
        do {
            try await room.localParticipant.setMicrophone(enabled: false)
        } catch {
            print("Failed to disable microphone: \(error)")
        }
        stopTranscriptionSession()
    }

    func getSessionDuration() -> TimeInterval? {
        guard let startTime = sessionStartTime else { return nil }
        return Date().timeIntervalSince(startTime)
    }

    func sendMessage(_ message: String) async throws {
        guard let room = liveKitRoom else {
            throw LiveKitError.roomNotInitialized
        }

        // Use LiveKit text stream convention so Agents + SDK tooling can route messages.
        // (This is what LiveKit's built-in agent Session uses by default.)
        try await room.localParticipant.sendText(message, for: "lk.chat")
    }

    // MARK: - Speech Recognition

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

    private func startTranscriptionSession(resetTranscript: Bool) throws {
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            throw LiveKitError.speechRecognizerUnavailable
        }

        isTranscribing = true
        isStopping = false

        if resetTranscript {
            transcript = ""
            committedTranscript = ""
        }

        stopRecognitionPipeline()
        // IMPORTANT:
        // When connected to LiveKit we must keep the audio session in playAndRecord,
        // otherwise remote agent audio will be muted.
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
                    if self.isStopping { return }
                    self.errorMessage = error.localizedDescription
                    self.connectionState = .error(error.localizedDescription)
                    self.stopTranscriptionSession()
                    return
                }

                guard let result else { return }

                let segment = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)

                if result.isFinal {
                    self.committedTranscript = self.combineTranscript(self.committedTranscript, segment)
                    self.transcript = self.committedTranscript
                    self.restartAfterFinalIfNeeded()
                } else {
                    self.transcript = self.combineTranscript(self.committedTranscript, segment)
                }
            }
        }
    }

    private func stopTranscriptionSession() {
        isTranscribing = false
        isStopping = true
        stopRecognitionPipeline()
        // Do not deactivate the audio session while connected to LiveKit,
        // otherwise agent audio playback can cut out.
        if liveKitRoom == nil {
            deactivateAudioSession()
        }
        isStopping = false
    }

    private func restartAfterFinalIfNeeded() {
        guard isConnected, isTranscribing, !isRestarting else { return }
        isRestarting = true

        Task {
            try? await Task.sleep(nanoseconds: 150_000_000)
            guard self.isConnected, self.isTranscribing else {
                self.isRestarting = false
                return
            }
            do {
                try self.startTranscriptionSession(resetTranscript: false)
            } catch {
                self.errorMessage = error.localizedDescription
                self.connectionState = .error(error.localizedDescription)
                self.stopTranscriptionSession()
            }
            self.isRestarting = false
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

    private func configureAudioSessionForLiveKit() throws {
        // LiveKit manages audio session, but we need playAndRecord for agent audio playback
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .videoChat, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try audioSession.setActive(true)
    }

    private func configureAudioSessionForRecording() throws {
        // Used only when LiveKit is not connected
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    }

    private func deactivateAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            // Ignore deactivation errors
        }
    }

    // MARK: - JWT Token Generation

    private func generateAccessToken() throws -> String {
        // Simple JWT generation for development
        // In production, this should be done server-side
        let identity = "ios-user-\(UUID().uuidString)"
        let roomNameSuffix = String(UUID().uuidString.prefix(8))
        let roomName = "voice-journal-\(roomNameSuffix)"
        currentRoomName = roomName
        
        // Create JWT claims
        let now = Int(Date().timeIntervalSince1970)
        let exp = now + 3600 // 1 hour expiry
        
        let header: [String: Any] = [
            "alg": "HS256",
            "typ": "JWT"
        ]
        
        // Agent dispatch config:
        // LiveKit token parsing may expect camelCase (roomConfig/agentName) in JWTs.
        // Keep snake_case (room_config/agent_name) as a compatibility fallback while debugging.
        let roomConfigSnakeCase: [String: Any] = [
            "agents": [
                [
                    "agent_name": agentName,
                    "metadata": "{\"greeting\": \"How was your day?\"}"
                ]
            ]
        ]

        let roomConfigCamelCase: [String: Any] = [
            "agents": [
                [
                    "agentName": agentName,
                    "metadata": "{\"greeting\": \"How was your day?\"}"
                ]
            ]
        ]
        
        let claims: [String: Any] = [
            "iss": apiKey,
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
        
        // Debug: Print token claims to verify agent dispatch
        if let claimsJson = try? JSONSerialization.data(withJSONObject: claims, options: .prettyPrinted),
           let claimsString = String(data: claimsJson, encoding: .utf8) {
            print("LiveKit: JWT Claims (for debugging):")
            print(claimsString)
            print("LiveKit: Agent name in room_config: \(agentName)")
        }
        
        // For production, use a proper JWT library
        // This is a simplified version for development
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
        
        let message = "\(headerBase64).\(claimsBase64)"
        
        // Sign with HMAC-SHA256
        let keyData = apiSecret.data(using: .utf8)!
        let messageData = message.data(using: .utf8)!
        
        var hmac = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA256), (keyData as NSData).bytes, keyData.count, (messageData as NSData).bytes, messageData.count, &hmac)
        
        let signature = Data(hmac).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        let token = "\(message).\(signature)"
        print("LiveKit: Token generated successfully (length: \(token.count))")
        
        return token
    }
}

// MARK: - RoomDelegate

extension LiveKitService: RoomDelegate {
    nonisolated func roomDidConnect(_ room: LiveKit.Room) {
        Task { @MainActor in
            connectionState = .connected
            isConnected = true
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participantDidConnect participant: RemoteParticipant) {
        Task { @MainActor in
            let identityStr = participant.identity?.stringValue ?? "unknown"
            let nameStr = participant.name ?? "nil"
            print("LiveKit: Participant connected - identity: \(identityStr), name: \(nameStr), isAgent: \(participant.isAgent)")
            
            if participant.isAgent {
                agentParticipant = participant
                print("LiveKit: ✅ Agent participant connected! identity: \(identityStr), name: \(nameStr)")
                
                // Wait a moment for agent to initialize, then send greeting instruction
                if !hasRequestedGreeting {
                    hasRequestedGreeting = true
                    print("LiveKit: Waiting for agent to initialize...")
                    try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                    print("LiveKit: Sending greeting request to agent...")
                    do {
                        try await sendMessage("Please greet the user by saying: \"How was your day?\"")
                        print("LiveKit: Greeting request sent successfully")
                    } catch {
                        print("LiveKit: Failed to send greeting request: \(error)")
                    }
                }
            } else {
                print("LiveKit: Non-agent participant connected: \(identityStr)")
            }
        }
    }
    
    nonisolated func room(_ room: LiveKit.Room, participantDidDisconnect participant: RemoteParticipant) {
        Task { @MainActor in
            if participant.isAgent {
                agentParticipant = nil
                print("Agent participant disconnected")
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, didUpdateConnectionState connectionState: ConnectionState, from oldConnectionState: ConnectionState) {
        Task { @MainActor in
            if case .disconnected = connectionState {
                self.connectionState = .disconnected
                self.isConnected = false
            } else if case .connected = connectionState {
                self.connectionState = .connected
                self.isConnected = true
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: RemoteParticipant, didPublishTrack publication: RemoteTrackPublication) {
        Task { @MainActor in
            print("LiveKit: Track published - participant: \(participant.identity?.stringValue ?? "unknown"), kind: \(publication.kind), source: \(publication.source)")
            
            // Auto-subscribe to agent audio tracks
            if participant.isAgent && publication.kind == .audio {
                print("LiveKit: Subscribing to agent audio track...")
                do {
                    try await publication.set(subscribed: true)
                    print("LiveKit: Successfully subscribed to agent audio")
                } catch {
                    print("LiveKit: Failed to subscribe to agent audio: \(error)")
                }
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String, encryptionType: EncryptionType) {
        Task { @MainActor in
            // Handle messages on lk.chat topic (standard agent communication)
            if topic == "lk.chat" || topic.isEmpty {
                if let message = String(data: data, encoding: .utf8) {
                    agentMessage = message
                    if message.lowercased().contains("how was your day") {
                        hasReceivedGreeting = true
                    }
                }
            }
        }
    }

    nonisolated func room(_ room: LiveKit.Room, participant: Participant, trackPublication: TrackPublication, didReceiveTranscriptionSegments segments: [TranscriptionSegment]) {
        Task { @MainActor in
            // Handle agent transcription
            for segment in segments {
                if segment.isFinal && !segment.text.isEmpty {
                    print("LiveKit: Agent transcription: \(segment.text)")
                    // Update agent message if this is from the agent
                    if participant.isAgent {
                        agentMessage = segment.text
                        if segment.text.lowercased().contains("how was your day") {
                            hasReceivedGreeting = true
                        }
                    }
                }
            }
        }
    }
}

enum LiveKitError: LocalizedError {
    case roomNotInitialized
    case connectionFailed
    case microphoneNotAvailable
    case microphonePermissionDenied
    case speechRecognitionNotAuthorized
    case speechRecognizerUnavailable

    var errorDescription: String? {
        switch self {
        case .roomNotInitialized:
            return "Room not initialized"
        case .connectionFailed:
            return "Failed to connect to LiveKit"
        case .microphoneNotAvailable:
            return "Microphone not available"
        case .microphonePermissionDenied:
            return "Microphone permission denied"
        case .speechRecognitionNotAuthorized:
            return "Speech recognition not authorized"
        case .speechRecognizerUnavailable:
            return "Speech recognizer is unavailable"
        }
    }
}
