// Varuna — ESP32 water-pump controller firmware.
//
// Responsibilities:
//   • Read 2 float switches + 3 SS probes (pulsed AC excitation) + overload sense.
//   • Drive the DOL contactor coil (held relay) per AUTO / semi-auto MANUAL logic.
//   • Enforce safety: dry-run protection, overload latch, run-time limit, boot-off.
//   • Serve a self-contained web dashboard for control + configuration.
//   • Handle the config button (WiFi portal) and factory-reset button.
//   • Mirror everything onto the 5 status LEDs.
//   • Optional MQTT + ArduinoOTA + hardware watchdog.
//
// See firmware.txt for the authoritative hardware spec. pins.h is the pin map.

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h>

#include "pins.h"
#include "config.h"
#include "web_ui.h"

#ifndef VARUNA_FW_VERSION
#define VARUNA_FW_VERSION "dev"
#endif

// ── Globals ──────────────────────────────────────────────────────────────────
Config gConfig;

static WebServer       server(80);
static WiFiClient      mqttNet;
static PubSubClient    mqtt(mqttNet);

// System run state, surfaced to UI + MQTT + LED1.
enum class SysState : uint8_t { IDLE, RUNNING, FAULT };

// Latched fault cause (cleared only by user reset once the cause clears).
enum class Fault : uint8_t { NONE, OVERLOAD, TIMEOUT };

struct State {
  Mode     mode          = Mode::AUTO;
  bool     motor         = false;     // contactor coil energised
  SysState sys           = SysState::IDLE;
  Fault    fault         = Fault::NONE;

  // Debounced sensor truth (what the logic acts on).
  bool fl1=false, fl2=false;          // tank LOW / tank HIGH float triggered
  bool pr1=false, pr2=false, pr3=false;  // sump LOW/MID/HIGH probe wet
  bool overload=false;                // true = tripped

  // Hysteresis / lockout bookkeeping.
  bool      tankFullLatch = false;    // set when stopped on full; cleared when tank low again
  uint32_t  dryLockUntil  = 0;        // millis() before which auto-restart is blocked
  uint32_t  motorStartMs  = 0;        // when the current run began

  bool      portalActive  = false;    // SoftAP config portal up
  uint32_t  portalUntil   = 0;
} S;

// ── Debounced digital input helper ──────────────────────────────────────────
// Confirms a level is stable for `debounceMs` before reporting a change.
struct Debounced {
  bool stable=false, last=false;
  uint32_t since=0;
  // raw = the logical "active" reading already normalised by the caller.
  bool update(bool raw, uint32_t now, uint16_t ms) {
    if (raw != last) { last = raw; since = now; }
    else if (raw != stable && (now - since) >= ms) { stable = raw; }
    return stable;
  }
};
static Debounced dFl1, dFl2, dOl;

// ── Forward declarations ─────────────────────────────────────────────────────
void startMotor(const char* why);
void stopMotor(const char* why);
void publishState();

// ─────────────────────────────────────────────────────────────────────────────
// PROBE EXCITATION (pulsed AC, never DC) — see firmware.txt
// ─────────────────────────────────────────────────────────────────────────────
// Every >=100ms: pulse GPIO33 HIGH ~2ms, sample the three probes, drop it LOW.
namespace Probe {
  uint32_t lastCycle = 0;
  bool p1=false, p2=false, p3=false;

