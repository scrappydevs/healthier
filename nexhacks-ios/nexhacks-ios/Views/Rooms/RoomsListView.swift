//
//  RoomsListView.swift
//  nexhacks-ios
//
//  Rooms list view with scan functionality
//

import SwiftUI

struct RoomsListView: View {
    @StateObject var viewModel: RoomViewModel
    @State private var showingScanner = false
    @State private var selectedRoom: Room?

    init(viewModel: RoomViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.appBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Text("Rooms")
                            .font(AppTheme.Typography.title)
                            .foregroundColor(.textPrimary)

                        Spacer()
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.top, AppTheme.Spacing.md)
                    .padding(.bottom, AppTheme.Spacing.md)

                    if viewModel.rooms.isEmpty {
                        emptyState
                    } else {
                        ScrollView {
                            VStack(spacing: AppTheme.Spacing.md) {
                                // Stats Card
                                statsCard

                                // Rooms Grid
                                LazyVStack(spacing: AppTheme.Spacing.md) {
                                    ForEach(viewModel.rooms) { room in
                                        RoomCard(room: room) {
                                            selectedRoom = room
                                        }
                                    }
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
                            showingScanner = true
                        } label: {
                            Image(systemName: "plus")
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
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarHidden(true)
            .sheet(isPresented: $showingScanner) {
                RoomPlanScannerView(viewModel: viewModel)
            }
            .sheet(item: $selectedRoom) { room in
                RoomDetailView(room: room, viewModel: viewModel)
            }
        }
    }

    // MARK: - Stats Card
    private var statsCard: some View {
        HStack(spacing: AppTheme.Spacing.lg) {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text("\(viewModel.rooms.count)")
                    .font(AppTheme.Typography.title)
                    .foregroundColor(.textPrimary)

                Text("Rooms Scanned")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Divider()
                .frame(height: 40)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(String(format: "%.1f m²", viewModel.totalScannedArea))
                    .font(AppTheme.Typography.title)
                    .foregroundColor(.textPrimary)

                Text("Total Area")
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
        .padding(AppTheme.Spacing.md)
        .background(Color.cardBackground)
        .cornerRadius(AppTheme.CornerRadius.md)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Image(systemName: "camera.metering.center.weighted")
                .font(.system(size: 60))
                .foregroundColor(.appPrimary)

            Text("No rooms scanned yet")
                .font(AppTheme.Typography.title3)
                .foregroundColor(.textPrimary)

            Text("Use your camera to scan and create 3D models of your rooms")
                .font(AppTheme.Typography.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, AppTheme.Spacing.xl)

            Button {
                showingScanner = true
            } label: {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Start Scanning")
                }
                .font(AppTheme.Typography.headline)
                .foregroundColor(.white)
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.vertical, AppTheme.Spacing.md)
                .background(Color.appPrimary)
                .cornerRadius(AppTheme.CornerRadius.md)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Room Card

struct RoomCard: View {
    let room: Room
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text(room.name)
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.textPrimary)

                        Text(room.type.rawValue)
                            .font(AppTheme.Typography.subheadline)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundColor(.textSecondary)
                }

                Divider()

                HStack(spacing: AppTheme.Spacing.lg) {
                    RoomDetailItem(
                        icon: "ruler",
                        text: String(format: "%.1f m²", room.floorArea)
                    )

                    if let height = room.ceilingHeight {
                        RoomDetailItem(
                            icon: "arrow.up.and.down",
                            text: String(format: "%.2f m", height)
                        )
                    }

                    RoomDetailItem(
                        icon: "cube.box",
                        text: "\(room.furnitureItems.count) items"
                    )
                }

                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    Text("Scanned \(room.scannedAt.formatted(.relative(presentation: .named)))")
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(.textSecondary)

                    Spacer()
                }
            }
            .padding(AppTheme.Spacing.md)
            .background(Color.cardBackground)
            .cornerRadius(AppTheme.CornerRadius.md)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct RoomDetailItem: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: AppTheme.Spacing.xs) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.appPrimary)

            Text(text)
                .font(AppTheme.Typography.caption)
                .foregroundColor(.textSecondary)
        }
    }
}
