//
//  Room.swift
//  nexhacks-ios
//
//  Room model for RoomPlan AR scanning
//

import Foundation
import RoomPlan

struct Room: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var type: RoomType
    var dimensions: RoomDimensions
    var scannedAt: Date
    var roomPlanData: Data? // Serialized CapturedRoom data
    var furnitureItems: [FurnitureItem]
    var floorArea: Double // in square meters
    var ceilingHeight: Double? // in meters
    var notes: String?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        type: RoomType,
        dimensions: RoomDimensions,
        scannedAt: Date = Date(),
        roomPlanData: Data? = nil,
        furnitureItems: [FurnitureItem] = [],
        floorArea: Double = 0,
        ceilingHeight: Double? = nil,
        notes: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.dimensions = dimensions
        self.scannedAt = scannedAt
        self.roomPlanData = roomPlanData
        self.furnitureItems = furnitureItems
        self.floorArea = floorArea
        self.ceilingHeight = ceilingHeight
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

enum RoomType: String, Codable, CaseIterable {
    case bedroom = "Bedroom"
    case livingRoom = "Living Room"
    case kitchen = "Kitchen"
    case bathroom = "Bathroom"
    case office = "Office"
    case dining = "Dining Room"
    case hallway = "Hallway"
    case other = "Other"
}

struct RoomDimensions: Codable, Equatable {
    var width: Double // in meters
    var length: Double // in meters
    var height: Double? // in meters

    var area: Double {
        width * length
    }
}

struct FurnitureItem: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var category: FurnitureCategory
    var position: Position3D
    var dimensions: FurnitureDimensions

    init(
        id: UUID = UUID(),
        name: String,
        category: FurnitureCategory,
        position: Position3D,
        dimensions: FurnitureDimensions
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.position = position
        self.dimensions = dimensions
    }
}

enum FurnitureCategory: String, Codable, CaseIterable {
    case bed = "Bed"
    case chair = "Chair"
    case table = "Table"
    case sofa = "Sofa"
    case storage = "Storage"
    case appliance = "Appliance"
    case other = "Other"
}

struct Position3D: Codable, Equatable {
    var x: Double
    var y: Double
    var z: Double
}

struct FurnitureDimensions: Codable, Equatable {
    var width: Double
    var depth: Double
    var height: Double
}
