"use client";

import { useState, useEffect } from "react";
import { BookOpen, AlertCircle, Clock, Smile, Meh, Frown } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientJournal, type JournalEntry } from "@/lib/api";

interface JournalSectionProps {
  patientId: string;
  startDate?: string;
  endDate?: string;
}

const moodIcons: Record<string, { icon: typeof Smile; color: string; label: string }> = {
  very_positive: { icon: Smile, color: "text-slate-900", label: "Very Positive" },
  positive: { icon: Smile, color: "text-slate-900", label: "Positive" },
  neutral: { icon: Meh, color: "text-slate-400", label: "Neutral" },
  negative: { icon: Frown, color: "text-amber-500", label: "Negative" },
  very_negative: { icon: Frown, color: "text-red-500", label: "Very Negative" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function groupEntriesByDay(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  return entries.reduce((acc, entry) => {
    const dateKey = new Date(entry.logged_at).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);
}

export function JournalSection({ patientId, startDate, endDate }: JournalSectionProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJournal() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientJournal(patientId, startDate, endDate);
        setEntries(response.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load journal");
      } finally {
        setIsLoading(false);
      }
    }
    fetchJournal();
  }, [patientId, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading journal entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No journal entries yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Voice journal entries will appear here</p>
        </div>
      </div>
    );
  }

  const groupedEntries = groupEntriesByDay(entries);
  const sortedDays = Object.keys(groupedEntries).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDays.map((dayKey) => {
        const dayEntries = groupedEntries[dayKey];
        const firstEntry = dayEntries[0];
        
        return (
          <div key={dayKey} className="bg-white rounded-lg border">
            {/* Day Header */}
            <div className="px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {formatDate(firstEntry.logged_at)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
            </div>

            {/* Day Entries */}
            <div className="divide-y">
              {dayEntries.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                const moodInfo = entry.mood ? moodIcons[entry.mood] : null;
                const MoodIcon = moodInfo?.icon;

                return (
                  <div 
                    key={entry.id} 
                    className="px-4 py-3 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                  >
                    {/* Entry Header Row */}
                    <div className="flex items-start gap-3">
                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-20 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.logged_at)}
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm text-foreground",
                          !isExpanded && "line-clamp-2"
                        )}>
                          {entry.transcript}
                        </p>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {entry.tags.map((tag, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* AI Analysis Summary */}
                            {entry.ai_analysis && Object.keys(entry.ai_analysis).length > 0 && (
                              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                                <span className="font-medium">AI Summary: </span>
                                {typeof entry.ai_analysis === "object" && "summary" in entry.ai_analysis 
                                  ? String(entry.ai_analysis.summary)
                                  : "Analysis available"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Duration */}
                        {entry.duration_seconds && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(entry.duration_seconds)}
                          </span>
                        )}

                        {/* Mood Indicator */}
                        {MoodIcon && moodInfo && (
                          <div className={cn("flex items-center gap-1", moodInfo.color)} title={moodInfo.label}>
                            <MoodIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
