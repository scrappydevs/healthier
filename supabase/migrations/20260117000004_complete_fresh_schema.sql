-- Complete fresh schema - drops everything and recreates
-- WARNING: This will delete all existing data!

-- ============================================
-- DROP EXISTING OBJECTS
-- ============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS vitals CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS food CASCADE;
DROP TABLE IF EXISTS pill_logs CASCADE;
DROP TABLE IF EXISTS patient_pills CASCADE;
DROP TABLE IF EXISTS pills CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_adherence_rate(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_patient_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_patient_age() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('clinician', 'patient', 'caregiver', 'admin')),
    phone TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PATIENTS (Extended patient profile)
-- ============================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    blood_type TEXT,
    medical_conditions TEXT[],
    allergies TEXT[],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- PILLS (Medications catalog)
-- ============================================
CREATE TABLE pills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    dosage_form TEXT NOT NULL,
    strength TEXT NOT NULL,
    unit TEXT NOT NULL,
    color TEXT,
    shape TEXT,
    imprint TEXT,
    instructions TEXT,
    warnings TEXT,
    side_effects TEXT[],
    interactions TEXT[],
    image_url TEXT,
    ndc_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PATIENT_PILLS (Patient-specific pill schedules)
-- ============================================
CREATE TABLE patient_pills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    pill_id UUID NOT NULL REFERENCES pills(id) ON DELETE CASCADE,
    dosage_amount DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN (
        'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily',
        'every_other_day', 'weekly', 'as_needed', 'custom'
    )),
    times_of_day TEXT[] NOT NULL,
    days_of_week INTEGER[],
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    with_food BOOLEAN DEFAULT FALSE,
    special_instructions TEXT,
    prescribing_doctor TEXT,
    pharmacy TEXT,
    refill_date DATE,
    quantity_remaining INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PILL_LOGS (When pills were taken)
-- ============================================
CREATE TABLE pill_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_pill_id UUID NOT NULL REFERENCES patient_pills(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    taken_time TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped', 'pending', 'late')),
    notes TEXT,
    confirmed_by TEXT CHECK (confirmed_by IN ('voice', 'button', 'caregiver', 'auto')),
    side_effects_reported TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOOD (Food log entries)
-- ============================================
CREATE TABLE food (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    name TEXT,
    description TEXT,
    voice_transcription TEXT,
    photo_url TEXT,
    calories INTEGER,
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    fiber_g DECIMAL(6,2),
    sodium_mg DECIMAL(8,2),
    water_ml INTEGER,
    portion_size TEXT,
    tags TEXT[],
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXERCISES (Exercise log entries)
-- ============================================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    exercise_type TEXT NOT NULL,
    category TEXT CHECK (category IN ('cardio', 'strength', 'flexibility', 'balance', 'other')),
    duration_minutes INTEGER,
    distance_meters DECIMAL(10,2),
    steps INTEGER,
    calories_burned INTEGER,
    intensity TEXT CHECK (intensity IN ('light', 'moderate', 'vigorous')),
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    voice_notes TEXT,
    notes TEXT,
    weather TEXT,
    location TEXT,
    completed BOOLEAN DEFAULT TRUE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VITALS (Health measurements)
-- ============================================
CREATE TABLE vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'blood_pressure', 'heart_rate', 'blood_sugar', 'weight',
        'temperature', 'oxygen_saturation', 'respiratory_rate'
    )),
    value_primary DECIMAL(10,2) NOT NULL,
    value_secondary DECIMAL(10,2),
    unit TEXT NOT NULL,
    notes TEXT,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS
