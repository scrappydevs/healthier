//
//  ClaudeAPIService.swift
//  nexhacks-ios
//
//  Claude API integration for AI-powered analysis
//

import Foundation
import UIKit

// MARK: - Claude API Configuration

struct ClaudeConfig {
    // Store your API key securely - use environment variable or Secrets.swift
    static var apiKey: String {
        // 1. Try environment variable (CI/CD or Scheme)
        if let key = ProcessInfo.processInfo.environment["CLAUDE_API_KEY"], !key.isEmpty {
            return key
        }
        
        // 2. Fallback to Secrets.swift (Local Dev)
        // Note: Make sure you have added Secrets.swift to your Xcode project!
        return Secrets.claudeApiKey
    }
    static let baseURL = "https://api.anthropic.com/v1/messages"
    static let model = "claude-sonnet-4-20250514"
}

// MARK: - Response Models

struct MedicationPlanResult: Codable {
    let medications: [ParsedMedication]
}

struct ParsedMedication: Codable, Identifiable {
    var id: UUID = UUID()
    let name: String
    let dosage: String
    let frequency: String
    let form: String
    let instructions: String?
    let times: [String]
    let pillDescription: String?
    
    enum CodingKeys: String, CodingKey {
        case name, dosage, frequency, form, instructions, times, pillDescription
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.name = try container.decode(String.self, forKey: .name)
        self.dosage = try container.decode(String.self, forKey: .dosage)
        self.frequency = try container.decode(String.self, forKey: .frequency)
        self.form = try container.decode(String.self, forKey: .form)
        self.instructions = try container.decodeIfPresent(String.self, forKey: .instructions)
        self.times = try container.decodeIfPresent([String].self, forKey: .times) ?? []
        self.pillDescription = try container.decodeIfPresent(String.self, forKey: .pillDescription)
    }
    
    init(name: String, dosage: String, frequency: String, form: String, instructions: String?, times: [String], pillDescription: String?) {
        self.id = UUID()
        self.name = name
        self.dosage = dosage
        self.frequency = frequency
        self.form = form
        self.instructions = instructions
        self.times = times
        self.pillDescription = pillDescription
    }
}

struct PillVerificationResult: Codable {
    let isMatch: Bool
    let confidence: Double
    let matchedMedicationName: String?
    let detectedDescription: String
    let warnings: [String]
    let recommendation: String
    let detectedPillCount: Int?
    let expectedPillCount: Int?
    let isCorrectDose: Bool
    let dosageWarning: String?

    enum CodingKeys: String, CodingKey {
        case isMatch, confidence, matchedMedicationName, detectedDescription
        case warnings, recommendation, detectedPillCount, expectedPillCount
        case isCorrectDose, dosageWarning
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.isMatch = try container.decode(Bool.self, forKey: .isMatch)
        self.confidence = try container.decode(Double.self, forKey: .confidence)
        self.matchedMedicationName = try container.decodeIfPresent(String.self, forKey: .matchedMedicationName)
        self.detectedDescription = try container.decode(String.self, forKey: .detectedDescription)
        self.warnings = try container.decodeIfPresent([String].self, forKey: .warnings) ?? []
        self.recommendation = try container.decode(String.self, forKey: .recommendation)
        self.detectedPillCount = try container.decodeIfPresent(Int.self, forKey: .detectedPillCount)
        self.expectedPillCount = try container.decodeIfPresent(Int.self, forKey: .expectedPillCount)
        self.isCorrectDose = try container.decodeIfPresent(Bool.self, forKey: .isCorrectDose) ?? true
        self.dosageWarning = try container.decodeIfPresent(String.self, forKey: .dosageWarning)
    }

    init(
        isMatch: Bool,
        confidence: Double,
        matchedMedicationName: String?,
        detectedDescription: String,
        warnings: [String],
        recommendation: String,
        detectedPillCount: Int?,
        expectedPillCount: Int?,
        isCorrectDose: Bool,
        dosageWarning: String?
    ) {
        self.isMatch = isMatch
        self.confidence = confidence
        self.matchedMedicationName = matchedMedicationName
        self.detectedDescription = detectedDescription
        self.warnings = warnings
        self.recommendation = recommendation
        self.detectedPillCount = detectedPillCount
        self.expectedPillCount = expectedPillCount
        self.isCorrectDose = isCorrectDose
        self.dosageWarning = dosageWarning
    }
}

struct PillVerificationWarningsResult: Codable {
    let warnings: [String]
    let detectedPillCount: Int?
    let medicationMatch: String?
    let confidence: Double?
    let detectedDescription: String?

    enum CodingKeys: String, CodingKey {
        case warnings
        case detectedPillCount = "detected_pill_count"
        case medicationMatch = "medication_match"
        case confidence
        case detectedDescription = "detected_description"
    }
}

