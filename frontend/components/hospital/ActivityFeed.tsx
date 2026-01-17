"use client";

import { useEffect, useRef } from 'react';

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

const eventTypeLabels: Record<EventType, string> = {
  vital_check: 'VITAL',
  medication_given: 'MEDS',
  hazard_reported: 'HAZARD',
  patient_moved: 'MOVE',
  alert_triggered: 'ALERT',
  status_change: 'STATUS',
  system: 'SYS',
};

const eventTypeColors: Record<EventType, string> = {
  vital_check: 'text-emerald-600',
  medication_given: 'text-blue-600',
  hazard_reported: 'text-amber-600',
  patient_moved: 'text-neutral-600',
  alert_triggered: 'text-red-600',
  status_change: 'text-purple-600',
  system: 'text-neutral-500',
};

const severityColors: Record<EventSeverity, string> = {
  info: 'text-neutral-700',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export function ActivityFeed({ events, maxHeight = '100%' }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-neutral-600">LIVE FEED</span>
        </div>
        <span className="text-xs font-mono text-neutral-400">{events.length} events</span>
      </div>

      {/* Event Log */}
      <div 
        className="flex-1 overflow-y-auto p-3 font-mono text-xs"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <span className="text-sm mb-1">$ waiting for events...</span>
            <span className="animate-pulse">_</span>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className={`py-1.5 px-2 rounded transition-colors hover:bg-neutral-50 ${
                  event.severity === 'critical' ? 'bg-red-50/50' : ''
                }`}
              >
                {/* Main line */}
                <div className="flex items-start gap-2">
                  {/* Timestamp */}
                  <span className="text-neutral-400 shrink-0 w-16">
                    [{formatTimestamp(event.timestamp)}]
                  </span>

                  {/* Event type badge */}
                  <span className={`shrink-0 w-14 ${eventTypeColors[event.type]}`}>
                    [{eventTypeLabels[event.type]}]
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className={severityColors[event.severity]}>
                      {event.roomName && (
                        <span className="text-neutral-500">{event.roomName} - </span>
                      )}
                      {event.title}
                    </span>
                  </div>

                  {/* Relative time */}
                  <span className="text-neutral-400 shrink-0 text-[10px]">
                    {getRelativeTime(event.timestamp)}
                  </span>
                </div>

                {/* Description line */}
                {event.description && (
                  <div className="ml-[7.5rem] mt-0.5 text-neutral-500 text-[11px]">
                    {event.description}
                  </div>
                )}
              </div>
            ))}

            {/* Auto-scroll anchor */}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span>System monitoring active</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}
