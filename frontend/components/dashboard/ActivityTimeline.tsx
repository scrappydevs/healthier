"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Utensils, Activity } from "lucide-react";
import { cn } from "@/lib/cn";

type ActivityItem = {
  id: string;
  type: "medication" | "food" | "exercise";
  title: string;
  description: string;
  time: string;
  status?: "completed" | "pending" | "missed";
  patient?: string;
};

type ActivityTimelineProps = {
  activities: ActivityItem[];
  title?: string;
  showPatient?: boolean;
  maxItems?: number;
};

const typeConfig = {
  medication: { 
    icon: Pill,
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  food: { 
    icon: Utensils,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  exercise: { 
    icon: Activity,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
};

const statusStyles = {
  completed: "bg-emerald-100 text-emerald-800",
  pending: "bg-muted text-muted-foreground",
  missed: "bg-red-100 text-red-800",
};

export function ActivityTimeline({ 
  activities, 
  title = "Recent Activity", 
  showPatient = false,
  maxItems = 6 
}: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>

        <div className="space-y-1">
          {displayedActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          ) : (
            displayedActivities.map((activity) => {
              const config = typeConfig[activity.type];
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md shrink-0",
                    config.bgColor
                  )}>
                    <Icon className={cn("h-4 w-4", config.iconColor)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </span>
                      {activity.status && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                          statusStyles[activity.status]
                        )}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.description}
                      {showPatient && activity.patient && (
                        <span> · {activity.patient}</span>
                      )}
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground shrink-0">
                    {activity.time}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
