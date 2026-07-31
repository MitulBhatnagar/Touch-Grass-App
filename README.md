# 🌱 Touch Grass | AI-Powered Screen Time Inhibitor

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

> A brutal, full-stack productivity app that tracks application usage and fires context-aware, highly offensive AI roasts to stop you from doomscrolling. 

Designed to combat the modern reality of 8 to 12-hour daily screen time averages, **Touch Grass** monitors background usage and intervenes when you are wasting your life on distracting apps. It utilizes a custom hybrid intelligence engine—defaulting to the Google Gemini API when online, and instantly falling back to a local database of taunts when offline.

---

## 📸 Interface Preview

*Note: Add your screenshots here by dragging and dropping them into the GitHub editor!*

|  AI Notification |
| :---: | :---: | :---: |
| <img width="1080" height="1272" alt="WhatsApp Image 2026-07-26 at 10 21 37 PM" src="https://github.com/user-attachments/assets/00a76475-db92-4035-a8b1-4755363a584d" /> | <img width="720" height="873" alt="WhatsApp Image 2026-07-31 at 11 22 30 PM" src="https://github.com/user-attachments/assets/f69681db-9b45-42e3-bf27-58c8f6ce8b76" /> | 

---

## ✨ Core Features

*   **⚡ Hybrid Roasting Engine:** 
    *   **Online:** Hits a Python/FastAPI backend utilizing `gemini-3.6-flash` for real-time, context-aware insults based on the specific app and duration.
    *   **Offline:** Uses `@react-native-community/netinfo` to detect network drops, instantly falling back to a bundled JSON database of thousands of pre-written roasts with zero latency.
*   **📊 Developer-Grade UI:** Fully styled using the strict **Mintlify Design System** (Canvas White/Surface Gray contrasts, Geist Mono typography, and strict 9999px pill radii).
*   **🕵️ Background Watchdog:** Uses `expo-task-manager` and `expo-android-usagestats` to silently monitor foreground activity and trigger system-level push notifications when time limits are exceeded.
*   **📈 Data Visualization:** Monochromatic, professional pie-chart breakdowns of daily application distribution.

---

## 🛠️ Architecture & Tech Stack

This repository is structured as a monorepo containing both the mobile client and the API server.

**Frontend (Mobile):**
*   React Native / Expo
*   `expo-android-usagestats` (Native Android APIs)
*   `react-native-chart-kit` & `react-native-svg` (Visualization)
*   `expo-notifications` & `expo-background-fetch`

**Backend (API):**
*   Python 3.x
*   FastAPI & Uvicorn
*   Google GenAI SDK
*   Hosted natively on Render

---

## 🚀 Getting Started

### 1. Run the FastAPI Backend
Navigate to the backend directory and start the server:

```bash
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY="your-api-key-here"
uvicorn main:app --reload
