import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import time
import threading
import math
from playsound import playsound
from ultralytics import YOLO


EAR_THRESHOLD = 0.22  
fatigue_score = 0
status = "NORMAL"

alarm_active = False
eyes_closed_start = None

# MediaPipe Face Mesh Indices for Eyes
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

NOSE_TIP = 1
LEFT_FACE = 234
RIGHT_FACE = 454

# --- Initialize MediaPipe Tasks API ---
# The code expects "face_landmarker.task" to be in the exact same folder!
print("Loading AI Model...")
base_options = python.BaseOptions(model_asset_path='face_landmarker.task')
options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=1
)
detector = vision.FaceLandmarker.create_from_options(options)
print("Model loaded successfully!")

print("Loading YOLO...")
yolo_model = YOLO("yolov8n.pt")
print("YOLO loaded!")

cap = cv2.VideoCapture(0)

def play_alarm():
    try:
        playsound("alarm.wav")
    except Exception as e:
        print(f"Alarm error: {e}")

def calculate_ear(landmarks, indices, img_w, img_h):
    def get_pt(idx):
        return (landmarks[idx].x * img_w, landmarks[idx].y * img_h)
    
    def dist(p1, p2):
        return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

    p1, p2, p3, p4, p5, p6 = [get_pt(i) for i in indices]

    h_dist = dist(p1, p4)
    v1_dist = dist(p2, p6)
    v2_dist = dist(p3, p5)

    if h_dist == 0: return 0
    return (v1_dist + v2_dist) / (2.0 * h_dist)

# --- Main Loop ---
print("Starting Camera... Press 'q' in the video window to quit.")
phone_start_time = None
direction = "FORWARD"
phone_alarm_active = False
while True:
    ret, frame = cap.read()
    if not ret:
        break

    img_h, img_w, _ = frame.shape
    
    # MediaPipe requires RGB images
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Convert into a MediaPipe Image object
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    # Process the frame
    results = detector.detect(mp_image)
    yolo_results = yolo_model(frame, verbose=False)

    phone_detected = False
    for result in yolo_results:

        boxes = result.boxes

        for box in boxes:

            cls = int(box.cls[0])

            name = yolo_model.names[cls]

            if name == "cell phone":

                phone_detected = True

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 0, 255),
                    2
                )

                cv2.putText(
                    frame,
                    "PHONE DETECTED",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2
                )

    face_found = False
    eyes_open = True
    avg_ear = 0.0

    if results.face_landmarks:
        face_found = True
        landmarks = results.face_landmarks[0]

        direction = "FORWARD"

        nose_x = landmarks[NOSE_TIP].x * img_w
        left_x = landmarks[LEFT_FACE].x * img_w
        right_x = landmarks[RIGHT_FACE].x * img_w

        face_center = (left_x + right_x) / 2

        direction = "FORWARD"

        if nose_x < face_center - 20:
            direction = "RIGHT"

        elif nose_x > face_center + 20:
            direction = "LEFT"

        # Calculate EAR for both eyes
        left_ear = calculate_ear(landmarks, LEFT_EYE_INDICES, img_w, img_h)
        right_ear = calculate_ear(landmarks, RIGHT_EYE_INDICES, img_w, img_h)
        avg_ear = (left_ear + right_ear) / 2.0

        if avg_ear < EAR_THRESHOLD:
            eyes_open = False
            
        # Draw the eye landmarks for visual feedback
        for idx in LEFT_EYE_INDICES + RIGHT_EYE_INDICES:
            pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
            cv2.circle(frame, pt, 2, (255, 0, 0), -1)

    # --- Fatigue Logic ---
    if face_found and eyes_open:
        eyes_closed_start = None
        alarm_active = False
        fatigue_score = max(0, fatigue_score - 0.5)
        
    elif face_found and not eyes_open:
        if eyes_closed_start is None:
            eyes_closed_start = time.time()

        closed_duration = time.time() - eyes_closed_start

        if closed_duration >= 2:
            fatigue_score = min(100, fatigue_score + 1)

        if closed_duration >= 5:
            fatigue_score = min(100, fatigue_score + 2)
            

    if phone_detected:

        if phone_start_time is None:
            phone_start_time = time.time()

        phone_duration = time.time() - phone_start_time

        if phone_duration >= 3:

            cv2.putText(
                frame,
                "PHONE DISTRACTION",
                (20, 200),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                2
            )

            if not phone_alarm_active:

                    phone_alarm_active = True

                    threading.Thread(
                        target=play_alarm,
                        daemon=True
                    ).start()
    else:
        phone_start_time = None
        phone_alarm_active = False

    if fatigue_score < 30:
        status = "NORMAL"
        color = (0, 255, 0)
    elif fatigue_score < 60:
        status = "WARNING"
        color = (0, 255, 255)
    elif fatigue_score < 80:
        status = "FATIGUED"
        color = (0, 165, 255)
    else:
        status = "CRITICAL"
        color = (0, 0, 255)

    # --- Alarm Handling ---
    if status == "CRITICAL" and not alarm_active:
        alarm_active = True
        threading.Thread(target=play_alarm, daemon=True).start()
    elif status != "CRITICAL":
        alarm_active = False

    
    cv2.putText(frame, f"Status: {status}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.putText(frame, f"Score: {int(fatigue_score)}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
    cv2.putText(frame, f"EAR: {avg_ear:.2f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(
    frame,
    f"Direction: {direction}",
       (20, 200),
       cv2.FONT_HERSHEY_SIMPLEX,
       0.8,
       (0, 255, 255),
       2
    )

    if phone_detected and phone_start_time is not None:

        cv2.putText(
            frame,
            f"Phone: {phone_duration:.1f}s",
            (20, 240),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )

    if not face_found:
        cv2.putText(frame, "NO FACE DETECTED", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    elif not eyes_open and eyes_closed_start is not None:
        closed_duration = time.time() - eyes_closed_start
        cv2.putText(frame, f"Eyes Closed: {closed_duration:.1f}s", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    cv2.imshow("SafeDrive AI", frame)

    
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()