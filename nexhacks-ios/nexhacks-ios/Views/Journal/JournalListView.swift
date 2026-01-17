//
//  JournalListView.swift
//  nexhacks-ios
//
//  Journal list view showing all entries
//

import SwiftUI

struct JournalListView: View {
    @StateObject var viewModel: JournalViewModel
    @State private var searchText: String = ""
    @State private var showingVoiceJournal: Bool = false

    init(viewModel: JournalViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text("Journal")
                            .font(AppTheme.Typography.title)
                            .foregroundColor(.textPrimary)

                        Spacer()

                        Button {
                            Task {
                                await viewModel.syncFromSupabase()
                            }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                                .font(.title3)
                                .foregroundColor(.appPrimary)
                                .frame(width: 44, height: 44)
                                .background(Color.cardBackground)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
                        }
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.top, AppTheme.Spacing.md)
                    .padding(.bottom, AppTheme.Spacing.md)

                    // Custom Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.textSecondary)
                        TextField("Search entries", text: $searchText)
                            .foregroundColor(.textPrimary)
                    }
                    .padding(AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .cornerRadius(AppTheme.CornerRadius.md)
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.bottom, AppTheme.Spacing.md)

                    if viewModel.entries.isEmpty && searchText.isEmpty {
                        emptyStateView
                    } else {
                        ScrollView {
                            LazyVStack(spacing: AppTheme.Spacing.md) {
                                ForEach(viewModel.entries) { entry in
                                    NavigationLink(destination: JournalDetailView(entry: entry, viewModel: viewModel)) {
                                        JournalEntryCard(entry: entry)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal, AppTheme.Spacing.lg)
                            .padding(.vertical, AppTheme.Spacing.lg)
                        }
                    }
                }

                // Floating Action Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            showingVoiceJournal = true
                        } label: {
                            Image(systemName: "mic.fill")
                                .font(.title2)
                                .foregroundColor(.white)
                                .frame(width: 60, height: 60)
                                .background(Color.appPrimary)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                        }
                        .padding(.trailing, AppTheme.Spacing.lg)
                        .padding(.bottom, AppTheme.Spacing.lg)
                    }
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .onChange(of: searchText) { _, newValue in
                viewModel.searchEntries(query: newValue)
            }
            .sheet(isPresented: $showingVoiceJournal) {
                VoiceJournalView(viewModel: viewModel)
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "book.fill")
                .font(.system(size: 60))
                .foregroundColor(.appPrimary)

            Text("Start your first journal entry")
                .font(AppTheme.Typography.title)
                .foregroundColor(.textPrimary)

            Text("Tap the microphone to begin voice journaling")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppTheme.Spacing.xl)
    }

}

struct JournalEntryCard: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack {
                Text(entry.date, style: .date)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)

                Spacer()

                if let duration = entry.duration {
                    Text(formatDuration(duration))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.appPrimary)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, AppTheme.Spacing.xs)
                        .background(Color.appPrimary.opacity(0.1))
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }

                Text(entry.date, style: .time)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Text(previewText)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
                .lineLimit(3)
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var previewText: String {
        let lines = entry.transcript.components(separatedBy: .newlines)
        let preview = lines.prefix(3).joined(separator: " ")
        return preview.isEmpty ? "No transcript" : preview
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

#Preview {
    JournalListView(viewModel: JournalViewModel(
        journalRepository: JournalRepository(supabaseService: SupabaseService()),
        liveKitService: LiveKitService()
    ))
}