  void poll(uint32_t now) {
    if (now - lastCycle < 100) return;
    lastCycle = now;
    digitalWrite(PIN_PROBE_EXC, HIGH);
    delay(2);                       // settle 30-40m CAT6 capacitance (RC ~2.5us)
    p1 = digitalRead(PIN_PR1);      // pull-down front-end: HIGH = water present
    p2 = digitalRead(PIN_PR2);
    p3 = digitalRead(PIN_PR3);
    digitalWrite(PIN_PROBE_EXC, LOW);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LED scheduler (non-blocking)
// ─────────────────────────────────────────────────────────────────────────────
// LED1 (green) encodes system status via blink patterns; the rest are 1:1 mirrors.
namespace Led {
  // LED1 patterns.
  enum class Status { OFF, SOLID, SLOW, FAST, DOUBLE };
  Status status = Status::OFF;

  void setStatus(Status s) { status = s; }

  // Returns LED1 level for a given pattern at time `now`.
  bool statusLevel(uint32_t now) {
    switch (status) {
      case Status::OFF:    return false;
      case Status::SOLID:  return true;
      case Status::SLOW:   return (now % 1000) < 500;          // 1 Hz
      case Status::FAST:   return (now % 250)  < 125;          // 4 Hz
      case Status::DOUBLE: {                                   // double-flash / 1.2s
        uint32_t t = now % 1200;
        return (t < 120) || (t >= 240 && t < 360);
      }
    }
    return false;
  }

  void apply(uint32_t now) {
    digitalWrite(PIN_LED_STATUS, statusLevel(now));
    digitalWrite(PIN_LED_MOTOR, S.motor);
    digitalWrite(PIN_LED_FL1,   S.fl1);
    digitalWrite(PIN_LED_FL2,   S.fl2);
    digitalWrite(PIN_LED_PRB,   Probe::p1 || Probe::p2 || Probe::p3);
  }

  // Pick the LED1 pattern from the current system condition.
  void refresh() {
    if (S.portalActive)               setStatus(Status::DOUBLE);
    else if (S.fault != Fault::NONE)  setStatus(Status::FAST);
    else if (S.motor)                 setStatus(Status::SOLID);
    else if (WiFi.status()==WL_CONNECTED) setStatus(Status::SLOW);
    else                              setStatus(Status::FAST);  // WiFi lost = fault blink
  }

  // Blocking confirmation blink (used for factory reset only, just before reboot).
  void confirmBlink(int times) {
    for (int i = 0; i < times; i++) {
      digitalWrite(PIN_LED_STATUS, HIGH); delay(80);
      digitalWrite(PIN_LED_STATUS, LOW);  delay(80);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor control
// ─────────────────────────────────────────────────────────────────────────────
// Single relay, HELD while running. Safety preconditions enforced here so no
// caller can bypass them.
void startMotor(const char* why) {
  if (S.motor) return;
  if (S.overload)  { Serial.println("[motor] start blocked: overload"); return; }
  if (!S.pr1)      { Serial.println("[motor] start blocked: dry sump"); return; }
  if (millis() < S.dryLockUntil) { Serial.println("[motor] start blocked: dry lockout"); return; }
  digitalWrite(PIN_MOTOR, HIGH);
  S.motor = true;
  S.motorStartMs = millis();
  Serial.printf("[motor] START (%s)\n", why);
  publishState();
}

void stopMotor(const char* why) {
  if (!S.motor) return;
  digitalWrite(PIN_MOTOR, LOW);
  S.motor = false;
  Serial.printf("[motor] STOP (%s)\n", why);
  publishState();
}

// ─────────────────────────────────────────────────────────────────────────────
// Control logic — runs every loop after sensors are refreshed.
// ─────────────────────────────────────────────────────────────────────────────
void controlLogic() {
  uint32_t now = millis();

  // (1) Overload is an unconditional, latching safety stop in every mode.
  if (S.overload) {
    if (S.motor) stopMotor("overload trip");
    S.fault = Fault::OVERLOAD;
  }

  // A latched fault keeps the motor off until the user resets AND cause cleared.
  if (S.fault != Fault::NONE) {
    if (S.motor) stopMotor("fault latched");
    S.sys = SysState::FAULT;
    return;
  }

  // (2) Run-time safety limit (applies in both modes).
  if (S.motor && gConfig.maxRunSeconds > 0 &&
      (now - S.motorStartMs) >= gConfig.maxRunSeconds * 1000UL) {
    stopMotor("max run timeout");
    S.fault = Fault::TIMEOUT;          // latch — operator should investigate
    S.sys = SysState::FAULT;
    return;
  }

  if (S.mode == Mode::AUTO) {
    // Reset the tank-full hysteresis latch once the tank drains to LOW again.
    if (S.fl1) S.tankFullLatch = false;

    if (!S.motor) {
      bool canStart = S.fl1 &&                 // tank needs water
                      S.pr1 &&                 // sump has water (dry-run guard)
                      !S.tankFullLatch &&       // wait for low float after a full stop
                      now >= S.dryLockUntil;    // dry-run cooldown elapsed
      if (canStart) startMotor("auto: tank low + sump ok");
    } else {
      if (S.fl2) {                              // tank full
        stopMotor("auto: tank full");
        S.tankFullLatch = true;
      } else if (!S.pr1) {                       // sump went dry
        stopMotor("auto: dry sump");
        S.dryLockUntil = now + gConfig.dryLockoutSecs * 1000UL;
      }
    }
  } else {  // Mode::MANUAL — semi-automatic force-start
    // Start only on explicit user command (handled in the /api/cmd handler).
    // Once running, auto-stop on an exit condition; do NOT auto-restart.
    if (S.motor) {
      if (S.fl2)        stopMotor("manual: tank full");
      else if (!S.pr1) { stopMotor("manual: dry sump");
                         S.dryLockUntil = now + gConfig.dryLockoutSecs * 1000UL; }
    }
  }

  S.sys = S.motor ? SysState::RUNNING : SysState::IDLE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sensor refresh (debounced)
// ─────────────────────────────────────────────────────────────────────────────
void readSensors(uint32_t now) {
  // Floats: pull-up front-end, LOW = triggered. Normalise to "triggered" = true.
  S.fl1 = dFl1.update(digitalRead(PIN_FL1) == LOW, now, gConfig.debounceMs);
  S.fl2 = dFl2.update(digitalRead(PIN_FL2) == LOW, now, gConfig.debounceMs);
  // Overload: pull-up, HIGH = tripped.
  S.overload = dOl.update(digitalRead(PIN_OVERLOAD) == HIGH, now, gConfig.debounceMs);
  // Probes are sampled inside Probe::poll(); copy the latest cycle result.
  S.pr1 = Probe::p1; S.pr2 = Probe::p2; S.pr3 = Probe::p3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Buttons — hold detection. Active LOW.
// ─────────────────────────────────────────────────────────────────────────────
namespace Btn {
  uint32_t pairDownAt = 0, rstDownAt = 0;
  bool pairLatched = false, rstLatched = false;
  uint32_t bootMs = 0;

  void factoryReset() {
    Serial.println("[btn] FACTORY RESET");
    ConfigStore::factoryReset();
    Led::confirmBlink(10);            // fast 10x confirm, then reboot
    ESP.restart();
  }

  void startConfigPortal();           // defined after the web layer

  void poll(uint32_t now) {
    // Ignore GPIO0 for the first 2s after boot (it doubles as the boot-mode pin).
    bool pairDown = (now - bootMs > 2000) && digitalRead(PIN_BTN_PAIR) == LOW;
    bool rstDown  = digitalRead(PIN_BTN_RST) == LOW;

    if (pairDown) {
      if (!pairDownAt) pairDownAt = now;
      else if (!pairLatched && now - pairDownAt >= 3000) { pairLatched = true; startConfigPortal(); }
    } else { pairDownAt = 0; pairLatched = false; }

    if (rstDown) {
      if (!rstDownAt) rstDownAt = now;
      else if (!rstLatched && now - rstDownAt >= 5000) { rstLatched = true; factoryReset(); }
    } else { rstDownAt = 0; rstLatched = false; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON helpers + web API
// ─────────────────────────────────────────────────────────────────────────────
static const char* stateStr() {
  switch (S.sys) { case SysState::RUNNING: return "running";
                   case SysState::FAULT:   return "fault";
                   default:                return "idle"; }
}
static const char* faultStr() {
  switch (S.fault) { case Fault::OVERLOAD: return "overload";
                     case Fault::TIMEOUT:  return "timeout";
                     default:              return "none"; }
}

String statusJson() {
  uint32_t now = millis();
  String j = "{";
  j += "\"version\":\"" VARUNA_FW_VERSION "\",";
  j += "\"ip\":\"" + (WiFi.status()==WL_CONNECTED ? WiFi.localIP().toString()
                      : (S.portalActive ? WiFi.softAPIP().toString() : String(""))) + "\",";
  j += "\"wifi\":" + String(WiFi.status()==WL_CONNECTED ? "true":"false") + ",";
  j += "\"state\":\"" + String(stateStr()) + "\",";
  j += "\"fault\":\"" + String(faultStr()) + "\",";
  j += "\"mode\":\"" + String(S.mode==Mode::AUTO?"auto":"manual") + "\",";
  j += "\"motor\":" + String(S.motor?"true":"false") + ",";
  j += "\"fl1\":" + String(S.fl1?"true":"false") + ",";
  j += "\"fl2\":" + String(S.fl2?"true":"false") + ",";
  j += "\"pr1\":" + String(S.pr1?"true":"false") + ",";
  j += "\"pr2\":" + String(S.pr2?"true":"false") + ",";
  j += "\"pr3\":" + String(S.pr3?"true":"false") + ",";
  j += "\"overload\":" + String(S.overload?"true":"false") + ",";
  j += "\"uptime\":" + String(now/1000) + ",";
  j += "\"runtime\":" + String(S.motor ? (now-S.motorStartMs)/1000 : 0);
  j += "}";
  return j;
}

void handleStatus() { server.send(200, "application/json", statusJson()); }

void handleCmd() {
  String c = server.arg("c");
  if      (c == "start") { S.mode = Mode::MANUAL; startMotor("web: force start"); }
  else if (c == "stop")  { stopMotor("web: stop"); }
  else if (c == "auto")  { S.mode = Mode::AUTO;   Serial.println("[mode] AUTO"); }
  else if (c == "manual"){ S.mode = Mode::MANUAL; stopMotor("web: switch to manual"); }
  else if (c == "reset") {                          // clear latched fault
    if (S.overload) { server.send(409, "application/json",
        "{\"ok\":false,\"err\":\"overload still tripped\"}"); return; }
    S.fault = Fault::NONE; Serial.println("[fault] cleared by user");
  }
  else { server.send(400, "application/json", "{\"ok\":false}"); return; }
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleConfigGet() {
  String j = "{";
  j += "\"ssid\":\"" + gConfig.wifiSsid + "\",";
  j += "\"host\":\"" + gConfig.hostname + "\",";
  j += "\"mode\":" + String((int)gConfig.defaultMode) + ",";
  j += "\"maxrun\":" + String(gConfig.maxRunSeconds) + ",";
  j += "\"drylock\":" + String(gConfig.dryLockoutSecs) + ",";
  j += "\"mqtt\":\"" + gConfig.mqttBroker + "\",";
  j += "\"mqttport\":" + String(gConfig.mqttPort) + ",";
  j += "\"mqttuser\":\"" + gConfig.mqttUser + "\",";
  j += "\"mqtttopic\":\"" + gConfig.mqttBaseTopic + "\"";
  j += "}";
  server.send(200, "application/json", j);
}

// Minimal JSON string-field extractor (avoids pulling in ArduinoJson).
static String jsonStr(const String& body, const char* key) {
  String pat = "\"" + String(key) + "\"";
  int k = body.indexOf(pat); if (k < 0) return "";
  int colon = body.indexOf(':', k); if (colon < 0) return "";
  int q1 = body.indexOf('"', colon + 1); if (q1 < 0) return "";
  int q2 = body.indexOf('"', q1 + 1);    if (q2 < 0) return "";
  return body.substring(q1 + 1, q2);
}
static long jsonNum(const String& body, const char* key, long def) {
  String pat = "\"" + String(key) + "\"";
  int k = body.indexOf(pat); if (k < 0) return def;
  int colon = body.indexOf(':', k); if (colon < 0) return def;
  int i = colon + 1; while (i < (int)body.length() && (body[i]==' ')) i++;
  int start = i; while (i < (int)body.length() && (isdigit(body[i])||body[i]=='-')) i++;
  if (i == start) return def;
  return body.substring(start, i).toInt();
}

void handleConfigPost() {
  String body = server.arg("plain");
  bool wifiChanged = false, mqttChanged = false;

  String ssid = jsonStr(body, "ssid");
  String pass = jsonStr(body, "pass");
  if (ssid != gConfig.wifiSsid) wifiChanged = true;
  if (pass.length()) { if (pass != gConfig.wifiPass) wifiChanged = true; gConfig.wifiPass = pass; }
  gConfig.wifiSsid = ssid;

  String host = jsonStr(body, "host"); if (host.length()) gConfig.hostname = host;
  gConfig.defaultMode   = static_cast<Mode>(jsonNum(body, "mode", (int)gConfig.defaultMode));
  gConfig.maxRunSeconds = jsonNum(body, "maxrun", gConfig.maxRunSeconds);
  gConfig.dryLockoutSecs= jsonNum(body, "drylock", gConfig.dryLockoutSecs);

  String mqtt = jsonStr(body, "mqtt");
  if (mqtt != gConfig.mqttBroker) mqttChanged = true;
  gConfig.mqttBroker    = mqtt;
  gConfig.mqttPort      = jsonNum(body, "mqttport", gConfig.mqttPort);
  gConfig.mqttUser      = jsonStr(body, "mqttuser");
  String mpass = jsonStr(body, "mqttpass"); if (mpass.length()) gConfig.mqttPass = mpass;
  String mtopic = jsonStr(body, "mqtttopic"); if (mtopic.length()) gConfig.mqttBaseTopic = mtopic;

  ConfigStore::save();
  bool reboot = wifiChanged || mqttChanged;
  server.send(200, "application/json",
              String("{\"ok\":true,\"reboot\":") + (reboot?"true":"false") + "}");
  if (reboot) { delay(300); ESP.restart(); }
}

void setupWebServer() {
  server.on("/", HTTP_GET, []{ server.send_P(200, "text/html", INDEX_HTML); });
  server.on("/api/status", HTTP_GET,  handleStatus);
  server.on("/api/cmd",    HTTP_GET,  handleCmd);
  server.on("/api/config", HTTP_GET,  handleConfigGet);
  server.on("/api/config", HTTP_POST, handleConfigPost);
  server.onNotFound([]{ server.sendHeader("Location", "/"); server.send(302); });
  server.begin();
  Serial.println("[web] server on :80");
}

// ─────────────────────────────────────────────────────────────────────────────
// WiFi + config portal
// ─────────────────────────────────────────────────────────────────────────────
void startConfigPortal() {
  Serial.println("[wifi] starting config portal");
  S.portalActive = true;
  S.portalUntil  = millis() + 3UL * 60UL * 1000UL;   // 3 min timeout
  String ap = "Varuna-Setup-" + String((uint16_t)(ESP.getEfuseMac() & 0xFFFF), HEX);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ap.c_str());
  Serial.printf("[wifi] AP '%s' @ %s\n", ap.c_str(), WiFi.softAPIP().toString().c_str());
}
void Btn::startConfigPortal() { ::startConfigPortal(); }

void connectWifi() {
  if (!gConfig.hasWifi()) { startConfigPortal(); return; }
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(gConfig.hostname.c_str());
  WiFi.begin(gConfig.wifiSsid.c_str(), gConfig.wifiPass.c_str());
  Serial.printf("[wifi] connecting to '%s'", gConfig.wifiSsid.c_str());
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    // Fast-blink LED1 while connecting; keep watchdog fed.
    digitalWrite(PIN_LED_STATUS, (millis() % 250) < 125);
    delay(50); esp_task_wdt_reset(); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected @ %s\n", WiFi.localIP().toString().c_str());
    if (MDNS.begin(gConfig.hostname.c_str()))
      Serial.printf("[wifi] mDNS http://%s.local\n", gConfig.hostname.c_str());
  } else {
    Serial.println("[wifi] connect failed — opening config portal");
    startConfigPortal();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MQTT (optional)
// ─────────────────────────────────────────────────────────────────────────────
namespace Mqtt {
  uint32_t lastTry = 0, lastPub = 0;

  void onMessage(char* topic, byte* payload, unsigned int len) {
    String msg; for (unsigned i=0;i<len;i++) msg += (char)payload[i];
    Serial.printf("[mqtt] %s = %s\n", topic, msg.c_str());
    if      (msg == "start") { S.mode = Mode::MANUAL; startMotor("mqtt"); }
    else if (msg == "stop")  { stopMotor("mqtt"); }
    else if (msg == "auto")  { S.mode = Mode::AUTO; }
  }

  void reconnect(uint32_t now) {
    if (!gConfig.hasMqtt() || WiFi.status()!=WL_CONNECTED) return;
    if (mqtt.connected() || now - lastTry < 5000) return;
    lastTry = now;
    mqtt.setServer(gConfig.mqttBroker.c_str(), gConfig.mqttPort);
    mqtt.setCallback(onMessage);
    String cid = gConfig.hostname + "-" + String((uint16_t)(ESP.getEfuseMac()&0xFFFF), HEX);
    bool ok = gConfig.mqttUser.length()
      ? mqtt.connect(cid.c_str(), gConfig.mqttUser.c_str(), gConfig.mqttPass.c_str())
      : mqtt.connect(cid.c_str());
    if (ok) { mqtt.subscribe((gConfig.mqttBaseTopic + "/cmd").c_str());
              Serial.println("[mqtt] connected"); }
  }

  void publish() {
    if (!mqtt.connected()) return;
    String b = gConfig.mqttBaseTopic;
    mqtt.publish((b+"/status").c_str(), stateStr(), true);
    mqtt.publish((b+"/tank/low").c_str(),  S.fl1?"1":"0", true);
    mqtt.publish((b+"/tank/high").c_str(), S.fl2?"1":"0", true);
    mqtt.publish((b+"/probe/1").c_str(),   S.pr1?"1":"0", true);
    mqtt.publish((b+"/probe/2").c_str(),   S.pr2?"1":"0", true);
    mqtt.publish((b+"/probe/3").c_str(),   S.pr3?"1":"0", true);
    mqtt.publish((b+"/overload").c_str(),  S.overload?"1":"0", true);
  }

  void loop(uint32_t now) {
    reconnect(now);
    if (mqtt.connected()) { mqtt.loop();
      if (now - lastPub > 2000) { lastPub = now; publish(); } }
  }
}
void publishState() { Mqtt::publish(); }

// ─────────────────────────────────────────────────────────────────────────────
// OTA — guarded so it never runs while the pump is energised.
// ─────────────────────────────────────────────────────────────────────────────
void setupOta() {
  ArduinoOTA.setHostname(gConfig.hostname.c_str());
  ArduinoOTA.setPassword(gConfig.otaPassword.c_str());
  ArduinoOTA.onStart([]{ stopMotor("OTA update"); });
  ArduinoOTA.begin();
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / loop
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Varuna Pump Controller " VARUNA_FW_VERSION " ===");

  // BOOT SAFETY — order matters (see firmware.txt §BOOT SEQUENCE).
  pinMode(PIN_PROBE_EXC, OUTPUT); digitalWrite(PIN_PROBE_EXC, LOW);  // (1) excitation off FIRST
  pinMode(PIN_MOTOR,     OUTPUT); digitalWrite(PIN_MOTOR,     LOW);  // (2) contactor OFF
  pinMode(PIN_LED_STATUS,OUTPUT); pinMode(PIN_LED_MOTOR,OUTPUT);
  pinMode(PIN_LED_FL1,   OUTPUT); pinMode(PIN_LED_FL2, OUTPUT); pinMode(PIN_LED_PRB, OUTPUT);
  digitalWrite(PIN_LED_STATUS,LOW); digitalWrite(PIN_LED_MOTOR,LOW);
  digitalWrite(PIN_LED_FL1,LOW); digitalWrite(PIN_LED_FL2,LOW); digitalWrite(PIN_LED_PRB,LOW);

  // Inputs (input-only pins take no internal pull; board provides external pulls).
  pinMode(PIN_FL1, INPUT); pinMode(PIN_FL2, INPUT);
  pinMode(PIN_PR1, INPUT); pinMode(PIN_PR2, INPUT); pinMode(PIN_PR3, INPUT);
  pinMode(PIN_OVERLOAD, INPUT);
  pinMode(PIN_BTN_PAIR, INPUT_PULLUP); pinMode(PIN_BTN_RST, INPUT_PULLUP);

  // Watchdog (30s) — feed it in loop().
  esp_task_wdt_init(30, true);
  esp_task_wdt_add(NULL);

  ConfigStore::load();
  S.mode = gConfig.defaultMode;
  Btn::bootMs = millis();

  connectWifi();
  setupWebServer();
  setupOta();

  Serial.println("[boot] ready");
}

void loop() {
  uint32_t now = millis();

  Probe::poll(now);        // pulsed excitation + probe sample
  readSensors(now);        // debounced floats + overload + copy probe results
  controlLogic();          // AUTO / MANUAL state machine + safety
  Btn::poll(now);          // config-portal / factory-reset hold detection

  // Config portal timeout → reboot back into normal mode.
  if (S.portalActive && (int32_t)(now - S.portalUntil) > 0) {
    Serial.println("[wifi] portal timeout — rebooting");
    ESP.restart();
  }

  Led::refresh();
  Led::apply(now);

  server.handleClient();
  ArduinoOTA.handle();
  Mqtt::loop(now);

  esp_task_wdt_reset();
}
