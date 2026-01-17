"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plus,
  Pill,
  Utensils,
  Activity,
  X,
  BookOpen,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { 
  getPatients, 
  getPatientMeals,
  getPatientExercises,
  getPatientMedications,
  getPatientJournal,
  getPills,
  generateDailySummary,
  createPatientPlan,
  type Patient,
  type Pill as PillType,
  type DailySummaryResponse,
  type JournalEntry
} from "@/lib/api";
import { FoodSection } from "@/components/patient/FoodSection";
import { ExerciseSection } from "@/components/patient/ExerciseSection";
import { MedicationSection } from "@/components/patient/MedicationSection";
import { JournalSection } from "@/components/patient/JournalSection";

type Tab = "overview" | "plans" | "food" | "exercise" | "medications" | "journal";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
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
        const patientsRes = await getPatients({ per_page: 50 });
        setPatients(patientsRes.patients);
        if (patientsRes.patients.length > 0) {
          setSelectedPatient(patientsRes.patients[0]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load data";
        console.error("Failed to fetch patients:", err);
        setError(errorMessage);
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

        {/* Column Header */}
        <div className="px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Patient</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Adherence</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No patients</p>
          ) : (
            filteredPatients.map((patient) => {
              const isSelected = selectedPatient?.id === patient.id;
              const hasMeds = patient.medication_count > 0;
              const status = hasMeds ? getStatusFromAdherence(patient.adherence_rate) : null;
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
                    {hasMeds ? (
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-xs font-semibold tabular-nums",
                          "text-muted-foreground"
                        )}>
                          {Math.round(patient.adherence_rate)}%
                        </span>
                        {status === "critical" && (
                          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {status === "warning" && (
                          <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
                {(["overview", "plans", "food", "exercise", "medications", "journal"] as Tab[]).map((tab) => (
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
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
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
              {activeTab === "journal" && (
                <div className="p-4">
                  <JournalSection patientId={selectedPatient.id} />
                </div>
              )}
              {activeTab === "plans" && (
                <PlansContent patient={selectedPatient} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a patient</p>
          </div>
        )}
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
      "bg-slate-50 text-slate-700"
    )}>
      {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
    </span>
  );
}

function PlansContent({ patient }: { patient: Patient }) {
  const [showMedForm, setShowMedForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [dietPlans, setDietPlans] = useState<Array<{ id: string; notes: string | null; created_at: string }>>([]);
  const [exercisePlans, setExercisePlans] = useState<Array<{ id: string; title: string | null; notes: string | null; exercise_minutes_target: number | null; exercise_days_per_week: number | null; created_at: string }>>([]);
  const [medicationCount, setMedicationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const [plansRes, medsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/patients/${patient.id}/plans`).then(r => r.json()),
        getPatientMedications(patient.id),
      ]);
      
      const plans = plansRes.plans || [];
      setDietPlans(plans.filter((p: { plan_type: string }) => p.plan_type === "diet"));
      setExercisePlans(plans.filter((p: { plan_type: string }) => p.plan_type === "exercise"));
      setMedicationCount(medsRes.total);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [patient.id]);

  const handlePlanSaved = () => {
    fetchPlans();
  };

  return (
    <div className="space-y-4">
      {/* Medication Assignment */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Medication Plans</h3>
          </div>
          <button 
            onClick={() => setShowMedForm(!showMedForm)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {showMedForm ? "Cancel" : "Assign"}
          </button>
        </div>
        
        {showMedForm && (
          <MedicationAssignForm 
            patientId={patient.id} 
            onClose={() => setShowMedForm(false)} 
          />
        )}
        
        {!showMedForm && (
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${medicationCount} active prescriptions`}
          </p>
        )}
      </div>

      {/* Diet Instructions */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-medium text-foreground">Diet Plan</h3>
          </div>
          <button 
            onClick={() => setShowDietForm(!showDietForm)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {showDietForm ? "Cancel" : "Add"}
          </button>
        </div>
        
        {showDietForm && (
          <DietInstructionForm 
            patientId={patient.id} 
            onClose={() => { setShowDietForm(false); handlePlanSaved(); }} 
          />
        )}
        
        {!showDietForm && (
          <div className="space-y-2">
            {dietPlans.length > 0 ? (
              dietPlans.map((plan) => (
                <div key={plan.id} className="p-2 bg-amber-50 rounded text-sm">
                  <p className="text-foreground">{plan.notes || "No notes"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No diet plan set</p>
            )}
          </div>
        )}
      </div>

      {/* Exercise Plan */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-medium text-foreground">Exercise Plan</h3>
          </div>
          <button 
            onClick={() => setShowExerciseForm(!showExerciseForm)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {showExerciseForm ? "Cancel" : "Add"}
          </button>
        </div>
        
        {showExerciseForm && (
          <ExercisePlanForm 
            patientId={patient.id} 
            onClose={() => { setShowExerciseForm(false); handlePlanSaved(); }} 
          />
        )}
        
        {!showExerciseForm && (
          <div className="space-y-2">
            {exercisePlans.length > 0 ? (
              exercisePlans.map((plan) => (
                <div key={plan.id} className="p-2 bg-slate-50 rounded text-sm">
                  <p className="font-medium text-foreground">{plan.title || "Exercise Plan"}</p>
                  {(plan.exercise_minutes_target || plan.exercise_days_per_week) && (
                    <p className="text-muted-foreground">
                      {plan.exercise_minutes_target && `${plan.exercise_minutes_target} min/session`}
                      {plan.exercise_minutes_target && plan.exercise_days_per_week && " · "}
                      {plan.exercise_days_per_week && `${plan.exercise_days_per_week} days/week`}
                    </p>
                  )}
                  {plan.notes && <p className="text-muted-foreground mt-1">{plan.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No exercise plan set</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewContent({ patient }: { patient: Patient }) {
  const [meals, setMeals] = useState<Array<{
    id: string;
    name: string;
    meal_type: string;
    consumed_at: string;
    image_url: string | null;
    total_calories: number;
    total_protein?: number | null;
    total_carbs?: number | null;
    total_fat?: number | null;
    ai_analysis?: string | null;
  }>>([]);
  const [exercises, setExercises] = useState<Array<{
    id: string;
    exercise_type: string;
    name?: string | null;
    duration_minutes: number | null;
    calories_burned: number | null;
    logged_at: string;
    intensity?: string | null;
    notes?: string | null;
  }>>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<DailySummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [mealsExpanded, setMealsExpanded] = useState(true);
  const [exercisesExpanded, setExercisesExpanded] = useState(true);
  const [journalExpanded, setJournalExpanded] = useState(true);
  const [journalSectionSummary, setJournalSectionSummary] = useState<string>("");
  const [mealsSectionSummary, setMealsSectionSummary] = useState<string>("");
  const [exercisesSectionSummary, setExercisesSectionSummary] = useState<string>("");
  const [lastDataHash, setLastDataHash] = useState("");
  const todayDate = new Date().toISOString().split("T")[0];

  // Fetch all data - reset all state when patient changes
  useEffect(() => {
    // Reset all state when patient changes
    setAiSummary(null);
    setJournalSectionSummary("");
    setMealsSectionSummary("");
    setExercisesSectionSummary("");
    setMeals([]);
    setExercises([]);
    setJournalEntries([]);
    
    async function fetchTodayData() {
      setIsLoading(true);
      try {
        const [mealsRes, exercisesRes, journalRes] = await Promise.all([
          getPatientMeals(patient.id, todayDate),
          getPatientExercises(patient.id, todayDate),
          getPatientJournal(patient.id, todayDate, todayDate),
        ]);
        
        setMeals(mealsRes.meals);
        setExercises(exercisesRes.exercises);
        setJournalEntries(journalRes.entries);
        
        // Create hash of data to detect changes
        const dataHash = JSON.stringify({
          meals: mealsRes.meals.length,
          exercises: exercisesRes.exercises.length,
          journal: journalRes.entries.length,
        });
        setLastDataHash(dataHash);
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }
    fetchTodayData();
  }, [patient.id, todayDate]);

  // Auto-generate summary when there's activity and no summary yet
  useEffect(() => {
    const hasActivity = meals.length > 0 || exercises.length > 0 || journalEntries.length > 0;
    if (hasActivity && !aiSummary && !isGeneratingSummary && !isLoading) {
      handleGenerateSummary();
    }
  }, [meals.length, exercises.length, journalEntries.length, isLoading]);

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generateDailySummary(patient.id, todayDate);
      setAiSummary(summary);
      // Set section summaries from the response
      if (summary.journal_summary) setJournalSectionSummary(summary.journal_summary);
      if (summary.meals_summary) setMealsSectionSummary(summary.meals_summary);
      if (summary.activity_summary) setExercisesSectionSummary(summary.activity_summary);
    } catch {
      // Ignore errors
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const getStatusFromAdherence = (rate: number): "good" | "warning" | "critical" => {
    if (rate >= 85) return "good";
    if (rate >= 70) return "warning";
    return "critical";
  };

  const status = getStatusFromAdherence(patient.adherence_rate);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  const mealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack",
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-50 border-red-200 text-red-800";
      case "medium": return "bg-amber-50 border-amber-200 text-amber-800";
      case "low": return "bg-slate-50 border-slate-200 text-slate-700";
      default: return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  const getMoodEmoji = (mood: string | null) => {
    switch (mood) {
      case "very_positive": return "😊";
      case "positive": return "🙂";
      case "neutral": return "😐";
      case "negative": return "😔";
      case "very_negative": return "😢";
      default: return "📝";
    }
  };

  const totalActivity = meals.length + exercises.length + journalEntries.length;

  return (
    <div className="space-y-3">
      {/* Overall Status Bar */}
      <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-foreground font-medium">{patient.full_name}</span>
          </div>
          {patient.medication_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(patient.adherence_rate)}% med adherence
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {totalActivity} activities today
        </div>
      </div>

      {/* Daily Summary - Collapsible */}
      <div className="bg-gradient-to-r from-slate-50 to-white rounded-lg border">
        <button
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Daily Summary</span>
            {isGeneratingSummary && (
              <span className="text-xs text-muted-foreground animate-pulse">Generating...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {aiSummary && (
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerateSummary(); }}
                className="text-xs text-primary hover:underline"
              >
                Refresh
              </button>
            )}
            {summaryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {summaryExpanded && (
          <div className="px-3 pb-3 border-t">
            {aiSummary ? (
              <div className="space-y-3 pt-3">
                <p className="text-sm text-foreground leading-relaxed">{aiSummary.summary}</p>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-base font-semibold text-foreground">{aiSummary.stats.meals}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Meals</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-base font-semibold text-foreground">{aiSummary.stats.exercises}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Exercise</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-base font-semibold text-foreground">{aiSummary.stats.adherence_percent}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Meds</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-base font-semibold text-foreground">{aiSummary.stats.journal_entries}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Journal</p>
                  </div>
                </div>

                {/* Alerts */}
                {aiSummary.alerts.length > 0 && (
                  <div className="space-y-2">
                    {aiSummary.alerts.map((alert, idx) => (
                      <div key={idx} className={`p-2 rounded border text-xs ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>{alert.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : totalActivity === 0 ? (
              <p className="text-sm text-muted-foreground pt-3">No activity logged today yet.</p>
            ) : (
              <p className="text-sm text-muted-foreground pt-3 animate-pulse">Generating summary...</p>
            )}
          </div>
        )}
      </div>

      {/* Journal Entries */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => setJournalExpanded(!journalExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Journal</span>
            <span className="text-xs text-muted-foreground">{journalEntries.length} entries</span>
          </div>
          {journalExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {journalExpanded && (
          <div className="border-t p-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : journalEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No journal entries today</div>
            ) : (
              <div className="space-y-3">
                {/* Section Summary */}
                <p className="text-sm text-foreground leading-relaxed">
                  {journalSectionSummary || (aiSummary ? 
                    `Patient recorded ${journalEntries.length} journal ${journalEntries.length === 1 ? 'entry' : 'entries'} today.` : 
                    "Loading summary..."
                  )}
                </p>
                
                {/* Expandable Raw Transcripts */}
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    View raw transcripts ({journalEntries.length})
                  </summary>
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getMoodEmoji(entry.mood)}</span>
                          <span>{formatTime(entry.logged_at)}</span>
                          {entry.duration_seconds && (
                            <span>· {formatDuration(entry.duration_seconds)}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.transcript}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meals */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => setMealsExpanded(!mealsExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Meals</span>
            <span className="text-xs text-muted-foreground">{meals.length} logged</span>
          </div>
          {mealsExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {mealsExpanded && (
          <div className="border-t p-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : meals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No meals logged today</div>
            ) : (
              <div className="space-y-3">
                {/* Section Summary */}
                <p className="text-sm text-foreground leading-relaxed">
                  {mealsSectionSummary || (aiSummary ? 
                    `Patient logged ${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} today totaling ${meals.reduce((sum, m) => sum + (m.total_calories || 0), 0)} calories.` : 
                    "Loading summary..."
                  )}
                </p>
                
                {/* Expandable Meal Details */}
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    View meal details ({meals.length})
                  </summary>
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                    {meals.map((meal) => (
                      <div key={meal.id} className="flex items-start gap-3">
                        {meal.image_url ? (
                          <img
                            src={meal.image_url}
                            alt={meal.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
                            <Utensils className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{meal.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{mealTypeLabel(meal.meal_type)}</span>
                            <span>·</span>
                            <span>{formatTime(meal.consumed_at)}</span>
                            {meal.total_calories > 0 && (
                              <>
                                <span>·</span>
                                <span>{meal.total_calories} cal</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="bg-white rounded-lg border">
        <button
          onClick={() => setExercisesExpanded(!exercisesExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Activity</span>
            <span className="text-xs text-muted-foreground">{exercises.length} logged</span>
          </div>
          {exercisesExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {exercisesExpanded && (
          <div className="border-t p-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : exercises.length === 0 ? (
              <div className="text-sm text-muted-foreground">No exercises logged today</div>
            ) : (
              <div className="space-y-3">
                {/* Section Summary */}
                <p className="text-sm text-foreground leading-relaxed">
                  {exercisesSectionSummary || (aiSummary ? 
                    `Patient completed ${exercises.length} ${exercises.length === 1 ? 'activity' : 'activities'} today totaling ${exercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)} minutes.` : 
                    "Loading summary..."
                  )}
                </p>
                
                {/* Expandable Activity Details */}
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    View activity details ({exercises.length})
                  </summary>
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                    {exercises.map((exercise) => (
                      <div key={exercise.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{exercise.exercise_type || exercise.name || "Exercise"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(exercise.logged_at)}</span>
                            {exercise.duration_minutes && (
                              <>
                                <span>·</span>
                                <span>{exercise.duration_minutes} min</span>
                              </>
                            )}
                            {exercise.calories_burned && (
                              <>
                                <span>·</span>
                                <span>{exercise.calories_burned} cal</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Medication Assignment Form
function MedicationAssignForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [pills, setPills] = useState<PillType[]>([]);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [frequency, setFrequency] = useState("once_daily");
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS_OF_WEEK);
  const [times, setTimes] = useState(["08:00"]);
  const [isLoadingPills, setIsLoadingPills] = useState(true);

  useEffect(() => {
    async function fetchPills() {
      try {
        const res = await getPills();
        setPills(res.pills);
      } catch {
        // Ignore errors
      } finally {
        setIsLoadingPills(false);
      }
    }
    fetchPills();
  }, []);

  const selectedMed = pills.find(m => m.id === selectedMedId);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMedId) return;
    // TODO: Implement API call to create patient_pills record
    console.log("Assign medication:", { patientId, pillId: selectedMedId, frequency, selectedDays, times });
    onClose();
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Medication</label>
        <select
          value={selectedMedId}
          onChange={(e) => setSelectedMedId(e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isLoadingPills}
        >
          <option value="">{isLoadingPills ? "Loading..." : "Select medication"}</option>
          {pills.map((med) => (
            <option key={med.id} value={med.id}>
              {med.name} {med.strength}{med.unit} ({med.dosage_form})
            </option>
          ))}
        </select>
      </div>
      {selectedMed && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-[72px]">
          Dosage: {selectedMed.strength}{selectedMed.unit} {selectedMed.dosage_form}
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="once_daily">Once daily</option>
          <option value="twice_daily">Twice daily</option>
          <option value="three_times_daily">Three times daily</option>
          <option value="as_needed">As needed</option>
        </select>
      </div>
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0 pt-1">Days</label>
        <div className="flex gap-1 flex-wrap">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={cn(
                "w-7 h-6 text-[10px] rounded transition-colors",
                selectedDays.includes(day) 
                  ? "bg-primary text-white" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {day[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Time</label>
        <input
          type="time"
          value={times[0]}
          onChange={(e) => setTimes([e.target.value])}
          className="h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={!selectedMedId}>
          Assign
        </Button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline Diet Instruction Form
function DietInstructionForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      return;
    }
    
    setIsSaving(true);
    try {
      await createPatientPlan(patientId, {
        plan_type: "diet",
        title: "Diet Plan",
        notes: notes.trim(),
        restrictions: [],
      });
      onClose();
    } catch (err) {
      console.error("Failed to save diet plan:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-20 shrink-0 pt-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Avoid fried food, limit sodium, no processed foods..."
          rows={3}
          className="flex-1 px-2 py-1.5 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={isSaving || !notes.trim()}>
          {isSaving ? "Saving..." : "Save Plan"}
        </Button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline Exercise Plan Form
function ExercisePlanForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [exerciseType, setExerciseType] = useState("");
  const [minutesTarget, setMinutesTarget] = useState("30");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await createPatientPlan(patientId, {
        plan_type: "exercise",
        title: title || `${exerciseType || "Exercise"} Plan`,
        notes: notes.trim() || null,
        exercise_minutes_target: minutesTarget ? parseInt(minutesTarget) : null,
        exercise_days_per_week: daysPerWeek ? parseInt(daysPerWeek) : null,
        goals: exerciseType ? [exerciseType] : [],
      });
      onClose();
    } catch (err) {
      console.error("Failed to save exercise plan:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-20 shrink-0">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Daily Walking Plan"
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-20 shrink-0">Type</label>
        <select
          value={exerciseType}
          onChange={(e) => setExerciseType(e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select type</option>
          <option value="walking">Walking</option>
          <option value="stretching">Stretching</option>
          <option value="swimming">Swimming</option>
          <option value="cycling">Cycling</option>
          <option value="strength">Strength Training</option>
          <option value="yoga">Yoga</option>
          <option value="tai_chi">Tai Chi</option>
          <option value="gardening">Gardening</option>
        </select>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-20 shrink-0">Mins/day</label>
          <input
            type="number"
            value={minutesTarget}
            onChange={(e) => setMinutesTarget(e.target.value)}
            className="w-16 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Days/week</label>
          <input
            type="number"
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(e.target.value)}
            min="1"
            max="7"
            className="w-12 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-20 shrink-0 pt-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional instructions or goals..."
          rows={2}
          className="flex-1 px-2 py-1.5 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Plan"}
        </Button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
