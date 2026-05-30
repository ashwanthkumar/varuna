# Varuna — ESP32 Pump Controller (tscircuit PCB project)

## Project overview

ESP32-based water-level automation board that controls a 2HP single-phase (230V) motor via an **L&T MK1 DOL starter**. It does **not** switch the contactor coil directly — it emulates the MK1's remote START/STOP pushbuttons via a 2-channel relay. Motor current is carried entirely by the MK1 contactor; only the low-current remote loop passes through this board's relay contacts.

Control flow: `ESP32 GPIO23/22 → ULN2003 → RLY1/RLY2 → J_START/J_STOP terminals → MK1 remote loop`

Power: `230V AC → RV1 (MOV) → HLK-5M05 → 5V → SW1 (slide switch) → ESP32 + relays`

Sensor inputs: 8× float switches (dry contact, common-GND), each with 10k pull-up + 220Ω series + 100nF debounce on input-capable GPIOs.

---

## tscircuit rules

### Never wrap absolutely-positioned children in `<group>`

`<group>` re-anchors child `pcbX`/`pcbY` to the group's computed origin, not the board origin. This scrambles the absolute floorplan silently — a part at `pcbX={40}` may land at x=20.6 in the built output. Always use plain fragments (`<>...</>`) for `.map()` over repeated components.

### `tsci import <C-partnumber>` is fully non-interactive

Pass the JLCPCB C-number directly — no interactive picker needed. It writes a real footprint + 3D model + pin labels into `./imports/<Name>.tsx`. Imported pin labels are generic (`pin1`, `pin2` …); override with a semantic `pinLabels` prop spread before `{...props}`.

### Build and snapshot commands

- **`tsci build`** — compiles, runs autorouter, writes `dist/index/circuit.json`. This is the main iteration command.
- **`tsci snapshot --pcb-only`** — renders `__snapshots__/index.circuit-pcb.snap.svg`. Convert to PNG with `sharp` (available in `node_modules`) or `rsvg-convert` (available at `/opt/homebrew/bin/rsvg-convert`).
- **`tsci build --pcb-png`** is NOT a valid flag — it fatals the build. Don't use it.
- `tsci check schematic-placement` and `tsci check placement` are useful for catching overlap issues before full build.

### Do not `pkill` before builds

There is no reason to run `pkill -f tsci` or `pkill -f node` before builds. `tsci` is not known to be multi-process-unsafe. `pkill -9 -f node` matches all Node processes on the machine and will kill the `tsci dev` server and other unrelated processes. If a build hangs, investigate — don't spray kill signals.

### Reading build output

From `dist/index/circuit.json`, the relevant element counts are:
- `source_trace` — nets to route
- `pcb_trace` — routed traces (should be ≥ source_trace for full routing)
- `pcb_via` — layer-change vias
- Elements whose `type` matches `/overlap_error/` — placement DRC errors to fix

Warnings that are safe to ignore: `"missing a trace"` (spare GPIOs), `"underspecified"`, `"requires_power"/"requires_ground"`, and footprint-mismatch lines (suppressed once real footprints are imported).

---

## Indian electrical standards and PCB fusing

**BIS (Bureau of Indian Standards)** is the Indian standard body — not CE (which is European). Relevant standards: IS 13252 (≈IEC 62368) for electronics, IS 3043 for earthing, IS 732 for wiring.

### For panel-mount controllers (like this board):

The protection chain for a board installed inside an electrical panel is:

```
DB → MCB (2–6A) → panel wiring → your board → HLK-5M05
```

- The **MCB in the distribution board** is the primary overcurrent device mandated by IS/BIS.
- The **HLK-5M05 has internal short-circuit and overload protection** built in.
- **PCB-mount blow fuses are not standard practice** for panel-mount controllers in India. MCB upstream + HLK internal protection is the accepted approach. You typically see PCB fuses only in consumer end-products (TVs, chargers) that have no upstream MCB.

### What to keep / remove on this board:

- **Keep RV1 (MOV, 275V)** — transient/surge clamping across L-N is valid regardless of MCB protection.
- **Remove PCB-mount blow fuses (F1) and thermal fuses (FT1)** — redundant given MCB upstream + HLK internal protection. Adds assembly complexity and a surface-mount glass fuse at mains potential is harder to service safely than a panel-mount fuse holder.
- **Document in install notes**: "Protect with a 2A MCB upstream in the distribution board."

