# 🚗 SafeDriveAI

SafeDriveAI is an AI-powered driver safety and monitoring system designed to reduce road accidents by detecting driver drowsiness, distraction, and unsafe driving behavior in real time.

## 📌 Features

* 😴 Drowsiness Detection

  * Detects driver fatigue using facial landmarks and eye aspect ratio (EAR).
  * Triggers alerts when drowsiness is detected.

* 📱 Mobile Phone Detection

  * Identifies mobile phone usage while driving.
  * Warns drivers against distracted driving.

* 🚨 Emergency SOS

  * Sends emergency alerts when critical conditions are detected.
  * Helps improve response time during accidents.

* 📊 Real-Time Dashboard

  * Displays driver status and safety alerts.
  * Provides live monitoring information.

* 🔔 Alert Management

  * Stores and manages alerts.
  * Tracks safety events for future analysis.

## 🏗️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Backend

* Python
* Flask
* OpenCV
* MediaPipe

### AI & Computer Vision

* Face Detection
* Eye Tracking
* Drowsiness Detection
* Object Detection

## 📂 Project Structure

SafeDriveAI/
├── frontend/
│   ├── src/
│   └── public/
│
├── backend/
│   ├── alerts.csv
│   ├── app.py
│   └── models/
│
└── README.md

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/lokeshpawar0708-source/SafeDriveAi.git
cd SafeDriveAi
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🚀 Future Enhancements

* GPS Integration
* Live Location Tracking
* Cloud Storage
* Driver Analytics
* Voice Assistant
* AI-based Risk Prediction
* Raspberry Pi / Jetson Nano Deployment

## 👥 Contributors

* Lokesh Pawar
* Shubham Wagh
* Shivaji Jagdale


## 📄 License

This project is developed for educational and hackathon purposes.


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
