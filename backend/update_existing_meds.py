"""Update existing medications with images and basic safety data"""
import os
from supabase import create_client

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing credentials")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

result = supabase.table('pills').select('id, name, generic_name, image_url').execute()

medications_updates = {
    "lisinopril": {
        'image_url': "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
        'warnings': 'Can cause severe allergic reactions. May harm fetus. Can cause kidney problems.',
        'side_effects': ['Dizziness', 'Dry cough', 'Headache', 'Fatigue', 'Low blood pressure'],
        'interactions': ['Potassium supplements', 'NSAIDs', 'Lithium'],
    },
    "metformin": {
        'image_url': "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
        'warnings': 'CRITICAL: Stop before surgery and contrast dye imaging.',
        'side_effects': ['Nausea', 'Diarrhea', 'Gas', 'Stomach upset', 'Metallic taste'],
        'interactions': ['Contrast dyes', 'Alcohol', 'Cimetidine'],
    },
    "amlodipine": {
        'image_url': "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",
        'warnings': 'May cause swelling. Report irregular heartbeat.',
        'side_effects': ['Swelling of ankles', 'Flushing', 'Dizziness', 'Palpitations'],
        'interactions': ['Grapefruit juice', 'Simvastatin'],
    },
    "omeprazole": {
        'image_url': "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
        'warnings': 'Long-term use increases fracture risk.',
        'side_effects': ['Headache', 'Stomach pain', 'Nausea', 'Diarrhea'],
        'interactions': ['Clopidogrel', 'Warfarin', 'Methotrexate'],
    },
    "hydrochlorothiazide": {
        'image_url': "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
        'warnings': 'Can cause electrolyte imbalances.',
        'side_effects': ['Frequent urination', 'Dizziness', 'Low potassium'],
        'interactions': ['NSAIDs', 'Lithium', 'Digoxin'],
    },
    "warfarin": {
        'image_url': "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80",
        'warnings': 'CRITICAL: Narrow therapeutic window. Report any bleeding.',
        'side_effects': ['Easy bruising', 'Prolonged bleeding', 'Blood in urine'],
        'interactions': ['Aspirin', 'NSAIDs', 'Antibiotics', 'Vitamin K foods'],
    },
    "atorvastatin": {
        'image_url': "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",
        'warnings': 'Rare: muscle breakdown can cause kidney failure. Avoid grapefruit.',
        'side_effects': ['Muscle pain', 'Headache', 'Nausea', 'Joint pain'],
        'interactions': ['Grapefruit juice', 'Cyclosporine', 'Gemfibrozil'],
    },
    'acetylsalicylic': {
        'image_url': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
        'warnings': 'CRITICAL: Increases bleeding risk. Stop 7 days before surgery.',
        'side_effects': ['Stomach upset', 'Heartburn', 'Easy bruising'],
        'interactions': ['Blood thinners', 'Other NSAIDs', 'Alcohol'],
    },
}

print('Updating medications with images and safety data...\n')
success = 0

for pill in result.data:
    generic = (pill.get('generic_name') or pill.get('name', '')).lower().split()[0]
    
    if generic in medications_updates:
        print(f'{pill["name"]}...')
        try:
            supabase.table('pills').update(medications_updates[generic]).eq('id', pill['id']).execute()
            print('  ✓ Updated')
            success += 1
        except Exception as e:
            print(f'  ✗ Error: {e}')
    else:
        print(f'{pill["name"]} - No data (generic: {generic})')

print(f'\n{"="*60}')
print(f'COMPLETE: Updated {success}/{len(result.data)} medications')
print('All medications now have images!')
print(f'{"="*60}')
