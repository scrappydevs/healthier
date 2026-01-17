"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Calendar, Clock, Pill, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatient, type Patient } from "@/lib/api";
import { AssignMedicationModal } from "@/components/medications/AssignMedicationModal";
import { MedicationCard } from "@/components/medications/MedicationCard";

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [medications, setMedications] = useState<any[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPatientData() {
      setIsLoading(true);
      setError(null);
      try {
        const patientData = await getPatient(params.id);
        setPatient(patientData);

        // Fetch patient's medications
        const medsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/medications/patients/${params.id}/medications`);
        if (medsResponse.ok) {
          const medsData = await medsResponse.json();
          setMedications(medsData);
        }

        // Fetch recent medication logs
        const logsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/medications/patients/${params.id}/logs?limit=20`);
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setMedicationLogs(logsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPatientData();
  }, [params.id]);

  const handleMedicationAssigned = () => {
    setShowAssignModal(false);
    // Refresh medications
    window.location.reload();
  };

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
        </div>
      </div>
    );
  }

  const status = getStatusFromAdherence(patient.adherence_rate);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </button>

      {/* Patient Header */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">{patient.full_name}</h1>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full font-medium",
                status === "critical" ? "bg-destructive/10 text-destructive" :
                status === "warning" ? "bg-warning/10 text-warning" :
                "bg-primary/8 text-primary"
              )}>
                {status === "good" ? "On Track" : status === "warning" ? "Needs Attention" : "At Risk"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{patient.age || "—"} years old</span>
              <span>·</span>
              <span>{patient.gender || "Not specified"}</span>
              <span>·</span>
              <span>Patient ID: {patient.id.slice(0, 8)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Assign Medication
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adherence Rate</p>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={cn(
            "text-2xl font-semibold tabular-nums",
            status === "good" ? "text-primary" :
            status === "warning" ? "text-warning" : "text-destructive"
          )}>
            {Math.round(patient.adherence_rate)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Medications</p>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {patient.medication_count}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active prescriptions</p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Doses Today</p>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {medicationLogs.filter(log => 
              new Date(log.scheduled_time).toDateString() === new Date().toDateString() &&
              log.status === 'taken'
            ).length} / {medicationLogs.filter(log => 
              new Date(log.scheduled_time).toDateString() === new Date().toDateString()
            ).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Taken / Total</p>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Dose</p>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {(() => {
              const nextLog = medicationLogs
                .filter(log => log.status === 'pending' && new Date(log.scheduled_time) > new Date())
                .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())[0];
              if (!nextLog) return "—";
              const scheduledDate = new Date(nextLog.scheduled_time);
              return scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            })()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
        </div>
      </div>

      {/* Medications List */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Medications</h2>
        {medications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No medications assigned yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {medications.map((medication) => (
              <MedicationCard key={medication.id} medication={medication} patientId={params.id} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        {medicationLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {medicationLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {log.status === 'taken' ? 'Took medication' : 
                     log.status === 'missed' ? 'Missed dose' : 
                     log.status === 'pending' ? 'Pending dose' : log.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.scheduled_time).toLocaleString()}
                  </p>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  log.status === 'taken' ? "bg-primary/8 text-primary" :
                  log.status === 'missed' ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                )}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Medication Modal */}
      {showAssignModal && (
        <AssignMedicationModal
          patientId={params.id}
          patientName={patient.full_name}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleMedicationAssigned}
        />
      )}
    </div>
  );
}
