from app import create_app

app = create_app()

if __name__ == '__main__':
    # Start the Flask app on port 5000 (disabling reloader to prevent double process camera locking on Windows)
    print("Starting SafeDrive AI Backend API Server...")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
