# Varuna — ESP32 Water-Level Pump Controller

An ESP32-based controller that automates a **2 HP single-phase (230 V) water pump**
via a **DOL contactor**, with tank float switches and sump SS probes for level
sensing and dry-run protection. Designed in [tscircuit](https://tscircuit.com).

The PCB is the brains; the motor current is switched by an **external DIN-rail
contactor + thermal overload relay** (the board only switches the contactor coil),
so the board + contactor + overload in one enclosure form the complete DOL starter.

---

## Repository layout

```
varuna-ts/
├── pcb/                  # PCB design (tscircuit project)
│   ├── index.circuit.tsx #   main board source
│   ├── imports/          #   imported JLCPCB component footprints
│   ├── parts.txt         #   bill of materials (JLCPCB C-numbers)
│   ├── package.json      #   tscircuit CLI project
│   └── tscircuit.config.json
├── firmware/             # ESP32 firmware (PlatformIO) — web UI + AUTO/semi-auto control
├── enclosure/            # OpenSCAD 3D-printable enclosure (base + lid)
├── firmware.txt          # firmware requirements / GPIO map / control logic
├── INSTALL.txt           # panel wiring & installation guide (electrician-facing)
├── notes/                # design research & deferred-feature notes
│   ├── energy-metering.md
│   └── bare-module-migration.md
├── CLAUDE.md             # project guide for the Claude Code agent
└── README.md             # this file
```

> `firmware.txt` is the firmware *specification*; `firmware/` is the PlatformIO
> implementation of it (Arduino/ESP32) — see `firmware/README.md`. `enclosure/`
> has a parametric OpenSCAD model (single box: PCB + DIN rail) — see
> `enclosure/README.md`.

---

## What's on the board

- **Power**: HLK-5M05 (230 V AC → 5 V DC) + 275 V MOV surge clamp + onboard slide
  power switch. No PCB fuse — protection is an upstream MCB in the DB panel.
- **MCU**: ESP32 NodeMCU (**30-pin, CP2102 USB-UART**) on two 15-pin female
  headers (e.g. Robocraze NodeMCU ESP32). The 8 pins not exposed on the 30-pin
  vs the 38-pin DOIT V1 are SPI-flash pins — unusable as GPIO anyway, so no
  functional loss.
- **Motor control**: ULN2003 → relay → `J_COIL` drives the external contactor coil;
  `J_OL` reads the overload relay's trip contact.
- **Sensors** (30–40 m CAT6 to the tank): 2× float switches + 3× SS probes with
  pulsed AC excitation, all TVS-protected.
- **UI**: 6 labelled status LEDs (PWR/WIFI/MOTOR/FL1/FL2/PRB) behind a transparent
  cover, PAIR + RESET buttons, and a `J_DBG` UART header for field serial logs.
- Board: **200 × 100 mm, 2-layer**, fully routed.

See `pcb/parts.txt` for the full BOM and `INSTALL.txt` for panel wiring.

---

## First-time setup

Two independent toolchains — install whichever you need:

**PCB work** — Node 20 (`.nvmrc`) + tscircuit CLI:
```bash
nvm install            # picks up .nvmrc → Node 20
npm i -g tscircuit
cd pcb && npm install
```

**Enclosure work** — OpenSCAD + the BOSL2 library (clone instructions per OS in
[`enclosure/README.md`](enclosure/README.md#prerequisites-one-time-setup)).

**Firmware work** — [PlatformIO](https://platformio.org/) (`pip install platformio`
or the VS Code extension). Build/flash from `firmware/`:
`pio run -t upload && pio device monitor`.

---

## Working on the PCB

Requires Node 20 (`.nvmrc`) and the tscircuit CLI (`npm i -g tscircuit`).

```bash
cd pcb
npm install            # first time only

tsci build             # compile + autoroute -> dist/index/circuit.json
tsci dev               # interactive preview at https://localhost:3020
tsci snapshot --pcb-only   # render __snapshots__/index.circuit-pcb.snap.svg
```

Checks before sharing/fab:
```bash
tsci check netlist
tsci check schematic-placement
tsci check placement
```

### Iterating
- Keep absolute `pcbX`/`pcbY` placement; **don't** wrap positioned children in
  `<group>` (it re-anchors coordinates — see CLAUDE.md).
- Import real footprints with `tsci import <C-number>` (writes to `pcb/imports/`).
- "0 overlap errors" in `dist/index/circuit.json` is the placement gate; DRC
  spacing/creepage on the AC + coil side still needs a hand-routing pass before fab.

---

## Firmware

Implemented in [`firmware/`](firmware/) (PlatformIO / Arduino-ESP32) — see
[`firmware/README.md`](firmware/README.md). `firmware.txt` remains the spec it's
built from: GPIO map, probe AC-excitation protocol, contactor hold-logic,
automation/dry-run rules, LED/button behaviour, connectivity (MQTT/OTA), and
safety rules.

Highlights:
- **Automatic** level control and **semi-automatic** force-start (runs to an exit
  condition, no auto-restart) — switchable from the web UI.
- Self-contained **web dashboard** served from the ESP32 (status, control,
  config) — no internet or external assets required.
- **Config button** (hold 3 s) opens a WiFi setup portal; **reset button**
  (hold 5 s) restores factory settings.
- All 5 status LEDs driven per spec; optional MQTT; guarded OTA; 30 s watchdog.

Target: ESP32 (Arduino or ESP-IDF). Flash via the DevKit USB; field updates via OTA.

---

## External DOL parts (not on the PCB — buy separately)

These mount on the DIN rail alongside the board and carry the motor current.
Pick a contactor rated **AC3 ≥ 15 A** and an overload sized to the motor FLA.

| Part | Spec | Wires to | Buy |
|------|------|----------|-----|
| Contactor | LEYDEN CJX2-3211, 32 A AC-3, 230 V coil, 3-pole | coil A1/A2 → `J_COIL` | [amazon.in B0BZQNCKWY](https://www.amazon.in/gp/product/B0BZQNCKWY) |
| Overload relay | MAGNUM MaK-1 2P, 13–21 A (dial to ~13 A) | 95-96 NC aux → `J_OL` | [amazon.in B0F5HTJWTT](https://www.amazon.in/gp/product/B0F5HTJWTT) |
| MCB | 20 A Type-C (DB panel, upstream) | mains feed | local |
| ESP32 module | NodeMCU ESP32 30-pin with CP2102 USB-UART (e.g. Robocraze) | plugs into the two 15-pin female headers on the PCB | Robocraze / Amazon |

> **ESP32 module note**: the design targets the **30-pin NodeMCU ESP32 with CP2102**
> (common Indian variant from Robocraze, Quartz Components, etc.). The 38-pin
> DOIT V1 has the same usable GPIOs but a different header length and pin order —
> if you use a 38-pin module, the headers won't physically fit. See
> `notes/bare-module-migration.md` if you ever want to drop the DevKit entirely.

> The overload clips onto the bottom of the CJX2 contactor (they mate). Set the
> overload dial to the motor's nameplate full-load current (~12–13 A for 2 HP
> single-phase). See `INSTALL.txt` §1–5 for the full wiring.

---

## Installation (high level)

Mount the PCB, contactor, and overload relay (above) in one DIN-rail enclosure
behind a 20 A MCB. Wire mains to `J_AC`, the contactor coil to `J_COIL`, the
overload aux to `J_OL`, and the float/probe sensors over CAT6 to the bottom-edge
terminals. **Full step-by-step + safety notes are in `INSTALL.txt`.**

⚠ 230 V mains — installation by a qualified electrician only.

---

## Status & deferred items

- ✅ Board complete, builds clean, routed (2-layer, 200×100 mm).
- ⏳ Before fab: confirm relay NO/NC mapping vs datasheet; hand-route ≥3 mm AC/coil
  creepage; finalize any reference values.
- ⏳ Deferred (in `notes/`): energy metering (current-based dry-run), bare-module
  migration.
