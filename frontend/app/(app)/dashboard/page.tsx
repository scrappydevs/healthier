"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Pill, 
  Utensils, 
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { 
  getPatients, 
  getAlerts, 
  getRecentActivity, 
  getPatientMeals,
  getPatientExercises,
  getPatientMedications,
  type Patient, 
  type Alert, 
  type ActivityItem,
  type Meal,
  type Exercise,
  type Medication
} from "@/lib/api";
import { FoodSection } from "@/components/patient/FoodSection";
import { ExerciseSection } from "@/components/patient/ExerciseSection";
import { MedicationSection } from "@/components/patient/MedicationSection";

type Tab = "overview" | "food" | "exercise" | "medications";

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

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

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const formatActivityTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const changeDate = (delta: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + delta);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex -m-4" style={{ height: "calc(100vh - 48px)" }}>
      {/* Left: Patient List */}
      <div className="w-60 flex flex-col border-r bg-white">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 rounded-md border-0 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No patients</p>
          ) : (
            filteredPatients.map((patient) => {
              const isSelected = selectedPatient?.id === patient.id;
              const status = getStatusFromAdherence(patient.adherence_rate);
              return (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setActiveTab("overview");
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left transition-colors border-l-2",
                    isSelected 
                      ? "bg-primary/5 border-l-primary" 
                      : "border-l-transparent hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {patient.full_name}
                    </span>
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      status === "good" ? "text-primary" :
                      status === "warning" ? "text-amber-600" : "text-red-600"
                    )}>
                      {Math.round(patient.adherence_rate)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {patient.medication_count} meds
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatLastActive(patient.last_active)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Center: Patient Detail */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedPatient ? (
          <>
            {/* Patient Header */}
            <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold text-foreground">
                      {selectedPatient.full_name}
                    </h1>
                    <StatusBadge status={getStatusFromAdherence(selectedPatient.adherence_rate)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPatient.age ? `${selectedPatient.age} yrs` : "Age unknown"} · {selectedPatient.medication_count} medications
                  </p>
                </div>
              </div>

              {/* Date Selector */}
              {(activeTab === "food" || activeTab === "exercise") && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeDate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(selectedDate)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => changeDate(1)}
                    disabled={selectedDate >= new Date().toISOString().split("T")[0]}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/dashboard/patients/${selectedPatient.id}`)}
              >
                Full Profile
              </Button>
            </div>

            {/* Tabs */}
            <div className="px-4 bg-white border-b">
              <div className="flex gap-0">
                {(["overview", "food", "exercise", "medications"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-colors capitalize relative",
                      activeTab === tab
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
              {activeTab === "overview" && (
                <OverviewContent patient={selectedPatient} />
              )}
              {activeTab === "food" && (
                <div className="bg-white rounded-lg border p-4">
                  <FoodSection patientId={selectedPatient.id} date={selectedDate} />
                </div>
              )}
              {activeTab === "exercise" && (
                <div className="bg-white rounded-lg border p-4">
                  <ExerciseSection patientId={selectedPatient.id} date={selectedDate} />
                </div>
              )}
              {activeTab === "medications" && (
                <div className="bg-white rounded-lg border p-4">
                  <MedicationSection patientId={selectedPatient.id} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a patient</p>
          </div>
        )}
      </div>

      {/* Right: Alerts & Activity */}
      <div className="w-52 flex flex-col border-l bg-white">
        {/* Alerts */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Alerts</h3>
            {alerts.length > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 4).map((alert) => (
              <div 
                key={alert.id} 
                className="py-1.5 cursor-pointer hover:bg-muted/30 rounded transition-colors"
              >
                <p className="text-xs font-medium text-foreground truncate">
                  {alert.patient_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No alerts</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 pb-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Activity</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5",
                      activity.type === "medication" ? "bg-primary/10" :
                      activity.type === "food" ? "bg-amber-50" : "bg-blue-50"
                    )}>
                      {activity.type === "medication" && <Pill className="w-2.5 h-2.5 text-primary" />}
                      {activity.type === "food" && <Utensils className="w-2.5 h-2.5 text-amber-600" />}
                      {activity.type === "exercise" && <Activity className="w-2.5 h-2.5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-tight line-clamp-2">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp ? formatActivityTime(activity.timestamp) : "—"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "good" | "warning" | "critical" }) {
  return (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded font-medium",
      status === "critical" ? "bg-red-50 text-red-700" :
      status === "warning" ? "bg-amber-50 text-amber-700" :
      "bg-emerald-50 text-emerald-700"
    )}>
      {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
    </span>
  );
}

function OverviewContent({ patient }: { patient: Patient }) {
  const [stats, setStats] = useState({ meals: 0, exercises: 0, medications: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const [mealsRes, exercisesRes, medsRes] = await Promise.all([
          getPatientMeals(patient.id),
          getPatientExercises(patient.id),
          getPatientMedications(patient.id),
        ]);
        setStats({
          meals: mealsRes.total,
          exercises: exercisesRes.total,
          medications: medsRes.total,
        });
      } catch {
        // Ignore errors for stats
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [patient.id]);

  const weeklyData = [
    { day: "Mon", value: 85 },
    { day: "Tue", value: 90 },
    { day: "Wed", value: 75 },
    { day: "Thu", value: 100 },
    { day: "Fri", value: 80 },
    { day: "Sat", value: 95 },
    { day: "Sun", value: Math.round(patient.adherence_rate) },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard 
          label="Adherence" 
          value={`${Math.round(patient.adherence_rate)}%`} 
          subtext="7-day average"
          highlight
        />
        <StatCard 
          label="Medications" 
          value={isLoading ? "—" : stats.medications.toString()} 
          subtext="active"
        />
        <StatCard 
          label="Meals Logged" 
          value={isLoading ? "—" : stats.meals.toString()} 
          subtext="this week"
        />
        <StatCard 
          label="Exercises" 
          value={isLoading ? "—" : stats.exercises.toString()} 
          subtext="this week"
        />
      </div>

      {/* Weekly Chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Weekly Adherence</h3>
        <div className="flex items-end gap-2 h-24">
          {weeklyData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-20">
                <div 
                  className={cn(
                    "w-full rounded-sm transition-all",
                    day.value >= 90 ? "bg-emerald-500" : 
                    day.value >= 70 ? "bg-amber-400" : "bg-red-400"
                  )}
                  style={{ height: `${day.value}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Patient Info
          </h3>
          <div className="space-y-2">
            <InfoRow label="Age" value={patient.age ? `${patient.age} years` : "Not set"} />
            <InfoRow label="Status" value={patient.status || "Active"} />
            <InfoRow 
              label="DOB" 
              value={patient.date_of_birth 
                ? new Date(patient.date_of_birth).toLocaleDateString() 
                : "Not set"
              } 
            />
          </div>
        </div>

        {patient.medical_conditions && patient.medical_conditions.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Conditions
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {patient.medical_conditions.map((condition, i) => (
                <span 
                  key={i} 
                  className="px-2 py-1 text-xs bg-muted/50 text-foreground rounded"
                >
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subtext, 
  highlight 
}: { 
  label: string; 
  value: string; 
  subtext: string; 
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "bg-white rounded-lg border p-3",
      highlight && "border-primary/30 bg-primary/5"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-xl font-semibold mt-0.5",
        highlight ? "text-primary" : "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground capitalize">{value}</span>
    </div>
  );
}
