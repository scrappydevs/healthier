"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Pill, 
  Utensils, 
  Activity,
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatients, getAlerts, getRecentActivity, type Patient, type Alert, type ActivityItem } from "@/lib/api";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch patients, alerts, and recent activity from backend
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [patientsRes, alertsRes, activityRes] = await Promise.all([
          getPatients({ per_page: 50 }),
          getAlerts({ limit: 10 }),
          getRecentActivity(10),
        ]);
        setPatients(patientsRes.patients);
        setAlerts(alertsRes.alerts);
        setRecentActivity(activityRes.activities);
        // Auto-select first patient
        if (patientsRes.patients.length > 0) {
          setSelectedPatient(patientsRes.patients[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusFromAdherence = (rate: number): "good" | "warning" | "critical" => {
    if (rate >= 85) return "good";
    if (rate >= 70) return "warning";
    return "critical";
  };

  const formatLastActive = (timestamp: string | null): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const formatActivityTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">Make sure the backend is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* Left: Patient List */}
      <div className="w-64 flex flex-col shrink-0">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-sm bg-white rounded-md border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex-1 overflow-hidden bg-white rounded-md">
          <div className="h-full overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No patients found</p>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id;
                const status = getStatusFromAdherence(patient.adherence_rate);
                return (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={cn(
                      "w-full px-3 py-2.5 text-left transition-colors",
                      isSelected ? "bg-primary/8" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {patient.full_name}
                      </span>
                      <span className={cn(
                        "text-xs font-medium tabular-nums",
                        status === "good" ? "text-primary" :
                        status === "warning" ? "text-warning" : "text-destructive"
                      )}>
                        {Math.round(patient.adherence_rate)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {patient.age || "—"} yrs · {patient.medication_count} meds · {formatLastActive(patient.last_active)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Center: Patient Detail */}
      <div className="flex-1 min-w-0">
        {selectedPatient ? (
          <PatientDetail 
            patient={selectedPatient} 
            onClose={() => setSelectedPatient(null)} 
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a patient to view details</p>
          </div>
        )}
      </div>

      {/* Right: Alerts & Activity */}
      <div className="w-56 flex flex-col gap-4 shrink-0">
        {/* Alerts */}
        <div className="bg-white rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Alerts</h3>
            <span className="text-xs font-medium text-destructive">{alerts.length}</span>
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id} 
                className="px-2 py-1.5 rounded hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <p className="text-xs font-medium text-foreground truncate">{alert.patient_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{alert.message}</p>
                <span className={cn(
                  "text-xs",
                  alert.severity === "critical" ? "text-destructive" : "text-warning"
                )}>
                  {alert.severity}
                </span>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No alerts</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 bg-white rounded-md p-3 flex flex-col overflow-hidden">
          <h3 className="text-sm font-medium text-foreground mb-2 shrink-0">Recent Activity</h3>
          <div className="flex-1 overflow-y-auto space-y-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 py-1">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    activity.type === "medication" ? "bg-primary/8" :
                    activity.type === "food" ? "bg-warning/10" : "bg-blue-50"
                  )}>
                    {activity.type === "medication" && <Pill className="w-2 h-2 text-primary" />}
                    {activity.type === "food" && <Utensils className="w-2 h-2 text-warning" />}
                    {activity.type === "exercise" && <Activity className="w-2 h-2 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-tight truncate">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp ? formatActivityTime(activity.timestamp) : "—"}
                      {activity.status === "missed" && <span className="text-destructive"> · missed</span>}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const status = patient.adherence_rate >= 85 ? "good" : patient.adherence_rate >= 70 ? "warning" : "critical";

  // Mock data for demonstration (would come from API)
  const medications = [
    { name: "Lisinopril 10mg", schedule: "Morning", taken: 6, total: 7 },
    { name: "Metformin 500mg", schedule: "Twice daily", taken: 12, total: 14 },
    { name: "Atorvastatin 20mg", schedule: "Evening", taken: 7, total: 7 },
  ];

  const weeklyData = [
    { day: "Mon", pills: 90 },
    { day: "Tue", pills: 85 },
    { day: "Wed", pills: 100 },
    { day: "Thu", pills: 70 },
    { day: "Fri", pills: 80 },
    { day: "Sat", pills: 95 },
    { day: "Sun", pills: 75 },
  ];

  const formatLastActive = (timestamp: string | null): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-md p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{patient.full_name}</h2>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                status === "critical" ? "bg-destructive/10 text-destructive" :
                status === "warning" ? "bg-warning/10 text-warning" :
                "bg-primary/8 text-primary"
              )}>
                {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {patient.age || "—"} years old · {patient.medication_count} medications · Last active {formatLastActive(patient.last_active)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-8 mt-4 pt-4 border-t">
          <div>
            <p className="text-2xl font-semibold text-foreground">{Math.round(patient.adherence_rate)}%</p>
            <p className="text-xs text-muted-foreground">7-Day Adherence</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">18 / 21</p>
            <p className="text-xs text-muted-foreground">Meals Logged</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">4</p>
            <p className="text-xs text-muted-foreground">Exercise Sessions</p>
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="bg-white rounded-md p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Weekly Trend</h3>
        <div className="flex items-end gap-2 h-20">
          {weeklyData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-16">
                <div 
                  className={cn(
                    "w-full rounded-sm",
                    day.pills >= 90 ? "bg-primary" : day.pills >= 70 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ height: `${day.pills}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white rounded-md p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Medications This Week</h3>
        <div className="space-y-3">
          {medications.map((med, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">{med.name}</p>
                <p className="text-xs text-muted-foreground">{med.schedule}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground tabular-nums">{med.taken}/{med.total}</span>
                <div className="w-16 h-1.5 bg-muted rounded-full">
                  <div 
                    className={cn("h-full rounded-full", med.taken === med.total ? "bg-primary" : "bg-warning")}
                    style={{ width: `${(med.taken / med.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Food & Exercise */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-1">Food Logs</h3>
          <p className="text-2xl font-semibold text-foreground">18</p>
          <p className="text-xs text-muted-foreground">meals this week</p>
        </div>
        <div className="flex-1 bg-white rounded-md p-4">
          <h3 className="text-sm font-medium text-foreground mb-1">Exercise</h3>
          <p className="text-2xl font-semibold text-foreground">4</p>
          <p className="text-xs text-muted-foreground">sessions this week</p>
        </div>
      </div>
    </div>
  );
}
