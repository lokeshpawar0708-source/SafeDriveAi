import time
from threading import Lock

class DriverState:
    def __init__(self):
        self.lock = Lock()
        
        # Live status metrics
        self.face_found = False
        self.ear = 0.0
        self.mouth_opening_ratio = 0.0
        self.score = 0.0  # Fatigue Score (0 - 100)
        self.status = "NORMAL"  # NORMAL, WARNING, FATIGUED, CRITICAL
        self.direction = "FORWARD"  # FORWARD, LEFT, RIGHT, DOWN
        self.is_distracted = False
        self.distraction_duration = 0.0
        
        # Running event stats
        self.yawn_count = 0
        self.drowsiness_alerts_count = 0
        self.distraction_alerts_count = 0
        
        # Configuration Thresholds (adjustable from frontend)
        self.ear_threshold = 0.22
        self.yawn_threshold = 0.50
        self.distraction_threshold_seconds = 3.0
        self.yawn_cooldown_seconds = 5.0
        
        # Helper for yawn tracking
        self.last_yawn_time = 0.0

    def update_metrics(self, face_found, ear, mor, direction, is_distracted, distraction_duration):
        with self.lock:
            self.face_found = face_found
            self.ear = ear
            self.mouth_opening_ratio = mor
            self.direction = direction
            self.is_distracted = is_distracted
            self.distraction_duration = distraction_duration

    def increment_yawn(self):
        with self.lock:
            now = time.time()
            if now - self.last_yawn_time > self.yawn_cooldown_seconds:
                self.yawn_count += 1
                self.last_yawn_time = now
                return True
            return False

    def update_fatigue_score(self, new_score, new_status):
        with self.lock:
            self.score = new_score
            self.status = new_status

    def increment_alert_count(self, alert_type):
        with self.lock:
            if alert_type == "Drowsiness":
                self.drowsiness_alerts_count += 1
            elif alert_type == "Distraction":
                self.distraction_alerts_count += 1

    def update_settings(self, ear_thresh, yawn_thresh, distraction_thresh):
        with self.lock:
            if ear_thresh is not None:
                self.ear_threshold = float(ear_thresh)
            if yawn_thresh is not None:
                self.yawn_threshold = float(yawn_thresh)
            if distraction_thresh is not None:
                self.distraction_threshold_seconds = float(distraction_thresh)

    def calculate_risk_level(self):
        # Risk prediction engine rules:
        # High Risk: Critical/Fatigued score, or actively distracted, or high yawn count
        # Medium Risk: Warning score, or look-away duration > 1.5s, or moderate yawning
        # Low Risk: Normal score, looking forward
        if self.status in ["FATIGUED", "CRITICAL"] or self.is_distracted or self.yawn_count >= 5:
            return "HIGH"
        elif self.status == "WARNING" or self.distraction_duration > 1.0 or self.yawn_count >= 2:
            return "MEDIUM"
        else:
            return "LOW"

    def to_dict(self):
        with self.lock:
            return {
                "face_found": self.face_found,
                "ear": round(self.ear, 3),
                "mouth_opening_ratio": round(self.mouth_opening_ratio, 3),
                "score": int(self.score),
                "status": self.status,
                "direction": self.direction,
                "is_distracted": self.is_distracted,
                "distraction_duration": round(self.distraction_duration, 1),
                "yawn_count": self.yawn_count,
                "drowsiness_alerts_count": self.drowsiness_alerts_count,
                "distraction_alerts_count": self.distraction_alerts_count,
                "risk_level": self.calculate_risk_level(),
                "settings": {
                    "ear_threshold": self.ear_threshold,
                    "yawn_threshold": self.yawn_threshold,
                    "distraction_threshold_seconds": self.distraction_threshold_seconds
                }
            }

# Shared state instance
driver_state = DriverState()
