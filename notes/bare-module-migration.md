# Bare ESP32 module migration plan (deferred)

Status: **NOT done.** The current board uses an **ESP32 DevKit on female headers**.
This note is the checklist for a future revision that solders a bare
**ESP32-WROOM-32** module directly, to cut cost/size at volume.

Do this as ONE deliberate "productization" revision once the design is proven —
not piecemeal. On the DevKit board today, none of the parts below are needed
(the DevKit already includes them).

---

## Why switch (and why not yet)

| | DevKit (now) | Bare module (later) |
|---|---|---|
| Programming | DevKit USB, plug & play | needs added flash path (below) |
| Unit cost | higher (paying for the DevKit) | ~half (bare module) |
| Board size | ~15mm taller | smaller |
| Iteration/debug | swap DevKit instantly | reflow/rework to replace |
| Risk while developing | low | higher (boot circuit, antenna) |

Switch when cost/size/volume matters more than iteration speed.

---

## What the DevKit hides that you must add for a bare module

1. **3.3V regulator** — e.g. AMS1117-3.3 (or a better LDO) fed from the 5V rail.
   The module can pull ~500mA peaks on WiFi TX; size the LDO + bulk cap (≥10µF)
   accordingly.
2. **EN (reset) circuit** — 10k pull-up to 3V3 + 100nF to GND (power-on reset).
3. **GPIO0 (boot select)** — 10k pull-up to 3V3 (idles HIGH = normal boot;
   LOW at reset = download mode).
4. **Programming path** — choose one:
   - **6-pin serial header (cheapest):** 3V3 / GND / TX(GPIO1) / RX(GPIO3) /
     GPIO0 / EN. Flash with an external USB-serial dongle whose DTR/RTS auto-reset
     GPIO0+EN. Reuse one dongle across all units. ← recommended.
   - **On-board USB-UART (full DevKit-equivalent):** CP2102N or CH340C + USB-C +
     2-transistor auto-reset network on DTR/RTS → EN/GPIO0. Best UX, most BOM.
5. **Antenna keepout** — keep copper, ground pour, and metal away from the module's
   PCB antenna end (follow the WROOM datasheet keepout). Put the antenna at a
   board edge. (Our silk already marks the antenna end toward the BOTTOM edge.)
6. **Decoupling** — 100nF close to the module 3V3 pin + bulk cap.

---

## Flashing a bare module — mechanics

- **Boot dance**: hold GPIO0 LOW, pulse EN LOW→HIGH → enters serial bootloader.
  With DTR/RTS auto-reset (dongle or on-board), the toolchain does this for you.
- **First flash**: must be wired (6-pin header or on-board USB).
- **After first flash**: use **OTA** (ArduinoOTA / ESP-IDF OTA) for all field
  updates; keep the wired header only for recovery/unbricking.

---

## Candidate parts (verify stock/footprints at design time)

| Role | Part | Note |
|------|------|------|
| MCU module | ESP32-WROOM-32E (N4/N8) | solder-down, castellated |
| LDO 3.3V | AMS1117-3.3 | simple; or a low-Iq LDO for efficiency |
| USB-UART (opt) | CP2102N or CH340C | only for on-board-USB option |
| USB connector (opt) | USB-C receptacle | use `<connector standard="usb_c" />` |
| Prog header | 1x6 2.54mm | the cheap option |

---

## Net effect on the schematic

- Replace `ESP_L` / `ESP_R` female headers with the WROOM module footprint.
- Add: LDO + caps, EN RC, GPIO0 pull-up, programming header (or USB-UART block).
- Re-map: the GPIO assignments stay the same (firmware.txt is unaffected); only the
  programming/boot pins gain support circuitry.
- Re-check antenna keepout and re-run placement/routing.

See firmware.txt "PROGRAMMING / FLASHING" for the firmware-side view.
