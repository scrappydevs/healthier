-- ============================================
-- ADDITIONAL MEDICATIONS DATABASE
-- Expanding coverage to more therapeutic categories
-- ============================================

-- ============================================
-- OSTEOPOROSIS MEDICATIONS
-- ============================================

INSERT INTO pills (id, name, generic_name, brand_name, dosage_form, strength, unit, color, shape, imprint, instructions, warnings, side_effects, interactions, contraindications, image_url) VALUES

-- Alendronate
(
    '550e8400-e29b-41d4-a716-446655440021',
    'Alendronate 70mg',
    'Alendronate',
    'Fosamax',
    'tablet',
    '70',
    'mg',
    'white',
    'oval',
    'FOSAMAX 70',
    'Take once weekly on the same day. Take first thing in morning with FULL glass (8oz) of plain water ONLY. Remain upright (sitting or standing) for 30 minutes. Do NOT eat, drink, or take other medications for 30 minutes.',
    'CRITICAL: Can cause severe esophageal damage if not taken properly. Rare risk of jaw osteonecrosis, especially with dental procedures. Rare risk of atypical femur fractures with long-term use.',
    ARRAY['Stomach upset', 'Heartburn', 'Esophageal irritation', 'Muscle/joint/bone pain', 'Headache', 'Jaw pain (rare)', 'Thigh pain (rare - report immediately)'],
    ARRAY['Calcium supplements (take at different time)', 'Antacids', 'Aspirin/NSAIDs (GI irritation)', 'Iron supplements'],
    ARRAY['Inability to sit/stand upright for 30 minutes', 'Esophageal disorders', 'Hypocalcemia', 'Severe kidney disease (CrCl <35)', 'Pregnancy'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- PARKINSON'S DISEASE MEDICATIONS
-- ============================================

-- Carbidopa-Levodopa
(
    '550e8400-e29b-41d4-a716-446655440022',
    'Carbidopa-Levodopa 25/100mg',
    'Carbidopa-Levodopa',
    'Sinemet',
    'tablet',
    '25/100',
    'mg',
    'yellow',
    'round',
    'SINEMET 25-100',
    'Take on empty stomach for best absorption (high protein meals reduce effectiveness). Take at same times daily. Do NOT stop suddenly.',
    'CRITICAL: Never stop abruptly (neuroleptic malignant syndrome risk). May cause sudden sleep onset - do not drive if drowsy. Can cause compulsive behaviors (gambling, shopping).',
    ARRAY['Nausea (especially initially)', 'Dizziness', 'Involuntary movements (dyskinesia)', 'Hallucinations', 'Orthostatic hypotension', 'Darkened urine (harmless)', 'Compulsive behaviors'],
    ARRAY['MAOIs (hypertensive crisis)', 'Antipsychotics (reduce effectiveness)', 'High-protein meals', 'Iron supplements', 'Metoclopramide'],
    ARRAY['Concurrent non-selective MAOI use', 'Narrow-angle glaucoma', 'Suspicious undiagnosed skin lesions', 'History of melanoma'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- ============================================
-- EPILEPSY/SEIZURE MEDICATIONS
-- ============================================

-- Levetiracetam
(
    '550e8400-e29b-41d4-a716-446655440023',
    'Levetiracetam 500mg',
    'Levetiracetam',
    'Keppra',
    'tablet',
    '500',
    'mg',
    'yellow',
    'oblong',
    'ucb 500',
    'Take twice daily at consistent times. May be taken with or without food. Do NOT stop suddenly - may cause seizures.',
    'CRITICAL: Never stop abruptly - can trigger severe seizures. May cause significant mood/behavioral changes including aggression, irritability, and suicidal thoughts.',
    ARRAY['Drowsiness', 'Weakness', 'Dizziness', 'Behavioral changes (aggression, irritability)', 'Depression', 'Anxiety', 'Coordination problems'],
    ARRAY['Minimal drug interactions (advantage of this medication)', 'Alcohol (increases drowsiness)'],
    ARRAY['Hypersensitivity to levetiracetam'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Gabapentin
(
    '550e8400-e29b-41d4-a716-446655440024',
    'Gabapentin 300mg',
    'Gabapentin',
    'Neurontin',
    'capsule',
    '300',
    'mg',
    'yellow',
    'capsule',
    'GABAPENTIN 300',
    'Take with or without food. If dose is reduced, taper gradually over 1 week. Take antacids 2 hours before gabapentin.',
    'Can cause severe respiratory depression especially with opioids. May cause significant weight gain. Abuse potential exists despite not being controlled in all states.',
    ARRAY['Dizziness', 'Drowsiness', 'Peripheral edema', 'Weight gain', 'Coordination problems', 'Blurred vision', 'Fatigue'],
    ARRAY['Opioids (respiratory depression)', 'Antacids (reduce absorption)', 'CNS depressants', 'Alcohol'],
    ARRAY['Hypersensitivity to gabapentin'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- ============================================
-- GASTROINTESTINAL MEDICATIONS
-- ============================================

-- Ondansetron
(
    '550e8400-e29b-41d4-a716-446655440025',
    'Ondansetron 4mg',
    'Ondansetron',
    'Zofran',
    'tablet',
    '4',
    'mg',
    'white',
    'oval',
    'ZOFRAN 4',
    'Take 30 minutes before chemotherapy or as directed. May be taken with or without food. Dissolving tablet: place on tongue until dissolved.',
    'Can cause dangerous heart rhythm changes (QT prolongation), especially at higher doses. Use caution in patients with heart disease or electrolyte abnormalities.',
    ARRAY['Headache', 'Constipation', 'Dizziness', 'Fatigue', 'QT prolongation (dose-dependent)'],
    ARRAY['QT-prolonging drugs', 'Apomorphine (severe hypotension)', 'Serotonergic drugs'],
    ARRAY['Congenital long QT syndrome', 'Concurrent apomorphine use', 'Hypersensitivity'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- Famotidine
(
    '550e8400-e29b-41d4-a716-446655440026',
    'Famotidine 20mg',
    'Famotidine',
    'Pepcid',
    'tablet',
    '20',
    'mg',
    'beige',
    'round',
    'PEPCID 20',
    'Take once or twice daily. For heartburn prevention, take 15-60 minutes before eating foods that cause heartburn.',
    'Generally well-tolerated. Safer than PPIs for long-term use. May mask symptoms of gastric cancer - investigate persistent symptoms.',
    ARRAY['Headache', 'Dizziness', 'Constipation', 'Diarrhea'],
    ARRAY['Fewer drug interactions than PPIs', 'Ketoconazole/itraconazole (reduced absorption)', 'Atazanavir'],
    ARRAY['Hypersensitivity to famotidine or other H2 blockers'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Dicyclomine
(
    '550e8400-e29b-41d4-a716-446655440027',
    'Dicyclomine 20mg',
    'Dicyclomine',
    'Bentyl',
    'capsule',
    '20',
    'mg',
    'blue',
    'capsule',
    'BENTYL 20',
    'Take 4 times daily (30 minutes before meals and at bedtime). May be taken with food if GI upset occurs.',
    'Anticholinergic effects can be severe in elderly (confusion, urinary retention). Do not use in hot weather - impairs sweating.',
    ARRAY['Dry mouth', 'Blurred vision', 'Drowsiness', 'Dizziness', 'Constipation', 'Urinary retention', 'Confusion (elderly)'],
    ARRAY['Other anticholinergics', 'Opioids', 'Antidepressants', 'Antihistamines'],
    ARRAY['Glaucoma', 'Obstructive GI disease', 'Severe ulcerative colitis', 'Myasthenia gravis', 'Urinary obstruction', 'Nursing mothers'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- UROLOGICAL MEDICATIONS
-- ============================================

-- Tamsulosin
(
    '550e8400-e29b-41d4-a716-446655440028',
    'Tamsulosin 0.4mg',
    'Tamsulosin',
    'Flomax',
    'capsule',
    '0.4',
    'mg',
    'olive/orange',
    'capsule',
    'Flomax 0.4mg',
    'Take 30 minutes after the same meal each day. Swallow whole - do not crush, chew, or open capsule.',
    'Can cause significant drop in blood pressure, especially with first dose or when restarting. May cause intraoperative floppy iris syndrome during cataract surgery - inform eye surgeon.',
    ARRAY['Dizziness', 'Abnormal ejaculation (30%)', 'Runny/stuffy nose', 'Orthostatic hypotension', 'Headache'],
    ARRAY['Other alpha-blockers (severe hypotension)', 'PDE-5 inhibitors (sildenafil, tadalafil)', 'Strong CYP3A4 inhibitors'],
    ARRAY['Hypersensitivity to tamsulosin or sulfonamides', 'Severe hepatic impairment', 'Concurrent alpha-blocker use'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Oxybutynin
(
    '550e8400-e29b-41d4-a716-446655440029',
    'Oxybutynin 5mg',
    'Oxybutynin',
    'Ditropan',
    'tablet',
    '5',
    'mg',
    'light blue',
    'round',
    'DITROPAN 5',
    'Take 2-3 times daily. May be taken with or without food. Avoid extreme heat.',
    'CRITICAL for elderly: Can cause significant cognitive impairment, confusion, and falls. Avoid in patients with dementia. Impairs sweating - heat stroke risk.',
    ARRAY['Dry mouth (severe)', 'Constipation', 'Blurred vision', 'Drowsiness', 'Confusion (elderly)', 'Urinary retention', 'Heat intolerance'],
    ARRAY['Other anticholinergics', 'CNS depressants', 'Cholinesterase inhibitors (oppose effects)', 'Potassium chloride (GI injury risk)'],
    ARRAY['Urinary retention', 'Gastric retention', 'Uncontrolled narrow-angle glaucoma', 'GI obstruction'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- SLEEP MEDICATIONS
-- ============================================

-- Trazodone
(
    '550e8400-e29b-41d4-a716-446655440030',
    'Trazodone 50mg',
    'Trazodone',
    'Desyrel',
    'tablet',
    '50',
    'mg',
    'white',
    'round',
    'PLIVA 433',
    'Take at bedtime with food (reduces dizziness and increases absorption). May cause morning drowsiness initially.',
    'Rare but serious: priapism (painful prolonged erection) - seek emergency care immediately. May worsen depression initially. Avoid alcohol.',
    ARRAY['Drowsiness', 'Dizziness', 'Dry mouth', 'Blurred vision', 'Headache', 'Nausea', 'Priapism (rare but serious)'],
    ARRAY['MAOIs', 'CNS depressants', 'Alcohol', 'CYP3A4 inhibitors', 'QT-prolonging drugs'],
    ARRAY['MAOI use within 14 days', 'Hypersensitivity to trazodone'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Zolpidem
(
    '550e8400-e29b-41d4-a716-446655440031',
    'Zolpidem 10mg',
    'Zolpidem',
    'Ambien',
    'tablet',
    '10',
    'mg',
    'white',
    'oblong',
    'AMB 10',
    'Take immediately before bed. Only take when you have 7-8 hours for sleep. Do NOT take with or after a meal (delays effect).',
    'CONTROLLED SUBSTANCE Schedule IV. Can cause complex sleep behaviors (sleep-walking, sleep-driving, sleep-eating) with NO memory. Stop immediately if this occurs. Lower dose for women (5mg).',
    ARRAY['Drowsiness', 'Dizziness', 'Diarrhea', 'Drugged feeling', 'Complex sleep behaviors', 'Memory impairment', 'Next-day impairment'],
    ARRAY['CNS depressants', 'Opioids', 'Alcohol (NEVER combine)', 'CYP3A4 inhibitors'],
    ARRAY['Sleep apnea', 'Myasthenia gravis', 'Severe hepatic impairment', 'History of complex sleep behaviors on zolpidem'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- ============================================
-- MIGRAINE MEDICATIONS
-- ============================================

-- Sumatriptan
(
    '550e8400-e29b-41d4-a716-446655440032',
    'Sumatriptan 50mg',
    'Sumatriptan',
    'Imitrex',
    'tablet',
    '50',
    'mg',
    'white',
    'triangular',
    'IMITREX 50',
    'Take at first sign of migraine. May repeat after 2 hours if needed. Maximum 200mg in 24 hours. Not for prevention.',
    'CRITICAL: Can cause coronary artery vasospasm and heart attack - do NOT use if heart disease. Not for hemiplegic or basilar migraine. Overuse can cause medication overuse headache.',
    ARRAY['Tingling', 'Flushing', 'Chest pressure/tightness (usually not cardiac)', 'Dizziness', 'Drowsiness', 'Injection site reactions'],
    ARRAY['MAOIs', 'Other triptans (wait 24hrs)', 'Ergotamines (wait 24hrs)', 'SSRIs/SNRIs (serotonin syndrome risk)'],
    ARRAY['Heart disease or history of MI/stroke', 'Uncontrolled hypertension', 'Hemiplegic or basilar migraine', 'MAOIs within 2 weeks', 'Severe hepatic impairment', 'Peripheral vascular disease'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Topiramate (migraine prevention)
(
    '550e8400-e29b-41d4-a716-446655440033',
    'Topiramate 25mg',
    'Topiramate',
    'Topamax',
    'tablet',
    '25',
    'mg',
    'white',
    'round',
    'TOP 25',
    'Take at bedtime to reduce daytime drowsiness. Drink plenty of fluids to prevent kidney stones. Increase dose slowly.',
    'CRITICAL: Can cause significant cognitive impairment ("Dopamax"). Increases risk of kidney stones - stay hydrated. Causes birth defects - use effective contraception.',
    ARRAY['Tingling in hands/feet', 'Weight loss', 'Difficulty concentrating', 'Memory problems', 'Word-finding difficulty', 'Taste changes', 'Kidney stones'],
    ARRAY['Carbonic anhydrase inhibitors', 'Oral contraceptives (reduced effectiveness)', 'Valproic acid', 'CNS depressants'],
    ARRAY['Pregnancy', 'Metabolic acidosis', 'Recent alcohol use within 6 hours'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- DERMATOLOGICAL MEDICATIONS
-- ============================================

-- Hydroxyzine
(
    '550e8400-e29b-41d4-a716-446655440034',
    'Hydroxyzine 25mg',
    'Hydroxyzine',
    'Vistaril, Atarax',
    'tablet',
    '25',
    'mg',
    'white',
    'round',
    'ATARAX 25',
    'Take as directed for itching or anxiety. May take with or without food. Causes drowsiness.',
    'Very sedating antihistamine. Use caution in elderly (falls, confusion). Can prolong QT interval at higher doses.',
    ARRAY['Drowsiness (significant)', 'Dry mouth', 'Headache', 'Dizziness', 'Confusion in elderly', 'QT prolongation at high doses'],
    ARRAY['CNS depressants', 'Alcohol', 'Anticholinergics', 'QT-prolonging drugs'],
    ARRAY['Prolonged QT interval', 'Early pregnancy', 'Hypersensitivity to hydroxyzine or cetirizine'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- EYE MEDICATIONS
-- ============================================

-- Latanoprost
(
    '550e8400-e29b-41d4-a716-446655440035',
    'Latanoprost 0.005% Eye Drops',
    'Latanoprost',
    'Xalatan',
    'eye drops',
    '0.005',
    '%',
    'clear',
    'liquid',
    'N/A',
    'Apply one drop to affected eye(s) once daily in the evening. Remove contact lenses before applying, wait 15 minutes before reinserting.',
    'Permanently changes eye color (increases brown pigment) - more noticeable in mixed color irises. Also darkens eyelids and increases eyelash growth.',
    ARRAY['Eye redness', 'Iris color change (permanent)', 'Eyelash growth/darkening', 'Eye irritation', 'Blurred vision'],
    ARRAY['Other prostaglandin eye drops', 'NSAID eye drops', 'Thimerosal-containing products'],
    ARRAY['Hypersensitivity to latanoprost or benzalkonium chloride'],
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400'
),

-- ============================================
-- GOUT MEDICATIONS
-- ============================================

-- Allopurinol
(
    '550e8400-e29b-41d4-a716-446655440036',
    'Allopurinol 100mg',
    'Allopurinol',
    'Zyloprim',
    'tablet',
    '100',
    'mg',
    'white',
    'round',
    'ZYLOPRIM 100',
    'Take with food to reduce stomach upset. Drink 8-10 glasses of water daily. Start at low dose and increase gradually.',
    'CRITICAL: Stop immediately and seek emergency care if rash develops - can progress to fatal Stevens-Johnson syndrome or DRESS (especially in patients with renal impairment or HLA-B*5801 positive).',
    ARRAY['Rash (STOP IF OCCURS)', 'Nausea', 'Diarrhea', 'Elevated liver enzymes', 'Gout flare when starting (temporary)'],
    ARRAY['Azathioprine (severe toxicity)', 'Mercaptopurine', 'Ampicillin/amoxicillin (increased rash risk)', 'ACE inhibitors', 'Thiazide diuretics'],
    ARRAY['Previous severe hypersensitivity reaction to allopurinol'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- Colchicine
(
    '550e8400-e29b-41d4-a716-446655440037',
    'Colchicine 0.6mg',
    'Colchicine',
    'Colcrys',
    'tablet',
    '0.6',
    'mg',
    'purple',
    'round',
    'AR 374',
    'For acute gout: 1.2mg at first sign, then 0.6mg one hour later. For prevention: 0.6mg once or twice daily.',
    'CRITICAL: Narrow therapeutic window. Overdose can be fatal. Dose MUST be reduced with kidney/liver disease or interacting drugs. Severe diarrhea means stop immediately.',
    ARRAY['Diarrhea (dose-limiting)', 'Nausea', 'Vomiting', 'Abdominal pain', 'Muscle weakness with prolonged use'],
    ARRAY['Strong CYP3A4 inhibitors (clarithromycin, ketoconazole)', 'P-glycoprotein inhibitors (cyclosporine)', 'Statins (increased myopathy risk)'],
    ARRAY['Severe renal impairment with strong CYP3A4 inhibitors', 'Severe hepatic impairment with strong CYP3A4 inhibitors', 'Blood dyscrasias'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- ============================================
-- HORMONE MEDICATIONS
-- ============================================

-- Finasteride
(
    '550e8400-e29b-41d4-a716-446655440038',
    'Finasteride 5mg',
    'Finasteride',
    'Proscar',
    'tablet',
    '5',
    'mg',
    'blue',
    'round',
    'PROSCAR',
    'Take once daily with or without food. May take 3-6 months to see effect for BPH. Consistent daily use required.',
    'CRITICAL: Women who are or may become pregnant must NOT handle crushed/broken tablets - can cause fetal abnormalities. Sexual side effects may persist after stopping.',
    ARRAY['Decreased libido', 'Erectile dysfunction', 'Ejaculation disorders', 'Breast tenderness/enlargement', 'Depression (rare)'],
    ARRAY['Few significant drug interactions'],
    ARRAY['Women of childbearing potential', 'Pediatric patients', 'Hypersensitivity to finasteride or 5-alpha reductase inhibitors'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- Testosterone (gel)
(
    '550e8400-e29b-41d4-a716-446655440039',
    'Testosterone Gel 1%',
    'Testosterone',
    'AndroGel',
    'gel',
    '1',
    '%',
    'clear',
    'gel',
    'N/A',
    'Apply to clean, dry skin of shoulders, upper arms, or abdomen each morning. Allow to dry before dressing. Wash hands thoroughly after applying.',
    'CONTROLLED SUBSTANCE Schedule III. FDA BLACK BOX WARNING: Risk of transfer to women and children through skin contact (virilization). Cover application site with clothing. Wash area before contact.',
    ARRAY['Skin irritation at site', 'Increased PSA', 'Acne', 'Mood changes', 'Sleep apnea', 'Polycythemia (increased red blood cells)'],
    ARRAY['Anticoagulants (increased effect)', 'Insulin (decreased requirements)', 'Corticosteroids'],
    ARRAY['Breast or prostate cancer', 'Severe heart failure', 'Uncontrolled sleep apnea', 'Women', 'Polycythemia'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- ============================================
-- BONE HEALTH / SUPPLEMENTS
-- ============================================

-- Calcium Carbonate + Vitamin D
(
    '550e8400-e29b-41d4-a716-446655440040',
    'Calcium 600mg + Vitamin D3 400IU',
    'Calcium Carbonate',
    'Caltrate',
    'tablet',
    '600/400',
    'mg/IU',
    'white',
    'oval',
    'CALTRATE',
    'Take with food for best absorption. Take in divided doses if >500mg daily. Separate from other medications by 2-4 hours.',
    'Excess calcium may increase cardiovascular risk. Do not exceed 2500mg calcium or 4000IU vitamin D daily. Can cause constipation.',
    ARRAY['Constipation', 'Gas', 'Bloating', 'Hypercalcemia (with excess)', 'Kidney stones (in susceptible individuals)'],
    ARRAY['Bisphosphonates (take 2hrs apart)', 'Levothyroxine (take 4hrs apart)', 'Tetracyclines', 'Fluoroquinolones', 'Iron'],
    ARRAY['Hypercalcemia', 'Hypervitaminosis D', 'Severe kidney disease', 'Kidney stones (calcium oxalate)'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
),

-- ============================================
-- BLOOD DISORDERS
-- ============================================

-- Ferrous Sulfate (Iron)
(
    '550e8400-e29b-41d4-a716-446655440041',
    'Ferrous Sulfate 325mg',
    'Ferrous Sulfate',
    'Feosol',
    'tablet',
    '325',
    'mg',
    'red',
    'round',
    'FER 325',
    'Take on empty stomach if tolerated (1 hour before or 2 hours after meals). Take with vitamin C to enhance absorption. Separate from other medications.',
    'POISON WARNING: Keep out of reach of children - accidental overdose is leading cause of poisoning death in children under 6. Causes dark/black stools (normal).',
    ARRAY['Constipation', 'Nausea', 'Stomach upset', 'Dark stools (harmless)', 'Tooth staining (liquid forms)'],
    ARRAY['Antacids (reduce absorption)', 'Proton pump inhibitors', 'Calcium', 'Tetracyclines', 'Levothyroxine', 'Levodopa'],
    ARRAY['Iron overload syndromes (hemochromatosis)', 'Hemolytic anemia', 'Repeated blood transfusions'],
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400'
),

-- Folic Acid
(
    '550e8400-e29b-41d4-a716-446655440042',
    'Folic Acid 1mg',
    'Folic Acid',
    'Generic',
    'tablet',
    '1',
    'mg',
    'yellow',
    'round',
    'FA 1',
    'Take once daily with or without food. Essential during pregnancy for neural tube defect prevention.',
    'CRITICAL: Can mask vitamin B12 deficiency - ensure B12 status is checked if taking for anemia. High doses may interfere with some seizure medications.',
    ARRAY['Generally well tolerated', 'Nausea (rare)', 'Bad taste (rare)', 'Irritability (rare)'],
    ARRAY['Methotrexate (antagonized by folic acid)', 'Phenytoin', 'Sulfasalazine'],
    ARRAY['Untreated vitamin B12 deficiency', 'Pernicious anemia (unless B12 also given)'],
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
),

-- ============================================
-- RESPIRATORY (ADDITIONAL)
-- ============================================

-- Montelukast
(
    '550e8400-e29b-41d4-a716-446655440043',
    'Montelukast 10mg',
    'Montelukast',
    'Singulair',
    'tablet',
    '10',
    'mg',
    'beige',
    'square',
    'SINGULAIR 10',
    'Take once daily in the evening. May be taken with or without food. Not for acute asthma attacks.',
    'FDA BLACK BOX WARNING: Serious mental health side effects including suicidal thoughts, agitation, aggression, anxiety, depression, sleep problems. Monitor closely.',
    ARRAY['Headache', 'Stomach pain', 'Fatigue', 'Behavioral changes', 'Dream abnormalities', 'Depression', 'Suicidal thoughts (rare)'],
    ARRAY['Few significant interactions', 'Phenobarbital (reduces effectiveness)'],
    ARRAY['Hypersensitivity to montelukast'],
    'https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=400'
),

-- Fluticasone Nasal Spray
(
    '550e8400-e29b-41d4-a716-446655440044',
    'Fluticasone Nasal Spray 50mcg',
    'Fluticasone',
    'Flonase',
    'nasal spray',
    '50',
    'mcg/spray',
    'white',
    'suspension',
    'N/A',
    'Shake well before each use. Prime before first use. Spray into each nostril once or twice daily. Avoid spraying onto septum.',
    'Long-term use may affect growth in children (monitor height). Rare risk of nasal septum perforation. May take several days for full effect.',
    ARRAY['Nosebleeds', 'Nasal irritation', 'Headache', 'Sore throat', 'Unpleasant taste'],
    ARRAY['Ritonavir (increases steroid exposure)', 'Other corticosteroids (additive effects)'],
    ARRAY['Hypersensitivity to fluticasone', 'Recent nasal surgery or trauma (until healed)'],
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400'
),

-- ============================================
-- MUSCLE RELAXANTS
-- ============================================

-- Cyclobenzaprine
(
    '550e8400-e29b-41d4-a716-446655440045',
    'Cyclobenzaprine 10mg',
    'Cyclobenzaprine',
    'Flexeril',
    'tablet',
    '10',
    'mg',
    'yellow',
    'round',
    'FLEXERIL',
    'Take three times daily. For acute use only (2-3 weeks). May cause significant drowsiness.',
    'Very sedating - do not drive or operate machinery. Has anticholinergic effects. Not recommended for elderly. Can cause serotonin syndrome with SSRIs.',
    ARRAY['Drowsiness (significant)', 'Dry mouth', 'Dizziness', 'Fatigue', 'Confusion', 'Urinary retention', 'Constipation'],
    ARRAY['MAOIs (contraindicated)', 'SSRIs (serotonin syndrome)', 'CNS depressants', 'Alcohol', 'Tramadol'],
    ARRAY['MAOIs within 14 days', 'Hyperthyroidism', 'Arrhythmias', 'Heart block', 'Heart failure', 'Recent MI'],
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'
);

COMMENT ON TABLE pills IS 'Expanded comprehensive medication database covering additional therapeutic categories including osteoporosis, neurology, gastroenterology, urology, dermatology, and more.';
