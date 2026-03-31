# 🌾 Smart Farm App

> IoT-powered smart irrigation and farm monitoring system for Indian farmers

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange?logo=firebase)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## 📱 Live Demo

**Web App:** [smart-farm-app-ten.vercel.app](https://smart-farm-app-ten.vercel.app)

---

## 🧠 What is Smart Farm?

Smart Farm is a full-stack IoT mobile web application that allows Indian farmers to:

- **Remotely control irrigation valves** from their phone
- **Monitor real-time temperature & humidity** from field sensors
- **Track water usage** and tank capacity ratio daily
- **Get device GPS location** via GSM SMS command
- **Chat with an AI farming assistant** in their native language
- **Receive alerts** for power cuts, valve errors, and battery warnings
- **Login securely** via OTP phone authentication

The app connects to physical Arduino/SIM800L hardware installed in the field via Firebase Realtime Database.

---

## 🌐 Supported Languages

| Language | Code |
|----------|------|
| English  | `en` |
| हिंदी (Hindi) | `hi` |
| मराठी (Marathi) | `mr` |
| ਪੰਜਾਬੀ (Punjabi) | `pa` |
| తెలుగు (Telugu) | `te` |
| தமிழ் (Tamil) | `ta` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S PHONE                         │
│         Next.js Web App (Vercel)                        │
│  Dashboard | Valves | Alerts | Chat | Profile           │
└────────────────────┬────────────────────────────────────┘
                     │ Firebase Realtime DB
                     │ (real-time listeners)
┌────────────────────▼────────────────────────────────────┐
│              FIREBASE (Google Cloud)                    │
│  Realtime Database | Phone Auth | Security Rules       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST every 30s
                     │ HTTP GET every 5s (valve polling)
┌────────────────────▼────────────────────────────────────┐
│              HARDWARE (Field Device)                    │
│  Arduino Mega + SIM800L GSM + DHT22 + INA219           │
│  4x Relay (Valve Solenoids) + GPS                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔐 Authentication
- Firebase Phone OTP login
- 6-language UI from first screen
- User profile: name, address, village, district, state
- Hardware device linking (Device ID + SIM number)

### 📊 Dashboard
- Live temperature & humidity (DHT22 sensor)
- Battery % + voltage with health indicator
- Water usage today (litres + tank ratio bar)
- Device GPS location via SIM800L SMS
- Stale data warning if hardware offline
- Power cut alert when battery < 20%

### 🚿 Valve Control
- 4 independent valve toggles
- Writes desired state to Firebase instantly
- Hardware polls and physically opens/closes valve within 5s
- Hardware confirmation status shown ("✓ Confirmed" / "⏳ Waiting")
- Water usage tracked per valve (litres used)
- Turn All On / Turn All Off quick actions

### 🔔 Alerts & Notifications
- Power cut alerts
- Valve error notifications
- Battery cycle limit warnings
- High soil moisture alerts
- All alerts in user's selected language

### 💬 AI Farming Assistant (Chatbot)
- Reads live sensor data to give contextual answers
- Works in all 6 Indian languages
- Rule-based (no API cost) — instant responses
- Rotating quick-question suggestions
- Covers: valves, temperature, water usage, battery, irrigation advice

### 🔋 Battery Lifecycle
- Real-time battery % and voltage
- Charge cycle counting
- Estimated battery health percentage
- Low battery alerts

### 💧 Water Usage Tracking
- Daily water usage per valve
- Tank capacity ratio calculation
- Historical usage records in Firebase

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, Radix UI, shadcn/ui |
| Backend | Next.js API Routes (serverless) |
| Database | Firebase Realtime Database |
| Auth | Firebase Phone Authentication |
| Hardware Comm | HTTP over GPRS (SIM800L) |
| SMS / Location | Twilio (GSM location request) |
| Hosting | Vercel |
| Hardware | Arduino Mega, SIM800L, DHT22, INA219 |

---

## 📁 Project Structure

```
Smart_Farm_App/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # AI chatbot (rule-based)
│   │   ├── valves/route.ts        # Valve toggle + hardware polling
│   │   ├── sensor-data/route.ts   # Hardware sensor ingestion
│   │   ├── dashboard/route.ts     # Aggregated dashboard data
│   │   ├── location/              # GSM location request + SMS webhook
│   │   └── auth/                  # User profile management
│   ├── context/
│   │   ├── LanguageContext.tsx    # 6-language support (app-wide)
│   │   └── AuthContext.tsx        # Firebase auth state
│   ├── layout.tsx                 # Root layout with providers
│   └── page.tsx                   # Entry point
├── components/
│   ├── app-container.tsx          # Main app shell + navigation
│   ├── login-screen.tsx           # OTP login + profile setup
│   ├── dashboard-screen.tsx       # Live sensor dashboard
│   ├── valve-control-screen.tsx   # Real-time valve control
│   ├── alerts-screen.tsx          # Notifications
│   ├── chatbot-help-screen.tsx    # AI farming assistant
│   ├── battery-screen.tsx         # Battery health
│   ├── bottom-navigation.tsx      # Tab bar
│   └── language-selector.tsx      # Language switcher
├── lib/
│   ├── firebase.ts                # Firebase client SDK
│   ├── firebase-admin.ts          # Firebase admin SDK (server only)
│   └── i18n.ts                    # Translation helper
├── middleware/
│   └── hardware-auth.ts           # HMAC auth for hardware requests
├── types/
│   └── index.ts                   # TypeScript interfaces
├── hooks/
│   └── useRealtimeDevice.ts       # Firebase realtime hooks
└── hardware-firmware/
    └── smart_farm.ino             # Arduino firmware for SIM800L
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Firebase account
- Vercel account

### 1. Clone & Install

```bash
git clone https://github.com/ppurva1711-creator/Smart_Farm_App.git
cd Smart_Farm_App
pnpm install
```

### 2. Firebase Setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Phone Authentication**
3. Create **Realtime Database** (asia-south1 region)
4. Add test phone numbers for development

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DATABASE_URL=

# Hardware Security
HARDWARE_SHARED_SECRET=

# Optional: Twilio for SMS location
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 4. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy

```bash
# Add env variables in Vercel dashboard first
vercel deploy --prod
```

---

## 🔧 Hardware Setup

### Components Required
| Component | Purpose |
|-----------|---------|
| Arduino Mega 2560 | Main controller |
| SIM800L GSM Module | Internet + SMS |
| DHT22 Sensor | Temperature + Humidity |
| INA219 Module | Battery voltage/current |
| 4x Relay Module | Valve solenoid control |
| 12V Solenoid Valves | Field irrigation |
| 12V Lead-acid Battery | Power backup |
| SIM Card (with data) | GPRS connectivity |

### Wiring

```
Arduino Pin 10  → SIM800L TX
Arduino Pin 11  → SIM800L RX
Arduino Pin 4   → DHT22 Data
Arduino Pin 22  → Relay 1 (Valve 1)
Arduino Pin 24  → Relay 2 (Valve 2)
Arduino Pin 26  → Relay 3 (Valve 3)
Arduino Pin 28  → Relay 4 (Valve 4)
I2C SDA/SCL     → INA219
```

### Firmware Configuration

Open `hardware-firmware/smart_farm.ino` and update:

```cpp
const char* DEVICE_ID       = "farm_001";        // unique ID
const char* HARDWARE_SECRET = "your_secret";     // from .env
const char* APN             = "airtelgprs.com";  // your SIM APN
const char* SERVER_HOST     = "your-app.vercel.app";
```

### Required Arduino Libraries
- `ArduinoJson` by Benoit Blanchon
- `DHT sensor library` by Adafruit
- `Adafruit INA219`
- `Cryptosuite` by Cathedrow

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sensor-data` | Hardware HMAC | Hardware posts sensor readings every 30s |
| GET | `/api/valves?deviceId=xxx` | Hardware HMAC | Hardware polls for valve commands every 5s |
| POST | `/api/valves` | Firebase token | User toggles valve from app |
| POST | `/api/location/request` | Firebase token | User requests GPS location |
| POST | `/api/location/sms-webhook` | Twilio | Receives GPS reply SMS from hardware |
| POST | `/api/chat` | Firebase token | Farming chatbot query |
| POST | `/api/auth/setup-profile` | Firebase token | Save user profile + device link |
| GET | `/api/dashboard` | Firebase token | Aggregated live data |

---

## 🔄 Data Flow

### Valve Toggle
```
User taps toggle
    → Firebase: valves/valve1/desiredState = true
    → Hardware polls GET /api/valves every 5s
    → Arduino opens relay (valve opens physically)
    → Hardware confirms via PUT /api/valves
    → App shows "✓ Hardware confirmed"
```

### Sensor Data
```
Hardware: POST /api/sensor-data every 30s
    → API writes to Firebase: devices/{id}/sensors
    → Firebase realtime listener in app
    → Dashboard updates instantly
```

### Location Request
```
User taps "Get Location"
    → POST /api/location/request
    → Twilio sends SMS "LOCATION" to hardware SIM
    → SIM800L reads GPS coordinates
    → Hardware replies SMS "LOC:18.7645,73.4120"
    → Twilio webhook POST /api/location/sms-webhook
    → Coordinates saved to Firebase
    → App shows location with Maps link
```

---

## 🔒 Security

- Hardware authenticated via HMAC-SHA256 shared secret
- All client requests authenticated via Firebase ID tokens
- Firebase security rules restrict data access per user
- Admin SDK used only in server-side API routes
- `.env.local` never committed to git

---

## 🗺️ Roadmap

- [ ] Android native app (WebView with JS bridge)
- [ ] Scheduled irrigation (timer-based valve automation)
- [ ] Soil moisture sensor integration
- [ ] Weather API integration for smart irrigation advice
- [ ] Push notifications (FCM)
- [ ] Multiple farm/device support
- [ ] Historical graphs for temperature and water usage
- [ ] WhatsApp alerts integration

---

## 👨‍🌾 Made For

Indian farmers who need affordable, multilingual IoT farm management without expensive proprietary systems.

---

## 📄 License

MIT License — free to use, modify and distribute.

---

## 🤝 Contributing

Pull requests welcome. For major changes please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
```

