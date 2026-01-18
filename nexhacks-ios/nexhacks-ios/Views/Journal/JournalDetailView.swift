//
//  JournalDetailView.swift
//  nexhacks-ios
//
//  Detail view for a journal entry with edit and delete options
//

import SwiftUI

struct JournalDetailView: View {
    let entry: JournalEntry
    @ObservedObject var viewModel: JournalViewModel
    @State private var editedTranscript: String
    @State private var isEditing: Bool = false
    @State private var showingDeleteAlert: Bool = false

    init(entry: JournalEntry, viewModel: JournalViewModel) {
        self.entry = entry
        self.viewModel = viewModel
        _editedTranscript = State(initialValue: entry.transcript)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                headerSection

                transcriptSection

                metadataSection
            }
            .padding(AppTheme.Spacing.md)
        }
        .background(Color.appBackground)
        .navigationTitle("Journal Entry")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        isEditing = true
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }

                    Button(role: .destructive) {
                        showingDeleteAlert = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }

                    ShareLink(item: editedTranscript) {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundColor(.appPrimary)
                }
            }
        }
        .alert("Delete Entry", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                viewModel.deleteEntry(entry)
            }
        } message: {
            Text("Are you sure you want to delete this journal entry? This action cannot be undone.")
        }
        .sheet(isPresented: $isEditing) {
            EditJournalView(
                entry: entry,
                transcript: $editedTranscript,
                viewModel: viewModel
            )
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text(entry.date, style: .date)
                        .font(AppTheme.Typography.title)
                        .foregroundColor(.textPrimary)

                    Text(entry.date, style: .time)
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                if let duration = entry.duration {
                    VStack(spacing: 4) {
                        Image(systemName: "waveform")
                            .font(.title3)
                            .foregroundColor(.appPrimary)
                        Text(formatDuration(duration))
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(.appPrimary)
                    }
                    .padding(AppTheme.Spacing.sm)
                    .background(Color.appPrimary.opacity(0.1))
                    .cornerRadius(AppTheme.CornerRadius.md)
                }
            }
            
            // Reading time estimate
            HStack(spacing: AppTheme.Spacing.md) {
                InfoBadge(
                    icon: "text.word.spacing",
                    text: "\(wordCount) words"
                )
                
                InfoBadge(
                    icon: "clock.fill",
                    text: "\(readingTime) min read"
                )
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }
    
    private var wordCount: Int {
        editedTranscript.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .count
    }
    
    private var readingTime: Int {
        max(1, wordCount / 200)
    }

    private var transcriptSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Entry")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text(editedTranscript)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(AppTheme.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Details")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            VStack(spacing: AppTheme.Spacing.sm) {
                DetailRow(label: "Created", value: formatDateTime(entry.createdAt))
                
                if entry.updatedAt != entry.createdAt {
                    DetailRow(label: "Updated", value: formatDateTime(entry.updatedAt))
                }
            }

            if !entry.tags.isEmpty {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                    Text("Tags")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textSecondary)

                    FlowLayout(spacing: AppTheme.Spacing.xs) {
                        ForEach(entry.tags, id: \.self) { tag in
                            Text(tag)
                                .font(AppTheme.Typography.caption)
                                .foregroundColor(.appPrimary)
                                .padding(.horizontal, AppTheme.Spacing.sm)
                                .padding(.vertical, AppTheme.Spacing.xs)
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
    }
    
    private func formatDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
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

struct InfoBadge: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(.textSecondary)
            Text(text)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .padding(.horizontal, AppTheme.Spacing.sm)
        .padding(.vertical, 4)
        .background(Color.appBackground)
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textPrimary)
        }
    }
}

struct EditJournalView: View {
    let entry: JournalEntry
    @Binding var transcript: String
    @ObservedObject var viewModel: JournalViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                TextEditor(text: $transcript)
                    .font(AppTheme.Typography.body)
                    .padding(AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .cornerRadius(AppTheme.CornerRadius.md)
                    .padding(AppTheme.Spacing.md)
            }
            .navigationTitle("Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        var updatedEntry = entry
                        updatedEntry.transcript = transcript
                        viewModel.updateEntry(updatedEntry)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.width ?? 0,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: proposal.width ?? 0,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.frames[index].minX,
                                     y: bounds.minY + result.frames[index].minY),
                         proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var frames: [CGRect] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }
                frames.append(CGRect(x: currentX, y: currentY, width: size.width, height: size.height))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: currentY + lineHeight)
        }
    }
}

#Preview {
    NavigationView {
        JournalDetailView(
            entry: JournalEntry(
                transcript: "This is a sample journal entry transcript.",
                date: Date(),
                duration: 120
            ),
            viewModel: JournalViewModel(
                journalRepository: JournalRepository(supabaseService: SupabaseService()),
                liveKitService: LiveKitService()
            )
        )
    }
}
