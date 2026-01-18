-- ============================================
-- ADD CONTRAINDICATIONS TO PILLS TABLE
-- ============================================

-- Add contraindications field to store conditions/situations where medication should NOT be used
ALTER TABLE pills ADD COLUMN IF NOT EXISTS contraindications TEXT[];

-- Add index for searching contraindications
CREATE INDEX IF NOT EXISTS idx_pills_contraindications ON pills USING GIN (contraindications);

COMMENT ON COLUMN pills.contraindications IS 'Medical conditions, allergies, or situations where this medication is dangerous or should not be used';
