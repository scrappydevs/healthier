"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { loadSmplrJs } from '@smplrspace/smplr-loader';
import type { Smplr, Space } from '@smplrspace/smplr-loader';

import { rooms, roomStatusColors, roomTypeLabels, type Room, type RoomType } from './rooms';
import { hazardSeverityColors, hazardTypeLabels, getActiveHazards, type Hazard } from './hazards';
import { activityData } from './activity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDataLayerConfig = any;

// Smplrspace configuration
const SMPLR_CONFIG = {
  dev: {
    spaceId: 'spc_z8aua0s4',
    clientToken: 'pub_d3d112d5391f404b92f7e3a8fea8f5ec',
  },
  prod: {
    spaceId: 'spc_kbqb3yxi',
    clientToken: 'pub_4fda7bdd6a4d465c9fc615cbcd0b2aad',
  },
};

const ENV = 'dev';

export type ViewMode = 'map' | 'heatmap' | 'hazards';

export interface SpaceViewerProps {
  viewMode?: ViewMode;
  showHeatmap?: boolean;
  showHazards?: boolean;
  showRoomStatus?: boolean;
  onRoomClick?: (room: Room) => void;
  onHazardClick?: (hazard: Hazard) => void;
}

// Room type icon mapping (small colored dots with meaning)
const roomTypeColors: Record<RoomType, string> = {
  patient: '#3b82f6',      // blue
  icu: '#ef4444',          // red
  operating: '#8b5cf6',    // purple
  emergency: '#f97316',    // orange
  pharmacy: '#2563eb',     // blue
  lab: '#06b6d4',          // cyan
  nurses_station: '#ec4899', // pink
  reception: '#6366f1',    // indigo
  hallway: '#9ca3af',      // gray
  storage: '#78716c',      // stone
  ward: '#0ea5e9',         // sky
  common: '#a3a3a3',       // neutral
};

// Tooltip styles
const tooltipStyles = {
  container: 'padding: 10px 12px; min-width: 160px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
  title: 'font-weight: 600; font-size: 13px; color: #171717; margin-bottom: 4px;',
  subtitle: 'font-size: 11px; color: #737373; margin-bottom: 6px;',
  row: 'font-size: 11px; color: #525252; margin-top: 4px;',
  badge: (bg: string, color: string) => `font-size: 10px; margin-top: 6px; padding: 3px 8px; border-radius: 10px; display: inline-block; font-weight: 500; background: ${bg}; color: ${color};`,
};

