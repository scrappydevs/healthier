//
//  RoomRepository.swift
//  nexhacks-ios
//
//  Repository for Room data access
//

import Foundation
import Combine

@MainActor
class RoomRepository: ObservableObject {
    @Published var rooms: [Room] = []

    // In-memory storage (will be replaced with Core Data/SwiftData)
    private var storage: [Room] = []

    // MARK: - Initialization
    init() {
        // No sample data for rooms initially
        updatePublished()
    }

    // MARK: - Public Methods

    /// Create a new room
    func create(_ room: Room) throws {
        storage.append(room)
        updatePublished()
    }

    /// Get room by ID
    func getById(_ id: UUID) -> Room? {
        return storage.first { $0.id == id }
    }

    /// Update room
    func update(_ room: Room) throws {
        guard let index = storage.firstIndex(where: { $0.id == room.id }) else {
            throw RepositoryError.notFound
        }

        var updatedRoom = room
        updatedRoom.updatedAt = Date()
        storage[index] = updatedRoom
        updatePublished()
    }

    /// Delete room
    func delete(_ room: Room) throws {
        storage.removeAll { $0.id == room.id }
        updatePublished()
    }

    /// Get all rooms
    func getAll() -> [Room] {
        return storage
    }

    /// Get rooms by type
    func getRooms(ofType type: RoomType) -> [Room] {
        return storage.filter { $0.type == type }
    }

    /// Get total scanned area
    func getTotalScannedArea() -> Double {
        return storage.reduce(0) { $0 + $1.floorArea }
    }

    // MARK: - Private Methods

    private func updatePublished() {
        rooms = storage.sorted { $0.scannedAt > $1.scannedAt }
    }
}

// MARK: - Repository Error
enum RepositoryError: LocalizedError {
    case notFound
    case invalidData
    case saveFailed

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Item not found"
        case .invalidData:
            return "Invalid data"
        case .saveFailed:
            return "Failed to save data"
        }
    }
}
