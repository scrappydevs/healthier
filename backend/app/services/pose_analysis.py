"""
Pose Analysis Service - MediaPipe for exercise video analysis
Extracts joint angles, symmetry, and generates natural language summaries
Uses MediaPipe (bundled with pip, no separate download required)
"""

import logging
import tempfile
import os
import math
from typing import Dict, List, Optional, Any
import numpy as np

logger = logging.getLogger(__name__)

# MediaPipe pose landmark indices (33 landmarks)
# We map to common joint names for analysis
LANDMARK_NAMES = {
    0: "nose",
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow", 14: "right_elbow",
    15: "left_wrist", 16: "right_wrist",
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
}

# Joint angle definitions: (point1, vertex, point2) using MediaPipe indices
JOINT_ANGLES = {
    "left_elbow": (11, 13, 15),    # shoulder -> elbow -> wrist
    "right_elbow": (12, 14, 16),
    "left_knee": (23, 25, 27),     # hip -> knee -> ankle
    "right_knee": (24, 26, 28),
    "left_hip": (11, 23, 25),      # shoulder -> hip -> knee
    "right_hip": (12, 24, 26),
    "left_shoulder": (13, 11, 23), # elbow -> shoulder -> hip
    "right_shoulder": (14, 12, 24),
}

# Skeleton connections for drawing (MediaPipe indices)
SKELETON_CONNECTIONS = [
    (11, 12),  # shoulders
    (11, 13), (13, 15),  # left arm
    (12, 14), (14, 16),  # right arm
    (11, 23), (12, 24),  # torso sides
    (23, 24),  # hips
    (23, 25), (25, 27),  # left leg
    (24, 26), (26, 28),  # right leg
]


def get_pose_detector():
    """Get MediaPipe Pose detector (loads instantly, no download)."""
    try:
        import mediapipe as mp
        mp_pose = mp.solutions.pose
        return mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,  # 0=lite, 1=full, 2=heavy
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    except ImportError:
        logger.error("MediaPipe not installed. Run: pip install mediapipe")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize MediaPipe Pose: {e}")
        return None


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


def extract_joint_angles(landmarks: List[Dict]) -> Dict[str, Optional[float]]:
    """Extract all joint angles from landmarks."""
    angles = {}
    for name, (i1, i2, i3) in JOINT_ANGLES.items():
        if len(landmarks) > max(i1, i2, i3):
            angles[name] = calculate_angle(landmarks[i1], landmarks[i2], landmarks[i3])
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


def draw_pose_on_frame(frame, landmarks, width, height):
    """Draw pose skeleton and keypoints on a frame with smooth, clean styling."""
    import cv2
    
    # Softer, more pleasing colors (BGR)
    KEYPOINT_COLOR = (100, 220, 255)  # Soft orange/peach
    SKELETON_COLOR = (200, 255, 150)  # Soft lime green
    OUTLINE_COLOR = (50, 50, 50)      # Dark gray
    
    # Scale sizes based on video resolution
    scale = max(width, height) / 1000
    KEYPOINT_RADIUS = max(4, int(6 * scale))
    LINE_THICKNESS = max(2, int(3 * scale))
    OUTLINE_THICKNESS = max(1, int(1 * scale))
    
    # Draw skeleton lines first
    for (start_idx, end_idx) in SKELETON_CONNECTIONS:
        if start_idx < len(landmarks) and end_idx < len(landmarks):
            start_lm = landmarks[start_idx]
            end_lm = landmarks[end_idx]
            
            if start_lm.get("visibility", 0) > 0.3 and end_lm.get("visibility", 0) > 0.3:
                start_pt = (int(start_lm["x"] * width), int(start_lm["y"] * height))
                end_pt = (int(end_lm["x"] * width), int(end_lm["y"] * height))
                cv2.line(frame, start_pt, end_pt, OUTLINE_COLOR, LINE_THICKNESS + 2, cv2.LINE_AA)
                cv2.line(frame, start_pt, end_pt, SKELETON_COLOR, LINE_THICKNESS, cv2.LINE_AA)
    
    # Draw keypoints on top (only important ones)
    important_indices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    for idx in important_indices:
        if idx < len(landmarks):
            lm = landmarks[idx]
            if lm.get("visibility", 0) > 0.3:
                pt = (int(lm["x"] * width), int(lm["y"] * height))
                cv2.circle(frame, pt, KEYPOINT_RADIUS + OUTLINE_THICKNESS, OUTLINE_COLOR, -1, cv2.LINE_AA)
                cv2.circle(frame, pt, KEYPOINT_RADIUS, KEYPOINT_COLOR, -1, cv2.LINE_AA)
    
    return frame


