"use client";

import { useState } from "react";
import { X, Search, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

interface AssignMedicationModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignMedicationModal({ patientId, patientName, onClose, onAssigned }: AssignMedicationModalProps) {
  const [step, setStep] = useState<"select" | "schedule">("select");
  const [selectedPill, setSelectedPill] = useState<any>(null);
  const [pills, setPills] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Schedule form state
  const [dosageAmount, setDosageAmount] = useState("1");
  const [frequency, setFrequency] = useState("once_daily");
  const [timesOfDay, setTimesOfDay] = useState(["09:00"]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [withFood, setWithFood] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const searchPills = async (query: string) => {
    if (!query) {
      setPills([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/medications/pills?search=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setPills(data);
      }
    } catch (error) {
      console.error("Failed to search pills:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPill = (pill: any) => {
    setSelectedPill(pill);
    setStep("schedule");
  };

  const handleAssign = async () => {
    if (!selectedPill) return;

    setIsLoading(true);
    try {
      const scheduleData = {
        patient_id: patientId,
        pill_id: selectedPill.id,
        dosage_amount: parseFloat(dosageAmount),
        frequency,
        times_of_day: timesOfDay,
        start_date: startDate,
        with_food: withFood,
        special_instructions: specialInstructions || null,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/medications/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleData),
      });

      if (response.ok) {
        onAssigned();
      } else {
        alert("Failed to assign medication");
      }
    } catch (error) {
      console.error("Failed to assign medication:", error);
      alert("Failed to assign medication");
    } finally {
      setIsLoading(false);
    }
  };

  const addTimeSlot = () => {
    setTimesOfDay([...timesOfDay, "12:00"]);
  };

  const removeTimeSlot = (index: number) => {
    setTimesOfDay(timesOfDay.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...timesOfDay];
    newTimes[index] = value;
    setTimesOfDay(newTimes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {step === "select" ? "Select Medication" : "Set Schedule"}
            </h2>
            <p className="text-sm text-muted-foreground">For {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "select" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search medications by name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchPills(e.target.value);
                  }}
                  className="w-full h-10 pl-10 pr-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {isSearching ? (
                <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
              ) : pills.length === 0 && searchQuery ? (
                <p className="text-sm text-muted-foreground text-center py-8">No medications found</p>
              ) : pills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Start typing to search medications</p>
              ) : (
                <div className="space-y-2">
                  {pills.map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => handleSelectPill(pill)}
                      className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {pill.image_url && (
                          <img
                            src={pill.image_url}
                            alt={pill.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{pill.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pill.generic_name && `${pill.generic_name} · `}
                            {pill.dosage_form} · {pill.strength}{pill.unit}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  {selectedPill.image_url && (
                    <img
                      src={selectedPill.image_url}
                      alt={selectedPill.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{selectedPill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPill.generic_name} · {selectedPill.strength}{selectedPill.unit}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dosage Amount
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dosageAmount}
                  onChange={(e) => setDosageAmount(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="once_daily">Once daily</option>
                  <option value="twice_daily">Twice daily</option>
                  <option value="three_times_daily">Three times daily</option>
                  <option value="four_times_daily">Four times daily</option>
                  <option value="as_needed">As needed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Times of Day
                </label>
                <div className="space-y-2">
                  {timesOfDay.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateTimeSlot(index, e.target.value)}
                        className="flex-1 h-10 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {timesOfDay.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTimeSlot}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    + Add time slot
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="withFood"
                  checked={withFood}
                  onChange={(e) => setWithFood(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="withFood" className="text-sm text-foreground">
                  Take with food
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Special Instructions (optional)
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any additional instructions..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between">
          <button
            onClick={step === "select" ? onClose : () => setStep("select")}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === "select" ? "Cancel" : "Back"}
          </button>
          {step === "schedule" && (
            <button
              onClick={handleAssign}
              disabled={isLoading}
              className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Assigning..." : "Assign Medication"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
