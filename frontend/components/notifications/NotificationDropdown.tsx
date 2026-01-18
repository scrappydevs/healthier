"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, Pill, Utensils, Activity, X, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAlerts, acknowledgeAlert, type Alert } from "@/lib/api";
import Link from "next/link";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getAlertIcon(type: Alert["type"]) {
  switch (type) {
    case "missed_dose":
    case "low_adherence":
    case "refill_needed":
      return Pill;
    case "missed_meal":
      return Utensils;
    case "inactivity":
      return Activity;
    case "fall_detected":
    case "vital_abnormal":
    case "pattern_detected":
    default:
      return AlertTriangle;
  }
}

function getSeverityStyles(severity: Alert["severity"]) {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "text-red-600",
        badge: "bg-red-600 text-white",
      };
    case "high":
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "text-orange-600",
        badge: "bg-orange-600 text-white",
      };
    case "medium":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "text-amber-600",
        badge: "bg-amber-600 text-white",
      };
    case "low":
    case "info":
    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        icon: "text-slate-500",
        badge: "bg-slate-500 text-white",
      };
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await getAlerts({ acknowledged: false, limit: 20 });
      setAlerts(response.alerts);
      setUnacknowledgedCount(response.unacknowledged_count);
      setCriticalCount(response.critical_count);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch alerts on mount and periodically
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAcknowledge = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      // Use a placeholder user ID for now - in production this would come from auth
      await acknowledgeAlert(alertId, "00000000-0000-0000-0000-000000000001");
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setUnacknowledgedCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchAlerts();
        }}
        className={cn(
          "relative h-8 w-8 flex items-center justify-center rounded-md transition-colors",
          "hover:bg-muted/50",
          isOpen && "bg-muted"
        )}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unacknowledgedCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-medium px-1",
              criticalCount > 0 ? "bg-red-600 text-white" : "bg-amber-500 text-white"
            )}
          >
            {unacknowledgedCount > 99 ? "99+" : unacknowledgedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg border shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unacknowledgedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unacknowledgedCount} unread{criticalCount > 0 && `, ${criticalCount} critical`}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Alert List */}
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading && alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No new notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up</p>
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => {
                  const Icon = getAlertIcon(alert.type);
                  const styles = getSeverityStyles(alert.severity);
                  return (
                    <Link
                      key={alert.id}
                      href={`/dashboard/patients?id=${alert.patient_id}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "block px-4 py-3 hover:bg-muted/30 transition-colors",
                        !alert.acknowledged && styles.bg
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn("shrink-0 mt-0.5", styles.icon)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 leading-snug">
                                {alert.title}
                              </p>
                              {alert.patient_name && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {alert.patient_name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium whitespace-nowrap", styles.badge)}>
                                {alert.severity}
                              </span>
                            </div>
                          </div>
                          <div className="max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                              {alert.message}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatTimeAgo(alert.created_at)}
                            </span>
                            <button
                              onClick={(e) => handleAcknowledge(alert.id, e)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-slate-900 transition-colors"
                              title="Dismiss"
                            >
                              <Check className="h-3 w-3" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20">
              <Link
                href="/dashboard/patients"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-slate-900 transition-colors"
              >
                View all patients
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
