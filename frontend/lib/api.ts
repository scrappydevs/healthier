/**
 * API client for backend communication.
 * All Supabase operations go through the backend - no client-side DB calls.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
    cache: "no-store", // Disable caching to always get fresh data
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      console.error("API Error:", { status: response.status, error });
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("Request timed out. Please check if the backend is running.");
    }
    if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
      throw new Error(`Cannot connect to backend at ${API_URL}. Is the server running?`);
    }
    throw err;
  }
}

// ============================================
// PATIENTS
// ============================================

export type Patient = {
  id: string;
  user_id: string;
  clinician_id: string | null;
  full_name: string;
  age: number | null;
  status: string;
  care_setting: "in_clinic" | "at_home";
  adherence_rate: number;
  last_active: string | null;
  medication_count: number;
  date_of_birth: string | null;
  medical_conditions: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientListResponse = {
  patients: Patient[];
  total: number;
  page: number;
  per_page: number;
};

export async function getPatients(params?: {
  clinician_id?: string;
  status?: string;
  care_setting?: "in_clinic" | "at_home";
  page?: number;
  per_page?: number;
}): Promise<PatientListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.clinician_id) searchParams.set("clinician_id", params.clinician_id);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.care_setting) searchParams.set("care_setting", params.care_setting);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.per_page) searchParams.set("per_page", params.per_page.toString());

  const query = searchParams.toString();
  return request<PatientListResponse>(`/api/v1/patients${query ? `?${query}` : ""}`);
}

export async function getPatient(id: string): Promise<Patient> {
  return request<Patient>(`/api/v1/patients/${id}`);
}

export async function updatePatient(
  id: string,
  data: { care_setting?: "in_clinic" | "at_home"; status?: string }
): Promise<Patient> {
  return request<Patient>(`/api/v1/patients/${id}`, {
    method: "PATCH",
    body: data,
  });
}

// ============================================
// PATIENT MEALS (from iOS app)
// ============================================

export type Meal = {
  id: string;
  user_id: string;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  consumed_at: string;
  image_url: string | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  health_rating: number;
  vitamins_summary: string | null;
  food_groups: string[];
  ai_analysis: string | null;
  notes: string | null;
  created_at: string;
};

export type PatientMealsResponse = {
  meals: Meal[];
  total: number;
};

export async function getPatientMeals(
  patientId: string,
  date?: string
): Promise<PatientMealsResponse> {
  const query = date ? `?date=${date}` : "";
  return request<PatientMealsResponse>(`/api/v1/patients/${patientId}/meals${query}`);
}

// ============================================
// PATIENT EXERCISES (from iOS app)
// ============================================

export type Exercise = {
  id: string;
  user_id: string;
  exercise_type: string;
  category: "cardio" | "strength" | "flexibility" | "balance" | "other" | null;
  duration_minutes: number | null;
  distance_meters: number | null;
  steps: number | null;
  calories_burned: number | null;
  intensity: "light" | "moderate" | "vigorous" | null;
  heart_rate_avg: number | null;
  heart_rate_max: number | null;
  voice_notes: string | null;
  notes: string | null;
  weather: string | null;
  location: string | null;
  completed: boolean;
  logged_at: string;
  created_at: string;
  video_url?: string | null;
  processed_video_url?: string | null;
  pose_analysis?: {
    summary?: string;
    processed_video_url?: string;
    video_info?: { duration_seconds: number; analyzed_frames: number };
    symmetry_analysis?: Record<string, { left: number; right: number; difference: number; symmetric: boolean }>;
    angle_statistics?: Record<string, { min: number; max: number; avg: number; range: number }>;
  } | null;
};

export type PatientExercisesResponse = {
  exercises: Exercise[];
  total: number;
  summary: {
    total_minutes: number;
    total_calories: number;
  };
};

export async function getPatientExercises(
  patientId: string,
  date?: string
): Promise<PatientExercisesResponse> {
  const query = date ? `?date=${date}` : "";
  return request<PatientExercisesResponse>(`/api/v1/patients/${patientId}/exercises${query}`);
}

// ============================================
// PATIENT MEDICATIONS (from iOS app)
// ============================================

export type MedicationLog = {
  id: string;
  medication_id: string;
  user_id: string;
  taken_at: string | null;
  was_on_time: boolean;
  notes: string | null;
  created_at: string;
};

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  form: string;
  instructions: string | null;
  prescribed_by: string | null;
  start_date: string | null;
  end_date: string | null;
  reminder_times: string[];
  is_active: boolean;
  side_effects: string[];
  plan_image_url: string | null;
  pill_description: string | null;
  created_at: string;
  updated_at: string;
  recent_logs: MedicationLog[];
  adherence_rate: number;
};

export type AssignedMedication = {
  id: string;
  patient_id: string;
  pill_id: string;
  dosage_amount: number;
  frequency: string;
  days_of_week: number[];
  times_of_day: string[];
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  pills: {
    id: string;
    name: string;
    strength: number;
    unit: string;
    dosage_form: string;
  } | null;
};

export type PatientMedicationsResponse = {
  medications: Medication[];
  assigned_medications: AssignedMedication[];
  total: number;
};

export async function getPatientMedications(
  patientId: string
): Promise<PatientMedicationsResponse> {
  return request<PatientMedicationsResponse>(`/api/v1/patients/${patientId}/medications`);
}

// ============================================
// ALERTS
// ============================================

export type Alert = {
  id: string;
  patient_id: string;
  clinician_id: string | null;
  type: "missed_dose" | "low_adherence" | "refill_needed" | "pattern_detected";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  patient_name: string | null;
};

export type AlertListResponse = {
  alerts: Alert[];
  total: number;
  critical_count: number;
  unacknowledged_count: number;
};

export async function getAlerts(params?: {
  clinician_id?: string;
  acknowledged?: boolean;
  severity?: string;
  limit?: number;
}): Promise<AlertListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.clinician_id) searchParams.set("clinician_id", params.clinician_id);
  if (params?.acknowledged !== undefined) searchParams.set("acknowledged", params.acknowledged.toString());
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  return request<AlertListResponse>(`/api/v1/alerts${query ? `?${query}` : ""}`);
}

export async function acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
  return request<Alert>(`/api/v1/alerts/${alertId}/acknowledge?user_id=${userId}`, {
    method: "POST",
  });
}

// ============================================
// DASHBOARD
// ============================================

export type DashboardStats = {
  total_patients: number;
  average_adherence: number;
  active_alerts: number;
  critical_alerts: number;
  doses_today: {
    taken: number;
    total: number;
  };
};

export async function getDashboardStats(clinician_id?: string): Promise<DashboardStats> {
  const query = clinician_id ? `?clinician_id=${clinician_id}` : "";
  return request<DashboardStats>(`/api/v1/dashboard/stats${query}`);
}

// ============================================
// ANALYTICS
// ============================================

export type AnalyticsData = {
  monthly_adherence: { label: string; value: number }[];
  medication_breakdown: { label: string; value: number; target: number }[];
  time_of_day: { label: string; value: number }[];
  age_distribution: { label: string; value: number }[];
  summary: {
    avg_adherence: number;
    total_doses: number;
    total_patients: number;
    food_logs: number;
    exercise_sessions: number;
  };
};

export async function getAnalytics(clinician_id?: string): Promise<AnalyticsData> {
  const query = clinician_id ? `?clinician_id=${clinician_id}` : "";
  return request<AnalyticsData>(`/api/v1/analytics${query}`);
}

// ============================================
// USER / SETTINGS
// ============================================

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: "clinician" | "admin";
  specialty: string | null;
  notification_preferences: {
    critical_alerts: boolean;
    daily_summary: boolean;
    weekly_reports: boolean;
  };
  alert_thresholds: {
    low_adherence_percent: number;
    missed_doses_critical: number;
  };
};

export async function getCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/users/me");
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/users/me", {
    method: "PATCH",
    body: data,
  });
}

// ============================================
// ACTIVITY
// ============================================

export type ActivityItem = {
  id: string;
  type: "medication" | "food" | "exercise";
  patient_name: string;
  action: string;
  timestamp: string;
  status?: "completed" | "missed";
};

export type RecentActivityResponse = {
  activities: ActivityItem[];
};

export async function getRecentActivity(limit?: number): Promise<RecentActivityResponse> {
  const query = limit ? `?limit=${limit}` : "";
  return request<RecentActivityResponse>(`/api/v1/activity/recent${query}`);
}

// ============================================
// PILLS (Medication Reference)
// ============================================

export type Pill = {
  id: string;
  name: string;
  generic_name: string | null;
  dosage_form: string;
  strength: string;
  unit: string;
  instructions: string | null;
};

export type PillsResponse = {
  pills: Pill[];
};

export async function getPills(): Promise<PillsResponse> {
  return request<PillsResponse>("/api/v1/pills");
}

export async function assignPatientMedication(
  patientId: string,
  pillId: string,
  frequency: string,
  daysOfWeek: string[],
  timesOfDay: string[]
): Promise<{ success: boolean; patient_pill: unknown }> {
  return request<{ success: boolean; patient_pill: unknown }>(
    `/api/v1/patients/${patientId}/medications/assign?pill_id=${pillId}&frequency=${frequency}&days_of_week=${daysOfWeek.join(",")}&times_of_day=${timesOfDay.join(",")}`,
    { method: "POST" }
  );
}

// ============================================
// JOURNAL LOGS
// ============================================

export type JournalEntry = {
  id: string;
  patient_id: string;
  transcript: string;
  duration_seconds: number | null;
  tags: string[] | null;
  mood: "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | null;
  sentiment_score: number | null;
  ai_analysis: {
    summary?: string;
  } | null;
  logged_at: string;
  created_at: string;
};

export type PatientJournalResponse = {
  entries: JournalEntry[];
  total: number;
};

export async function getPatientJournal(
  patientId: string,
  startDate?: string,
  endDate?: string
): Promise<PatientJournalResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const query = params.toString();
  return request<PatientJournalResponse>(`/api/v1/patients/${patientId}/journal${query ? `?${query}` : ""}`);
}


// ============================================
// PILL LOGS
// ============================================

export type PillLog = {
  id: string;
  patient_id: string;
  patient_pill_id: string;
  scheduled_time: string;
  taken_time: string | null;
  status: "pending" | "taken" | "missed" | "late";
  patient_pills: {
    pill_id: string;
    dosage_amount: number;
    frequency: string;
    times_of_day: string[];
    pills: {
      name: string;
      strength: number;
      unit: string;
      dosage_form: string;
    };
  };
  created_at: string;
};

export type PatientPillLogsResponse = {
  logs: PillLog[];
  total: number;
};

export async function getPatientPillLogs(
  patientId: string,
  date?: string
): Promise<PatientPillLogsResponse> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const query = params.toString();
  return request<PatientPillLogsResponse>(`/api/v1/patients/${patientId}/pill-logs${query ? `?${query}` : ""}`);
}


// ============================================
// DAILY SUMMARY
// ============================================

export type DailySummaryAlert = {
  severity: "high" | "medium" | "low";
  type: string;
  message: string;
};

export type DailySummaryStats = {
  meals: number;
  total_calories: number;
  exercises: number;
  exercise_minutes: number;
  calories_burned: number;
  medications_taken: number;
  medications_missed: number;
  medications_late: number;
  medications_pending: number;
  adherence_percent: number;
  journal_entries: number;
};

export type DailySummaryResponse = {
  date: string;
  patient_name: string;
  summary: string;
  journal_summary?: string;
  meals_summary?: string;
  activity_summary?: string;
  alerts: DailySummaryAlert[];
  stats: DailySummaryStats;
  cached?: boolean;  // True if returned from cache, false if freshly generated
};

export async function generateDailySummary(
  patientId: string,
  date?: string,
  forceRefresh?: boolean
): Promise<DailySummaryResponse> {
  const params = new URLSearchParams();
  if (date) params.append("summary_date", date);
  if (forceRefresh) params.append("force_refresh", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<DailySummaryResponse>(`/api/v1/patients/${patientId}/daily-summary${query}`, {
    method: "POST",
  });
}


// ============================================
// PATIENT PLANS (Diet & Exercise)
// ============================================

export type PatientPlan = {
  id: string;
  patient_id: string;
  plan_type: "diet" | "exercise";
  title: string | null;
  notes: string | null;
  goals: string[];
  restrictions: string[];
  calorie_target: number | null;
  protein_target: number | null;
  carb_target: number | null;
  fat_target: number | null;
  exercise_minutes_target: number | null;
  exercise_days_per_week: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PatientPlansResponse = {
  plans: PatientPlan[];
};

export async function getPatientPlans(
  patientId: string,
  planType?: "diet" | "exercise"
): Promise<PatientPlansResponse> {
  const query = planType ? `?plan_type=${planType}` : "";
  return request<PatientPlansResponse>(`/api/v1/patients/${patientId}/plans${query}`);
}

export async function createPatientPlan(
  patientId: string,
  plan: Partial<PatientPlan>
): Promise<{ plan: PatientPlan }> {
  return request<{ plan: PatientPlan }>(`/api/v1/patients/${patientId}/plans`, {
    method: "POST",
    body: plan,
  });
}

export async function updatePatientPlan(
  patientId: string,
  planId: string,
  updates: Partial<PatientPlan>
): Promise<{ plan: PatientPlan }> {
  return request<{ plan: PatientPlan }>(`/api/v1/patients/${patientId}/plans/${planId}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deletePatientPlan(
  patientId: string,
  planId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/v1/patients/${patientId}/plans/${planId}`, {
    method: "DELETE",
  });
}


// ============================================
// SUMMARIES
// ============================================

export async function generateJournalSummary(
  entryId: string
): Promise<{ summary: string }> {
  return request<{ summary: string }>(`/api/v1/journal-entries/${entryId}/summary`, {
    method: "POST",
  });
}

export async function generateJournalDaySummary(
  patientId: string,
  date: string,
  forceRefresh?: boolean
): Promise<{ summary: string; entry_count: number; cached?: boolean }> {
  const params = new URLSearchParams({ date });
  if (forceRefresh) params.append("force_refresh", "true");
  return request<{ summary: string; entry_count: number; cached?: boolean }>(
    `/api/v1/patients/${patientId}/journal/summary?${params.toString()}`,
    { method: "POST" }
  );
}

export async function generateMealSummary(
  mealId: string
): Promise<{ summary: string }> {
  return request<{ summary: string }>(`/api/v1/meals/${mealId}/summary`, {
    method: "POST",
  });
}

export async function generateExerciseSummary(
  exerciseId: string
): Promise<{ summary: string }> {
  return request<{ summary: string }>(`/api/v1/exercises/${exerciseId}/summary`, {
    method: "POST",
  });
}


// ============================================
// POSE ANALYSIS
// ============================================

export type PoseAnalysisSymmetry = {
  left: number;
  right: number;
  difference: number;
  symmetric: boolean;
};

export type PoseAnalysisAngleStats = {
  min: number;
  max: number;
  avg: number;
  range: number;
};

export type PoseAnalysis = {
  video_info?: {
    fps: number;
    total_frames: number;
    analyzed_frames: number;
    duration_seconds: number;
    width: number;
    height: number;
  };
  angle_statistics?: Record<string, PoseAnalysisAngleStats>;
  symmetry_analysis?: Record<string, PoseAnalysisSymmetry>;
  summary?: string;
  exercise_type?: string;
  processed_video_url?: string;
  error?: string;
};

export type ExercisePoseAnalysisResponse = {
  exercise_id: string;
  video_url: string | null;
  processed_video_url: string | null;
  exercise_type: string | null;
  pose_analysis: PoseAnalysis | null;
  has_analysis: boolean;
};

// Response from POST analyze-pose (async background processing)
export type AnalyzePoseResponse = {
  status: "processing" | "completed";
  exercise_id: string;
  message?: string;
  pose_analysis?: PoseAnalysis;
  processed_video_url?: string;
};

export async function analyzeExercisePose(
  exerciseId: string
): Promise<AnalyzePoseResponse> {
  return request<AnalyzePoseResponse>(`/api/v1/exercises/${exerciseId}/analyze-pose`, {
    method: "POST",
  });
}

// ============================================
// EXERCISE CATALOG & PRESCRIBED EXERCISES
// ============================================

export type ExerciseCatalogItem = {
  id: string;
  name: string;
  category: "strength" | "cardio" | "flexibility" | "balance";
  description: string | null;
  video_demo_url: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
  difficulty: "easy" | "moderate" | "hard" | null;
  target_muscles: string[] | null;
};

export type PrescribedExercise = {
  id: string;
  patient_id: string;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  frequency: "daily" | "3x_week" | "2x_week" | "weekly" | "as_needed";
  form_notes: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  exercise_catalog: ExerciseCatalogItem;
};

export type ExerciseAdherenceSummary = {
  date: string;
  summary: {
    total_prescribed: number;
    completed: number;
    missed: number;
    off_plan: number;
  };
  completed: Array<{
    prescription: PrescribedExercise;
    log: Exercise;
    form_score: number | null;
  }>;
  missed: PrescribedExercise[];
  off_plan: Exercise[];
};

export async function getExerciseCatalog(
  category?: string
): Promise<{ exercises: ExerciseCatalogItem[] }> {
  const params = category ? `?category=${category}` : "";
  return request<{ exercises: ExerciseCatalogItem[] }>(`/api/v1/exercise-catalog${params}`);
}

export async function getPrescribedExercises(
  patientId: string,
  includeInactive = false
): Promise<{ prescribed_exercises: PrescribedExercise[] }> {
  const params = includeInactive ? "?include_inactive=true" : "";
  return request<{ prescribed_exercises: PrescribedExercise[] }>(
    `/api/v1/patients/${patientId}/prescribed-exercises${params}`
  );
}

export async function prescribeExercise(
  patientId: string,
  data: {
    exercise_id: string;
    sets?: number;
    reps?: number;
    duration_seconds?: number;
    frequency?: string;
    form_notes?: string;
    priority?: number;
  }
): Promise<{ prescribed_exercise: PrescribedExercise }> {
  const params = new URLSearchParams();
  params.append("exercise_id", data.exercise_id);
  if (data.sets) params.append("sets", String(data.sets));
  if (data.reps) params.append("reps", String(data.reps));
  if (data.duration_seconds) params.append("duration_seconds", String(data.duration_seconds));
  if (data.frequency) params.append("frequency", data.frequency);
  if (data.form_notes) params.append("form_notes", data.form_notes);
  if (data.priority) params.append("priority", String(data.priority));
  
  return request<{ prescribed_exercise: PrescribedExercise }>(
    `/api/v1/patients/${patientId}/prescribed-exercises?${params.toString()}`,
    { method: "POST" }
  );
}

export async function updatePrescribedExercise(
  patientId: string,
  prescriptionId: string,
  updates: Partial<{
    sets: number;
    reps: number;
    duration_seconds: number;
    frequency: string;
    form_notes: string;
    priority: number;
    is_active: boolean;
  }>
): Promise<{ prescribed_exercise: PrescribedExercise }> {
  return request<{ prescribed_exercise: PrescribedExercise }>(
    `/api/v1/patients/${patientId}/prescribed-exercises/${prescriptionId}`,
    {
      method: "PATCH",
      body: updates,
    }
  );
}

export async function removePrescribedExercise(
  patientId: string,
  prescriptionId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/api/v1/patients/${patientId}/prescribed-exercises/${prescriptionId}`,
    { method: "DELETE" }
  );
}

export async function getExerciseAdherence(
  patientId: string,
  date?: string
): Promise<ExerciseAdherenceSummary> {
  const params = date ? `?date=${date}` : "";
  return request<ExerciseAdherenceSummary>(
    `/api/v1/patients/${patientId}/exercise-adherence${params}`
  );
}

export async function getExercisePoseAnalysis(
  exerciseId: string
): Promise<ExercisePoseAnalysisResponse> {
  return request<ExercisePoseAnalysisResponse>(`/api/v1/exercises/${exerciseId}/pose-analysis`);
}
