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
    
    func fetchMedications(userId: UUID? = nil) async throws -> [SupabaseMedication] {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let response: [SupabaseMedication] = try await supabase
            .from("medications")
            .select()
            .eq("user_id", value: currentUserId.uuidString)
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
    
    func fetchMeals(userId: UUID? = nil, date: Date? = nil) async throws -> [SupabaseMeal] {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        var query = supabase
            .from("meals")
            .select()
            .eq("user_id", value: currentUserId.uuidString)
        
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
    
    func fetchExercises(userId: UUID? = nil, date: Date? = nil) async throws -> [SupabaseExercise] {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        var query = supabase
            .from("exercises")
            .select()
            .eq("user_id", value: currentUserId.uuidString)
        
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
    
    func fetchDailySummary(userId: UUID? = nil, date: Date) async throws -> SupabaseDailySummary? {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let dateString = ISO8601DateFormatter().string(from: date).prefix(10) // Just the date part
        
        let response: [SupabaseDailySummary] = try await supabase
            .from("daily_summaries")
            .select()
            .eq("user_id", value: currentUserId.uuidString)
            .eq("date", value: String(dateString))
            .execute()
            .value
        
        return response.first
    }
    
    // MARK: - Journal Database Operations
    
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
    
    func createJournalEntry(_ entry: JournalEntry, userId: UUID? = nil) async throws {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let patientId = try await getPatientId(userId: currentUserId)
        
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
    
    func fetchJournalEntries(userId: UUID? = nil) async throws -> [JournalEntry] {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let patientId = try await getPatientId(userId: currentUserId)
        
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
    
    func updateJournalEntry(_ entry: JournalEntry, userId: UUID? = nil) async throws {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let patientId = try await getPatientId(userId: currentUserId)
        
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
    
    func getJournalContextForQuestion(_ question: String, userId: UUID? = nil, limit: Int = 10) async throws -> [JournalEntry] {
        let currentUserId = userId ?? getCurrentUserId() ?? UUID()
        let patientId = try await getPatientId(userId: currentUserId)
        
        // Use full-text search on transcript - search for entries containing question keywords
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
    
    // MARK: - User Database Operations
    
    func createUser(_ user: SupabaseUser) async throws {
        try await supabase
            .from("users")
            .insert(user)
            .execute()
    }
    
    func fetchUser(userId: UUID) async throws -> SupabaseUser? {
        let response: [SupabaseUser] = try await supabase
            .from("users")
            .select()
            .eq("id", value: userId.uuidString)
            .execute()
            .value
        return response.first
    }
    
    func updateUser(_ user: SupabaseUser) async throws {
        try await supabase
            .from("users")
            .update(user)
            .eq("id", value: user.id.uuidString)
            .execute()
    }
    
    // MARK: - Patient Database Operations
    
    func createPatient(_ patient: SupabasePatient) async throws {
        try await supabase
            .from("patients")
            .insert(patient)
            .execute()
    }
    
    func fetchPatient(userId: UUID) async throws -> SupabasePatient? {
        let response: [SupabasePatient] = try await supabase
            .from("patients")
            .select()
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value
        return response.first
    }
    
    func fetchPatientById(patientId: UUID) async throws -> SupabasePatient? {
        let response: [SupabasePatient] = try await supabase
            .from("patients")
            .select()
            .eq("id", value: patientId.uuidString)
            .execute()
            .value
        return response.first
    }
    
    func updatePatient(_ patient: SupabasePatient) async throws {
        try await supabase
            .from("patients")
            .update(patient)
            .eq("id", value: patient.id.uuidString)
            .execute()
    }
    
    func getCurrentUserId() -> UUID? {
        return supabase.auth.currentUser?.id
    }
}

// MARK: - Supabase Data Models

// MARK: - Auth-Related Models

struct SupabaseUser: Codable {
    let id: UUID
    let email: String
    let fullName: String
    let role: String
    var phone: String?
    var avatarUrl: String?
    var preferences: [String: String]?
    var isActive: Bool
    var lastLoginAt: Date?
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case fullName = "full_name"
        case role
        case phone
        case avatarUrl = "avatar_url"
        case preferences
        case isActive = "is_active"
        case lastLoginAt = "last_login_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct SupabasePatient: Codable {
    let id: UUID
    let userId: UUID
    var clinicianId: UUID?
    var dateOfBirth: String?
    var age: Int?
    var gender: String?
    var heightCm: Double?
    var weightKg: Double?
    var bloodType: String?
    var medicalConditions: [String]
    var allergies: [String]
    var emergencyContactName: String?
    var emergencyContactPhone: String?
    var emergencyContactRelationship: String?
    var address: String?
    var notes: String?
    var status: String
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case clinicianId = "clinician_id"
        case dateOfBirth = "date_of_birth"
        case age
        case gender
        case heightCm = "height_cm"
        case weightKg = "weight_kg"
        case bloodType = "blood_type"
        case medicalConditions = "medical_conditions"
        case allergies
        case emergencyContactName = "emergency_contact_name"
        case emergencyContactPhone = "emergency_contact_phone"
        case emergencyContactRelationship = "emergency_contact_relationship"
        case address
        case notes
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

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
    var aiAnalysis: JSONBValue?
    var metadata: JSONBValue?
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

// JSONB value wrapper for flexible JSON structures
enum JSONBValue: Codable {
    case object([String: JSONBValue])
    case array([JSONBValue])
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if container.decodeNil() {
            self = .null
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let number = try? container.decode(Double.self) {
            self = .number(number)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let array = try? container.decode([JSONBValue].self) {
            self = .array(array)
        } else if let object = try? container.decode([String: JSONBValue].self) {
            self = .object(object)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid JSONB value")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch self {
        case .null:
            try container.encodeNil()
        case .bool(let bool):
            try container.encode(bool)
        case .number(let number):
            try container.encode(number)
        case .string(let string):
            try container.encode(string)
        case .array(let array):
            try container.encode(array)
        case .object(let object):
            try container.encode(object)
        }
    }
}
