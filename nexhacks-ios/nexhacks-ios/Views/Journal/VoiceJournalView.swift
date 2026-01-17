//
//  VoiceJournalView.swift
//  nexhacks-ios
//
//  Full-screen voice recording interface
//

import SwiftUI

struct VoiceJournalView: View {
    @ObservedObject var viewModel: JournalViewModel
    @Environment(\.dismiss) var dismiss
    @State private var waveformAmplitude: CGFloat = 0.5
    @State private var currentTime: Date = Date()
    @State private var conversationMessages: [ConversationMessage] = []
    @State private var currentUserMessage: String = ""
    @State private var isAIThinking: Bool = false

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: AppTheme.Spacing.lg) {
                // Close button
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.top, AppTheme.Spacing.sm)

                // Audio visualization
                waveformVisualization
                    .padding(.vertical, AppTheme.Spacing.md)

                // Conversation view
                conversationView
                    .frame(maxHeight: 500)

                Spacer()

                controlButtons
            }
            .padding(AppTheme.Spacing.md)
        }
        .onAppear {
            Task {
                await viewModel.startRecording()
            }
        }
        .onReceive(Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()) { _ in
            currentTime = Date()
        }
        .onChange(of: viewModel.currentTranscript) { oldValue, newValue in
            currentUserMessage = newValue
            if !newValue.isEmpty {
                updateUserMessage(newValue)
                // Show thinking indicator when user is speaking
                if newValue != oldValue && viewModel.agentMessage.isEmpty {
                    isAIThinking = true
                }
            }
        }
        .onChange(of: viewModel.agentMessage) { oldValue, newValue in
            if !newValue.isEmpty && newValue != oldValue {
                // Finalize current user message if exists
                if !currentUserMessage.isEmpty {
                    finalizeUserMessage()
                }
                isAIThinking = false
                addAIMessage(newValue)
            }
        }
        .onChange(of: viewModel.recordingState) { _, newState in
            if case .processing = newState {
                if !currentUserMessage.isEmpty {
                    finalizeUserMessage()
                }
                isAIThinking = true
            } else if case .listening = newState {
                if !viewModel.currentTranscript.isEmpty && viewModel.agentMessage.isEmpty {
                    isAIThinking = true
                }
            }
        }
    }
    


    private var waveformVisualization: some View {
        HStack(spacing: 3) {
            ForEach(0..<50, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.appPrimary, Color.appPrimary.opacity(0.6)]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 3)
                    .frame(height: waveformHeight(for: index))
            }
        }
        .frame(height: 80)
        .onReceive(Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()) { _ in
            if case .listening = viewModel.recordingState {
                waveformAmplitude = CGFloat.random(in: 0.4...1.0)
            } else {
                waveformAmplitude = 0.15
            }
        }
    }

    private func waveformHeight(for index: Int) -> CGFloat {
        let baseHeight: CGFloat = 8
        let time = Date().timeIntervalSince1970
        let frequency = Double(index) * 0.25
        let variation = sin(frequency + time * 3) * 0.5 + 0.5
        let height = baseHeight + (variation * waveformAmplitude * 50)
        return max(baseHeight, min(height, 80))
    }

    private var conversationView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: AppTheme.Spacing.md) {
                    if conversationMessages.isEmpty && viewModel.currentTranscript.isEmpty {
                        emptyConversationState
                    }
                    
                    ForEach(conversationMessages) { message in
                        ConversationBubble(message: message)
                            .id(message.id)
                    }
                    
                    // Current user message being transcribed (only show if not already in messages)
                    if !currentUserMessage.isEmpty && !conversationMessages.contains(where: { $0.isUser && $0.isTranscribing }) {
                        ConversationBubble(
                            message: ConversationMessage(
                                content: currentUserMessage,
                                isUser: true,
                                timestamp: Date(),
                                isTranscribing: true
                            )
                        )
                        .id("current-user")
                    }
                    
                    // AI thinking indicator
                    if isAIThinking {
                        AITypingIndicator()
                            .id("typing")
                    }
                }
                .padding(AppTheme.Spacing.md)
            }
            .background(Color.appBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
            .onChange(of: conversationMessages.count) { _, _ in
                withAnimation(.easeOut(duration: 0.3)) {
                    if let lastMessage = conversationMessages.last {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
            .onChange(of: isAIThinking) { _, newValue in
                if newValue {
                    withAnimation {
                        proxy.scrollTo("typing", anchor: .bottom)
                    }
                }
            }
            .onChange(of: currentUserMessage) { _, _ in
                if !currentUserMessage.isEmpty {
                    withAnimation {
                        proxy.scrollTo("current-user", anchor: .bottom)
                    }
                }
            }
        }
    }
    
    private var emptyConversationState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 40))
                .foregroundColor(.textSecondary.opacity(0.4))
            
            Text("Start speaking to begin the conversation")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppTheme.Spacing.xl)
    }
    
    private func addAIMessage(_ text: String) {
        let message = ConversationMessage(
            content: text,
            isUser: false,
            timestamp: Date()
        )
        withAnimation(.easeOut(duration: 0.3)) {
            conversationMessages.append(message)
        }
        isAIThinking = false
    }
    
    private func updateUserMessage(_ text: String) {
        // Find the last transcribing user message or create a new one
        if let index = conversationMessages.lastIndex(where: { $0.isUser && $0.isTranscribing }) {
            conversationMessages[index].content = text
        } else {
            // Create new transcribing message
            let newMessage = ConversationMessage(
                content: text,
                isUser: true,
                timestamp: Date(),
                isTranscribing: true
            )
            conversationMessages.append(newMessage)
        }
    }
    
    private func finalizeUserMessage() {
        // Mark the last transcribing user message as finalized
        if let index = conversationMessages.lastIndex(where: { $0.isUser && $0.isTranscribing }) {
            conversationMessages[index].isTranscribing = false
        }
    }

    private var controlButtons: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Button {
                Task {
                    await viewModel.stopRecording()
                    dismiss()
                }
            } label: {
                HStack(spacing: AppTheme.Spacing.sm) {
                    Image(systemName: "stop.fill")
                    Text("Stop & Save")
                }
                .font(AppTheme.Typography.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(AppTheme.Spacing.md)
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.appAccent, Color.appPrimary]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(AppTheme.CornerRadius.md)
                .shadow(color: .appAccent.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .disabled(viewModel.recordingState != .listening)

            if case .error(let message) = viewModel.recordingState {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.error)
                    Text(message)
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.error)
                }
                .padding(AppTheme.Spacing.sm)
                .background(Color.error.opacity(0.1))
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
    }
}

