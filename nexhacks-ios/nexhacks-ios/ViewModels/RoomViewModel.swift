//
//  RoomViewModel.swift
//  nexhacks-ios
//
//  ViewModel for Room management with RoomPlan integration
//

import Foundation
import Combine
import RoomPlan

@MainActor
class RoomViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var rooms: [Room] = []
    @Published var isScanning: Bool = false
    @Published var isExporting: Bool = false
    @Published var errorMessage: String?

    // Computed Properties
    var totalScannedArea: Double {
        rooms.reduce(0) { $0 + $1.floorArea }
    }

    // MARK: - Dependencies
    private let roomRepository: RoomRepository
    private let roomPlanService: RoomPlanService
    private let syncService: SyncService

    private var cancellables = Set<AnyCancellable>()
    private var capturedRoomCache: [UUID: CapturedRoom] = [:]

    // MARK: - Initialization
    init(
        roomRepository: RoomRepository,
        roomPlanService: RoomPlanService,
        syncService: SyncService
    ) {
        self.roomRepository = roomRepository
        self.roomPlanService = roomPlanService
        self.syncService = syncService

        setupBindings()
        loadRooms()
    }

    // MARK: - Public Methods

    /// Load all rooms
    func loadRooms() {
        rooms = roomRepository.getAll()
    }

    /// Start room scanning
    func startScanning(with captureView: RoomCaptureView) {
        roomPlanService.startScanning(with: captureView)
    }

    /// Process captured room and save
    func processCapturedRoom(_ capturedRoom: CapturedRoom) {
        Task {
            roomPlanService.processCapturedRoom(capturedRoom)

            // Wait for processing to complete
            try? await Task.sleep(nanoseconds: 500_000_000)

            if let room = roomPlanService.currentRoom {
                // Cache the captured room for USDZ export
                capturedRoomCache[room.id] = capturedRoom

                // Save to repository
                do {
                    try roomRepository.create(room)
                    loadRooms()
                } catch {
                    errorMessage = "Failed to save room: \(error.localizedDescription)"
                }
            }
        }
    }

    /// Update room information
    func updateRoom(_ room: Room) throws {
        try roomRepository.update(room)
        loadRooms()
    }

    /// Delete room
    func deleteRoom(_ room: Room) throws {
        try roomRepository.delete(room)
        capturedRoomCache.removeValue(forKey: room.id)
        loadRooms()
    }

    /// Export room as USDZ for AR Quick Look
    func exportRoomAsUSDZ(_ room: Room) async throws -> URL? {
        guard let capturedRoom = capturedRoomCache[room.id] else {
            errorMessage = "Original scan data not available for this room"
            return nil
        }

        return try await roomPlanService.exportAsUSDZ(room, capturedRoom: capturedRoom)
    }

    /// Export room to backend (USDZ → GLB/GLTF conversion)
    func exportToBackend(_ room: Room) async throws {
        isExporting = true
        defer { isExporting = false }

        // Get cached captured room
        guard let capturedRoom = capturedRoomCache[room.id] else {
            throw RoomPlanError.exportFailed
        }

        // Export as USDZ
        let usdzURL = try await roomPlanService.exportAsUSDZ(room, capturedRoom: capturedRoom)

        // Upload to backend
        try await roomPlanService.uploadToBackend(usdzURL, roomId: room.id)

        // Optionally trigger sync to update dashboard
        try? await syncService.syncAll()
    }

    /// Get room by ID
    func getRoom(id: UUID) -> Room? {
        return roomRepository.getById(id)
    }

    /// Get rooms by type
    func getRooms(ofType type: RoomType) -> [Room] {
        return roomRepository.getRooms(ofType: type)
    }

    /// Get cached captured room for 3D visualization
    func getCapturedRoom(for roomId: UUID) -> CapturedRoom? {
        return capturedRoomCache[roomId]
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // Observe room repository changes
        roomRepository.$rooms
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.loadRooms()
            }
            .store(in: &cancellables)

        // Observe scanning status
        roomPlanService.$isScanning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isScanning in
                self?.isScanning = isScanning
            }
            .store(in: &cancellables)

        // Observe export status
        roomPlanService.$isExporting
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isExporting in
                self?.isExporting = isExporting
            }
            .store(in: &cancellables)
    }
}