struct NutritionAnalysis: Codable {
    let mealName: String
    let healthRating: Double
    let gutHealthScore: Double
    let proteinQualityScore: Double
    let fiberScore: Double
    let sugarScore: Double
    let estimatedCalories: Double
    let estimatedProtein: Double
    let estimatedCarbs: Double
    let estimatedFat: Double
    let foodGroups: [String]
    let vitaminsPresent: [String]
    let vitaminsSummary: String
    let analysis: String
    let recommendations: [String]
}

// MARK: - Claude API Service

@MainActor
class ClaudeAPIService: ObservableObject {
    @Published var isProcessing: Bool = false
    @Published var lastError: Error?
    
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Medication Plan Analysis
    
    /// Analyze a medication plan image and extract medication details
    func analyzeMedicationPlan(imageData: Data) async throws -> [ParsedMedication] {
        isProcessing = true
        defer { isProcessing = false }
        
        let base64Image = imageData.base64EncodedString()
        
        let prompt = """
        Analyze this medication plan/prescription image and extract all medications listed.
        
        For each medication, provide:
        - name: The medication name
        - dosage: The dosage amount (e.g., "10mg", "500mg")
        - frequency: How often to take it (e.g., "Once daily", "Twice daily", "Every 8 hours")
        - form: The form of medication (e.g., "Tablet", "Capsule", "Liquid", "Injection")
        - instructions: Any special instructions (e.g., "Take with food", "Take on empty stomach")
        - times: Array of times to take the medication (e.g., ["8:00 AM", "8:00 PM"])
        - pillDescription: A brief visual description of the pill if visible or mentioned (color, shape, markings)
        
        Respond ONLY with valid JSON in this exact format:
        {
            "medications": [
                {
                    "name": "Medication Name",
                    "dosage": "10mg",
                    "frequency": "Once daily",
                    "form": "Tablet",
                    "instructions": "Take with food",
                    "times": ["8:00 AM"],
                    "pillDescription": "White round tablet with 'M10' imprint"
                }
            ]
        }
        
        If no medications are found or the image is unclear, return an empty medications array.
        """
        
        let response = try await sendImageRequest(base64Image: base64Image, prompt: prompt)
        
        // Parse the JSON response
        guard let jsonData = response.data(using: .utf8) else {
            throw ClaudeAPIError.invalidResponse
        }
        
        let result = try JSONDecoder().decode(MedicationPlanResult.self, from: jsonData)
        return result.medications
    }
    
    // MARK: - Pill Verification

    /// Verify if a scanned pill matches an expected medication and check dose count
    func verifyPill(imageData: Data, expectedMedication: Medication) async throws -> PillVerificationResult {
        isProcessing = true
        defer { isProcessing = false }

        let base64Image = imageData.base64EncodedString()
        let expectedCount = expectedMedication.expectedPillCount

        let prompt = """
        You are helping verify that pills match an expected medication for an elderly patient.
        The goal is safety. You should NOT attempt to confirm identity; only return warnings.

        Expected medication:
        - Name: \(expectedMedication.name)
        - Dosage: \(expectedMedication.dosage)
        - Form: \(expectedMedication.form.rawValue)
        - Description: \(expectedMedication.pillDescription ?? "Not provided")
        - Expected pill count: \(expectedCount) pill(s) per dose

        Tasks:
        1) Estimate how many pills are visible in the image.
        2) Indicate if the pill appears to match the expected medication.
        3) Provide short, clear warnings suitable for an elderly person.

        Respond ONLY with valid JSON in this exact format:
        {
            "detected_pill_count": 2,
            "medication_match": "match" | "possible_mismatch" | "mismatch",
            "confidence": 0.0-1.0,
            "detected_description": "Short description of what you see",
            "warnings": [
                "Short warning for the patient"
            ]
        }

        If you are unsure about the medication, use "possible_mismatch" (not "mismatch").
        If you cannot confidently identify the pill, include a warning telling the user to double-check.
        Keep warnings short, clear, and suitable for an elderly person.
        """

        let response = try await sendImageRequest(base64Image: base64Image, prompt: prompt)

        guard let jsonData = response.data(using: .utf8) else {
            throw ClaudeAPIError.invalidResponse
        }

        let warningsResult = try JSONDecoder().decode(PillVerificationWarningsResult.self, from: jsonData)
        let warnings = warningsResult.warnings.isEmpty
            ? ["Pill could not be confidently identified. Please double-check before taking."]
            : warningsResult.warnings

        let matchValue = (warningsResult.medicationMatch ?? "possible_mismatch").lowercased()
        let isMatch = matchValue == "match"
        let detectedCount = warningsResult.detectedPillCount
        let isCorrectDose = detectedCount.map { $0 == expectedCount } ?? true
        let dosageWarning = dosageWarningText(detected: detectedCount, expected: expectedCount)
        let confidence = warningsResult.confidence ?? 0.0
        let description = warningsResult.detectedDescription ?? "Pill could not be confidently identified."

        return PillVerificationResult(
            isMatch: isMatch,
            confidence: confidence,
            matchedMedicationName: isMatch ? expectedMedication.name : nil,
            detectedDescription: description,
            warnings: warnings,
            recommendation: "Double-check the pill before taking it.",
            detectedPillCount: detectedCount,
            expectedPillCount: expectedCount,
            isCorrectDose: isCorrectDose,
            dosageWarning: dosageWarning
        )
    }

