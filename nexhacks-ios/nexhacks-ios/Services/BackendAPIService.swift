//
//  BackendAPIService.swift
//  nexhacks-ios
//
//  Service for communicating with FastAPI backend
//

import Foundation
import UIKit

// MARK: - Backend Configuration

struct BackendConfig {
    // Backend API base URL
    static var baseURL: String {
        // Try environment variable first
        if let url = ProcessInfo.processInfo.environment["BACKEND_BASE_URL"], !url.isEmpty {
            return url
        }
        
        // Default to localhost for development
        #if DEBUG
        return "http://localhost:8000"
        #else
        // For production, set BACKEND_BASE_URL environment variable
        return ProcessInfo.processInfo.environment["BACKEND_BASE_URL"] ?? "http://localhost:8000"
        #endif
    }
}

// MARK: - Response Models

struct PillDetectionResponse: Codable {
    let success: Bool
    let pillCount: Int
    let boundedImageUrl: String
    let detections: [Detection]
    let warnings: [String]
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case pillCount = "pill_count"
        case boundedImageUrl = "bounded_image_url"
        case detections
        case warnings
        case error
    }
}

struct Detection: Codable {
    let confidence: Double
    let bbox: [Double]  // [x, y, width, height]
}

// MARK: - Backend API Service

enum BackendAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(statusCode: Int, message: String)
    case networkError(Error)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid backend URL"
        case .invalidResponse:
            return "Invalid response from backend"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        }
    }
}

@MainActor
class BackendAPIService: ObservableObject {
    @Published var isProcessing: Bool = false
    @Published var lastError: Error?
    
    private let session: URLSession
    private let baseURL: String
    
    init(baseURL: String? = nil) {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        self.session = URLSession(configuration: config)
        self.baseURL = baseURL ?? BackendConfig.baseURL
    }
    
    // MARK: - Pill Detection
    
    /// Detect pills in an image and get back annotated image with bounding boxes
    func detectPills(imageData: Data, userId: String? = nil) async throws -> PillDetectionResponse {
        isProcessing = true
        defer { isProcessing = false }
        
        // Construct URL
        guard let url = URL(string: "\(baseURL)/api/v1/pills/detect") else {
            throw BackendAPIError.invalidURL
        }
        
        // Create multipart form data
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add image file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"pill_image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add optional user_id
        if let userId = userId {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"user_id\"\r\n\r\n".data(using: .utf8)!)
            body.append(userId.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        // Send request
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw BackendAPIError.invalidResponse
            }
            
            // Check status code
            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw BackendAPIError.serverError(statusCode: httpResponse.statusCode, message: errorMessage)
            }
            
            // Decode response
            do {
                let decoder = JSONDecoder()
                let detectionResponse = try decoder.decode(PillDetectionResponse.self, from: data)
                return detectionResponse
            } catch {
                throw BackendAPIError.decodingError(error)
            }
            
        } catch let error as BackendAPIError {
            lastError = error
            throw error
        } catch {
            let wrappedError = BackendAPIError.networkError(error)
            lastError = wrappedError
            throw wrappedError
        }
    }
    
    /// Download an image from a URL
    func downloadImage(from urlString: String) async throws -> UIImage {
        guard let url = URL(string: urlString) else {
            throw BackendAPIError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw BackendAPIError.invalidResponse
        }
        
        guard let image = UIImage(data: data) else {
            throw BackendAPIError.invalidResponse
        }
        
        return image
    }
    
    // MARK: - Health Check
    
    /// Check if backend is available
    func healthCheck() async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/api/v1/pills/health") else {
            throw BackendAPIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 5
        
        do {
            let (_, response) = try await session.data(for: request)
            
            if let httpResponse = response as? HTTPURLResponse {
                return httpResponse.statusCode == 200
            }
            return false
        } catch {
            return false
        }
    }
}

// MARK: - Helper Extensions

private extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
