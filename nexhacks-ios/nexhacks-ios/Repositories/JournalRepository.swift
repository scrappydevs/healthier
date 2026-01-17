//
//  JournalRepository.swift
//  nexhacks-ios
//
//  Repository for JournalEntry data access
//

import Foundation
import Combine

@MainActor
class JournalRepository: ObservableObject {
    @Published var entries: [JournalEntry] = []

    private let supabaseService: SupabaseService
    private var cancellables = Set<AnyCancellable>()

    init(supabaseService: SupabaseService) {
        self.supabaseService = supabaseService
        loadLocalEntries()
    }

    func create(_ entry: JournalEntry) async throws {
        entries.append(entry)
        entries.sort { $0.date > $1.date }
        saveLocalEntries()
        
        do {
            try await supabaseService.createJournalEntry(entry)
        } catch {
            print("Failed to sync journal entry to Supabase: \(error)")
        }
    }

    func update(_ entry: JournalEntry) throws {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else {
            throw RepositoryError.notFound
        }

        var updatedEntry = entry
        updatedEntry.updatedAt = Date()
        entries[index] = updatedEntry
        entries.sort { $0.date > $1.date }
        saveLocalEntries()

        Task {
            do {
                try await supabaseService.updateJournalEntry(updatedEntry)
            } catch {
                print("Failed to sync journal entry update to Supabase: \(error)")
            }
        }
    }

    func delete(_ entry: JournalEntry) throws {
        entries.removeAll { $0.id == entry.id }
        saveLocalEntries()

        Task {
            do {
                try await supabaseService.deleteJournalEntry(entry.id)
            } catch {
                print("Failed to sync journal entry deletion to Supabase: \(error)")
            }
        }
    }

    func getById(_ id: UUID) -> JournalEntry? {
        return entries.first { $0.id == id }
    }

    func getAll() -> [JournalEntry] {
        return entries
    }

    func getByDate(_ date: Date) -> [JournalEntry] {
        let calendar = Calendar.current
        return entries.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    func search(query: String) -> [JournalEntry] {
        if query.isEmpty {
            return entries
        }
        
        let lowercasedQuery = query.lowercased()
        return entries.filter { entry in
            entry.transcript.lowercased().contains(lowercasedQuery) ||
            entry.tags.contains { $0.lowercased().contains(lowercasedQuery) }
        }
    }

    func getContextForQuestion(_ question: String) async throws -> [JournalEntry] {
        return try await supabaseService.getJournalContextForQuestion(question)
    }

    func syncFromSupabase() async throws {
        let remoteEntries = try await supabaseService.fetchJournalEntries()
        
        for remoteEntry in remoteEntries {
            if let localIndex = entries.firstIndex(where: { $0.id == remoteEntry.id }) {
                if remoteEntry.updatedAt > entries[localIndex].updatedAt {
                    entries[localIndex] = remoteEntry
                }
            } else {
                entries.append(remoteEntry)
            }
        }
        
        entries.sort { $0.date > $1.date }
        saveLocalEntries()
    }

    private func loadLocalEntries() {
        if let data = UserDefaults.standard.data(forKey: "journal_entries"),
           let decoded = try? JSONDecoder().decode([JournalEntry].self, from: data) {
            entries = decoded.sorted { $0.date > $1.date }
        }
    }

    private func saveLocalEntries() {
        if let encoded = try? JSONEncoder().encode(entries) {
            UserDefaults.standard.set(encoded, forKey: "journal_entries")
        }
    }
}
