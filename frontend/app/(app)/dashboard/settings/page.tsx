"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { getCurrentUser, updateUserProfile, type UserProfile } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    specialty: "",
    notification_preferences: {
      critical_alerts: true,
      daily_summary: true,
      weekly_reports: false,
    },
    alert_thresholds: {
      low_adherence_percent: 75,
      missed_doses_critical: 2,
    },
  });

  useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setFormData({
          full_name: userData.full_name,
          email: userData.email,
          specialty: userData.specialty || "",
          notification_preferences: userData.notification_preferences,
          alert_thresholds: userData.alert_thresholds,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(formData);
      setUser(updated);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
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

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-md p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Profile</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-medium">
            {getInitials(formData.full_name || "U")}
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">{formData.full_name || "User"}</h3>
            <p className="text-sm text-muted-foreground">{formData.specialty || "Clinician"}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full h-9 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-9 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Specialty
            </label>
            <input
              type="text"
              value={formData.specialty}
              onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
              placeholder="e.g. Cardiology, Internal Medicine"
              className="w-full h-9 px-3 text-sm bg-white border rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Notifications</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Critical Alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive notifications for missed doses and critical events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.notification_preferences.critical_alerts}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, critical_alerts: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Daily Summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive a daily summary of patient adherence</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.notification_preferences.daily_summary}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, daily_summary: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Weekly Reports</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive weekly analytics and trend reports</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.notification_preferences.weekly_reports}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, weekly_reports: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Alert Thresholds</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Low Adherence Warning (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.alert_thresholds.low_adherence_percent}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alert_thresholds: { ...prev.alert_thresholds, low_adherence_percent: parseInt(e.target.value) || 0 }
                }))}
                min={0}
                max={100}
                className="w-20 h-9 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Alert when patient adherence drops below this percentage</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Missed Doses (Critical)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={formData.alert_thresholds.missed_doses_critical}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alert_thresholds: { ...prev.alert_thresholds, missed_doses_critical: parseInt(e.target.value) || 1 }
                }))}
                min={1}
                max={10}
                className="w-20 h-9 px-3 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Mark as critical after this many consecutive missed doses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 px-4 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
        <button className="h-9 px-4 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