-- ============================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN (
        'missed_dose', 'low_adherence', 'refill_needed', 'pattern_detected',
        'vital_abnormal', 'missed_meal', 'inactivity', 'fall_detected'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REMINDERS (Scheduled reminders)
-- ============================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pill', 'appointment', 'exercise', 'meal', 'custom')),
    title TEXT NOT NULL,
    message TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    repeat_pattern TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_patients_clinician ON patients(clinician_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_user ON patients(user_id);
CREATE INDEX idx_pills_name ON pills(name);
CREATE INDEX idx_patient_pills_patient ON patient_pills(patient_id);
CREATE INDEX idx_patient_pills_active ON patient_pills(is_active);
CREATE INDEX idx_pill_logs_patient ON pill_logs(patient_id);
CREATE INDEX idx_pill_logs_status ON pill_logs(status);
CREATE INDEX idx_pill_logs_scheduled ON pill_logs(scheduled_time);
CREATE INDEX idx_food_patient ON food(patient_id);
CREATE INDEX idx_food_logged_at ON food(logged_at);
CREATE INDEX idx_food_meal_type ON food(meal_type);
CREATE INDEX idx_exercises_patient ON exercises(patient_id);
CREATE INDEX idx_exercises_logged_at ON exercises(logged_at);
CREATE INDEX idx_exercises_type ON exercises(exercise_type);
CREATE INDEX idx_vitals_patient ON vitals(patient_id);
CREATE INDEX idx_vitals_type ON vitals(type);
CREATE INDEX idx_vitals_measured_at ON vitals(measured_at);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_clinician ON alerts(clinician_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_reminders_patient ON reminders(patient_id);
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_time);

-- ============================================
-- ROW LEVEL SECURITY - DISABLED
-- ============================================
-- RLS is disabled for this application
-- All access control is handled at the application level

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate adherence rate for a patient
CREATE OR REPLACE FUNCTION calculate_adherence_rate(
    p_patient_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS DECIMAL AS $$
DECLARE
    total_doses INTEGER;
    taken_doses INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('taken', 'late'))
    INTO total_doses, taken_doses
    FROM pill_logs
    WHERE patient_id = p_patient_id
      AND scheduled_time >= NOW() - (p_days || ' days')::INTERVAL
      AND status != 'pending';
    
    IF total_doses = 0 THEN
        RETURN 100.0;
    END IF;
    
    RETURN ROUND((taken_doses::DECIMAL / total_doses::DECIMAL) * 100, 1);
END;
$$ LANGUAGE plpgsql;

-- Get patient dashboard summary
CREATE OR REPLACE FUNCTION get_patient_summary(p_patient_id UUID)
RETURNS TABLE (
    adherence_rate DECIMAL,
    pills_today INTEGER,
    pills_taken_today INTEGER,
    meals_logged_today INTEGER,
    exercises_today INTEGER,
    last_active TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        calculate_adherence_rate(p_patient_id, 7),
        (SELECT COUNT(*)::INTEGER FROM pill_logs 
         WHERE patient_id = p_patient_id 
         AND DATE(scheduled_time) = CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER FROM pill_logs 
         WHERE patient_id = p_patient_id 
         AND DATE(scheduled_time) = CURRENT_DATE 
         AND status IN ('taken', 'late')),
        (SELECT COUNT(*)::INTEGER FROM food 
         WHERE patient_id = p_patient_id 
         AND DATE(logged_at) = CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER FROM exercises 
         WHERE patient_id = p_patient_id 
         AND DATE(logged_at) = CURRENT_DATE),
        (SELECT GREATEST(
            (SELECT MAX(taken_time) FROM pill_logs WHERE patient_id = p_patient_id),
            (SELECT MAX(logged_at) FROM food WHERE patient_id = p_patient_id),
            (SELECT MAX(logged_at) FROM exercises WHERE patient_id = p_patient_id)
        ));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update age when date_of_birth changes
CREATE OR REPLACE FUNCTION update_patient_age()
RETURNS TRIGGER AS $$
DECLARE
    years_diff INTEGER;
    months_diff INTEGER;
    days_diff INTEGER;
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        years_diff := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM NEW.date_of_birth);
        months_diff := EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM NEW.date_of_birth);
        days_diff := EXTRACT(DAY FROM CURRENT_DATE) - EXTRACT(DAY FROM NEW.date_of_birth);
        
        IF months_diff < 0 OR (months_diff = 0 AND days_diff < 0) THEN
            NEW.age := years_diff - 1;
        ELSE
            NEW.age := years_diff;
        END IF;
    ELSE
        NEW.age := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_patient_age_trigger
    BEFORE INSERT OR UPDATE OF date_of_birth ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_age();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pills_updated_at BEFORE UPDATE ON pills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_patient_pills_updated_at BEFORE UPDATE ON patient_pills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
