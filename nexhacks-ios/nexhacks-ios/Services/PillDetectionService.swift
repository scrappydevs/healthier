//
//  PillDetectionService.swift
//  nexhacks-ios
//
//  Local CoreML + Vision pill detection for dose verification
//

import CoreML
import Foundation
import UIKit

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
    private let minimumConfidence: Float = 0.4
    private let iouThreshold: Float = 0.45
    private let maxDetections = 50
    private let inputSize = CGSize(width: 640, height: 640)

    func detectPills(in image: UIImage) async throws -> PillDetectionOutput {
        guard let pixelBuffer = image.pixelBuffer(
            width: Int(inputSize.width),
            height: Int(inputSize.height)
        ) else {
            throw PillDetectionError.invalidImage
        }

        let config = MLModelConfiguration()
        let model = try PillYOLO(configuration: config)
        let output = try model.prediction(image: pixelBuffer)

        let detections = decodeDetections(output.var_909ShapedArray)
        let filtered = nonMaxSuppression(detections, iouThreshold: iouThreshold, maxDetections: maxDetections)

        let count = filtered.count
        let averageConfidence = averageConfidence(for: filtered)
        let description = "Detected \(count) pill(s) in the image."
        let warnings = detectionWarnings(count: count, confidence: Double(averageConfidence))

        return PillDetectionOutput(
            count: count,
            averageConfidence: Double(averageConfidence),
            description: description,
            warnings: warnings
        )
    }

    private struct Detection {
        let x: Float
        let y: Float
        let w: Float
        let h: Float
        let score: Float
        let classIndex: Int
    }

    private func decodeDetections(_ output: MLShapedArray<Float>) -> [Detection] {
        guard output.shape.count == 3 else { return [] }

        let channels = output.shape[1]
        let boxCount = output.shape[2]

        var detections: [Detection] = []
        detections.reserveCapacity(min(boxCount, maxDetections))

        for i in 0..<boxCount {
            let x = output[0, 0, i]
            let y = output[0, 1, i]
            let w = output[0, 2, i]
            let h = output[0, 3, i]
            let objectness = output[0, 4, i]

            var classScore: Float = 1
            var classIndex = 0
            if channels > 5 {
                var bestScore: Float = 0
                var bestIndex = 0
                for c in 5..<channels {
                    let score = output[0, c, i]
                    if score > bestScore {
                        bestScore = score
                        bestIndex = c - 5
                    }
                }
                classScore = bestScore
                classIndex = bestIndex
            }

            let score = objectness * classScore
            guard score >= minimumConfidence else { continue }

            detections.append(Detection(x: x, y: y, w: w, h: h, score: score, classIndex: classIndex))
        }

        return detections.sorted { $0.score > $1.score }
    }

    private func nonMaxSuppression(_ detections: [Detection], iouThreshold: Float, maxDetections: Int) -> [Detection] {
        var selected: [Detection] = []
        var remaining = detections

        while !remaining.isEmpty && selected.count < maxDetections {
            let current = remaining.removeFirst()
            selected.append(current)

            remaining = remaining.filter { candidate in
                iou(current, candidate) < iouThreshold
            }
        }

        return selected
    }

    private func iou(_ a: Detection, _ b: Detection) -> Float {
        let ax1 = a.x - a.w / 2
        let ay1 = a.y - a.h / 2
        let ax2 = a.x + a.w / 2
        let ay2 = a.y + a.h / 2

        let bx1 = b.x - b.w / 2
        let by1 = b.y - b.h / 2
        let bx2 = b.x + b.w / 2
        let by2 = b.y + b.h / 2

        let interX1 = max(ax1, bx1)
        let interY1 = max(ay1, by1)
        let interX2 = min(ax2, bx2)
        let interY2 = min(ay2, by2)

        let interW = max(0, interX2 - interX1)
        let interH = max(0, interY2 - interY1)
        let interArea = interW * interH

        let areaA = max(0, ax2 - ax1) * max(0, ay2 - ay1)
        let areaB = max(0, bx2 - bx1) * max(0, by2 - by1)
        let union = areaA + areaB - interArea

        if union <= 0 { return 0 }
        return interArea / union
    }

    private func averageConfidence(for detections: [Detection]) -> Float {
        guard !detections.isEmpty else { return 0 }
        let total = detections.reduce(0) { $0 + $1.score }
        return total / Float(detections.count)
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

private extension UIImage {
    func pixelBuffer(width: Int, height: Int) -> CVPixelBuffer? {
        let attrs: [CFString: Any] = [
            kCVPixelBufferCGImageCompatibilityKey: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey: true
        ]

        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            attrs as CFDictionary,
            &pixelBuffer
        )

        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

        guard let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
        ) else {
            return nil
        }

        context.interpolationQuality = .high
        context.draw(
            self.cgImage ?? self.cgImageFromImageRenderer(),
            in: CGRect(x: 0, y: 0, width: width, height: height)
        )

        return buffer
    }

    private func cgImageFromImageRenderer() -> CGImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            draw(in: CGRect(origin: .zero, size: size))
        }.cgImage!
    }
}
