// types/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types used across API routes and client components
// ─────────────────────────────────────────────────────────────────────────────

export interface ValveState {
  id: string;                 // "valve1" | "valve2" | "valve3" | "valve4"
  isOpen: boolean;
  openedAt: number | null;    // Unix ms timestamp when last opened
  closedAt: number | null;    // Unix ms timestamp when last closed
  label: string;              // "Field A – North", localised later
  flowRateLPM: number;        // litres per minute (set during setup)
}

export interface SensorData {
  temperature: number;        // °C
  humidity?: number;          // % (if sensor available)
  battery: number;            // 0–100 %
  batteryVoltage: number;     // e.g. 12.4 V
  timestamp: number;          // Unix ms
}

export interface LocationData {
  lat: number;
  lng: number;
  source: "gps" | "gsm-cell";
  timestamp: number;
  accuracy?: number;           // metres
}

export interface WaterUsageEntry {
  valveId: string;
  openedAt: number;
  closedAt: number;
  durationMinutes: number;
  litresUsed: number;
  date: string;               // "YYYY-MM-DD"
}

export interface DailyWaterSummary {
  date: string;
  totalLitres: number;
  tankCapacityLitres: number; // configured in setup
  ratioPercent: number;       // (totalLitres / tankCapacity) * 100
  byValve: Record<string, number>; // valveId → litres
}

export interface BatteryChargeCycle {
  id: string;
  startPercent: number;       // when charging began
  endPercent: number;         // when full
  startTime: number;
  endTime: number;
}

export interface BatteryHealth {
  currentPercent: number;
  currentVoltage: number;
  cycleCount: number;
  estimatedHealthPercent: number; // 100 - (cycles * 0.5)
  isCharging: boolean;
  lastUpdated: number;
}

export interface UserProfile {
  uid: string;
  phone: string;              // E.164 format "+919876543210"
  hardwareSimNumber: string;  // SIM800L SIM number (E.164)
  tankCapacityLitres: number;
  language: "en" | "hi" | "mr" | "pa" | "te" | "ta";
  createdAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Hardware → API payload shapes
export interface HardwareSensorPayload {
  deviceId: string;
  temperature: number;
  humidity?: number;
  battery: number;
  batteryVoltage: number;
  valveStates: Record<string, boolean>; // { valve1: true, valve2: false … }
  location?: string;                    // "lat,lng" optional
  secret: string;                       // shared HMAC secret
}

export interface HardwareValveConfirmPayload {
  deviceId: string;
  valveId: string;
  actualState: boolean;       // what the hardware actually did
  timestamp: number;
  secret: string;
}
