-- ============================================
-- COMPREHENSIVE MEDICATION DATABASE
-- Real medications with accurate warnings, contraindications, and dosages
-- Image URLs are placeholders - in production, use FDA-approved images from licensed sources
-- ============================================

-- Clear existing data
TRUNCATE TABLE pills CASCADE;

-- ============================================
-- CARDIOVASCULAR MEDICATIONS
-- ============================================

INSERT INTO pills (id, name, generic_name, brand_name, dosage_form, strength, unit, color, shape, imprint, instructions, warnings, side_effects, interactions, contraindications, image_url) VALUES

-- Aspirin (CRITICAL contraindications)
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Aspirin 81mg',
    'Aspirin',
    'Bayer Low Dose',
    'tablet',
    '81',
    'mg',
    'white',
    'round',
    'BAYER',
    'Take once daily with food. Do not crush or chew enteric-coated tablets.',
    'CRITICAL: Increases bleeding risk. Stop 7 days before surgery. Do not give to children under 16 with fever (Reye''s syndrome risk).',
    ARRAY['Stomach upset', 'Heartburn', 'Easy bruising', 'Increased bleeding risk', 'Ringing in ears at high doses'],
    ARRAY['Blood thinners (warfarin, heparin)', 'Other NSAIDs', 'Alcohol', 'Corticosteroids'],
    ARRAY['Active bleeding or bleeding disorders', 'Recent stroke or brain bleeding', 'Severe liver disease', 'Children under 16 with viral illness', 'Pregnancy (third trimester)', 'Peptic ulcer disease', 'Hemophilia'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- Lisinopril
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Lisinopril 10mg',
    'Lisinopril',
    'Prinivil, Zestril',
    'tablet',
    '10',
    'mg',
    'pink',
    'round',
    'LUPIN 10',
    'Take once daily at the same time. May be taken with or without food. Stand up slowly to avoid dizziness.',
    'Can cause severe allergic reactions (angioedema). May harm fetus - discontinue if pregnancy occurs. Can cause kidney problems.',
    ARRAY['Dizziness', 'Dry cough (10-20% of patients)', 'Headache', 'Fatigue', 'Low blood pressure'],
    ARRAY['Potassium supplements', 'Potassium-sparing diuretics', 'NSAIDs reduce effectiveness', 'Lithium'],
    ARRAY['Pregnancy', 'History of angioedema', 'Bilateral renal artery stenosis', 'Currently taking sacubitril/valsartan (wait 36 hours)'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Metoprolol
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Metoprolol 50mg',
    'Metoprolol',
    'Lopressor, Toprol-XL',
    'tablet',
    '50',
    'mg',
    'white',
    'round',
    'M 50',
    'Take with meals at the same time daily. Do NOT stop suddenly - must taper gradually.',
    'CRITICAL: Never stop abruptly - may cause rebound hypertension or heart attack. Can mask signs of low blood sugar in diabetics.',
    ARRAY['Fatigue', 'Dizziness', 'Slow heart rate', 'Cold hands/feet', 'Depression', 'Sexual dysfunction'],
    ARRAY['Verapamil or diltiazem (dangerous heart rhythm)', 'Diabetes medications', 'Other blood pressure drugs'],
    ARRAY['Severe bradycardia (heart rate <45)', 'Heart block (2nd or 3rd degree)', 'Cardiogenic shock', 'Severe asthma/COPD', 'Decompensated heart failure'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Warfarin
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Warfarin 5mg',
    'Warfarin',
    'Coumadin',
    'tablet',
    '5',
    'mg',
    'peach',
    'round',
    'TARO 5',
    'Take at the same time each day (evening recommended). Requires regular INR blood tests. Maintain consistent vitamin K intake.',
    'CRITICAL: Narrow therapeutic window. Even minor dose changes can cause bleeding or clotting. Avoid foods high in vitamin K. Report any unusual bleeding immediately.',
    ARRAY['Easy bruising', 'Prolonged bleeding from cuts', 'Blood in urine or stool', 'Hair loss', 'Skin rash'],
    ARRAY['Aspirin and NSAIDs (major bleeding risk)', 'Antibiotics (many alter levels)', 'St John''s Wort', 'Vitamin K foods', 'Alcohol', 'Acetaminophen (high doses)'],
    ARRAY['Pregnancy', 'Active major bleeding', 'Severe liver disease', 'Recent brain/spinal surgery', 'Inability to monitor INR regularly', 'Hemophilia', 'Uncontrolled hypertension'],
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400'
),

-- ============================================
-- DIABETES MEDICATIONS
-- ============================================

-- Metformin
(
    '550e8400-e29b-41d4-a716-446655440005',
    'Metformin 500mg',
    'Metformin',
    'Glucophage',
    'tablet',
    '500',
    'mg',
    'white',
    'round',
    'TEVA 93 48',
    'Take with meals. Start with low dose and increase gradually over 2-3 weeks to reduce GI side effects. Swallow whole, do not crush.',
    'CRITICAL: Stop before surgery and contrast dye imaging (risk of lactic acidosis). Hold if severe illness, dehydration, or kidney problems develop.',
    ARRAY['Nausea', 'Diarrhea (30% of patients)', 'Gas', 'Stomach upset', 'Metallic taste', 'Vitamin B12 deficiency with long-term use'],
    ARRAY['Contrast dyes (stop 48hrs before)', 'Alcohol (increases lactic acidosis risk)', 'Cimetidine'],
    ARRAY['Severe kidney disease (eGFR <30)', 'Metabolic acidosis', 'Active liver disease', 'Heart failure requiring medication', 'Alcoholism', 'Upcoming surgery or imaging with contrast'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Insulin Glargine (injectable)
(
    '550e8400-e29b-41d4-a716-446655440006',
    'Insulin Glargine 100 units/mL',
    'Insulin Glargine',
    'Lantus, Basaglar',
    'injection',
    '100',
    'units/mL',
    'clear',
    'liquid',
    'N/A',
    'Inject subcutaneously once daily at the same time. Rotate injection sites. Do NOT mix with other insulins. Store in refrigerator.',
    'CRITICAL: Can cause life-threatening hypoglycemia. Always carry fast-acting sugar. Monitor blood glucose regularly. Dose adjustments needed with exercise, illness, or diet changes.',
    ARRAY['Hypoglycemia (sweating, shakiness, confusion)', 'Weight gain', 'Injection site reactions', 'Lipodystrophy'],
    ARRAY['Oral diabetes medications (increased hypoglycemia risk)', 'Beta-blockers (mask hypoglycemia symptoms)', 'Alcohol', 'Certain antibiotics'],
    ARRAY['Hypoglycemia', 'Hypokalemia (low potassium)', 'Known allergy to insulin'],
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400'
),

-- ============================================
-- ANTIBIOTICS
-- ============================================

-- Amoxicillin
(
    '550e8400-e29b-41d4-a716-446655440007',
    'Amoxicillin 500mg',
    'Amoxicillin',
    'Amoxil',
    'capsule',
    '500',
    'mg',
    'pink/white',
    'capsule',
    'AMOX 500',
    'Take every 8 hours. Complete the full course even if feeling better. May be taken with or without food.',
    'Stop immediately if rash develops (may indicate allergic reaction). May reduce effectiveness of birth control pills.',
    ARRAY['Diarrhea (most common)', 'Nausea', 'Rash', 'Yeast infections', 'Abdominal pain'],
    ARRAY['Birth control pills (reduced effectiveness)', 'Methotrexate', 'Allopurinol (increases rash risk)', 'Probencid'],
    ARRAY['Penicillin allergy', 'Severe kidney disease without dose adjustment', 'Infectious mononucleosis (high rash risk)', 'History of antibiotic-associated colitis'],
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400'
),

-- Azithromycin (Z-Pack)
(
    '550e8400-e29b-41d4-a716-446655440008',
    'Azithromycin 250mg',
    'Azithromycin',
    'Zithromax, Z-Pak',
    'tablet',
    '250',
    'mg',
    'pink',
    'oval',
    'Z 250',
    'Take as directed (usually 2 tablets day 1, then 1 tablet daily for 4 days). May be taken with or without food.',
    'Can cause dangerous heart rhythm changes (QT prolongation). Use caution in patients with heart disease.',
    ARRAY['Diarrhea', 'Nausea', 'Abdominal pain', 'Headache', 'Heart rhythm changes (rare but serious)'],
    ARRAY['Warfarin (increased bleeding)', 'Antacids (take 1hr before or 2hrs after)', 'Other QT-prolonging drugs'],
    ARRAY['Known QT prolongation', 'History of arrhythmia', 'Severe liver disease', 'Azithromycin allergy'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- Ciprofloxacin
(
    '550e8400-e29b-41d4-a716-446655440009',
    'Ciprofloxacin 500mg',
    'Ciprofloxacin',
    'Cipro',
    'tablet',
    '500',
    'mg',
    'white',
    'oval',
    'CIPRO 500',
    'Take twice daily, 12 hours apart. Drink plenty of fluids. Avoid dairy products and antacids within 2-6 hours.',
    'FDA BLACK BOX WARNING: Risk of tendon rupture (especially Achilles), peripheral neuropathy, and CNS effects. May worsen myasthenia gravis. Reserved for serious infections when other options fail.',
    ARRAY['Tendon pain/rupture (stop immediately)', 'Nausea', 'Diarrhea', 'Nerve damage (may be permanent)', 'CNS effects (confusion, hallucinations)', 'Aortic aneurysm risk'],
    ARRAY['Theophylline (seizure risk)', 'Warfarin', 'NSAIDs (seizure risk)', 'Dairy products reduce absorption', 'Antacids', 'Iron supplements'],
    ARRAY['History of tendon problems', 'Myasthenia gravis', 'Children and adolescents (damages cartilage)', 'Pregnancy', 'Age over 60 (higher tendon risk)', 'Corticosteroid use', 'Kidney/heart/lung transplant', 'QT prolongation'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- ============================================
-- MENTAL HEALTH MEDICATIONS
-- ============================================

-- Sertraline (Zoloft)
(
    '550e8400-e29b-41d4-a716-446655440010',
    'Sertraline 50mg',
    'Sertraline',
    'Zoloft',
    'tablet',
    '50',
    'mg',
    'light blue',
    'capsule-shaped',
    'PFIZER ZLT 50',
    'Take once daily with or without food. May take 4-6 weeks for full effect. Take in morning if causes insomnia, evening if causes drowsiness.',
    'CRITICAL: Do not stop suddenly (discontinuation syndrome). Never combine with MAOIs (wait 14 days). May increase suicidal thoughts in young adults, especially first few weeks.',
    ARRAY['Nausea (20-25% initially)', 'Insomnia or drowsiness', 'Dizziness', 'Dry mouth', 'Sexual dysfunction (40-60%)', 'Weight changes', 'Increased sweating'],
    ARRAY['MAOIs (life-threatening serotonin syndrome)', 'Blood thinners', 'NSAIDs (bleeding risk)', 'Other antidepressants', 'St John''s Wort', 'Tramadol'],
    ARRAY['MAOI use within 14 days', 'Pimozide use', 'Uncontrolled narrow-angle glaucoma', 'Seizure disorder without treatment'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Alprazolam (Xanax)
(
    '550e8400-e29b-41d4-a716-446655440011',
    'Alprazolam 0.5mg',
    'Alprazolam',
    'Xanax',
    'tablet',
    '0.5',
    'mg',
    'white',
    'oval',
    'XANAX 0.5',
    'Take as directed. May cause drowsiness - do not drive or operate machinery. Can be habit-forming.',
    'CONTROLLED SUBSTANCE Schedule IV. FDA BLACK BOX WARNING: Risk of addiction, abuse, and misuse. Risk of respiratory depression and death when combined with opioids. Severe withdrawal can be life-threatening.',
    ARRAY['Drowsiness', 'Dizziness', 'Memory problems', 'Coordination problems', 'Dependence', 'Depression', 'Confusion in elderly'],
    ARRAY['Opioids (DEADLY combination)', 'Alcohol (DEADLY)', 'Other CNS depressants', 'Azole antifungals (increase levels)', 'Ketoconazole'],
    ARRAY['Acute narrow-angle glaucoma', 'Untreated open-angle glaucoma', 'Concurrent opioid use', 'Severe respiratory disease', 'Sleep apnea', 'Pregnancy', 'Myasthenia gravis', 'Active substance abuse'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- PAIN MEDICATIONS
-- ============================================

-- Ibuprofen
(
    '550e8400-e29b-41d4-a716-446655440012',
    'Ibuprofen 200mg',
    'Ibuprofen',
    'Advil, Motrin',
    'tablet',
    '200',
    'mg',
    'brown',
    'round',
    'I-2',
    'Take with food or milk. Drink a full glass of water. Do not lie down for 10 minutes after taking.',
    'FDA BLACK BOX WARNING: Increases risk of heart attack, stroke, and serious GI bleeding. Risk increases with dose and duration. Avoid during pregnancy third trimester.',
    ARRAY['Stomach upset', 'Heartburn', 'Nausea', 'GI bleeding', 'Dizziness', 'Rash', 'Fluid retention', 'High blood pressure'],
    ARRAY['Blood thinners', 'Aspirin (reduces cardioprotective effect)', 'ACE inhibitors', 'Diuretics', 'Lithium', 'Methotrexate'],
    ARRAY['Active GI bleeding or ulcers', 'History of NSAID-induced asthma', 'Pregnancy (third trimester)', 'Immediately after heart surgery (CABG)', 'Severe kidney disease', 'Aspirin allergy', 'Severe heart failure'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Tramadol
(
    '550e8400-e29b-41d4-a716-446655440013',
    'Tramadol 50mg',
    'Tramadol',
    'Ultram',
    'tablet',
    '50',
    'mg',
    'white',
    'oval',
    'T 50',
    'Take every 4-6 hours as needed for pain. Do not exceed prescribed dose. May be taken with or without food.',
    'CONTROLLED SUBSTANCE Schedule IV. FDA WARNING: Risk of addiction, abuse, and misuse. Risk of seizures increases at high doses. Risk of serotonin syndrome when combined with antidepressants.',
    ARRAY['Nausea (most common)', 'Dizziness', 'Constipation', 'Headache', 'Drowsiness', 'Seizures (dose-dependent)', 'Respiratory depression'],
    ARRAY['Antidepressants (serotonin syndrome)', 'MAOIs', 'CNS depressants', 'Alcohol', 'Warfarin'],
    ARRAY['Acute intoxication with alcohol/opioids/psychotropics', 'Uncontrolled seizure disorder', 'MAOI use within 14 days', 'Severe respiratory depression', 'Acute or severe asthma', 'GI obstruction', 'Children under 12', 'Adolescents under 18 post-surgery'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- CHOLESTEROL/LIPID MEDICATIONS
-- ============================================

-- Atorvastatin
(
    '550e8400-e29b-41d4-a716-446655440014',
    'Atorvastatin 20mg',
    'Atorvastatin',
    'Lipitor',
    'tablet',
    '20',
    'mg',
    'white',
    'elliptical',
    'PD 156',
    'Take once daily in the evening (cholesterol production is highest at night). May be taken with or without food.',
    'Rare but serious: muscle breakdown (rhabdomyolysis) can cause kidney failure. Report unexplained muscle pain, weakness, or dark urine immediately. Avoid grapefruit juice.',
    ARRAY['Muscle pain (5-10%)', 'Headache', 'Nausea', 'Joint pain', 'Elevated liver enzymes', 'Memory problems (rare)', 'Increased blood sugar'],
    ARRAY['Grapefruit juice (increases drug levels)', 'Cyclosporine', 'Gemfibrozil (dangerous muscle risk)', 'HIV protease inhibitors', 'Antifungals'],
    ARRAY['Active liver disease', 'Unexplained elevated liver enzymes', 'Pregnancy', 'Breastfeeding', 'Women of childbearing age not using contraception'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- THYROID MEDICATIONS
-- ============================================

-- Levothyroxine
(
    '550e8400-e29b-41d4-a716-446655440015',
    'Levothyroxine 50mcg',
    'Levothyroxine',
    'Synthroid, Levoxyl',
    'tablet',
    '50',
    'mcg',
    'white',
    'round',
    'MYLAN 50',
    'Take on empty stomach 30-60 minutes before breakfast. Do not switch brands without doctor approval (bioequivalence issues). Consistent timing critical.',
    'Very narrow therapeutic range. Over-treatment can cause atrial fibrillation, osteoporosis. Under-treatment causes fatigue, weight gain. Takes 4-6 weeks to see effect.',
    ARRAY['Most side effects indicate incorrect dose', 'If overdosed: palpitations, anxiety, tremor, weight loss', 'If underdosed: fatigue, cold intolerance, weight gain'],
    ARRAY['Calcium (take 4hrs apart)', 'Iron supplements (take 4hrs apart)', 'Antacids (take 4hrs apart)', 'Soy products', 'High-fiber foods reduce absorption', 'Estrogen', 'Diabetes medications may need adjustment'],
    ARRAY['Untreated adrenal insufficiency (must treat first)', 'Recent heart attack', 'Hyperthyroidism', 'Uncorrected acute cardiovascular conditions'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- PROTON PUMP INHIBITORS
-- ============================================

-- Omeprazole
(
    '550e8400-e29b-41d4-a716-446655440016',
    'Omeprazole 20mg',
    'Omeprazole',
    'Prilosec',
    'capsule',
    '20',
    'mg',
    'purple/pink',
    'capsule',
    'OMEP 20',
    'Take 30-60 minutes before first meal of day. Swallow whole, do not crush or chew capsules. If difficulty swallowing, may open and sprinkle on applesauce.',
    'Long-term use (>1 year) increases risk of bone fractures, vitamin B12 deficiency, C. diff infections, and kidney disease. Use lowest effective dose for shortest duration.',
    ARRAY['Headache', 'Stomach pain', 'Nausea', 'Diarrhea', 'Vomiting', 'Gas', 'With long-term: Vitamin B12 deficiency, osteoporosis, kidney disease'],
    ARRAY['Clopidogrel (reduces effectiveness)', 'Warfarin', 'Methotrexate', 'Diazepam', 'Phenytoin', 'Rifampin'],
    ARRAY['Hypersensitivity to PPIs', 'Concurrent use with rilpivirine'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- ALLERGY MEDICATIONS
-- ============================================

-- Cetirizine
(
    '550e8400-e29b-41d4-a716-446655440017',
    'Cetirizine 10mg',
    'Cetirizine',
    'Zyrtec',
    'tablet',
    '10',
    'mg',
    'white',
    'round',
    'UCB 10',
    'Take once daily. May be taken with or without food. Effect lasts 24 hours.',
    'Less sedating than older antihistamines but can still cause drowsiness in some people. Use caution when driving initially.',
    ARRAY['Drowsiness (14% vs 6% placebo)', 'Dry mouth', 'Fatigue', 'Headache', 'Dizziness'],
    ARRAY['Alcohol (increases drowsiness)', 'Sedatives', 'Other antihistamines', 'Ritonavir (increases levels)'],
    ARRAY['End-stage renal disease (dose adjustment required)', 'Hemodialysis (contraindicated)'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Prednisone (Corticosteroid)
(
    '550e8400-e29b-41d4-a716-446655440018',
    'Prednisone 10mg',
    'Prednisone',
    'Deltasone',
    'tablet',
    '10',
    'mg',
    'white',
    'round',
    'PRED 10',
    'Take with food to reduce stomach upset. Take in morning to mimic body''s natural cortisol rhythm. Do NOT stop abruptly if used >2 weeks.',
    'CRITICAL: Suppresses immune system. Increases infection risk. Can raise blood sugar. Long-term use causes osteoporosis, cataracts, adrenal suppression. Never stop suddenly after prolonged use - must taper.',
    ARRAY['Increased appetite', 'Weight gain', 'Insomnia', 'Mood changes (euphoria or depression)', 'Elevated blood sugar', 'Fluid retention', 'High blood pressure', 'Increased infection risk', 'Osteoporosis (long-term)', 'Stomach ulcers'],
    ARRAY['NSAIDs (GI bleeding risk)', 'Diabetes medications (raises blood sugar)', 'Vaccines (live vaccines contraindicated)', 'Warfarin', 'Diuretics (potassium loss)'],
    ARRAY['Active untreated fungal infection', 'Recent live vaccine administration', 'Active peptic ulcer', 'Active herpes simplex eye infection'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- DIURETICS
-- ============================================

-- Furosemide (Lasix)
(
    '550e8400-e29b-41d4-a716-446655440019',
    'Furosemide 40mg',
    'Furosemide',
    'Lasix',
    'tablet',
    '40',
    'mg',
    'white',
    'round',
    'LASIX 40',
    'Take in morning to avoid nighttime urination. May cause frequent urination for 4-6 hours. Take with food if stomach upset.',
    'Can cause severe electrolyte imbalances (low potassium, sodium, magnesium). Can cause hearing loss with rapid IV administration or high doses. Increases blood sugar and gout risk.',
    ARRAY['Frequent urination', 'Dizziness', 'Low blood pressure', 'Low potassium (muscle cramps, weakness)', 'Increased urination', 'Dehydration', 'Increased blood sugar', 'Increased uric acid (gout)'],
    ARRAY['Aminoglycoside antibiotics (hearing loss)', 'NSAIDs (reduce effectiveness)', 'ACE inhibitors', 'Lithium (toxicity)', 'Digoxin (with low potassium)'],
    ARRAY['Anuria (unable to urinate)', 'Severe electrolyte depletion', 'Hepatic coma', 'Sulfonamide allergy'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- ============================================
-- ASTHMA/COPD MEDICATIONS
-- ============================================

-- Albuterol Inhaler
(
    '550e8400-e29b-41d4-a716-446655440020',
    'Albuterol Inhaler 90mcg',
    'Albuterol',
    'ProAir, Ventolin',
    'inhaler',
    '90',
    'mcg/spray',
    'N/A',
    'aerosol canister',
    'N/A',
    'Shake well before use. Inhale 2 puffs every 4-6 hours as needed. Rinse mouth after use. Prime before first use or if not used for >2 weeks.',
    'For acute relief only - not for long-term control. If using more than 2 days/week for symptom control, see doctor (asthma not controlled). Can cause paradoxical bronchospasm.',
    ARRAY['Tremor', 'Nervousness', 'Headache', 'Palpitations', 'Increased heart rate', 'Throat irritation'],
    ARRAY['Beta-blockers (oppose effects)', 'MAOIs', 'Tricyclic antidepressants', 'Other sympathomimetics'],
    ARRAY['Hypersensitivity to albuterol'],
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400'
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_pills_name_search ON pills USING gin(to_tsvector('english', name || ' ' || COALESCE(generic_name, '') || ' ' || COALESCE(brand_name, '')));

COMMENT ON TABLE pills IS 'Comprehensive medication database with accurate warnings, contraindications, and safety information. Use for reference only - always verify with current drug databases and provider judgment.';
