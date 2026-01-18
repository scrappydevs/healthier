//
//  Exercise.swift
//  nexhacks-ios
//
//  Exercise tracking model with duration and calories
//

import Foundation

struct Exercise: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var type: ExerciseType
    var duration: TimeInterval // in seconds
    var caloriesBurned: Double
    var distance: Double? // in meters
    var startTime: Date
    var endTime: Date
    var heartRateAvg: Double?
    var heartRateMax: Double?
    var videoURL: String?
    var notes: String?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        type: ExerciseType,
        duration: TimeInterval,
        caloriesBurned: Double,
        distance: Double? = nil,
        startTime: Date = Date(),
        endTime: Date = Date(),
        heartRateAvg: Double? = nil,
        heartRateMax: Double? = nil,
        videoURL: String? = nil,
        notes: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.duration = duration
        self.caloriesBurned = caloriesBurned
        self.distance = distance
        self.startTime = startTime
        self.endTime = endTime
        self.heartRateAvg = heartRateAvg
        self.heartRateMax = heartRateMax
        self.videoURL = videoURL
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var durationFormatted: String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) / 60 % 60
        let seconds = Int(duration) % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}

enum ExerciseType: String, Codable, CaseIterable {
    case running = "Running"
    case walking = "Walking"
    case cycling = "Cycling"
    case swimming = "Swimming"
    case yoga = "Yoga"
    case weightlifting = "Weight Lifting"
    case hiit = "HIIT"
    case sports = "Sports"
    case other = "Other"
}

// MARK: - Clinician-assigned exercise plan items (web -> iOS)

struct ExercisePlanItem: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var category: String?
    var frequency: String
    var reminderTimes: [Date]
    var daysOfWeek: [Int] // Monday=0 ... Sunday=6 (matches backend)
    var sets: Int?
    var reps: Int?
    var durationSeconds: Int?
    var formNotes: String?
    var priority: Int
    var isActive: Bool
    var createdAt: Date
    var updatedAt: Date
}
