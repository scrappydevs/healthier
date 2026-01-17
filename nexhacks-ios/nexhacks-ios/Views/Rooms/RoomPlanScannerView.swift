//
//  RoomPlanScannerView.swift
//  nexhacks-ios
//
//  Full-screen RoomPlan AR scanning experience
//

import SwiftUI
import RoomPlan

struct RoomPlanScannerView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var viewModel: RoomViewModel

    @State private var roomCaptureView: RoomCaptureView?
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        ZStack {
            // RoomPlan Capture View
            if let captureView = roomCaptureView {
                RoomCaptureViewRepresentable(
                    captureView: captureView,
                    onCaptureComplete: handleCaptureComplete,
                    onError: handleError
                )
                .edgesIgnoringSafeArea(.all)
            }

            // Top Bar
            VStack {
                HStack {
                    Button {
                        stopScanningAndDismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.title3)
                            .foregroundColor(.white)
                            .padding(AppTheme.Spacing.md)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    Spacer()

                    if viewModel.isScanning {
                        Text("Scanning...")
                            .font(AppTheme.Typography.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, AppTheme.Spacing.md)
                            .padding(.vertical, AppTheme.Spacing.sm)
                            .background(Color.black.opacity(0.5))
                            .cornerRadius(AppTheme.CornerRadius.sm)
                    }
                }
                .padding(AppTheme.Spacing.md)

                Spacer()

                // Done Button at bottom
                if viewModel.isScanning {
                    Button {
                        finishScanning()
                    } label: {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Done")
                        }
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppTheme.Spacing.xl)
                        .padding(.vertical, AppTheme.Spacing.md)
                        .background(Color.appPrimary)
                        .cornerRadius(AppTheme.CornerRadius.lg)
                        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .padding(.bottom, AppTheme.Spacing.xl)
                }
            }
        }
        .onAppear {
            setupRoomCapture()
        }
        .alert("Scanning Error", isPresented: $showError) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text(errorMessage)
        }
    }

    private func setupRoomCapture() {
        guard RoomCaptureSession.isSupported else {
            errorMessage = "RoomPlan is not supported on this device. Requires iPhone 12 Pro or later with LiDAR."
            showError = true
            return
        }

        let captureView = RoomCaptureView(frame: .zero)
        self.roomCaptureView = captureView
        viewModel.startScanning(with: captureView)
    }

    private func finishScanning() {
        // Stop the capture session - this will trigger didEndWith delegate method
        roomCaptureView?.captureSession.stop()
    }

    private func stopScanningAndDismiss() {
        // Cancel scanning without saving
        roomCaptureView?.captureSession.stop()
        dismiss()
    }

    private func handleCaptureComplete(capturedRoom: CapturedRoom) {
        viewModel.processCapturedRoom(capturedRoom)
        dismiss()
    }

    private func handleError(_ error: Error) {
        errorMessage = error.localizedDescription
        showError = true
    }
}

// MARK: - RoomCaptureView UIKit Wrapper

struct RoomCaptureViewRepresentable: UIViewRepresentable {
    let captureView: RoomCaptureView
    let onCaptureComplete: (CapturedRoom) -> Void
    let onError: (Error) -> Void

    func makeUIView(context: Context) -> RoomCaptureView {
        captureView.captureSession.delegate = context.coordinator
        return captureView
    }

    func updateUIView(_ uiView: RoomCaptureView, context: Context) {
        // No updates needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(
            onCaptureComplete: onCaptureComplete,
            onError: onError
        )
    }

    class Coordinator: NSObject, RoomCaptureSessionDelegate {
        let onCaptureComplete: (CapturedRoom) -> Void
        let onError: (Error) -> Void

        // Keep track of the latest captured room during scanning
        private var latestCapturedRoom: CapturedRoom?

        init(
            onCaptureComplete: @escaping (CapturedRoom) -> Void,
            onError: @escaping (Error) -> Void
        ) {
            self.onCaptureComplete = onCaptureComplete
            self.onError = onError
        }

        func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
            // Store the latest room update - this is the CapturedRoom we'll use
            latestCapturedRoom = room
        }

        func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: Error?) {
            if let error = error {
                DispatchQueue.main.async {
                    self.onError(error)
                }
                return
            }

            // Use the final captured room from didUpdate
            guard let finalRoom = latestCapturedRoom else {
                DispatchQueue.main.async {
                    self.onError(RoomPlanError.processingFailed)
                }
                return
            }

            DispatchQueue.main.async {
                self.onCaptureComplete(finalRoom)
            }
        }
    }
}
