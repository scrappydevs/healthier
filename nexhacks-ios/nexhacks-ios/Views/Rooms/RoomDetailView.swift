//
//  RoomDetailView.swift
//  nexhacks-ios
//
//  Room detail view with 3D visualization and edit capabilities
//

import SwiftUI
import RoomPlan
import QuickLook
import SceneKit

struct RoomDetailView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var viewModel: RoomViewModel

    let room: Room

    @State private var editedName: String
    @State private var editedType: RoomType
    @State private var editedNotes: String
    @State private var isEditing = false
    @State private var showingExportOptions = false
    @State private var usdzURL: URL?

    init(room: Room, viewModel: RoomViewModel) {
        self.room = room
        self.viewModel = viewModel
        _editedName = State(initialValue: room.name)
        _editedType = State(initialValue: room.type)
        _editedNotes = State(initialValue: room.notes ?? "")
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: AppTheme.Spacing.lg) {
                    // 3D View Section
                    room3DView

                    // Room Info Section
                    roomInfoSection

                    // Dimensions Section
                    dimensionsSection

                    // Furniture Section
                    furnitureSection

                    // Actions Section
                    actionsSection
                }
                .padding(AppTheme.Spacing.md)
            }
            .background(Color.appBackground)
            .navigationTitle(room.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(.textPrimary)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        if isEditing {
                            saveChanges()
                        }
                        isEditing.toggle()
                    } label: {
                        Text(isEditing ? "Save" : "Edit")
                            .foregroundColor(.appPrimary)
                    }
                }
            }
            .sheet(isPresented: $showingExportOptions) {
                exportOptionsSheet
            }
            .quickLookPreview($usdzURL)
        }
    }

    // MARK: - 3D View Section
    private var room3DView: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .fill(Color.cardBackground)
                    .frame(height: 300)

                // Show the actual 3D room visualization
                Room3DViewRepresentable(room: room, viewModel: viewModel)
                    .frame(height: 300)
                    .cornerRadius(AppTheme.CornerRadius.md)
            }

            Button {
                generateAndPreviewUSDZ()
            } label: {
                HStack {
                    Image(systemName: "view.3d")
                    Text("View in AR")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.sm)
                .background(Color.appPrimary)
                .cornerRadius(AppTheme.CornerRadius.sm)
            }
        }
    }

    // MARK: - Room Info Section
    private var roomInfoSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Room Information")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            VStack(spacing: AppTheme.Spacing.md) {
                if isEditing {
                    TextField("Room Name", text: $editedName)
                        .font(AppTheme.Typography.body)
                        .padding(AppTheme.Spacing.md)
                        .background(Color.cardBackground)
                        .cornerRadius(AppTheme.CornerRadius.sm)

                    Picker("Room Type", selection: $editedType) {
                        ForEach(RoomType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(AppTheme.Spacing.md)
                    .background(Color.cardBackground)
                    .cornerRadius(AppTheme.CornerRadius.sm)

                    TextField("Notes", text: $editedNotes, axis: .vertical)
                        .font(AppTheme.Typography.body)
                        .lineLimit(3...6)
                        .padding(AppTheme.Spacing.md)
                        .background(Color.cardBackground)
                        .cornerRadius(AppTheme.CornerRadius.sm)
                } else {
                    InfoRow(label: "Name", value: room.name)
                    InfoRow(label: "Type", value: room.type.rawValue)
                    if let notes = room.notes, !notes.isEmpty {
                        InfoRow(label: "Notes", value: notes)
                    }
                    InfoRow(
                        label: "Scanned",
                        value: room.scannedAt.formatted(date: .abbreviated, time: .shortened)
                    )
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Dimensions Section
    private var dimensionsSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Dimensions")
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            HStack(spacing: AppTheme.Spacing.md) {
                DimensionCard(
                    icon: "ruler",
                    label: "Floor Area",
                    value: String(format: "%.2f m²", room.floorArea)
                )

                if let height = room.ceilingHeight {
                    DimensionCard(
                        icon: "arrow.up.and.down",
                        label: "Height",
                        value: String(format: "%.2f m", height)
                    )
                }
            }

            HStack(spacing: AppTheme.Spacing.md) {
                DimensionCard(
                    icon: "arrow.left.and.right",
                    label: "Width",
                    value: String(format: "%.2f m", room.dimensions.width)
                )

                DimensionCard(
                    icon: "arrow.up.and.down.square",
                    label: "Length",
                    value: String(format: "%.2f m", room.dimensions.length)
                )
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Furniture Section
    private var furnitureSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack {
                Text("Furniture")
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(.textPrimary)

                Spacer()

                Text("\(room.furnitureItems.count) items")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            if room.furnitureItems.isEmpty {
                Text("No furniture detected")
                    .font(AppTheme.Typography.subheadline)
                    .foregroundColor(.textSecondary)
                    .padding(AppTheme.Spacing.md)
            } else {
                ForEach(room.furnitureItems) { item in
                    FurnitureRow(item: item)
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
    }

    // MARK: - Actions Section
    private var actionsSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Button {
                showingExportOptions = true
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Export to Dashboard")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.md)
                .background(Color.appPrimary)
                .cornerRadius(AppTheme.CornerRadius.md)
            }

            Button {
                deleteRoom()
            } label: {
                HStack {
                    Image(systemName: "trash")
                    Text("Delete Room")
                }
                .font(AppTheme.Typography.callout)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.md)
                .background(Color.error)
                .cornerRadius(AppTheme.CornerRadius.md)
            }
        }
    }

    // MARK: - Export Options Sheet
    private var exportOptionsSheet: some View {
        NavigationView {
            List {
                Section {
                    Button {
                        exportToBackend()
                        showingExportOptions = false
                    } label: {
                        HStack {
                            Image(systemName: "cloud.fill")
                            Text("Export USDZ to Backend")
                            Spacer()
                            if viewModel.isExporting {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(viewModel.isExporting)
                } header: {
                    Text("Export Options")
                }

                Section {
                    Text("The 3D model will be exported as a USDZ file and sent to your dashboard. The backend will convert it to GLB/GLTF for web viewing.")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)
                }
            }
            .navigationTitle("Export Room")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        showingExportOptions = false
                    }
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func saveChanges() {
        var updatedRoom = room
        updatedRoom.name = editedName
        updatedRoom.type = editedType
        updatedRoom.notes = editedNotes.isEmpty ? nil : editedNotes

        do {
            try viewModel.updateRoom(updatedRoom)
        } catch {
            print("Failed to update room: \(error)")
        }
    }

    private func deleteRoom() {
        do {
            try viewModel.deleteRoom(room)
            dismiss()
        } catch {
            print("Failed to delete room: \(error)")
        }
    }

    private func generateAndPreviewUSDZ() {
        Task {
            do {
                if let url = try await viewModel.exportRoomAsUSDZ(room) {
                    usdzURL = url
                }
            } catch {
                print("Failed to generate USDZ: \(error)")
            }
        }
    }

    private func exportToBackend() {
        Task {
            do {
                try await viewModel.exportToBackend(room)
            } catch {
                print("Failed to export to backend: \(error)")
            }
        }
    }
}

// MARK: - Supporting Views

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(AppTheme.Typography.callout)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(AppTheme.Typography.callout)
                .foregroundColor(.textPrimary)
        }
        .padding(AppTheme.Spacing.sm)
    }
}

struct DimensionCard: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: AppTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.appPrimary)

            Text(value)
                .font(AppTheme.Typography.headline)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppTheme.Spacing.md)
        .background(Color.appBackground)
        .cornerRadius(AppTheme.CornerRadius.sm)
    }
}

