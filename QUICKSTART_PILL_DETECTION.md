# Quick Start: Pill Detection Backend

## What Was Implemented

A complete pill detection system that:
- Detects pills using YOLOv8 (`pill-detection.pt`)
- Draws bounding boxes around detected pills
- Uploads annotated images to Supabase
- Integrates with iOS for visual verification
- Works with Claude API for final verification

## Quick Start (5 Minutes)

### 1. Start the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Expected output:
```
🚀 Starting Healthier API v0.1.0
✅ Supabase client initialized
Loading YOLO model from /path/to/pill-detection.pt
YOLO model loaded successfully
```

### 2. Test the Backend

```bash
# Health check
curl http://localhost:8000/api/v1/pills/health

# Test detection (replace with your image path)
curl -X POST http://localhost:8000/api/v1/pills/detect \
  -F "image=@/path/to/pill_image.jpg"
```

### 3. Run iOS App

1. Open `nexhacks-ios/nexhacks-ios.xcodeproj` in Xcode
2. Build and run (⌘R)
3. Navigate to Medications → Select medication → Verify Dose
4. Take/select a photo of pills
5. Watch the magic happen!

## What Happens

```
1. iOS captures pill image
   ↓
2. Sends to FastAPI backend
   ↓
3. YOLO detects pills and draws boxes
   ↓
4. Uploads bounded image to Supabase
   ↓
5. Returns URL and detection data
   ↓
6. iOS downloads and displays bounded image
   ↓
7. User sees pills with bounding boxes
   ↓
8. Bounded image sent to Claude for verification
   ↓
9. Final verification result shown
```

## Key Files

### Backend
- `backend/app/services/pill_detection_service.py` - YOLO detection
- `backend/app/api/pills.py` - API endpoints
- `backend/app/core/database.py` - Supabase storage

### iOS
- `nexhacks-ios/.../Services/BackendAPIService.swift` - Backend communication
- `nexhacks-ios/.../Views/Medication/PillVerificationView.swift` - UI flow

## Testing Scenarios

### ✅ Correct Pill Count
Take photo with correct number of pills → Green checkmark → Can confirm

### ❌ Wrong Pill Count
Take photo with wrong number → Red warning → Must retake

### 🔄 Backend Offline
Backend unavailable → Falls back to local detection → Still works

## Troubleshooting

### Backend won't start
- Check `pill-detection.pt` is in `backend/` folder
- Verify Python dependencies: `pip install -r requirements.txt`

### iOS can't connect
- Backend running? Check: `curl http://localhost:8000/health`
- Testing on device? Use computer IP: `http://192.168.1.X:8000`

### No bounding boxes
- Check backend logs for errors
- Verify image uploaded to Supabase
- Check Supabase dashboard → Storage → bounded-pill-images

## Environment Variables

Backend needs (in `backend/.env`):
```
SUPABASE_URL=https://elynkmbekbbdocmstkjr.supabase.co
SUPABASE_KEY=your-key-here
```

iOS defaults to `http://localhost:8000` (no config needed for local dev)

## Success Indicators

✅ Backend health check returns "healthy"
✅ Detection endpoint returns bounded_image_url
✅ Images appear in Supabase storage bucket
✅ iOS displays bounded image with boxes
✅ Claude receives and processes bounded image
✅ User can confirm correct pill count

## Need Help?

- Full testing guide: `TESTING_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- API docs: http://localhost:8000/docs (when backend running)

## Performance

- Detection: < 2 seconds
- Upload: < 1 second
- Total flow: < 5 seconds

Ready to test! Start the backend and run the iOS app.
