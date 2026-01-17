"use client";

import { useState, useEffect } from "react";
import { Percent, Pill, Users, Utensils, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAnalytics, type AnalyticsData } from "@/lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"12m" | "6m" | "30d">("12m");

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getAnalytics();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
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

  if (!data) return null;

  const displayMonthly = timeRange === "12m" 
    ? data.monthly_adherence 
    : timeRange === "6m"
      ? data.monthly_adherence.slice(-6)
      : data.monthly_adherence.slice(-1);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.summary.avg_adherence}%</p>
              <p className="text-xs text-muted-foreground">Avg Adherence</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.summary.total_doses.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Doses Logged</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.summary.total_patients}</p>
              <p className="text-xs text-muted-foreground">Active Patients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-warning/10 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.summary.food_logs.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Food Logs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.summary.exercise_sessions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Exercise Sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-12 gap-4">
        {/* Monthly Trend */}
        <div className="col-span-12 bg-white rounded-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Adherence Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly average across all patients</p>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setTimeRange("12m")}
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-md transition-colors",
                  timeRange === "12m" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                12 months
              </button>
              <button 
                onClick={() => setTimeRange("6m")}
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-md transition-colors",
                  timeRange === "6m" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                6 months
              </button>
              <button 
                onClick={() => setTimeRange("30d")}
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-md transition-colors",
                  timeRange === "30d" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                30 days
              </button>
            </div>
          </div>

          {displayMonthly.some(p => p.value > 0) ? (
            <div className="flex items-end gap-3 h-48">
              {displayMonthly.map((point, i) => {
                const height = Math.max((point.value / 100) * 100, 2);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{point.value > 0 ? `${point.value}%` : "—"}</span>
                    <div className="w-full h-40 flex flex-col justify-end">
                      <div
                        className="w-full bg-primary/80 rounded-sm transition-all hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{point.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No adherence data available</p>
            </div>
          )}
        </div>

        {/* Left Column */}
        <div className="col-span-6 space-y-4">
          {/* Medication Breakdown */}
          <div className="bg-white rounded-md p-4">
            <h3 className="text-sm font-semibold text-foreground">Medication Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Doses taken by medication type</p>
            {data.medication_breakdown.length > 0 ? (
              <div className="space-y-3">
                {data.medication_breakdown.map((item, i) => {
                  const percentage = item.target > 0 ? (item.value / item.target) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground tabular-nums">{item.value} / {item.target}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No medication data available</p>
            )}
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-md p-4">
            <h3 className="text-sm font-semibold text-foreground">Patient Age Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Number of patients by age group</p>
            {data.age_distribution.some(d => d.value > 0) ? (
              <div className="flex items-end gap-2 h-32">
                {data.age_distribution.map((item, i) => {
                  const maxVal = Math.max(...data.age_distribution.map(d => d.value), 1);
                  const height = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{item.value}</span>
                      <div className="w-full h-24 flex flex-col justify-end">
                        <div 
                          className="w-full bg-primary/80 rounded-sm"
                          style={{ height: `${height}%`, minHeight: item.value > 0 ? "4px" : "0" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No patient data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-6 space-y-4">
          {/* Time of Day */}
          <div className="bg-white rounded-md p-4">
            <h3 className="text-sm font-semibold text-foreground">Adherence by Time of Day</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">When medications are most likely to be taken</p>
            {data.time_of_day.some(t => t.value > 0) ? (
              <div className="flex items-end gap-2 h-32">
                {data.time_of_day.map((item, i) => {
                  const height = Math.max(item.value, 2);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{item.value > 0 ? `${item.value}%` : "—"}</span>
                      <div className="w-full h-24 flex flex-col justify-end">
                        <div 
                          className="w-full bg-primary/80 rounded-sm"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No adherence data available</p>
              </div>
            )}
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-md p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Medications</p>
                    <p className="text-xs text-muted-foreground">{data.summary.total_doses.toLocaleString()} doses taken</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary">{data.summary.avg_adherence}%</span>
              </div>

              <div className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10">
                    <Utensils className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Food Logs</p>
                    <p className="text-xs text-muted-foreground">{data.summary.food_logs.toLocaleString()} meals logged</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Exercise</p>
                    <p className="text-xs text-muted-foreground">{data.summary.exercise_sessions.toLocaleString()} sessions recorded</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
