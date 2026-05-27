"""
Pill detection API endpoints.
"""

from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel

from app.services.pill_detection_service import get_pill_detection_service, PillDetection
from app.core.database import upload_image_to_bucket, ensure_bucket_exists

router = APIRouter(prefix="/api/v1/pills", tags=["pills"])

# Response Models
class DetectionResult(BaseModel):
    """Single pill detection result"""
    confidence: float
    bbox: List[float]  # [x, y, width, height]

class PillDetectionResponse(BaseModel):
    """Response for pill detection endpoint"""
    success: bool
    pill_count: int
    bounded_image_url: str
    detections: List[DetectionResult]
    warnings: List[str]
    error: Optional[str] = None

@router.post("/detect", response_model=PillDetectionResponse)
async def detect_pills(
    image: UploadFile = File(..., description="Image file containing pills"),
    user_id: Optional[str] = Form(None, description="Optional user ID for tracking")
):
    """
    Detect pills in an uploaded image.
    
    This endpoint:
    1. Receives an image file
    2. Runs YOLO pill detection
    3. Draws bounding boxes on the image
    4. Uploads the annotated image to Supabase storage
    5. Returns detection results and the bounded image URL
    
    Args:
        image: Image file (JPEG, PNG)
        user_id: Optional user ID for tracking
        
    Returns:
        PillDetectionResponse with detection results and bounded image URL
    """
    try:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Only image files are supported."
            )
        
        # Read image data
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        detection_service = get_pill_detection_service()
        
        detections, annotated_image_bytes = detection_service.detect_and_annotate(
            image_data,
            conf_threshold=0.25,
            iou_threshold=0.45
        )
        
        # Prepare warnings
        warnings = []
        if len(detections) == 0:
            warnings.append("No pills detected in the image. Make sure the photo is clear and well-lit.")
        
        # Low confidence warning
        if detections:
            avg_confidence = sum(d.confidence for d in detections) / len(detections)
            if avg_confidence < 0.5:
                warnings.append("Low detection confidence. Consider retaking the photo with better lighting.")
        
        bucket_name = "bounded-pill-images"
        ensure_bucket_exists(bucket_name, public=True)
        
        file_extension = "jpg"  # Always save as JPEG
        filename = f"{uuid4()}.{file_extension}"
        file_path = f"pills/{filename}"
        
        # Upload annotated image to Supabase
        try:
            bounded_image_url = await upload_image_to_bucket(
                bucket_name=bucket_name,
                file_path=file_path,
                data=annotated_image_bytes,
                content_type="image/jpeg"
            )
        except Exception as storage_error:
            print(f"⚠️ Failed to upload to Supabase storage: {storage_error}")
            return PillDetectionResponse(
                success=True,
                pill_count=len(detections),
                bounded_image_url="",
                detections=[
                    DetectionResult(
                        confidence=d.confidence,
                        bbox=d.bbox
                    )
                    for d in detections
                ],
                warnings=warnings + ["Failed to upload image to storage"],
                error=f"Storage upload failed: {str(storage_error)}"
            )
        
        return PillDetectionResponse(
            success=True,
            pill_count=len(detections),
            bounded_image_url=bounded_image_url,
            detections=[
                DetectionResult(
                    confidence=d.confidence,
                    bbox=d.bbox
                )
                for d in detections
            ],
            warnings=warnings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in pill detection: {e}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Check if pill detection service is available"""
    try:
        detection_service = get_pill_detection_service()
        return {
            "status": "healthy",
            "model_path": detection_service.model_path,
            "model_loaded": detection_service.model is not None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
