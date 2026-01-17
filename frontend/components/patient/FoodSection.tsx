"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Utensils, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPatientMeals, type Meal } from "@/lib/api";

interface FoodSectionProps {
  patientId: string;
  date?: string;
}

const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealTypeLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function FoodSection({ patientId, date }: FoodSectionProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeals() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPatientMeals(patientId, date);
        setMeals(response.meals);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load meals");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMeals();
  }, [patientId, date]);

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
          <p className="text-sm text-muted-foreground">No meals logged for this day</p>
        </div>
      </div>
    );
  }

  // Group meals by type
  const mealsByType = mealTypeOrder.reduce((acc, type) => {
    acc[type] = meals.filter((m) => m.meal_type === type);
    return acc;
  }, {} as Record<string, Meal[]>);

  // Calculate daily totals
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.total_calories || 0),
      protein: acc.protein + (meal.total_protein || 0),
      carbs: acc.carbs + (meal.total_carbs || 0),
      fat: acc.fat + (meal.total_fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Daily Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Calories</p>
          <p className="text-lg font-semibold text-foreground">{totals.calories}</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Protein</p>
          <p className="text-lg font-semibold text-foreground">{totals.protein}g</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Carbs</p>
          <p className="text-lg font-semibold text-foreground">{totals.carbs}g</p>
        </div>
        <div className="bg-muted/30 rounded-md p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fat</p>
          <p className="text-lg font-semibold text-foreground">{totals.fat}g</p>
        </div>
      </div>

      {/* Meals by Type */}
      {mealTypeOrder.map((type) => {
        const typeMeals = mealsByType[type];
        if (typeMeals.length === 0) return null;

        return (
          <div key={type} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {mealTypeLabels[type]}
            </h4>
            <div className="space-y-2">
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
        className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Image thumbnail */}
        {meal.image_url ? (
          <img
            src={meal.image_url}
            alt={meal.name}
            className="w-14 h-14 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
            <Utensils className="h-5 w-5 text-muted-foreground" />
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
        </div>

        {/* Health rating */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
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
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t">
          <div className="pt-3 space-y-3">
            {/* Nutritional breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Protein</p>
                <p className="text-sm font-medium">{meal.total_protein}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carbs</p>
                <p className="text-sm font-medium">{meal.total_carbs}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fat</p>
                <p className="text-sm font-medium">{meal.total_fat}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Calories</p>
                <p className="text-sm font-medium">{meal.total_calories}</p>
              </div>
            </div>

            {/* Food groups */}
            {meal.food_groups && meal.food_groups.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Food Groups</p>
                <div className="flex flex-wrap gap-1">
                  {meal.food_groups.map((group, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-muted/50 text-foreground rounded-full"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Vitamins */}
            {meal.vitamins_summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vitamins</p>
                <p className="text-xs text-foreground">{meal.vitamins_summary}</p>
              </div>
            )}

            {/* Analysis */}
            {meal.ai_analysis && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Analysis</p>
                <p className="text-xs text-foreground leading-relaxed">{meal.ai_analysis}</p>
              </div>
            )}

            {/* Large image */}
            {meal.image_url && (
              <div>
                <img
                  src={meal.image_url}
                  alt={meal.name}
                  className="w-full rounded-md object-cover max-h-48"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
