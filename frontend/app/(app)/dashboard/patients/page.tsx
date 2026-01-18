"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, ChevronRight, ChevronLeft, Building2, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatients, updatePatient, type Patient } from "@/lib/api";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"last_active" | "adherence" | "name">("last_active");

  useEffect(() => {
    async function fetchPatients() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatients({ per_page: 100 });
        setPatients(response.patients);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patients");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPatients();
  }, []);

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

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Filter and sort patients
  const filteredPatients = patients
    .filter(p => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "adherence") return b.adherence_rate - a.adherence_rate;
      // last_active
      if (!a.last_active) return 1;
      if (!b.last_active) return -1;
      return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
    });

  const criticalCount = filteredPatients.filter(p => getStatusFromAdherence(p.adherence_rate) === "critical").length;
  const warningCount = filteredPatients.filter(p => getStatusFromAdherence(p.adherence_rate) === "warning").length;

  const handleCareSettingToggle = async (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSetting = patient.care_setting === "in_clinic" ? "at_home" : "in_clinic";
    try {
      await updatePatient(patient.id, { care_setting: newSetting });
      setPatients(prev => prev.map(p => 
        p.id === patient.id ? { ...p, care_setting: newSetting } : p
      ));
    } catch (err) {
      console.error("Failed to update care setting:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading patients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Showing</span>
          <span className="font-medium text-foreground">{filteredPatients.length} patients</span>
          {(criticalCount > 0 || warningCount > 0) && (
            <>
              <span className="text-muted-foreground">·</span>
              {criticalCount > 0 && (
                <span className="text-destructive">{criticalCount} at risk</span>
              )}
              {warningCount > 0 && (
                <span className="text-warning">{warningCount} attention</span>
              )}
            </>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 pr-3 text-sm bg-white border rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="last_active">Sort: Last Active</option>
            <option value="adherence">Sort: Adherence</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Two-Column Patient Layout */}
      <div className="bg-white rounded-lg border flex">
        {/* At-Home Column */}
        <div className="flex-1 min-w-0">
          <div className="px-4 py-2.5 border-b flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 tracking-tight">At-Home</span>
            <span className="text-xs text-slate-500">
              ({filteredPatients.filter(p => p.care_setting === "at_home").length})
            </span>
          </div>
          <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredPatients.filter(p => p.care_setting === "at_home").length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No at-home patients</p>
            ) : (
              filteredPatients.filter(p => p.care_setting === "at_home").map((patient) => {
                const status = getStatusFromAdherence(patient.adherence_rate);
                return (
                  <div
                    key={patient.id}
                    className="group flex items-center px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                      className="flex-1 text-left cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 tracking-tight truncate">{patient.full_name}</span>
                        {status !== "good" && (
                          <span className={cn(
                            "text-xs shrink-0",
                            status === "critical" ? "text-red-600" : "text-amber-600"
                          )}>
                            {status === "warning" ? "· Attention" : "· At Risk"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patient.age || "—"} yrs · {patient.medication_count} meds · {formatLastActive(patient.last_active)}
                      </p>
                    </button>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        status === "good" ? "text-emerald-600" :
                        status === "warning" ? "text-amber-600" : "text-red-600"
                      )}>
                        {Math.round(patient.adherence_rate)}%
                      </span>
                      <button
                        onClick={(e) => handleCareSettingToggle(patient, e)}
                        title="Move to In-Clinic"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-200" />

        {/* In-Clinic Column */}
        <div className="flex-1 min-w-0">
          <div className="px-4 py-2.5 border-b flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 tracking-tight">In-Clinic</span>
            <span className="text-xs text-slate-500">
              ({filteredPatients.filter(p => p.care_setting === "in_clinic").length})
            </span>
          </div>
          <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredPatients.filter(p => p.care_setting === "in_clinic").length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No in-clinic patients</p>
            ) : (
              filteredPatients.filter(p => p.care_setting === "in_clinic").map((patient) => {
                const status = getStatusFromAdherence(patient.adherence_rate);
                return (
                  <div
                    key={patient.id}
                    className="group flex items-center px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                      className="flex-1 text-left cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 tracking-tight truncate">{patient.full_name}</span>
                        {status !== "good" && (
                          <span className={cn(
                            "text-xs shrink-0",
                            status === "critical" ? "text-red-600" : "text-amber-600"
                          )}>
                            {status === "warning" ? "· Attention" : "· At Risk"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patient.age || "—"} yrs · {patient.medication_count} meds · {formatLastActive(patient.last_active)}
                      </p>
                    </button>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        status === "good" ? "text-emerald-600" :
                        status === "warning" ? "text-amber-600" : "text-red-600"
                      )}>
                        {Math.round(patient.adherence_rate)}%
                      </span>
                      <button
                        onClick={(e) => handleCareSettingToggle(patient, e)}
                        title="Move to At-Home"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
