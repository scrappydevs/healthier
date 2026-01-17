-- Drop all existing tables and recreate with correct schema
-- This will delete all data - use with caution!

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
DROP FUNCTION IF EXISTS calculate_adherence_rate(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_patient_summary(UUID);
DROP FUNCTION IF EXISTS update_patient_age();
DROP FUNCTION IF EXISTS update_updated_at();

-- Now run the main migration file (20260117000001_initial_schema.sql) after this
