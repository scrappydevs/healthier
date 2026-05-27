"use client";

import { useState, useEffect } from "react";
import { BookOpen, AlertCircle, Clock, Smile, Meh, Frown } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientJournal, generateJournalDaySummary, type JournalEntry } from "@/lib/api";

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

function getEntrySummary(transcript: string): string {
  const firstSentence = transcript.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length < 120) {
    return firstSentence.trim() + (transcript.length > firstSentence.length ? "..." : "");
  }
  // Truncate at word boundary
  if (transcript.length <= 100) return transcript;
  const truncated = transcript.slice(0, 100).replace(/\s+\S*$/, "");
  return truncated + "...";
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
  const [daySummaries, setDaySummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  useEffect(() => {
    async function fetchJournal() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientJournal(patientId, startDate, endDate);
        setEntries(response.entries);
        setIsLoading(false);
        
        setLoadingSummaries(true);
        const grouped = groupEntriesByDay(response.entries);
        const summariesMap: Record<string, string> = {};
        
        await Promise.all(
          Object.keys(grouped).map(async (dayKey) => {
            const firstEntry = grouped[dayKey][0];
            const entryDate = new Date(firstEntry.logged_at).toISOString().split('T')[0];
            
            try {
              const result = await generateJournalDaySummary(patientId, entryDate);
              summariesMap[dayKey] = result.summary;
            } catch {
              summariesMap[dayKey] = "";
            }
          })
        );
        
        setDaySummaries(summariesMap);
        setLoadingSummaries(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load journal");
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
    <div className="border rounded-md overflow-hidden bg-white divide-y">
      {sortedDays.map((dayKey) => {
        const dayEntries = groupedEntries[dayKey];
        const firstEntry = dayEntries[0];
        
        return (
          <div key={dayKey} className="bg-white">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {formatDate(firstEntry.logged_at)}
              </span>
              <span className="text-xs text-muted-foreground">
                {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {(loadingSummaries || daySummaries[dayKey]) && (
              <div className="px-4 pb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                {loadingSummaries && !daySummaries[dayKey] ? (
                  <p className="text-sm text-muted-foreground italic">Generating AI summary...</p>
                ) : (
                  <p className="text-sm font-semibold text-neutral-950 leading-relaxed">{daySummaries[dayKey]}</p>
                )}
              </div>
            )}

            <div className="px-4 pb-4 space-y-3">
              {dayEntries.map((entry) => {
                const moodInfo = entry.mood ? moodIcons[entry.mood] : null;
                const MoodIcon = moodInfo?.icon;

                return (
                  <div 
                    key={entry.id} 
                    className="py-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-20 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.logged_at)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm text-foreground leading-relaxed">{entry.transcript}</p>

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.tags.map((tag, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {entry.duration_seconds && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(entry.duration_seconds)}
                          </span>
                        )}

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
