"""
Update existing medications in database with images
"""
import os
import requests
from supabase import create_client
import time

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing credentials")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# Generic medication images from Unsplash
IMAGE_URLS = {
    "lisinopril": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
    "metformin": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    "amlodipine": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",
    "omeprazole": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
    "hydrochlorothiazide": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",
    "warfarin": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80",
    "atorvastatin": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",
    "aspirin": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
}

print("="*60)
print("UPDATING MEDICATION IMAGES")
print("="*60)

# Get all pills
result = supabase.table('pills').select('id, name, generic_name, image_url').execute()

success_count = 0
for pill in result.data:
    generic = (pill.get('generic_name') or pill.get('name', '')).lower().split()[0]
    
    # Get image URL for this medication
    image_url = IMAGE_URLS.get(generic)
    
    if image_url:
        print(f"\n{pill['name']}...")
        try:
            # Update the database
            supabase.table('pills').update({
                'image_url': image_url
            }).eq('id', pill['id']).execute()
            print(f"  ✓ Updated with image")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
    else:
        print(f"\n{pill['name']} - No image URL found")

print("\n" + "="*60)
print(f"COMPLETE: Updated {success_count}/{len(result.data)} medications")
print("="*60)
