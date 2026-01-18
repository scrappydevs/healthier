"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  AlertCircle,
  AlertTriangle,
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
  Loader2,
  Info,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  updateExercise,
  updatePatient,
  getExerciseCatalog,
  getPrescribedExercises,
  prescribeExercise,
  removePrescribedExercise,
  type Patient,
  type Pill as PillType,
  type PillLog,
  type DailySummaryResponse,
  type DailySummaryAlert,
  type JournalEntry,
  type PatientPlan,
  type ExerciseCatalogItem,
  type PrescribedExercise
} from "@/lib/api";
import { FoodSection } from "@/components/patient/FoodSection";
import { ExerciseSection } from "@/components/patient/ExerciseSection";
import { MedicationSection } from "@/components/patient/MedicationSection";
import { JournalSection } from "@/components/patient/JournalSection";
import { MedicationDetailsModal } from "@/components/medications/MedicationDetailsModal";

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
  const [careSettingFilter, setCareSettingFilter] = useState<"all" | "in_clinic" | "at_home">("all");
  
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

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCareSetting = careSettingFilter === "all" || p.care_setting === careSettingFilter;
    return matchesSearch && matchesCareSetting;
  });
  
  const inClinicCount = patients.filter(p => p.care_setting === "in_clinic").length;
  const atHomeCount = patients.filter(p => p.care_setting === "at_home").length;

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

        {/* Care Setting Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setCareSettingFilter("all")}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold tracking-tight transition-colors",
              careSettingFilter === "all" 
                ? "text-slate-900 border-b-2 border-slate-900" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setCareSettingFilter("in_clinic")}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold tracking-tight transition-colors",
              careSettingFilter === "in_clinic" 
                ? "text-slate-900 border-b-2 border-slate-900" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Clinic ({inClinicCount})
          </button>
          <button
            onClick={() => setCareSettingFilter("at_home")}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold tracking-tight transition-colors",
              careSettingFilter === "at_home" 
                ? "text-slate-900 border-b-2 border-slate-900" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Home ({atHomeCount})
          </button>
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
                <div
                  key={patient.id}
                  className={cn(
                    "px-3 py-2 transition-colors border-l-2",
                    isSelected 
                      ? "bg-primary/5 border-l-primary" 
                      : "border-l-transparent hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setActiveTab("overview");
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <span className="text-sm font-medium text-slate-900 tracking-tight truncate block">
                        {patient.full_name}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {hasMeds ? (
                        <>
                          <span className="text-xs font-semibold tabular-nums text-slate-500">
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
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setActiveTab("overview");
                      }}
                      className="text-left"
                    >
                      <span className="text-xs text-slate-500">
                        {patient.medication_count} meds · {formatLastActive(patient.last_active)}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newSetting = "at_home";
                          if (patient.care_setting === newSetting) return;
                          try {
                            await updatePatient(patient.id, { care_setting: newSetting });
                            setPatients(prev => prev.map(p => 
                              p.id === patient.id ? { ...p, care_setting: newSetting } : p
                            ));
                            if (selectedPatient?.id === patient.id) {
                              setSelectedPatient({ ...selectedPatient, care_setting: newSetting });
                            }
                            // Invalidate hospital room cache (triggers auto-discharge via DB trigger)
                            window.dispatchEvent(new CustomEvent('pillpal-invalidate-cache', {
                              detail: { keys: ['rooms', 'patients'], timestamp: Date.now() }
                            }));
                          } catch (err) {
                            console.error("Failed to update care setting:", err);
                          }
                        }}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                          patient.care_setting === "at_home"
                            ? "bg-slate-900 text-white"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                        title="Set to At-Home"
                      >
                        Home
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newSetting = "in_clinic";
                          if (patient.care_setting === newSetting) return;
                          try {
                            await updatePatient(patient.id, { care_setting: newSetting });
                            setPatients(prev => prev.map(p => 
                              p.id === patient.id ? { ...p, care_setting: newSetting } : p
                            ));
                            if (selectedPatient?.id === patient.id) {
                              setSelectedPatient({ ...selectedPatient, care_setting: newSetting });
                            }
                            // Invalidate hospital room cache
                            window.dispatchEvent(new CustomEvent('pillpal-invalidate-cache', {
                              detail: { keys: ['rooms', 'patients'], timestamp: Date.now() }
                            }));
                          } catch (err) {
                            console.error("Failed to update care setting:", err);
                          }
                        }}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                          patient.care_setting === "in_clinic"
                            ? "bg-slate-900 text-white"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                        title="Set to In-Clinic"
                      >
                        Clinic
                      </button>
                    </div>
                  </div>
                </div>
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
                    <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                      {selectedPatient.full_name}
                    </h1>
                    <button
                      onClick={async () => {
                        const newSetting = selectedPatient.care_setting === "in_clinic" ? "at_home" : "in_clinic";
                        try {
                          await updatePatient(selectedPatient.id, { care_setting: newSetting });
                          // Update local state immediately
                          setSelectedPatient({ ...selectedPatient, care_setting: newSetting });
                          setPatients(prev => prev.map(p => 
                            p.id === selectedPatient.id ? { ...p, care_setting: newSetting } : p
                          ));
                          // Invalidate hospital room cache (triggers auto-discharge via DB trigger)
                          window.dispatchEvent(new CustomEvent('pillpal-invalidate-cache', {
                            detail: { keys: ['rooms', 'patients'], timestamp: Date.now() }
                          }));
                        } catch (err) {
                          console.error("Failed to update care setting:", err);
                        }
                      }}
                      className="px-2 py-0.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      title={`Switch to ${selectedPatient.care_setting === "in_clinic" ? "At-Home" : "In-Clinic"}`}
                    >
                      {selectedPatient.care_setting === "in_clinic" ? "In-Clinic" : "At-Home"}
                    </button>
                    <StatusBadge status={getStatusFromAdherence(selectedPatient.adherence_rate)} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
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
  
  // Inline editing state - prioritize name over exercise_type
  const displayName = exercise.name || exercise.exercise_type || "Exercise";
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleSaveName = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName || trimmedName === displayName) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      // Update the name field (prioritized for display and AI analysis)
      await updateExercise(exercise.id, { name: trimmedName });
      // Update local display - the parent will refetch on next interval
      exercise.name = trimmedName;
    } catch (err) {
      console.error("Failed to update exercise name:", err);
      setEditedName(displayName);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
  
  // Check if analysis failed (contains error message)
  const analysisError = analysis?.summary?.includes("Unable to analyze") || analysis?.summary?.includes("not available");
  const hasSuccessfulAnalysis = hasAnalysis && !analysisError;

  // Get asymmetry issues
  const asymmetryIssues = analysis?.symmetry_analysis 
    ? Object.entries(analysis.symmetry_analysis)
        .filter(([, data]) => !data.symmetric)
        .map(([joint, data]) => ({ joint, ...data }))
    : [];

  // Current video URL based on view mode
  const currentVideoUrl = videoView === "analyzed" && hasProcessedVideo ? processedUrl : exercise.video_url;

  return (
    <div className="py-3 border-b last:border-b-0">
      {/* Header - inline layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveName();
                    } else if (e.key === "Escape") {
                      setEditedName(exercise.name || exercise.exercise_type || "");
                      setIsEditing(false);
                    }
                  }}
                  disabled={isSaving}
                  className="font-medium text-foreground text-sm bg-muted/50 border border-foreground/20 rounded px-2 py-0.5 focus:border-foreground focus:outline-none w-40"
                  placeholder="e.g. Squat, Lunge, Curl"
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="font-medium text-foreground text-sm hover:bg-muted/50 rounded px-1 -ml-1 border border-dashed border-muted-foreground/30 hover:border-foreground/50 transition-colors cursor-text"
                  title="Click to rename exercise"
                >
                  {exercise.name || exercise.exercise_type || "Exercise"}
                </button>
              )}
              {isAnalyzing ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              ) : hasSuccessfulAnalysis ? (
                <span className="text-xs text-emerald-600">✓</span>
              ) : analysisError ? (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setAnalysis(null);
                    autoAnalyzeTriggeredRef.current = false;
                    setIsAnalyzing(true);
                    try {
                      const result = await analyzeExercisePose(exercise.id, true);
                      if (result.status === "completed" && result.pose_analysis) {
                        setAnalysis(result.pose_analysis);
                        const pUrl = result.processed_video_url || result.pose_analysis?.processed_video_url;
                        if (pUrl) {
                          setProcessedUrl(pUrl);
                          setVideoView("analyzed");
                        }
                        setIsAnalyzing(false);
                      } else if (result.status === "processing") {
                        startPolling(exercise.id);
                      }
                    } catch (err) {
                      console.error("Retry analysis failed:", err);
                      setIsAnalyzing(false);
                    }
                  }}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                  title="Analysis failed - click to retry"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>⚠ Retry</span>
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTime(exercise.logged_at)}
              {exercise.duration_minutes && ` · ${exercise.duration_minutes} min`}
              {exercise.calories_burned && ` · ${exercise.calories_burned} cal`}
            </p>
          </div>
        </div>
        
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

      {/* Expandable Video Section */}
      {hasVideo && showVideo && (
        <div className="mt-3 border-t pt-3">
          {/* Video View Toggle */}
          {hasProcessedVideo && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setVideoView("raw")}
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors",
                  videoView === "raw" 
                    ? "bg-slate-200 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Original Video
              </button>
              <button
                onClick={() => setVideoView("analyzed")}
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors",
                  videoView === "analyzed" 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pose Overlay
              </button>
            </div>
          )}
          
          {/* Video Player */}
          <div className="relative bg-black rounded overflow-hidden flex items-center justify-center min-h-[280px] max-h-[400px]">
            <video
              key={currentVideoUrl}
              src={currentVideoUrl!}
              controls
              className="max-w-full max-h-[400px] w-auto h-auto"
              preload="metadata"
            />
          </div>
          
          {/* Pose Analysis Summary */}
          {hasSuccessfulAnalysis && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
              
              {/* Asymmetry inline with severity colors */}
              {asymmetryIssues.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {asymmetryIssues.map(({ joint, difference }) => {
                    // Color coding: red >= 40°, amber >= 20°, green < 20°
                    const severity = difference >= 40 ? "high" : difference >= 20 ? "medium" : "low";
                    return (
                      <span 
                        key={joint}
                        className={cn(
                          "px-1.5 py-0.5 rounded",
                          severity === "high" && "bg-red-100 text-red-700",
                          severity === "medium" && "bg-amber-100 text-amber-700",
                          severity === "low" && "bg-green-100 text-green-700"
                        )}
                      >
                        {joint}: {difference.toFixed(0)}° diff
                      </span>
                    );
                  })}
                </div>
              )}
              
              {/* Form tips for this exercise */}
              {analysis.form_tips && analysis.form_tips.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Form tips for {exercise.name || exercise.exercise_type || "this exercise"}
                  </summary>
                  <ul className="mt-1 space-y-1 pl-4 text-muted-foreground list-disc">
                    {analysis.form_tips.map((tip: string, idx: number) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </details>
              )}
              
              {/* Re-analyze button (useful after renaming exercise) */}
              <button
                onClick={async () => {
                  setAnalysis(null);
                  autoAnalyzeTriggeredRef.current = false;
                  setIsAnalyzing(true);
                  try {
                    const result = await analyzeExercisePose(exercise.id, true);
                    if (result.status === "completed" && result.pose_analysis) {
                      setAnalysis(result.pose_analysis);
                      const pUrl = result.processed_video_url || result.pose_analysis?.processed_video_url;
                      if (pUrl) {
                        setProcessedUrl(pUrl);
                        setVideoView("analyzed");
                      }
                      setIsAnalyzing(false);
                    } else if (result.status === "processing") {
                      startPolling(exercise.id);
                    }
                  } catch (err) {
                    console.error("Re-analysis failed:", err);
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Re-analyze</span>
              </button>
            </div>
          )}
          
          {/* Analysis Error with Retry */}
          {analysisError && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-amber-700 leading-relaxed">{analysis?.summary}</p>
              <button
                onClick={async () => {
                  // Clear local state and force re-analysis
                  setAnalysis(null);
                  autoAnalyzeTriggeredRef.current = false;
                  setIsAnalyzing(true);
                  try {
                    const result = await analyzeExercisePose(exercise.id, true); // force=true
                    if (result.status === "completed" && result.pose_analysis) {
                      setAnalysis(result.pose_analysis);
                      const pUrl = result.processed_video_url || result.pose_analysis?.processed_video_url;
                      if (pUrl) {
                        setProcessedUrl(pUrl);
                        setVideoView("analyzed");
                      }
                      setIsAnalyzing(false);
                    } else if (result.status === "processing") {
                      startPolling(exercise.id);
                    }
                  } catch (err) {
                    console.error("Retry analysis failed:", err);
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry analysis</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Analyze button if no analysis */}
          {!hasAnalysis && !analysisError && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-3 w-3" />
                  <span>Analyze movement</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type AssignedMedication = {
  id: string;
  pill_id?: string;
  name: string;
  strength?: number;
  unit?: string;
  dosage_form?: string;
  image_url?: string | null;
  frequency?: string;
  days_of_week?: number[];
  times_of_day?: string[];
  pill_details?: PillType; // Full pill object with all details
};

// Helper function to format medication schedule
function formatMedicationSchedule(frequency: string | undefined, daysOfWeek: number[] | undefined, timesOfDay: string[] | undefined): string {
  if (!frequency) return "";
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format times
  const formattedTimes = timesOfDay && timesOfDay.length > 0 
    ? timesOfDay.map(formatTime)
    : [];

  // Handle daily frequencies
  if (frequency === "daily" || frequency === "once_daily") {
    if (formattedTimes.length === 1) {
      return `Once daily at ${formattedTimes[0]}`;
    } else if (formattedTimes.length > 1) {
      return `${formattedTimes.length}x daily at ${formattedTimes.join(", ")}`;
    }
    return "Once daily";
  }

  if (frequency === "twice_daily") {
    if (formattedTimes.length > 0) {
      return `Twice daily at ${formattedTimes.join(", ")}`;
    }
    return "Twice daily";
  }

  if (frequency === "three_times_daily") {
    if (formattedTimes.length > 0) {
      return `3x daily at ${formattedTimes.join(", ")}`;
    }
    return "3x daily";
  }

  // Handle weekly frequencies
  if (frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const daysList = daysOfWeek.map(d => dayNames[d]).join(", ");
    if (formattedTimes.length > 0) {
      return `${daysList} at ${formattedTimes.join(", ")}`;
    }
    return daysList;
  }

  // Handle as-needed
  if (frequency === "as_needed") {
    return "As needed";
  }

  // Fallback
  const readableFrequency = frequency.replace(/_/g, " ");
  if (formattedTimes.length > 0) {
    return `${readableFrequency} at ${formattedTimes.join(", ")}`;
  }
  return readableFrequency;
}

function PlansContent({ patient }: { patient: Patient }) {
  const [showMedForm, setShowMedForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [dietPlan, setDietPlan] = useState<PatientPlan | null>(null);
  const [exercisePlan, setExercisePlan] = useState<PatientPlan | null>(null);
  const [medications, setMedications] = useState<AssignedMedication[]>([]);
  const [prescribedExercises, setPrescribedExercises] = useState<PrescribedExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedForDetails, setSelectedMedForDetails] = useState<PillType | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const [plansRes, medsRes, prescribedRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/patients/${patient.id}/plans`, { cache: "no-store" }).then(r => r.json()),
        getPatientMedications(patient.id),
        getPrescribedExercises(patient.id),
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
        pill_id: m.pill_id as string,
        name: (m.pills as Record<string, unknown>)?.name as string || "Unknown",
        strength: (m.pills as Record<string, unknown>)?.strength as number,
        unit: (m.pills as Record<string, unknown>)?.unit as string,
        dosage_form: (m.pills as Record<string, unknown>)?.dosage_form as string,
        image_url: ((m.pills as Record<string, unknown>)?.image_url as string) || null,
        frequency: m.frequency as string,
        days_of_week: m.days_of_week as number[],
        times_of_day: m.times_of_day as string[],
        pill_details: m.pills as PillType, // Store full pill object
      })));
      
      // Store prescribed exercises
      setPrescribedExercises(prescribedRes.prescribed_exercises || []);
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
    <div className="space-y-3">
      {/* Medications */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Medications</h3>
            {medications.length > 0 && (
              <span className="text-xs text-muted-foreground">{medications.length} active</span>
            )}
          </div>
          <button 
            onClick={() => setShowMedForm(!showMedForm)}
            className="px-3 py-1.5 text-xs bg-neutral-700 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            {showMedForm ? "Cancel" : "Assign"}
          </button>
        </div>
        <div className="px-4 py-3">
          {showMedForm && (
            <MedicationAssignForm 
              patientId={patient.id} 
              onClose={() => { setShowMedForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showMedForm && medications.length === 0 && (
            <p className="text-sm text-muted-foreground">No medications assigned</p>
          )}
          
          {!showMedForm && medications.length > 0 && (
            <div className="divide-y">
              {medications.map((med) => (
                <div key={med.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {med.image_url ? (
                      <img
                        src={med.image_url}
                        alt={med.name}
                        className="w-16 h-16 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        <Pill className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground mb-0.5">
                        <span className="font-medium">{med.name}</span>
                        {med.strength && med.unit && (
                          <span className="text-muted-foreground"> {med.strength}{med.unit}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMedicationSchedule(med.frequency, med.days_of_week, med.times_of_day)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {med.pill_details && (
                      <button
                        onClick={() => setSelectedMedForDetails(med.pill_details!)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View medication details"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diet */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <h3 className="text-sm font-medium text-foreground">Diet Plan</h3>
          <button 
            onClick={() => setShowDietForm(!showDietForm)}
            className="px-3 py-1.5 text-xs bg-neutral-700 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            {showDietForm ? "Cancel" : dietPlan ? "Edit" : "Add"}
          </button>
        </div>
        <div className="px-4 py-3">
          {showDietForm && (
            <DietInstructionForm 
              patientId={patient.id} 
              existingPlan={dietPlan}
              onClose={() => { setShowDietForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showDietForm && !dietPlan && (
            <p className="text-sm text-muted-foreground">No diet plan set</p>
          )}
          
          {!showDietForm && dietPlan && (
            <div className="space-y-2">
              {dietPlan.notes && (
                <p className="text-sm text-foreground">{dietPlan.notes}</p>
              )}
              {(dietPlan.calorie_target || dietPlan.protein_target || dietPlan.carb_target || dietPlan.fat_target) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {dietPlan.calorie_target && (
                    <span><span className="font-medium text-foreground">{dietPlan.calorie_target}</span> cal</span>
                  )}
                  {dietPlan.protein_target && (
                    <span><span className="font-medium text-foreground">{dietPlan.protein_target}g</span> protein</span>
                  )}
                  {dietPlan.carb_target && (
                    <span><span className="font-medium text-foreground">{dietPlan.carb_target}g</span> carbs</span>
                  )}
                  {dietPlan.fat_target && (
                    <span><span className="font-medium text-foreground">{dietPlan.fat_target}g</span> fat</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Exercise */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Exercise Plan</h3>
            {prescribedExercises.length > 0 && (
              <span className="text-xs text-muted-foreground">{prescribedExercises.length} exercises</span>
            )}
          </div>
          <button 
            onClick={() => setShowExerciseForm(!showExerciseForm)}
            className="px-3 py-1.5 text-xs bg-neutral-700 text-white rounded hover:bg-neutral-800 transition-colors"
          >
            {showExerciseForm ? "Cancel" : "Add"}
          </button>
        </div>
        <div className="px-4 py-3">
          {showExerciseForm && (
            <ExercisePlanForm 
              patientId={patient.id} 
              existingPlan={exercisePlan}
              existingPrescriptions={prescribedExercises}
              onClose={() => { setShowExerciseForm(false); handlePlanSaved(); }} 
            />
          )}
          
          {!showExerciseForm && prescribedExercises.length === 0 && (
            <p className="text-sm text-muted-foreground">No exercises prescribed</p>
          )}
          
          {!showExerciseForm && prescribedExercises.length > 0 && (
            <div className="divide-y">
              {prescribedExercises.map((rx) => (
                <div key={rx.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{rx.exercise_catalog.name}</span>
                      <span className="text-muted-foreground capitalize ml-1">· {rx.exercise_catalog.category}</span>
                    </p>
                    {rx.form_notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rx.form_notes}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await removePrescribedExercise(patient.id, rx.id);
                        handlePlanSaved();
                      } catch (err) {
                        console.error("Failed to remove exercise:", err);
                      }
                    }}
                    className="p-1 text-muted-foreground/50 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* General guidelines (if any) */}
          {!showExerciseForm && exercisePlan?.notes && (
            <div className={cn(prescribedExercises.length > 0 && "mt-2 pt-2 border-t")}>
              <p className="text-xs text-muted-foreground">{exercisePlan.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Medication Details Modal */}
      {selectedMedForDetails && (
        <MedicationDetailsModal
          pill={selectedMedForDetails}
          onClose={() => setSelectedMedForDetails(null)}
        />
      )}
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
  const [assignedMedications, setAssignedMedications] = useState<AssignedMedication[]>([]);
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
  const [selectedMedForDetails, setSelectedMedForDetails] = useState<PillType | null>(null);
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
        // Always fetch assigned medications (the plan)
        const medsRes = await getPatientMedications(patient.id);
        const assignedMeds = medsRes.assigned_medications || [];
        setAssignedMedications(assignedMeds.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          pill_id: m.pill_id as string,
          name: (m.pills as Record<string, unknown>)?.name as string || "Unknown",
          strength: (m.pills as Record<string, unknown>)?.strength as number,
          unit: (m.pills as Record<string, unknown>)?.unit as string,
          dosage_form: (m.pills as Record<string, unknown>)?.dosage_form as string,
          image_url: ((m.pills as Record<string, unknown>)?.image_url as string) || null,
          frequency: m.frequency as string,
          days_of_week: m.days_of_week as number[],
          times_of_day: m.times_of_day as string[],
          pill_details: m.pills as PillType, // Store full pill object
        })));
        
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
        } else {
          // Fetch data for specific date
          const [mealsRes, exercisesRes, journalRes, pillLogsRes] = await Promise.all([
            getPatientMeals(patient.id, selectedDate),
            getPatientExercises(patient.id, selectedDate),
            getPatientJournal(patient.id, selectedDate, selectedDate),
            getPatientPillLogs(patient.id, selectedDate),
          ]);
          
          setMeals(mealsRes.meals);
          setExercises(exercisesRes.exercises);
          setJournalEntries(journalRes.entries);
          setPillLogs(pillLogsRes.logs);
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
        <div className="px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : aiSummary ? (
            <>
              {aiSummary.alerts && aiSummary.alerts.length > 0 ? (
                <div className="space-y-2">
                  {aiSummary.alerts.map((alert: DailySummaryAlert, idx: number) => (
                    <p
                      key={idx}
                      className={cn(
                        "text-sm text-foreground leading-snug pl-3 border-l-2",
                        alert.severity === "high" && "border-red-500",
                        alert.severity === "medium" && "border-amber-500",
                        alert.severity === "low" && "border-blue-500"
                      )}
                    >
                      {alert.message}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No alerts for this period.</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{aiSummary.stats.meals} meals</span>
                <span>·</span>
                <span>{aiSummary.stats.exercises} exercises</span>
                <span>·</span>
                <span>{aiSummary.stats.medications_taken}/{aiSummary.stats.medications_taken + aiSummary.stats.medications_missed + (aiSummary.stats.medications_pending || 0)} meds</span>
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
            <p className="text-sm font-medium text-foreground mt-2 leading-relaxed">
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
          <div className="px-4 pb-3 border-t">
            <div className="pt-3 divide-y divide-slate-100">
              {journalEntries.map((entry) => (
                <div key={entry.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(entry.logged_at)}
                    </span>
                    <p className="text-sm text-foreground line-clamp-2">{entry.transcript}</p>
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-12">
                      {entry.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
              <span className="text-xs text-muted-foreground">{meals.length} logged · {meals.reduce((sum, m) => sum + Number(m.total_calories || 0), 0)} cal</span>
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
            <p className="text-sm font-medium text-foreground mt-2 leading-relaxed">
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
            <p className="text-sm font-medium text-foreground mt-2 leading-relaxed">
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
              {(viewMode === "all" ? groupByDate(exercises) : [[formatDateDisplay(selectedDate), exercises] as [string, typeof exercises]]).map(([dateStr, dateExercises], idx) => {
                const isToday = dateStr === "Today";
                const exerciseCount = dateExercises.length;
                const totalMin = dateExercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
                const totalCal = dateExercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
                
                // For "all" view, make past days collapsible
                if (viewMode === "all" && !isToday) {
                  return (
                    <details key={dateStr} className="group border-b last:border-b-0">
                      <summary className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-50 -mx-4 px-4">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-open:rotate-90" />
                          <span className="text-xs font-medium text-muted-foreground">{dateStr}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {exerciseCount} {exerciseCount === 1 ? "workout" : "workouts"} · {totalMin} min · {totalCal} cal
                        </span>
                      </summary>
                      <div className="pt-1 pb-2">
                        {dateExercises.map((exercise) => (
                          <ExerciseCard key={exercise.id} exercise={exercise} />
                        ))}
                      </div>
                    </details>
                  );
                }
                
                return (
                  <div key={dateStr}>
                    {viewMode === "all" && (
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{dateStr}</p>
                    )}
                    {dateExercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} />
                    ))}
                  </div>
                );
              })}
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
                {assignedMedications.length > 0 ? (
                  <>
                    {pillLogs.filter(l => l.status === "taken" || l.status === "late").length}/{assignedMedications.length} taken
                    {pillLogs.filter(l => l.status === "missed").length > 0 && ` · ${pillLogs.filter(l => l.status === "missed").length} missed`}
                  </>
                ) : (
                  "none assigned"
                )}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", medicationsExpanded && "rotate-180")} />
          </button>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
          ) : assignedMedications.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              No medications assigned to this patient
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {pillLogs.filter(l => l.status === "taken" || l.status === "late").length} of {assignedMedications.length} medications taken {viewMode === "day" ? "today" : ""}
                {pillLogs.filter(l => l.status === "missed").length > 0 && `, ${pillLogs.filter(l => l.status === "missed").length} missed`}
              </p>
            </div>
          )}
        </div>
        {medicationsExpanded && assignedMedications.length > 0 && (
          <div className="px-4 pb-3 border-t">
            <div className="pt-3 divide-y">
              {assignedMedications.map((med) => {
                // Find pill log for this medication
                const log = pillLogs.find(l => 
                  l.patient_pills?.pills?.name === med.name
                );
                const status = log?.status || "scheduled";
                const statusColors: Record<string, string> = {
                  taken: "text-emerald-600",
                  late: "text-amber-600",
                  missed: "text-red-600",
                  pending: "text-blue-600",
                  scheduled: "text-muted-foreground"
                };
                
                // Format status with time for upcoming meds
                let statusLabel = "";
                if (status === "taken") {
                  statusLabel = "taken";
                } else if (status === "late") {
                  statusLabel = "late";
                } else if (status === "missed") {
                  statusLabel = "missed";
                } else if (status === "pending" && log?.scheduled_time) {
                  const scheduledTime = new Date(log.scheduled_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  statusLabel = `upcoming at ${scheduledTime}`;
                } else if (med.times_of_day && med.times_of_day.length > 0) {
                  statusLabel = `scheduled ${med.times_of_day[0]}`;
                } else {
                  statusLabel = "scheduled";
                }
                
                return (
                  <div key={med.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {med.image_url ? (
                        <img
                          src={med.image_url}
                          alt={med.name}
                          className="w-16 h-16 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-muted/50 flex items-center justify-center shrink-0">
                          <Pill className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground mb-0.5">
                          <span className="font-medium">{med.name}</span>
                          {med.strength && med.unit && (
                            <span className="text-muted-foreground"> {med.strength}{med.unit}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMedicationSchedule(med.frequency, med.days_of_week, med.times_of_day)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {med.pill_details && (
                        <button
                          onClick={() => setSelectedMedForDetails(med.pill_details!)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View medication details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      )}
                      <span className={cn("text-xs", statusColors[status])}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Medication Details Modal */}
      {selectedMedForDetails && (
        <MedicationDetailsModal
          pill={selectedMedForDetails}
          onClose={() => setSelectedMedForDetails(null)}
        />
      )}
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
    <div className="space-y-4 pt-3 border-t">
      {/* Medication Selection Row */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Medication</label>
        <Select value={selectedMedId} onValueChange={setSelectedMedId} disabled={isLoadingPills}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder={isLoadingPills ? "Loading..." : "Select medication"} />
          </SelectTrigger>
          <SelectContent>
            {pills.map((med) => (
              <SelectItem key={med.id} value={med.id}>
                {med.name} {med.strength}{med.unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency Selection Row */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Frequency</label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once_daily">Once daily</SelectItem>
            <SelectItem value="twice_daily">Twice daily</SelectItem>
            <SelectItem value="three_times_daily">Three times daily</SelectItem>
            <SelectItem value="as_needed">As needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Days Selection Row */}
      <div className="flex items-start gap-3">
        <label className="text-xs text-muted-foreground w-16 shrink-0 pt-1">Days</label>
        <div className="flex gap-1 flex-wrap">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={cn(
                "w-6 h-6 text-[10px] rounded transition-colors",
                selectedDays.includes(day) 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {day[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection Row */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Time</label>
        <input
          type="time"
          value={times[0]}
          onChange={(e) => setTimes([e.target.value])}
          className="h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
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
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-14 shrink-0 pt-1.5">Guidelines</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Avoid fried food, limit sodium..."
          rows={2}
          className="flex-1 px-2 py-1.5 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Calories</label>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(e.target.value)}
            placeholder="2000"
            className="w-full h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Protein (g)</label>
          <input
            type="number"
            value={proteinTarget}
            onChange={(e) => setProteinTarget(e.target.value)}
            placeholder="150"
            className="w-full h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Carbs (g)</label>
          <input
            type="number"
            value={carbTarget}
            onChange={(e) => setCarbTarget(e.target.value)}
            placeholder="250"
            className="w-full h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Fat (g)</label>
          <input
            type="number"
            value={fatTarget}
            onChange={(e) => setFatTarget(e.target.value)}
            placeholder="65"
            className="w-full h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={isSaving || !notes.trim()}>
          {isSaving ? "Saving..." : existingPlan ? "Update" : "Save"}
        </Button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline Exercise Plan Form - Now with exercise catalog selection
function ExercisePlanForm({ 
  patientId, 
  existingPlan, 
  existingPrescriptions,
  onClose 
}: { 
  patientId: string; 
  existingPlan?: PatientPlan | null; 
  existingPrescriptions?: PrescribedExercise[];
  onClose: () => void;
}) {
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const res = await getExerciseCatalog();
        setCatalog(res.exercises || []);
      } catch (err) {
        console.error("Failed to load exercise catalog:", err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  const handleSubmit = async () => {
    if (!selectedExercise) {
      setError("Please select an exercise");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      await prescribeExercise(patientId, {
        exercise_id: selectedExercise,
        form_notes: formNotes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      console.error("Failed to prescribe exercise:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to prescribe exercise";
      setError(errorMessage.includes("already prescribed") 
        ? "This exercise is already prescribed to this patient" 
        : "Failed to prescribe exercise. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter out already prescribed exercises
  const prescribedIds = new Set(existingPrescriptions?.map(p => p.exercise_id) || []);
  const filteredCatalog = catalog.filter(e => {
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const notAlreadyPrescribed = !prescribedIds.has(e.id);
    return matchesCategory && notAlreadyPrescribed;
  });

  const selectedExerciseData = catalog.find(e => e.id === selectedExercise);

  return (
    <div className="space-y-3 pt-3 border-t">
      {isLoadingCatalog ? (
        <p className="text-xs text-muted-foreground">Loading exercises...</p>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-1.5">
            {["all", "strength", "cardio", "flexibility", "balance"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors capitalize",
                  categoryFilter === cat
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exercise Selection */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-14 shrink-0">Exercise</label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Choose an exercise..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCatalog.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedExerciseData?.description && (
            <p className="text-xs text-muted-foreground pl-[72px]">{selectedExerciseData.description}</p>
          )}

          {/* Form Notes */}
          {selectedExercise && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-14 shrink-0">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g., Use wall for support..."
                className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
          
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={isSaving || !selectedExercise}>
              {isSaving ? "Adding..." : "Add"}
            </Button>
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
