-- Room Tasks - Actionable items for each room (medications, food, procedures, etc.)
-- This tracks pending tasks that need attention per room/patient

-- ============================================
-- ROOM TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS room_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT REFERENCES hospital_rooms(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'medication', 'food', 'vitals', 'procedure', 'alert', 'other'
    )),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN (
        'urgent', 'high', 'normal', 'low'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'cancelled'
    )),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_tasks_room ON room_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_room_tasks_patient ON room_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_room_tasks_status ON room_tasks(status);
CREATE INDEX IF NOT EXISTS idx_room_tasks_priority ON room_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_room_tasks_type ON room_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_room_tasks_pending ON room_tasks(room_id, status) WHERE status = 'pending';

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_room_tasks_updated_at 
    BEFORE UPDATE ON room_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA - Sample tasks for demonstration
-- ============================================
-- Note: These reference patients table, so we need to ensure patients exist first
-- For now, we'll add tasks after room assignments are made via the AI tools
