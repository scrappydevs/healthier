"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type DataPoint = {
  label: string;
  value: number;
  target?: number;
};

type TrendChartProps = {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  maxValue?: number;
  type?: "bar" | "progress";
};

export function TrendChart({ 
  title, 
  subtitle, 
  data, 
  maxValue, 
  type = "bar"
}: TrendChartProps) {
  const max = maxValue || Math.max(...data.map(d => Math.max(d.value, d.target || 0))) * 1.2;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {type === "bar" && (
          <div className="flex items-end gap-2 h-28">
            {data.map((point, i) => {
              const height = (point.value / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full h-24 flex flex-col justify-end">
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
        )}

        {type === "progress" && (
          <div className="space-y-3">
            {data.map((point, i) => {
              const percent = point.target 
                ? Math.min((point.value / point.target) * 100, 100) 
                : (point.value / max) * 100;
              
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{point.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {point.value}{point.target ? ` / ${point.target}` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
