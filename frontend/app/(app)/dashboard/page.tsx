"use client";

import { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Play,
  Video,
  BarChart3,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { 
  getPatients, 
  getPatientMeals,
  getPatientExercises,
  getPatientMedications,
  getPatientJournal,
  getPatientPillLogs,
  getPills,
  assignPatientMedication,
  generateDailySummary,
  createPatientPlan,
  updatePatientPlan,
  analyzeExercisePose,
  getExercisePoseAnalysis,
  type Patient,
  type Pill as PillType,
  type PillLog,
  type DailySummaryResponse,
  type JournalEntry,
  type PatientPlan
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
  
  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate(new Date()));

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
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + delta);
    setSelectedDate(getLocalDate(date));
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === getLocalDate(today)) return "Today";
    if (dateStr === getLocalDate(yesterday)) return "Yesterday";
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
                  <FoodSection patientId={selectedPatient.id} />
                </div>
              )}
              {activeTab === "exercise" && (
                <div className="bg-white rounded-lg border p-4">
                  <ExerciseSection patientId={selectedPatient.id} />
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

// Exercise Card with Video and Pose Analysis
type ExerciseWithAnalysis = {
  id: string;
  exercise_type: string;
  name?: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  logged_at: string;
  intensity?: string | null;
  notes?: string | null;
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

function ExerciseCard({ exercise }: { exercise: ExerciseWithAnalysis }) {
  const [showVideo, setShowVideo] = useState(false);
  const initialProcessedUrl = exercise.processed_video_url || exercise.pose_analysis?.processed_video_url;
  const [videoView, setVideoView] = useState<"raw" | "analyzed">(initialProcessedUrl ? "analyzed" : "raw");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(exercise.pose_analysis);
  const [processedUrl, setProcessedUrl] = useState(initialProcessedUrl);
  const autoAnalyzeTriggeredRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Sync state when exercise prop changes (e.g., data refetch)
  useEffect(() => {
    const newProcessedUrl = exercise.processed_video_url || exercise.pose_analysis?.processed_video_url;
    if (newProcessedUrl && newProcessedUrl !== processedUrl) {
      setProcessedUrl(newProcessedUrl);
      // Auto-switch to analyzed view when processed video becomes available
      if (videoView === "raw") {
        setVideoView("analyzed");
      }
    }
    if (exercise.pose_analysis && exercise.pose_analysis !== analysis) {
      setAnalysis(exercise.pose_analysis);
    }
  }, [exercise.processed_video_url, exercise.pose_analysis]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for analysis results
  const startPolling = (exerciseId: string) => {
    // Clear any existing poll
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await getExercisePoseAnalysis(exerciseId);
        
        if (result.has_analysis && result.pose_analysis) {
          // Analysis complete - update state and stop polling
          setAnalysis(result.pose_analysis);
          // Check both the column and the nested pose_analysis for processed_video_url
          const pUrl = result.processed_video_url || result.pose_analysis?.processed_video_url;
          if (pUrl) {
            setProcessedUrl(pUrl);
            setVideoView("analyzed");
          }
          setIsAnalyzing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeExercisePose(exercise.id);
      
      if (result.status === "completed" && result.pose_analysis) {
        // Already analyzed - use cached result
        setAnalysis(result.pose_analysis);
        // Check both the column and the nested pose_analysis for processed_video_url
        const pUrl = result.processed_video_url || result.pose_analysis?.processed_video_url;
        if (pUrl) {
          setProcessedUrl(pUrl);
          setVideoView("analyzed");
        }
        setIsAnalyzing(false);
      } else if (result.status === "processing") {
        // Analysis queued - start polling for results
        startPolling(exercise.id);
      }
    } catch (err) {
      console.error("Analysis request failed:", err);
      setIsAnalyzing(false);
    }
  };

  // Auto-trigger analysis if video exists but no analysis yet
  useEffect(() => {
    const hasVideo = !!exercise.video_url;
    const hasExistingAnalysis = !!exercise.pose_analysis?.summary;
    
    if (hasVideo && !hasExistingAnalysis && !autoAnalyzeTriggeredRef.current) {
      autoAnalyzeTriggeredRef.current = true;
      handleAnalyze();
    }
  }, [exercise.id]); // Only run once per exercise

  const hasVideo = !!exercise.video_url;
  const hasAnalysis = !!analysis?.summary;
  const hasProcessedVideo = !!processedUrl;

  // Get asymmetry issues
  const asymmetryIssues = analysis?.symmetry_analysis 
    ? Object.entries(analysis.symmetry_analysis)
        .filter(([, data]) => !data.symmetric)
        .map(([joint, data]) => ({ joint, ...data }))
    : [];

  // Current video URL based on view mode
  const currentVideoUrl = videoView === "analyzed" && hasProcessedVideo ? processedUrl : exercise.video_url;

  return (
    <div className="p-3 bg-slate-50/50 rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{exercise.exercise_type || exercise.name || "Exercise"}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(exercise.logged_at)}
            {exercise.duration_minutes && ` · ${exercise.duration_minutes} min`}
            {exercise.calories_burned && ` · ${exercise.calories_burned} cal`}
          </p>
        </div>
        
          <div className="flex items-center gap-2">
          {/* Status indicator */}
          {isAnalyzing ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
              </span>
          ) : hasAnalysis ? (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Analyzed
            </span>
          ) : null}
          
          {/* Video Toggle */}
          {hasVideo && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
                showVideo ? "bg-primary text-white" : "text-primary hover:bg-primary/10"
              )}
            >
              <Video className="h-3 w-3" />
              <span>{showVideo ? "Hide" : "Video"}</span>
            </button>
            )}
          </div>
          </div>

      {/* Expandable Video Section */}
      {hasVideo && showVideo && (
        <div className="mt-3 rounded-lg overflow-hidden border bg-white">
          {/* Video View Toggle (Raw / Analyzed) */}
          {hasProcessedVideo && (
            <div className="flex bg-slate-100">
              <button
                onClick={() => setVideoView("raw")}
                className={cn(
                  "flex-1 px-2 py-1 text-[10px] font-medium transition-colors",
                  videoView === "raw" 
                    ? "bg-white text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Raw Video
              </button>
              <button
                onClick={() => setVideoView("analyzed")}
                className={cn(
                  "flex-1 px-2 py-1 text-[10px] font-medium transition-colors",
                  videoView === "analyzed" 
                    ? "bg-white text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pose Analysis
              </button>
          </div>
          )}
          
          {/* Video Player */}
          <div className="relative bg-black flex items-center justify-center min-h-[200px] max-h-[400px]">
            <video
              key={currentVideoUrl}
              src={currentVideoUrl!}
              controls
              className="max-w-full max-h-[400px] w-auto h-auto"
              preload="metadata"
            />
            {/* Video type indicator */}
            <div className={cn(
              "absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-medium",
              videoView === "analyzed" && hasProcessedVideo
                ? "bg-emerald-500 text-white"
                : "bg-black/50 text-white"
            )}>
              {videoView === "analyzed" && hasProcessedVideo ? "Pose Overlay" : "Original"}
          </div>
          </div>
          
          {/* Pose Analysis Section */}
          <div className="p-3 bg-slate-50">
            {hasAnalysis ? (
              <div className="space-y-3">
                {/* AI Summary */}
                <p className="text-sm font-medium text-foreground leading-relaxed">{analysis.summary}</p>
                
                {/* Asymmetry Alerts */}
                {asymmetryIssues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {asymmetryIssues.map(({ joint, left, right, difference }) => (
                      <span
                        key={joint}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded"
                        title={`Left: ${left}° | Right: ${right}°`}
                      >
                        <AlertCircle className="h-3 w-3" />
                        {joint}: {difference.toFixed(0)}° diff
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Range of Motion Details */}
                {analysis.angle_statistics && Object.keys(analysis.angle_statistics).length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                      Range of motion details
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(analysis.angle_statistics).slice(0, 4).map(([joint, stats]) => (
                        <div key={joint} className="text-xs px-2 py-1.5 bg-white rounded border">
                          <span className="text-muted-foreground">{joint.replace(/_/g, " ")}:</span>
                          <span className="ml-1 font-medium">{stats.range}° range</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 text-sm py-2 text-primary hover:bg-primary/5 rounded transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing movement...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    <span>Analyze movement</span>
                  </>
                )}
              </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

type AssignedMedication = {
  id: string;
  name: string;
  strength?: number;
  unit?: string;
  dosage_form?: string;
  frequency?: string;
  times_of_day?: string[];
};

function PlansContent({ patient }: { patient: Patient }) {
  const [showMedForm, setShowMedForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [dietPlan, setDietPlan] = useState<PatientPlan | null>(null);
  const [exercisePlan, setExercisePlan] = useState<PatientPlan | null>(null);
  const [medications, setMedications] = useState<AssignedMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const [plansRes, medsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/patients/${patient.id}/plans`, { cache: "no-store" }).then(r => r.json()),
        getPatientMedications(patient.id),
      ]);
      
      const plans = plansRes.plans || [];
      const activeDietPlans = plans.filter((p: PatientPlan) => p.plan_type === "diet" && p.is_active);
      const activeExercisePlans = plans.filter((p: PatientPlan) => p.plan_type === "exercise" && p.is_active);
      
      // Get the most recent active plan (sorted by created_at desc)
      setDietPlan(activeDietPlans.length > 0 
        ? activeDietPlans.sort((a: PatientPlan, b: PatientPlan) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0] 
        : null);
      setExercisePlan(activeExercisePlans.length > 0 
        ? activeExercisePlans.sort((a: PatientPlan, b: PatientPlan) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0] 
        : null);
      
      // Store full medication list from assigned_medications
      const assignedMeds = medsRes.assigned_medications || [];
      setMedications(assignedMeds.map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: (m.pills as Record<string, unknown>)?.name as string || "Unknown",
        strength: (m.pills as Record<string, unknown>)?.strength as number,
        unit: (m.pills as Record<string, unknown>)?.unit as string,
        dosage_form: (m.pills as Record<string, unknown>)?.dosage_form as string,
        frequency: m.frequency as string,
        times_of_day: m.times_of_day as string[],
      })));
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
              onClose={() => { setShowMedForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showMedForm && (
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : medications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active prescriptions</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{medications.length} active prescription{medications.length !== 1 ? "s" : ""}</p>
                  <div className="space-y-1.5">
                    {medications.map((med) => (
                      <div key={med.id} className="flex items-center justify-between p-2 bg-primary/5 rounded text-sm">
                        <div>
                          <span className="font-medium text-foreground">{med.name}</span>
                          {med.strength && med.unit && (
                            <span className="text-muted-foreground ml-1">
                              {med.strength}{med.unit}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {med.frequency?.replace(/_/g, " ")}
                          {med.times_of_day && med.times_of_day.length > 0 && ` · ${med.times_of_day.join(", ")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
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
            {showDietForm ? (
              <>
                <span>Cancel</span>
              </>
            ) : dietPlan ? (
              <>
                <span>Edit</span>
              </>
            ) : (
              <>
              <Plus className="h-3 w-3" />
                <span>Add</span>
              </>
            )}
            </button>
          </div>
          
          {showDietForm && (
            <DietInstructionForm 
              patientId={patient.id} 
            existingPlan={dietPlan}
            onClose={() => { setShowDietForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showDietForm && (
          <div className="space-y-2">
            {dietPlan ? (
              <div className="p-3 bg-amber-50 rounded border space-y-2">
                <p className="text-base text-foreground leading-relaxed">{dietPlan.notes || "No notes"}</p>
                {(dietPlan.calorie_target || dietPlan.protein_target || dietPlan.carb_target || dietPlan.fat_target) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/50">
                    {dietPlan.calorie_target && (
                      <span className="text-xs text-muted-foreground">
                        Target: {dietPlan.calorie_target} cal
                      </span>
                    )}
                    {dietPlan.protein_target && (
                      <span className="text-xs text-muted-foreground">
                        · {dietPlan.protein_target}g protein
                      </span>
                    )}
                    {dietPlan.carb_target && (
                      <span className="text-xs text-muted-foreground">
                        · {dietPlan.carb_target}g carbs
                      </span>
                    )}
                    {dietPlan.fat_target && (
                      <span className="text-xs text-muted-foreground">
                        · {dietPlan.fat_target}g fat
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(dietPlan.updated_at || dietPlan.created_at).toLocaleDateString()}
                </p>
              </div>
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
            {showExerciseForm ? (
              <>
                <span>Cancel</span>
              </>
            ) : exercisePlan ? (
              <>
                <span>Edit</span>
              </>
            ) : (
              <>
              <Plus className="h-3 w-3" />
                <span>Add</span>
              </>
            )}
            </button>
          </div>
          
          {showExerciseForm && (
            <ExercisePlanForm 
              patientId={patient.id} 
            existingPlan={exercisePlan}
            onClose={() => { setShowExerciseForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showExerciseForm && (
          <div className="space-y-2">
            {exercisePlan ? (
              <div className="p-3 bg-slate-50 rounded border">
                <p className="text-base text-foreground leading-relaxed">{exercisePlan.notes || "No guidelines specified"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Added {new Date(exercisePlan.created_at).toLocaleDateString()}
                </p>
              </div>
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
    video_url?: string | null;
    processed_video_url?: string | null;
    pose_analysis?: {
      summary?: string;
      processed_video_url?: string;
      video_info?: { duration_seconds: number; analyzed_frames: number };
      symmetry_analysis?: Record<string, { left: number; right: number; difference: number; symmetric: boolean }>;
      angle_statistics?: Record<string, { min: number; max: number; avg: number; range: number }>;
    } | null;
  }>>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [pillLogs, setPillLogs] = useState<PillLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<DailySummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [mealsExpanded, setMealsExpanded] = useState(false);
  const [medicationsExpanded, setMedicationsExpanded] = useState(false);
  const [exercisesExpanded, setExercisesExpanded] = useState(false);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [journalSectionSummary, setJournalSectionSummary] = useState<string>("");
  const [mealsSectionSummary, setMealsSectionSummary] = useState<string>("");
  const [exercisesSectionSummary, setExercisesSectionSummary] = useState<string>("");
  const [lastDataHash, setLastDataHash] = useState("");
  
  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  
  const todayDate = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [viewMode, setViewMode] = useState<"day" | "all">("day"); // "day" for specific day (default: today), "all" for all recent

  // Helper to format date for display
  const formatDateDisplay = (dateStr: string) => {
    // Parse as local date
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === todayDate) return "Today";
    if (dateStr === getLocalDateString(yesterday)) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    setSelectedDate(getLocalDateString(date));
    setViewMode("day");
  };

  // Navigate to next day
  const goToNextDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const nextDate = getLocalDateString(date);
    if (nextDate <= todayDate) {
      setSelectedDate(nextDate);
      setViewMode("day");
    }
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(todayDate);
    setViewMode("all");
  };

  // Fetch all data - reset all state when patient or date changes
  useEffect(() => {
    // Reset all state when patient changes
    setAiSummary(null);
    setJournalSectionSummary("");
    setMealsSectionSummary("");
    setExercisesSectionSummary("");
    setMeals([]);
    setExercises([]);
    setJournalEntries([]);
    
    async function fetchPatientData() {
      setIsLoading(true);
      try {
        if (viewMode === "all") {
          // Fetch all recent data without date filter
          const [mealsRes, exercisesRes, journalRes, pillLogsRes] = await Promise.all([
            getPatientMeals(patient.id),
            getPatientExercises(patient.id),
            getPatientJournal(patient.id),
            getPatientPillLogs(patient.id),
          ]);
          
          setMeals(mealsRes.meals);
          setExercises(exercisesRes.exercises);
          setJournalEntries(journalRes.entries);
          setPillLogs(pillLogsRes.logs);
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/b12fea9c-4114-4d21-8093-3b36063386e1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:964',message:'Journal data fetched (all mode)',data:{entryCount:journalRes.entries.length,firstEntry:journalRes.entries[0]?{id:journalRes.entries[0].id,hasTranscript:!!journalRes.entries[0].transcript,transcriptPreview:journalRes.entries[0].transcript?.substring(0,50),hasAiAnalysis:!!journalRes.entries[0].ai_analysis,aiAnalysisType:typeof journalRes.entries[0].ai_analysis}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
        } else {
          // Fetch data for specific date
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/b12fea9c-4114-4d21-8093-3b36063386e1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:fetch_start',message:'Fetching data for date',data:{selectedDate,patientId:patient.id,viewMode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          const [mealsRes, exercisesRes, journalRes, pillLogsRes] = await Promise.all([
            getPatientMeals(patient.id, selectedDate),
            getPatientExercises(patient.id, selectedDate),
            getPatientJournal(patient.id, selectedDate, selectedDate),
            getPatientPillLogs(patient.id, selectedDate),
          ]);
          
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/b12fea9c-4114-4d21-8093-3b36063386e1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:pill_logs_fetched',message:'Pill logs response',data:{total:pillLogsRes.total,logsCount:pillLogsRes.logs?.length || 0,logsSample:pillLogsRes.logs?.slice(0,3) || []},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H4,H5'})}).catch(()=>{});
          // #endregion
          
          setMeals(mealsRes.meals);
          setExercises(exercisesRes.exercises);
          setJournalEntries(journalRes.entries);
          setPillLogs(pillLogsRes.logs);
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/b12fea9c-4114-4d21-8093-3b36063386e1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:975',message:'Journal data fetched (day mode)',data:{entryCount:journalRes.entries.length,firstEntry:journalRes.entries[0]?{id:journalRes.entries[0].id,hasTranscript:!!journalRes.entries[0].transcript,transcriptPreview:journalRes.entries[0].transcript?.substring(0,50),hasAiAnalysis:!!journalRes.entries[0].ai_analysis,aiAnalysisType:typeof journalRes.entries[0].ai_analysis}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
        }
        
        // Create hash of data to detect changes
        const dataHash = JSON.stringify({
          meals: meals.length,
          exercises: exercises.length,
          journal: journalEntries.length,
          date: selectedDate,
          viewMode,
        });
        setLastDataHash(dataHash);
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }
    fetchPatientData();
  }, [patient.id, selectedDate, viewMode]);

  // Auto-generate summary when there's activity and no summary yet
  useEffect(() => {
    const hasActivity = meals.length > 0 || exercises.length > 0 || journalEntries.length > 0;
    if (hasActivity && !aiSummary && !isGeneratingSummary && !isLoading) {
      handleGenerateSummary();
    }
  }, [meals.length, exercises.length, journalEntries.length, isLoading]);

  const handleGenerateSummary = async (forceRefresh = false) => {
    setIsGeneratingSummary(true);
    try {
      // Use selected date instead of always using today
      const summaryDate = viewMode === "day" ? selectedDate : todayDate;
      // Pass forceRefresh to bypass cache when manually refreshing
      const summary = await generateDailySummary(patient.id, summaryDate, forceRefresh);
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

  // Helper to get local date from timestamp
  const getLocalDateFromTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Group items by date for display (using local timezone)
  const groupByDate = <T extends { logged_at?: string; consumed_at?: string }>(items: T[]) => {
    const groups: Record<string, T[]> = {};
    items.forEach(item => {
      const timestamp = item.logged_at || item.consumed_at || "";
      if (!timestamp) return;
      const dateStr = getLocalDateFromTimestamp(timestamp);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Sort newest first
  };

  const isToday = selectedDate === todayDate;

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-1 rounded hover:bg-slate-100 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {viewMode === "all" ? "All Recent Activity" : formatDateDisplay(selectedDate)}
              </span>
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday && viewMode === "day"}
              className={cn(
                "p-1 rounded hover:bg-slate-100 text-muted-foreground hover:text-foreground",
                isToday && viewMode === "day" && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "all" ? "day" : "all")}
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors",
                viewMode === "all" ? "bg-primary text-white" : "text-primary hover:bg-primary/10"
              )}
            >
              {viewMode === "all" ? "Viewing All" : "Viewing Day"}
            </button>
            {(viewMode === "day" && !isToday) && (
              <button
                onClick={goToToday}
                className="text-xs text-primary hover:underline"
              >
                Go to Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            {viewMode === "all" ? "Summary" : "Daily Summary"}
          </h3>
          {aiSummary && (
            <button
              onClick={() => handleGenerateSummary(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Force regenerate summary (uses AI credits)"
            >
              Refresh
            </button>
          )}
        </div>
        <div className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : aiSummary ? (
            <>
              <p className="text-sm font-medium text-foreground leading-relaxed">{aiSummary.summary}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{aiSummary.stats.meals} meals</span>
                <span>·</span>
                <span>{aiSummary.stats.exercises} exercises</span>
                <span>·</span>
                <span>{aiSummary.stats.adherence_percent}% meds</span>
                <span>·</span>
                <span>{aiSummary.stats.journal_entries} journal</span>
              </div>
            </>
          ) : totalActivity === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logged today yet.</p>
          ) : (
            <p className="text-sm text-muted-foreground animate-pulse">Generating summary...</p>
          )}
        </div>
      </div>

      {/* Journal Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3">
          <button
            onClick={() => setJournalExpanded(!journalExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Journal</h3>
              <span className="text-xs text-muted-foreground">{journalEntries.length} {journalEntries.length === 1 ? "entry" : "entries"}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", journalExpanded && "rotate-180")} />
          </button>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : journalEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              No journal entries {viewMode === "all" ? "recorded" : "today"}
            </p>
          ) : journalSectionSummary ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {journalSectionSummary}
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
              Analyzing journal entries...
            </div>
          )}
        </div>
        {journalExpanded && journalEntries.length > 0 && (
          <div className="px-4 pb-4 border-t">
            <div className="pt-3 space-y-3">
              {(viewMode === "all" ? groupByDate(journalEntries) : [[formatDateDisplay(selectedDate), journalEntries] as [string, typeof journalEntries]]).map(([dateStr, entries]) => (
                <div key={dateStr} className="space-y-2">
                  {viewMode === "all" && (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{dateStr}</p>
                  )}
                  {entries.map((entry) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7246/ingest/b12fea9c-4114-4d21-8093-3b36063386e1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1228',message:'Journal entry data',data:{entryId:entry.id,hasTranscript:!!entry.transcript,transcriptLength:entry.transcript?.length,transcriptPreview:entry.transcript?.substring(0,50),hasAiSummary:!!entry.ai_analysis?.summary,aiSummaryPreview:entry.ai_analysis?.summary?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
                    // #endregion
                    return (
                    <div key={entry.id} className="py-3 border-b border-slate-100 last:border-b-0 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getMoodEmoji(entry.mood)}</span>
                        <span>{formatTime(entry.logged_at)}</span>
                        {entry.duration_seconds && <span>· {formatDuration(entry.duration_seconds)}</span>}
                      </div>
                      {entry.ai_analysis?.summary && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                          <p className="text-sm text-foreground leading-relaxed">{entry.ai_analysis.summary}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Raw Transcript</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{entry.transcript}</p>
                      </div>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* Meals Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3">
          <button
            onClick={() => setMealsExpanded(!mealsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Meals</h3>
              <span className="text-xs text-muted-foreground">{meals.length} logged · {meals.reduce((sum, m) => sum + (m.total_calories || 0), 0)} cal</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", mealsExpanded && "rotate-180")} />
          </button>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : meals.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              No meals logged {viewMode === "all" ? "yet" : "today"}
            </p>
          ) : mealsSectionSummary ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {mealsSectionSummary}
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
              Analyzing nutrition...
            </div>
          )}
        </div>
        {mealsExpanded && meals.length > 0 && (
          <div className="px-4 pb-4 border-t">
            <div className="pt-3 space-y-2">
              {(viewMode === "all" ? groupByDate(meals.map(m => ({ ...m, logged_at: m.consumed_at }))) : [[formatDateDisplay(selectedDate), meals] as [string, typeof meals]]).map(([dateStr, dateMeals]) => (
                <div key={dateStr}>
                  {viewMode === "all" && (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{dateStr}</p>
                  )}
                  {dateMeals.map((meal) => (
                    <div key={meal.id} className="py-3 border-b border-slate-100 last:border-b-0 space-y-2">
                      <div className="flex items-center gap-3">
                        {meal.image_url ? (
                          <img src={meal.image_url} alt={meal.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Utensils className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{meal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {mealTypeLabel(meal.meal_type)} · {formatTime(meal.consumed_at)}
                            {meal.total_calories > 0 && ` · ${meal.total_calories} cal`}
                          </p>
                          {meal.ai_analysis && (
                            <p className="text-sm text-emerald-600 leading-relaxed mt-1">{meal.ai_analysis}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3">
          <button
            onClick={() => setExercisesExpanded(!exercisesExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Activity</h3>
              <span className="text-xs text-muted-foreground">{exercises.length} logged · {exercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)} min</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", exercisesExpanded && "rotate-180")} />
          </button>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              No exercises logged {viewMode === "all" ? "yet" : "today"}
            </p>
          ) : exercisesSectionSummary ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {exercisesSectionSummary}
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
              Analyzing activity...
            </div>
          )}
        </div>
        {exercisesExpanded && exercises.length > 0 && (
          <div className="px-4 pb-4 border-t">
            <div className="pt-3 space-y-2">
              {(viewMode === "all" ? groupByDate(exercises) : [[formatDateDisplay(selectedDate), exercises] as [string, typeof exercises]]).map(([dateStr, dateExercises]) => (
                <div key={dateStr}>
                  {viewMode === "all" && (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{dateStr}</p>
                  )}
                  {dateExercises.map((exercise) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medications Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-3">
          <button
            onClick={() => setMedicationsExpanded(!medicationsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Medications</h3>
              <span className="text-xs text-muted-foreground">
                {pillLogs.filter(l => l.status === "taken" || l.status === "late").length} taken · {pillLogs.filter(l => l.status === "missed").length} missed · {pillLogs.filter(l => l.status === "pending").length} pending
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", medicationsExpanded && "rotate-180")} />
          </button>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : pillLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              No medications scheduled {viewMode === "all" ? "yet" : "today"}
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pillLogs.filter(l => l.status === "taken" || l.status === "late").length} of {pillLogs.length} medications taken
                {pillLogs.filter(l => l.status === "missed").length > 0 && `, ${pillLogs.filter(l => l.status === "missed").length} missed`}
              </p>
            </div>
          )}
        </div>
        {medicationsExpanded && pillLogs.length > 0 && (
          <div className="px-4 pb-4 border-t">
            <div className="pt-3 space-y-2">
              {pillLogs.map((log) => {
                const pill = log.patient_pills?.pills;
                const statusColors = {
                  taken: "text-emerald-600 bg-emerald-50",
                  late: "text-amber-600 bg-amber-50",
                  missed: "text-red-600 bg-red-50",
                  pending: "text-slate-600 bg-slate-50"
                };
                return (
                  <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {pill?.name || "Unknown"} {pill?.strength}{pill?.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {new Date(log.scheduled_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded capitalize", statusColors[log.status])}>
                      {log.status}
                    </span>
                  </div>
                );
              })}
            </div>
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
    try {
      await assignPatientMedication(patientId, selectedMedId, frequency, selectedDays, times);
      onClose();
    } catch (err) {
      console.error("Failed to assign medication:", err);
    }
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
function DietInstructionForm({ patientId, existingPlan, onClose }: { patientId: string; existingPlan?: PatientPlan | null; onClose: () => void }) {
  const [notes, setNotes] = useState(existingPlan?.notes || "");
  const [calorieTarget, setCalorieTarget] = useState(existingPlan?.calorie_target?.toString() || "");
  const [proteinTarget, setProteinTarget] = useState(existingPlan?.protein_target?.toString() || "");
  const [carbTarget, setCarbTarget] = useState(existingPlan?.carb_target?.toString() || "");
  const [fatTarget, setFatTarget] = useState(existingPlan?.fat_target?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingPlan) {
      setNotes(existingPlan.notes || "");
      setCalorieTarget(existingPlan.calorie_target?.toString() || "");
      setProteinTarget(existingPlan.protein_target?.toString() || "");
      setCarbTarget(existingPlan.carb_target?.toString() || "");
      setFatTarget(existingPlan.fat_target?.toString() || "");
    }
  }, [existingPlan]);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError("Please enter dietary notes");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      const planData = {
        notes: notes.trim(),
        calorie_target: calorieTarget ? parseInt(calorieTarget) : null,
        protein_target: proteinTarget ? parseInt(proteinTarget) : null,
        carb_target: carbTarget ? parseInt(carbTarget) : null,
        fat_target: fatTarget ? parseInt(fatTarget) : null,
      };

      if (existingPlan) {
        const result = await updatePatientPlan(patientId, existingPlan.id, planData);
        if (result.plan) {
          onClose();
        } else {
          setError("Failed to update plan");
        }
      } else {
        const result = await createPatientPlan(patientId, {
          plan_type: "diet",
          title: "Diet Plan",
          restrictions: [],
          ...planData,
        });
        if (result.plan) {
          onClose();
        } else {
          setError("Failed to save plan");
        }
      }
    } catch (err) {
      console.error("Failed to save diet plan:", err);
      setError("Failed to save plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Dietary Guidelines</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Avoid fried food, limit sodium, no processed foods, increase fiber..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Daily Calorie Target</label>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(e.target.value)}
            placeholder="e.g., 2000"
            className="w-full h-9 px-3 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Protein Target (g)</label>
          <input
            type="number"
            value={proteinTarget}
            onChange={(e) => setProteinTarget(e.target.value)}
            placeholder="e.g., 150"
            className="w-full h-9 px-3 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Carb Target (g)</label>
          <input
            type="number"
            value={carbTarget}
            onChange={(e) => setCarbTarget(e.target.value)}
            placeholder="e.g., 250"
            className="w-full h-9 px-3 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Fat Target (g)</label>
          <input
            type="number"
            value={fatTarget}
            onChange={(e) => setFatTarget(e.target.value)}
            placeholder="e.g., 65"
            className="w-full h-9 px-3 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isSaving || !notes.trim()}>
          {isSaving ? "Saving..." : existingPlan ? "Update Diet Plan" : "Save Diet Plan"}
        </Button>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline Exercise Plan Form
function ExercisePlanForm({ patientId, existingPlan, onClose }: { patientId: string; existingPlan?: PatientPlan | null; onClose: () => void }) {
  const [notes, setNotes] = useState(existingPlan?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingPlan) {
      setNotes(existingPlan.notes || "");
    }
  }, [existingPlan]);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError("Please enter exercise guidelines");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      if (existingPlan) {
        // Update existing plan
        const result = await updatePatientPlan(patientId, existingPlan.id, {
          notes: notes.trim(),
        });
        if (result.plan) {
          onClose();
        } else {
          setError("Failed to update plan");
        }
      } else {
        // Create new plan
        const result = await createPatientPlan(patientId, {
          plan_type: "exercise",
          title: "Exercise Plan",
          notes: notes.trim(),
        });
        if (result.plan) {
          onClose();
        } else {
          setError("Failed to save plan");
        }
      }
    } catch (err) {
      console.error("Failed to save exercise plan:", err);
      setError("Failed to save plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Exercise Guidelines</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., 30 minutes walking daily, strength training 3x per week, gentle stretching..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-muted/30 rounded border border-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isSaving || !notes.trim()}>
          {isSaving ? "Saving..." : existingPlan ? "Update Exercise Plan" : "Save Exercise Plan"}
        </Button>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
