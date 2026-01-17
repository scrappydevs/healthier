-- ============================================
-- SEED MEDICATIONS
-- Common medications with realistic data
-- ============================================

-- Clear existing data if any
TRUNCATE TABLE pills CASCADE;

-- Insert common medications
INSERT INTO pills (id, name, generic_name, brand_name, dosage_form, strength, unit, color, shape, imprint, instructions, warnings, side_effects, interactions, image_url) VALUES

-- Blood Pressure Medications
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Lisinopril 10mg',
    'Lisinopril',
    'Prinivil, Zestril',
    'tablet',
    '10',
    'mg',
    'pink',
    'round',
    'LUPIN 10',
    'Take once daily, preferably at the same time each day. May be taken with or without food.',
    'Do not use if pregnant. May cause dizziness. Avoid potassium supplements unless directed.',
    ARRAY['Dizziness', 'Dry cough', 'Headache', 'Fatigue'],
    ARRAY['NSAIDs', 'Potassium supplements', 'Lithium'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

(
    '550e8400-e29b-41d4-a716-446655440002',
    'Amlodipine 5mg',
    'Amlodipine',
    'Norvasc',
    'tablet',
    '5',
    'mg',
    'white',
    'round',
    'PFIZER 5',
    'Take once daily. May be taken with or without food.',
    'May cause swelling in ankles or feet. Report any irregular heartbeat.',
    ARRAY['Swelling of ankles/feet', 'Flushing', 'Dizziness', 'Palpitations'],
    ARRAY['Grapefruit juice', 'Simvastatin'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Cholesterol Medications
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Atorvastatin 20mg',
    'Atorvastatin',
    'Lipitor',
    'tablet',
    '20',
    'mg',
    'white',
    'elliptical',
    'PD 156',
    'Take once daily in the evening. May be taken with or without food.',
    'Avoid grapefruit juice. Report any unexplained muscle pain or weakness.',
    ARRAY['Muscle pain', 'Headache', 'Nausea', 'Joint pain'],
    ARRAY['Grapefruit juice', 'Cyclosporine', 'Gemfibrozil'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Diabetes Medications
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Metformin 500mg',
    'Metformin',
    'Glucophage',
    'tablet',
    '500',
    'mg',
    'white',
    'round',
    'TEVA 93 48',
    'Take with meals. Start with low dose and increase gradually to reduce side effects.',
    'May cause lactic acidosis. Stop before surgery or imaging with contrast dye.',
    ARRAY['Nausea', 'Diarrhea', 'Gas', 'Stomach upset'],
    ARRAY['Alcohol', 'Contrast dyes', 'Cimetidine'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Blood Thinners
(
    '550e8400-e29b-41d4-a716-446655440005',
    'Warfarin 5mg',
    'Warfarin',
    'Coumadin',
    'tablet',
    '5',
    'mg',
    'peach',
    'round',
    'TARO 5',
    'Take at the same time each day. Regular blood tests required.',
    'Avoid foods high in vitamin K. Risk of bleeding. Report any unusual bruising.',
    ARRAY['Easy bruising', 'Bleeding', 'Hair loss', 'Skin rash'],
    ARRAY['Aspirin', 'NSAIDs', 'Antibiotics', 'Green leafy vegetables'],
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400'
),

-- Thyroid Medications
(
    '550e8400-e29b-41d4-a716-446655440006',
    'Levothyroxine 50mcg',
    'Levothyroxine',
    'Synthroid',
    'tablet',
    '50',
    'mcg',
    'white',
    'round',
    'MYLAN 50',
    'Take on empty stomach 30-60 minutes before breakfast. Do not switch brands without consulting doctor.',
    'May take several weeks to feel effects. Do not stop taking without consulting doctor.',
    ARRAY['Temporary hair loss', 'Headache', 'Nervousness', 'Sweating'],
    ARRAY['Calcium', 'Iron supplements', 'Antacids', 'Soy products'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Antidepressants
(
    '550e8400-e29b-41d4-a716-446655440007',
    'Sertraline 50mg',
    'Sertraline',
    'Zoloft',
    'tablet',
    '50',
    'mg',
    'light blue',
    'capsule-shaped',
    'PFIZER ZLT 50',
    'Take once daily, with or without food. May take 4-6 weeks for full effect.',
    'Do not stop suddenly. May cause dizziness or drowsiness. Avoid alcohol.',
    ARRAY['Nausea', 'Dizziness', 'Insomnia', 'Dry mouth', 'Sexual side effects'],
    ARRAY['MAO inhibitors', 'Blood thinners', 'NSAIDs'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Pain Medications
(
    '550e8400-e29b-41d4-a716-446655440008',
    'Acetaminophen 500mg',
    'Acetaminophen',
    'Tylenol',
    'tablet',
    '500',
    'mg',
    'white',
    'capsule-shaped',
    'TYLENOL 500',
    'Take every 4-6 hours as needed. Do not exceed 4000mg in 24 hours.',
    'Risk of liver damage with high doses or when combined with alcohol.',
    ARRAY['Rare: liver damage', 'Allergic reaction'],
    ARRAY['Alcohol', 'Other acetaminophen products', 'Warfarin'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

(
    '550e8400-e29b-41d4-a716-446655440009',
    'Ibuprofen 200mg',
    'Ibuprofen',
    'Advil, Motrin',
    'tablet',
    '200',
    'mg',
    'brown',
    'round',
    'I-2',
    'Take with food or milk to reduce stomach upset. Drink full glass of water.',
    'May increase risk of heart attack or stroke. May cause stomach bleeding.',
    ARRAY['Stomach upset', 'Heartburn', 'Dizziness', 'Rash'],
    ARRAY['Blood thinners', 'Aspirin', 'ACE inhibitors', 'Diuretics'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Antibiotics
(
    '550e8400-e29b-41d4-a716-446655440010',
    'Amoxicillin 500mg',
    'Amoxicillin',
    'Amoxil',
    'capsule',
    '500',
    'mg',
    'pink/white',
    'capsule',
    'AMOX 500',
    'Take every 8 hours. Complete full course even if feeling better.',
    'May cause diarrhea. Stop if rash develops. May reduce effectiveness of birth control.',
    ARRAY['Diarrhea', 'Nausea', 'Rash', 'Yeast infection'],
    ARRAY['Birth control pills', 'Methotrexate', 'Allopurinol'],
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400'
),

-- Proton Pump Inhibitors
(
    '550e8400-e29b-41d4-a716-446655440011',
    'Omeprazole 20mg',
    'Omeprazole',
    'Prilosec',
    'capsule',
    '20',
    'mg',
    'purple/pink',
    'capsule',
    'OMEP 20',
    'Take 30 minutes before first meal of day. Swallow whole, do not crush or chew.',
    'Long-term use may increase risk of bone fractures. May mask symptoms of serious conditions.',
    ARRAY['Headache', 'Stomach pain', 'Nausea', 'Diarrhea'],
    ARRAY['Clopidogrel', 'Warfarin', 'Iron supplements', 'Calcium supplements'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Allergy Medications
(
    '550e8400-e29b-41d4-a716-446655440012',
    'Cetirizine 10mg',
    'Cetirizine',
    'Zyrtec',
    'tablet',
    '10',
    'mg',
    'white',
    'round',
    'UCB 10',
    'Take once daily. May be taken with or without food.',
    'May cause drowsiness. Avoid alcohol. Use caution when driving.',
    ARRAY['Drowsiness', 'Dry mouth', 'Fatigue', 'Headache'],
    ARRAY['Alcohol', 'Sedatives', 'Other antihistamines'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
);

-- Create an index on generic_name for faster searches
CREATE INDEX IF NOT EXISTS idx_pills_generic_name ON pills(generic_name);
CREATE INDEX IF NOT EXISTS idx_pills_brand_name ON pills(brand_name);
