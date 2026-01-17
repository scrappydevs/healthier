"use client";

import { useState, useCallback } from 'react';
import { SpaceViewer } from '@/components/hospital/SpaceViewer';
import { rooms, roomStatusColors, roomTypeLabels, getRoomStats, type Room, type RoomStatus } from '@/components/hospital/rooms';
import { hazardSeverityColors, hazardTypeLabels, getActiveHazards, type Hazard } from '@/components/hospital/hazards';

type ViewMode = 'map' | 'heatmap' | 'hazards';

export default function HospitalViewPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  // Selected item for detail panel
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);

  // Stats
  const activeHazards = getActiveHazards();
  const roomStats = getRoomStats();

  // Room counts by status (using helper)
  const roomCounts = {
    total: roomStats.total,
    occupied: roomStats.occupied,
    critical: roomStats.critical,
    attention: roomStats.attention,
  };

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
    <div className="h-full flex flex-col gap-4">
      {/* Top Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="label-uppercase text-neutral-500 mb-1">Rooms</p>
          <p className="text-2xl font-light text-neutral-950">{roomCounts.occupied}/{roomCounts.total}</p>
          <p className="text-xs text-neutral-500 mt-1">occupied</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="label-uppercase text-neutral-500 mb-1">Critical</p>
          <p className="text-2xl font-light text-red-600">{roomCounts.critical}</p>
          <p className="text-xs text-neutral-500 mt-1">need attention</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="label-uppercase text-neutral-500 mb-1">Hazards</p>
          <p className="text-2xl font-light text-amber-600">{activeHazards.length}</p>
          <p className="text-xs text-neutral-500 mt-1">active</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="label-uppercase text-neutral-500 mb-1">Attention</p>
          <p className="text-2xl font-light text-amber-600">{roomCounts.attention}</p>
          <p className="text-xs text-neutral-500 mt-1">need review</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Center: Floor Plan Viewer */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* View Mode Tabs */}
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['map', 'heatmap', 'hazards'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    viewMode === mode
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
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
                  <span className="text-xs text-neutral-500 capitalize">{status}</span>
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

        {/* Right: Detail Panel */}
        {(selectedRoom || selectedHazard) && (
          <div className="w-96 flex flex-col gap-4">
            {/* Detail Panel (shows when room/hazard selected) */}
            <div className="bg-white rounded-lg shadow-sm p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="label-uppercase text-neutral-950">
                  {selectedRoom ? 'Room Details' : 'Hazard Details'}
                </p>
                <button
                  onClick={closeDetailPanel}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedRoom && (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-light text-neutral-950">{selectedRoom.name}</p>
                    <p className="text-xs text-neutral-500">{roomTypeLabels[selectedRoom.type]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: roomStatusColors[selectedRoom.status] }}
                    />
                    <span className="text-sm text-neutral-700 capitalize">{selectedRoom.status}</span>
                  </div>
                  {selectedRoom.patientCount !== undefined && (
                    <p className="text-sm text-neutral-600">
                      Patients: <span className="font-medium">{selectedRoom.patientCount}</span>
                    </p>
                  )}
                  {selectedRoom.lastUpdated && (
                    <p className="text-xs text-neutral-500">Updated {selectedRoom.lastUpdated}</p>
                  )}
                </div>
              )}

              {selectedHazard && (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-light text-neutral-950">
                      {hazardTypeLabels[selectedHazard.type]}
                    </p>
                    <p className="text-xs text-neutral-500">{selectedHazard.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hazardSeverityColors[selectedHazard.severity] }}
                    />
                    <span className="text-sm text-neutral-700 capitalize">{selectedHazard.severity}</span>
                  </div>
                  <p className="text-sm text-neutral-600">{selectedHazard.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedHazard.status === 'active' 
                        ? 'bg-red-100 text-red-700' 
                        : selectedHazard.status === 'responding'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedHazard.status === 'active' ? 'Active' : 
                       selectedHazard.status === 'responding' ? 'Responding' : 'Resolved'}
                    </span>
                    <span className="text-xs text-neutral-500">{selectedHazard.reportedAt}</span>
                  </div>
                  {selectedHazard.reportedBy && (
                    <p className="text-xs text-neutral-500">Reported by: {selectedHazard.reportedBy}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
