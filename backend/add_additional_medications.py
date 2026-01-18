"""
Script to add additional medications to the database
"""
import os
from supabase import create_client

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing Supabase credentials")
    print("Run with: infisical run --env=dev -- python add_additional_medications.py")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# Helper function to clean medication data - remove fields that might not exist in schema
def clean_med_data(med):
    """Remove contraindications field if schema doesn't support it"""
    cleaned = med.copy()
    # Remove contraindications if it exists (may not be in DB schema)
    if 'contraindications' in cleaned:
        del cleaned['contraindications']
    return cleaned

print("Adding additional medications to database...\n")

additional_medications = [
    # OSTEOPOROSIS
    {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "name": "Alendronate 70mg",
        "generic_name": "Alendronate",
        "brand_name": "Fosamax",
        "dosage_form": "tablet",
        "strength": "70",
        "unit": "mg",
        "color": "white",
        "shape": "oval",
        "imprint": "FOSAMAX 70",
        "instructions": "Take once weekly on the same day. Take first thing in morning with FULL glass (8oz) of plain water ONLY. Remain upright for 30 minutes. Do NOT eat, drink, or take other medications for 30 minutes.",
        "warnings": "CRITICAL: Can cause severe esophageal damage if not taken properly. Rare risk of jaw osteonecrosis. Rare risk of atypical femur fractures with long-term use.",
        "side_effects": ["Stomach upset", "Heartburn", "Esophageal irritation", "Muscle/joint/bone pain", "Headache", "Jaw pain (rare)", "Thigh pain (rare)"],
        "interactions": ["Calcium supplements (take at different time)", "Antacids", "Aspirin/NSAIDs (GI irritation)", "Iron supplements"],
        "contraindications": ["Inability to sit/stand upright for 30 minutes", "Esophageal disorders", "Hypocalcemia", "Severe kidney disease", "Pregnancy"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    # PARKINSON'S
    {
        "id": "550e8400-e29b-41d4-a716-446655440022",
        "name": "Carbidopa-Levodopa 25/100mg",
        "generic_name": "Carbidopa-Levodopa",
        "brand_name": "Sinemet",
        "dosage_form": "tablet",
        "strength": "25/100",
        "unit": "mg",
        "color": "yellow",
        "shape": "round",
        "imprint": "SINEMET 25-100",
        "instructions": "Take on empty stomach for best absorption. Take at same times daily. Do NOT stop suddenly.",
        "warnings": "CRITICAL: Never stop abruptly. May cause sudden sleep onset - do not drive if drowsy. Can cause compulsive behaviors (gambling, shopping).",
        "side_effects": ["Nausea", "Dizziness", "Involuntary movements", "Hallucinations", "Orthostatic hypotension", "Darkened urine", "Compulsive behaviors"],
        "interactions": ["MAOIs (hypertensive crisis)", "Antipsychotics (reduce effectiveness)", "High-protein meals", "Iron supplements"],
        "contraindications": ["Concurrent non-selective MAOI use", "Narrow-angle glaucoma", "History of melanoma"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
    # EPILEPSY
    {
        "id": "550e8400-e29b-41d4-a716-446655440023",
        "name": "Levetiracetam 500mg",
        "generic_name": "Levetiracetam",
        "brand_name": "Keppra",
        "dosage_form": "tablet",
        "strength": "500",
        "unit": "mg",
        "color": "yellow",
        "shape": "oblong",
        "imprint": "ucb 500",
        "instructions": "Take twice daily at consistent times. May be taken with or without food. Do NOT stop suddenly.",
        "warnings": "CRITICAL: Never stop abruptly - can trigger severe seizures. May cause significant mood/behavioral changes including aggression and suicidal thoughts.",
        "side_effects": ["Drowsiness", "Weakness", "Dizziness", "Behavioral changes", "Depression", "Anxiety", "Coordination problems"],
        "interactions": ["Minimal drug interactions", "Alcohol (increases drowsiness)"],
        "contraindications": ["Hypersensitivity to levetiracetam"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440024",
        "name": "Gabapentin 300mg",
        "generic_name": "Gabapentin",
        "brand_name": "Neurontin",
        "dosage_form": "capsule",
        "strength": "300",
        "unit": "mg",
        "color": "yellow",
        "shape": "capsule",
        "imprint": "GABAPENTIN 300",
        "instructions": "Take with or without food. Taper gradually if reducing dose. Take antacids 2 hours before gabapentin.",
        "warnings": "Can cause severe respiratory depression with opioids. May cause significant weight gain. Has abuse potential.",
        "side_effects": ["Dizziness", "Drowsiness", "Peripheral edema", "Weight gain", "Coordination problems", "Blurred vision"],
        "interactions": ["Opioids (respiratory depression)", "Antacids (reduce absorption)", "CNS depressants", "Alcohol"],
        "contraindications": ["Hypersensitivity to gabapentin"],
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80"
    },
    # GI
    {
        "id": "550e8400-e29b-41d4-a716-446655440025",
        "name": "Ondansetron 4mg",
        "generic_name": "Ondansetron",
        "brand_name": "Zofran",
        "dosage_form": "tablet",
        "strength": "4",
        "unit": "mg",
        "color": "white",
        "shape": "oval",
        "imprint": "ZOFRAN 4",
        "instructions": "Take 30 minutes before chemotherapy or as directed. May be taken with or without food.",
        "warnings": "Can cause dangerous heart rhythm changes (QT prolongation), especially at higher doses.",
        "side_effects": ["Headache", "Constipation", "Dizziness", "Fatigue", "QT prolongation"],
        "interactions": ["QT-prolonging drugs", "Apomorphine (severe hypotension)", "Serotonergic drugs"],
        "contraindications": ["Congenital long QT syndrome", "Concurrent apomorphine use"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440026",
        "name": "Famotidine 20mg",
        "generic_name": "Famotidine",
        "brand_name": "Pepcid",
        "dosage_form": "tablet",
        "strength": "20",
        "unit": "mg",
        "color": "beige",
        "shape": "round",
        "imprint": "PEPCID 20",
        "instructions": "Take once or twice daily. For heartburn prevention, take 15-60 minutes before eating.",
        "warnings": "Generally well-tolerated. Safer than PPIs for long-term use. May mask symptoms of gastric cancer.",
        "side_effects": ["Headache", "Dizziness", "Constipation", "Diarrhea"],
        "interactions": ["Ketoconazole/itraconazole (reduced absorption)", "Atazanavir"],
        "contraindications": ["Hypersensitivity to famotidine or other H2 blockers"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440027",
        "name": "Dicyclomine 20mg",
        "generic_name": "Dicyclomine",
        "brand_name": "Bentyl",
        "dosage_form": "capsule",
        "strength": "20",
        "unit": "mg",
        "color": "blue",
        "shape": "capsule",
        "imprint": "BENTYL 20",
        "instructions": "Take 4 times daily (30 minutes before meals and at bedtime).",
        "warnings": "Anticholinergic effects can be severe in elderly. Do not use in hot weather - impairs sweating.",
        "side_effects": ["Dry mouth", "Blurred vision", "Drowsiness", "Dizziness", "Constipation", "Urinary retention"],
        "interactions": ["Other anticholinergics", "Opioids", "Antidepressants", "Antihistamines"],
        "contraindications": ["Glaucoma", "Obstructive GI disease", "Severe ulcerative colitis", "Myasthenia gravis"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    # UROLOGY
    {
        "id": "550e8400-e29b-41d4-a716-446655440028",
        "name": "Tamsulosin 0.4mg",
        "generic_name": "Tamsulosin",
        "brand_name": "Flomax",
        "dosage_form": "capsule",
        "strength": "0.4",
        "unit": "mg",
        "color": "olive/orange",
        "shape": "capsule",
        "imprint": "Flomax 0.4mg",
        "instructions": "Take 30 minutes after the same meal each day. Swallow whole - do not crush, chew, or open.",
        "warnings": "Can cause significant drop in blood pressure. May cause intraoperative floppy iris syndrome - inform eye surgeon.",
        "side_effects": ["Dizziness", "Abnormal ejaculation (30%)", "Runny/stuffy nose", "Orthostatic hypotension"],
        "interactions": ["Other alpha-blockers", "PDE-5 inhibitors (sildenafil, tadalafil)", "Strong CYP3A4 inhibitors"],
        "contraindications": ["Hypersensitivity to tamsulosin", "Severe hepatic impairment"],
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440029",
        "name": "Oxybutynin 5mg",
        "generic_name": "Oxybutynin",
        "brand_name": "Ditropan",
        "dosage_form": "tablet",
        "strength": "5",
        "unit": "mg",
        "color": "light blue",
        "shape": "round",
        "imprint": "DITROPAN 5",
        "instructions": "Take 2-3 times daily. May be taken with or without food. Avoid extreme heat.",
        "warnings": "CRITICAL for elderly: Can cause significant cognitive impairment. Impairs sweating - heat stroke risk.",
        "side_effects": ["Dry mouth (severe)", "Constipation", "Blurred vision", "Drowsiness", "Confusion (elderly)"],
        "interactions": ["Other anticholinergics", "CNS depressants", "Cholinesterase inhibitors"],
        "contraindications": ["Urinary retention", "Gastric retention", "Uncontrolled narrow-angle glaucoma"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    # SLEEP
    {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "name": "Trazodone 50mg",
        "generic_name": "Trazodone",
        "brand_name": "Desyrel",
        "dosage_form": "tablet",
        "strength": "50",
        "unit": "mg",
        "color": "white",
        "shape": "round",
        "imprint": "PLIVA 433",
        "instructions": "Take at bedtime with food. May cause morning drowsiness initially.",
        "warnings": "Rare but serious: priapism (painful prolonged erection) - seek emergency care immediately. Avoid alcohol.",
        "side_effects": ["Drowsiness", "Dizziness", "Dry mouth", "Blurred vision", "Headache", "Priapism (rare)"],
        "interactions": ["MAOIs", "CNS depressants", "Alcohol", "CYP3A4 inhibitors", "QT-prolonging drugs"],
        "contraindications": ["MAOI use within 14 days", "Hypersensitivity to trazodone"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440031",
        "name": "Zolpidem 10mg",
        "generic_name": "Zolpidem",
        "brand_name": "Ambien",
        "dosage_form": "tablet",
        "strength": "10",
        "unit": "mg",
        "color": "white",
        "shape": "oblong",
        "imprint": "AMB 10",
        "instructions": "Take immediately before bed. Only take when you have 7-8 hours for sleep. Do NOT take with or after a meal.",
        "warnings": "CONTROLLED SUBSTANCE. Can cause complex sleep behaviors (sleep-walking, sleep-driving) with NO memory. Lower dose for women (5mg).",
        "side_effects": ["Drowsiness", "Dizziness", "Diarrhea", "Complex sleep behaviors", "Memory impairment"],
        "interactions": ["CNS depressants", "Opioids", "Alcohol (NEVER combine)", "CYP3A4 inhibitors"],
        "contraindications": ["Sleep apnea", "Myasthenia gravis", "Severe hepatic impairment", "History of complex sleep behaviors"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
    # MIGRAINE
    {
        "id": "550e8400-e29b-41d4-a716-446655440032",
        "name": "Sumatriptan 50mg",
        "generic_name": "Sumatriptan",
        "brand_name": "Imitrex",
        "dosage_form": "tablet",
        "strength": "50",
        "unit": "mg",
        "color": "white",
        "shape": "triangular",
        "imprint": "IMITREX 50",
        "instructions": "Take at first sign of migraine. May repeat after 2 hours if needed. Maximum 200mg in 24 hours.",
        "warnings": "CRITICAL: Can cause coronary artery vasospasm and heart attack - do NOT use if heart disease. Overuse can cause medication overuse headache.",
        "side_effects": ["Tingling", "Flushing", "Chest pressure/tightness", "Dizziness", "Drowsiness"],
        "interactions": ["MAOIs", "Other triptans (wait 24hrs)", "Ergotamines (wait 24hrs)", "SSRIs/SNRIs (serotonin syndrome risk)"],
        "contraindications": ["Heart disease or history of MI/stroke", "Uncontrolled hypertension", "Hemiplegic migraine", "MAOIs within 2 weeks"],
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440033",
        "name": "Topiramate 25mg",
        "generic_name": "Topiramate",
        "brand_name": "Topamax",
        "dosage_form": "tablet",
        "strength": "25",
        "unit": "mg",
        "color": "white",
        "shape": "round",
        "imprint": "TOP 25",
        "instructions": "Take at bedtime to reduce drowsiness. Drink plenty of fluids. Increase dose slowly.",
        "warnings": "CRITICAL: Can cause significant cognitive impairment. Increases kidney stone risk. Causes birth defects - use effective contraception.",
        "side_effects": ["Tingling in hands/feet", "Weight loss", "Difficulty concentrating", "Memory problems", "Word-finding difficulty", "Kidney stones"],
        "interactions": ["Carbonic anhydrase inhibitors", "Oral contraceptives (reduced effectiveness)", "Valproic acid"],
        "contraindications": ["Pregnancy", "Metabolic acidosis", "Recent alcohol use within 6 hours"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    # DERMATOLOGY
    {
        "id": "550e8400-e29b-41d4-a716-446655440034",
        "name": "Hydroxyzine 25mg",
        "generic_name": "Hydroxyzine",
        "brand_name": "Vistaril, Atarax",
        "dosage_form": "tablet",
        "strength": "25",
        "unit": "mg",
        "color": "white",
        "shape": "round",
        "imprint": "ATARAX 25",
        "instructions": "Take as directed for itching or anxiety. May take with or without food. Causes drowsiness.",
        "warnings": "Very sedating antihistamine. Use caution in elderly. Can prolong QT interval at higher doses.",
        "side_effects": ["Drowsiness (significant)", "Dry mouth", "Headache", "Dizziness", "Confusion in elderly"],
        "interactions": ["CNS depressants", "Alcohol", "Anticholinergics", "QT-prolonging drugs"],
        "contraindications": ["Prolonged QT interval", "Early pregnancy", "Hypersensitivity to hydroxyzine"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    # EYE
    {
        "id": "550e8400-e29b-41d4-a716-446655440035",
        "name": "Latanoprost 0.005% Eye Drops",
        "generic_name": "Latanoprost",
        "brand_name": "Xalatan",
        "dosage_form": "eye drops",
        "strength": "0.005",
        "unit": "%",
        "color": "clear",
        "shape": "liquid",
        "imprint": None,
        "instructions": "Apply one drop to affected eye(s) once daily in the evening. Remove contacts before applying.",
        "warnings": "Permanently changes eye color (increases brown pigment). Also darkens eyelids and increases eyelash growth.",
        "side_effects": ["Eye redness", "Iris color change (permanent)", "Eyelash growth/darkening", "Eye irritation"],
        "interactions": ["Other prostaglandin eye drops", "NSAID eye drops"],
        "contraindications": ["Hypersensitivity to latanoprost"],
        "image_url": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80"
    },
    # GOUT
    {
        "id": "550e8400-e29b-41d4-a716-446655440036",
        "name": "Allopurinol 100mg",
        "generic_name": "Allopurinol",
        "brand_name": "Zyloprim",
        "dosage_form": "tablet",
        "strength": "100",
        "unit": "mg",
        "color": "white",
        "shape": "round",
        "imprint": "ZYLOPRIM 100",
        "instructions": "Take with food to reduce stomach upset. Drink 8-10 glasses of water daily. Start at low dose.",
        "warnings": "CRITICAL: Stop immediately if rash develops - can progress to fatal Stevens-Johnson syndrome.",
        "side_effects": ["Rash (STOP IF OCCURS)", "Nausea", "Diarrhea", "Elevated liver enzymes", "Gout flare when starting"],
        "interactions": ["Azathioprine (severe toxicity)", "Mercaptopurine", "Ampicillin/amoxicillin (increased rash)", "ACE inhibitors"],
        "contraindications": ["Previous severe hypersensitivity reaction to allopurinol"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440037",
        "name": "Colchicine 0.6mg",
        "generic_name": "Colchicine",
        "brand_name": "Colcrys",
        "dosage_form": "tablet",
        "strength": "0.6",
        "unit": "mg",
        "color": "purple",
        "shape": "round",
        "imprint": "AR 374",
        "instructions": "For acute gout: 1.2mg at first sign, then 0.6mg one hour later. For prevention: 0.6mg once or twice daily.",
        "warnings": "CRITICAL: Narrow therapeutic window. Overdose can be fatal. Dose MUST be reduced with kidney/liver disease.",
        "side_effects": ["Diarrhea (dose-limiting)", "Nausea", "Vomiting", "Abdominal pain", "Muscle weakness"],
        "interactions": ["Strong CYP3A4 inhibitors", "P-glycoprotein inhibitors (cyclosporine)", "Statins (increased myopathy)"],
        "contraindications": ["Severe renal impairment with strong CYP3A4 inhibitors", "Severe hepatic impairment with strong CYP3A4 inhibitors"],
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80"
    },
    # HORMONES
    {
        "id": "550e8400-e29b-41d4-a716-446655440038",
        "name": "Finasteride 5mg",
        "generic_name": "Finasteride",
        "brand_name": "Proscar",
        "dosage_form": "tablet",
        "strength": "5",
        "unit": "mg",
        "color": "blue",
        "shape": "round",
        "imprint": "PROSCAR",
        "instructions": "Take once daily with or without food. May take 3-6 months to see effect. Consistent use required.",
        "warnings": "CRITICAL: Women who are or may become pregnant must NOT handle crushed/broken tablets. Sexual side effects may persist.",
        "side_effects": ["Decreased libido", "Erectile dysfunction", "Ejaculation disorders", "Breast tenderness", "Depression (rare)"],
        "interactions": ["Few significant drug interactions"],
        "contraindications": ["Women of childbearing potential", "Pediatric patients"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440039",
        "name": "Testosterone Gel 1%",
        "generic_name": "Testosterone",
        "brand_name": "AndroGel",
        "dosage_form": "gel",
        "strength": "1",
        "unit": "%",
        "color": "clear",
        "shape": "gel",
        "imprint": None,
        "instructions": "Apply to clean, dry skin of shoulders, upper arms, or abdomen each morning. Wash hands thoroughly after.",
        "warnings": "CONTROLLED SUBSTANCE. FDA BLACK BOX: Risk of transfer to women and children through skin contact - cover application site.",
        "side_effects": ["Skin irritation", "Increased PSA", "Acne", "Mood changes", "Sleep apnea", "Polycythemia"],
        "interactions": ["Anticoagulants (increased effect)", "Insulin (decreased requirements)", "Corticosteroids"],
        "contraindications": ["Breast or prostate cancer", "Severe heart failure", "Uncontrolled sleep apnea", "Women"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    # SUPPLEMENTS
    {
        "id": "550e8400-e29b-41d4-a716-446655440040",
        "name": "Calcium 600mg + Vitamin D3 400IU",
        "generic_name": "Calcium Carbonate",
        "brand_name": "Caltrate",
        "dosage_form": "tablet",
        "strength": "600/400",
        "unit": "mg/IU",
        "color": "white",
        "shape": "oval",
        "imprint": "CALTRATE",
        "instructions": "Take with food for best absorption. Take in divided doses if >500mg daily. Separate from other medications.",
        "warnings": "Excess calcium may increase cardiovascular risk. Do not exceed 2500mg calcium daily. Can cause constipation.",
        "side_effects": ["Constipation", "Gas", "Bloating", "Hypercalcemia (with excess)", "Kidney stones (in susceptible)"],
        "interactions": ["Bisphosphonates (take 2hrs apart)", "Levothyroxine (take 4hrs apart)", "Tetracyclines", "Iron"],
        "contraindications": ["Hypercalcemia", "Hypervitaminosis D", "Severe kidney disease", "Calcium kidney stones"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
    # BLOOD DISORDERS
    {
        "id": "550e8400-e29b-41d4-a716-446655440041",
        "name": "Ferrous Sulfate 325mg",
        "generic_name": "Ferrous Sulfate",
        "brand_name": "Feosol",
        "dosage_form": "tablet",
        "strength": "325",
        "unit": "mg",
        "color": "red",
        "shape": "round",
        "imprint": "FER 325",
        "instructions": "Take on empty stomach if tolerated. Take with vitamin C to enhance absorption. Separate from other medications.",
        "warnings": "POISON WARNING: Keep out of reach of children - accidental overdose is leading cause of poisoning death in children under 6.",
        "side_effects": ["Constipation", "Nausea", "Stomach upset", "Dark stools (harmless)", "Tooth staining (liquid forms)"],
        "interactions": ["Antacids (reduce absorption)", "Proton pump inhibitors", "Calcium", "Tetracyclines", "Levothyroxine"],
        "contraindications": ["Iron overload syndromes", "Hemolytic anemia", "Repeated blood transfusions"],
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440042",
        "name": "Folic Acid 1mg",
        "generic_name": "Folic Acid",
        "brand_name": "Generic",
        "dosage_form": "tablet",
        "strength": "1",
        "unit": "mg",
        "color": "yellow",
        "shape": "round",
        "imprint": "FA 1",
        "instructions": "Take once daily with or without food. Essential during pregnancy.",
        "warnings": "CRITICAL: Can mask vitamin B12 deficiency - ensure B12 status is checked if taking for anemia.",
        "side_effects": ["Generally well tolerated", "Nausea (rare)", "Bad taste (rare)"],
        "interactions": ["Methotrexate (antagonized by folic acid)", "Phenytoin", "Sulfasalazine"],
        "contraindications": ["Untreated vitamin B12 deficiency", "Pernicious anemia (unless B12 also given)"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    # RESPIRATORY
    {
        "id": "550e8400-e29b-41d4-a716-446655440043",
        "name": "Montelukast 10mg",
        "generic_name": "Montelukast",
        "brand_name": "Singulair",
        "dosage_form": "tablet",
        "strength": "10",
        "unit": "mg",
        "color": "beige",
        "shape": "square",
        "imprint": "SINGULAIR 10",
        "instructions": "Take once daily in the evening. May be taken with or without food. Not for acute asthma attacks.",
        "warnings": "FDA BLACK BOX: Serious mental health side effects including suicidal thoughts, agitation, aggression. Monitor closely.",
        "side_effects": ["Headache", "Stomach pain", "Fatigue", "Behavioral changes", "Dream abnormalities", "Depression"],
        "interactions": ["Few significant interactions", "Phenobarbital (reduces effectiveness)"],
        "contraindications": ["Hypersensitivity to montelukast"],
        "image_url": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440044",
        "name": "Fluticasone Nasal Spray 50mcg",
        "generic_name": "Fluticasone",
        "brand_name": "Flonase",
        "dosage_form": "nasal spray",
        "strength": "50",
        "unit": "mcg/spray",
        "color": "white",
        "shape": "suspension",
        "imprint": None,
        "instructions": "Shake well before each use. Prime before first use. Spray into each nostril 1-2 times daily.",
        "warnings": "Long-term use may affect growth in children. Rare risk of nasal septum perforation.",
        "side_effects": ["Nosebleeds", "Nasal irritation", "Headache", "Sore throat", "Unpleasant taste"],
        "interactions": ["Ritonavir (increases steroid exposure)", "Other corticosteroids (additive effects)"],
        "contraindications": ["Hypersensitivity to fluticasone", "Recent nasal surgery (until healed)"],
        "image_url": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80"
    },
    # MUSCLE RELAXANT
    {
        "id": "550e8400-e29b-41d4-a716-446655440045",
        "name": "Cyclobenzaprine 10mg",
        "generic_name": "Cyclobenzaprine",
        "brand_name": "Flexeril",
        "dosage_form": "tablet",
        "strength": "10",
        "unit": "mg",
        "color": "yellow",
        "shape": "round",
        "imprint": "FLEXERIL",
        "instructions": "Take three times daily. For acute use only (2-3 weeks). May cause significant drowsiness.",
        "warnings": "Very sedating - do not drive or operate machinery. Not recommended for elderly. Can cause serotonin syndrome with SSRIs.",
        "side_effects": ["Drowsiness (significant)", "Dry mouth", "Dizziness", "Fatigue", "Confusion", "Constipation"],
        "interactions": ["MAOIs (contraindicated)", "SSRIs (serotonin syndrome)", "CNS depressants", "Alcohol", "Tramadol"],
        "contraindications": ["MAOIs within 14 days", "Hyperthyroidism", "Arrhythmias", "Heart block", "Heart failure", "Recent MI"],
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"
    },
]

success_count = 0
error_count = 0

for med in additional_medications:
    cleaned_med = clean_med_data(med)
    try:
        # Try to insert the medication
        result = supabase.table("pills").insert(cleaned_med).execute()
        print(f"✓ Added: {med['name']}")
        success_count += 1
    except Exception as e:
        error_str = str(e)
        if "duplicate" in error_str.lower() or "23505" in error_str:
            # Try to update if it already exists
            try:
                result = supabase.table("pills").update(cleaned_med).eq("id", med["id"]).execute()
                print(f"↻ Updated: {med['name']}")
                success_count += 1
            except Exception as update_err:
                print(f"✗ Error updating {med['name']}: {update_err}")
                error_count += 1
        else:
            print(f"✗ Error adding {med['name']}: {e}")
            error_count += 1

print(f"\n{'='*50}")
print(f"✓ Successfully added/updated: {success_count} medications")
if error_count > 0:
    print(f"✗ Errors: {error_count}")
print(f"{'='*50}")

# Print summary of medication categories added
print("\nMedication categories added:")
print("  • Osteoporosis: Alendronate (Fosamax)")
print("  • Parkinson's Disease: Carbidopa-Levodopa (Sinemet)")
print("  • Epilepsy/Seizures: Levetiracetam (Keppra), Gabapentin (Neurontin)")
print("  • Gastrointestinal: Ondansetron (Zofran), Famotidine (Pepcid), Dicyclomine (Bentyl)")
print("  • Urology: Tamsulosin (Flomax), Oxybutynin (Ditropan)")
print("  • Sleep Disorders: Trazodone (Desyrel), Zolpidem (Ambien)")
print("  • Migraine: Sumatriptan (Imitrex), Topiramate (Topamax)")
print("  • Dermatology/Allergy: Hydroxyzine (Vistaril/Atarax)")
print("  • Eye Conditions: Latanoprost (Xalatan)")
print("  • Gout: Allopurinol (Zyloprim), Colchicine (Colcrys)")
print("  • Hormones: Finasteride (Proscar), Testosterone (AndroGel)")
print("  • Supplements: Calcium + Vitamin D3, Ferrous Sulfate, Folic Acid")
print("  • Respiratory: Montelukast (Singulair), Fluticasone (Flonase)")
print("  • Muscle Relaxants: Cyclobenzaprine (Flexeril)")
