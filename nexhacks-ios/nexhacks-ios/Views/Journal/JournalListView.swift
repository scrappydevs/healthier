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
    @Environment(\.dismiss) private var dismiss

    init(viewModel: JournalViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
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
            .onChange(of: searchText) { _, newValue in
                viewModel.searchEntries(query: newValue)
            }
            .sheet(isPresented: $showingVoiceJournal) {
                VoiceJournalView(viewModel: viewModel)
            }
            .navigationBarHidden(true)
            .navigationBarBackButtonHidden(true)
    }

    private var emptyStateView: some View {
        VStack(spacing: AppTheme.Spacing.xl) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(Color.appPrimary.opacity(0.1))
                    .frame(width: 120, height: 120)
                
                Image(systemName: "book.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.appPrimary)
            }

            VStack(spacing: AppTheme.Spacing.sm) {
                Text("Start Your Journal")
                    .font(AppTheme.Typography.title)
                    .foregroundColor(.textPrimary)

                Text("Capture your thoughts and experiences with voice journaling")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, AppTheme.Spacing.lg)
            }

            Spacer()
        }
    }
}

struct StatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppTheme.Spacing.xs) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            
            Text(value)
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)
            
            Text(label)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct JournalEntryCard: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.date, style: .time)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.textPrimary)
                    
                    if let duration = entry.duration {
                        HStack(spacing: 4) {
                            Image(systemName: "waveform")
                                .font(.caption2)
                                .foregroundColor(.appPrimary)
                            Text(formatDuration(duration))
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.appPrimary)
                        }
                    }
                }
                
                Spacer()
                
                // Word count badge
                if !entry.transcript.isEmpty {
                    Text("\(wordCount) words")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                        .padding(.horizontal, AppTheme.Spacing.sm)
                        .padding(.vertical, 4)
                        .background(Color.appBackground)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                }
            }
            
            Divider()
                .background(Color.divider)
            
            // Preview text
            Text(previewText)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
                .lineLimit(4)
                .lineSpacing(4)
            
            // Tags if available
            if !entry.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppTheme.Spacing.xs) {
                        ForEach(entry.tags.prefix(3), id: \.self) { tag in
                            Text(tag)
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.appPrimary)
                                .padding(.horizontal, AppTheme.Spacing.sm)
                                .padding(.vertical, 4)
                                .background(Color.appPrimary.opacity(0.1))
                                .cornerRadius(AppTheme.CornerRadius.sm)
                        }
                    }
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var previewText: String {
        let trimmed = entry.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "No transcript available"
        }
        let lines = trimmed.components(separatedBy: .newlines)
        let preview = lines.prefix(4).joined(separator: " ")
        return preview
    }
    
    private var wordCount: Int {
        entry.transcript.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .count
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        if minutes > 0 {
            return "\(minutes)m \(seconds)s"
        }
        return "\(seconds)s"
    }
}

#Preview {
    JournalListView(viewModel: JournalViewModel(
        journalRepository: JournalRepository(supabaseService: SupabaseService()),
        liveKitService: LiveKitService()
    ))
}
