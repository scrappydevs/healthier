"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAlerts, acknowledgeAlert, type Alert } from "@/lib/api";

const typeLabels: Record<Alert["type"], string> = {
  missed_dose: "Missed Dose",
  low_adherence: "Low Adherence",
  refill_needed: "Refill Needed",
  pattern_detected: "Pattern",
};

const severityStyles = {
  critical: { dot: "bg-destructive", badge: "bg-destructive/10 text-destructive" },
  high: { dot: "bg-warning", badge: "bg-warning/10 text-warning" },
  medium: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  low: { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unacknowledged">("all");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAlerts({ limit: 100 });
      setAlerts(response.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAcknowledge(alertId: string) {
    setAcknowledging(alertId);
    try {
      // Using a placeholder user ID - in production this would come from auth context
      const updated = await acknowledgeAlert(alertId, "00000000-0000-0000-0000-000000000001");
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setAcknowledging(null);
    }
  }

  const formatTime = (timestamp: string): string => {
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

  const filteredAlerts = filter === "all" 
    ? alerts 
    : alerts.filter(a => !a.acknowledged);

  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.acknowledged).length;
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading alerts...</p>
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
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-warning/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{unacknowledgedCount}</p>
              <p className="text-xs text-muted-foreground">Unacknowledged</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{alerts.length - unacknowledgedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "h-8 px-3 text-sm font-medium rounded-md transition-colors",
            filter === "all"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          All Alerts
        </button>
        <button
          onClick={() => setFilter("unacknowledged")}
          className={cn(
            "h-8 px-3 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
            filter === "unacknowledged"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Needs Action
          {unacknowledgedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-destructive/10 text-destructive rounded-full">
              {unacknowledgedCount}
            </span>
          )}
        </button>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-md">
        {filteredAlerts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No alerts found</p>
        ) : (
          <div className="divide-y">
            {filteredAlerts.map((alert) => {
              const styles = severityStyles[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/40 transition-colors",
                    alert.acknowledged && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 shrink-0",
                        styles.dot,
                        !alert.acknowledged && alert.severity === "critical" && "animate-pulse"
                      )} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{alert.patient_name || "Unknown Patient"}</span>
                          <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", styles.badge)}>
                            {typeLabels[alert.type]}
                          </span>
                          {alert.acknowledged && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTime(alert.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledging === alert.id}
                          className="h-8 px-3 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50"
                        >
                          {acknowledging === alert.id ? "..." : "Acknowledge"}
                        </button>
                      )}
                      <button className="h-8 px-3 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
                        View Patient
                      </button>
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
