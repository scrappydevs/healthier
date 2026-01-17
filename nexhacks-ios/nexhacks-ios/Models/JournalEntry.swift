//
//  JournalEntry.swift
//  nexhacks-ios
//
//  Journal entry model with Codable support
//

import Foundation

struct JournalEntry: Identifiable, Codable, Equatable {
    let id: UUID
    var transcript: String
    var date: Date
    var duration: TimeInterval?
    var tags: [String]
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        transcript: String,
        date: Date = Date(),
        duration: TimeInterval? = nil,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.transcript = transcript
        self.date = date
        self.duration = duration
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