// MARK: - Conversation Models

struct ConversationMessage: Identifiable {
    let id = UUID()
    var content: String
    let isUser: Bool
    let timestamp: Date
    var isTranscribing: Bool = false
}

// MARK: - Conversation Bubble

struct ConversationBubble: View {
    let message: ConversationMessage
    
    var body: some View {
        HStack(alignment: .top, spacing: AppTheme.Spacing.sm) {
            if !message.isUser {
                Spacer(minLength: 50)
            }
            
            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                HStack(spacing: 6) {
                    if !message.isUser {
                        Image(systemName: "sparkles")
                            .font(.caption2)
                            .foregroundColor(.appPrimary)
                    }
                    
                    Text(message.content)
                        .font(AppTheme.Typography.body)
                        .foregroundColor(message.isUser ? .white : .textPrimary)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    if message.isUser {
                        if message.isTranscribing {
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(
                    Group {
                        if message.isUser {
                            LinearGradient(
                                gradient: Gradient(colors: [Color.appPrimary, Color.appPrimary.opacity(0.8)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        } else {
                            Color.cardBackground
                        }
                    }
                )
                .cornerRadius(AppTheme.CornerRadius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                        .stroke(message.isUser ? Color.clear : Color.appPrimary.opacity(0.2), lineWidth: 1)
                )
                .shadow(color: .black.opacity(message.isUser ? 0.1 : 0.05), radius: 2, x: 0, y: 1)
                
                Text(formatTime(message.timestamp))
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
                    .padding(.horizontal, 4)
            }
            .frame(maxWidth: UIScreen.main.bounds.width * 0.75, alignment: message.isUser ? .trailing : .leading)
            
            if message.isUser {
                Spacer(minLength: 50)
            }
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - AI Typing Indicator

struct AITypingIndicator: View {
    @State private var animationPhase: Int = 0
    
    var body: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.caption2)
                    .foregroundColor(.appPrimary)
                
                HStack(spacing: 4) {
                    ForEach(0..<3) { index in
                        Circle()
                            .fill(Color.appPrimary.opacity(0.6))
                            .frame(width: 6, height: 6)
                            .scaleEffect(animationPhase == index ? 1.2 : 0.8)
                            .opacity(animationPhase == index ? 1.0 : 0.5)
                    }
                }
                
                Text("AI is thinking...")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }
            .padding(.horizontal, AppTheme.Spacing.md)
            .padding(.vertical, AppTheme.Spacing.sm)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .stroke(Color.appPrimary.opacity(0.2), lineWidth: 1)
            )
            
            Spacer(minLength: 50)
        }
        .onReceive(Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                animationPhase = (animationPhase + 1) % 3
            }
        }
    }
}

#Preview {
    VoiceJournalView(viewModel: JournalViewModel(
        journalRepository: JournalRepository(supabaseService: SupabaseService()),
        liveKitService: LiveKitService()
    ))
}
