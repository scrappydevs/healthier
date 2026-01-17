//
//  SupabaseService.swift
//  nexhacks-ios
//
//  Supabase client configuration and storage operations
//

import Foundation
import Supabase

// MARK: - Supabase Client Configuration

struct SupabaseConfig {
    static let projectURL = URL(string: "https://elynkmbekbbdocmstkjr.supabase.co")!
    static let publishableKey = "sb_publishable_WIHAw5LoR5ztt5N8CcMOtw_q63sskC0"
}

let supabase = SupabaseClient(
    supabaseURL: SupabaseConfig.projectURL,
    supabaseKey: SupabaseConfig.publishableKey
)

// MARK: - Storage Bucket Names

enum StorageBucket: String {
    case mealImages = "meal-images"
    case exerciseVideos = "exercise-videos"
    case medicationImages = "medication-images"
}

// MARK: - Supabase Service

@MainActor
class SupabaseService: ObservableObject {
    @Published var isUploading: Bool = false
    @Published var uploadProgress: Double = 0.0
    @Published var lastError: Error?
    
    // Default user ID for demo (would be from auth in production)
    nonisolated static let defaultUserId = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
    
    // MARK: - Storage Operations
    
    /// Upload an image to a storage bucket
    func uploadImage(data: Data, bucket: StorageBucket, fileName: String? = nil) async throws -> String {
        isUploading = true
        defer { isUploading = false }
        
        let name = fileName ?? "\(UUID().uuidString).jpg"
        let path = "uploads/\(name)"
        
        do {
            try await supabase.storage
                .from(bucket.rawValue)
                .upload(
                    path,
                    data: data,
                    options: FileOptions(
                        cacheControl: "3600",
                        contentType: "image/jpeg",
                        upsert: true
                    )
                )
            
            // Get public URL
            let publicURL = try supabase.storage
                .from(bucket.rawValue)
                .getPublicURL(path: path)
            
            return publicURL.absoluteString
        } catch {
            lastError = error
            throw error
        }
    }
    
    /// Upload a video to storage
    func uploadVideo(data: Data, bucket: StorageBucket = .exerciseVideos, fileName: String? = nil) async throws -> String {
        isUploading = true
        defer { isUploading = false }
        
        let name = fileName ?? "\(UUID().uuidString).mp4"
        let path = "uploads/\(name)"
        
        do {
            try await supabase.storage
                .from(bucket.rawValue)
                .upload(
                    path,
                    data: data,
                    options: FileOptions(
                        cacheControl: "3600",
                        contentType: "video/mp4",
                        upsert: true
                    )
                )
            
            let publicURL = try supabase.storage
                .from(bucket.rawValue)
                .getPublicURL(path: path)
            
            return publicURL.absoluteString
        } catch {
            lastError = error
            throw error
        }
    }
    
    /// Upload medication plan image
    func uploadMedicationPlanImage(data: Data) async throws -> String {
        return try await uploadImage(data: data, bucket: .medicationImages)
    }
    
    /// Upload meal image
    func uploadMealImage(data: Data) async throws -> String {
        return try await uploadImage(data: data, bucket: .mealImages)
    }
    
    /// Upload exercise video
    func uploadExerciseVideo(data: Data) async throws -> String {
        return try await uploadVideo(data: data, bucket: .exerciseVideos)
    }
    
    // MARK: - Medication Database Operations
    
    func saveMedication(_ medication: SupabaseMedication) async throws {
        try await supabase
            .from("medications")
            .insert(medication)
            .execute()
    }
    
    func fetchMedications(userId: UUID = defaultUserId) async throws -> [SupabaseMedication] {
        let response: [SupabaseMedication] = try await supabase
            .from("medications")
            .select()
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value
        return response
    }
    
    func updateMedication(_ medication: SupabaseMedication) async throws {
        try await supabase
            .from("medications")
            .update(medication)
            .eq("id", value: medication.id.uuidString)
            .execute()
    }
    
