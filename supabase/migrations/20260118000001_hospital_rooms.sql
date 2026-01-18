-- Hospital Rooms and Room Status Management
-- Creates tables to track room assignments, statuses, and hospital floor plan data

-- ============================================
-- HOSPITAL ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS hospital_rooms (
    id TEXT PRIMARY KEY,  -- e.g., 'room-1', 'critical-room'
    name TEXT NOT NULL,
    room_type TEXT NOT NULL CHECK (room_type IN (
        'patient', 'critical', 'waiting', 'reception', 
        'hallway', 'pantry', 'storage', 'restroom'
    )),
    status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN (
        'normal', 'critical', 'vacant', 'maintenance'
    )),
    floor_level INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOM ASSIGNMENTS (which patient is in which room)
-- ============================================
CREATE TABLE IF NOT EXISTS room_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES hospital_rooms(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    discharged_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, patient_id, assigned_at)
);

-- ============================================
-- ROOM STATUS HISTORY (track status changes)
-- ============================================
CREATE TABLE IF NOT EXISTS room_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES hospital_rooms(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by TEXT,  -- user or 'system'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HOSPITAL HAZARDS
-- ============================================
CREATE TABLE IF NOT EXISTS hospital_hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_type TEXT NOT NULL CHECK (hazard_type IN (
        'spill', 'fall', 'equipment_failure', 'medical_emergency', 
        'security', 'fire', 'other'
    )),
    location TEXT NOT NULL,
    room_id TEXT REFERENCES hospital_rooms(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'responding', 'resolved')),
    reported_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hospital_rooms_type ON hospital_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_hospital_rooms_status ON hospital_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room ON room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_patient ON room_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_active ON room_assignments(discharged_at) WHERE discharged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_room_status_history_room ON room_status_history(room_id);
CREATE INDEX IF NOT EXISTS idx_hospital_hazards_status ON hospital_hazards(status);
CREATE INDEX IF NOT EXISTS idx_hospital_hazards_severity ON hospital_hazards(severity);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_hospital_rooms_updated_at 
    BEFORE UPDATE ON hospital_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hospital_hazards_updated_at 
    BEFORE UPDATE ON hospital_hazards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA - Initial room setup matching Smplrspace floor plan
-- ============================================
INSERT INTO hospital_rooms (id, name, room_type, status, capacity) VALUES
    -- Patient rooms (Room 1-6)
    ('room-1', 'Room 1', 'patient', 'normal', 1),
    ('room-2', 'Room 2', 'patient', 'normal', 1),
    ('room-3', 'Room 3', 'patient', 'normal', 1),
    ('room-4', 'Room 4', 'patient', 'normal', 1),
    ('room-5', 'Room 5', 'patient', 'vacant', 1),
    ('room-6', 'Room 6', 'patient', 'normal', 1),
    
    -- Special areas
    ('critical-room', 'Critical Room', 'critical', 'critical', 1),
    ('waiting-space', 'Waiting Space', 'waiting', 'normal', 10),
    ('check-in-space', 'Check In Space', 'reception', 'normal', 0),
    ('entrance', 'Entrance', 'hallway', 'normal', 0),
    
    -- Utility areas
    ('pantry', 'Pantry', 'pantry', 'normal', 0),
    ('storage', 'Storage', 'storage', 'normal', 0),
    ('wc-1', 'WC', 'restroom', 'normal', 0),
    ('wc-2', 'WC', 'restroom', 'normal', 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    room_type = EXCLUDED.room_type,
    capacity = EXCLUDED.capacity;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current patient in a room (active assignment)
CREATE OR REPLACE FUNCTION get_room_patient(p_room_id TEXT)
RETURNS TABLE (
    patient_id UUID,
    patient_name TEXT,
    assigned_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.patient_id,
        u.full_name,
        ra.assigned_at
    FROM room_assignments ra
    JOIN patients p ON ra.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE ra.room_id = p_room_id
      AND ra.discharged_at IS NULL
    ORDER BY ra.assigned_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Check if a room is occupied
CREATE OR REPLACE FUNCTION is_room_occupied(p_room_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM room_assignments 
        WHERE room_id = p_room_id 
          AND discharged_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Get room occupancy summary
CREATE OR REPLACE FUNCTION get_room_occupancy_summary()
RETURNS TABLE (
    total_patient_rooms INTEGER,
    occupied_rooms INTEGER,
    vacant_rooms INTEGER,
    critical_rooms INTEGER,
    occupancy_rate DECIMAL
) AS $$
DECLARE
    v_total INTEGER;
    v_occupied INTEGER;
    v_critical INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total 
    FROM hospital_rooms 
    WHERE room_type = 'patient';
    
    SELECT COUNT(*) INTO v_occupied 
    FROM hospital_rooms hr
    WHERE hr.room_type = 'patient' 
      AND hr.status != 'vacant'
      AND EXISTS (
          SELECT 1 FROM room_assignments ra 
          WHERE ra.room_id = hr.id 
            AND ra.discharged_at IS NULL
      );
    
    SELECT COUNT(*) INTO v_critical 
    FROM hospital_rooms 
    WHERE status = 'critical';
    
    RETURN QUERY SELECT 
        v_total,
        v_occupied,
        v_total - v_occupied,
        v_critical,
        CASE WHEN v_total > 0 
             THEN ROUND((v_occupied::DECIMAL / v_total) * 100, 1)
             ELSE 0 
        END;
END;
$$ LANGUAGE plpgsql;
