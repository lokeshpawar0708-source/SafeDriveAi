import csv
import os
from datetime import datetime

CSV_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "alerts.csv")

class AlertLogger:
    @staticmethod
    def initialize():
        if not os.path.exists(CSV_FILE_PATH):
            with open(CSV_FILE_PATH, mode='w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(["Time", "Event", "Details"])

    @staticmethod
    def log_alert(event, details=""):
        AlertLogger.initialize()
        now_str = datetime.now().strftime("%H:%M:%S")
        with open(CSV_FILE_PATH, mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([now_str, event, details])

    @staticmethod
    def get_logs():
        AlertLogger.initialize()
        logs = []
        try:
            with open(CSV_FILE_PATH, mode='r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    logs.append({
                        "time": row.get("Time", ""),
                        "event": row.get("Event", ""),
                        "details": row.get("Details", "")
                    })
        except Exception as e:
            print(f"Error reading logs: {e}")
        # Return logs in reverse order so latest is on top
        return list(reversed(logs))

    @staticmethod
    def clear_logs():
        try:
            with open(CSV_FILE_PATH, mode='w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(["Time", "Event", "Details"])
            return True
        except Exception as e:
            print(f"Error clearing logs: {e}")
            return False
