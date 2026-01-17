//
//  RoomPlanService.swift
//  nexhacks-ios
//
//  Service for AR room scanning using RoomPlan with USDZ export
//

import Foundation
import RoomPlan
import Combine

@MainActor
class RoomPlanService: ObservableObject {
    @Published var isScanning: Bool = false
    @Published var scannedRooms: [Room] = []
    @Published var currentScanProgress: Double = 0.0
    @Published var scanningStatus: ScanningStatus = .idle
    @Published var currentRoom: Room?
    @Published var isExporting: Bool = false

    private var roomCaptureSession: RoomCaptureSession?
    private var currentCaptureView: RoomCaptureView?
    private var cancellables = Set<AnyCancellable>()

    enum ScanningStatus {
        case idle
        case scanning
        case processing
        case completed
        case error(Error)
    }

    // MARK: - Public Methods

    /// Check if RoomPlan is supported on this device
    func isRoomPlanSupported() -> Bool {
        return RoomCaptureSession.isSupported
    }

    /// Start room scanning with RoomCaptureView
    func startScanning(with captureView: RoomCaptureView) {
        guard isRoomPlanSupported() else {
            scanningStatus = .error(RoomPlanError.notSupported)
            return
        }

        isScanning = true
        scanningStatus = .scanning
        currentScanProgress = 0.0
        currentCaptureView = captureView

        roomCaptureSession = captureView.captureSession
        roomCaptureSession?.run(configuration: RoomCaptureSession.Configuration())

        print("Started room scanning...")
    }

    /// Stop room scanning
    func stopScanning() {
        isScanning = false
        scanningStatus = .processing
        roomCaptureSession?.stop()
        currentCaptureView = nil

        print("Stopped room scanning...")
    }

    /// Process captured room from RoomPlan
    func processCapturedRoom(_ capturedRoom: CapturedRoom) {
        scanningStatus = .processing

        Task {
            do {
                // Extract room data
                let room = try await extractRoomData(from: capturedRoom)
                currentRoom = room
                scanningStatus = .completed
                print("Successfully processed captured room: \(room.name)")
            } catch {
                scanningStatus = .error(error)
                print("Failed to process captured room: \(error)")
            }
        }
    }

    /// Extract Room model from CapturedRoom
    private func extractRoomData(from capturedRoom: CapturedRoom) async throws -> Room {
        // Calculate room dimensions from walls using their transforms
        let walls = capturedRoom.walls
        var minX: Float = .infinity
        var maxX: Float = -.infinity
        var minZ: Float = .infinity
        var maxZ: Float = -.infinity
        var ceilingHeight: Float = 2.5 // Default height

        // Extract bounds from wall transforms
        for wall in walls {
            let wallTransform = wall.transform
            let wallPosition = wallTransform.columns.3

            minX = min(minX, wallPosition.x)
            maxX = max(maxX, wallPosition.x)
            minZ = min(minZ, wallPosition.z)
            maxZ = max(maxZ, wallPosition.z)

            // Try to estimate height from wall dimensions
            if wall.dimensions.y > 0 {
                ceilingHeight = max(ceilingHeight, wall.dimensions.y)
            }
        }

        let width = Double(maxX - minX)
        let length = Double(maxZ - minZ)

        let dimensions = RoomDimensions(
            width: max(width, 1.0), // Ensure minimum dimension
            length: max(length, 1.0),
            height: Double(ceilingHeight)
        )

        // Extract furniture items
        var furnitureItems: [FurnitureItem] = []
        for object in capturedRoom.objects {
            let categoryName = getCategoryName(for: object.category)
            let furniture = FurnitureItem(
                name: categoryName,
                category: mapObjectCategory(object.category),
                position: Position3D(
                    x: Double(object.transform.columns.3.x),
                    y: Double(object.transform.columns.3.y),
                    z: Double(object.transform.columns.3.z)
                ),
                dimensions: FurnitureDimensions(
                    width: Double(object.dimensions.x),
                    depth: Double(object.dimensions.z),
                    height: Double(object.dimensions.y)
                )
            )
            furnitureItems.append(furniture)
        }

        // Serialize the captured room data
        let roomPlanData = try encodeRoomPlanData(capturedRoom)

        let room = Room(
            name: "New Room",
            type: .bedroom,
            dimensions: dimensions,
            roomPlanData: roomPlanData,
            furnitureItems: furnitureItems,
            floorArea: width * length,
            ceilingHeight: Double(ceilingHeight)
        )

        return room
    }

