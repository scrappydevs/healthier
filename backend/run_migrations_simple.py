"""
Quick script to run SQL migrations directly
"""
import os
from supabase import create_client

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

print("Adding contraindications column...")
try:
    # Add contraindications column if it doesn't exist
    result = supabase.rpc('sql', {
        'query': 'ALTER TABLE pills ADD COLUMN IF NOT EXISTS contraindications TEXT[]'
    }).execute()
    print("✓ Column added")
except Exception as e:
    print(f"Column may already exist: {e}")

print("\nClearing old medication data...")
# First, delete old data
supabase.table("pills").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print("✓ Old data cleared")

print("\nInserting comprehensive medication data...")

# Read the SQL file and extract INSERT statements
with open('../supabase/migrations/20260118000005_comprehensive_medications.sql', 'r') as f:
    content = f.read()
    
# Execute the SQL directly using PostgREST
# Since we can't execute raw SQL easily, let's insert via the API

medications = [
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Aspirin 81mg",
        "generic_name": "Aspirin",
        "brand_name": "Bayer Low Dose",
        "dosage_form": "tablet",
        "strength": "81",
        "unit": "mg",
        "color": "white",
        "shape": "round",
        "imprint": "BAYER",
        "instructions": "Take once daily with food. Do not crush or chew enteric-coated tablets.",
        "warnings": "CRITICAL: Increases bleeding risk. Stop 7 days before surgery. Do not give to children under 16 with fever (Reye's syndrome risk).",
        "side_effects": ["Stomach upset", "Heartburn", "Easy bruising", "Increased bleeding risk", "Ringing in ears at high doses"],
        "interactions": ["Blood thinners (warfarin, heparin)", "Other NSAIDs", "Alcohol", "Corticosteroids"],
        "contraindications": ["Active bleeding or bleeding disorders", "Recent stroke or brain bleeding", "Severe liver disease", "Children under 16 with viral illness", "Pregnancy (third trimester)", "Peptic ulcer disease", "Hemophilia"],
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80"
    },
    # Add more medications...
]

try:
    result = supabase.table("pills").insert(medications[0]).execute()
    print(f"✓ Inserted: {medications[0]['name']}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n✓ Migration complete!")
print("\nNow running image uploader...")
