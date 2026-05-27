"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { getPatient, type Patient } from "@/lib/api";
import { FoodSection } from "@/components/patient/FoodSection";
import { ExerciseSection } from "@/components/patient/ExerciseSection";
import { MedicationSection } from "@/components/patient/MedicationSection";

type Tab = "overview" | "food" | "exercise" | "medications";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    async function fetchPatient() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPatient(id);
        setPatient(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPatient();
  }, [id]);

  const getStatusFromAdherence = (rate: number): "good" | "warning" | "critical" => {
    if (rate >= 85) return "good";
    if (rate >= 70) return "warning";
    return "critical";
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading patient...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "Patient not found"}</p>
          <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const status = getStatusFromAdherence(patient.adherence_rate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium text-foreground">{patient.full_name}</h1>
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  status === "critical"
                    ? "bg-destructive/10 text-destructive"
                    : status === "warning"
                    ? "bg-warning/10 text-warning"
                    : "bg-primary/10 text-primary"
                )}
              >
                {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {patient.age ? `${patient.age} years old` : "Age unknown"} |{" "}
              {patient.medication_count} medications |{" "}
              {Math.round(patient.adherence_rate)}% adherence
            </p>
          </div>
        </div>

      </div>

      <div className="flex gap-1 border-b">
        {(["overview", "food", "exercise", "medications"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors capitalize",
              activeTab === tab
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-md p-4">
        {activeTab === "overview" && (
          <OverviewTab patient={patient} setActiveTab={setActiveTab} />
        )}
        {activeTab === "food" && (
          <FoodSection patientId={id} />
        )}
        {activeTab === "exercise" && (
          <ExerciseSection patientId={id} />
        )}
        {activeTab === "medications" && (
          <MedicationSection patientId={id} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ patient, setActiveTab }: { patient: Patient; setActiveTab: (tab: Tab) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Patient Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Date of Birth</p>
            <p className="text-sm text-foreground">
              {patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString()
                : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Age</p>
            <p className="text-sm text-foreground">{patient.age ?? "Unknown"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm text-foreground capitalize">{patient.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Medications</p>
            <p className="text-sm text-foreground">{patient.medication_count} active</p>
          </div>
        </div>
      </div>

      {patient.medical_conditions && patient.medical_conditions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Medical Conditions
          </h3>
          <div className="flex flex-wrap gap-2">
            {patient.medical_conditions.map((condition, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-muted/50 text-foreground rounded-md"
              >
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {patient.emergency_contact_name && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Emergency Contact
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm text-foreground">{patient.emergency_contact_name}</p>
            </div>
            {patient.emergency_contact_phone && (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm text-foreground">{patient.emergency_contact_phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {patient.notes && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Notes
          </h3>
          <p className="text-sm text-foreground">{patient.notes}</p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Quick View
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <QuickCard
            title="Food Journal"
            description="View meals logged today"
            onView={() => setActiveTab("food")}
            onAdd={() => setActiveTab("food")}
          />
          <QuickCard
            title="Exercise"
            description="View activity log"
            onView={() => setActiveTab("exercise")}
            onAdd={() => setActiveTab("exercise")}
          />
          <QuickCard
            title="Medications"
            description="View adherence details"
            onView={() => setActiveTab("medications")}
            onAdd={() => setActiveTab("medications")}
          />
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  title,
  description,
  onView,
  onAdd,
}: {
  title: string;
  description: string;
  onView: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-md">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onView}
          className="text-xs text-primary hover:underline"
        >
          View
        </button>
        <span className="text-muted-foreground/50">·</span>
        <button
          onClick={onAdd}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    </div>
  );
}
