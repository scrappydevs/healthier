-- Rename food table to meals to align with iOS app
ALTER TABLE food RENAME TO meals;

-- Add user_id column and populate it from patients table if possible, otherwise rely on new inserts
ALTER TABLE meals ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Rename and map existing columns to match SupabaseService.swift SupabaseMeal struct
ALTER TABLE meals RENAME COLUMN calories TO total_calories;
ALTER TABLE meals RENAME COLUMN protein_g TO total_protein;
ALTER TABLE meals RENAME COLUMN carbs_g TO total_carbs;
ALTER TABLE meals RENAME COLUMN fat_g TO total_fat;
ALTER TABLE meals RENAME COLUMN photo_url TO image_url;
ALTER TABLE meals RENAME COLUMN logged_at TO consumed_at;

-- Add new columns for enhanced analysis
ALTER TABLE meals ADD COLUMN health_rating DECIMAL(5,2); -- 0-100
ALTER TABLE meals ADD COLUMN gut_health_score DECIMAL(5,2); -- 0-10
ALTER TABLE meals ADD COLUMN protein_quality_score DECIMAL(5,2); -- 0-10
ALTER TABLE meals ADD COLUMN fiber_score DECIMAL(5,2); -- 0-10
ALTER TABLE meals ADD COLUMN sugar_score DECIMAL(5,2); -- 0-10
ALTER TABLE meals ADD COLUMN vitamins_summary TEXT;
ALTER TABLE meals ADD COLUMN food_groups TEXT[];
ALTER TABLE meals ADD COLUMN ai_analysis JSONB;

-- Update column types if necessary (calories in food was INTEGER, SupabaseMeal expects Double/DECIMAL)
ALTER TABLE meals ALTER COLUMN total_calories TYPE DECIMAL(10,2);

-- Ensure updated_at exists
-- (It already exists in food table)

-- Make user_id not null for future inserts, but we might have existing rows without it if we don't backfill.
-- Since this is dev, we can try to backfill or just leave it nullable for now if we can't easily backfill.
-- To backfill: UPDATE meals SET user_id = (SELECT user_id FROM patients WHERE patients.id = meals.patient_id);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meals' AND column_name = 'patient_id') THEN
        UPDATE meals SET user_id = (SELECT user_id FROM patients WHERE patients.id = meals.patient_id);
    END IF;
END $$;

-- If we want to strictly follow SupabaseService which expects user_id, we should eventually make it NOT NULL.
-- ALTER TABLE meals ALTER COLUMN user_id SET NOT NULL; 