def process_video_frames(
    video_path: str, 
    sample_rate: int = 5,
    output_video_path: str = None,
) -> Dict[str, Any]:
    """
    Process video and extract pose data from sampled frames using MediaPipe.
    
    Args:
        video_path: Path to video file
        sample_rate: Process every Nth frame for analysis
        output_video_path: If provided, generates processed video with pose overlay
        
    Returns:
        Dict with frame data, aggregated metrics, and statistics
    """
    import cv2
    
    pose = get_pose_detector()
    if pose is None:
        return {"error": "MediaPipe Pose not available"}
    
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
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        if not video_writer.isOpened():
            logger.warning("H.264 codec not available, falling back to mp4v")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        logger.info(f"Video writer initialized: fps={fps}, size={width}x{height}")
    
    frames_data = []
    all_angles = {name: [] for name in JOINT_ANGLES.keys()}
    frame_idx = 0
    last_landmarks = None
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            current_landmarks = None
            
            # Run pose estimation
            should_analyze = (frame_idx % sample_rate == 0)
            should_run_model = should_analyze or (output_video_path and frame_idx % 2 == 0)
            
            if should_run_model:
                # Convert BGR to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb_frame)
                
                if results.pose_landmarks:
                    # Convert landmarks to our format
                    landmarks = []
                    for idx, lm in enumerate(results.pose_landmarks.landmark):
                        landmarks.append({
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z,
                            "visibility": lm.visibility,
                        })
                    
                    current_landmarks = landmarks
                    last_landmarks = landmarks
                    
                    # Detailed analysis on sampled frames
                    if should_analyze:
                        angles = extract_joint_angles(landmarks)
                        
                        for name, val in angles.items():
                            if val is not None:
                                all_angles[name].append(val)
                        
                        frames_data.append({
                            "frame": frame_idx,
                            "time": frame_idx / fps if fps > 0 else 0,
                            "angles": angles,
                        })
            
            # Write processed frame
            if video_writer:
                draw_lms = current_landmarks if current_landmarks else last_landmarks
                if draw_lms:
                    frame = draw_pose_on_frame(frame.copy(), draw_lms, width, height)
                video_writer.write(frame)
            
            frame_idx += 1
    finally:
        pose.close()
    
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
    
    # Analyze symmetry
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
        "frames": frames_data[:20],
    }


