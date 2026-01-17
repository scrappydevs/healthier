"use client";

import { useEffect, useRef } from 'react';
import { Activity, Pill, AlertTriangle, ArrowRight, Bell, Settings, Heart } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EventType = 
  | 'vital_check' 
  | 'medication_given' 
  | 'hazard_reported' 
  | 'patient_moved' 
  | 'alert_triggered' 
  | 'status_change' 
  | 'system';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description?: string;
  roomName?: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  maxHeight?: string;
}

const eventIcons: Record<EventType, React.ElementType> = {
  vital_check: Heart,
  medication_given: Pill,
  hazard_reported: AlertTriangle,
  patient_moved: ArrowRight,
  alert_triggered: Bell,
  status_change: Activity,
  system: Settings,
};

const eventColors: Record<EventType, string> = {
  vital_check: 'text-blue-600 bg-blue-50',
  medication_given: 'text-blue-600 bg-blue-50',
  hazard_reported: 'text-amber-600 bg-amber-50',
  patient_moved: 'text-slate-600 bg-slate-50',
  alert_triggered: 'text-red-600 bg-red-50',
  status_change: 'text-purple-600 bg-purple-50',
  system: 'text-slate-500 bg-slate-50',
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new events added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Activity</h3>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
      </div>

      {/* Event List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Activity className="h-5 w-5 mb-1" />
            <span className="text-xs">No events yet</span>
          </div>
        ) : (
          <div className="divide-y">
            {events.map((event) => {
              const Icon = eventIcons[event.type];
              const colorClass = eventColors[event.type];
              
              return (
                <div
                  key={event.id}
                  className={cn(
                    "px-3 py-2 hover:bg-muted/30 transition-colors",
                    event.severity === 'critical' && "bg-red-50/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {event.roomName && (
                            <span className="text-xs font-medium text-foreground">{event.roomName}</span>
                          )}
                          <p className={cn(
                            "text-xs leading-relaxed",
                            event.severity === 'critical' ? "text-red-700 font-medium" : "text-foreground"
                          )}>
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {getRelativeTime(event.timestamp)}
                        </span>
                      </div>
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
