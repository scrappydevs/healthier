//
//  ExerciseAnalysisService.swift
//  nexhacks-ios
//
//  Real-time exercise analysis using Overshoot via WebSocket
//  Provides voice feedback for form correction and rep counting
//

import Foundation
import AVFoundation
import Combine

@MainActor
class ExerciseAnalysisService: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var isConnected = false
    @Published var isAnalyzing = false
    @Published var currentExerciseType: String?
    @Published var repCount: Int = 0
    @Published var lastFeedback: String = ""
    @Published var formScore: Int = 7
    @Published var safetyAlert: String?
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession!
    private let speechSynthesizer = AVSpeechSynthesizer()
    private var lastSpokenFeedback: String = ""
    private var lastSpokenTime: Date = .distantPast
    private let feedbackCooldown: TimeInterval = 3.0 // Min seconds between voice feedback
    
    // WebSocket URL - Production backend on Render
    private var wsURL: URL {
        // Production backend on Render (secure websocket)
        return URL(string: "wss://healthier-overshoot-service.onrender.com/ws/exercise")!
    }
    
    // MARK: - Initialization
    override init() {
        super.init()
        urlSession = URLSession(configuration: .default, delegate: nil, delegateQueue: .main)
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to setup audio session: \(error)")
        }
    }
    
    // MARK: - Connection Management
    
    func connect() async {
        guard webSocket == nil else { return }
        
        webSocket = urlSession.webSocketTask(with: wsURL)
        webSocket?.resume()
        
        isConnected = true
        receiveMessages()
        
        print("ExerciseAnalysis: Connected to WebSocket")
    }
    
    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
        isAnalyzing = false
        print("ExerciseAnalysis: Disconnected")
    }
    
    // MARK: - Session Management
    
    func startSession(exerciseType: String? = nil) async {
        if !isConnected {
            await connect()
        }
        
        repCount = 0
        lastFeedback = ""
        formScore = 7
        safetyAlert = nil
        currentExerciseType = exerciseType
        frameSentCount = 0
        isAnalyzing = true
        
        print("ExerciseAnalysis: Session started, isAnalyzing=\(isAnalyzing)")
        
        let message: [String: Any] = [
            "type": "start",
            "exerciseType": exerciseType as Any
        ]
        
        await sendJSON(message)
        
        // Announce start
        speak("Starting exercise analysis. " + (exerciseType ?? "I'll identify your exercise."))
    }
    
    func stopSession() async {
        isAnalyzing = false
        
        let message: [String: Any] = ["type": "stop"]
        await sendJSON(message)
        
        // Announce summary
        if repCount > 0 {
            speak("Great workout! You completed \(repCount) reps.")
        } else {
            speak("Exercise session ended.")
        }
    }
    
    // MARK: - Frame Analysis
    
    private var frameSentCount = 0
    
    func analyzeFrame(_ imageData: Data) async {
        guard isConnected && isAnalyzing else {
            print("ExerciseAnalysis: Skipping frame - connected:\(isConnected) analyzing:\(isAnalyzing)")
            return
        }
        
        let base64Frame = imageData.base64EncodedString()
        
        let message: [String: Any] = [
            "type": "frame",
            "frame": base64Frame
        ]
        
        frameSentCount += 1
        if frameSentCount % 10 == 0 {
            print("ExerciseAnalysis: Sent \(frameSentCount) frames (\(imageData.count) bytes)")
        }
        
        await sendJSON(message)
    }
    
    // MARK: - WebSocket Communication
    
    private func sendJSON(_ dict: [String: Any]) async {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let string = String(data: data, encoding: .utf8) else {
            print("ExerciseAnalysis: Failed to serialize JSON")
            return
        }
        
        guard webSocket != nil else {
            print("ExerciseAnalysis: WebSocket is nil, cannot send")
            return
        }
        
        do {
            try await webSocket?.send(.string(string))
        } catch {
            print("ExerciseAnalysis: Send error - \(error)")
            errorMessage = "Connection error: \(error.localizedDescription)"
        }
    }
    
    private func receiveMessages() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                Task { @MainActor in
                    self.handleMessage(message)
                    self.receiveMessages() // Continue receiving
                }
                
            case .failure(let error):
                print("ExerciseAnalysis: Receive error - \(error)")
                Task { @MainActor in
                    self.isConnected = false
                    self.errorMessage = "Connection lost: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            
            processAnalysisResult(json)
            
        case .data(let data):
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return
            }
            processAnalysisResult(json)
            
        @unknown default:
            break
        }
    }
    
    private func processAnalysisResult(_ json: [String: Any]) {
        guard let type = json["type"] as? String else { return }
        
        switch type {
        case "analysis":
            if let exercise = json["exerciseType"] as? String {
                if currentExerciseType == nil && !exercise.isEmpty {
                    currentExerciseType = exercise
                    speak("Detected: \(exercise)")
                }
            }
            
            if let reps = json["repCount"] as? Int, reps > repCount {
                repCount = reps
                // Quick rep acknowledgment
                if reps % 5 == 0 {
                    speak("\(reps) reps!")
                }
            }
            
            if let feedback = json["feedback"] as? String {
                lastFeedback = feedback
            }
            
            if let score = json["formScore"] as? Int {
                formScore = score
            }
            
            if let alert = json["safetyAlert"] as? String, !alert.isEmpty {
                safetyAlert = alert
                speak("Warning: \(alert)", priority: .high)
            }
            
            // Speak feedback if flagged and cooldown passed
            if let shouldSpeak = json["shouldSpeak"] as? Bool,
               shouldSpeak,
               let feedback = json["feedback"] as? String,
               !feedback.isEmpty {
                speakFeedbackIfNeeded(feedback)
            }
            
        case "summary":
            if let totalReps = json["totalReps"] as? Int {
                repCount = totalReps
            }
            
        case "error":
            if let errorMsg = json["message"] as? String {
                errorMessage = errorMsg
            }
            
        default:
            break
        }
    }
    
    // MARK: - Voice Feedback
    
    enum SpeechPriority {
        case normal
        case high
    }
    
    private func speakFeedbackIfNeeded(_ feedback: String) {
        let now = Date()
        
        // Check cooldown and avoid repeating
        guard now.timeIntervalSince(lastSpokenTime) >= feedbackCooldown,
              feedback != lastSpokenFeedback else {
            return
        }
        
        speak(feedback)
        lastSpokenFeedback = feedback
        lastSpokenTime = now
    }
    
    private func speak(_ text: String, priority: SpeechPriority = .normal) {
        // Stop current speech for high priority
        if priority == .high && speechSynthesizer.isSpeaking {
            speechSynthesizer.stopSpeaking(at: .immediate)
        }
        
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 1.1 // Slightly faster
        utterance.pitchMultiplier = 1.0
        utterance.volume = 0.9
        
        speechSynthesizer.speak(utterance)
    }
    
    func stopSpeaking() {
        speechSynthesizer.stopSpeaking(at: .immediate)
    }
}
