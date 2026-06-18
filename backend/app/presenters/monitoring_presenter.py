import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import time
import threading
import math
import os
from playsound import playsound
from app.models.driver_state import driver_state
from app.models.alert_log import AlertLogger
from app.models.mongodb_logger import MongoDbLogger

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "face_landmarker.task")
ALARM_PATH = os.path.join(BASE_DIR, "alarm.wav")

class MonitoringPresenter:
    def __init__(self):
        self.camera_active = False
        self.latest_frame = None
        self.lock = threading.Lock()
        self.thread = None
        self.detector = None
        self.alarm_playing = False
        self.alarm_lock = threading.Lock()
        
        # State variables for distraction tracking
        self.distraction_start_time = None
        self.distraction_alert_logged = False
        
        # State variables for yawning detection
        self.yawn_start_time = None
        self.yawn_in_progress = False

        # State variables for fatigue timing
        self.eyes_closed_start = None
        self.last_update_time = time.time()
        self.critical_alert_logged = False
        
        # State variables for camera/absence tracking
        self.face_lost_start_time = None
        self.camera_offline_logged = False

        # MediaPipe Landmarks
        self.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
        self.NOSE_TIP = 1
        self.LEFT_FACE = 234
        self.RIGHT_FACE = 454
        self.FOREHEAD = 10
        self.CHIN = 152
        
        # Inner lips (yawn detection)
        self.UPPER_LIP_BOTTOM = 13
        self.LOWER_LIP_TOP = 14
        self.MOUTH_LEFT_CORNER = 61
        self.MOUTH_RIGHT_CORNER = 291

    def play_alarm_sound(self):
        with self.alarm_lock:
            if self.alarm_playing:
                return
            self.alarm_playing = True
            
        try:
            if os.path.exists(ALARM_PATH):
                import platform
                if platform.system() == 'Windows':
                    import winsound
                    # SND_FILENAME | SND_ASYNC plays the audio file asynchronously
                    winsound.PlaySound(ALARM_PATH, winsound.SND_FILENAME | winsound.SND_ASYNC)
                else:
                    playsound(ALARM_PATH)
            else:
                print(f"Alarm file not found at: {ALARM_PATH}")
        except Exception as e:
            print(f"Error playing alarm: {e}")
        finally:
            # Let the alarm play for 2.5s before releasing the lock,
            # which prevents spawning too many overlapping player threads
            time.sleep(2.5)
            with self.alarm_lock:
                self.alarm_playing = False

    def trigger_alarm(self):
        if driver_state.enable_sound_alerts and not self.alarm_playing:
            threading.Thread(target=self.play_alarm_sound, daemon=True).start()

    def calculate_ear(self, landmarks, indices, img_w, img_h):
        def get_pt(idx):
            return (landmarks[idx].x * img_w, landmarks[idx].y * img_h)
        
        def dist(p1, p2):
            return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

        p1, p2, p3, p4, p5, p6 = [get_pt(i) for i in indices]
        h_dist = dist(p1, p4)
        v1_dist = dist(p2, p6)
        v2_dist = dist(p3, p5)

        if h_dist == 0: 
            return 0.0
        return (v1_dist + v2_dist) / (2.0 * h_dist)

    def calculate_mor(self, landmarks, img_w, img_h):
        # Mouth Opening Ratio
        def get_pt(idx):
            return (landmarks[idx].x * img_w, landmarks[idx].y * img_h)
        
        def dist(p1, p2):
            return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

        top_lip = get_pt(self.UPPER_LIP_BOTTOM)
        bottom_lip = get_pt(self.LOWER_LIP_TOP)
        left_corner = get_pt(self.MOUTH_LEFT_CORNER)
        right_corner = get_pt(self.MOUTH_RIGHT_CORNER)

        v_dist = dist(top_lip, bottom_lip)
        h_dist = dist(left_corner, right_corner)

        if h_dist == 0:
            return 0.0
        return v_dist / h_dist

    def start(self):
        if self.camera_active:
            return
        self.camera_active = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("Driver Monitoring Thread started.")

    def stop(self):
        self.camera_active = False
        if self.thread:
            self.thread.join(timeout=2.0)
            print("Driver Monitoring Thread stopped.")

    def _initialize_detector(self):
        print(f"Loading MediaPipe model from {MODEL_PATH}...")
        try:
            base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=1
            )
            self.detector = vision.FaceLandmarker.create_from_options(options)
            print("MediaPipe Face Landmarker loaded successfully.")
            return True
        except Exception as e:
            print(f"Error loading MediaPipe detector: {e}")
            return False

    def _run_loop(self):
        if not self._initialize_detector():
            self.camera_active = False
            return

        print("Opening webcam via DirectShow...")
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("Error: Could not open webcam via DirectShow.")
            self.camera_active = False
            return
        print("Webcam opened successfully! Starting frame capture loop...")

        # Initialize last update time
        self.last_update_time = time.time()

        while self.camera_active:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.03)  # Avoid CPU thrashing
                continue

            img_h, img_w, _ = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            results = self.detector.detect(mp_image)

            face_found = False
            eyes_open = True
            avg_ear = 0.0
            mor = 0.0
            direction = "FORWARD"
            
            now = time.time()
            dt = now - self.last_update_time
            self.last_update_time = now

            if results.face_landmarks:
                face_found = True
                landmarks = results.face_landmarks[0]

                # Face Width & Height for normalized thresholds
                left_x = landmarks[self.LEFT_FACE].x * img_w
                right_x = landmarks[self.RIGHT_FACE].x * img_w
                face_width = max(1.0, right_x - left_x)
                
                forehead_y = landmarks[self.FOREHEAD].y * img_h
                chin_y = landmarks[self.CHIN].y * img_h
                face_height = max(1.0, chin_y - forehead_y)

                # Nose tip position
                nose_x = landmarks[self.NOSE_TIP].x * img_w
                nose_y = landmarks[self.NOSE_TIP].y * img_h
                
                # Head Pose Estimation (Yaw & Pitch)
                face_center_x = (left_x + right_x) / 2
                
                # Horizonal Shift (Yaw)
                shift_x = nose_x - face_center_x
                ratio_x = shift_x / face_width

                # Vertical Shift (Pitch)
                ratio_y = (nose_y - forehead_y) / face_height

                # Determine direction
                if ratio_x < -0.11:
                    direction = "RIGHT"
                elif ratio_x > 0.11:
                    direction = "LEFT"
                elif ratio_y > 0.61:
                    direction = "DOWN"
                else:
                    direction = "FORWARD"

                # Calculate EAR (Eye Aspect Ratio)
                left_ear = self.calculate_ear(landmarks, self.LEFT_EYE_INDICES, img_w, img_h)
                right_ear = self.calculate_ear(landmarks, self.RIGHT_EYE_INDICES, img_w, img_h)
                avg_ear = (left_ear + right_ear) / 2.0

                if avg_ear < driver_state.ear_threshold:
                    eyes_open = False

                # Calculate MOR (Mouth Opening Ratio) for yawn detection
                mor = self.calculate_mor(landmarks, img_w, img_h)

                # Draw Visual Landmarks on Screen
                # Eye landmarks (Blue)
                for idx in self.LEFT_EYE_INDICES + self.RIGHT_EYE_INDICES:
                    pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
                    cv2.circle(frame, pt, 2, (255, 0, 0), -1)

                # Mouth landmarks (Green)
                for idx in [self.UPPER_LIP_BOTTOM, self.LOWER_LIP_TOP, self.MOUTH_LEFT_CORNER, self.MOUTH_RIGHT_CORNER]:
                    pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
                    cv2.circle(frame, pt, 2, (0, 255, 0), -1)

                # Nose tip (Yellow)
                pt_nose = (int(nose_x), int(nose_y))
                cv2.circle(frame, pt_nose, 3, (0, 255, 255), -1)

            # --- Camera Status / Driver Absence Tracking ---
            if not face_found:
                if self.face_lost_start_time is None:
                    self.face_lost_start_time = time.time()
                face_lost_duration = time.time() - self.face_lost_start_time
                if face_lost_duration >= 5.0 and not self.camera_offline_logged:
                    msg = "No face detected (camera blocked or driver absent)"
                    AlertLogger.log_alert("Camera Status", msg)
                    MongoDbLogger.log_event("Camera Status", msg)
                    self.camera_offline_logged = True
            else:
                self.face_lost_start_time = None
                if self.camera_offline_logged:
                    msg = "Face detected (camera feed / driver resumed)"
                    AlertLogger.log_alert("Camera Status", msg)
                    MongoDbLogger.log_event("Camera Status", msg)
                    self.camera_offline_logged = False

            # --- Distraction Logging & Detection ---
            is_distracted = False
            distraction_duration = 0.0

            if face_found and direction != "FORWARD":
                if self.distraction_start_time is None:
                    self.distraction_start_time = time.time()
                distraction_duration = time.time() - self.distraction_start_time
                
                if distraction_duration >= driver_state.distraction_threshold_seconds:
                    is_distracted = True
                    if not self.distraction_alert_logged:
                        msg = f"Driver looking {direction} for {distraction_duration:.1f}s"
                        AlertLogger.log_alert("Distraction", msg)
                        MongoDbLogger.log_event("Distraction", msg)
                        driver_state.increment_alert_count("Distraction")
                        self.distraction_alert_logged = True
            else:
                self.distraction_start_time = None
                self.distraction_alert_logged = False

            # --- Yawning Detection (Phase 2) ---
            if face_found and mor > driver_state.yawn_threshold:
                if self.yawn_start_time is None:
                    self.yawn_start_time = time.time()
                
                yawn_dur = time.time() - self.yawn_start_time
                if yawn_dur >= 1.5 and not self.yawn_in_progress:
                    # Yawn confirmed
                    msg = f"Mouth open for {yawn_dur:.1f}s (MOR: {mor:.2f})"
                    if driver_state.increment_yawn():
                        AlertLogger.log_alert("Yawning", msg)
                        MongoDbLogger.log_event("Yawning", msg)
                    self.yawn_in_progress = True
            else:
                self.yawn_start_time = None
                self.yawn_in_progress = False

            # --- Drowsiness/Fatigue Score Logic ---
            fatigue_score = driver_state.score
            
            if face_found and eyes_open:
                self.eyes_closed_start = None
                # Gradual decrease when eyes are open (5 points/sec)
                fatigue_score = max(0.0, fatigue_score - 5.0 * dt)
                
            elif face_found and not eyes_open:
                if self.eyes_closed_start is None:
                    self.eyes_closed_start = time.time()

                closed_duration = time.time() - self.eyes_closed_start

                # Scale scoring depending on duration of closed eyes
                if closed_duration >= 2.0:
                    rate = 15.0 if closed_duration < 5.0 else 30.0
                    fatigue_score = min(100.0, fatigue_score + rate * dt)
            else:
                # No face detected: gradual penalty (2 points/sec)
                self.eyes_closed_start = None
                fatigue_score = min(100.0, fatigue_score + 2.0 * dt)

            # Map score to fatigue status
            if fatigue_score < 30:
                status = "NORMAL"
                color = (0, 255, 0) # Green
            elif fatigue_score < 60:
                status = "WARNING"
                color = (0, 255, 255) # Yellow
            elif fatigue_score < 80:
                status = "FATIGUED"
                color = (0, 165, 255) # Orange
            else:
                status = "CRITICAL"
                color = (0, 0, 255) # Red

            # Alarm Handling
            if status == "CRITICAL":
                self.trigger_alarm()
                if not self.critical_alert_logged:
                    msg = "Eyes closed/Micro-sleep detected"
                    AlertLogger.log_alert("Drowsiness", msg)
                    MongoDbLogger.log_event("Drowsiness", msg)
                    driver_state.increment_alert_count("Drowsiness")
                    self.critical_alert_logged = True
            else:
                self.critical_alert_logged = False

            # Update shared driver state
            driver_state.update_metrics(
                face_found=face_found,
                ear=avg_ear,
                mor=mor,
                direction=direction,
                is_distracted=is_distracted,
                distraction_duration=distraction_duration
            )
            driver_state.update_fatigue_score(fatigue_score, status)

            # Draw UI information on OpenCV overlay (for debugging/local visualization)
            cv2.putText(frame, f"Status: {status}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            cv2.putText(frame, f"Fatigue: {int(fatigue_score)}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, f"EAR: {avg_ear:.2f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, f"Direction: {direction}", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
            
            if is_distracted:
                cv2.putText(frame, "DISTRACTED DRIVER!", (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            elif not eyes_open and self.eyes_closed_start is not None:
                closed_dur = time.time() - self.eyes_closed_start
                cv2.putText(frame, f"Eyes Closed: {closed_dur:.1f}s", (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            if not face_found:
                cv2.putText(frame, "NO FACE DETECTED", (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            # Store the latest frame
            with self.lock:
                self.latest_frame = frame.copy()

            time.sleep(0.01) # Small sleep to release GIL

        cap.release()

    def get_frame_bytes(self):
        with self.lock:
            if self.latest_frame is None:
                # Provide a blank frame if webcam not ready yet
                blank_frame = cv2.imencode('.jpg', 255 * os.path.exists(ALARM_PATH) * (0, 0, 0))[1].tobytes() # returns empty bytes helper
                # Just draw a simple black square
                import numpy as np
                black_img = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(black_img, "Camera Loading...", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                return cv2.imencode('.jpg', black_img)[1].tobytes()
            
            ret, jpeg = cv2.imencode('.jpg', self.latest_frame)
            if not ret:
                return b''
            return jpeg.tobytes()

# Global presenter instance
monitoring_presenter = MonitoringPresenter()