def get_exercise_specific_guidance(exercise_type: str) -> Dict[str, Any]:
    """Get exercise-specific metrics to focus on and ideal ranges."""
    exercise_lower = (exercise_type or "").lower()
    
    # Default guidance
    guidance = {
        "focus_joints": ["knee", "hip", "shoulder"],
        "ideal_ranges": {},
        "form_tips": [],
        "key_metrics": "overall symmetry and range of motion"
    }
    
    # Squat variations
    if any(x in exercise_lower for x in ["squat", "squats"]):
        guidance = {
            "focus_joints": ["knee", "hip"],
            "ideal_ranges": {
                "knee": {"min": 70, "max": 100, "note": "Knee flexion should reach 90° for proper depth"},
                "hip": {"min": 60, "max": 90, "note": "Hip hinge is crucial for proper form"},
            },
            "form_tips": [
                "Knees should track over toes, not cave inward",
                "Hips should descend below knee level for full squat",
                "Maintain neutral spine throughout",
            ],
            "key_metrics": "knee depth, hip hinge, bilateral symmetry"
        }
    
    # Lunge variations
    elif any(x in exercise_lower for x in ["lunge", "lunges", "split squat"]):
        guidance = {
            "focus_joints": ["knee", "hip"],
            "ideal_ranges": {
                "knee": {"min": 80, "max": 100, "note": "Front knee should reach ~90° flexion"},
                "hip": {"min": 50, "max": 80, "note": "Rear hip extension matters for hip flexor stretch"},
            },
            "form_tips": [
                "Front knee should not extend past toes",
                "Keep torso upright",
                "Rear knee should nearly touch ground",
            ],
            "key_metrics": "front knee angle, hip extension, balance"
        }
    
    # Deadlift variations
    elif any(x in exercise_lower for x in ["deadlift", "rdl", "hip hinge"]):
        guidance = {
            "focus_joints": ["hip", "knee"],
            "ideal_ranges": {
                "hip": {"min": 30, "max": 90, "note": "Hip hinge should be primary movement"},
                "knee": {"min": 10, "max": 30, "note": "Slight knee bend, not a squat"},
            },
            "form_tips": [
                "Maintain flat back throughout",
                "Push hips back, not down",
                "Bar should stay close to body",
            ],
            "key_metrics": "hip hinge depth, spine neutrality, knee softness"
        }
    
    # Arm exercises (bicep curl, shoulder press, etc.)
    elif any(x in exercise_lower for x in ["curl", "bicep", "arm"]):
        guidance = {
            "focus_joints": ["elbow", "shoulder"],
            "ideal_ranges": {
                "elbow": {"min": 30, "max": 150, "note": "Full range: 30° to 150° flexion"},
            },
            "form_tips": [
                "Keep elbows stationary at sides",
                "Control the eccentric (lowering) phase",
                "Avoid swinging or momentum",
            ],
            "key_metrics": "elbow range of motion, control, bilateral symmetry"
        }
    
    # Shoulder exercises
    elif any(x in exercise_lower for x in ["press", "shoulder", "overhead", "raise"]):
        guidance = {
            "focus_joints": ["shoulder", "elbow"],
            "ideal_ranges": {
                "shoulder": {"min": 20, "max": 170, "note": "Full overhead range important"},
                "elbow": {"min": 90, "max": 180, "note": "Should extend fully at top"},
            },
            "form_tips": [
                "Keep core engaged",
                "Avoid excessive lower back arch",
                "Control the weight path",
            ],
            "key_metrics": "overhead reach, elbow extension, shoulder symmetry"
        }
    
    # Push-up / plank
    elif any(x in exercise_lower for x in ["push", "pushup", "push-up", "plank"]):
        guidance = {
            "focus_joints": ["elbow", "shoulder"],
            "ideal_ranges": {
                "elbow": {"min": 70, "max": 170, "note": "Should reach ~90° at bottom"},
            },
            "form_tips": [
                "Maintain straight line from head to heels",
                "Lower chest to near ground",
                "Keep elbows at 45° angle, not flared",
            ],
            "key_metrics": "elbow depth, body alignment, elbow position"
        }
    
    # Step-ups / stairs
    elif any(x in exercise_lower for x in ["step", "stair", "climb"]):
        guidance = {
            "focus_joints": ["knee", "hip"],
            "ideal_ranges": {
                "knee": {"min": 60, "max": 100, "note": "Working leg knee drives movement"},
            },
            "form_tips": [
                "Push through heel of working leg",
                "Avoid pushing off back leg",
                "Keep torso upright",
            ],
            "key_metrics": "knee drive, balance, step control"
        }
    
    # Walking / gait
    elif any(x in exercise_lower for x in ["walk", "gait", "march"]):
        guidance = {
            "focus_joints": ["knee", "hip"],
            "ideal_ranges": {
                "knee": {"min": 0, "max": 60, "note": "Normal gait knee flexion"},
                "hip": {"min": 10, "max": 40, "note": "Hip extension in stance phase"},
            },
            "form_tips": [
                "Heel strike, toe off pattern",
                "Arms swing naturally",
                "Even stride length bilaterally",
            ],
            "key_metrics": "gait symmetry, stride length, step rhythm"
        }
    
    return guidance


