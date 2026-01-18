"""
Pose Analysis Service - YOLO11-pose for exercise video analysis
Extracts joint angles, symmetry, and generates natural language summaries
"""

import logging
import tempfile
import os
import math
import threading
from typing import Dict, List, Optional, Any
import numpy as np

logger = logging.getLogger(__name__)

# Thread-safe singleton for YOLO model
_pose_model = None
_model_lock = threading.Lock()

# COCO 17-point keypoint definitions
KEYPOINT_NAMES = {
    0: "nose", 1: "left_eye", 2: "right_eye", 3: "left_ear", 4: "right_ear",
    5: "left_shoulder", 6: "right_shoulder", 7: "left_elbow", 8: "right_elbow",
    9: "left_wrist", 10: "right_wrist", 11: "left_hip", 12: "right_hip",
    13: "left_knee", 14: "right_knee", 15: "left_ankle", 16: "right_ankle",
}

# Joint angle definitions: (point1, vertex, point2)
JOINT_ANGLES = {
    "left_elbow": (5, 7, 9),    # shoulder -> elbow -> wrist
    "right_elbow": (6, 8, 10),
    "left_knee": (11, 13, 15),  # hip -> knee -> ankle
    "right_knee": (12, 14, 16),
    "left_hip": (5, 11, 13),    # shoulder -> hip -> knee
    "right_hip": (6, 12, 14),
    "left_shoulder": (7, 5, 11),  # elbow -> shoulder -> hip
    "right_shoulder": (8, 6, 12),
}


def get_pose_model():
    """Thread-safe lazy loading of YOLO11s-pose model with double-checked locking."""
    global _pose_model
    if _pose_model is None:
        with _model_lock:
            # Double-check inside lock to prevent multiple loads
            if _pose_model is None:
                try:
                    from ultralytics import YOLO
                    logger.info("Loading YOLOv8s-pose model...")
                    _pose_model = YOLO("yolov8s-pose.pt")
                    logger.info("YOLOv8s-pose model loaded successfully")
                except Exception as e:
                    logger.error(f"Failed to load YOLO pose model: {e}")
                    return None
    return _pose_model


def calculate_angle(p1: Dict, p2: Dict, p3: Dict) -> Optional[float]:
    """Calculate angle at p2 given three points."""
    if not all([p1.get("visibility", 0) > 0.3, p2.get("visibility", 0) > 0.3, p3.get("visibility", 0) > 0.3]):
        return None
    
    v1 = np.array([p1["x"] - p2["x"], p1["y"] - p2["y"]])
    v2 = np.array([p3["x"] - p2["x"], p3["y"] - p2["y"]])
    
    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    cos_angle = np.clip(cos_angle, -1, 1)
    angle = np.degrees(np.arccos(cos_angle))
    
    return float(angle)


def extract_joint_angles(keypoints: List[Dict]) -> Dict[str, Optional[float]]:
    """Extract all joint angles from keypoints."""
    angles = {}
    for name, (i1, i2, i3) in JOINT_ANGLES.items():
        if len(keypoints) > max(i1, i2, i3):
            angles[name] = calculate_angle(keypoints[i1], keypoints[i2], keypoints[i3])
        else:
            angles[name] = None
    return angles


