import { rooms } from './rooms';

export interface ActivityDataPoint {
  id: string;
  roomId: string;
  roomName: string;
  value: number; // Activity level 0-100
  position: {
    x: number;
    z: number;
    elevation: number;
    levelIndex: number;
  };
  timestamp: string;
}

// Generate activity data for heatmap visualization
// Higher values = more patient activity/movement
export const activityData: ActivityDataPoint[] = rooms.map((room) => {
  // Generate realistic activity values based on room type
  let baseActivity: number;
  
  switch (room.type) {
    case 'icu':
      // ICU has high activity due to constant monitoring
      baseActivity = 70 + Math.random() * 25;
      break;
    case 'ward':
      // Wards have moderate to high activity
      baseActivity = 50 + Math.random() * 30;
      break;
    case 'nurses_station':
      // Nurses station always busy
      baseActivity = 75 + Math.random() * 20;
      break;
    case 'pharmacy':
      // Pharmacy moderate activity
      baseActivity = 45 + Math.random() * 25;
      break;
    case 'lab':
      // Lab moderate to high activity
      baseActivity = 50 + Math.random() * 30;
      break;
    case 'reception':
      // Reception varies
      baseActivity = 35 + Math.random() * 35;
      break;
    case 'patient':
    default:
      // Patient rooms - activity based on status
      if (room.status === 'vacant') {
        baseActivity = 5 + Math.random() * 10;
      } else if (room.status === 'critical') {
        baseActivity = 85 + Math.random() * 15;
      } else if (room.status === 'attention') {
        baseActivity = 60 + Math.random() * 25;
      } else {
        baseActivity = 30 + Math.random() * 30;
      }
      break;
  }

  return {
    id: `activity-${room.id}`,
    roomId: room.id,
    roomName: room.name,
    value: Math.round(baseActivity),
    position: room.position,
    timestamp: new Date().toISOString(),
  };
});

// Time series data for historical view (last 24 hours, hourly)
export const generateTimeSeries = (roomId: string, hours: number = 24): { timestamp: string; value: number }[] => {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return [];

  const now = new Date();
  const data: { timestamp: string; value: number }[] = [];

  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Simulate daily patterns
    let multiplier = 1;
    if (hour >= 6 && hour <= 10) multiplier = 1.3; // Morning rush
    if (hour >= 12 && hour <= 14) multiplier = 1.1; // Lunch activity
    if (hour >= 18 && hour <= 20) multiplier = 1.2; // Evening visits
    if (hour >= 22 || hour <= 5) multiplier = 0.5; // Night time low

    let baseValue = 50;
    if (room.type === 'icu') baseValue = 75;
    if (room.type === 'nurses_station') baseValue = 70;
    if (room.status === 'vacant') baseValue = 10;

    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(baseValue * multiplier + (Math.random() - 0.5) * 20),
    });
  }

  return data;
};

// Get aggregate stats
export const getActivityStats = () => {
  const values = activityData.map(d => d.value);
  return {
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    max: Math.max(...values),
    min: Math.min(...values),
    highActivityCount: values.filter(v => v > 70).length,
    lowActivityCount: values.filter(v => v < 30).length,
  };
};
