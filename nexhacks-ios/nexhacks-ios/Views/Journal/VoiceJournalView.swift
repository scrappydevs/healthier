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

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: AppTheme.Spacing.xl) {
                connectionStatusHeader

                Spacer()

                waveformVisualization

                transcriptDisplay

                agentMessageDisplay

                Spacer()

                controlButtons
            }
            .padding(AppTheme.Spacing.lg)
        }
        .onAppear {
            Task {
                await viewModel.startRecording()
            }
        }
    }

    private var connectionStatusHeader: some View {
        HStack {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(viewModel.connectionStatus)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.textSecondary)
            }
        }
    }

    private var statusColor: Color {
        switch viewModel.recordingState {
        case .idle:
            return .gray
        case .connecting:
            return .orange
        case .listening:
            return .green
        case .processing:
            return .blue
        case .error:
            return .red
        }
    }

    private var waveformVisualization: some View {
        HStack(spacing: 4) {
            ForEach(0..<40, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.appPrimary)
                    .frame(width: 4)
                    .frame(height: waveformHeight(for: index))
            }
        }
        .frame(height: 100)
        .onReceive(Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()) { _ in
            if case .listening = viewModel.recordingState {
                waveformAmplitude = CGFloat.random(in: 0.3...1.0)
            } else {
                waveformAmplitude = 0.1
            }
        }
    }

    private func waveformHeight(for index: Int) -> CGFloat {
        let baseHeight: CGFloat = 20
        let variation = sin(Double(index) * 0.3 + Date().timeIntervalSince1970 * 2) * 0.5 + 0.5
        return baseHeight + (variation * waveformAmplitude * 60)
    }

    private var transcriptDisplay: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                if viewModel.currentTranscript.isEmpty {
                    Text("Listening...")
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textSecondary)
                        .italic()
                } else {
                    Text(viewModel.currentTranscript)
                        .font(AppTheme.Typography.body)
                        .foregroundColor(.textPrimary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppTheme.Spacing.md)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
        }
        .frame(maxHeight: 200)
    }

    private var agentMessageDisplay: some View {
        Group {
            if !viewModel.agentMessage.isEmpty {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text("Agent")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .textCase(.uppercase)

                    Text(viewModel.agentMessage)
                        .font(AppTheme.Typography.callout)
                        .foregroundColor(.appPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(AppTheme.Spacing.md)
                .background(Color.appPrimary.opacity(0.1))
                .cornerRadius(AppTheme.CornerRadius.md)
            }
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
                HStack {
                    Image(systemName: "stop.fill")
                    Text("Stop Recording")
                }
                .font(AppTheme.Typography.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(AppTheme.Spacing.md)
                .background(Color.appAccent)
                .cornerRadius(AppTheme.CornerRadius.md)
            }
            .disabled(viewModel.recordingState != .listening)

            if case .error(let message) = viewModel.recordingState {
                Text(message)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.error)
                    .multilineTextAlignment(.center)
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
