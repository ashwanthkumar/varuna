// Varuna — persistent configuration stored in NVS (ESP32 Preferences).
//
// Holds WiFi credentials, operating mode default, timing/safety parameters, and
// optional MQTT settings. Loaded once at boot; written when the user saves via
// the web UI or the config portal. Factory reset clears the whole namespace.

#pragma once

#include <Arduino.h>
#include <Preferences.h>

// Operating mode. AUTO = fully automatic level control. MANUAL = semi-automatic:
// the motor only starts on an explicit user command and then runs until an exit
// condition (tank full / sump dry / overload / timeout / user stop) is reached.
// It does NOT auto-restart in MANUAL — that is the "force start, one fill" model.
enum class Mode : uint8_t { AUTO = 0, MANUAL = 1 };

struct Config {
  // ── WiFi ──────────────────────────────────────────────────────────────────
  String wifiSsid;
  String wifiPass;
  String hostname = "varuna";

  // ── Behaviour ───────────────────────────────────────────────────────────────
  Mode    defaultMode      = Mode::AUTO;
  // Stop the motor after this many seconds of continuous run (safety timeout).
  uint32_t maxRunSeconds   = 30UL * 60UL;     // 30 minutes
  // After a dry-run stop, refuse to restart for this long (sump refill time).
  uint32_t dryLockoutSecs  = 5UL * 60UL;      // 5 minutes
  // Sensor debounce: a reading must be stable this long before it is acted on.
  uint16_t debounceMs      = 50;

  // ── MQTT (optional — empty broker disables MQTT entirely) ───────────────────
  String   mqttBroker;
  uint16_t mqttPort        = 1883;
  String   mqttUser;
  String   mqttPass;
  String   mqttBaseTopic   = "varuna";

  // ── OTA ─────────────────────────────────────────────────────────────────────
  String   otaPassword     = "varuna-ota";

  bool hasWifi() const { return wifiSsid.length() > 0; }
  bool hasMqtt() const { return mqttBroker.length() > 0; }
};

// Global config instance.
extern Config gConfig;

namespace ConfigStore {

constexpr const char* NS = "varuna";

// Load config from NVS into gConfig. Missing keys keep their struct defaults.
inline void load() {
  Preferences p;
  p.begin(NS, /*readOnly=*/true);
  gConfig.wifiSsid      = p.getString("ssid", gConfig.wifiSsid);
  gConfig.wifiPass      = p.getString("pass", gConfig.wifiPass);
  gConfig.hostname      = p.getString("host", gConfig.hostname);
  gConfig.defaultMode   = static_cast<Mode>(p.getUChar("mode", static_cast<uint8_t>(gConfig.defaultMode)));
  gConfig.maxRunSeconds = p.getULong("maxrun", gConfig.maxRunSeconds);
  gConfig.dryLockoutSecs= p.getULong("drylock", gConfig.dryLockoutSecs);
  gConfig.debounceMs    = p.getUShort("debounce", gConfig.debounceMs);
  gConfig.mqttBroker    = p.getString("mqtt", gConfig.mqttBroker);
  gConfig.mqttPort      = p.getUShort("mqttport", gConfig.mqttPort);
  gConfig.mqttUser      = p.getString("mqttuser", gConfig.mqttUser);
  gConfig.mqttPass      = p.getString("mqttpass", gConfig.mqttPass);
  gConfig.mqttBaseTopic = p.getString("mqtttopic", gConfig.mqttBaseTopic);
  gConfig.otaPassword   = p.getString("ota", gConfig.otaPassword);
  p.end();
}

// Persist gConfig to NVS.
inline void save() {
  Preferences p;
  p.begin(NS, /*readOnly=*/false);
  p.putString("ssid", gConfig.wifiSsid);
  p.putString("pass", gConfig.wifiPass);
  p.putString("host", gConfig.hostname);
  p.putUChar("mode", static_cast<uint8_t>(gConfig.defaultMode));
  p.putULong("maxrun", gConfig.maxRunSeconds);
  p.putULong("drylock", gConfig.dryLockoutSecs);
  p.putUShort("debounce", gConfig.debounceMs);
  p.putString("mqtt", gConfig.mqttBroker);
  p.putUShort("mqttport", gConfig.mqttPort);
  p.putString("mqttuser", gConfig.mqttUser);
  p.putString("mqttpass", gConfig.mqttPass);
  p.putString("mqtttopic", gConfig.mqttBaseTopic);
  p.putString("ota", gConfig.otaPassword);
  p.end();
}

// Wipe all stored config/credentials (factory reset). Firmware is untouched.
inline void factoryReset() {
  Preferences p;
  p.begin(NS, /*readOnly=*/false);
  p.clear();
  p.end();
}

}  // namespace ConfigStore
