-- Seed demo data for hospital room assignments
-- Creates demo patients and assigns them to rooms for visualization testing

-- ============================================
-- DEMO USERS (patients for hospital floor plan)
-- ============================================
INSERT INTO users (id, email, full_name, role, phone) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'john.smith@demo.com', 'John Smith', 'patient', '555-0101'),
    ('a2222222-2222-2222-2222-222222222222', 'mary.johnson@demo.com', 'Mary Johnson', 'patient', '555-0102'),
    ('a3333333-3333-3333-3333-333333333333', 'michael.garcia@demo.com', 'Michael Garcia', 'patient', '555-0103'),
    ('a4444444-4444-4444-4444-444444444444', 'sarah.williams@demo.com', 'Sarah Williams', 'patient', '555-0104'),
    ('a5555555-5555-5555-5555-555555555555', 'robert.brown@demo.com', 'Robert Brown', 'patient', '555-0105')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

-- ============================================
-- DEMO PATIENTS
-- ============================================
INSERT INTO patients (id, user_id, age, gender, medical_conditions, status) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 72, 'male', 
     ARRAY['Hypertension', 'Type 2 Diabetes'], 'stable'),
    ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 68, 'female', 
     ARRAY['Arthritis', 'Osteoporosis'], 'improving'),
    ('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 81, 'male', 
     ARRAY['Heart Failure', 'COPD'], 'critical'),
    ('b4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 75, 'female', 
     ARRAY['Alzheimers', 'Hypertension'], 'stable'),
    ('b5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 78, 'male', 
     ARRAY['Pneumonia'], 'declining')
ON CONFLICT (id) DO UPDATE SET
    age = EXCLUDED.age,
    medical_conditions = EXCLUDED.medical_conditions,
    status = EXCLUDED.status;

-- ============================================
-- ROOM ASSIGNMENTS (assign patients to rooms)
-- ============================================
-- Clear existing active assignments first (to avoid duplicates on re-run)
UPDATE room_assignments 
SET discharged_at = NOW() 
WHERE discharged_at IS NULL 
  AND patient_id IN (
    'b1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'b4444444-4444-4444-4444-444444444444',
    'b5555555-5555-5555-5555-555555555555'
  );

-- Assign patients to rooms
-- Room 1: John Smith (stable)
INSERT INTO room_assignments (room_id, patient_id, notes)
VALUES ('room-1', 'b1111111-1111-1111-1111-111111111111', 'Demo patient - stable condition');

-- Room 2: Mary Johnson (improving)
INSERT INTO room_assignments (room_id, patient_id, notes)
VALUES ('room-2', 'b2222222-2222-2222-2222-222222222222', 'Demo patient - improving condition');

-- Room 3: Sarah Williams (stable)
INSERT INTO room_assignments (room_id, patient_id, notes)
VALUES ('room-3', 'b4444444-4444-4444-4444-444444444444', 'Demo patient - stable condition');

-- Room 4: Robert Brown (declining - needs attention)
INSERT INTO room_assignments (room_id, patient_id, notes)
VALUES ('room-4', 'b5555555-5555-5555-5555-555555555555', 'Demo patient - declining, needs monitoring');

-- Critical Room: Michael Garcia (critical condition)
INSERT INTO room_assignments (room_id, patient_id, notes)
VALUES ('critical-room', 'b3333333-3333-3333-3333-333333333333', 'Demo patient - critical care');

-- Room 5 and Room 6 remain vacant for demo purposes

-- ============================================
-- UPDATE ROOM STATUSES based on patient conditions
-- ============================================
-- Room 4 has declining patient - frontend will show yellow based on patient.status
UPDATE hospital_rooms SET status = 'normal' WHERE id = 'room-4';

-- Critical room has critical patient
UPDATE hospital_rooms SET status = 'critical' WHERE id = 'critical-room';

-- Room 5 is explicitly vacant
UPDATE hospital_rooms SET status = 'vacant' WHERE id = 'room-5';

-- Room 6 is also vacant
UPDATE hospital_rooms SET status = 'vacant' WHERE id = 'room-6';

-- Rooms 1, 2, 3 are normal (occupied, stable patients)
UPDATE hospital_rooms SET status = 'normal' WHERE id IN ('room-1', 'room-2', 'room-3');

-- ============================================
-- ADD SAMPLE ALERT for critical patient
-- ============================================
INSERT INTO alerts (patient_id, title, message, severity, type, acknowledged)
VALUES (
    'b3333333-3333-3333-3333-333333333333',
    'Critical Vital Signs',
    'Heart rate elevated, blood pressure dropping. Immediate attention required.',
    'critical',
    'vital_abnormal',
    false
) ON CONFLICT DO NOTHING;

-- ============================================
-- ADD SAMPLE ROOM TASKS
-- ============================================
INSERT INTO room_tasks (room_id, patient_id, task_type, title, description, priority, status) VALUES
    ('room-4', 'b5555555-5555-5555-5555-555555555555', 'medication', 'Administer antibiotics', 
     'IV antibiotics due at 14:00', 'high', 'pending'),
    ('room-4', 'b5555555-5555-5555-5555-555555555555', 'vitals', 'Vitals check', 
     'Monitor temperature and oxygen levels every 2 hours', 'normal', 'pending'),
    ('critical-room', 'b3333333-3333-3333-3333-333333333333', 'medication', 'Emergency medication', 
     'Administer cardiac medication per protocol', 'urgent', 'pending'),
    ('room-1', 'b1111111-1111-1111-1111-111111111111', 'food', 'Dietary instructions', 
     'Low sodium diet, increase vegetable intake', 'normal', 'pending')
ON CONFLICT DO NOTHING;
