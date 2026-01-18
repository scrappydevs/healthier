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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:248',message:'All rooms from walls',data:{count:allRoomsData?.length||0,rooms:(allRoomsData||[]).map((r:any)=>({id:r.id,coordinates:r.coordinates?.length}))},timestamp:Date.now(),sessionId:'debug-session',runId:'debug3',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

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
          nameLower.includes('pantry') ||
          nameLower.includes('wc') ||
          nameLower.includes('storage') ||
          nameLower.includes('nurse station') ||
          nameLower.includes('entrance')
        );
      });

      console.log(`🏥 Found ${candidateAnnotations.length} area annotations`);
      
      // Log all annotations with their full data for manual mapping
      console.log('📍 All annotations with coordinates:');
      candidateAnnotations.forEach((a: any, i: number) => {
        console.log(`  [${i}] "${a.name}" - r:${a.r?.toFixed(2)}, t:${a.t?.toFixed(2)}, x:${a.x?.toFixed(2)}, z:${a.z?.toFixed(2)}`);
      });

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

      console.log('🔷 Detected polygons from walls:');
      polygons.forEach((p, i) => {
        console.log(`  [${i}] Centroid: (${p.centroid.x.toFixed(2)}, ${p.centroid.z.toFixed(2)}), Area: ${p.area.toFixed(2)}m²`);
      });

      // Automatically pick the right annotation coordinate fields by maximizing "inside polygon" hits.
      const extractors = [
        { name: 'r/t', get: (a: any) => ({ x: a?.r, z: a?.t }) },
        { name: 't/r', get: (a: any) => ({ x: a?.t, z: a?.r }) },
        { name: 'r/-t (negated z)', get: (a: any) => ({ x: a?.r, z: -(a?.t || 0) }) },
        { name: '-t/r (negated x)', get: (a: any) => ({ x: -(a?.t || 0), z: a?.r }) },
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

      // MANUAL OVERRIDE MAPPING (comment out to use automatic matching)
      // Format: 'Annotation Name': polygon_index (from console log above)
      // Set to -1 to force an annotation to render as highlight patch (open area)
      const manualMapping: Record<string, number | null> = {
        // Patient rooms (auto-match working correctly)
        'Room 1': null,
        'Room 2': null,
        'Room 3': null,
        'Room 4': null,
        'Room 5': null,
        'Room 6': null,
        
        // Critical room - force highlight patch (no enclosing walls, open area)
        'Critical Room': -1,
        
        // Utility rooms
        'Storage': null,
        'Pantry': null,    // Let it auto-match to detected polygon
        'WC': null,        // auto (both WCs)
        
        // Common areas
        'Check In Space': -1,  // Force highlight patch
        'Waiting Space': null, // Let it auto-match to fill the actual room
        'Entrance': -1,        // Force highlight patch
      };

      type MatchGroup = 'enclosed' | 'open';

      const classifyAnnotation = (label: string): { id: string; name: string; room_type: string; matchGroup: MatchGroup } => {
        const name = label.trim();
        const lower = name.toLowerCase();
        const numMatch = name.match(/(\d+)/);

        if (lower.startsWith('room ') && numMatch) {
          return { id: `room-${numMatch[1]}`, name, room_type: 'patient', matchGroup: 'enclosed' };
        }
        if (lower.includes('critical room')) {
          if (numMatch) {
            return { id: `critical-room-${numMatch[1]}`, name, room_type: 'critical', matchGroup: 'enclosed' };
          }
          // Critical Room without a number
          return { id: 'critical-room', name, room_type: 'critical', matchGroup: 'enclosed' };
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
          // #region agent log
          if (label.toLowerCase().includes('critical') || label.toLowerCase().includes('waiting') || label.toLowerCase().includes('pantry')) {
            fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:476',message:'Annotation extracted',data:{label,id:meta.id,matchGroup:meta.matchGroup,coords:{x,z},rawCoords:{r:a.r,t:a.t}},timestamp:Date.now(),sessionId:'debug-session',runId:'debug2',hypothesisId:'A,E'})}).catch(()=>{});
          }
          // #endregion
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

      // Apply manual overrides first
      const assignedPolygons = new Set<number>();
      const syncedRooms: any[] = [];
      const forcedOpenAreas: any[] = []; // Annotations forced to be open areas

      // Process manual mappings for enclosed areas
      for (const a of enclosedAnnotations) {
        const manualPolyIdx = manualMapping[a.name];
        if (manualPolyIdx === -1) {
          // Force this enclosed annotation to be treated as an open area
          forcedOpenAreas.push(a);
          console.log(`✅ MANUAL: Forcing "${a.name}" to be open area (highlight patch)`);
        } else if (manualPolyIdx !== undefined && manualPolyIdx !== null) {
          const poly = polygons.find(p => p.idx === manualPolyIdx);
          if (poly && !assignedPolygons.has(poly.idx)) {
            assignedPolygons.add(poly.idx);
            syncedRooms.push({
              id: a.id,
              name: a.name,
              room_type: a.room_type,
              levelIndex: 0,
              position: { x: poly.centroid.x, z: poly.centroid.z },
              polygon: poly.polygon,
            });
            console.log(`✅ MANUAL: Assigned "${a.name}" (${a.id}) -> polygon ${poly.idx}`);
          }
        }
      }

      // Now do automatic matching for remaining enclosed annotations (exclude forced open areas)
      const remainingEnclosed = enclosedAnnotations.filter(a => 
        !syncedRooms.some(r => r.id === a.id) && !forcedOpenAreas.some(f => f.id === a.id)
      );

      // Global, order-independent matching (prevents "everything shifts by one").
      const pairs: Array<{ aIdx: number; pIdx: number; score: number; inside: boolean }> = [];
      for (let ai = 0; ai < remainingEnclosed.length; ai++) {
        const a = remainingEnclosed[ai];
        for (const p of polygons) {
          if (assignedPolygons.has(p.idx)) continue; // Skip manually assigned
          const inside = isPointInPolygon(a.x, a.z, p.polygon);
          const score = inside ? 0 : distance2d(a.x, a.z, p.centroid.x, p.centroid.z);
          pairs.push({ aIdx: ai, pIdx: p.idx, score, inside });
          // #region agent log
          if (a.name === 'Critical Room' || a.name === 'Waiting Space' || a.name === 'Pantry') {
            fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:549',message:'Polygon pairing calculated',data:{annotationName:a.name,annotationCoords:{x:a.x,z:a.z},polygonIdx:p.idx,polygonCentroid:p.centroid,inside,score,polygonAlreadyAssigned:assignedPolygons.has(p.idx)},timestamp:Date.now(),sessionId:'debug-session',runId:'debug2',hypothesisId:'B,C'})}).catch(()=>{});
          }
          // #endregion
        }
      }

      pairs.sort((a, b) => a.score - b.score);

      const assignedAnno = new Set<number>();
      const assignedPoly = new Set<number>(assignedPolygons); // Include manual assignments
      const assignment = new Map<number, number>(); // enclosed annotation index -> polygon idx

      for (const pair of pairs) {
        if (assignedAnno.has(pair.aIdx)) continue;
        if (assignedPoly.has(pair.pIdx)) continue;
        assignment.set(pair.aIdx, pair.pIdx);
        assignedAnno.add(pair.aIdx);
        assignedPoly.add(pair.pIdx);
        // #region agent log
        const annot = remainingEnclosed[pair.aIdx];
        if (annot && (annot.name === 'Critical Room' || annot.name === 'Waiting Space' || annot.name === 'Pantry')) {
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:573',message:'ASSIGNMENT MADE',data:{annotationName:annot.name,annotationIdx:pair.aIdx,polygonIdx:pair.pIdx,score:pair.score,inside:pair.inside},timestamp:Date.now(),sessionId:'debug-session',runId:'debug2',hypothesisId:'B,D'})}).catch(()=>{});
        }
        // #endregion
      }

      const makeHighlightPatch = (x: number, z: number, sizeMeters: number): Array<{ x: number; z: number; levelIndex: number }> => {
        const half = sizeMeters / 2;
        return [
          { x: x - half, z: z - half, levelIndex: 0 },
          { x: x + half, z: z - half, levelIndex: 0 },
          { x: x + half, z: z + half, levelIndex: 0 },
          { x: x - half, z: z + half, levelIndex: 0 },
        ];
      };

      // Build synced rooms for remaining enclosed annotations (automatic matching)
      for (let ai = 0; ai < remainingEnclosed.length; ai++) {
        const a = remainingEnclosed[ai];
        const pIdx = assignment.get(ai);
        if (typeof pIdx !== 'number') continue;
        const poly = polygons.find((p) => p.idx === pIdx);
        if (!poly) continue;
        const inside = isPointInPolygon(a.x, a.z, poly.polygon);
        // #region agent log
        if (a.name === 'Critical Room' || a.name === 'Waiting Space' || a.name === 'Pantry') {
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:603',message:'Building synced room',data:{annotationName:a.name,annotationId:a.id,annotationCoords:{x:a.x,z:a.z},assignedPolygonIdx:pIdx,polygonCentroid:poly.centroid,polygonArea:poly.area,polygonPointCount:poly.polygon.length,isInside:inside},timestamp:Date.now(),sessionId:'debug-session',runId:'debug2',hypothesisId:'B,C,D'})}).catch(()=>{});
        }
        // #endregion
        console.log(`✅ AUTO: Assigned ${a.name} (${a.id}) -> polygon ${pIdx} (${inside ? 'inside' : 'closest'})`);
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
      const allOpenAreas = [...openAnnotations, ...forcedOpenAreas];
      for (const a of allOpenAreas) {
        // Check if this open area has a manual override forcing it to be a highlight patch
        const manualPolyIdx = manualMapping[a.name];
        if (manualPolyIdx === -1) {
          // Forced to highlight patch - skip polygon matching
          // Use smaller, more compact patches
          let size = 2; // Default 2m patch
          if (a.id === 'check-in-space') size = 4;   // Check-in space (slightly bigger)
          if (a.id === 'waiting-space') size = 2;    // Waiting space
          if (a.id === 'pantry') size = 4;           // Pantry is slightly larger
          if (a.id === 'doorway') size = 4;          // Doorway is slightly larger
          if (a.id === 'critical-room') size = 4;    // Critical room (smaller to fit within walls)
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:632',message:'Forcing highlight patch',data:{annotationName:a.name,annotationId:a.id,coords:{x:a.x,z:a.z},patchSize:size},timestamp:Date.now(),sessionId:'debug-session',runId:'debug3',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          
          console.log(`✅ MANUAL: Forcing open area "${a.name}" (${a.id}) -> highlight patch (${size}m)`);
          
          // Adjust position for critical room to move it away from waiting room
          let posX = a.x;
          let posZ = a.z;
          if (a.id === 'critical-room') {
            posX = a.x + 0.8; // Move 2m to the right (away from waiting room)
          }
          
          syncedRooms.push({
            id: a.id,
            name: a.name,
            room_type: a.room_type,
            levelIndex: 0,
            position: { x: posX, z: posZ },
            polygon: makeHighlightPatch(posX, posZ, size),
          });
          continue;
        }

        const availablePolys = polygons.filter((p) => !assignedPoly.has(p.idx));
        const containing = availablePolys.filter((p) => isPointInPolygon(a.x, a.z, p.polygon));

        let chosen = containing[0];
        if (containing.length > 1) {
          // Prefer the largest polygon for open areas
          chosen = containing.reduce((best, cur) => (cur.area > best.area ? cur : best), containing[0]);
        }

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:652',message:'Open area polygon selection',data:{annotationName:a.name,availablePolyCount:availablePolys.length,containingCount:containing.length,chosenPolygonIdx:chosen?.idx,chosenCentroid:chosen?.centroid},timestamp:Date.now(),sessionId:'debug-session',runId:'debug3',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

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
      spaceRef.current.removeDataLayer('patient-room-polygons');
      spaceRef.current.removeDataLayer('critical-room-polygons');
      spaceRef.current.removeDataLayer('storage-room-polygons');
      spaceRef.current.removeDataLayer('restroom-polygons');
      spaceRef.current.removeDataLayer('pantry-polygons');
      spaceRef.current.removeDataLayer('waiting-polygons');
      spaceRef.current.removeDataLayer('reception-polygons');
      spaceRef.current.removeDataLayer('hallway-polygons');
    } catch (e) {
      // Layers might not exist
    }

    // Filter rooms with valid positions (must have non-zero x OR z, OR polygon data)
    const validRooms = rooms.filter(r => 
      (r.position.x !== 0 || r.position.z !== 0) || 
      (r.position.polygon && r.position.polygon.length > 0)
    );
    console.log(`   Valid rooms for visualization: ${validRooms.length}`);

    // Debug: log room types for color verification
    validRooms.forEach(r => {
      if (['pantry', 'restroom', 'reception', 'critical', 'waiting'].includes(r.type)) {
        console.log(`   [COLOR DEBUG] ${r.name}: type='${r.type}', id='${r.id}'`);
      }
    });

    // Add polygon layers for EACH room type (like Haven does)
    
    // 1. Patient rooms
    const patientPolygonData = validRooms
      .filter(r => r.type === 'patient' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
          levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Patient rooms with polygons: ${patientPolygonData.length}`);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:820',message:'Patient polygon data prepared',data:{count:patientPolygonData.length,sampleCoords:patientPolygonData[0]?.coordinates?.slice(0,2),sampleId:patientPolygonData[0]?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (patientPolygonData.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:825',message:'BEFORE addDataLayer patient-room-polygons',data:{layerId:'patient-room-polygons',dataCount:patientPolygonData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      spaceRef.current.addDataLayer({
        id: 'patient-room-polygons',
        type: 'polygon',
        data: patientPolygonData,
        alpha: 0.4,
        color: (data: any) => {
          const room = data.room as Room;
          const alertSeverity = roomAlerts[room.id];
          if (alertSeverity === 'critical') return '#ef4444';
          if (alertSeverity === 'high') return '#f97316';
          if (alertSeverity === 'medium') return '#eab308';
          if (alertSeverity === 'low') return '#10b981';
          if (alertSeverity === 'info') return '#3b82f6';
          return '#67e8f9'; // Cyan for patient rooms
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:850',message:'AFTER addDataLayer patient-room-polygons SUCCESS',data:{layerId:'patient-room-polygons'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    // 2. Critical rooms
    const criticalPolygonData = validRooms
      .filter(r => r.type === 'critical' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Critical rooms with polygons: ${criticalPolygonData.length}`);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:860',message:'POST-FIX: Critical room polygon data',data:{count:criticalPolygonData.length,sampleCoords:criticalPolygonData[0]?.coordinates,coordsLength:criticalPolygonData[0]?.coordinates?.length,roomName:criticalPolygonData[0]?.room?.name,hasLevelIndex:criticalPolygonData[0]?.coordinates?.[0]?.hasOwnProperty('levelIndex')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (criticalPolygonData.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:865',message:'BEFORE addDataLayer critical-room-polygons',data:{layerId:'critical-room-polygons',dataCount:criticalPolygonData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      spaceRef.current.addDataLayer({
        id: 'critical-room-polygons',
        type: 'polygon',
        data: criticalPolygonData,
        alpha: 0.4,
        color: (data: any) => {
          const room = data.room as Room;
          const alertSeverity = roomAlerts[room.id];
          if (alertSeverity === 'critical') return '#ef4444';
          if (alertSeverity === 'high') return '#f97316';
          if (alertSeverity === 'medium') return '#eab308';
          return '#fca5a5'; // Light red for critical rooms
        },
        onClick: (data: any) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:885',message:'Critical room onClick triggered',data:{roomId:data.room?.id,roomName:data.room?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:895',message:'AFTER addDataLayer critical-room-polygons SUCCESS',data:{layerId:'critical-room-polygons'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    // 3. Storage rooms
    const storagePolygonData = validRooms
      .filter(r => r.type === 'storage' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Storage rooms with polygons: ${storagePolygonData.length}`);

    if (storagePolygonData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'storage-room-polygons',
        type: 'polygon',
        data: storagePolygonData,
        alpha: 0.4,
        color: '#fde68a', // Light amber for storage
        onClick: (data: any) => {
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
    }

    // 4. Restrooms (WCs)
    const restroomPolygonData = validRooms
      .filter(r => r.type === 'restroom' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Restrooms with polygons: ${restroomPolygonData.length}`);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:920',message:'Restroom polygon data prepared',data:{count:restroomPolygonData.length,sampleCoords:restroomPolygonData[0]?.coordinates,sampleId:restroomPolygonData[0]?.id,coordsLength:restroomPolygonData[0]?.coordinates?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

    if (restroomPolygonData.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:925',message:'BEFORE addDataLayer restroom-polygons',data:{layerId:'restroom-polygons',dataCount:restroomPolygonData.length,firstItemCoords:restroomPolygonData[0]?.coordinates},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      spaceRef.current.addDataLayer({
        id: 'restroom-polygons',
        type: 'polygon',
        data: restroomPolygonData,
        alpha: 0.4,
        color: '#e0e7ff', // Light indigo for restrooms
        onClick: (data: any) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:935',message:'Restroom onClick triggered',data:{roomId:data.room?.id,roomName:data.room?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:945',message:'AFTER addDataLayer restroom-polygons SUCCESS',data:{layerId:'restroom-polygons'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    // 5. Pantry
    const pantryPolygonData = validRooms
      .filter(r => r.type === 'pantry' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Pantry with polygons: ${pantryPolygonData.length}`);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:950',message:'POST-FIX: Pantry polygon data',data:{count:pantryPolygonData.length,sampleCoords:pantryPolygonData[0]?.coordinates,coordsLength:pantryPolygonData[0]?.coordinates?.length,sampleRoom:pantryPolygonData[0]?.room?.name,hasLevelIndex:pantryPolygonData[0]?.coordinates?.[0]?.hasOwnProperty('levelIndex')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (pantryPolygonData.length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:955',message:'BEFORE addDataLayer pantry-polygons',data:{layerId:'pantry-polygons',dataCount:pantryPolygonData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      spaceRef.current.addDataLayer({
        id: 'pantry-polygons',
        type: 'polygon',
        data: pantryPolygonData,
        alpha: 0.4,
        color: '#86efac', // Light green for pantry
        onClick: (data: any) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:965',message:'Pantry onClick triggered',data:{roomId:data.room?.id,roomName:data.room?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/41e34827-b777-445f-a3ec-a6857dc10d83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpaceViewer.tsx:975',message:'AFTER addDataLayer pantry-polygons SUCCESS',data:{layerId:'pantry-polygons'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    // 6. Waiting Space
    const waitingPolygonData = validRooms
      .filter(r => r.type === 'waiting' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Waiting areas with polygons: ${waitingPolygonData.length}`);

    if (waitingPolygonData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'waiting-polygons',
        type: 'polygon',
        data: waitingPolygonData,
        alpha: 0.4,
        color: '#fcd34d', // Yellow for waiting areas
        onClick: (data: any) => {
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
    }

    // 7. Reception / Check-in Space
    const receptionPolygonData = validRooms
      .filter(r => r.type === 'reception' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Reception areas with polygons: ${receptionPolygonData.length}`);

    if (receptionPolygonData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'reception-polygons',
        type: 'polygon',
        data: receptionPolygonData,
        alpha: 0.4,
        color: '#a78bfa', // Purple for reception
        onClick: (data: any) => {
          const room = data.room as Room;
          if (onRoomClick) onRoomClick(room);
        },
        tooltip: (data: any) => data.room.name,
      });
    }

    // 8. Hallways / Entrance
    const hallwayPolygonData = validRooms
      .filter(r => r.type === 'hallway' && r.position.polygon && r.position.polygon.length > 0)
      .map(room => ({
        id: room.id + '-polygon',
        coordinates: room.position.polygon,
        levelIndex: room.position.levelIndex,
        room,
      }));
    console.log(`   Hallways with polygons: ${hallwayPolygonData.length}`);

    if (hallwayPolygonData.length > 0) {
      spaceRef.current.addDataLayer({
        id: 'hallway-polygons',
        type: 'polygon',
        data: hallwayPolygonData,
        alpha: 0.4,
        color: '#d1d5db', // Gray for hallways
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
    const handleCacheInvalidate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const keys = customEvent.detail?.keys || [];
      console.log('🔄 Cache invalidation received:', customEvent.detail);
      console.log('   Keys to refresh:', keys);
      
      // Refresh both rooms and alerts when AI makes changes
      // Room status changes, patient transfers, etc. need both to update
      if (keys.includes('rooms') || keys.includes('patients')) {
        console.log('♻️ Refreshing rooms...');
        await fetchRooms();
      }
      
      if (keys.includes('alerts') || keys.includes('hazards')) {
        console.log('♻️ Refreshing alerts...');
        await fetchAlerts();
      }
      
      // If no specific keys, refresh everything
      if (keys.length === 0) {
        await fetchRooms();
        await fetchAlerts();
      }
      
      console.log('✅ Refresh complete');
    };

    window.addEventListener('pillpal-invalidate-cache', handleCacheInvalidate);
    return () => {
      window.removeEventListener('pillpal-invalidate-cache', handleCacheInvalidate);
    };
  }, [fetchAlerts, fetchRooms]);

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
