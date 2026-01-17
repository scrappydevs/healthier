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
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
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
  page?: number;
  per_page?: number;
}): Promise<PatientListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.clinician_id) searchParams.set("clinician_id", params.clinician_id);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.per_page) searchParams.set("per_page", params.per_page.toString());

  const query = searchParams.toString();
  return request<PatientListResponse>(`/api/v1/patients${query ? `?${query}` : ""}`);
}

export async function getPatient(id: string): Promise<Patient> {
  return request<Patient>(`/api/v1/patients/${id}`);
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