struct FurnitureRow: View {
    let item: FurnitureItem

    var body: some View {
        HStack {
            Image(systemName: furnitureIcon(for: item.category))
                .foregroundColor(.appPrimary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(item.name)
                    .font(AppTheme.Typography.callout)
                    .foregroundColor(.textPrimary)

                Text(item.category.rawValue)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Text(String(format: "%.1f×%.1f m", item.dimensions.width, item.dimensions.depth))
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
        .padding(.vertical, AppTheme.Spacing.xs)
    }

    private func furnitureIcon(for category: FurnitureCategory) -> String {
        switch category {
        case .bed: return "bed.double.fill"
        case .chair: return "chair.fill"
        case .table: return "table.furniture.fill"
        case .sofa: return "sofa.fill"
        case .storage: return "cabinet.fill"
        case .appliance: return "refrigerator.fill"
        case .other: return "cube.box.fill"
        }
    }
}

// MARK: - Room 3D View Representable

import SceneKit

struct Room3DViewRepresentable: UIViewRepresentable {
    let room: Room
    @ObservedObject var viewModel: RoomViewModel

    func makeUIView(context: Context) -> SCNView {
        let sceneView = SCNView()
        sceneView.backgroundColor = UIColor.systemBackground
        sceneView.allowsCameraControl = true
        sceneView.autoenablesDefaultLighting = true

        // Check if we have the captured room data
        if let capturedRoom = viewModel.getCapturedRoom(for: room.id) {
            // Export to USDZ and load in SceneKit
            Task {
                do {
                    // Create temporary USDZ file
                    let tempURL = FileManager.default.temporaryDirectory
                        .appendingPathComponent("\(room.id.uuidString).usdz")

                    // Export the captured room to USDZ
                    try capturedRoom.export(to: tempURL)

                    await MainActor.run {
                        // Load the USDZ into SceneKit
                        if let scene = try? SCNScene(url: tempURL, options: nil) {
                            sceneView.scene = scene

                            // Set up camera
                            let cameraNode = SCNNode()
                            cameraNode.camera = SCNCamera()
                            cameraNode.position = SCNVector3(x: 0, y: 2, z: 5)
                            scene.rootNode.addChildNode(cameraNode)

                            // Point camera at the center
                            cameraNode.look(at: SCNVector3(x: 0, y: 0, z: 0))
                        }
                    }
                } catch {
                    print("Failed to export/load 3D model: \(error)")
                }
            }
        }

        return sceneView
    }

    func updateUIView(_ sceneView: SCNView, context: Context) {
        // No updates needed - scene is loaded once
    }
}
