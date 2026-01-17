// Room type classifications for hospital
export type RoomType = 
  | 'patient' 
  | 'icu' 
  | 'operating'
  | 'emergency'
  | 'pharmacy'
  | 'lab'
  | 'nurses_station'
  | 'reception'
  | 'hallway'
  | 'storage'
  | 'ward'
  | 'common';

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
  icu: 'ICU',
  operating: 'Operating Room',
  emergency: 'Emergency',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  nurses_station: 'Nurses Station',
  reception: 'Reception',
  hallway: 'Hallway',
  storage: 'Storage',
  ward: 'Ward',
  common: 'Common Area',
};

// Use positions from the Smplrspace model (sensor positions)
export const rooms: Room[] = [
  // Patient Rooms
  {
    id: 'de9844aef33d',
    name: 'Cardiac Care 101',
    type: 'patient',
    status: 'normal',
    position: {
      x: 120.72363861531221,
      z: -55.37731272654325,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '10 min ago',
    description: 'Post-operative cardiac monitoring',
  },
  {
    id: 'cde60d0f9c4b',
    name: 'Cardiac Care 102',
    type: 'patient',
    status: 'attention',
    position: {
      x: 120.31616658822531,
      z: -40.32848595282147,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '5 min ago',
    description: 'Elevated heart rate monitoring',
  },
  {
    id: 'e22831cdda28',
    name: 'Respiratory 201',
    type: 'patient',
    status: 'normal',
    position: {
      x: 117.51274810528558,
      z: -38.38687380878737,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '15 min ago',
    description: 'COPD management',
  },
  {
    id: 'f7262ecc48b9',
    name: 'Respiratory 202',
    type: 'patient',
    status: 'vacant',
    position: {
      x: 117.82239335232062,
      z: -49.51764202937709,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 0,
    lastUpdated: '1 hour ago',
    description: 'Available for admission',
  },
  {
    id: 'c94f3f0243a7',
    name: 'Neuro 301',
    type: 'patient',
    status: 'normal',
    position: {
      x: 115.84157357866134,
      z: -48.53316088837151,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '25 min ago',
    description: 'Post-stroke recovery',
  },
  {
    id: 'f3524c41d309',
    name: 'Neuro 302',
    type: 'patient',
    status: 'attention',
    position: {
      x: 112.93403943261109,
      z: -46.77269913954395,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '7 min ago',
    description: 'Seizure monitoring required',
  },
  {
    id: 'c5a4f171c1f8',
    name: 'Ortho 401',
    type: 'patient',
    status: 'normal',
    position: {
      x: 107.55121161309727,
      z: -37.61779228809321,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '18 min ago',
    description: 'Hip replacement recovery',
  },
  {
    id: 'cc51c86dfc78',
    name: 'Ortho 402',
    type: 'patient',
    status: 'vacant',
    position: {
      x: 128.28534381725393,
      z: -42.1580788002604,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 0,
    lastUpdated: '2 hours ago',
    description: 'Available for admission',
  },

  // ICU Pods
  {
    id: 'fdee6f5c3609',
    name: 'ICU Pod Alpha',
    type: 'icu',
    status: 'critical',
    position: {
      x: 136.54854211915313,
      z: -56.12197980280458,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 2,
    lastUpdated: '2 min ago',
    description: 'Critical care - ventilator support',
  },
  {
    id: 'fa4ced683b3e',
    name: 'ICU Pod Beta',
    type: 'icu',
    status: 'attention',
    position: {
      x: 97.77430667927675,
      z: -57.3023438052912,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 1,
    lastUpdated: '8 min ago',
    description: 'Post-surgery intensive monitoring',
  },

  // Wards
  {
    id: 'fb1bd4c58976',
    name: 'General Ward A',
    type: 'ward',
    status: 'normal',
    position: {
      x: 107.511986825776,
      z: -53.488347539106115,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 4,
    lastUpdated: '3 min ago',
    description: 'General observation - 4 beds',
  },
  {
    id: 'c3b82bf22edc',
    name: 'General Ward B',
    type: 'ward',
    status: 'normal',
    position: {
      x: 116.18496766013054,
      z: -49.64956961177282,
      elevation: 0.01,
      levelIndex: 0,
    },
    patientCount: 3,
    lastUpdated: '12 min ago',
    description: 'General observation - 4 beds',
  },

  // Support Areas
  {
    id: 'cae274222f6c',
    name: 'Main Pharmacy',
    type: 'pharmacy',
    status: 'normal',
    position: {
      x: 126.53886269246092,
      z: -60.5842980863642,
      elevation: 0.01,
      levelIndex: 0,
    },
    lastUpdated: '20 min ago',
    description: 'Central medication dispensary',
  },
  {
    id: 'f34a076b36a3',
    name: 'Clinical Lab',
    type: 'lab',
    status: 'normal',
    position: {
      x: 117.57374279582795,
      z: -48.555304314518494,
      elevation: 0.01,
      levelIndex: 0,
    },
    lastUpdated: '30 min ago',
    description: 'Blood work and diagnostics',
  },
  {
    id: 'd7942311a750',
    name: 'Central Nurses Station',
    type: 'nurses_station',
    status: 'normal',
    position: {
      x: 120.64810233459582,
      z: -46.60908426577184,
      elevation: 0.01,
      levelIndex: 0,
    },
    lastUpdated: '1 min ago',
    description: 'Floor monitoring hub',
  },
  {
    id: 'e5fb7587a358',
    name: 'Main Reception',
    type: 'reception',
    status: 'normal',
    position: {
      x: 116.20911006309461,
      z: -38.400813282810724,
      elevation: 0.01,
      levelIndex: 0,
    },
    lastUpdated: '5 min ago',
    description: 'Patient check-in and visitor management',
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
  rooms.filter((r) => ['patient', 'icu', 'ward'].includes(r.type));

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
