"use client";

import { useState } from "react";
import { Calendar, Clock, Pill, MoreVertical, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface MedicationCardProps {
  medication: any;
  patientId: string;
}

export function MedicationCard({ medication, patientId }: MedicationCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate this medication?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medications/schedules/${medication.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: false }),
        }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to deactivate medication");
      }
    } catch (error) {
      console.error("Failed to deactivate:", error);
      alert("Failed to deactivate medication");
    }
  };

  const pill = medication.pill;
  if (!pill) return null;

  return (
    <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {showMenu && (
        <div className="absolute top-10 right-3 bg-white border rounded-md shadow-lg py-1 z-10 min-w-[120px]">
          <button
            onClick={() => {
              setShowMenu(false);
              // TODO: Implement edit functionality
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-2"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              handleDeactivate();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
          >
            <Trash2 className="h-3 w-3" />
            Deactivate
          </button>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        {pill.image_url && (
          <img
            src={pill.image_url}
            alt={pill.name}
            className="w-14 h-14 rounded object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{pill.name}</h3>
          <p className="text-sm text-muted-foreground">
            {pill.generic_name && `${pill.generic_name} · `}
            {medication.dosage_amount} {pill.unit}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <span className={cn(
          "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
          medication.is_active
            ? "bg-primary/8 text-primary"
            : "bg-muted text-muted-foreground"
        )}>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            medication.is_active ? "bg-primary" : "bg-muted-foreground"
          )} />
          {medication.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Pill className="h-3 w-3" />
          <span>{medication.frequency.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{medication.times_of_day?.join(", ")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            Since {new Date(medication.start_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {medication.with_food && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">Take with food</p>
        </div>
      )}
      {medication.special_instructions && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">{medication.special_instructions}</p>
        </div>
      )}
    </div>
  );
}
