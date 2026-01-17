export type HazardType = 'spill' | 'breakage' | 'fall' | 'obstruction';

export type HazardSeverity = 'low' | 'medium' | 'high' | 'critical';

export type HazardStatus = 'active' | 'responding' | 'resolved';

export interface Hazard {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  status: HazardStatus;
  description: string;
  location: string;
  position: {
    x: number;
    z: number;
    elevation: number;
    levelIndex: number;
  };
  reportedAt: string;
  reportedBy?: string;
}

export const hazardTypeLabels: Record<HazardType, string> = {
  spill: 'Liquid Spill',
  breakage: 'Bottle Breakage',
  fall: 'Fall Detected',
  obstruction: 'Path Obstruction',
};

export const hazardSeverityColors: Record<HazardSeverity, string> = {
  low: '#64748b',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const hazardStatusLabels: Record<HazardStatus, string> = {
  active: 'Active',
  responding: 'Staff Responding',
  resolved: 'Resolved',
};

// Warning triangle icon as data URL (for Smplrspace icon layer)
export const hazardIconUrl = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="48" height="48">
  <path d="M12 2L1 21h22L12 2zm0 3.5L19.5 19h-15L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
</svg>
`);

// Mock hazard data - spills and breakages
export const hazards: Hazard[] = [
  {
    id: 'hz-001',
    type: 'spill',
    severity: 'high',
    status: 'active',
    description: 'Water spill near medication cart',
    location: 'General Ward A',
    position: {
      x: 108.5,
      z: -52.5,
      elevation: 0.01,
      levelIndex: 0,
    },
    reportedAt: '5 min ago',
    reportedBy: 'Nurse Johnson',
  },
  {
    id: 'hz-002',
    type: 'breakage',
    severity: 'critical',
    status: 'responding',
    description: 'Medication bottle dropped and shattered',
    location: 'Pharmacy',
    position: {
      x: 125.5,
      z: -59.5,
      elevation: 0.01,
      levelIndex: 0,
    },
    reportedAt: '2 min ago',
    reportedBy: 'Pharmacist Lee',
  },
  {
    id: 'hz-003',
    type: 'spill',
    severity: 'medium',
    status: 'active',
    description: 'IV fluid leak',
    location: 'ICU Pod A',
    position: {
      x: 135.5,
      z: -55.0,
      elevation: 0.01,
      levelIndex: 0,
    },
    reportedAt: '8 min ago',
    reportedBy: 'Nurse Williams',
  },
  {
    id: 'hz-004',
    type: 'breakage',
    severity: 'low',
    status: 'resolved',
    description: 'Glass container broken in sink',
    location: 'Lab',
    position: {
      x: 118.5,
      z: -47.5,
      elevation: 0.01,
      levelIndex: 0,
    },
    reportedAt: '25 min ago',
    reportedBy: 'Lab Tech Martinez',
  },
  {
    id: 'hz-005',
    type: 'spill',
    severity: 'high',
    status: 'active',
    description: 'Cleaning solution spill',
    location: 'Cardiac Care 2',
    position: {
      x: 119.5,
      z: -41.0,
      elevation: 0.01,
      levelIndex: 0,
    },
    reportedAt: '3 min ago',
    reportedBy: 'Housekeeping',
  },
];

// Get only active hazards
export const getActiveHazards = () => 
  hazards.filter(h => h.status === 'active' || h.status === 'responding');

// Get hazard count by severity
export const getHazardCountBySeverity = () => {
  const active = getActiveHazards();
  return {
    critical: active.filter(h => h.severity === 'critical').length,
    high: active.filter(h => h.severity === 'high').length,
    medium: active.filter(h => h.severity === 'medium').length,
    low: active.filter(h => h.severity === 'low').length,
  };
};
