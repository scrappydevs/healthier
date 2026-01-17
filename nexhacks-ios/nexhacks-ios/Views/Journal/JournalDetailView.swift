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
        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
            Text(entry.date, style: .date)
                .font(AppTheme.Typography.title2)
                .foregroundColor(.textPrimary)

            Text(entry.date, style: .time)
                .font(AppTheme.Typography.subheadline)
                .foregroundColor(.textSecondary)

            if let duration = entry.duration {
                HStack(spacing: AppTheme.Spacing.xs) {
                    Image(systemName: "clock.fill")
                        .font(.caption)
                        .foregroundColor(.appPrimary)

                    Text(formatDuration(duration))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.appPrimary)
                }
                .padding(.horizontal, AppTheme.Spacing.sm)
                .padding(.vertical, AppTheme.Spacing.xs)
                .background(Color.appPrimary.opacity(0.1))
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
    }

    private var transcriptSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("Transcript")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text(editedTranscript)
                .font(AppTheme.Typography.body)
                .foregroundColor(.textPrimary)
                .lineSpacing(4)
        }
        .padding(AppTheme.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("Details")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            HStack {
                Text("Created")
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)

                Spacer()

                Text(entry.createdAt, style: .date)
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textPrimary)
            }

            if entry.updatedAt != entry.createdAt {
                HStack {
                    Text("Updated")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textSecondary)

                    Spacer()

                    Text(entry.updatedAt, style: .date)
                        .font(AppTheme.Typography.subheadline)
                        .foregroundColor(.textPrimary)
                }
            }

            if !entry.tags.isEmpty {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
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

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
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
