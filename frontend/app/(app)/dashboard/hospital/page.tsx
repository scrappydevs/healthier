"use client";

import { useState, useCallback, useEffect } from 'react';
import { SpaceViewer } from '@/components/hospital/SpaceViewer';
import { roomStatusColors, roomTypeLabels, type Room, type RoomStatus } from '@/components/hospital/rooms';
import { hazardTypeLabels, type Hazard } from '@/components/hospital/hazards';
import { ActivityFeed, type ActivityEvent } from '@/components/hospital/ActivityFeed';
import { generateMockEvents, generateVitalCheckEvent, generateAlertEvent, generateMedicationEvent } from '@/components/hospital/events';

type ViewMode = 'map' | 'heatmap' | 'hazards';

export default function HospitalViewPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  // Selected item for detail panel
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);

  // Activity events
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  // Initialize mock events
  useEffect(() => {
    setEvents(generateMockEvents());
  }, []);

  // Simulate live events every 15-30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const eventGenerators = [generateVitalCheckEvent, generateAlertEvent, generateMedicationEvent];
      const generator = eventGenerators[Math.floor(Math.random() * eventGenerators.length)];
      const newEvent = generator();
      
      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
    }, 15000 + Math.random() * 15000);

    return () => clearInterval(interval);
  }, []);

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    setSelectedHazard(null);
  }, []);

  const handleHazardClick = useCallback((hazard: Hazard) => {
    setSelectedHazard(hazard);
    setSelectedRoom(null);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setSelectedRoom(null);
    setSelectedHazard(null);
  }, []);

  // Determine which layers to show based on view mode
  const showHeatmap = viewMode === 'heatmap';
  const showHazards = viewMode === 'hazards';
  const showRoomStatus = viewMode === 'map' || viewMode === 'hazards';

  return (
    <div className="flex gap-3 h-[calc(100vh-112px)]">
      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Left: Floor Plan Viewer */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col rounded-lg border">
          {/* View Mode Tabs */}
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['map', 'heatmap', 'hazards'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === mode
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {mode === 'map' && 'Map'}
                  {mode === 'heatmap' && 'Heatmap'}
                  {mode === 'hazards' && 'Hazards'}
                </button>
              ))}
            </div>

            {/* Quick room status indicators */}
            <div className="flex items-center gap-3">
              {(['normal', 'attention', 'critical', 'vacant'] as RoomStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: roomStatusColors[status] }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Viewer */}
          <div className="flex-1 min-h-0">
            <SpaceViewer
              viewMode={viewMode}
              showHeatmap={showHeatmap}
              showHazards={showHazards}
              showRoomStatus={showRoomStatus}
              onRoomClick={handleRoomClick}
              onHazardClick={handleHazardClick}
            />
          </div>
        </div>

        {/* Right: Activity Feed + Details */}
        <div className="w-72 flex flex-col border rounded-lg bg-white shrink-0 overflow-hidden">
          {/* Detail Panel (shows when room/hazard selected) */}
          {(selectedRoom || selectedHazard) && (
            <div className="p-3 border-b shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {selectedRoom ? 'Room' : 'Hazard'}
                </p>
                <button
                  onClick={closeDetailPanel}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedRoom && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedRoom.name}</p>
                    <p className="text-xs text-muted-foreground">{roomTypeLabels[selectedRoom.type]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: roomStatusColors[selectedRoom.status] }}
                    />
                    <span className="text-xs text-foreground capitalize">{selectedRoom.status}</span>
                    {selectedRoom.patientCount !== undefined && (
                      <span className="text-xs text-muted-foreground">· {selectedRoom.patientCount} patients</span>
                    )}
                  </div>
                </div>
              )}

              {selectedHazard && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {hazardTypeLabels[selectedHazard.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedHazard.location}</p>
                  </div>
                  <p className="text-xs text-foreground">{selectedHazard.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      selectedHazard.status === 'active' 
                        ? 'bg-red-50 text-red-700' 
                        : selectedHazard.status === 'responding'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {selectedHazard.status === 'active' ? 'Active' : 
                       selectedHazard.status === 'responding' ? 'Responding' : 'Resolved'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Feed */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ActivityFeed events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
