# Pill Detection Backend - Testing Guide

## Prerequisites

1. Backend is running: `cd backend && uvicorn app.main:app --reload`
2. Supabase environment variables are configured
3. `pill-detection.pt` model is in the `backend/` directory
4. iOS Xcode project is open

## Backend Testing

### 1. Verify Backend Health

Check that the pill detection service loads correctly:

```bash
curl http://localhost:8000/api/v1/pills/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_path": "/path/to/pill-detection.pt",
  "model_loaded": true
}
```

### 2. Test Pill Detection Endpoint

Test with a sample image:

```bash
curl -X POST http://localhost:8000/api/v1/pills/detect \
  -F "image=@/path/to/test_pill_image.jpg" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "pill_count": 2,
  "bounded_image_url": "https://elynkmbekbbdocmstkjr.supabase.co/storage/v1/object/public/bounded-pill-images/pills/xxx.jpg",
  "detections": [
    {
      "confidence": 0.92,
      "bbox": [x, y, w, h]
    }
  ],
  "warnings": []
}
```

### 3. Verify Supabase Storage

1. Open Supabase dashboard: https://supabase.com/dashboard/project/elynkmbekbbdocmstkjr
2. Navigate to Storage
3. Check that `bounded-pill-images` bucket exists
4. Verify uploaded images appear in `pills/` folder
5. Test that images are publicly accessible by visiting the URL

## iOS Testing

### 1. Configure Backend URL

Update `Secrets.swift` or environment variables:

```swift
static let backendBaseURL = "http://localhost:8000"
// For device testing use your computer's IP: "http://192.168.1.xxx:8000"
```

### 2. Build and Run

1. Open `nexhacks-ios/nexhacks-ios.xcodeproj` in Xcode
2. Build the project (⌘B)
3. Run on simulator or device (⌘R)

### 3. Test Pill Verification Flow

#### Scenario 1: Correct Pill Count
1. Navigate to Medications tab
2. Select a medication that requires verification
3. Tap "Verify Dose"
4. Take/select a photo with the CORRECT number of pills
5. Wait for detection (should see bounded boxes)
6. Verify that:
   - Bounding boxes are visible on pills
   - Pill count matches expected
   - Green checkmark appears
   - "Confirm & Log Taken" button is enabled

#### Scenario 2: Incorrect Pill Count (Too Many)
1. Take/select a photo with MORE pills than expected
2. Verify that:
   - Bounding boxes appear
   - Red warning icon appears
   - "Too Many Pills" message displays
   - Overdose warning is shown
   - Cannot confirm without retaking

#### Scenario 3: Incorrect Pill Count (Too Few)
1. Take/select a photo with FEWER pills than expected
2. Verify that:
   - Bounding boxes appear
   - Red warning icon appears
   - "Not Enough Pills" message displays
   - Warning is shown
   - Cannot confirm without retaking

#### Scenario 4: Backend Unavailable (Fallback)
1. Stop the backend server
2. Take a photo of pills
3. Verify that:
   - App falls back to local YOLO detection
   - Still provides pill count (without bounded image)
   - Gracefully handles the error

#### Scenario 5: Claude Verification with Bounded Image
1. Take a photo of pills
2. Wait for backend detection
3. Verify that bounded image is sent to Claude
4. Check console logs for confirmation
5. Verify Claude's verification result

### 4. Check Console Logs

Look for these log messages:
- `📸 Sending image to backend for pill detection...`
- `✅ Backend detection complete: X pills detected`
- `📥 Downloading bounded image from: ...`
- `✅ Bounded image downloaded successfully`
- `🤖 Sending bounded image to Claude for verification`

## Common Issues and Troubleshooting

### Backend Issues

#### Issue: Model Not Found
```
FileNotFoundError: Model file not found: pill-detection.pt
```
**Solution**: Ensure `pill-detection.pt` is in the `backend/` directory

#### Issue: Supabase Storage Upload Fails
```
Failed to upload to Supabase storage
```
**Solution**: 
- Check SUPABASE_URL and SUPABASE_KEY environment variables
- Verify Supabase project is active
- Check if bucket permissions allow uploads

#### Issue: OpenCV/Ultralytics Import Errors
**Solution**:
```bash
cd backend
pip install ultralytics opencv-python numpy
```

### iOS Issues

#### Issue: Backend Connection Failed
```
Network error: Could not connect to the server
```
**Solution**:
- Check backend is running: `curl http://localhost:8000/health`
- If testing on device, use computer's IP address instead of localhost
- Check firewall settings

#### Issue: Secrets.swift Not Found
**Solution**: Create `Secrets.swift` file:
```swift
struct Secrets {
    static let claudeApiKey = "your-api-key"
    static let backendBaseURL = "http://localhost:8000"
}
```

#### Issue: Image Download Fails
**Solution**:
- Check bounded image URL is valid
- Verify Supabase bucket is public
- Check network connectivity

## Performance Testing

### Backend Performance
- Detection time should be < 2 seconds per image
- Bounding box drawing should be < 500ms
- Upload to Supabase should be < 1 second

### iOS Performance
- Backend API call should complete within 5 seconds
- Image download should be < 2 seconds
- Total verification flow should be < 10 seconds

## Manual Test Checklist

- [ ] Backend health check passes
- [ ] Backend can detect pills in test image
- [ ] Bounded images are uploaded to Supabase
- [ ] iOS can connect to backend
- [ ] iOS shows bounded image in UI
- [ ] Correct pill count scenario works
- [ ] Incorrect pill count (too many) scenario works
- [ ] Incorrect pill count (too few) scenario works
- [ ] Backend fallback works when server unavailable
- [ ] Claude receives bounded image for verification
- [ ] No console errors during normal flow
- [ ] Retake photo resets state correctly

## Automated Testing (Future)

### Backend Unit Tests
```python
# backend/tests/test_pill_detection.py
def test_pill_detection_service():
    service = PillDetectionService()
    # Test with sample image
    pass

def test_detect_endpoint():
    # Test FastAPI endpoint
    pass
```

### iOS Unit Tests
```swift
// Test BackendAPIService
func testPillDetection() async throws {
    let service = BackendAPIService()
    // Test with mock data
}
```

## Success Criteria

✅ Backend successfully detects pills and draws bounding boxes
✅ Bounded images are stored in Supabase
✅ iOS retrieves and displays bounded images
✅ Claude verification uses bounded images
✅ Graceful fallback when backend unavailable
✅ User sees visual feedback of detected pills
✅ Correct pill count verification works end-to-end
