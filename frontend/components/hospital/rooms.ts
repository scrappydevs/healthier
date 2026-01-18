// Room type classifications for hospital floor plan
export type RoomType = 
  | 'patient' 
  | 'critical'
  | 'waiting'
  | 'reception'
  | 'hallway'
  | 'pantry'
  | 'restroom'
  | 'storage'
  | 'other';

export type RoomStatus = 'normal' | 'attention' | 'critical' | 'vacant';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  position: {
    x: number;
    z: number;
    elevation: number;
    levelIndex: number;
  };
  patientCount?: number;
  lastUpdated?: string;
  description?: string;
}

export const roomStatusColors: Record<RoomStatus, string> = {
  normal: '#22c55e',
  attention: '#f59e0b',
  critical: '#ef4444',
  vacant: '#94a3b8',
};

export const roomTypeLabels: Record<RoomType, string> = {
  patient: 'Patient Room',
  critical: 'Critical Room',
  waiting: 'Waiting Area',
  reception: 'Reception / Check-in',
  hallway: 'Hallway / Entrance',
  pantry: 'Pantry',
  restroom: 'Restroom',
  storage: 'Storage',
  other: 'Other',
};

// Rooms matching the actual Smplrspace floor plan
export const rooms: Room[] = [
  // Patient Rooms (Room 1-6)
  {
    id: 'room-1',
    name: 'Room 1',
    type: 'patient',
    status: 'normal',
    position: { x: 21.66, z: -7.05, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '10 min ago',
    description: 'Post-cardiac surgery - John Smith',
  },
  {
    id: 'room-2',
    name: 'Room 2',
    type: 'patient',
    status: 'normal',
    position: { x: 21.90, z: -10.26, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '5 min ago',
    description: 'Arrhythmia monitoring - Mary Johnson',
  },
  {
    id: 'room-3',
    name: 'Room 3',
    type: 'patient',
    status: 'attention',
    position: { x: 21.54, z: -14.01, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '3 min ago',
    description: 'COPD exacerbation - Robert Davis',
  },
  {
    id: 'room-4',
    name: 'Room 4',
    type: 'patient',
    status: 'normal',
    position: { x: 18.97, z: -14.39, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '15 min ago',
    description: 'Post-stroke recovery - Linda Wilson',
  },
  {
    id: 'room-5',
    name: 'Room 5',
    type: 'patient',
    status: 'vacant',
    position: { x: 18.53, z: -10.26, elevation: 0, levelIndex: 0 },
    patientCount: 0,
    lastUpdated: '1 hour ago',
    description: 'Available for admission',
  },
  {
    id: 'room-6',
    name: 'Room 6',
    type: 'patient',
    status: 'normal',
    position: { x: 19.01, z: -6.67, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '20 min ago',
    description: 'Hip replacement recovery - Patricia Miller',
  },

  // Critical Room
  {
    id: 'critical-room',
    name: 'Critical Room',
    type: 'critical',
    status: 'critical',
    position: { x: 18.46, z: -16.99, elevation: 0, levelIndex: 0 },
    patientCount: 1,
    lastUpdated: '2 min ago',
    description: 'Multi-organ failure - Michael Garcia',
  },

  // Common Areas
  {
    id: 'waiting-space',
    name: 'Waiting Space',
    type: 'waiting',
    status: 'normal',
    position: { x: 17.31, z: -17.70, elevation: 0, levelIndex: 0 },
    description: 'Patient waiting area',
  },
  {
    id: 'check-in-space',
    name: 'Check In Space',
    type: 'reception',
    status: 'normal',
    position: { x: 27.52, z: -10.71, elevation: 0, levelIndex: 0 },
    description: 'Patient check-in and registration',
  },
  {
    id: 'entrance',
    name: 'Entrance',
    type: 'hallway',
    status: 'normal',
    position: { x: 27.66, z: -6.88, elevation: 0, levelIndex: 0 },
    description: 'Main entrance',
  },

  // Utility Areas
  {
    id: 'pantry',
    name: 'Pantry',
    type: 'pantry',
    status: 'normal',
    position: { x: 16.17, z: -7.99, elevation: 0, levelIndex: 0 },
    description: 'Staff pantry',
  },
  {
    id: 'storage',
    name: 'Storage',
    type: 'storage',
    status: 'normal',
    position: { x: 22.31, z: -4.00, elevation: 0, levelIndex: 0 },
    description: 'Medical supplies storage',
  },
  {
    id: 'wc-1',
    name: 'WC',
    type: 'restroom',
    status: 'normal',
    position: { x: 18.33, z: -2.73, elevation: 0, levelIndex: 0 },
    description: 'Restroom',
  },
  {
    id: 'wc-2',
    name: 'WC',
    type: 'restroom',
    status: 'normal',
    position: { x: 19.97, z: -3.53, elevation: 0, levelIndex: 0 },
    description: 'Restroom',
  },
];

// Helper functions
export const getRoomById = (id: string): Room | undefined =>
  rooms.find((r) => r.id === id);

export const getRoomsByType = (type: RoomType): Room[] =>
  rooms.filter((r) => r.type === type);

export const getRoomsByStatus = (status: RoomStatus): Room[] =>
  rooms.filter((r) => r.status === status);

export const getPatientRooms = (): Room[] =>
  rooms.filter((r) => r.type === 'patient' || r.type === 'critical');

export const getOccupiedRooms = (): Room[] =>
  rooms.filter((r) => r.status !== 'vacant' && r.patientCount && r.patientCount > 0);

export const getVacantRooms = (): Room[] =>
  rooms.filter((r) => r.status === 'vacant' || (r.patientCount !== undefined && r.patientCount === 0));

export const getCriticalRooms = (): Room[] =>
  rooms.filter((r) => r.status === 'critical');

export const getRoomsNeedingAttention = (): Room[] =>
  rooms.filter((r) => r.status === 'attention' || r.status === 'critical');

// Statistics helpers
export const getRoomStats = () => {
  const patientRooms = getPatientRooms();
  const occupied = patientRooms.filter((r) => r.status !== 'vacant').length;
  const critical = patientRooms.filter((r) => r.status === 'critical').length;
  const attention = patientRooms.filter((r) => r.status === 'attention').length;
  const vacant = patientRooms.filter((r) => r.status === 'vacant').length;

  return {
    total: patientRooms.length,
    occupied,
    critical,
    attention,
    vacant,
    occupancyRate: Math.round((occupied / patientRooms.length) * 100),
  };
};
