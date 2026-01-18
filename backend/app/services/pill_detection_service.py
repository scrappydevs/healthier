"""
Pill Detection Service using YOLOv8 model.
Detects pills in images and draws bounding boxes with confidence scores.
"""

import os
from pathlib import Path
from typing import List, Tuple
import numpy as np
import cv2
from ultralytics import YOLO
from PIL import Image
import io


class PillDetection:
    """Single pill detection result"""
    def __init__(self, bbox: List[float], confidence: float, class_id: int = 0):
        self.bbox = bbox  # [x, y, width, height]
        self.confidence = confidence
        self.class_id = class_id


class PillDetectionService:
    """Service for detecting pills in images using YOLOv8"""
    
    def __init__(self, model_path: str = None):
        """
        Initialize the pill detection service.
        
        Args:
            model_path: Path to the YOLO model file. Defaults to pill-detection.pt in backend root.
        """
        if model_path is None:
            # Default to pill-detection.pt in backend directory
            backend_dir = Path(__file__).parent.parent.parent
            model_path = str(backend_dir / "pill-detection.pt")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        print(f"Loading YOLO model from {model_path}")
        self.model = YOLO(model_path)
        self.model_path = model_path
        print("YOLO model loaded successfully")
    
    def detect_pills(
        self, 
        image_data: bytes,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45
    ) -> Tuple[List[PillDetection], np.ndarray]:
        """
        Detect pills in an image.
        
        Args:
            image_data: Image data as bytes
            conf_threshold: Confidence threshold for detections
            iou_threshold: IoU threshold for NMS
            
        Returns:
            Tuple of (detections list, original image as numpy array)
        """
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert PIL to numpy array (RGB)
        img_array = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV (YOLO expects BGR)
        if len(img_array.shape) == 2:  # Grayscale
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
        elif img_array.shape[2] == 4:  # RGBA
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
        else:  # RGB
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        # Run inference
        results = self.model.predict(
            img_bgr,
            conf=conf_threshold,
            iou=iou_threshold,
            verbose=False
        )
        
        # Parse detections
        detections = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for i in range(len(boxes)):
                # Get box coordinates (xyxy format)
                xyxy = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = xyxy
                
                # Convert to xywh format
                x = float(x1)
                y = float(y1)
                w = float(x2 - x1)
                h = float(y2 - y1)
                
                confidence = float(boxes.conf[i].cpu().numpy())
                class_id = int(boxes.cls[i].cpu().numpy()) if len(boxes.cls) > 0 else 0
                
                detections.append(PillDetection(
                    bbox=[x, y, w, h],
                    confidence=confidence,
                    class_id=class_id
                ))
        
        return detections, img_bgr
    
    def draw_bounding_boxes(
        self,
        image: np.ndarray,
        detections: List[PillDetection],
        color: Tuple[int, int, int] = (0, 255, 0),
        thickness: int = 3,
        font_scale: float = 0.8
    ) -> np.ndarray:
        """
        Draw bounding boxes on the image.
        
        Args:
            image: Image as numpy array (BGR format)
            detections: List of pill detections
            color: BGR color for boxes (default: green)
            thickness: Line thickness
            font_scale: Font scale for labels
            
        Returns:
            Image with bounding boxes drawn
        """
        img_with_boxes = image.copy()
        
        for i, detection in enumerate(detections):
            x, y, w, h = detection.bbox
            confidence = detection.confidence
            
            # Convert to integers
            x1, y1 = int(x), int(y)
            x2, y2 = int(x + w), int(y + h)
            
            # Draw rectangle
            cv2.rectangle(img_with_boxes, (x1, y1), (x2, y2), color, thickness)
            
            # Prepare label
            label = f"Pill #{i+1}: {confidence:.2f}"
            
            # Get label size for background
            (label_w, label_h), baseline = cv2.getTextSize(
                label, 
                cv2.FONT_HERSHEY_SIMPLEX, 
                font_scale, 
                thickness=2
            )
            
            # Draw label background
            cv2.rectangle(
                img_with_boxes,
                (x1, y1 - label_h - baseline - 5),
                (x1 + label_w, y1),
                color,
                -1
            )
            
            # Draw label text
            cv2.putText(
                img_with_boxes,
                label,
                (x1, y1 - baseline - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),  # White text
                thickness=2
            )
        
        # Add pill count at the top
        if detections:
            count_label = f"Total Pills Detected: {len(detections)}"
            cv2.putText(
                img_with_boxes,
                count_label,
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.2,
                (0, 255, 0),
                thickness=3
            )
        
        return img_with_boxes
    
    def detect_and_annotate(
        self,
        image_data: bytes,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45
    ) -> Tuple[List[PillDetection], bytes]:
        """
        Detect pills and return annotated image.
        
        Args:
            image_data: Image data as bytes
            conf_threshold: Confidence threshold for detections
            iou_threshold: IoU threshold for NMS
            
        Returns:
            Tuple of (detections list, annotated image as JPEG bytes)
        """
        # Detect pills
        detections, img_bgr = self.detect_pills(
            image_data, 
            conf_threshold, 
            iou_threshold
        )
        
        # Draw bounding boxes
        img_with_boxes = self.draw_bounding_boxes(img_bgr, detections)
        
        # Convert back to JPEG bytes
        success, buffer = cv2.imencode('.jpg', img_with_boxes)
        if not success:
            raise RuntimeError("Failed to encode image with bounding boxes")
        
        return detections, buffer.tobytes()


# Global instance (lazy loaded)
_pill_detection_service: PillDetectionService = None


def get_pill_detection_service() -> PillDetectionService:
    """Get or create the global pill detection service instance"""
    global _pill_detection_service
    
    if _pill_detection_service is None:
        _pill_detection_service = PillDetectionService()
    
    return _pill_detection_service
