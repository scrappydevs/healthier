"use client";

import { useState, useEffect } from "react";
import { Pill, AlertCircle, Check, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientMedications, getPills, type Medication, type MedicationLog, type Pill as PillType } from "@/lib/api";
import { MedicationDetailsModal } from "@/components/medications/MedicationDetailsModal";

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

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

type LogWithMed = MedicationLog & { medication: Medication };

function groupLogsByDate(medications: Medication[]): Map<string, LogWithMed[]> {
  const grouped = new Map<string, LogWithMed[]>();
  
  // Collect all logs with their medication info
  const allLogs: LogWithMed[] = [];
  for (const med of medications) {
    if (med.recent_logs) {
      for (const log of med.recent_logs) {
        const timestamp = log.taken_at || log.created_at || "";
        if (timestamp) {
          allLogs.push({ ...log, medication: med });
        }
      }
    }
  }
  
  allLogs.sort((a, b) => {
    const dateA = a.taken_at || a.created_at || "";
    const dateB = b.taken_at || b.created_at || "";
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  for (const log of allLogs) {
    const timestamp = log.taken_at || log.created_at || "";
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
  
  // Gallery state
  const [allPills, setAllPills] = useState<PillType[]>([]);
  const [selectedPill, setSelectedPill] = useState<PillType | null>(null);
  const [isLoadingPills, setIsLoadingPills] = useState(false);

  useEffect(() => {
    async function fetchMedications() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientMedications(patientId);
        setMedications(response.medications || []);
        
        const assigned = response.assigned_medications || [];
        setAssignedMeds(assigned.map((m: Record<string, unknown>) => {
          const dosageStr = (m.dosage as string) || "";
          const dosageMatch = dosageStr.match(/^(\d+\.?\d*)\s*(.*)$/);
          const strength = dosageMatch ? parseFloat(dosageMatch[1]) : undefined;
          const unit = dosageMatch ? dosageMatch[2] || "mg" : undefined;
          
          return {
            id: m.id as string,
            name: (m.name as string) || "Unknown",
            strength,
            unit,
            image_url: (m.plan_image_url as string) || null,
            frequency: (m.frequency as string) || "Daily",
            times_of_day: (m.reminder_times as string[]) || [],
            is_active: m.is_active as boolean,
          };
        }));
        
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

  useEffect(() => {
    async function fetchAllPills() {
      setIsLoadingPills(true);
      try {
        const response = await getPills();
        setAllPills(response.pills || []);
      } catch (err) {
        console.error("Failed to load medication gallery:", err);
      } finally {
        setIsLoadingPills(false);
      }
    }
    fetchAllPills();
  }, []);

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
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned</p>
              <p className="text-lg font-semibold">{activeAssigned.length || activeMeds.length}</p>
            </div>
            <div className="bg-muted/30 rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Logged</p>
              <p className="text-lg font-semibold">{medications.length}</p>
            </div>
            <div className="bg-muted/30 rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Adherence</p>
              <p className="text-lg font-semibold">
                {activeMeds.length > 0
                  ? Math.round(
                      activeMeds.reduce((acc, m) => acc + m.adherence_rate, 0) / activeMeds.length
                    )
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {activeAssigned.length > 0 ? (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
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
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={cn("w-20 h-20 rounded bg-muted/50 flex items-center justify-center shrink-0", med.image_url && "hidden")}>
                      <Pill className="h-8 w-8 text-muted-foreground" />
                    </div>
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
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="text-center">
                <Pill className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No medications prescribed</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
        <div className="px-4 py-3 border-b">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Available Medications
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingPills ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading medications...</p>
            </div>
          ) : allPills.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Pill className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No medications available</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4 auto-rows-min">
              {allPills.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedPill(pill)}
                  className="flex flex-col items-center gap-2 p-4 bg-white border-2 rounded-lg hover:border-primary hover:shadow-md transition-all group"
                >
                  {pill.image_url ? (
                    <div className="w-full aspect-square rounded overflow-hidden bg-muted/30">
                      <img
                        src={pill.image_url}
                        alt={pill.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', pill.image_url);
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.parentElement?.nextElementSibling;
                          if (placeholder) {
                            placeholder.classList.remove('hidden');
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  <div className={cn("w-full aspect-square rounded bg-muted/50 flex items-center justify-center", pill.image_url && "hidden")}>
                    <Pill className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {pill.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPill && (
        <MedicationDetailsModal
          pill={selectedPill}
          onClose={() => setSelectedPill(null)}
        />
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

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{medication.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {medication.dosage} · {medication.frequency}
          </p>
        </div>

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
    : log.created_at
    ? new Date(log.created_at).toLocaleTimeString([], {
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