def analyze_symmetry(angles: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """Analyze left/right symmetry for bilateral joints."""
    symmetry = {}
    pairs = [
        ("left_elbow", "right_elbow"),
        ("left_knee", "right_knee"),
        ("left_hip", "right_hip"),
        ("left_shoulder", "right_shoulder"),
    ]
    
    for left, right in pairs:
        left_val = angles.get(left)
        right_val = angles.get(right)
        
        if left_val is not None and right_val is not None:
            diff = abs(left_val - right_val)
            joint_name = left.replace("left_", "")
            symmetry[joint_name] = {
                "left": round(left_val, 1),
                "right": round(right_val, 1),
                "difference": round(diff, 1),
                "symmetric": diff < 15,  # <15° is considered symmetric
            }
    
    return symmetry


# Skeleton connections for drawing
SKELETON_CONNECTIONS = [
    (5, 6),   # shoulders
    (5, 7), (7, 9),   # left arm
    (6, 8), (8, 10),  # right arm
    (5, 11), (6, 12), # torso sides
    (11, 12),  # hips
    (11, 13), (13, 15),  # left leg
    (12, 14), (14, 16),  # right leg
]


def draw_pose_on_frame(frame, keypoints_raw, width, height):
    """Draw pose skeleton and keypoints on a frame with smooth, clean styling."""
    import cv2
    
    # Softer, more pleasing colors (BGR)
    KEYPOINT_COLOR = (100, 220, 255)  # Soft orange/peach
    SKELETON_COLOR = (200, 255, 150)  # Soft lime green
    OUTLINE_COLOR = (50, 50, 50)      # Dark gray (softer than black)
    
    # Scale sizes based on video resolution - smaller, cleaner
    scale = max(width, height) / 1000
    KEYPOINT_RADIUS = max(4, int(6 * scale))   # Smaller keypoints
    LINE_THICKNESS = max(2, int(3 * scale))    # Thinner lines
    OUTLINE_THICKNESS = max(1, int(1 * scale))
    
    # Draw skeleton lines first (so joints draw on top)
    for (start_idx, end_idx) in SKELETON_CONNECTIONS:
        if start_idx < len(keypoints_raw) and end_idx < len(keypoints_raw):
            start_kp = keypoints_raw[start_idx]
            end_kp = keypoints_raw[end_idx]
            
            # Check visibility
            if start_kp[2] > 0.3 and end_kp[2] > 0.3:
                start_pt = (int(start_kp[0]), int(start_kp[1]))
                end_pt = (int(end_kp[0]), int(end_kp[1]))
                # Draw soft outline for depth
                cv2.line(frame, start_pt, end_pt, OUTLINE_COLOR, LINE_THICKNESS + 2, cv2.LINE_AA)
                # Draw colored line with anti-aliasing
                cv2.line(frame, start_pt, end_pt, SKELETON_COLOR, LINE_THICKNESS, cv2.LINE_AA)
    
    # Draw keypoints on top
    for kp in keypoints_raw:
        if kp[2] > 0.3:  # Visibility threshold
            pt = (int(kp[0]), int(kp[1]))
            # Draw soft outline
            cv2.circle(frame, pt, KEYPOINT_RADIUS + OUTLINE_THICKNESS, OUTLINE_COLOR, -1, cv2.LINE_AA)
            # Draw filled keypoint with anti-aliasing
            cv2.circle(frame, pt, KEYPOINT_RADIUS, KEYPOINT_COLOR, -1, cv2.LINE_AA)
    
    return frame


def process_video_frames(
    video_path: str, 
    sample_rate: int = 5,
    output_video_path: str = None,
) -> Dict[str, Any]:
    """
    Process video and extract pose data from sampled frames.
    Optionally generates a processed video with pose overlay.
    
    Args:
        video_path: Path to video file
        sample_rate: Process every Nth frame for analysis
        output_video_path: If provided, generates processed video with pose overlay
        
    Returns:
        Dict with frame data, aggregated metrics, and statistics
    """
    import cv2
    
    model = get_pose_model()
    if model is None:
        return {"error": "Pose model not available"}
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video"}
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Video writer for processed output
    video_writer = None
    if output_video_path:
        # Try H.264 codec first (browser-compatible), fallback to mp4v
        # Note: avc1/H264 requires proper codec installation on the system
        fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 for browser compatibility
        video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        
        # Check if writer opened successfully, fallback to mp4v if not
        if not video_writer.isOpened():
            logger.warning("H.264 codec not available, falling back to mp4v")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        
        logger.info(f"Video writer initialized: fps={fps}, size={width}x{height}")
    
    frames_data = []
    all_angles = {name: [] for name in JOINT_ANGLES.keys()}
    frame_idx = 0
    last_keypoints_raw = None  # Cache for drawing on non-analyzed frames
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        keypoints_raw_for_drawing = None
        
        # Run pose estimation (for analysis on sampled frames, for drawing on all frames if generating video)
        should_analyze = (frame_idx % sample_rate == 0)
        should_run_model = should_analyze or (output_video_path and frame_idx % 2 == 0)  # More frequent for smoother video
        
        if should_run_model:
            results = model(frame, verbose=False)[0]
            
            if results.keypoints is not None and len(results.keypoints) > 0:
                # Get the largest person (most likely the exerciser)
                best_idx = 0
                best_area = 0
                
                for idx, box in enumerate(results.boxes):
                    if int(box.cls[0]) == 0:  # Person class
                        bbox = box.xyxy[0].tolist()
                        area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                        if area > best_area:
                            best_area = area
                            best_idx = idx
                
                kpts = results.keypoints[best_idx]
                if kpts.data is not None and len(kpts.data) > 0:
                    kpts_data = kpts.data[0].cpu().numpy()
                    keypoints_raw_for_drawing = kpts_data
                    last_keypoints_raw = kpts_data  # Cache for next frames
                    
                    # Only store detailed analysis on sampled frames
                    if should_analyze:
                        keypoints = []
                        for kp_idx, kp in enumerate(kpts_data):
                            keypoints.append({
                                "x": float(kp[0]) / width,
                                "y": float(kp[1]) / height,
                                "visibility": float(kp[2]),
                                "name": KEYPOINT_NAMES.get(kp_idx, f"kp_{kp_idx}"),
                            })
                        
                        angles = extract_joint_angles(keypoints)
                        
                        # Store for aggregation
                        for name, val in angles.items():
                            if val is not None:
                                all_angles[name].append(val)
                        
                        frames_data.append({
                            "frame": frame_idx,
                            "time": frame_idx / fps if fps > 0 else 0,
                            "keypoints": keypoints,
                            "angles": angles,
                        })
        
        # Write processed frame with pose overlay
        if video_writer:
            draw_kpts = keypoints_raw_for_drawing if keypoints_raw_for_drawing is not None else last_keypoints_raw
            if draw_kpts is not None:
                frame = draw_pose_on_frame(frame.copy(), draw_kpts, width, height)
            video_writer.write(frame)
        
        frame_idx += 1
    
    cap.release()
    if video_writer:
        video_writer.release()
        logger.info(f"Video writer released. Processed {frame_idx} frames.")
    
    # Calculate statistics
    angle_stats = {}
    for name, values in all_angles.items():
        if values:
            angle_stats[name] = {
                "min": round(min(values), 1),
                "max": round(max(values), 1),
                "avg": round(sum(values) / len(values), 1),
                "range": round(max(values) - min(values), 1),
            }
    
    # Analyze symmetry from average angles
    avg_angles = {name: stats["avg"] if name in angle_stats else None 
                  for name, stats in angle_stats.items()}
    symmetry = analyze_symmetry(avg_angles)
    
    return {
        "video_info": {
            "fps": fps,
            "total_frames": total_frames,
            "analyzed_frames": len(frames_data),
            "duration_seconds": total_frames / fps if fps > 0 else 0,
            "width": width,
            "height": height,
        },
        "angle_statistics": angle_stats,
        "symmetry_analysis": symmetry,
        "frames": frames_data[:20],  # Limit stored frames
    }


def generate_natural_language_summary(
    analysis: Dict[str, Any],
    exercise_type: str,
    cerebras_client: Any = None
) -> str:
    """Generate a clinician-friendly summary of the pose analysis."""
    
    if "error" in analysis:
        return f"Unable to analyze video: {analysis['error']}"
    
    video_info = analysis.get("video_info", {})
    angle_stats = analysis.get("angle_statistics", {})
    symmetry = analysis.get("symmetry_analysis", {})
    
    # Build context for AI
    context_parts = []
    
    # Video info
    duration = video_info.get("duration_seconds", 0)
    context_parts.append(f"Video duration: {duration:.1f} seconds")
    context_parts.append(f"Frames analyzed: {video_info.get('analyzed_frames', 0)}")
    
    # Range of motion
    rom_notes = []
    for joint, stats in angle_stats.items():
        if stats:
            rom_notes.append(f"{joint.replace('_', ' ')}: {stats['min']}° to {stats['max']}° (range: {stats['range']}°)")
    
    if rom_notes:
        context_parts.append("Range of motion:\n" + "\n".join(rom_notes))
    
    # Symmetry
    symmetry_issues = []
    for joint, data in symmetry.items():
        if not data.get("symmetric", True):
            symmetry_issues.append(
                f"{joint}: left {data['left']}° vs right {data['right']}° (diff: {data['difference']}°)"
            )
    
    if symmetry_issues:
        context_parts.append("Asymmetry detected:\n" + "\n".join(symmetry_issues))
    else:
        context_parts.append("Bilateral symmetry: Good (all joints within 15° difference)")
    
    context = "\n\n".join(context_parts)
    
    # Use AI to generate summary if available
    if cerebras_client:
        try:
            prompt = f"""You are a physical therapist assistant analyzing a patient's exercise video.
Exercise type: {exercise_type or 'Unknown'}

Analysis data:
{context}

Write a brief (2-3 sentences) clinical summary for the doctor. Focus on:
1. Overall movement quality
2. Any bilateral asymmetry or imbalances
3. Range of motion observations
4. Specific concerns or positive observations

Be specific with numbers but keep it concise and actionable."""

            response = cerebras_client.chat.completions.create(
                model="llama-3.3-70b",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI summary generation failed: {e}")
    
    # Fallback to rule-based summary
    summary_parts = []
    
    # Duration
    summary_parts.append(f"Analyzed {duration:.0f}s of {exercise_type or 'exercise'}.")
    
    # Symmetry assessment
    if symmetry_issues:
        summary_parts.append(f"Detected asymmetry in {len(symmetry_issues)} joint(s): {', '.join([s.split(':')[0] for s in symmetry_issues])}.")
    else:
        summary_parts.append("Movement appears bilaterally symmetric.")
    
    # ROM observation
    if "left_knee" in angle_stats or "right_knee" in angle_stats:
        knee_stats = angle_stats.get("left_knee") or angle_stats.get("right_knee")
        if knee_stats and knee_stats["range"] > 60:
            summary_parts.append(f"Good knee flexion range ({knee_stats['range']}°).")
        elif knee_stats:
            summary_parts.append(f"Limited knee flexion range ({knee_stats['range']}°).")
    
    return " ".join(summary_parts)


async def analyze_exercise_video(
    video_url: str,
    exercise_type: str,
    exercise_id: str,
    supabase_client: Any,
    cerebras_client: Any = None,
) -> Dict[str, Any]:
    """
    Main entry point: Download video, analyze, generate processed video with pose overlay,
    upload to Supabase, and generate summary.
    
    Args:
        video_url: URL or path in exercise-videos bucket
        exercise_type: Type of exercise (e.g., "squat", "lunge")
        exercise_id: ID of the exercise record (for naming processed video)
        supabase_client: Supabase client for downloading/uploading video
        cerebras_client: Optional Cerebras client for AI summaries
        
    Returns:
        Complete analysis including raw data, natural language summary, and processed video URL
    """
    import httpx
    import uuid
    
    # Create temp files for input and output
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_in:
        tmp_input_path = tmp_in.name
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_out:
        tmp_output_path = tmp_out.name
    
    processed_video_url = None
    
    try:
        # Handle both full URLs and bucket paths
        if video_url.startswith("http"):
            download_url = video_url
        else:
            # Get public URL from bucket
            download_url = supabase_client.storage.from_("exercise-videos").get_public_url(video_url)
        
        # Download video
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url, timeout=60.0)
            response.raise_for_status()
            
            with open(tmp_input_path, "wb") as f:
                f.write(response.content)
        
        # Process video and generate pose overlay video
        analysis = process_video_frames(
            tmp_input_path, 
            sample_rate=5,
            output_video_path=tmp_output_path
        )
        
        # Upload processed video to Supabase
        output_size = os.path.getsize(tmp_output_path) if os.path.exists(tmp_output_path) else 0
        logger.info(f"Processed video file size: {output_size} bytes")
        
        if output_size > 0:
            try:
                # Re-encode with ffmpeg for browser compatibility (H.264)
                import subprocess
                ffmpeg_output_path = tmp_output_path.replace(".mp4", "_h264.mp4")
                
                ffmpeg_cmd = [
                    "ffmpeg", "-y",  # Overwrite output
                    "-i", tmp_output_path,
                    "-c:v", "libx264",  # H.264 codec
                    "-preset", "fast",
                    "-crf", "23",  # Quality (lower = better, 18-28 is good range)
                    "-pix_fmt", "yuv420p",  # Pixel format for browser compatibility
                    "-movflags", "+faststart",  # Web optimization
                    ffmpeg_output_path
                ]
                
                result = subprocess.run(
                    ffmpeg_cmd,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if result.returncode == 0 and os.path.exists(ffmpeg_output_path):
                    upload_path = ffmpeg_output_path
                    logger.info(f"FFmpeg re-encoding successful. New size: {os.path.getsize(ffmpeg_output_path)} bytes")
                else:
                    logger.warning(f"FFmpeg failed: {result.stderr[:500] if result.stderr else 'unknown error'}. Using original file.")
                    upload_path = tmp_output_path
                
            except FileNotFoundError:
                logger.warning("FFmpeg not installed. Using original file (may not play in browsers).")
                upload_path = tmp_output_path
            except subprocess.TimeoutExpired:
                logger.warning("FFmpeg timed out. Using original file.")
                upload_path = tmp_output_path
            except Exception as ffmpeg_err:
                logger.warning(f"FFmpeg error: {ffmpeg_err}. Using original file.")
                upload_path = tmp_output_path
            
            try:
                # Generate unique filename for processed video
                processed_filename = f"processed/{exercise_id}_{uuid.uuid4().hex[:8]}.mp4"
                
                # Read processed video
                with open(upload_path, "rb") as f:
                    video_data = f.read()
                
                logger.info(f"Uploading video: {len(video_data)} bytes to {processed_filename}")
                
                # Upload to exercise-videos bucket
                upload_response = supabase_client.storage.from_("exercise-videos").upload(
                    processed_filename,
                    video_data,
                    file_options={"content-type": "video/mp4", "upsert": "true"}
                )
                
                # Get public URL
                processed_video_url = supabase_client.storage.from_("exercise-videos").get_public_url(processed_filename)
                logger.info(f"Uploaded processed video: {processed_video_url}")
                
                # Cleanup ffmpeg output
                if 'ffmpeg_output_path' in locals() and os.path.exists(ffmpeg_output_path):
                    os.unlink(ffmpeg_output_path)
                
            except Exception as upload_err:
                logger.error(f"Failed to upload processed video: {upload_err}")
        
        # Generate summary
        summary = generate_natural_language_summary(
            analysis, 
            exercise_type,
            cerebras_client
        )
        
        analysis["summary"] = summary
        analysis["exercise_type"] = exercise_type
        analysis["processed_video_url"] = processed_video_url
        
        return analysis
        
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        return {
            "error": str(e),
            "summary": f"Unable to analyze video: {str(e)}",
        }
    finally:
        # Cleanup temp files
        for path in [tmp_input_path, tmp_output_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