---

## Relay contact mapping (verify before wiring)

The SRD-05VDC-SL-C (C35449) pin mapping was **inferred from the footprint geometry**, not the datasheet:

- pin1 = NC, pin2 = COILA, pin3 = COILB, pin4 = NO, pin5 = COM

**Confirm NO vs NC with a multimeter before field-wiring to the MK1 remote terminals.**

---

## AC creepage guidance (230V board)

Creepage is copper-**edge**-to-copper-**edge**, not centre-to-centre. With 0.8mm-wide mains traces:
- Keep lane centres ≥3.8mm apart to achieve ≥3.0mm edge-to-edge between different-potential nets.
- All mains copper must stay on the **primary (AC input) side** of the HLK-5M05 — the module body is the isolation barrier. Never route mains traces on the DC output side (right half of the module).
- The HLK-5M05 AC primary pins are on the **left** short side; DC output pins are on the **right** short side.
- The N lane runs at x=−93; the live (L) lane runs at x=−90/−83.73 — ≥3mm separation.

---

## Firmware requirements

See [`firmware.txt`](./firmware.txt) for the full firmware specification. Key points:

- **Probe excitation**: GPIO33 must be pulsed (HIGH for 1–5ms, then LOW, repeat every ≥100ms). Never leave it permanently HIGH — DC through SS probes causes electrolysis.
- **Probe reading**: GPIO34/35/32 read HIGH when water bridges probe to COM during excitation pulse. They have external pull-DOWN (not pull-up) — this is the reverse of the float switches.
- **Float switches**: GPIO36/39 read LOW when float triggers (pull-up topology, same as original design).
- **Relay pulses**: Assert GPIO23 (START) or GPIO22 (STOP) HIGH for 300–500ms only. Never hold permanently. Never fire both simultaneously.
- **Boot safety**: On every boot, issue a STOP pulse before entering normal operation — the MK1 may still be latched ON from a previous session.
- **GPIO33 boot state**: Configure as OUTPUT LOW before any other setup to avoid floating excitation into the probes.

---

## Sensor connector change (vs original 8-input design)

Input section was redesigned for the 2-float + 3-probe + 30–40m CAT6 use case:

- **J_FL1, J_FL2**: 2-pole terminals (WJ500V-5.08-2P) — float switches, pull-UP topology (GPIO36, GPIO39)
- **J_PR**: 4-pole terminal (DB128L-5.08-4P) — probes PR1/PR2/PR3 + COM, pull-DOWN topology (GPIO34/35/32) + GPIO33 excitation
- **TVS_FL, TVS_PR12, TVS_PR3C**: PRTR5V0U2X TVS diode arrays — surge protection for 30–40m outdoor cable
- GPIO33 drives probe common via 1kΩ R_EXC for pulsed AC excitation

CAT6 pair allocation: pair1=FL1, pair2=FL2, pair3=COM+PR1, pair4=PR2+PR3

---

## JLCPCB part numbers

See [`parts.txt`](./parts.txt) for the full BOM with descriptions and quantities.

Key C-numbers for quick reference:
- **TVS_FL/PR12/PR3C** PRTR5V0U2X → C2827688
- **J_PR** DB128L-5.08-4P → C2827883
- **U_PSU** HLK-5M05 → C209907
- **U_DRV** ULN2003ADR → C7512
- **RLY1/2** SRD-05VDC-SL-C → C35449
- **RV1** TMOV14RP275E MOV → C1528070
- **SW1** SS12D10G3 slide switch → C7431053
- **J_AC/START/STOP** WJ128V-5.0-3P (3-pole) → C8270
- **J_SW1–8** WJ500V-5.08-2P (2-pole) → C8465

---

## Board specs

- Size: 200×120mm, 2-layer
- Mounting: 4× M3 holes at corners
- Output terminals (J_START, J_STOP): `pcbRotation={90}` — face outward toward the right board edge for field wiring access
- `__snapshots__/` is in `.gitignore` — regenerate with `tsci snapshot --pcb-only`
