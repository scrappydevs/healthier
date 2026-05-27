"use client";

import { useState, useCallback, useEffect } from 'react';
import { SpaceViewer } from '@/components/hospital/SpaceViewer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  patient?: {
    id: string;
    name: string;
    age?: number;
    condition?: string;
    status?: string;
  } | null;
}

// Room details from API
interface RoomDetails {
  room: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  patient: {
    id: string;
    name: string;
    age: number;
    conditions: string[];
    status: string;
    assigned_at: string;
  } | null;
  tasks: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    due_at: string | null;
  }>;
  hazards: Array<{
    id: string;
    type: string;
    description: string;
    severity: string;
    status: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    scheduled_time: string;
    status: string;
  }>;
}

// Priority colors
const priorityColors: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  normal: '#3b82f6',
  low: '#6b7280',
};

// Severity colors
const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

// Status colors for badges
const statusColors: Record<string, string> = {
  normal: '#22c55e',
  critical: '#ef4444',
  vacant: '#94a3b8',
  maintenance: '#f59e0b',
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
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewerMode, setViewerMode] = useState<'2d' | '3d'>('3d');
  const [viewerState, setViewerState] = useState({
    viewerMode: '3d' as '2d' | '3d',
    roomCount: 0,
    alertCount: 0,
    criticalAlertCount: 0,
  });

  useEffect(() => {
    if (!selectedRoom) {
      setRoomDetails(null);
      return;
    }

    const fetchRoomDetails = async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/hospital/rooms/${selectedRoom.id}/details`);
        const data = await res.json();
        if (!data.error) {
          setRoomDetails(data);
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    // Initial fetch
    fetchRoomDetails();

    const refreshInterval = setInterval(() => {
      fetchRoomDetails();
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [selectedRoom]);

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setSelectedRoom(null);
    setRoomDetails(null);
  }, []);

  const handleStateChange = useCallback((state: typeof viewerState) => {
    setViewerState(state);
  }, []);

  const handleModeToggle = useCallback((mode: '2d' | '3d') => {
    setViewerMode(mode);
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleModeToggle('2d')}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewerMode === '2d'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => handleModeToggle('3d')}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewerMode === '3d'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                3D
              </button>
            </div>

            {viewerState.alertCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {viewerState.criticalAlertCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <span className="text-xs text-neutral-600">
                    {viewerState.alertCount} Active Alert{viewerState.alertCount !== 1 ? 's' : ''}
                    {viewerState.criticalAlertCount > 0 && (
                      <span className="text-red-600 font-medium ml-1">
                        ({viewerState.criticalAlertCount} critical)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <SpaceViewer
              viewMode="map"
              showHeatmap={false}
              onRoomClick={handleRoomClick}
              onStateChange={handleStateChange}
              onModeToggle={handleModeToggle}
              initialViewerMode={viewerMode}
            />
          </div>
        </div>

        {selectedRoom && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-neutral-200">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-neutral-950">{selectedRoom.name}</h2>
                <span className="text-xs text-neutral-500">{typeLabels[selectedRoom.type] || selectedRoom.type}</span>
                {(roomDetails?.room.status || selectedRoom.status) && (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded text-white"
                    style={{ backgroundColor: statusColors[roomDetails?.room.status || selectedRoom.status || 'normal'] || '#6b7280' }}
                  >
                    {roomDetails?.room.status || selectedRoom.status}
                  </span>
                )}
              </div>
              <button
                onClick={closeDetailPanel}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
                  <div className="h-3 bg-neutral-100 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Patient</p>
                    {roomDetails?.patient ? (
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{roomDetails.patient.name}</p>
                        <p className="text-xs text-neutral-500">
                          Age {roomDetails.patient.age} · {roomDetails.patient.status}
                        </p>
                      </div>
                    ) : selectedRoom.patient ? (
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{selectedRoom.patient.name}</p>
                        <p className="text-xs text-neutral-500">
                          {selectedRoom.patient.age ? `Age ${selectedRoom.patient.age}` : ''}
                          {selectedRoom.patient.status ? ` · ${selectedRoom.patient.status}` : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-400">No patient assigned</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Tasks</p>
                    {roomDetails ? (
                      <p className="text-sm text-neutral-700">
                        {roomDetails.tasks.length > 0 ? (
                          <span>
                            <span className="font-medium text-neutral-900">{roomDetails.tasks.length}</span>
                            {' pending'}
                            {roomDetails.tasks.some(t => t.priority === 'urgent') && (
                              <span className="text-red-600 ml-1">(urgent)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">None pending</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400">-</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Medications</p>
                    {roomDetails ? (
                      <p className="text-sm text-neutral-700">
                        {roomDetails.medications.length > 0 ? (
                          <span>
                            <span className="font-medium text-neutral-900">{roomDetails.medications.length}</span>
                            {' scheduled'}
                          </span>
                        ) : (
                          <span className="text-neutral-400">None scheduled</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400">-</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Alerts</p>
                    {roomDetails ? (
                      <p className="text-sm text-neutral-700">
                        {roomDetails.alerts.length + roomDetails.hazards.length > 0 ? (
                          <span className="text-red-600 font-medium">
                            {roomDetails.alerts.length + roomDetails.hazards.length} active
                          </span>
                        ) : (
                          <span className="text-green-600">All clear</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400">-</p>
                    )}
                  </div>
                </div>

                {roomDetails && (roomDetails.tasks.length > 0 || roomDetails.medications.length > 0 || roomDetails.alerts.length > 0 || roomDetails.hazards.length > 0 || (roomDetails.patient?.conditions?.length ?? 0) > 0) && (
                  <div className="border-t border-neutral-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {roomDetails.patient && roomDetails.patient.conditions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Conditions</p>
                        <div className="flex flex-wrap gap-1">
                          {roomDetails.patient.conditions.map((condition, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {roomDetails.tasks.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                          Pending Tasks
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {roomDetails.tasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="flex items-start gap-2 text-xs p-2 rounded bg-neutral-50 border border-neutral-100"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: priorityColors[task.priority] || '#6b7280' }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-neutral-900 leading-snug mb-0.5">{task.title}</p>
                                {task.description && (
                                  <p className="text-neutral-500 whitespace-pre-wrap break-words leading-relaxed">{task.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {roomDetails.medications.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                          Scheduled Medications
                        </p>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {roomDetails.medications.map((med) => (
                            <div key={med.id} className="text-xs">
                              <p className="font-medium text-neutral-900">{med.name}</p>
                              <p className="text-neutral-500">{med.dosage}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(roomDetails.alerts.length > 0 || roomDetails.hazards.length > 0) && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                          Active Alerts
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                          {roomDetails.alerts.map((alert) => (
                            <div 
                              key={alert.id} 
                              className="flex items-start gap-2 text-xs p-2 rounded bg-red-50 border border-red-100"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: severityColors[alert.severity] || '#ef4444' }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-red-800 leading-snug mb-0.5">{alert.title}</p>
                                {alert.message && (
                                  <p className="text-red-600 whitespace-pre-wrap break-words leading-relaxed">{alert.message}</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {roomDetails.hazards.map((hazard) => (
                            <div 
                              key={hazard.id} 
                              className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 border border-amber-100"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: severityColors[hazard.severity] || '#f59e0b' }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-amber-800 leading-snug mb-0.5">{hazard.type}</p>
                                <p className="text-amber-600 whitespace-pre-wrap break-words leading-relaxed">{hazard.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
