# Varuna Firmware

ESP32 firmware for the Varuna water-pump controller. Reads float switches + SS
probes, drives the DOL contactor coil, and serves a self-contained web dashboard
for control and configuration. See [`../firmware.txt`](../firmware.txt) for the
authoritative hardware spec; this directory is the implementation.

## Layout

| File | Purpose |
|------|---------|
| `platformio.ini` | Build config (board, libs, OTA env). |
| `src/pins.h`     | GPIO map + electrical polarity (single source of truth). |
| `src/config.h`   | NVS-backed configuration (WiFi, mode, timings, MQTT). |
| `src/web_ui.h`   | Embedded single-page dashboard (PROGMEM HTML/CSS/JS). |
| `src/main.cpp`   | Sensors, LED scheduler, state machine, web API, WiFi, MQTT, OTA. |

## Build & flash

PlatformIO is pinned as a Python dependency in `pyproject.toml` and run through a
[uv](https://docs.astral.sh/uv/)-managed venv, so the toolchain is reproducible
and isolated from the system Python:

```bash
cd firmware
uv sync                    # one-time: create .venv with PlatformIO (Python 3.12)
uv run pio run             # compile
uv run pio run -t upload   # flash over USB (DevKit auto-reset)
uv run pio device monitor  # serial console @ 115200
```

> Why uv and not a bare `pip install platformio`? On current macOS, Homebrew's
> Python 3.14 has a broken `pyexpat` that crashes PlatformIO's tool installer.
> Pinning `requires-python = ">=3.12,<3.14"` in `pyproject.toml` sidesteps it.
> `pip` is a declared dep because PlatformIO shells out to it for esptool helpers.
>
> If you already have a working `pio` on your PATH, plain `pio run` works too —
> the uv wrapper is only there to guarantee a clean interpreter.

First flash must be wired (USB). After that you can push over WiFi — uncomment the
`[env:esp32-ota]` block in `platformio.ini`, set `upload_port`, and run
`pio run -e esp32-ota -t upload`. OTA is refused while the pump is running.

## Operating modes

- **Automatic** — fully hands-off level control. Starts when the overhead tank is
  LOW *and* the sump has water (dry-run guard); stops when the tank is FULL or the
  sump runs dry. Hysteresis: after a full-stop it waits for the LOW float before
  restarting; after a dry-stop it locks out for the configured refill time.
- **Semi-automatic (Force Start)** — the pump stays off until you press **Force
  Start** (web UI or MQTT `start`). It then runs until an exit condition is met —
  tank FULL, sump dry, overload trip, run timeout, or a manual Stop — and does
  **not** auto-restart. This is the "one fill on demand" model.

Safety is enforced in **both** modes: no start without sump water and a healthy
overload relay; an overload trip latches the fault and drops the contactor
immediately; a configurable max-run timeout (default 30 min) latches a fault.

## Web dashboard

Browse to the controller's IP or `http://<hostname>.local` (default
`varuna.local`). The page polls `/api/status` every second and offers mode
switching, Force Start / Stop, live sensor + overload state, fault reset, and a
configuration form. JSON API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/`            | GET  | Dashboard. |
| `/api/status`  | GET  | Full state snapshot (JSON). |
| `/api/cmd?c=`  | GET  | `start` \| `stop` \| `auto` \| `manual` \| `reset`. |
| `/api/config`  | GET  | Current config (no secrets returned). |
| `/api/config`  | POST | Save config; reboots if WiFi/MQTT changed. |

## Buttons

- **BTN_PAIR (GPIO0)** — hold **3 s** to open the WiFi config portal: the board
  raises a `Varuna-Setup-XXXX` SoftAP (LED1 double-flashes). Connect, open the
  page at `192.168.4.1`, enter WiFi credentials, save → reboot. 3-minute timeout.
- **BTN_RST (GPIO16)** — hold **5 s** for factory reset: erases stored config and
  WiFi credentials from NVS (firmware untouched), confirms with 10 fast LED1
  blinks, then reboots.

## LED behaviour

| LED | GPIO | Meaning |
|-----|------|---------|
| LED1 (green)  | 4  | Solid = running · slow 1 Hz = idle+WiFi · fast 4 Hz = fault/no-WiFi · double-flash = config portal. |
| LED_MOTOR (yellow) | 17 | On while the contactor coil is energised. |
| LED_FL1 (blue) | 19 | Tank LOW float triggered. |
| LED_FL2 (blue) | 18 | Tank HIGH float triggered. |
| LED_PRB (blue) | 5  | Any sump probe sees water. |
| LED_PWR (red)  | —  | Hardware-only; on whenever the 5 V rail is live. |

## MQTT (optional)

Leave the broker field blank to disable. When set, publishes retained
`<base>/status`, `/tank/low`, `/tank/high`, `/probe/{1,2,3}`, `/overload`, and
subscribes to `<base>/cmd` (`start` / `stop` / `auto`). Default base topic
`varuna`. Works with Home Assistant / Node-RED.
