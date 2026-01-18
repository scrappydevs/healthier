"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Utensils, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientMeals, type Meal } from "@/lib/api";

interface FoodSectionProps {
  patientId: string;
  date?: string; // Kept for compatibility but not used
}

const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealTypeLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Get local date string (YYYY-MM-DD) from a date
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get local date string from ISO timestamp
function getLocalDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return getLocalDateString(date);
}

function formatDateLabel(dateStr: string): string {
  // Parse date string as local date
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function groupMealsByDate(meals: Meal[]): Map<string, Meal[]> {
  const grouped = new Map<string, Meal[]>();
  
  // Sort meals by date descending (newest first)
  const sorted = [...meals].sort((a, b) => 
    new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
  );
  
  for (const meal of sorted) {
    // Use local date for grouping
    const dateKey = getLocalDateFromTimestamp(meal.consumed_at);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(meal);
  }
  
  return grouped;
}

export function FoodSection({ patientId }: FoodSectionProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeals() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all meals (no date filter)
        const response = await getPatientMeals(patientId);
        setMeals(response.meals);
        
        // Auto-expand today if it has meals
        const today = getLocalDateString(new Date());
        const hasToday = response.meals.some(m => getLocalDateFromTimestamp(m.consumed_at) === today);
        if (hasToday) {
          setExpandedDays(new Set([today]));
        } else if (response.meals.length > 0) {
          // Expand the most recent day
          const mostRecent = getLocalDateFromTimestamp(response.meals[0].consumed_at);
          setExpandedDays(new Set([mostRecent]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load meals");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMeals();
  }, [patientId]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading meals...</p>
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

  if (meals.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <Utensils className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No meals logged yet</p>
        </div>
      </div>
    );
  }

  const mealsByDate = groupMealsByDate(meals);

  return (
    <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1">
      {Array.from(mealsByDate.entries()).map(([dateKey, dateMeals]) => {
        const isExpanded = expandedDays.has(dateKey);
        const dayTotals = dateMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.total_calories || 0),
            count: acc.count + 1,
          }),
          { calories: 0, count: 0 }
        );

        return (
          <div key={dateKey} className="border-b last:border-b-0">
            {/* Day Header - Collapsible */}
            <button
              onClick={() => toggleDay(dateKey)}
              className="w-full px-3 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {formatDateLabel(dateKey)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dayTotals.count} {dayTotals.count === 1 ? "meal" : "meals"} · {dayTotals.calories} cal
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Day Content */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3">
                {/* Day Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted/30 rounded-md p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Calories</p>
                    <p className="text-sm font-semibold">{dayTotals.calories}</p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Protein</p>
                    <p className="text-sm font-semibold">
                      {dateMeals.reduce((sum, m) => sum + (m.total_protein || 0), 0)}g
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Carbs</p>
                    <p className="text-sm font-semibold">
                      {dateMeals.reduce((sum, m) => sum + (m.total_carbs || 0), 0)}g
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Fat</p>
                    <p className="text-sm font-semibold">
                      {dateMeals.reduce((sum, m) => sum + (m.total_fat || 0), 0)}g
                    </p>
                  </div>
                </div>

                {/* Meals by Type */}
                {mealTypeOrder.map((type) => {
                  const typeMeals = dateMeals.filter((m) => m.meal_type === type);
                  if (typeMeals.length === 0) return null;

                  return (
                    <div key={type} className="space-y-1.5">
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {mealTypeLabels[type]}
                      </h4>
                      <div className="space-y-1.5">
                        {typeMeals.map((meal) => (
                          <MealCard
                            key={meal.id}
                            meal={meal}
                            isExpanded={expandedMealId === meal.id}
                            onToggle={() =>
                              setExpandedMealId(expandedMealId === meal.id ? null : meal.id)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MealCard({
  meal,
  isExpanded,
  onToggle,
}: {
  meal: Meal;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(meal.consumed_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-2.5 flex items-center gap-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Image thumbnail */}
        {meal.image_url ? (
          <img
            src={meal.image_url}
            alt={meal.name}
            className="w-10 h-10 rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{meal.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{time}</span>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">{meal.total_calories} cal</span>
          </div>
          {meal.ai_analysis && (
            <p className="text-sm text-emerald-600 leading-relaxed mt-1">{meal.ai_analysis}</p>
          )}
        </div>

        {/* Health rating */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
              meal.health_rating >= 75
                ? "bg-primary/10 text-primary"
                : meal.health_rating >= 50
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {meal.health_rating}%
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-0 border-t">
          <div className="pt-2.5 space-y-2.5">
            {/* Nutritional breakdown */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Protein</p>
                <p className="text-xs font-medium">{meal.total_protein}g</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Carbs</p>
                <p className="text-xs font-medium">{meal.total_carbs}g</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Fat</p>
                <p className="text-xs font-medium">{meal.total_fat}g</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Calories</p>
                <p className="text-xs font-medium">{meal.total_calories}</p>
              </div>
            </div>

            {/* Food groups */}
            {meal.food_groups && meal.food_groups.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Food Groups</p>
                <div className="flex flex-wrap gap-1">
                  {meal.food_groups.map((group, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-[10px] bg-muted/50 text-foreground rounded-full"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Large image */}
            {meal.image_url && (
              <div>
                <img
                  src={meal.image_url}
                  alt={meal.name}
                  className="w-full rounded object-cover max-h-40"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
