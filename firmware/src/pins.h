// Varuna — hardware pin map and electrical polarity.
//
// This header is the single source of truth for GPIO assignments. It mirrors
// firmware.txt and the tscircuit netlist in pcb/index.circuit.tsx. Do not change
// a pin here without changing the board.
//
// Electrical polarity reference (verified against pcb/index.circuit.tsx traces):
//   LEDs   : GPIO -> 330R -> LED anode -> GND.  Active HIGH (HIGH = lit).
//   Buttons: GPIO -> board 10k pull-up; button shorts GPIO -> GND. Active LOW.
//   Relay  : GPIO23 -> ULN2003 IN1 -> RLY_MOTOR coil. HIGH = contactor energised.
//   Probes : pull-DOWN front-end. HIGH = water bridging probe during excitation.
//   Floats : pull-UP front-end.   LOW  = float contact closed (triggered).
//   Overld : pull-UP. LOW = NC contact closed = healthy. HIGH = tripped.

#pragma once

// ── Sensor inputs ───────────────────────────────────────────────────────────
// NOTE: GPIO34/35/36/39 are INPUT-ONLY and have NO internal pull resistors.
// The board provides the external pulls. Never configure these as OUTPUT.
constexpr int PIN_FL1 = 36;  // Float 1 — overhead tank LOW  (pull-up,  LOW=triggered)
constexpr int PIN_FL2 = 39;  // Float 2 — overhead tank HIGH (pull-up,  LOW=triggered)
constexpr int PIN_PR1 = 34;  // SS probe 1 — sump LOW level  (pull-down, HIGH=water)
constexpr int PIN_PR2 = 35;  // SS probe 2 — sump MID level  (pull-down, HIGH=water)
constexpr int PIN_PR3 = 32;  // SS probe 3 — sump HIGH level (pull-down, HIGH=water)

// ── Overload sense ──────────────────────────────────────────────────────────
constexpr int PIN_OVERLOAD = 21;  // J_OL: thermal overload NC aux. LOW=healthy, HIGH=tripped

// ── Outputs ─────────────────────────────────────────────────────────────────
constexpr int PIN_PROBE_EXC = 33;  // Probe AC excitation. PULSE only — never hold HIGH.
constexpr int PIN_MOTOR     = 23;  // RLY_MOTOR via ULN2003 IN1. HIGH=contactor on (HELD).

// ── LEDs (all active HIGH) ──────────────────────────────────────────────────
constexpr int PIN_LED_STATUS = 4;   // LED1 (green)     — system/WiFi status
constexpr int PIN_LED_MOTOR  = 17;  // LED_MOTOR (yellow) — mirrors motor relay
constexpr int PIN_LED_FL1    = 19;  // LED_FL1 (blue)   — tank LOW float
constexpr int PIN_LED_FL2    = 18;  // LED_FL2 (blue)   — tank HIGH float
constexpr int PIN_LED_PRB    = 5;   // LED_PRB (blue)   — any probe sees water
// LED_PWR (red) is hardware-only, wired to the 5V rail. No GPIO.

// ── Buttons (active LOW, board pull-up + 100nF debounce) ────────────────────
constexpr int PIN_BTN_PAIR = 0;   // Config / WiFi pairing. GPIO0 = boot pin; act only after boot.
constexpr int PIN_BTN_RST  = 16;  // Factory reset (hold 5s).
