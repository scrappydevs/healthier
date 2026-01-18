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
    @State private var elapsedSeconds: Int = 0
    
    let recordingTimer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: AppTheme.Spacing.lg) {
                // Close button
                HStack {
                    Spacer()
                    Button {
                        Task {
                            switch viewModel.recordingState {
                            case .connecting, .listening, .processing:
                                await viewModel.cancelRecording()
                            case .idle, .error:
                                break
                            }
                            dismiss()
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.top, AppTheme.Spacing.sm)

                // Audio visualization
                VStack(spacing: AppTheme.Spacing.xs) {
                    waveformVisualization
                    
                    Text(formatTime(elapsedSeconds))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .monospacedDigit()
                }
                .padding(.vertical, AppTheme.Spacing.md)

                mainContent
                    .frame(maxHeight: 500)

                Spacer()

                controlButtons
            }
            .padding(AppTheme.Spacing.md)
        }
        .onAppear {
            elapsedSeconds = 0
            Task {
                await viewModel.startRecording()
            }
        }
        .onReceive(recordingTimer) { _ in
            if case .listening = viewModel.recordingState {
                elapsedSeconds += 1
            }
        }
    }
    
    private func formatTime(_ totalSeconds: Int) -> String {
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
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

    private var mainContent: some View {
        Group {
            switch viewModel.recordingState {
            case .connecting, .listening:
                recordingStatusView
            case .processing:
                processingStatusView
            case .idle:
                transcriptView
            case .error:
                errorStatusView
            }
        }
    }
    
    private var recordingStatusView: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack(spacing: AppTheme.Spacing.sm) {
                Circle()
                    .fill(Color.error)
                    .frame(width: 8, height: 8)
                Text("Recording...")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
            }
            
            Text("Transcription will appear after you stop.")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    private var processingStatusView: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack(spacing: AppTheme.Spacing.sm) {
                ProgressView()
                    .scaleEffect(0.9)
                Text("Saving...")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)
            }
            
            Text("Please wait. This can take a moment.")
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    private var transcriptView: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("Transcript")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            if let errorMessage = viewModel.errorMessage, !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.error)
                    .lineSpacing(4)
            }
            
            if viewModel.lastCompletedTranscript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text("No transcription captured.")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.textSecondary)
            } else {
                ScrollView {
                    Text(viewModel.lastCompletedTranscript)
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textPrimary)
                        .lineSpacing(6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxHeight: 380)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    private var errorStatusView: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("Recording error")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)
            
            if case .error(let message) = viewModel.recordingState {
                Text(message)
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.error)
                    .lineSpacing(4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    

    private var controlButtons: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Group {
                switch viewModel.recordingState {
                case .listening:
                    Button {
                        Task {
                            await viewModel.stopRecording()
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
                case .connecting:
                    Button {} label: {
                        HStack(spacing: AppTheme.Spacing.sm) {
                            ProgressView()
                                .tint(.white)
                            Text("Connecting...")
                        }
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(AppTheme.Spacing.md)
                        .background(Color.textSecondary)
                        .cornerRadius(AppTheme.CornerRadius.md)
                    }
                    .disabled(true)
                case .processing:
                    Button {} label: {
                        HStack(spacing: AppTheme.Spacing.sm) {
                            ProgressView()
                                .tint(.white)
                            Text("Saving...")
                        }
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(AppTheme.Spacing.md)
                        .background(Color.textSecondary)
                        .cornerRadius(AppTheme.CornerRadius.md)
                    }
                    .disabled(true)
                case .idle, .error:
                    Button {
                        dismiss()
                    } label: {
                        Text("Done")
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(AppTheme.Spacing.md)
                            .background(Color.appPrimary)
                            .cornerRadius(AppTheme.CornerRadius.md)
                    }
                }
            }

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

#Preview {
    VoiceJournalView(viewModel: JournalViewModel(
        journalRepository: JournalRepository(supabaseService: SupabaseService()),
        liveKitService: LiveKitService()
    ))
}
