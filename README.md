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
├── firmware/             # (future) ESP32 firmware — see firmware.txt for the spec
├── enclosure/            # (future) 3D-printable enclosure models
├── firmware.txt          # firmware requirements / GPIO map / control logic
├── INSTALL.txt           # panel wiring & installation guide (electrician-facing)
├── notes/                # design research & deferred-feature notes
│   ├── energy-metering.md
│   └── bare-module-migration.md
├── CLAUDE.md             # project guide for the Claude Code agent
└── README.md             # this file
```

> `firmware/` and `enclosure/` are placeholders for upcoming work. `firmware.txt`
> is the current firmware *specification* (no code written yet).

---

## What's on the board

- **Power**: HLK-5M05 (230 V AC → 5 V DC) + 275 V MOV surge clamp + onboard slide
  power switch. No PCB fuse — protection is an upstream MCB in the DB panel.
- **MCU**: ESP32 DevKit (38-pin) on two 19-pin female headers.
- **Motor control**: ULN2003 → relay → `J_COIL` drives the external contactor coil;
  `J_OL` reads the overload relay's trip contact.
- **Sensors** (30–40 m CAT6 to the tank): 2× float switches + 3× SS probes with
  pulsed AC excitation, all TVS-protected.
- **UI**: 6 labelled status LEDs (PWR/WIFI/MOTOR/FL1/FL2/PRB) behind a transparent
  cover, PAIR + RESET buttons, and a `J_DBG` UART header for field serial logs.
- Board: **200 × 100 mm, 2-layer**, fully routed.

See `pcb/parts.txt` for the full BOM and `INSTALL.txt` for panel wiring.

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

Not yet written — `firmware.txt` is the complete spec: GPIO map, probe AC-excitation
protocol, contactor hold-logic, automation/dry-run rules, LED/button behaviour,
connectivity (MQTT/OTA), safety rules, and the programming/flashing notes.

Target: ESP32 (Arduino or ESP-IDF). Flash via the DevKit USB; field updates via OTA.

---

## Installation (high level)

Mount the PCB, contactor (CJX2-3211 32 A), and overload relay (MaK-1 2P, ~13 A) in
one DIN-rail enclosure behind a 20 A MCB. Wire mains to `J_AC`, the contactor coil to
`J_COIL`, the overload aux to `J_OL`, and the float/probe sensors over CAT6 to the
bottom-edge terminals. **Full step-by-step + safety notes are in `INSTALL.txt`.**

⚠ 230 V mains — installation by a qualified electrician only.

---

## Status & deferred items

- ✅ Board complete, builds clean, routed (2-layer, 200×100 mm).
- ⏳ Before fab: confirm relay NO/NC mapping vs datasheet; hand-route ≥3 mm AC/coil
  creepage; finalize any reference values.
- ⏳ Deferred (in `notes/`): energy metering (current-based dry-run), bare-module
  migration.
