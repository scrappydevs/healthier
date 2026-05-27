"use client";

import { X, AlertTriangle, Pill as PillIcon, Info, FileText } from "lucide-react";
import { type Pill } from "@/lib/api";
import { cn } from "@/lib/cn";

interface MedicationDetailsModalProps {
  pill: Pill;
  onClose: () => void;
}

export function MedicationDetailsModal({ pill, onClose }: MedicationDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{pill.name}</h2>
            {pill.brand_name && (
              <p className="text-sm text-muted-foreground">{pill.brand_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {pill.image_url && (
            <div className="flex justify-center">
              <div className="relative w-48 h-48 bg-muted/30 rounded-lg overflow-hidden">
                <img
                  src={pill.image_url}
                  alt={pill.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dosage</p>
              <p className="text-sm text-foreground">{pill.strength} {pill.unit}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Form</p>
              <p className="text-sm text-foreground capitalize">{pill.dosage_form}</p>
            </div>
            {pill.generic_name && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Generic Name</p>
                <p className="text-sm text-foreground">{pill.generic_name}</p>
              </div>
            )}
            {(pill.color || pill.shape) && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Appearance</p>
                <p className="text-sm text-foreground capitalize">
                  {[pill.color, pill.shape].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {pill.imprint && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Imprint</p>
                <p className="text-sm text-foreground font-mono">{pill.imprint}</p>
              </div>
            )}
          </div>

          {pill.instructions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Instructions</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{pill.instructions}</p>
            </div>
          )}

          {pill.warnings && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Warnings</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100">
                {pill.warnings}
              </p>
            </div>
          )}

          {pill.side_effects && pill.side_effects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Possible Side Effects</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pill.side_effects.map((effect, index) => (
                  <span 
                    key={index} 
                    className="text-xs px-2 py-1 bg-muted/50 text-muted-foreground rounded"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pill.interactions && pill.interactions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PillIcon className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium uppercase tracking-wider text-red-600">Drug Interactions</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pill.interactions.map((interaction, index) => (
                  <span 
                    key={index} 
                    className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100"
                  >
                    {interaction}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pill.contraindications && pill.contraindications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-xs font-medium uppercase tracking-wider text-red-600">DO NOT USE IF</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <ul className="list-disc list-inside space-y-1">
                  {pill.contraindications.map((contraindication, index) => (
                    <li key={index} className="text-sm text-red-900">
                      {contraindication}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted/50 hover:bg-muted rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
