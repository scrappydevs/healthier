"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatients, type Patient } from "@/lib/api";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      const status = getStatusFromAdherence(p.adherence_rate);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "adherence") return b.adherence_rate - a.adherence_rate;
      // last_active
      if (!a.last_active) return 1;
      if (!b.last_active) return -1;
      return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
    });

  const criticalCount = patients.filter(p => getStatusFromAdherence(p.adherence_rate) === "critical").length;
  const warningCount = patients.filter(p => getStatusFromAdherence(p.adherence_rate) === "warning").length;

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Showing</span>
            <span className="font-medium text-foreground">{filteredPatients.length} patients</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-warning/10 text-warning rounded-full">
                {warningCount} need attention
              </span>
            )}
          </div>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All statuses</option>
            <option value="good">On Track</option>
            <option value="warning">Attention Needed</option>
            <option value="critical">At Risk</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="last_active">Sort by: Last Active</option>
            <option value="adherence">Sort by: Adherence</option>
            <option value="name">Sort by: Name</option>
          </select>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-md">
        {filteredPatients.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No patients found</p>
        ) : (
          <div className="divide-y">
            {filteredPatients.map((patient) => {
              const status = getStatusFromAdherence(patient.adherence_rate);
              return (
                <div
                  key={patient.id}
                  onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                  className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{patient.full_name}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          status === "critical" ? "bg-destructive/10 text-destructive" :
                          status === "warning" ? "bg-warning/10 text-warning" :
                          "bg-primary/8 text-primary"
                        )}>
                          {status === "good" ? "On Track" : status === "warning" ? "Attention" : "At Risk"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {patient.age || "—"} yrs · {patient.medication_count} medications · Last active {formatLastActive(patient.last_active)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-lg font-semibold tabular-nums",
                        status === "good" ? "text-primary" :
                        status === "warning" ? "text-warning" : "text-destructive"
                      )}>
                        {Math.round(patient.adherence_rate)}%
                      </span>
                      <p className="text-xs text-muted-foreground">adherence</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
