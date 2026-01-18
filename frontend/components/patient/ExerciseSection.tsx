"use client";

import { useState, useEffect } from "react";
import { Activity, AlertCircle, Clock, Flame, Footprints } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientExercises, analyzeExercisePose, getExercisePoseAnalysis, type Exercise } from "@/lib/api";

interface ExerciseSectionProps {
  patientId: string;
  date?: string;
}

const intensityColors: Record<string, string> = {
  light: "bg-slate-100 text-slate-700",
  moderate: "bg-amber-100 text-amber-700",
  vigorous: "bg-red-100 text-red-700",
};

// Get local date string (YYYY-MM-DD) from a date
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get local date string from ISO timestamp
function getLocalDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return getLocalDateString(date);
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function groupExercisesByDate(exercises: Exercise[]): Map<string, Exercise[]> {
  const grouped = new Map<string, Exercise[]>();
  
  const sorted = [...exercises].sort((a, b) => 
    new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  );
  
  for (const exercise of sorted) {
    const dateKey = getLocalDateFromTimestamp(exercise.logged_at);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(exercise);
  }
  
  return grouped;
}

export function ExerciseSection({ patientId }: ExerciseSectionProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExercises() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientExercises(patientId);
        setExercises(response.exercises);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exercises");
      } finally {
        setIsLoading(false);
      }
    }
    fetchExercises();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading exercises...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No exercises logged yet</p>
        </div>
      </div>
    );
  }

  const exercisesByDate = groupExercisesByDate(exercises);

  return (
    <div className="max-h-[700px] overflow-y-auto space-y-6">
      {Array.from(exercisesByDate.entries()).map(([dateKey, dateExercises]) => {
        const dayTotals = dateExercises.reduce(
          (acc, ex) => ({
            minutes: acc.minutes + (ex.duration_minutes || 0),
            calories: acc.calories + (ex.calories_burned || 0),
            count: acc.count + 1,
          }),
          { minutes: 0, calories: 0, count: 0 }
        );

        return (
          <div key={dateKey}>
            {/* Day Header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {formatDateLabel(dateKey)}
              </h3>
              <span className="text-xs text-muted-foreground">
                {dayTotals.count} {dayTotals.count === 1 ? "workout" : "workouts"}
                {dayTotals.minutes > 0 && ` · ${dayTotals.minutes} min`}
                {dayTotals.calories > 0 && ` · ${dayTotals.calories} cal`}
              </span>
            </div>

            {/* Exercise List - All expanded */}
            <div className="space-y-4">
              {dateExercises.map((exercise) => (
                <ExerciseEntry key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Format exercise type - handle weird values like "00"
function formatExerciseType(type: string): string {
  if (!type || type === "00" || type === "0" || /^\d+$/.test(type)) {
    return "Exercise";
  }
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function ExerciseEntry({ exercise }: { exercise: Exercise }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(exercise.pose_analysis);
  const [processedUrl, setProcessedUrl] = useState(
    exercise.processed_video_url || exercise.pose_analysis?.processed_video_url
  );

  const time = new Date(exercise.logged_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasVideo = !!exercise.video_url;
  const hasAnalyzedVideo = !!processedUrl;
  const exerciseLabel = formatExerciseType(exercise.exercise_type);

  // Auto-trigger analysis if video exists but no analysis
  useEffect(() => {
    if (exercise.video_url && !exercise.pose_analysis && !isAnalyzing) {
      handleAnalyze();
    }
  }, [exercise.video_url, exercise.pose_analysis]);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeExercisePose(exercise.id);
      if (result.status === "processing") {
        const pollInterval = setInterval(async () => {
          try {
            const status = await getExercisePoseAnalysis(exercise.id);
            if (status.has_analysis) {
              setAnalysis(status.pose_analysis);
              setProcessedUrl(status.processed_video_url);
              setIsAnalyzing(false);
              clearInterval(pollInterval);
            }
          } catch {
            // Continue polling
          }
        }, 3000);
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
        }, 120000);
      } else if (result.status === "completed") {
        setAnalysis(result.pose_analysis);
        setProcessedUrl(result.processed_video_url);
        setIsAnalyzing(false);
      }
    } catch {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3 pb-4 border-b border-muted/50 last:border-b-0 last:pb-0">
      {/* Exercise Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-foreground">{exerciseLabel}</span>
        {exercise.intensity && (
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded capitalize",
              intensityColors[exercise.intensity] || "bg-muted text-foreground"
            )}
          >
            {exercise.intensity}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{time}</span>
        {exercise.duration_minutes && exercise.duration_minutes > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {exercise.duration_minutes} min
          </span>
        )}
        {exercise.calories_burned && exercise.calories_burned > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Flame className="h-3 w-3" />
            {exercise.calories_burned} cal
          </span>
        )}
        {exercise.steps && exercise.steps > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Footprints className="h-3 w-3" />
            {exercise.steps.toLocaleString()}
          </span>
        )}
      </div>

      {/* Videos Side by Side with better differentiation */}
      {hasVideo && (
        <div className={cn("grid gap-4", hasAnalyzedVideo || isAnalyzing ? "grid-cols-2" : "grid-cols-1 max-w-md")}>
          {/* Original Video Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <p className="text-xs font-medium text-muted-foreground">Original Video</p>
            </div>
            <video
              src={exercise.video_url!}
              controls
              className="w-full rounded-lg bg-black"
              style={{ height: "280px", objectFit: "contain" }}
              playsInline
            />
          </div>

          {/* Analyzed Video Section */}
          {(hasAnalyzedVideo || isAnalyzing) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-xs font-medium text-primary">
                  {isAnalyzing ? "Processing Pose Analysis..." : "Pose Overlay"}
                </p>
              </div>
              {hasAnalyzedVideo ? (
                <video
                  src={processedUrl!}
                  controls
                  className="w-full rounded-lg bg-black"
                  style={{ height: "280px", objectFit: "contain" }}
                  playsInline
                />
              ) : (
                <div 
                  className="w-full rounded-lg bg-slate-900 flex items-center justify-center"
                  style={{ height: "280px" }}
                >
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Analyzing movement...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis Summary - Bold */}
      {analysis?.summary && (
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {analysis.summary}
        </p>
      )}

      {/* Symmetry stats if available */}
      {analysis?.symmetry_analysis && Object.keys(analysis.symmetry_analysis).length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(analysis.symmetry_analysis).map(([joint, data]) => (
            <span key={joint} className={cn(!data.symmetric && "text-amber-600 font-medium")}>
              {joint}: {Math.round(data.difference)}° diff
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {exercise.notes && (
        <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>
      )}
    </div>
  );
}
