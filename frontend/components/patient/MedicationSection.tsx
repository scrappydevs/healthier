"use client";

import { useState, useEffect } from "react";
import { Pill, AlertCircle, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientMedications, type Medication, type MedicationLog } from "@/lib/api";

interface MedicationSectionProps {
  patientId: string;
}

export function MedicationSection({ patientId }: MedicationSectionProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMedications() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientMedications(patientId);
        setMedications(response.medications);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load medications");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMedications();
  }, [patientId]);

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

  if (medications.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <Pill className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No medications recorded</p>
        </div>
      </div>
    );
  }

  // Separate active and inactive medications
  const activeMeds = medications.filter((m) => m.is_active);
  const inactiveMeds = medications.filter((m) => !m.is_active);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active</p>
          <p className="text-lg font-semibold text-foreground">{activeMeds.length}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Inactive</p>
          <p className="text-lg font-semibold text-foreground">{inactiveMeds.length}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Adherence</p>
          <p className="text-lg font-semibold text-foreground">
            {activeMeds.length > 0
              ? Math.round(
                  activeMeds.reduce((acc, m) => acc + m.adherence_rate, 0) / activeMeds.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Active Medications */}
      {activeMeds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active Medications
          </h4>
          <div className="space-y-2">
            {activeMeds.map((med) => (
              <MedicationCard key={med.id} medication={med} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Medications */}
      {inactiveMeds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Inactive Medications
          </h4>
          <div className="space-y-2">
            {inactiveMeds.map((med) => (
              <MedicationCard key={med.id} medication={med} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MedicationCard({ medication }: { medication: Medication }) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="bg-white border rounded-md overflow-hidden">
      <button
        onClick={() => setShowLogs(!showLogs)}
        className="w-full p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Icon or Image */}
        {medication.plan_image_url ? (
          <img
            src={medication.plan_image_url}
            alt={medication.name}
            className="w-12 h-12 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-5 w-5 text-primary" />
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{medication.name}</p>
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                medication.is_active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {medication.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {medication.dosage} | {medication.frequency}
          </p>
          {medication.form && (
            <p className="text-xs text-muted-foreground capitalize">{medication.form}</p>
          )}
        </div>

        {/* Adherence */}
        <div className="text-right shrink-0">
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              medication.adherence_rate >= 85
                ? "text-primary"
                : medication.adherence_rate >= 70
                ? "text-warning"
                : "text-destructive"
            )}
          >
            {Math.round(medication.adherence_rate)}%
          </span>
          <p className="text-xs text-muted-foreground">adherence</p>
        </div>
      </button>

      {/* Expanded details */}
      {showLogs && (
        <div className="px-3 pb-3 pt-0 border-t">
          <div className="pt-3 space-y-3">
            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {medication.instructions && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Instructions</p>
                  <p className="text-xs text-foreground">{medication.instructions}</p>
                </div>
              )}
              {medication.prescribed_by && (
                <div>
                  <p className="text-xs text-muted-foreground">Prescribed by</p>
                  <p className="text-xs text-foreground">{medication.prescribed_by}</p>
                </div>
              )}
              {medication.start_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="text-xs text-foreground">
                    {new Date(medication.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {medication.side_effects && medication.side_effects.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Side effects</p>
                  <div className="flex flex-wrap gap-1">
                    {medication.side_effects.map((effect, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full"
                      >
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Logs */}
            {medication.recent_logs && medication.recent_logs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
                <div className="space-y-1">
                  {medication.recent_logs.slice(0, 5).map((log) => (
                    <LogEntry key={log.id} log={log} />
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

function LogEntry({ log }: { log: MedicationLog }) {
  const time = log.taken_at
    ? new Date(log.taken_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not taken";

  return (
    <div className="flex items-center gap-2 text-xs">
      {log.taken_at ? (
        log.was_on_time ? (
          <Check className="h-3 w-3 text-primary" />
        ) : (
          <Clock className="h-3 w-3 text-warning" />
        )
      ) : (
        <X className="h-3 w-3 text-destructive" />
      )}
      <span className="text-muted-foreground">{time}</span>
      {log.taken_at && !log.was_on_time && (
        <span className="text-warning text-[10px]">(late)</span>
      )}
      {log.notes && <span className="text-muted-foreground italic">- {log.notes}</span>}
    </div>
  );
}