    func deleteMedication(id: UUID) async throws {
        try await supabase
            .from("medications")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
    
    // MARK: - Medication Log Operations
    
    func logMedicationTaken(_ log: SupabaseMedicationLog) async throws {
        try await supabase
            .from("medication_logs")
            .insert(log)
            .execute()
    }
    
    func fetchMedicationLogs(medicationId: UUID) async throws -> [SupabaseMedicationLog] {
        let response: [SupabaseMedicationLog] = try await supabase
            .from("medication_logs")
            .select()
            .eq("medication_id", value: medicationId.uuidString)
            .execute()
            .value
        return response
    }
    
    // MARK: - Meal Database Operations
    
    func saveMeal(_ meal: SupabaseMeal) async throws {
        try await supabase
            .from("meals")
            .insert(meal)
            .execute()
    }
    
    func fetchMeals(userId: UUID = defaultUserId, date: Date? = nil) async throws -> [SupabaseMeal] {
        var query = supabase
            .from("meals")
            .select()
            .eq("user_id", value: userId.uuidString)
        
        if let date = date {
            let calendar = Calendar.current
            let startOfDay = calendar.startOfDay(for: date)
            let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
            
            query = query
                .gte("consumed_at", value: ISO8601DateFormatter().string(from: startOfDay))
                .lt("consumed_at", value: ISO8601DateFormatter().string(from: endOfDay))
        }
        
        let response: [SupabaseMeal] = try await query.execute().value
        return response
    }
    
    func updateMeal(_ meal: SupabaseMeal) async throws {
        try await supabase
            .from("meals")
            .update(meal)
            .eq("id", value: meal.id.uuidString)
            .execute()
    }
    
    func deleteMeal(id: UUID) async throws {
        try await supabase
            .from("meals")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
    
    // MARK: - Exercise Database Operations
    
    func saveExercise(_ exercise: SupabaseExercise) async throws {
        try await supabase
            .from("exercises")
            .insert(exercise)
            .execute()
    }
    
    func fetchExercises(userId: UUID = defaultUserId, date: Date? = nil) async throws -> [SupabaseExercise] {
        var query = supabase
            .from("exercises")
            .select()
            .eq("user_id", value: userId.uuidString)
        
        if let date = date {
            let calendar = Calendar.current
            let startOfDay = calendar.startOfDay(for: date)
            let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
            
            query = query
                .gte("start_time", value: ISO8601DateFormatter().string(from: startOfDay))
                .lt("start_time", value: ISO8601DateFormatter().string(from: endOfDay))
        }
        
        let response: [SupabaseExercise] = try await query.execute().value
        return response
    }
    
    func updateExercise(_ exercise: SupabaseExercise) async throws {
        try await supabase
            .from("exercises")
            .update(exercise)
            .eq("id", value: exercise.id.uuidString)
            .execute()
    }
    
    func deleteExercise(id: UUID) async throws {
        try await supabase
            .from("exercises")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
    
    // MARK: - Daily Summary Operations
    
    func saveDailySummary(_ summary: SupabaseDailySummary) async throws {
        try await supabase
            .from("daily_summaries")
            .upsert(summary)
            .execute()
    }
    
    func fetchDailySummary(userId: UUID = defaultUserId, date: Date) async throws -> SupabaseDailySummary? {
        let dateString = ISO8601DateFormatter().string(from: date).prefix(10) // Just the date part
        
        let response: [SupabaseDailySummary] = try await supabase
            .from("daily_summaries")
            .select()
            .eq("user_id", value: userId.uuidString)
            .eq("date", value: String(dateString))
            .execute()
            .value
        
        return response.first
    }
    
    // MARK: - Journal Entry Operations
    
    /// Get patient_id from user_id
    private func getPatientId(userId: UUID) async throws -> UUID {
        struct PatientIdResponse: Codable {
            let id: UUID
        }
        
        let response: [PatientIdResponse] = try await supabase
            .from("patients")
            .select("id")
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value
        
        guard let patient = response.first else {
            throw NSError(domain: "SupabaseService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Patient not found for user"])
        }
        
        return patient.id
    }
    
    func createJournalEntry(_ entry: JournalEntry, userId: UUID = defaultUserId) async throws {
        let patientId = try await getPatientId(userId: userId)
        
        let journalLog = SupabaseJournalLog(
            id: entry.id,
            patientId: patientId,
            transcript: entry.transcript,
            voiceTranscription: nil,
            durationSeconds: entry.duration.map { Double($0) },
            tags: entry.tags,
            mood: nil,
            sentimentScore: nil,
            aiAnalysis: nil,
            metadata: nil,
            loggedAt: entry.date,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        )
        
        try await supabase
            .from("journal_logs")
            .insert(journalLog)
            .execute()
    }
    
    func updateJournalEntry(_ entry: JournalEntry, userId: UUID = defaultUserId) async throws {
        let patientId = try await getPatientId(userId: userId)
        
        let journalLog = SupabaseJournalLog(
            id: entry.id,
            patientId: patientId,
            transcript: entry.transcript,
            voiceTranscription: nil,
            durationSeconds: entry.duration.map { Double($0) },
            tags: entry.tags,
            mood: nil,
            sentimentScore: nil,
            aiAnalysis: nil,
            metadata: nil,
            loggedAt: entry.date,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
        )
        
        try await supabase
            .from("journal_logs")
            .update(journalLog)
            .eq("id", value: entry.id.uuidString)
            .execute()
    }
    
    func deleteJournalEntry(_ id: UUID) async throws {
        try await supabase
            .from("journal_logs")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
    
    func fetchJournalEntries(userId: UUID = defaultUserId) async throws -> [JournalEntry] {
        let patientId = try await getPatientId(userId: userId)
        
        let response: [SupabaseJournalLog] = try await supabase
            .from("journal_logs")
            .select()
            .eq("patient_id", value: patientId.uuidString)
            .order("logged_at", ascending: false)
            .execute()
            .value
        
        return response.map { log in
            JournalEntry(
                id: log.id,
                transcript: log.transcript,
                date: log.loggedAt,
                duration: log.durationSeconds.map { TimeInterval($0) },
                tags: log.tags ?? [],
                createdAt: log.createdAt,
                updatedAt: log.updatedAt
            )
        }
    }
    
    func getJournalContextForQuestion(_ question: String, userId: UUID = defaultUserId, limit: Int = 10) async throws -> [JournalEntry] {
        let patientId = try await getPatientId(userId: userId)
        
        // Use full-text search on transcript - search for entries containing question keywords
        // For now, fetch recent entries and filter client-side
        // In production, you'd use PostgreSQL full-text search or vector similarity
        let response: [SupabaseJournalLog] = try await supabase
            .from("journal_logs")
            .select()
            .eq("patient_id", value: patientId.uuidString)
            .order("logged_at", ascending: false)
            .limit(limit * 2)
            .execute()
            .value
        
        // Filter entries that contain question keywords
        let keywords = question.lowercased().components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        let filtered = response.filter { log in
            let transcriptLower = log.transcript.lowercased()
            return keywords.isEmpty || keywords.allSatisfy { transcriptLower.contains($0) }
        }
        
        return Array(filtered.prefix(limit)).map { log in
            JournalEntry(
                id: log.id,
                transcript: log.transcript,
                date: log.loggedAt,
                duration: log.durationSeconds.map { TimeInterval($0) },
                tags: log.tags ?? [],
                createdAt: log.createdAt,
                updatedAt: log.updatedAt
            )
        }
    }
}

// MARK: - Supabase Data Models

struct SupabaseMedication: Codable {
    let id: UUID
    let userId: UUID
    let name: String
    let dosage: String
    let frequency: String
    let form: String
    var instructions: String?
    var prescribedBy: String?
    var startDate: Date?
    var endDate: Date?
    var reminderTimes: [String]
    var isActive: Bool
    var sideEffects: [String]
    var planImageUrl: String?
    var pillDescription: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case dosage
        case frequency
        case form
        case instructions
        case prescribedBy = "prescribed_by"
        case startDate = "start_date"
        case endDate = "end_date"
        case reminderTimes = "reminder_times"
        case isActive = "is_active"
        case sideEffects = "side_effects"
        case planImageUrl = "plan_image_url"
        case pillDescription = "pill_description"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabaseMedicationLog: Codable {
    let id: UUID
    let medicationId: UUID
    let userId: UUID
    var takenAt: Date?
    var wasOnTime: Bool
    var notes: String?
    var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case medicationId = "medication_id"
        case userId = "user_id"
        case takenAt = "taken_at"
        case wasOnTime = "was_on_time"
        case notes
        case createdAt = "created_at"
    }
}

struct SupabaseMeal: Codable {
    let id: UUID
    let userId: UUID
    let name: String
    let mealType: String
    var consumedAt: Date?
    var imageUrl: String?
    var totalCalories: Double
    var totalProtein: Double
    var totalCarbs: Double
    var totalFat: Double
    var healthRating: Double
    var vitaminsSummary: String?
    var foodGroups: [String]
    var aiAnalysis: String?
    var notes: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case mealType = "meal_type"
        case consumedAt = "consumed_at"
        case imageUrl = "image_url"
        case totalCalories = "total_calories"
        case totalProtein = "total_protein"
        case totalCarbs = "total_carbs"
        case totalFat = "total_fat"
        case healthRating = "health_rating"
        case vitaminsSummary = "vitamins_summary"
        case foodGroups = "food_groups"
        case aiAnalysis = "ai_analysis"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabaseExercise: Codable {
    let id: UUID
    let userId: UUID
    let name: String
    let type: String
    let duration: Int
    var caloriesBurned: Double
    var distance: Double?
    var startTime: Date?
    var endTime: Date?
    var heartRateAvg: Double?
    var heartRateMax: Double?
    var videoUrl: String?
    var notes: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case type
        case duration
        case caloriesBurned = "calories_burned"
        case distance
        case startTime = "start_time"
        case endTime = "end_time"
        case heartRateAvg = "heart_rate_avg"
        case heartRateMax = "heart_rate_max"
        case videoUrl = "video_url"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabaseDailySummary: Codable {
    let id: UUID
    let userId: UUID
    let date: String
    var overallHealthScore: Double
    var mealHealthRating: Double
    var exerciseScore: Double
    var medicationAdherenceScore: Double
    var totalCaloriesConsumed: Double
    var totalCaloriesBurned: Double
    var totalExerciseMinutes: Int
    var medicationsTaken: Int
    var medicationsScheduled: Int
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case date
        case overallHealthScore = "overall_health_score"
        case mealHealthRating = "meal_health_rating"
        case exerciseScore = "exercise_score"
        case medicationAdherenceScore = "medication_adherence_score"
        case totalCaloriesConsumed = "total_calories_consumed"
        case totalCaloriesBurned = "total_calories_burned"
        case totalExerciseMinutes = "total_exercise_minutes"
        case medicationsTaken = "medications_taken"
        case medicationsScheduled = "medications_scheduled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabaseJournalLog: Codable {
    let id: UUID
    let patientId: UUID
    let transcript: String
    var voiceTranscription: String?
    var durationSeconds: Double?
    var tags: [String]?
    var mood: String?
    var sentimentScore: Double?
    var aiAnalysis: String?  // JSONB stored as JSON string for simplicity
    var metadata: String?    // JSONB stored as JSON string for simplicity
    let loggedAt: Date
    let createdAt: Date
    var updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case patientId = "patient_id"
        case transcript
        case voiceTranscription = "voice_transcription"
        case durationSeconds = "duration_seconds"
        case tags
        case mood
        case sentimentScore = "sentiment_score"
        case aiAnalysis = "ai_analysis"
        case metadata
        case loggedAt = "logged_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