def generate_natural_language_summary(
    analysis: Dict[str, Any],
    exercise_type: str,
    cerebras_client: Any = None
) -> str:
    """Generate a clinician-friendly summary of the pose analysis with exercise-specific insights."""
    
    if "error" in analysis:
        return f"Unable to analyze video: {analysis['error']}"
    
    video_info = analysis.get("video_info", {})
    angle_stats = analysis.get("angle_statistics", {})
    symmetry = analysis.get("symmetry_analysis", {})
    
    # Get exercise-specific guidance
    guidance = get_exercise_specific_guidance(exercise_type)
    
    # Build context for AI
    context_parts = []
    
    duration = video_info.get("duration_seconds", 0)
    context_parts.append(f"Video duration: {duration:.1f} seconds")
    context_parts.append(f"Frames analyzed: {video_info.get('analyzed_frames', 0)}")
    
    # Range of motion with exercise-specific evaluation
    rom_notes = []
    rom_evaluation = []
    for joint, stats in angle_stats.items():
        if stats:
            joint_base = joint.replace("left_", "").replace("right_", "")
            rom_notes.append(f"{joint.replace('_', ' ')}: {stats['min']}° to {stats['max']}° (range: {stats['range']}°)")
            
            # Compare to ideal ranges if available
            if joint_base in guidance["ideal_ranges"]:
                ideal = guidance["ideal_ranges"][joint_base]
                if stats["max"] < ideal["min"]:
                    rom_evaluation.append(f"{joint}: Limited range - max {stats['max']}° below ideal minimum of {ideal['min']}°")
                elif stats["range"] < 30:
                    rom_evaluation.append(f"{joint}: Restricted movement range ({stats['range']}°)")
    
    if rom_notes:
        context_parts.append("Range of motion:\n" + "\n".join(rom_notes))
    
    if rom_evaluation:
        context_parts.append("Range concerns:\n" + "\n".join(rom_evaluation))
    
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
            # Build exercise-specific prompt
            exercise_context = f"""Exercise type: {exercise_type or 'Unknown exercise'}

Key metrics to evaluate for this exercise: {guidance['key_metrics']}

Form tips for {exercise_type or 'this exercise'}:
{chr(10).join('- ' + tip for tip in guidance['form_tips']) if guidance['form_tips'] else '- Standard form evaluation'}
"""
            
            prompt = f"""You are a physical therapist assistant analyzing a patient's exercise video.

{exercise_context}

Analysis data:
{context}

Write a brief (3-4 sentences) clinical summary. Include:
1. Specific observations about their {exercise_type or 'exercise'} form based on the joint angles
2. Whether their range of motion is adequate for this exercise type
3. Any bilateral asymmetry concerns
4. One actionable recommendation for improvement

Be specific with angle measurements and relate them to proper {exercise_type or 'exercise'} technique."""

            response = cerebras_client.chat.completions.create(
                model="llama-3.3-70b",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=250,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI summary generation failed: {e}")
    
    # Fallback to rule-based summary with exercise-specific insights
    summary_parts = []
    summary_parts.append(f"Analyzed {duration:.0f}s of {exercise_type or 'exercise'}.")
    
    # Exercise-specific evaluation
    exercise_lower = (exercise_type or "").lower()
    
    # Knee-focused exercises (squats, lunges, step-ups)
    if any(x in exercise_lower for x in ["squat", "lunge", "step"]):
        knee_stats = angle_stats.get("left_knee") or angle_stats.get("right_knee")
        hip_stats = angle_stats.get("left_hip") or angle_stats.get("right_hip")
        
        if knee_stats:
            if knee_stats["max"] >= 90:
                summary_parts.append(f"Good depth achieved with knee flexion to {knee_stats['max']}°.")
            elif knee_stats["max"] >= 70:
                summary_parts.append(f"Moderate depth ({knee_stats['max']}° knee flexion). Consider going deeper for full range.")
            else:
                summary_parts.append(f"Shallow depth ({knee_stats['max']}° knee flexion). Work on mobility to achieve proper depth.")
        
        if hip_stats and hip_stats["range"] < 40:
            summary_parts.append(f"Limited hip hinge ({hip_stats['range']}° range). Focus on hip mobility.")
    
    # Arm exercises (curls, presses)
    elif any(x in exercise_lower for x in ["curl", "press", "arm", "bicep", "shoulder"]):
        elbow_stats = angle_stats.get("left_elbow") or angle_stats.get("right_elbow")
        
        if elbow_stats:
            if elbow_stats["range"] >= 100:
                summary_parts.append(f"Excellent range of motion ({elbow_stats['range']}° elbow movement).")
            elif elbow_stats["range"] >= 60:
                summary_parts.append(f"Good elbow range ({elbow_stats['range']}°). Consider fuller extension/flexion.")
            else:
                summary_parts.append(f"Limited elbow range ({elbow_stats['range']}°). Focus on full range of motion.")
    
    # General exercises
    else:
        if "left_knee" in angle_stats or "right_knee" in angle_stats:
            knee_stats = angle_stats.get("left_knee") or angle_stats.get("right_knee")
            if knee_stats and knee_stats["range"] > 60:
                summary_parts.append(f"Good knee flexion range ({knee_stats['range']}°).")
            elif knee_stats:
                summary_parts.append(f"Limited knee flexion range ({knee_stats['range']}°).")
    
    # Symmetry evaluation
    if symmetry_issues:
        summary_parts.append(f"Asymmetry detected in {len(symmetry_issues)} joint(s): {', '.join([s.split(':')[0] for s in symmetry_issues])}. Consider unilateral work to address imbalances.")
    else:
        summary_parts.append("Movement appears bilaterally symmetric.")
    
    return " ".join(summary_parts)


async def analyze_exercise_video(
    video_url: str,
    exercise_type: str,
    exercise_id: str,
    supabase_client: Any,
    cerebras_client: Any = None,
) -> Dict[str, Any]:
    """
    Main entry point: Download video, analyze with MediaPipe, generate processed video,
    upload to Supabase, and generate summary.
    """
    import httpx
    import uuid
    
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
            download_url = supabase_client.storage.from_("exercise-videos").get_public_url(video_url)
        
        # Download video
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url, timeout=60.0)
            response.raise_for_status()
            
            with open(tmp_input_path, "wb") as f:
                f.write(response.content)
        
        # Process video with MediaPipe
        analysis = process_video_frames(
            tmp_input_path, 
            sample_rate=5,
            output_video_path=tmp_output_path
        )
        
        # Upload processed video
        output_size = os.path.getsize(tmp_output_path) if os.path.exists(tmp_output_path) else 0
        logger.info(f"Processed video file size: {output_size} bytes")
        
        if output_size > 0:
            try:
                # Re-encode with ffmpeg for browser compatibility
                import subprocess
                ffmpeg_output_path = tmp_output_path.replace(".mp4", "_h264.mp4")
                
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-i", tmp_output_path,
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
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
                logger.warning("FFmpeg not installed. Using original file.")
                upload_path = tmp_output_path
            except subprocess.TimeoutExpired:
                logger.warning("FFmpeg timed out. Using original file.")
                upload_path = tmp_output_path
            except Exception as ffmpeg_err:
                logger.warning(f"FFmpeg error: {ffmpeg_err}. Using original file.")
                upload_path = tmp_output_path
            
            try:
                processed_filename = f"processed/{exercise_id}_{uuid.uuid4().hex[:8]}.mp4"
                
                with open(upload_path, "rb") as f:
                    video_data = f.read()
                
                logger.info(f"Uploading video: {len(video_data)} bytes to {processed_filename}")
                
                supabase_client.storage.from_("exercise-videos").upload(
                    processed_filename,
                    video_data,
                    file_options={"content-type": "video/mp4", "upsert": "true"}
                )
                
                processed_video_url = supabase_client.storage.from_("exercise-videos").get_public_url(processed_filename)
                logger.info(f"Uploaded processed video: {processed_video_url}")
                
                if 'ffmpeg_output_path' in locals() and os.path.exists(ffmpeg_output_path):
                    os.unlink(ffmpeg_output_path)
                
            except Exception as upload_err:
                logger.error(f"Failed to upload processed video: {upload_err}")
        
        # Get exercise-specific guidance
        guidance = get_exercise_specific_guidance(exercise_type)
        
        # Generate summary
        summary = generate_natural_language_summary(
            analysis, 
            exercise_type,
            cerebras_client
        )
        
        analysis["summary"] = summary
        analysis["exercise_type"] = exercise_type
        analysis["processed_video_url"] = processed_video_url
        analysis["form_tips"] = guidance["form_tips"]
        analysis["key_metrics"] = guidance["key_metrics"]
        analysis["ideal_ranges"] = guidance["ideal_ranges"]
        
        return analysis
        
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        return {
            "error": str(e),
            "summary": f"Unable to analyze video: {str(e)}",
        }
    finally:
        for path in [tmp_input_path, tmp_output_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