export function SpaceViewer({
  viewMode = 'map',
  showHeatmap = false,
  showHazards = false,
  showRoomStatus = true,
  onRoomClick,
  onHazardClick,
}: SpaceViewerProps) {
  const smplrRef = useRef<Smplr | null>(null);
  const spaceRef = useRef<Space | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prepare heatmap data from activity data
  const heatmapData = useMemo(() => {
    return activityData.map((d) => ({
      ...d,
      position: d.position,
    }));
  }, []);

  // Prepare hazard data for icon layer
  const activeHazards = useMemo(() => getActiveHazards(), []);

  // Filter rooms - only show patient-related rooms on map (not hallways/storage)
  const visibleRooms = useMemo(() => {
    return rooms.filter(r => !['hallway', 'storage'].includes(r.type));
  }, []);

  // Initialize viewer
  useEffect(() => {
    let mounted = true;

    const initViewer = async () => {
      try {
        setIsLoading(true);
        const smplr = await loadSmplrJs('umd', ENV);
        
        if (!mounted) return;
        
        smplrRef.current = smplr;
        spaceRef.current = new smplr.Space({
          containerId: 'hospital-space-viewer',
          ...SMPLR_CONFIG[ENV],
        });

        spaceRef.current.startViewer({
          preview: false,
          allowModeChange: true,
          mode: '2d', // Start in 2D for cleaner floor plan view
          renderOptions: {
            backgroundColor: '#f8fafc',
            annotations: {
              render: false,
            },
            walls: {
              render: true,
              alpha: 0.95,
            },
          },
          hideNavigationButtons: true,
          hideLevelPicker: false,
          onReady: () => {
            if (mounted) {
              setViewerReady(true);
              setIsLoading(false);
            }
          },
          onError: (errorMessage: string) => {
            console.error('Smplrspace viewer error:', errorMessage);
            if (mounted) {
              setError('Failed to load floor plan viewer');
              setIsLoading(false);
            }
          },
        });
      } catch (err) {
        console.error('Failed to initialize Smplrspace:', err);
        if (mounted) {
          setError('Failed to initialize floor plan');
          setIsLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
    };
  }, []);

  // Add/remove heatmap layer (gradient style, not bars)
  useEffect(() => {
    if (!viewerReady || !spaceRef.current || !smplrRef.current) return;

    if (showHeatmap) {
      const config: AnyDataLayerConfig = {
        id: 'activity-heatmap',
        type: 'heatmap',
        data: heatmapData,
        value: (d: typeof heatmapData[0]) => d.value,
        color: smplrRef.current.Color.numericScale({
          name: smplrRef.current.Color.NumericScale.RdYlGn,
          domain: [0, 100],
          invert: true,
        }),
        alpha: 0.6,
        height: 0.1,
        confidenceRadius: 4,
        gridSize: 0.3,
      };
      spaceRef.current.addDataLayer(config);
    }

    return () => {
      if (spaceRef.current) {
        try {
          spaceRef.current.removeDataLayer('activity-heatmap');
        } catch {
          // Layer might not exist
        }
      }
    };
  }, [viewerReady, showHeatmap, heatmapData]);

  // Add/remove hazard markers - small warning indicators
  useEffect(() => {
    if (!viewerReady || !spaceRef.current) return;

    if (showHazards && activeHazards.length > 0) {
      const config: AnyDataLayerConfig = {
        id: 'hazard-markers',
        type: 'point',
        data: activeHazards,
        diameter: 0.6, // Small marker
        anchor: 'center',
        alpha: 0.9,
        color: (d: Hazard) => hazardSeverityColors[d.severity],
        tooltip: (d: Hazard) => {
          const statusColors = {
            active: { bg: '#fef2f2', color: '#dc2626' },
            responding: { bg: '#fffbeb', color: '#d97706' },
            resolved: { bg: '#f0fdf4', color: '#16a34a' },
          };
          const sc = statusColors[d.status];
          return `
            <div style="${tooltipStyles.container}">
              <div style="${tooltipStyles.title}">${hazardTypeLabels[d.type]}</div>
              <div style="${tooltipStyles.subtitle}">${d.location}</div>
              <div style="${tooltipStyles.row}">${d.description}</div>
              <div style="${tooltipStyles.row}">Reported: ${d.reportedAt}</div>
              <div style="${tooltipStyles.badge(sc.bg, sc.color)}">
                ${d.status.charAt(0).toUpperCase() + d.status.slice(1)}
              </div>
            </div>
          `;
        },
        onClick: (d: Hazard) => {
          if (onHazardClick) onHazardClick(d);
        },
      };
      spaceRef.current.addDataLayer(config);
    }

    return () => {
      if (spaceRef.current) {
        try {
          spaceRef.current.removeDataLayer('hazard-markers');
        } catch {
          // Layer might not exist
        }
      }
    };
  }, [viewerReady, showHazards, activeHazards, onHazardClick]);

  // Add/remove room status markers - small dots at floor level
  useEffect(() => {
    if (!viewerReady || !spaceRef.current) return;

    if (showRoomStatus) {
      const config: AnyDataLayerConfig = {
        id: 'room-markers',
        type: 'point',
        data: visibleRooms,
        diameter: 0.5, // Small marker size
        anchor: 'center',
        alpha: 0.85,
        // Use status color for critical/attention, type color for normal/vacant
        color: (d: Room) => {
          if (d.status === 'critical') return '#ef4444';
          if (d.status === 'attention') return '#f59e0b';
          return roomTypeColors[d.type] || '#6b7280';
        },
        tooltip: (d: Room) => {
          const statusConfig = {
            normal: { bg: '#f0fdf4', color: '#16a34a' },
            attention: { bg: '#fffbeb', color: '#d97706' },
            critical: { bg: '#fef2f2', color: '#dc2626' },
            vacant: { bg: '#f5f5f5', color: '#737373' },
          };
          const sc = statusConfig[d.status];
          return `
            <div style="${tooltipStyles.container}">
              <div style="${tooltipStyles.title}">${d.name}</div>
              <div style="${tooltipStyles.subtitle}">${roomTypeLabels[d.type]}</div>
              ${d.patientCount !== undefined ? `<div style="${tooltipStyles.row}">Patients: <strong>${d.patientCount}</strong></div>` : ''}
              ${d.description ? `<div style="${tooltipStyles.row}">${d.description}</div>` : ''}
              <div style="${tooltipStyles.badge(sc.bg, sc.color)}">
                ${d.status.charAt(0).toUpperCase() + d.status.slice(1)}
              </div>
            </div>
          `;
        },
        onClick: (d: Room) => {
          if (onRoomClick) onRoomClick(d);
        },
      };
      spaceRef.current.addDataLayer(config);
    }

    return () => {
      if (spaceRef.current) {
        try {
          spaceRef.current.removeDataLayer('room-markers');
        } catch {
          // Layer might not exist
        }
      }
    };
  }, [viewerReady, showRoomStatus, visibleRooms, onRoomClick]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded-lg">
        <div className="text-center p-8">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mb-3 mx-auto" />
            <p className="text-xs text-neutral-500">Loading floor plan...</p>
          </div>
        </div>
      )}

      <div
        id="hospital-space-viewer"
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
