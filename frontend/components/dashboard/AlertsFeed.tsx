"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Alert = {
  id: string;
  patient: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  acknowledged?: boolean;
};

type AlertsFeedProps = {
  alerts: Alert[];
  title?: string;
  maxItems?: number;
  onViewAll?: () => void;
  onAcknowledge?: (id: string) => void;
};

const severityStyles = {
  critical: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-800",
  medium: "bg-slate-100 text-slate-800",
  low: "bg-muted text-muted-foreground",
};

export function AlertsFeed({ 
  alerts, 
  title = "Alerts", 
  maxItems = 5, 
  onViewAll, 
  onAcknowledge 
}: AlertsFeedProps) {
  const displayedAlerts = alerts.slice(0, maxItems);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {onViewAll && (
            <Link
              href="/dashboard/alerts"
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              View all
            </Link>
          )}
        </div>

        <div className="space-y-1">
          {displayedAlerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active alerts
            </p>
          ) : (
            displayedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40",
                  alert.acknowledged && "opacity-60"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {alert.patient}
                    </span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                      severityStyles[alert.severity]
                    )}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {alert.message}
                  </p>
                </div>
                {!alert.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="ml-3 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Ack
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
