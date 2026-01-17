-- Fix schema issues - check and add missing columns
-- Run this if you get "column patient_id does not exist" errors

-- Check which tables are missing patient_id column
DO $$
DECLARE
    table_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['pill_logs', 'patient_pills', 'food', 'exercises', 'vitals', 'alerts', 'reminders'])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = table_name 
                AND column_name = 'patient_id'
            ) THEN
                missing_tables := array_append(missing_tables, table_name);
                RAISE NOTICE 'Table % is missing patient_id column', table_name;
            END IF;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Tables missing patient_id: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- If tables exist with wrong schema, drop and recreate them
-- Uncomment the following to drop problematic tables:

-- DROP TABLE IF EXISTS reminders CASCADE;
-- DROP TABLE IF EXISTS alerts CASCADE;
-- DROP TABLE IF EXISTS vitals CASCADE;
-- DROP TABLE IF EXISTS exercises CASCADE;
-- DROP TABLE IF EXISTS food CASCADE;
-- DROP TABLE IF EXISTS pill_logs CASCADE;
-- DROP TABLE IF EXISTS patient_pills CASCADE;

-- After dropping, re-run the main migration file
