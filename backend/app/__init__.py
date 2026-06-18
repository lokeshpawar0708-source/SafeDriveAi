from flask import Flask, request, make_response
import os
from dotenv import load_dotenv
from app.views.routes import api_blueprint
from app.presenters.monitoring_presenter import monitoring_presenter
from app.models.alert_log import AlertLogger

# Load environment configurations
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Register routes
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # Custom CORS middleware
    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
            return response

    @app.after_request
    def after_request(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

    # Initialize CSV logs
    AlertLogger.initialize()

    # Start the monitoring presenter thread safely
    # Flask in debug mode runs code twice (reloader). WERKZEUG_RUN_MAIN controls the actual worker.
    is_reloader = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
    if not app.debug or is_reloader:
        monitoring_presenter.start()

    return app
