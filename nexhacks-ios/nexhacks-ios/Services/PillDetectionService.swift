//
//  PillDetectionService.swift
//  nexhacks-ios
//
//  Local CoreML + Vision pill detection for dose verification
//

import CoreML
import Foundation
import UIKit
import Vision

struct PillDetectionOutput {
    let count: Int
    let averageConfidence: Double
    let description: String
    let warnings: [String]
}

enum PillDetectionError: LocalizedError {
    case modelNotFound(String)
    case invalidImage
    case detectionFailed

    var errorDescription: String? {
        switch self {
        case .modelNotFound(let name):
            return "Pill detection model not found: \(name)"
        case .invalidImage:
            return "Invalid image for pill detection"
        case .detectionFailed:
            return "Failed to run pill detection"
        }
    }
}

final class PillDetectionService {
    private let modelResourceName = "PillYOLO"
    private let modelExtension = "mlpackage"
    private let minimumConfidence: VNConfidence = 0.4
    private let allowedLabels: Set<String> = []

    private lazy var visionModel: VNCoreMLModel? = {
        let config = MLModelConfiguration()

        if let generated = try? PillYOLO(configuration: config) {
            return try? VNCoreMLModel(for: generated.model)
        }

        guard let modelURL = Bundle.main.url(
            forResource: modelResourceName,
            withExtension: modelExtension
        ) else {
            return nil
        }

        guard let model = try? MLModel(contentsOf: modelURL, configuration: config) else {
            return nil
        }
        return try? VNCoreMLModel(for: model)
    }()

    func detectPills(in image: UIImage) async throws -> PillDetectionOutput {
        guard let cgImage = image.cgImage else {
            throw PillDetectionError.invalidImage
        }

        let orientation = CGImagePropertyOrientation(image.imageOrientation)
        guard let visionModel else {
            throw PillDetectionError.modelNotFound("\(modelResourceName).\(modelExtension)")
        }

        let request = VNCoreMLRequest(model: visionModel)
        request.imageCropAndScaleOption = .scaleFill

        let handler = VNImageRequestHandler(
            cgImage: cgImage,
            orientation: orientation,
            options: [:]
        )

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try handler.perform([request])
                    let results = request.results as? [VNRecognizedObjectObservation] ?? []
                    let filtered = self.filterObservations(results)
                    let count = filtered.count
                    let averageConfidence = self.averageConfidence(for: filtered)
                    let description = "Detected \(count) pill(s) in the image."
                    let warnings = self.detectionWarnings(count: count, confidence: averageConfidence)
                    continuation.resume(
                        returning: PillDetectionOutput(
                            count: count,
                            averageConfidence: averageConfidence,
                            description: description,
                            warnings: warnings
                        )
                    )
                } catch {
                    continuation.resume(throwing: PillDetectionError.detectionFailed)
                }
            }
        }
    }

    private func filterObservations(_ observations: [VNRecognizedObjectObservation]) -> [VNRecognizedObjectObservation] {
        if allowedLabels.isEmpty {
            return observations.filter { $0.confidence >= minimumConfidence }
        }

        return observations.filter { observation in
            guard let topLabel = observation.labels.max(by: { $0.confidence < $1.confidence }) else {
                return false
            }
            return allowedLabels.contains(topLabel.identifier.lowercased()) && topLabel.confidence >= minimumConfidence
        }
    }

    private func averageConfidence(for observations: [VNRecognizedObjectObservation]) -> Double {
        guard !observations.isEmpty else { return 0 }
        let total = observations.reduce(0.0) { $0 + Double($1.confidence) }
        return total / Double(observations.count)
    }

    private func detectionWarnings(count: Int, confidence: Double) -> [String] {
        var warnings: [String] = []
        if count == 0 {
            warnings.append("No pills detected. Make sure the photo is clear and well-lit.")
        }
        if confidence > 0 && confidence < 0.5 {
            warnings.append("Low detection confidence. Consider retaking the photo.")
        }
        return warnings
    }
}

private extension CGImagePropertyOrientation {
    init(_ uiOrientation: UIImage.Orientation) {
        switch uiOrientation {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
