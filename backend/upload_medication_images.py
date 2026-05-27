"""
Medication Image Uploader - Using curated medical stock photos
Downloads high-quality medication images and uploads to Supabase Storage
"""

import os
import requests
from typing import Optional
from pathlib import Path
import time
from supabase import create_client, Client

# Curated medication images from Unsplash (free to use, attribution not required for web apps)
MEDICATION_IMAGES = {
    "550e8400-e29b-41d4-a716-446655440001": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",  # Aspirin - white pills
    "550e8400-e29b-41d4-a716-446655440002": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",  # Lisinopril - pink pills
    "550e8400-e29b-41d4-a716-446655440003": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",  # Metoprolol - white tablets
    "550e8400-e29b-41d4-a716-446655440004": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80",  # Warfarin - peach pills
    "550e8400-e29b-41d4-a716-446655440005": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",  # Metformin - white pills
    "550e8400-e29b-41d4-a716-446655440006": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",  # Insulin - injection
    "550e8400-e29b-41d4-a716-446655440007": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80",  # Amoxicillin - capsules
    "550e8400-e29b-41d4-a716-446655440008": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",  # Azithromycin - pink tablets
    "550e8400-e29b-41d4-a716-446655440009": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",  # Ciprofloxacin - white oval
    "550e8400-e29b-41d4-a716-446655440010": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",  # Sertraline - blue capsule
    "550e8400-e29b-41d4-a716-446655440011": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",  # Alprazolam - white oval
    "550e8400-e29b-41d4-a716-446655440012": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",  # Ibuprofen - brown round
    "550e8400-e29b-41d4-a716-446655440013": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",  # Tramadol - white
    "550e8400-e29b-41d4-a716-446655440014": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",  # Atorvastatin - white elliptical
    "550e8400-e29b-41d4-a716-446655440015": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",  # Levothyroxine - white round
    "550e8400-e29b-41d4-a716-446655440016": "https://images.unsplash.com/photo-1550572017-4e23e4ea8c15?w=800&q=80",  # Omeprazole - purple capsule
    "550e8400-e29b-41d4-a716-446655440017": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",  # Cetirizine - white round
    "550e8400-e29b-41d4-a716-446655440018": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",  # Prednisone - white round
    "550e8400-e29b-41d4-a716-446655440019": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80",  # Furosemide - white round
    "550e8400-e29b-41d4-a716-446655440020": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",  # Albuterol - inhaler
}

class MedicationImageUploader:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.bucket_name = "medication-images"
        self.temp_dir = Path("./temp_medication_images")
        self.temp_dir.mkdir(exist_ok=True)
        
    def setup_storage_bucket(self):
        """Create medication-images bucket if it doesn't exist"""
        try:
            self.supabase.storage.create_bucket(
                self.bucket_name,
                options={"public": True}
            )
            print(f"✓ Created bucket: {self.bucket_name}")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"✓ Bucket already exists: {self.bucket_name}")
            else:
                print(f"✗ Error creating bucket: {e}")
    
    def download_image(self, url: str, filename: str) -> Optional[Path]:
        """Download image from URL"""
        try:
            response = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (Healthier Medical App)"
            })
            
            if response.status_code == 200:
                filepath = self.temp_dir / filename
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                print(f"  ✓ Downloaded {len(response.content)} bytes")
                return filepath
            else:
                print(f"  ✗ Download failed: HTTP {response.status_code}")
        except Exception as e:
            print(f"  ✗ Download error: {e}")
        
        return None
    
    def upload_to_supabase(self, filepath: Path, medication_id: str) -> Optional[str]:
        """Upload image to Supabase Storage and return public URL"""
        try:
            filename = f"{medication_id}.jpg"
            
            with open(filepath, 'rb') as f:
                content = f.read()
                
                try:
                    self.supabase.storage.from_(self.bucket_name).remove([filename])
                except:
                    pass  # File may not exist
                
                # Upload to Supabase Storage
                self.supabase.storage.from_(self.bucket_name).upload(
                    filename,
                    content,
                    file_options={"content-type": "image/jpeg", "upsert": "true"}
                )
            
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(filename)
            print(f"  ✓ Uploaded to Supabase")
            return public_url
            
        except Exception as e:
            print(f"  ✗ Upload error: {e}")
            import traceback
            traceback.print_exc()
        
        return None
    
    def update_database(self, medication_id: str, image_url: str):
        """Update pills table with new image URL"""
        try:
            result = self.supabase.table("pills").update({
                "image_url": image_url
            }).eq("id", medication_id).execute()
            print(f"  ✓ Updated database")
        except Exception as e:
            print(f"  ✗ Database update error: {e}")
            import traceback
            traceback.print_exc()
    
    def process_medication(self, medication_id: str, image_url: str):
        """Process a single medication: download image, upload, update DB"""
        print(f"\nProcessing: {medication_id[:8]}...")
        
        # Download image
        filename = f"{medication_id}.jpg"
        filepath = self.download_image(image_url, filename)
        
        if not filepath:
            return False
        
        # Upload to Supabase
        storage_url = self.upload_to_supabase(filepath, medication_id)
        
        if not storage_url:
            return False
        
        self.update_database(medication_id, storage_url)
        
        # Clean up temp file
        try:
            filepath.unlink()
        except:
            pass
        
        print(f"  ✓ Complete")
        return True
    
    def process_all(self):
        """Process all medications"""
        print("\n" + "="*60)
        print("MEDICATION IMAGE UPLOADER")
        print("="*60)
        
        self.setup_storage_bucket()
        
        success_count = 0
        fail_count = 0
        
        for med_id, image_url in MEDICATION_IMAGES.items():
            try:
                if self.process_medication(med_id, image_url):
                    success_count += 1
                else:
                    fail_count += 1
                
                # Rate limiting
                time.sleep(0.5)
            except Exception as e:
                print(f"  ✗ Error processing {med_id}: {e}")
                fail_count += 1
        
        print("\n" + "="*60)
        print(f"SUMMARY: {success_count} successful, {fail_count} failed")
        print("="*60)
        
        try:
            self.temp_dir.rmdir()
        except:
            pass

def main():
    """Main entry point"""
    import sys
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables required")
        sys.exit(1)
    
    print(f"Using Supabase: {supabase_url}")
    
    uploader = MedicationImageUploader(supabase_url, supabase_key)
    uploader.process_all()

if __name__ == "__main__":
    main()
