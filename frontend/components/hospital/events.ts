import type { ActivityEvent, EventType, EventSeverity } from './ActivityFeed';
import { rooms } from './rooms';

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Generate mock events for demonstration
export function generateMockEvents(): ActivityEvent[] {
  const now = new Date();
  
  const mockEvents: ActivityEvent[] = [
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 2 * 60000), // 2 min ago
      type: 'alert_triggered',
      severity: 'critical',
      title: 'Heart rate elevated above threshold',
      description: 'HR: 125 bpm, threshold: 100 bpm',
      roomName: 'ICU Pod A',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 5 * 60000), // 5 min ago
      type: 'hazard_reported',
      severity: 'warning',
      title: 'Spill reported - cleaning in progress',
      description: 'Water spill near medication cart',
      roomName: 'General Ward A',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 8 * 60000), // 8 min ago
      type: 'medication_given',
      severity: 'info',
      title: 'Medication administered',
      description: 'Lisinopril 10mg given by Nurse Adams',
      roomName: 'Cardiac Care 1',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 12 * 60000), // 12 min ago
      type: 'vital_check',
      severity: 'info',
      title: 'Vitals recorded',
      description: 'BP: 128/82, HR: 72, SpO2: 98%',
      roomName: 'Respiratory 1',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 min ago
      type: 'status_change',
      severity: 'warning',
      title: 'Room status changed to Attention',
      description: 'Patient showing signs of discomfort',
      roomName: 'Cardiac Care 2',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 18 * 60000), // 18 min ago
      type: 'patient_moved',
      severity: 'info',
      title: 'Patient transferred',
      description: 'From General Ward B to ICU Pod B',
      roomName: 'ICU Pod B',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 22 * 60000), // 22 min ago
      type: 'vital_check',
      severity: 'info',
      title: 'Vitals recorded',
      description: 'BP: 135/88, HR: 78, SpO2: 97%',
      roomName: 'Neuro 1',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 25 * 60000), // 25 min ago
      type: 'system',
      severity: 'info',
      title: 'Shift change completed',
      description: 'Night shift nurses have signed in',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 30 * 60000), // 30 min ago
      type: 'medication_given',
      severity: 'info',
      title: 'Medication administered',
      description: 'Metformin 500mg given by Nurse Chen',
      roomName: 'Neuro 2',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 35 * 60000), // 35 min ago
      type: 'hazard_reported',
      severity: 'critical',
      title: 'Medication bottle broken',
      description: 'Glass shards - area blocked off',
      roomName: 'Pharmacy',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 40 * 60000), // 40 min ago
      type: 'alert_triggered',
      severity: 'warning',
      title: 'Oxygen saturation low',
      description: 'SpO2: 92%, threshold: 95%',
      roomName: 'ICU Pod B',
    },
    {
      id: generateId(),
      timestamp: new Date(now.getTime() - 45 * 60000), // 45 min ago
      type: 'vital_check',
      severity: 'info',
      title: 'Vitals recorded',
      description: 'BP: 118/75, HR: 68, SpO2: 99%',
      roomName: 'Ortho 1',
    },
  ];

  // Sort by timestamp descending (most recent first)
  return mockEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Create a new event
export function createEvent(
  type: EventType,
  severity: EventSeverity,
  title: string,
  description?: string,
  roomName?: string
): ActivityEvent {
  return {
    id: generateId(),
    timestamp: new Date(),
    type,
    severity,
    title,
    description,
    roomName,
  };
}

// Get random room for demo purposes
export function getRandomRoom() {
  const occupiedRooms = rooms.filter(r => r.status !== 'vacant');
  return occupiedRooms[Math.floor(Math.random() * occupiedRooms.length)];
}

// Generate a random vital check event
export function generateVitalCheckEvent(): ActivityEvent {
  const room = getRandomRoom();
  const hr = Math.floor(60 + Math.random() * 40); // 60-100 bpm
  const systolic = Math.floor(110 + Math.random() * 30); // 110-140
  const diastolic = Math.floor(70 + Math.random() * 20); // 70-90
  const spo2 = Math.floor(95 + Math.random() * 5); // 95-100%

  return createEvent(
    'vital_check',
    'info',
    'Vitals recorded',
    `BP: ${systolic}/${diastolic}, HR: ${hr}, SpO2: ${spo2}%`,
    room.name
  );
}

// Generate a random alert event
export function generateAlertEvent(): ActivityEvent {
  const room = getRandomRoom();
  const alertTypes = [
    { title: 'Heart rate elevated', desc: (v: number) => `HR: ${v} bpm, threshold: 100 bpm`, severity: 'critical' as EventSeverity },
    { title: 'Blood pressure high', desc: (v: number) => `BP: ${v}/95, threshold: 140/90`, severity: 'warning' as EventSeverity },
    { title: 'Oxygen saturation low', desc: (v: number) => `SpO2: ${v}%, threshold: 95%`, severity: 'warning' as EventSeverity },
    { title: 'Patient fall detected', desc: () => 'Motion sensor triggered', severity: 'critical' as EventSeverity },
  ];

  const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
  const value = alert.title.includes('Heart') ? Math.floor(105 + Math.random() * 25) :
               alert.title.includes('Blood') ? Math.floor(145 + Math.random() * 20) :
               alert.title.includes('Oxygen') ? Math.floor(88 + Math.random() * 6) : 0;

  return createEvent(
    'alert_triggered',
    alert.severity,
    alert.title,
    alert.desc(value),
    room.name
  );
}

// Generate a random medication event
export function generateMedicationEvent(): ActivityEvent {
  const room = getRandomRoom();
  const medications = [
    'Lisinopril 10mg',
    'Metformin 500mg',
    'Aspirin 81mg',
    'Atorvastatin 20mg',
    'Omeprazole 20mg',
    'Amlodipine 5mg',
  ];
  const nurses = ['Nurse Adams', 'Nurse Chen', 'Nurse Williams', 'Nurse Garcia'];

  const med = medications[Math.floor(Math.random() * medications.length)];
  const nurse = nurses[Math.floor(Math.random() * nurses.length)];

  return createEvent(
    'medication_given',
    'info',
    'Medication administered',
    `${med} given by ${nurse}`,
    room.name
  );
}
