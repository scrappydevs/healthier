//
//  JournalViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Journal feature with LiveKit integration
//

import Foundation
import Combine

@MainActor
class JournalViewModel: ObservableObject {
    @Published var entries: [JournalEntry] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    @Published var recordingState: RecordingState = .idle
    @Published var currentTranscript: String = ""
    @Published var agentMessage: String = ""
    @Published var connectionStatus: String = "Disconnected"
    
    enum RecordingState: Equatable {
        case idle
        case connecting
        case listening
        case processing
        case error(String)
    }

    private let journalRepository: JournalRepository
    private let liveKitService: LiveKitService
    private var cancellables = Set<AnyCancellable>()
    private(set) var currentEntryStartTime: Date?

    init(
        journalRepository: JournalRepository,
        liveKitService: LiveKitService
    ) {
        self.journalRepository = journalRepository
        self.liveKitService = liveKitService
        
        setupBindings()
        loadEntries()
    }

    private func setupBindings() {
        journalRepository.$entries
            .receive(on: DispatchQueue.main)
            .assign(to: &$entries)

        liveKitService.$connectionState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateConnectionStatus(state)
            }
            .store(in: &cancellables)

        liveKitService.$transcript
            .receive(on: DispatchQueue.main)
            .assign(to: &$currentTranscript)

        liveKitService.$agentMessage
            .receive(on: DispatchQueue.main)
            .assign(to: &$agentMessage)
    }

    func loadEntries() {
        entries = journalRepository.getAll()
    }

    func startRecording() async {
        recordingState = .connecting
        connectionStatus = "Connecting..."
        currentTranscript = ""
        agentMessage = ""
        currentEntryStartTime = Date()

        do {
            try await liveKitService.connect()
            recordingState = .listening
            connectionStatus = "Connected"
        } catch {
            recordingState = .error(error.localizedDescription)
            connectionStatus = "Connection failed"
            errorMessage = error.localizedDescription
        }
    }

    func stopRecording() async {
        recordingState = .processing
        connectionStatus = "Saving..."

        let duration = currentEntryStartTime.map { Date().timeIntervalSince($0) }
        
        await liveKitService.disableMicrophone()
        
        if !currentTranscript.isEmpty {
            let entry = JournalEntry(
                transcript: currentTranscript,
                date: currentEntryStartTime ?? Date(),
                duration: duration,
                tags: []
            )

            do {
                try await journalRepository.create(entry)
                loadEntries()
            } catch {
                errorMessage = "Failed to save journal entry: \(error.localizedDescription)"
            }
        }

        await liveKitService.disconnect()
        
        currentTranscript = ""
        agentMessage = ""
        recordingState = .idle
        connectionStatus = "Disconnected"
        currentEntryStartTime = nil
    }

    func askQuestion(_ question: String) async {
        guard liveKitService.isConnected else { return }

        do {
            // Get context from journal history
            let contextEntries = try await journalRepository.getContextForQuestion(question)
            
            var message = question
            if !contextEntries.isEmpty {
                var contextText = "\n\nContext from past journal entries:\n"
                for entry in contextEntries.prefix(3) {
                    let formatter = DateFormatter()
                    formatter.dateStyle = .medium
                    contextText += "\(formatter.string(from: entry.date)): \(entry.transcript.prefix(200))\n"
                }
                message = question + contextText
            }

            try await liveKitService.sendMessage(message)
        } catch {
            errorMessage = "Failed to send question: \(error.localizedDescription)"
        }
    }

    func deleteEntry(_ entry: JournalEntry) {
        do {
            try journalRepository.delete(entry)
            loadEntries()
        } catch {
            errorMessage = "Failed to delete entry: \(error.localizedDescription)"
        }
    }

    func updateEntry(_ entry: JournalEntry) {
        do {
            try journalRepository.update(entry)
            loadEntries()
        } catch {
            errorMessage = "Failed to update entry: \(error.localizedDescription)"
        }
    }

    func searchEntries(query: String) {
        if query.isEmpty {
            entries = journalRepository.getAll()
        } else {
            entries = journalRepository.search(query: query)
        }
    }

    func syncFromSupabase() async {
        isLoading = true
        do {
            try await journalRepository.syncFromSupabase()
            loadEntries()
        } catch {
            errorMessage = "Failed to sync: \(error.localizedDescription)"
        }
        isLoading = false
    }

    private func updateConnectionStatus(_ state: LiveKitService.ConnectionState) {
        switch state {
        case .disconnected:
            connectionStatus = "Disconnected"
            if case .listening = recordingState {
                recordingState = .idle
            }
        case .connecting:
            connectionStatus = "Connecting..."
        case .connected:
            connectionStatus = "Connected"
        case .error(let message):
            connectionStatus = "Error: \(message)"
            recordingState = .error(message)
        }
    }
}

