"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Pill,
  Utensils,
  Activity,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { 
  getPatients, 
  getPatientMeals,
  getPatientExercises,
  getPatientMedications,
  getPills,
  type Patient,
  type Pill as PillType
} from "@/lib/api";
import { FoodSection } from "@/components/patient/FoodSection";
import { ExerciseSection } from "@/components/patient/ExerciseSection";
import { MedicationSection } from "@/components/patient/MedicationSection";
import { JournalSection } from "@/components/patient/JournalSection";

type Tab = "overview" | "food" | "exercise" | "medications" | "journal";

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
        setError(err instanceof Error ? err.message : "Failed to load data");
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
                      <span className={cn(
                        "text-xs font-semibold tabular-nums",
                        status === "good" ? "text-primary" :
                        status === "warning" ? "text-amber-600" : "text-red-600"
                      )}>
                        {Math.round(patient.adherence_rate)}%
                      </span>
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
                {(["overview", "food", "exercise", "medications", "journal"] as Tab[]).map((tab) => (
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
      "bg-blue-50 text-blue-700"
    )}>
      {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
    </span>
  );
}

function OverviewContent({ patient }: { patient: Patient }) {
  const [stats, setStats] = useState({ meals: 0, exercises: 0, medications: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showMedForm, setShowMedForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const [mealsRes, exercisesRes, medsRes] = await Promise.all([
          getPatientMeals(patient.id),
          getPatientExercises(patient.id),
          getPatientMedications(patient.id),
        ]);
        setStats({
          meals: mealsRes.total,
          exercises: exercisesRes.total,
          medications: medsRes.total,
        });
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [patient.id]);

  return (
    <div className="space-y-4">
      {/* Compact Stats Row */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Adherence</span>
            {patient.medication_count > 0 ? (
              <span className={cn(
                "text-lg font-semibold tabular-nums",
                patient.adherence_rate >= 85 ? "text-primary" :
                patient.adherence_rate >= 70 ? "text-amber-600" : "text-red-600"
              )}>
                {Math.round(patient.adherence_rate)}%
              </span>
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">—</span>
            )}
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Pill className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{isLoading ? "—" : stats.medications} medications</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{isLoading ? "—" : stats.meals} meals</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{isLoading ? "—" : stats.exercises} exercises</span>
          </div>
          {patient.age && (
            <>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{patient.age} years</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Assignment Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Medication Assignment */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Medications</h3>
            </div>
            <button 
              onClick={() => setShowMedForm(!showMedForm)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Assign
            </button>
          </div>
          
          {showMedForm && (
            <MedicationAssignForm 
              patientId={patient.id} 
              onClose={() => setShowMedForm(false)} 
            />
          )}
          
          {!showMedForm && (
            <p className="text-xs text-muted-foreground">
              {stats.medications} active prescriptions
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
              Add
            </button>
          </div>
          
          {showDietForm && (
            <DietInstructionForm 
              patientId={patient.id} 
              onClose={() => setShowDietForm(false)} 
            />
          )}
          
          {!showDietForm && (
            <p className="text-xs text-muted-foreground">
              Set dietary guidelines
            </p>
          )}
        </div>

        {/* Exercise Plan */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-medium text-foreground">Exercise Plan</h3>
            </div>
            <button 
              onClick={() => setShowExerciseForm(!showExerciseForm)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          
          {showExerciseForm && (
            <ExercisePlanForm 
              patientId={patient.id} 
              onClose={() => setShowExerciseForm(false)} 
            />
          )}
          
          {!showExerciseForm && (
            <p className="text-xs text-muted-foreground">
              Set exercise recommendations
            </p>
          )}
        </div>
      </div>

      {/* Patient Info & Conditions */}
      {patient.medical_conditions && patient.medical_conditions.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Conditions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {patient.medical_conditions.map((condition, i) => (
              <span 
                key={i} 
                className="px-2 py-1 text-xs bg-muted/50 text-foreground rounded"
              >
                {condition}
              </span>
            ))}
          </div>
        </div>
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
  const [instruction, setInstruction] = useState("");
  const [mealType, setMealType] = useState("general");

  const handleSubmit = async () => {
    console.log("Add diet instruction:", { patientId, instruction, mealType });
    onClose();
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Type</label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="general">General</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0 pt-1">Notes</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g., Low sodium, avoid processed foods"
          rows={2}
          className="flex-1 px-2 py-1.5 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit}>
          Save
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
  const [exerciseType, setExerciseType] = useState("");
  const [duration, setDuration] = useState("30");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [notes, setNotes] = useState("");

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    console.log("Add exercise plan:", { patientId, exerciseType, duration, selectedDays, notes });
    onClose();
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Type</label>
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
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0">Duration</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-16 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">mins</span>
        </div>
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
                  ? "bg-blue-600 text-white" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {day[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <label className="text-xs text-muted-foreground w-16 shrink-0 pt-1">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          className="flex-1 h-7 px-2 text-xs bg-muted/30 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit}>
          Save
        </Button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
