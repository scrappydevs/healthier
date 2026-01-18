"use client";

import { useState, useCallback } from 'react';
import { SpaceViewer } from '@/components/hospital/SpaceViewer';

// Room interface matching SpaceViewer
interface Room {
  id: string;
  name: string;
  type:
    | 'patient'
    | 'nurse_station'
    | 'critical'
    | 'reception'
    | 'waiting'
    | 'hallway'
    | 'pantry'
    | 'restroom'
    | 'storage'
    | 'other';
  status?: string;
  position: {
    levelIndex: number;
    x: number;
    z: number;
    polygon?: Array<{ x: number; z: number }>;
  };
}

type ViewMode = 'map' | 'heatmap';

// Status colors
const statusColors: Record<string, string> = {
  normal: '#22c55e',
  attention: '#f59e0b',
  critical: '#ef4444',
  vacant: '#94a3b8',
};

// Room type labels
const typeLabels: Record<string, string> = {
  patient: 'Patient Room',
  nurse_station: 'Nurse Station',
  critical: 'Critical Room',
  reception: 'Reception / Check-in',
  waiting: 'Waiting Area',
  hallway: 'Hallway / Entrance',
  pantry: 'Pantry',
  restroom: 'Restroom',
  storage: 'Storage',
  other: 'Other',
};

export default function HospitalViewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setSelectedRoom(null);
  }, []);

  const showHeatmap = viewMode === 'heatmap';

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Center: Floor Plan Viewer */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* View Mode Tabs */}
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['map', 'heatmap'] as ViewMode[]).map((mode) => (
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
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-neutral-500 capitalize">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Viewer - Extended to fill available space */}
          <div className="flex-1 min-h-[600px]">
            <SpaceViewer
              viewMode={viewMode}
              showHeatmap={showHeatmap}
              onRoomClick={handleRoomClick}
            />
          </div>
        </div>

        {/* Right: Detail Panel (shows when room selected) */}
        {selectedRoom && (
          <div className="w-80 bg-white rounded-lg shadow-sm p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Room Details
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

            <div className="space-y-3">
              <div>
                <p className="text-lg font-light text-neutral-950">{selectedRoom.name}</p>
                <p className="text-xs text-neutral-500">{typeLabels[selectedRoom.type] || selectedRoom.type}</p>
              </div>
              
              {selectedRoom.status && (
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors[selectedRoom.status] || statusColors.normal }}
                  />
                  <span className="text-sm text-neutral-700 capitalize">{selectedRoom.status}</span>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-500">
                  Position: ({selectedRoom.position.x.toFixed(1)}, {selectedRoom.position.z.toFixed(1)})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
