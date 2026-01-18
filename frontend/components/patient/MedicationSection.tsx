"use client";

import { useState, useEffect } from "react";
import { Pill, AlertCircle, Check, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientMedications, type Medication, type MedicationLog } from "@/lib/api";

interface MedicationSectionProps {
  patientId: string;
}

type AssignedMed = {
  id: string;
  name: string;
  strength?: number;
  unit?: string;
  image_url?: string | null;
  frequency?: string;
  times_of_day?: string[];
  is_active?: boolean;
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
  // Parse date string as local date
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

type LogWithMed = MedicationLog & { medication: Medication };

function groupLogsByDate(medications: Medication[]): Map<string, LogWithMed[]> {
  const grouped = new Map<string, LogWithMed[]>();
  
  // Collect all logs with their medication info
  const allLogs: LogWithMed[] = [];
  for (const med of medications) {
    if (med.recent_logs) {
      for (const log of med.recent_logs) {
        const timestamp = log.taken_at || log.scheduled_time || "";
        if (timestamp) {
          allLogs.push({ ...log, medication: med });
        }
      }
    }
  }
  
  // Sort by date descending
  allLogs.sort((a, b) => {
    const dateA = a.taken_at || a.scheduled_time || "";
    const dateB = b.taken_at || b.scheduled_time || "";
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  // Group by local date
  for (const log of allLogs) {
    const timestamp = log.taken_at || log.scheduled_time || "";
    const dateKey = getLocalDateFromTimestamp(timestamp);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(log);
  }
  
  return grouped;
}

export function MedicationSection({ patientId }: MedicationSectionProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [assignedMeds, setAssignedMeds] = useState<AssignedMed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showMedDetails, setShowMedDetails] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMedications() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientMedications(patientId);
        setMedications(response.medications || []);
        
        // Parse assigned medications from the response
        const assigned = response.assigned_medications || [];
        setAssignedMeds(assigned.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: (m.pills as Record<string, unknown>)?.name as string || "Unknown",
          strength: (m.pills as Record<string, unknown>)?.strength as number,
          unit: (m.pills as Record<string, unknown>)?.unit as string,
          image_url: ((m.pills as Record<string, unknown>)?.image_url as string) || null,
          frequency: m.frequency as string,
          times_of_day: m.times_of_day as string[],
          is_active: m.is_active as boolean,
        })));
        
        // Auto-expand today
        const today = getLocalDateString(new Date());
        setExpandedDays(new Set([today]));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load medications");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMedications();
  }, [patientId]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading medications...</p>
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

  // Show assigned medications even if no logs exist
  const activeMeds = medications.filter((m) => m.is_active);
  const logsByDate = groupLogsByDate(medications);
  const activeAssigned = assignedMeds.filter((m) => m.is_active !== false);

  if (medications.length === 0 && assignedMeds.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <Pill className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No medications assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Assigned</p>
          <p className="text-sm font-semibold">{activeAssigned.length || activeMeds.length}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Logged</p>
          <p className="text-sm font-semibold">{medications.length}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Avg Adherence</p>
          <p className="text-sm font-semibold">
            {activeMeds.length > 0
              ? Math.round(
                  activeMeds.reduce((acc, m) => acc + m.adherence_rate, 0) / activeMeds.length
                )
              : 0}%
          </p>
        </div>
      </div>

      {/* Assigned Medications (from plan) */}
      {activeAssigned.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            Prescribed Medications
          </h4>
          <div className="divide-y">
            {activeAssigned.map((med) => (
              <div key={med.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-4">
                {med.image_url ? (
                  <img
                    src={med.image_url}
                    alt={med.name}
                    className="w-20 h-20 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    <Pill className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base text-foreground mb-1">
                    <span className="font-medium">{med.name}</span>
                    {med.strength && med.unit && (
                      <span className="text-muted-foreground"> {med.strength}{med.unit}</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {med.frequency?.replace(/_/g, " ")}
                    {med.times_of_day && med.times_of_day.length > 0 && ` · ${med.times_of_day.join(", ")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Medications with Logs */}
      {activeMeds.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            Medication Details
          </h4>
          <div className="space-y-1">
            {activeMeds.map((med) => (
              <MedicationCard 
                key={med.id} 
                medication={med} 
                isExpanded={showMedDetails === med.id}
                onToggle={() => setShowMedDetails(showMedDetails === med.id ? null : med.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Logs by Day */}
      {logsByDate.size > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
            Activity History
          </h4>
          {Array.from(logsByDate.entries()).map(([dateKey, dateLogs]) => {
            const isExpanded = expandedDays.has(dateKey);
            const takenCount = dateLogs.filter(l => l.taken_at).length;
            const missedCount = dateLogs.length - takenCount;

            return (
              <div key={dateKey} className="border-b last:border-b-0">
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(dateKey)}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {formatDateLabel(dateKey)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {takenCount} taken{missedCount > 0 && ` · ${missedCount} missed`}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Day Content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {dateLogs.map((log) => (
                      <LogEntry key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MedicationCard({ 
  medication, 
  isExpanded, 
  onToggle 
}: { 
  medication: Medication;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-2.5 flex items-start gap-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Icon or Image */}
        {medication.plan_image_url ? (
          <img
            src={medication.plan_image_url}
            alt={medication.name}
            className="w-9 h-9 rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{medication.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {medication.dosage} · {medication.frequency}
          </p>
        </div>

        {/* Adherence */}
        <div className="text-right shrink-0 flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              medication.adherence_rate >= 85
                ? "text-primary"
                : medication.adherence_rate >= 70
                ? "text-warning"
                : "text-destructive"
            )}
          >
            {Math.round(medication.adherence_rate)}%
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 border-t">
          <div className="pt-2.5 space-y-2">
            {medication.instructions && (
              <div>
                <p className="text-[10px] text-muted-foreground">Instructions</p>
                <p className="text-xs text-foreground">{medication.instructions}</p>
              </div>
            )}
            {medication.form && (
              <div>
                <p className="text-[10px] text-muted-foreground">Form</p>
                <p className="text-xs text-foreground capitalize">{medication.form}</p>
              </div>
            )}
            {medication.side_effects && medication.side_effects.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Side effects</p>
                <div className="flex flex-wrap gap-1">
                  {medication.side_effects.map((effect, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full"
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LogEntry({ log }: { log: LogWithMed }) {
  const time = log.taken_at
    ? new Date(log.taken_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : log.scheduled_time
    ? new Date(log.scheduled_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }) + " (missed)"
    : "Unknown";

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs">
      {log.taken_at ? (
        log.was_on_time ? (
          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
        )
      ) : (
        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
      )}
      <span className="font-medium text-foreground">{log.medication.name}</span>
      <span className="text-muted-foreground">{time}</span>
      {log.taken_at && !log.was_on_time && (
        <span className="text-warning text-[10px]">(late)</span>
      )}
      {log.notes && <span className="text-muted-foreground italic ml-auto truncate max-w-[100px]">{log.notes}</span>}
    </div>
  );
}
