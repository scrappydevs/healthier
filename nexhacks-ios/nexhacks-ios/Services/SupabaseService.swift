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
    
    // MARK: - Journal Database Operations
    
    func createJournalEntry(_ entry: JournalEntry) async throws {
        let supabaseEntry = SupabaseJournalEntry(from: entry)
        try await supabase
            .from("journal_entries")
            .insert(supabaseEntry)
            .execute()
    }
    
    func fetchJournalEntries(userId: UUID = defaultUserId) async throws -> [JournalEntry] {
        let response: [SupabaseJournalEntry] = try await supabase
            .from("journal_entries")
            .select()
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value
        return response.map { $0.toJournalEntry() }
    }
    
    func updateJournalEntry(_ entry: JournalEntry) async throws {
        let supabaseEntry = SupabaseJournalEntry(from: entry)
        try await supabase
            .from("journal_entries")
            .update(supabaseEntry)
            .eq("id", value: entry.id.uuidString)
            .execute()
    }
    
    func deleteJournalEntry(_ id: UUID) async throws {
        try await supabase
            .from("journal_entries")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
    
    func getJournalContextForQuestion(_ question: String) async throws -> [JournalEntry] {
        let response: [SupabaseJournalEntry] = try await supabase
            .from("journal_entries")
            .select()
            .textSearch("transcript", query: question)
            .limit(5)
            .execute()
            .value
        return response.map { $0.toJournalEntry() }
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

struct SupabaseJournalEntry: Codable {
    let id: UUID
    let userId: UUID
    let date: Date
    var transcript: String
    var duration: Double?
    var tags: [String]
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case date
        case transcript
        case duration
        case tags
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(from entry: JournalEntry) {
        self.id = entry.id
        self.userId = SupabaseService.defaultUserId
        self.date = entry.date
        self.transcript = entry.transcript
        self.duration = entry.duration
        self.tags = entry.tags
        self.createdAt = entry.createdAt
        self.updatedAt = entry.updatedAt
    }
    
    func toJournalEntry() -> JournalEntry {
        return JournalEntry(
            id: id,
            transcript: transcript,
            date: date,
            duration: duration,
            tags: tags,
            createdAt: createdAt ?? Date(),
            updatedAt: updatedAt ?? Date()
        )
    }
}
