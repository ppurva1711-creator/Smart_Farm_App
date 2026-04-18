# Motor ON/OFF Pathway (Dashboard ↔ Backend ↔ ESP8266)

1. **Dashboard/App writes desired motor state** to Firebase at:
   - `devices/{deviceId}/motor/desiredState`
   - `devices/{deviceId}/motor/desiredAt`

2. **ESP8266 polls backend** every 5s:
   - `GET /api/motor?deviceId=<id>&secret=<HARDWARE_SECRET>`

3. Backend (`app/api/motor/route.ts`) reads Firebase `devices/{deviceId}/motor` and returns desired state.

4. **ESP8266 drives motor pin(s)** (`DRV8833 IN1/IN2` or relay pin) ON/OFF.

5. **ESP8266 confirms actual state** by posting sensor heartbeat with `motorState`:
   - `POST /api/sensor-data`
   - body includes `motorState: true|false`

6. Backend updates:
   - `devices/{deviceId}/motor/hardwareState`
   - `devices/{deviceId}/motor/lastConfirmed`

This confirmation is already handled in `app/api/sensor-data/route.ts` when `motorState` is present.
