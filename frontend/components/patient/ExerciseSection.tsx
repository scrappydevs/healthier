"use client";

import { useState, useEffect } from "react";
import { Activity, AlertCircle, Clock, Flame, Footprints } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientExercises, type Exercise } from "@/lib/api";

interface ExerciseSectionProps {
  patientId: string;
  date?: string;
}

const intensityColors: Record<string, string> = {
  light: "bg-slate-100 text-slate-900",
  moderate: "bg-amber-100 text-amber-700",
  vigorous: "bg-red-100 text-red-700",
};

const categoryIcons: Record<string, React.ElementType> = {
  cardio: Activity,
  strength: Activity,
  flexibility: Activity,
  balance: Activity,
  other: Activity,
};

export function ExerciseSection({ patientId, date }: ExerciseSectionProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [summary, setSummary] = useState({ total_minutes: 0, total_calories: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExercises() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientExercises(patientId, date);
        setExercises(response.exercises);
        setSummary(response.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exercises");
      } finally {
        setIsLoading(false);
      }
    }
    fetchExercises();
  }, [patientId, date]);

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
          <p className="text-sm text-muted-foreground">No exercises logged for this day</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Daily Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Workouts</p>
          </div>
          <p className="text-lg font-semibold text-foreground">{exercises.length}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Minutes</p>
          </div>
          <p className="text-lg font-semibold text-foreground">{summary.total_minutes}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Calories</p>
          </div>
          <p className="text-lg font-semibold text-foreground">{summary.total_calories}</p>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-2">
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const time = new Date(exercise.logged_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const Icon = categoryIcons[exercise.category || "other"] || Activity;

  return (
    <div className="bg-white border rounded-md p-3">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{exercise.exercise_type}</p>
            {exercise.intensity && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium rounded-full capitalize",
                  intensityColors[exercise.intensity] || "bg-muted text-foreground"
                )}
              >
                {exercise.intensity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{time}</span>
            {exercise.duration_minutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exercise.duration_minutes} min
              </span>
            )}
            {exercise.calories_burned && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {exercise.calories_burned} cal
              </span>
            )}
            {exercise.steps && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Footprints className="h-3 w-3" />
                {exercise.steps.toLocaleString()} steps
              </span>
            )}
          </div>

          {/* Additional details */}
          {(exercise.distance_meters || exercise.heart_rate_avg || exercise.location) && (
            <div className="flex items-center gap-3 mt-1">
              {exercise.distance_meters && (
                <span className="text-xs text-muted-foreground">
                  {(exercise.distance_meters / 1000).toFixed(2)} km
                </span>
              )}
              {exercise.heart_rate_avg && (
                <span className="text-xs text-muted-foreground">
                  {exercise.heart_rate_avg} avg bpm
                </span>
              )}
              {exercise.location && (
                <span className="text-xs text-muted-foreground">{exercise.location}</span>
              )}
            </div>
          )}

          {/* Notes */}
          {exercise.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{exercise.notes}</p>
          )}
        </div>

        {/* Status */}
        <div className="shrink-0">
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              exercise.completed
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {exercise.completed ? "Completed" : "In Progress"}
          </span>
        </div>
      </div>
    </div>
  );
}
