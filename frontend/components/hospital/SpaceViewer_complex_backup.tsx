'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

// Declare smplr global type
declare global {
  interface Window {
    smplr: any;
  }
}

// Room interface matching backend response
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

// Alert interface from backend
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  room_id?: string;
  patient_id?: string;
  created_at: string;
}

// Smplrspace config from backend
interface SmplrConfig {
  organizationId: string;
  clientToken: string;
  spaceId: string;
}

export type ViewMode = 'map' | 'heatmap';

export interface SpaceViewerProps {
  viewMode?: ViewMode;
  showHeatmap?: boolean;
  onRoomClick?: (room: Room) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function SpaceViewer({
  viewMode = 'map',
  showHeatmap = false,
  onRoomClick,
}: SpaceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<any>(null);
  
  const [smplrLoaded, setSmplrLoaded] = useState(false);
  const [smplrConfig, setSmplrConfig] = useState<SmplrConfig | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<'2d' | '3d'>('3d');
  
  // Room and alert data from backend
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomAlerts, setRoomAlerts] = useState<Record<string, string>>({}); // room_id -> severity

  // Fetch Smplrspace config from backend
  useEffect(() => {
    const fetchSmplrConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/smplrspace/config`);
        const config = await res.json();
        console.log('🔑 Fetched Smplrspace config from backend');
        setSmplrConfig(config);
      } catch (error) {
        console.error('❌ Failed to fetch Smplrspace config:', error);
        setViewerError('Failed to load floor plan configuration');
      }
    };
    fetchSmplrConfig();
  }, []);

  // Fetch rooms from backend
  const fetchRooms = useCallback(async () => {
    try {
      console.log('🔄 Fetching rooms from backend...');
      
      // Try database rooms first
      let roomsFound = false;
      try {
        const res = await fetch(`${API_URL}/api/v1/rooms`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Loaded ${data.length} rooms from database`);
          
          const frontendRooms: Room[] = data.map((room: any) => {
            const metadata = room.metadata || {};
            const smplrData = metadata.smplrspace_data || {};
            
            return {
              id: room.room_id || room.id,
              name: room.room_name || room.name,
              type: room.room_type || 'patient',
              status: room.status || 'normal',
        position: {
          levelIndex: 0,
                x: smplrData.position?.x || 0,
                z: smplrData.position?.z || 0,
                polygon: metadata.polygon || [],
              },
            };
          });
          
          setRooms(frontendRooms);
          roomsFound = true;
        }
      } catch (e) {
        console.log('⚠️ Could not fetch rooms from database');
      }
      
      // Fallback to mock rooms if no database rooms
      if (!roomsFound) {
        try {
          const mockRes = await fetch(`${API_URL}/mock/rooms`);
          const mockData = await mockRes.json();
          const mockRooms = mockData.rooms || [];
          
          if (mockRooms.length > 0) {
            console.log(`✅ Loaded ${mockRooms.length} mock rooms`);
            
            const frontendRooms: Room[] = mockRooms.map((room: any) => ({
              id: room.id,
              name: room.name,
              type: room.type || 'patient',
              status: room.status || 'normal',
              position: {
                levelIndex: 0,
                x: 0,
                z: 0,
                polygon: [],
              },
            }));
            
            setRooms(frontendRooms);
          }
        } catch (e) {
          console.log('⚠️ Could not fetch mock rooms');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching rooms:', error);
    }
  }, []);

  // Fetch alerts from backend (both database and mock)
  const fetchAlerts = useCallback(async () => {
    try {
      const alertMap: Record<string, string> = {};
      const severityPriority: Record<string, number> = { 
        'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 
      };
      
      // Fetch from database alerts
      try {
        const dbRes = await fetch(`${API_URL}/api/v1/alerts?status=active`);
        const dbData = await dbRes.json();
        const dbAlerts: Alert[] = Array.isArray(dbData) ? dbData : (dbData.alerts || []);
        
        for (const alert of dbAlerts) {
          if (alert.room_id) {
            const currentPriority = severityPriority[alertMap[alert.room_id]] || 0;
            const newPriority = severityPriority[alert.severity] || 0;
            if (newPriority > currentPriority) {
              alertMap[alert.room_id] = alert.severity;
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Could not fetch database alerts');
      }
      
      // Fetch mock alerts (from AI tool actions)
      try {
        const mockRes = await fetch(`${API_URL}/mock/alerts`);
        const mockData = await mockRes.json();
        const mockAlerts: Alert[] = mockData.alerts || [];
        
        for (const alert of mockAlerts) {
          if (alert.room_id && alert.status === 'active') {
            const currentPriority = severityPriority[alertMap[alert.room_id]] || 0;
            const newPriority = severityPriority[alert.severity] || 0;
        if (newPriority > currentPriority) {
              alertMap[alert.room_id] = alert.severity;
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Could not fetch mock alerts');
      }
      
      setRoomAlerts(alertMap);
      console.log(`🚨 Mapped alerts to ${Object.keys(alertMap).length} rooms:`, alertMap);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  // Sync rooms from Smplrspace walls (like Haven)
  const syncRoomsFromSmplrspace = useCallback(async (spaceId: string) => {
    if (!window.smplr || !smplrConfig || !spaceRef.current) {
      console.log('⏸️ Cannot sync rooms - dependencies not ready');
      return;
    }

    try {
      console.log('🔄 Detecting rooms from walls using Smplrspace API...');
      
      const smplrClient = new window.smplr.QueryClient({
        organizationId: smplrConfig.organizationId,
        clientToken: smplrConfig.clientToken,
      });

      // Get rooms detected from walls
      const allRoomsData = await smplrClient.getRoomsOnLevel({
        spaceId: spaceId,
        levelIndex: 0,
        useCache: false,
      });

      console.log('🏠 Rooms detected from walls:', allRoomsData?.length || 0);

      if (!allRoomsData || allRoomsData.length === 0) {
        console.log('⚠️ No rooms detected from walls');
        return;
      }

      // Get space definition for annotations
      const definition = spaceRef.current.getDefinition();
      const level0 = definition?.levels?.[0];
      const annotationsArray = level0?.annotations || [];
      
      console.log('📋 Annotations found:', annotationsArray.length);

      // Filter all relevant area annotations (rooms, critical rooms, spaces, etc.)
      const candidateAnnotations = annotationsArray.filter((a: any) => {
        const name = (a?.name || a?.text || '').toString().trim();
        if (!name) return false;
        const nameLower = name.toLowerCase();
        return (
          nameLower.startsWith('room ') ||
          nameLower.includes('critical room') ||
          nameLower.includes('check in') ||
          nameLower.includes('checkin') ||
          nameLower.includes('waiting') ||
          nameLower.includes('doorway') ||
          nameLower.includes('pantry') ||
          nameLower.includes('wc') ||
          nameLower.includes('storage') ||
          nameLower.includes('nurse station') ||
          nameLower.includes('entrance')
        );
      });

      console.log(`🏥 Found ${candidateAnnotations.length} area annotations`);

      // Point-in-polygon test using ray casting algorithm
      const isPointInPolygon = (x: number, z: number, polygon: Array<{ x: number; z: number }>): boolean => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].x, zi = polygon[i].z;
          const xj = polygon[j].x, zj = polygon[j].z;
          if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
            inside = !inside;
          }
        }
        return inside;
      };

      const polygonArea = (polygon: Array<{ x: number; z: number }>): number => {
        let area = 0;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          area += (polygon[j].x * polygon[i].z) - (polygon[i].x * polygon[j].z);
        }
        return Math.abs(area) / 2;
      };

      const polygonCentroid = (polygon: Array<{ x: number; z: number }>): { x: number; z: number } => {
        const sum = polygon.reduce(
          (acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }),
          { x: 0, z: 0 }
        );
        return { x: sum.x / polygon.length, z: sum.z / polygon.length };
      };

      const distance2d = (ax: number, az: number, bx: number, bz: number): number => {
        return Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(az - bz, 2));
      };

      const polygons = (allRoomsData || [])
        .map((roomData: any, idx: number) => {
          const poly = roomData?.room;
          if (!Array.isArray(poly) || poly.length < 3) return null;
          const centroid = polygonCentroid(poly);
          const area = polygonArea(poly);
          return { idx, polygon: poly as Array<{ x: number; z: number }>, centroid, area };
        })
        .filter(Boolean) as Array<{
          idx: number;
          polygon: Array<{ x: number; z: number }>;
          centroid: { x: number; z: number };
          area: number;
        }>;

      if (polygons.length === 0) {
        console.warn('⚠️ Detected rooms had no valid polygons');
        return;
      }

      // Automatically pick the right annotation coordinate fields by maximizing "inside polygon" hits.
      const extractors = [
        { name: 'r/t', get: (a: any) => ({ x: a?.r, z: a?.t }) },
        { name: 't/r', get: (a: any) => ({ x: a?.t, z: a?.r }) },
        { name: 'x/z', get: (a: any) => ({ x: a?.x, z: a?.z }) },
        { name: 'x/y', get: (a: any) => ({ x: a?.x, z: a?.y }) },
        { name: 'position', get: (a: any) => ({ x: a?.position?.x, z: a?.position?.z }) },
        { name: 'position(x/y)', get: (a: any) => ({ x: a?.position?.x, z: a?.position?.y }) },
        { name: 'p', get: (a: any) => ({ x: a?.p?.x, z: a?.p?.z }) },
        { name: 'p(x/y)', get: (a: any) => ({ x: a?.p?.x, z: a?.p?.y }) },
      ];

      const scoreExtractor = (extractor: (a: any) => { x: any; z: any }) => {
        let valid = 0;
        let inside = 0;
        let minDistSum = 0;
        for (const a of candidateAnnotations) {
          const pt = extractor(a);
          const x = typeof pt.x === 'number' ? pt.x : NaN;
          const z = typeof pt.z === 'number' ? pt.z : NaN;
          if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
          valid += 1;
          const insideAny = polygons.some((p) => isPointInPolygon(x, z, p.polygon));
          if (insideAny) inside += 1;

          // Tie-breaker: prefer coordinate systems that minimize distance to detected polygons.
          let minDist = Infinity;
          for (const p of polygons) {
            const d = distance2d(x, z, p.centroid.x, p.centroid.z);
            if (d < minDist) minDist = d;
          }
          if (Number.isFinite(minDist)) minDistSum += minDist;
        }
        return { valid, inside, minDistSum: valid > 0 ? minDistSum : Infinity };
      };

      let bestExtractor = extractors[0];
      let bestScore = scoreExtractor(bestExtractor.get);
      for (const ex of extractors.slice(1)) {
        const s = scoreExtractor(ex.get);
        if (
          s.inside > bestScore.inside ||
          (s.inside === bestScore.inside && s.minDistSum < bestScore.minDistSum) ||
          (s.inside === bestScore.inside && s.minDistSum === bestScore.minDistSum && s.valid > bestScore.valid)
        ) {
          bestExtractor = ex;
          bestScore = s;
        }
      }

      console.log(
        `🧭 Using annotation coords from ${bestExtractor.name} (inside ${bestScore.inside}/${bestScore.valid}, minDistSum ${bestScore.minDistSum.toFixed(2)})`
      );

      type MatchGroup = 'enclosed' | 'open';

      const classifyAnnotation = (label: string): { id: string; name: string; room_type: string; matchGroup: MatchGroup } => {
        const name = label.trim();
        const lower = name.toLowerCase();
        const numMatch = name.match(/(\d+)/);

        if (lower.startsWith('room ') && numMatch) {
          return { id: `room-${numMatch[1]}`, name, room_type: 'patient', matchGroup: 'enclosed' };
        }
        if (lower.includes('critical room') && numMatch) {
          return { id: `critical-room-${numMatch[1]}`, name, room_type: 'critical', matchGroup: 'enclosed' };
        }
        if (lower.includes('nurse station')) {
          return { id: 'nurse-station', name, room_type: 'nurse_station', matchGroup: 'enclosed' };
        }
        if (lower.includes('wc')) {
          if (numMatch) return { id: `wc-${numMatch[1]}`, name, room_type: 'restroom', matchGroup: 'enclosed' };
          return { id: 'wc', name, room_type: 'restroom', matchGroup: 'enclosed' };
        }
        if (lower.includes('storage')) {
          return { id: 'storage', name, room_type: 'storage', matchGroup: 'enclosed' };
        }
        if (lower.includes('pantry')) {
          return { id: 'pantry', name, room_type: 'pantry', matchGroup: 'enclosed' };
        }
        if (lower.includes('check in') || lower.includes('checkin')) {
          return { id: 'check-in-space', name, room_type: 'reception', matchGroup: 'open' };
        }
        if (lower.includes('waiting')) {
          return { id: 'waiting-space', name, room_type: 'waiting', matchGroup: 'open' };
        }
        if (lower.includes('doorway')) {
          return { id: 'doorway', name, room_type: 'hallway', matchGroup: 'open' };
        }
        if (lower.includes('entrance')) {
          return { id: 'entrance', name, room_type: 'hallway', matchGroup: 'open' };
        }

        // Fallback: still visualize it, but treat as enclosed so it doesn't steal open-area behavior.
        const fallbackId = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return { id: fallbackId || `area-${Math.random().toString(36).slice(2, 8)}`, name, room_type: 'patient', matchGroup: 'enclosed' };
      };

      const annotations = candidateAnnotations
        .map((a: any) => {
          const label = (a?.name || a?.text || '').toString().trim();
          const meta = classifyAnnotation(label);
          const pt = bestExtractor.get(a);
          const x = typeof pt.x === 'number' ? pt.x : NaN;
          const z = typeof pt.z === 'number' ? pt.z : NaN;
          if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
          return { ...meta, x, z, raw: a };
        })
        .filter(Boolean) as Array<{
          id: string;
          name: string;
          room_type: string;
          matchGroup: MatchGroup;
          x: number;
          z: number;
          raw: any;
        }>;

      // Make WC IDs deterministic when there are multiple "WC" labels without numbers.
      const wcNoNumber = annotations.filter((a) => a.id === 'wc');
      wcNoNumber.sort((a, b) => (a.x - b.x) || (a.z - b.z));
      wcNoNumber.forEach((a, idx) => {
        a.id = `wc-${idx + 1}`;
      });

      const enclosedAnnotations = annotations.filter((a) => a.matchGroup === 'enclosed');
      const openAnnotations = annotations.filter((a) => a.matchGroup === 'open');

      // Global, order-independent matching (prevents "everything shifts by one").
      const pairs: Array<{ aIdx: number; pIdx: number; score: number; inside: boolean }> = [];
      for (let ai = 0; ai < enclosedAnnotations.length; ai++) {
        const a = enclosedAnnotations[ai];
        for (const p of polygons) {
          const inside = isPointInPolygon(a.x, a.z, p.polygon);
          const score = inside ? 0 : distance2d(a.x, a.z, p.centroid.x, p.centroid.z);
          pairs.push({ aIdx: ai, pIdx: p.idx, score, inside });
        }
      }

      pairs.sort((a, b) => a.score - b.score);

      const assignedAnno = new Set<number>();
      const assignedPoly = new Set<number>();
      const assignment = new Map<number, number>(); // enclosed annotation index -> polygon idx

      for (const pair of pairs) {
        if (assignedAnno.has(pair.aIdx)) continue;
        if (assignedPoly.has(pair.pIdx)) continue;
        assignment.set(pair.aIdx, pair.pIdx);
        assignedAnno.add(pair.aIdx);
        assignedPoly.add(pair.pIdx);
      }

      const makeHighlightPatch = (x: number, z: number, sizeMeters: number): Array<{ x: number; z: number }> => {
        const half = sizeMeters / 2;
        return [
          { x: x - half, z: z - half },
          { x: x + half, z: z - half },
          { x: x + half, z: z + half },
          { x: x - half, z: z + half },
        ];
      };

      const syncedRooms: Array<{
        id: string;
        name: string;
        room_type: string;
        levelIndex: number;
        position: { x: number; z: number };
        polygon: Array<{ x: number; z: number }>;
      }> = [];

      // Build synced rooms for enclosed annotations
      for (let ai = 0; ai < enclosedAnnotations.length; ai++) {
        const a = enclosedAnnotations[ai];
        const pIdx = assignment.get(ai);
        if (typeof pIdx !== 'number') continue;
        const poly = polygons.find((p) => p.idx === pIdx);
        if (!poly) continue;
        const inside = isPointInPolygon(a.x, a.z, poly.polygon);
        console.log(`✅ Assigned ${a.name} (${a.id}) -> polygon ${pIdx} (${inside ? 'inside' : 'closest'})`);
        syncedRooms.push({
          id: a.id,
          name: a.name,
          room_type: a.room_type,
          levelIndex: 0,
          position: { x: poly.centroid.x, z: poly.centroid.z },
          polygon: poly.polygon,
        });
      }

      // Match open areas to any remaining polygon that CONTAINS the label. If none, use a small highlight patch.
      for (const a of openAnnotations) {
        const availablePolys = polygons.filter((p) => !assignedPoly.has(p.idx));
        const containing = availablePolys.filter((p) => isPointInPolygon(a.x, a.z, p.polygon));

        let chosen = containing[0];
        if (containing.length > 1) {
          // Prefer the largest polygon for open areas
          chosen = containing.reduce((best, cur) => (cur.area > best.area ? cur : best), containing[0]);
        }

        if (chosen) {
          assignedPoly.add(chosen.idx);
          console.log(`✅ Assigned open area ${a.name} (${a.id}) -> polygon ${chosen.idx} (inside)`);
          syncedRooms.push({
      id: a.id,
            name: a.name,
            room_type: a.room_type,
            levelIndex: 0,
            position: { x: chosen.centroid.x, z: chosen.centroid.z },
            polygon: chosen.polygon,
          });
        } else {
          // Check-in space may not be fully enclosed; highlight a portion instead.
          const size = a.id === 'check-in-space' ? 6 : 3;
          console.log(`✅ Assigned open area ${a.name} (${a.id}) -> highlight patch (${size}m)`);
          syncedRooms.push({
            id: a.id,
            name: a.name,
            room_type: a.room_type,
            levelIndex: 0,
            position: { x: a.x, z: a.z },
            polygon: makeHighlightPatch(a.x, a.z, size),
          });
        }
      }

      if (syncedRooms.length > 0) {
        console.log(`✅ Prepared ${syncedRooms.length} rooms for visualization`);
        
        // Convert to frontend Room format and set state directly
        const frontendRooms: Room[] = syncedRooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          type: room.room_type || 'patient',
          status: 'normal',
      position: {
            levelIndex: room.levelIndex || 0,
            x: room.position.x,
            z: room.position.z,
            polygon: room.polygon || [],
          },
        }));
        
        setRooms(frontendRooms);
        console.log(`✅ Set ${frontendRooms.length} rooms in state with polygon data`);
        
        // Also try to sync to backend (optional, for persistence)
        try {
          const res = await fetch(`${API_URL}/api/v1/rooms/sync-from-smplrspace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rooms: syncedRooms, floor_id: 'floor-1' }),
          });
          const result = await res.json();
          console.log(`✅ Also synced to backend: ${result.synced_count || syncedRooms.length} rooms`);
        } catch (syncError) {
          console.warn('⚠️ Could not sync to backend (non-critical):', syncError);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing rooms from Smplrspace:', error);
    }
  }, [smplrConfig]);

  // Initialize Smplrspace viewer
  useEffect(() => {
    if (!containerRef.current || !smplrLoaded || !window.smplr || !smplrConfig) return;

    console.log('🎬 Initializing Smplrspace viewer...');

    const initViewer = async () => {
      try {
        const smplr = window.smplr;
        const spaceId = smplrConfig.spaceId;
        const clientToken = smplrConfig.clientToken;

        if (!spaceId || !clientToken) {
          console.error('❌ Missing Smplrspace credentials');
          setViewerError('Floor plan not configured');
          return;
        }

        console.log('🔑 Smplrspace Config:', {
          spaceId,
          clientToken: clientToken.substring(0, 10) + '...',
        });

        const space = new smplr.Space({
          spaceId,
          clientToken,
          containerId: 'smplr-container',
        });

        spaceRef.current = space;

        await space.startViewer({
          preview: false,
          mode: viewerMode,
          allowModeChange: true,
          onReady: async () => {
            console.log('✅ Smplrspace viewer ready');
            setIsViewerReady(true);
            setViewerError(null);

            // Sync rooms from walls (this sets rooms state directly)
            await syncRoomsFromSmplrspace(spaceId);
            
            // Fetch alerts
            await fetchAlerts();
          },
          onError: (error: string) => {
            console.error('❌ Viewer error:', error);
            setViewerError(error);
          },
          renderOptions: {
            backgroundColor: '#f8fafc',
            walls: { alpha: 0.95 },
          },
          hideNavigationButtons: true,
          hideLevelPicker: true,
        });
      } catch (error) {
        console.error('❌ Failed to initialize viewer:', error);
        setViewerError('Failed to load floor plan');
      }
    };

    initViewer();

    return () => {
      if (spaceRef.current) {
        try {
          spaceRef.current.remove();
          spaceRef.current = null;
        } catch (e) {
          console.error('Error removing space:', e);
        }
      }
    };
  }, [smplrLoaded, smplrConfig, viewerMode, syncRoomsFromSmplrspace, fetchRooms, fetchAlerts]);

  // Update room visualization layers when rooms or alerts change
  useEffect(() => {
    if (!isViewerReady || !spaceRef.current) {
      console.log('⏸️ Skipping layer update - viewer not ready:', { isViewerReady, hasSpace: !!spaceRef.current });
      return;
    }
    
    if (rooms.length === 0) {
      console.log('⏸️ No rooms to visualize yet');
      return;
    }

    console.log('🎨 Updating room visualization layers...');
    console.log(`   Total rooms: ${rooms.length}`);
    rooms.forEach(r => {
      console.log(`   - ${r.name}: pos=(${r.position.x?.toFixed(2)}, ${r.position.z?.toFixed(2)}), polygon=${r.position.polygon?.length || 0} points`);
    });

    // Remove old layers
    try {
      spaceRef.current.removeDataLayer('room-polygons');
      spaceRef.current.removeDataLayer('room-icons');
    } catch (e) {
      // Layers might not exist
    }

    // Filter rooms with valid positions (must have non-zero x OR z, OR polygon data)
    const validRooms = rooms.filter(r => 
      (r.position.x !== 0 || r.position.z !== 0) || 
      (r.position.polygon && r.position.polygon.length > 0)
    );
    console.log(`   Valid rooms for visualization: ${validRooms.length}`);

    // Add polygon layer for floor coloring
    const polygonData = validRooms
      .filter(r => r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Rooms with polygon data: ${polygonData.length}`);

    if (polygonData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'room-polygons',
        type: 'polygon',
        data: polygonData,
        alpha: 0.4,
        color: (data: any) => {
          const room = data.room as Room;
          const alertSeverity = roomAlerts[room.id];

          // Alert severity colors (highest priority)
          if (alertSeverity === 'critical') return '#ef4444'; // Red
          if (alertSeverity === 'high') return '#f97316';     // Orange
          if (alertSeverity === 'medium') return '#eab308';   // Yellow
          if (alertSeverity === 'low') return '#10b981';      // Green
          if (alertSeverity === 'info') return '#3b82f6';     // Blue

          // Room type colors
          if (room.type === 'critical') return '#fca5a5';     // Light red for critical rooms
          if (room.type === 'nurse_station') return '#60a5fa'; // Light blue
          if (room.type === 'reception') return '#a78bfa';    // Purple for check-in
          if (room.type === 'waiting') return '#fcd34d';      // Yellow for waiting
          if (room.type === 'hallway') return '#d1d5db';      // Gray for doorway/entrance
          if (room.type === 'pantry') return '#86efac';       // Light green for pantry
          if (room.type === 'restroom') return '#e0e7ff';     // Light indigo for WC
          if (room.type === 'storage') return '#fde68a';      // Light amber for storage
          
          // Default - light cyan for patient rooms
          return '#67e8f9';
        },
        onClick: (data: any) => {
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => {
          const room = data.room as Room;
          const alertSeverity = roomAlerts[room.id];
          return alertSeverity
            ? `${room.name} - ${alertSeverity.toUpperCase()} ALERT`
            : room.name;
        },
      });
    }

    // Add icon markers at room centers
    const iconData = validRooms.map(room => ({
        id: room.id,
        position: {
          levelIndex: room.position.levelIndex,
          x: room.position.x,
          z: room.position.z,
        elevation: 1.8,
        },
        room,
    }));
    console.log(`   Rooms for icon markers: ${iconData.length}`);

    if (iconData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'room-icons',
        type: 'icon',
        data: iconData,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20v-8a1 1 0 0 1 1-1h4V9a1 1 0 0 1 1-1h2V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
              <circle cx="13" cy="9" r="1.5"/>
            </svg>
          `),
          width: 32,
          height: 32,
        },
        color: (data: any) => {
          const room = data.room as Room;
          const alertSeverity = roomAlerts[room.id];

          // Alert severity colors
          if (alertSeverity === 'critical') return '#ef4444';
          if (alertSeverity === 'high') return '#f97316';
          if (alertSeverity === 'medium') return '#eab308';
          if (alertSeverity === 'low') return '#10b981';

          // Room type colors
          if (room.type === 'critical') return '#dc2626';     // Red for critical rooms
          if (room.type === 'nurse_station') return '#3b82f6';
          if (room.type === 'reception') return '#7c3aed';    // Purple
          if (room.type === 'waiting') return '#ca8a04';      // Yellow/gold
          if (room.type === 'hallway') return '#6b7280';      // Gray
          if (room.type === 'pantry') return '#16a34a';       // Green
          if (room.type === 'restroom') return '#4f46e5';     // Indigo
          if (room.type === 'storage') return '#d97706';      // Amber
          
          return '#06b6d4'; // Cyan for patient rooms
        },
        onClick: (data: any) => {
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
    }

    console.log('✅ Room visualization updated');
  }, [isViewerReady, rooms, roomAlerts, onRoomClick]);

  // Refresh alerts periodically
  useEffect(() => {
    if (!isViewerReady) return;

    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [isViewerReady, fetchAlerts]);

  // Listen for cache invalidation events from chat
  useEffect(() => {
    const handleCacheInvalidate = (event: CustomEvent) => {
      console.log('🔄 Cache invalidation received:', event.detail);
      // Refresh alerts when AI makes changes
      fetchAlerts();
    };

    window.addEventListener('pillpal-invalidate-cache', handleCacheInvalidate as EventListener);
    return () => {
      window.removeEventListener('pillpal-invalidate-cache', handleCacheInvalidate as EventListener);
    };
  }, [fetchAlerts]);

  // Handle 2D/3D mode toggle
  const handleModeToggle = useCallback((mode: '2d' | '3d') => {
    if (spaceRef.current && isViewerReady) {
      spaceRef.current.setMode(mode);
      setViewerMode(mode);
    }
  }, [isViewerReady]);

  if (viewerError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-50">
        <div className="text-center p-8">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 mb-3">{viewerError}</p>
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
      {/* Load Smplrspace library */}
      <Script
        src="https://app.smplrspace.com/lib/smplr.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ Smplr.js loaded');
          setSmplrLoaded(true);
        }}
        onError={(e) => {
          console.error('❌ Failed to load Smplr.js:', e);
          setViewerError('Failed to load 3D viewer library');
        }}
      />
      <link href="https://app.smplrspace.com/lib/smplr.css" rel="stylesheet" />

      {/* Loading state */}
      {!isViewerReady && !viewerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mb-3 mx-auto" />
            <p className="text-xs text-neutral-500">Loading floor plan...</p>
          </div>
        </div>
      )}

      {/* 3D Viewer container */}
      <div
        id="smplr-container"
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* 2D/3D Toggle */}
      {isViewerReady && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-1 z-20 flex gap-1">
          <button
            onClick={() => handleModeToggle('2d')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewerMode === '2d'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => handleModeToggle('3d')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewerMode === '3d'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            3D
          </button>
        </div>
      )}

      {/* Room count indicator */}
      {isViewerReady && rooms.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-20">
          <p className="text-xs font-medium text-neutral-700 uppercase tracking-wider">Rooms</p>
          <p className="text-2xl font-light text-neutral-900">{rooms.length}</p>
          {Object.keys(roomAlerts).length > 0 && (
            <p className="text-xs text-red-600 mt-1">
              {Object.keys(roomAlerts).length} with alerts
            </p>
          )}
        </div>
      )}

      {/* Alert indicator */}
      {Object.keys(roomAlerts).length > 0 && isViewerReady && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-20 border-l-4 border-red-500">
          <p className="text-xs font-medium text-neutral-700 uppercase tracking-wider">Active Alerts</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-2xl font-light text-red-600">{Object.keys(roomAlerts).length}</p>
            <div className="text-xs text-neutral-500">
              {Object.values(roomAlerts).filter(s => s === 'critical').length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{Object.values(roomAlerts).filter(s => s === 'critical').length} critical</span>
                </div>
              )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
