"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type PatientCardProps = {
  id: string;
  name: string;
  age: number;
  adherence: number;
  status: "good" | "warning" | "critical";
  lastActive: string;
  medications: number;
};

const statusConfig = {
  good: { label: "Good", style: "bg-emerald-100 text-emerald-800" },
  warning: { label: "Attention", style: "bg-amber-100 text-amber-800" },
  critical: { label: "At Risk", style: "bg-red-100 text-red-800" },
};

export function PatientCard({ 
  id,
  name, 
  age, 
  adherence, 
  status, 
  lastActive, 
  medications 
}: PatientCardProps) {
  const config = statusConfig[status];
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <Link
      href={`/dashboard/patients/${id}`}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      {/* Avatar */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
        <span className="text-xs font-medium text-primary">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {name}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
            config.style
          )}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {age} yrs · {adherence}% adherence · {medications} meds
        </p>
      </div>

      {/* Last active */}
      <span className="text-xs text-muted-foreground shrink-0">
        {lastActive}
      </span>
    </Link>
  );
}
