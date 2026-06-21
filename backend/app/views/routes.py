from flask import Blueprint, jsonify, request, Response
from app.models.driver_state import driver_state
from app.models.alert_log import AlertLogger
from app.models.mongodb_logger import MongoDbLogger
from app.presenters.monitoring_presenter import monitoring_presenter
from app.presenters.rag_presenter import RagPresenter
from app.models.places import search_places
import time

api_blueprint = Blueprint('api', __name__)

@api_blueprint.route('/manager/logs', methods=['GET'])
def get_manager_logs():
    logs = MongoDbLogger.get_logs()
    return jsonify(logs)

@api_blueprint.route('/manager/logs/clear', methods=['POST'])
def clear_manager_logs():
    success = MongoDbLogger.clear_logs()
    if success:
        return jsonify({"message": "MongoDB logs cleared successfully"}), 200
    else:
        return jsonify({"error": "Failed to clear MongoDB logs"}), 500

@api_blueprint.route('/rag/query', methods=['POST'])
def query_rag():
    data = request.get_json() or {}
    query_text = data.get("query", "")
    if not query_text:
        return jsonify({"error": "Missing query parameter"}), 400
        
    result = RagPresenter.ask_safety_assistant(query_text)
    return jsonify(result), 200

@api_blueprint.route('/manager/signup', methods=['POST'])
def manager_signup():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    res = MongoDbLogger.create_manager(username, password)
    if "error" in res:
        return jsonify({"error": res["error"]}), 400
    return jsonify({"success": True, "message": "Manager registered successfully"}), 201

@api_blueprint.route('/manager/login', methods=['POST'])
def manager_login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    authenticated = MongoDbLogger.authenticate_manager(username, password)
    if authenticated:
        return jsonify({
            "success": True, 
            "token": "safedrive_session_token_xyz_88",
            "username": username.strip().lower()
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

@api_blueprint.route('/status', methods=['GET'])
def get_status():
    return jsonify(driver_state.to_dict())

@api_blueprint.route('/logs', methods=['GET'])
def get_logs():
    logs = AlertLogger.get_logs()
    return jsonify(logs)

@api_blueprint.route('/logs/clear', methods=['POST'])
def clear_logs():
    success = AlertLogger.clear_logs()
    if success:
        return jsonify({"message": "Logs cleared successfully"}), 200
    else:
        return jsonify({"error": "Failed to clear logs"}), 500

@api_blueprint.route('/settings', methods=['POST'])
def update_settings():
    data = request.get_json() or {}
    
    ear_thresh = data.get('ear_threshold')
    yawn_thresh = data.get('yawn_threshold')
    distraction_thresh = data.get('distraction_threshold_seconds')
    enable_sound = data.get('enable_sound_alerts')
    
    driver_state.update_settings(ear_thresh, yawn_thresh, distraction_thresh, enable_sound)
    return jsonify({
        "message": "Settings updated successfully",
        "settings": driver_state.to_dict()["settings"]
    }), 200


def generate_frames():
    while True:
        frame_bytes = monitoring_presenter.get_frame_bytes()
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')
        time.sleep(0.04)  # ~25 FPS stream limit

@api_blueprint.route('/stream', methods=['GET'])
def video_stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@api_blueprint.route('/places/search', methods=['GET'])
def search_nearby_places():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    query = request.args.get('query')
    radius = request.args.get('radius', 10.0)
    place_type = request.args.get('type', 'all')
    
    try:
        radius = float(radius)
    except ValueError:
        radius = 10.0
        
    try:
        if lat is not None:
            lat = float(lat)
        if lng is not None:
            lng = float(lng)
    except ValueError:
        lat = None
        lng = None
        
    results = search_places(lat=lat, lng=lng, query=query, radius_km=radius, place_type=place_type)
    return jsonify(results)