    private func dosageWarningText(detected: Int?, expected: Int) -> String? {
        guard let detected = detected else { return nil }
        if detected > expected {
            let diff = detected - expected
            return "TOO MANY PILLS: You have \(detected) pills but should only take \(expected). Please remove \(diff) pill(s)."
        }
        if detected < expected {
            let diff = expected - detected
            return "NOT ENOUGH PILLS: You have \(detected) pills but need \(expected). Please add \(diff) more pill(s)."
        }
        return nil
    }
    
    // MARK: - Food Analysis
    
    /// Analyze a food image and estimate nutritional content
    func analyzeFoodImage(imageData: Data, mealType: MealType) async throws -> NutritionAnalysis {
        isProcessing = true
        defer { isProcessing = false }
        
        let base64Image = imageData.base64EncodedString()
        
        let prompt = """
        Analyze this \(mealType.rawValue.lowercased()) meal image and provide a nutritional assessment.
        
        This is for an elderly care app, so focus on:
        - Overall healthiness of the meal
        - Protein content (important for elderly)
        - Key vitamins and nutrients
        - General food groups present
        - Specific health scores (Gut health, Protein quality, Fiber, Sugar)
        
        Provide ESTIMATES - they don't need to be exact, just reasonable approximations.
        
        Respond ONLY with valid JSON in this exact format:
        {
            "mealName": "Brief description of the meal",
            "healthRating": 75,
            "gutHealthScore": 8.5,
            "proteinQualityScore": 7.0,
            "fiberScore": 6.5,
            "sugarScore": 4.0,
            "estimatedCalories": 450,
            "estimatedProtein": 25,
            "estimatedCarbs": 40,
            "estimatedFat": 15,
            "foodGroups": ["Protein", "Vegetables", "Grains"],
            "vitaminsPresent": ["Vitamin A", "Vitamin C", "Iron"],
            "vitaminsSummary": "Good source of vitamins A and C from vegetables",
            "analysis": "This meal provides a balanced mix of protein and vegetables...",
            "recommendations": ["Consider adding more fiber", "Good protein content"]
        }
        
        Health rating should be 0-100.
        
        Specific Scores (0-10 scale):
        - gutHealthScore: How good is it for digestion/gut microbiome? (High fiber/probiotics = high score)
        - proteinQualityScore: How complete/high-quality is the protein?
        - fiberScore: Richness in fiber?
        - sugarScore: LOW sugar is BETTER. So 10 means very low sugar (healthy), 0 means very high sugar (unhealthy).
        
        Food groups can include: Protein, Vegetables, Fruits, Grains, Dairy, Fats/Oils
        Keep the analysis simple and encouraging for elderly users.
        """
        
        let response = try await sendImageRequest(base64Image: base64Image, prompt: prompt)
        
        guard let jsonData = response.data(using: .utf8) else {
            throw ClaudeAPIError.invalidResponse
        }
        
        return try JSONDecoder().decode(NutritionAnalysis.self, from: jsonData)
    }
    
    // MARK: - Private Methods
    
    private func sendImageRequest(base64Image: String, prompt: String) async throws -> String {
        guard let url = URL(string: ClaudeConfig.baseURL) else {
            throw ClaudeAPIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(ClaudeConfig.apiKey, forHTTPHeaderField: "x-api-key")
        request.addValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        
        let body: [String: Any] = [
            "model": ClaudeConfig.model,
            "max_tokens": 2048,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "image",
                            "source": [
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64Image
                            ]
                        ],
                        [
                            "type": "text",
                            "text": prompt
                        ]
                    ]
                ]
            ]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeAPIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw ClaudeAPIError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }
        
        // Parse Claude's response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]],
              let firstContent = content.first,
              let text = firstContent["text"] as? String else {
            throw ClaudeAPIError.invalidResponse
        }
        
        // Extract JSON from the response (Claude might include extra text)
        return extractJSON(from: text)
    }
    
    private func extractJSON(from text: String) -> String {
        // Try to find JSON object in the response
        if let startIndex = text.firstIndex(of: "{"),
           let endIndex = text.lastIndex(of: "}") {
            return String(text[startIndex...endIndex])
        }
        return text
    }
}

// MARK: - Errors

enum ClaudeAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(statusCode: Int, message: String)
    case parsingError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from API"
        case .apiError(let code, let message):
            return "API Error (\(code)): \(message)"
        case .parsingError(let message):
            return "Failed to parse response: \(message)"
        }
    }
}