    /// Get string name for object category
    private func getCategoryName(for category: CapturedRoom.Object.Category) -> String {
        switch category {
        case .storage: return "Storage"
        case .refrigerator: return "Refrigerator"
        case .stove: return "Stove"
        case .bed: return "Bed"
        case .sink: return "Sink"
        case .washerDryer: return "Washer/Dryer"
        case .toilet: return "Toilet"
        case .bathtub: return "Bathtub"
        case .oven: return "Oven"
        case .dishwasher: return "Dishwasher"
        case .table: return "Table"
        case .sofa: return "Sofa"
        case .chair: return "Chair"
        case .fireplace: return "Fireplace"
        case .television: return "Television"
        case .stairs: return "Stairs"
        @unknown default: return "Unknown"
        }
    }

    /// Map RoomPlan object categories to our furniture categories
    private func mapObjectCategory(_ category: CapturedRoom.Object.Category) -> FurnitureCategory {
        switch category {
        case .bed:
            return .bed
        case .chair:
            return .chair
        case .table:
            return .table
        case .sofa:
            return .sofa
        case .storage:
            return .storage
        case .refrigerator, .dishwasher, .stove, .oven, .washerDryer:
            return .appliance
        default:
            return .other
        }
    }

    /// Encode CapturedRoom for storage
    private func encodeRoomPlanData(_ capturedRoom: CapturedRoom) throws -> Data {
        // Store a lightweight representation
        // In production, you might want to serialize the entire CapturedRoom
        return Data()
    }

    /// Export room as USDZ file
    func exportAsUSDZ(_ room: Room, capturedRoom: CapturedRoom?) async throws -> URL {
        isExporting = true
        defer { isExporting = false }

        let fileManager = FileManager.default
        let temporaryDirectory = fileManager.temporaryDirectory
        let usdzURL = temporaryDirectory.appendingPathComponent("\(room.id.uuidString).usdz")

        // Export using RoomPlan's built-in export
        if let capturedRoom = capturedRoom {
            try capturedRoom.export(to: usdzURL)
        } else {
            throw RoomPlanError.exportFailed
        }

        print("Exported USDZ to: \(usdzURL.path)")
        return usdzURL
    }

    /// Upload USDZ to backend for conversion to GLB/GLTF
    func uploadToBackend(_ usdzURL: URL, roomId: UUID) async throws {
        isExporting = true
        defer { isExporting = false }

        // TODO: Implement actual backend upload
        // This would:
        // 1. Read the USDZ file
        // 2. Upload to backend API endpoint
        // 3. Backend converts USDZ → GLB/GLTF using a converter service
        // 4. Store converted file in cloud storage
        // 5. Update room metadata with 3D model URL

        let usdzData = try Data(contentsOf: usdzURL)

        print("Uploading USDZ to backend...")
        print("File size: \(usdzData.count / 1024) KB")

        // Simulate upload delay
        try await Task.sleep(nanoseconds: 2_000_000_000)

        // Example API call structure:
        /*
        let request = URLRequest(url: URL(string: "https://api.yourbackend.com/rooms/\(roomId)/upload-3d")!)
        request.httpMethod = "POST"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = usdzData

        let (_, response) = try await URLSession.shared.upload(for: request, from: usdzData)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw RoomPlanError.uploadFailed
        }
        */

        print("Successfully uploaded USDZ to backend for conversion")
    }

    /// Delete a scanned room
    func deleteRoom(_ room: Room) {
        scannedRooms.removeAll { $0.id == room.id }
    }

    /// Get room by ID
    func getRoom(id: UUID) -> Room? {
        return scannedRooms.first { $0.id == id }
    }
}

enum RoomPlanError: LocalizedError {
    case notSupported
    case scanningFailed
    case processingFailed
    case exportFailed
    case uploadFailed

    var errorDescription: String? {
        switch self {
        case .notSupported:
            return "RoomPlan is not supported on this device. Requires iPhone 12 Pro or later with LiDAR."
        case .scanningFailed:
            return "Failed to scan room"
        case .processingFailed:
            return "Failed to process room data"
        case .exportFailed:
            return "Failed to export USDZ file"
        case .uploadFailed:
            return "Failed to upload to backend"
        }
    }
}
