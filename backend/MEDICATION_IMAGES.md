# Medication Image Uploader

Automatically downloads real medication images from FDA DailyMed and uploads them to Supabase Storage.

## What It Does

1. **Searches FDA DailyMed** for official medication images using NDC codes
2. **Downloads images** to temporary local storage
3. **Uploads to Supabase Storage** (your medication-images bucket)
4. **Updates database** with public storage URLs
5. **Cleans up** temporary files

## Setup

### 1. Get Your Supabase Credentials

From your Supabase project:
- Go to Settings → API
- Copy your `SUPABASE_URL`
- Copy your `service_role` key (NOT the anon key - you need service role for storage uploads)

### 2. (Optional) Get Pexels API Key

For fallback stock photos if FDA images aren't available:
- Go to https://www.pexels.com/api/
- Sign up for free API key
- 200 requests/hour free

### 3. Set Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key-here"
export PEXELS_API_KEY="your-pexels-key"  # Optional
```

Or use your `.env` file (backend will load it).

### 4. Run the Script

```bash
cd backend
python upload_medication_images.py
```

## What Gets Created

The script will:

1. **Create Supabase Storage Bucket**: `medication-images` (public access)
2. **Download 20 medication images** from FDA DailyMed
3. **Upload to Supabase Storage** with URLs like:
   ```
   https://your-project.supabase.co/storage/v1/object/public/medication-images/550e8400-e29b-41d4-a716-446655440001.jpg
   ```
4. **Update pills table** with the new image_url values

## Medications Included

The script processes these 20 medications:

- Aspirin 81mg (Bayer)
- Lisinopril 10mg
- Metoprolol 50mg
- Warfarin 5mg
- Metformin 500mg
- Insulin Glargine (Lantus)
- Amoxicillin 500mg
- Azithromycin 250mg
- Ciprofloxacin 500mg
- Sertraline 50mg (Zoloft)
- Alprazolam 0.5mg (Xanax)
- Ibuprofen 200mg
- Tramadol 50mg
- Atorvastatin 20mg (Lipitor)
- Levothyroxine 50mcg (Synthroid)
- Omeprazole 20mg (Prilosec)
- Cetirizine 10mg (Zyrtec)
- Prednisone 10mg
- Furosemide 40mg (Lasix)
- Albuterol Inhaler (ProAir)

## Image Sources

1. **Primary: FDA DailyMed**
   - Official medication label images
   - High quality, accurate
   - Free to use for medical purposes

2. **Fallback: Pexels (if API key provided)**
   - Stock medication photos
   - Free to use commercially
   - Backup when FDA images unavailable

## Troubleshooting

### "Bucket already exists" 
This is fine - script will use existing bucket.

### "No image found"
Some medications may not have images in DailyMed. The script will continue with others.

### Storage permission errors
Make sure you're using the `service_role` key, not the `anon` key.

### Rate limiting
Script includes 1-second delay between requests. If you hit limits, just run again for failed ones.

## Cleanup

Temporary images are automatically deleted after upload. The `temp_medication_images` folder is removed when complete.

## Production Notes

- Images are cached in Supabase Storage (CDN)
- Public URLs work directly in your app
- No need to re-run unless adding new medications
- Consider setting up CDN caching policies in Supabase

## License & Legal

- FDA DailyMed images: Public domain (US Government)
- Pexels images: Pexels License (free commercial use)
- This script: MIT License

Always verify medication images match the actual product before clinical use.
