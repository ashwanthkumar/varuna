# Varuna enclosure (OpenSCAD)

Parametric single-box enclosure that holds the **Varuna PCB** (on standoffs) plus a
short **35 mm DIN rail** for the external contactor + overload relay — one all-in-one
unit. Cutout positions are derived from the PCB coordinates in
`../pcb/index.circuit.tsx` (board 200 × 100 mm, centre origin).

## Files
- `varuna-enclosure.scad` — the model. Two parts: `base()` and `lid()`.

## Render / export

OpenSCAD app (macOS) CLI:
```bash
APP=/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD

# preview the assembly
$APP -o preview.png --imgsize=1000,750 --camera=0,0,0,55,0,25,600 \
     -D 'part="both"' varuna-enclosure.scad

# export printable STLs
$APP -o varuna-base.stl -D 'part="base"' varuna-enclosure.scad
$APP -o varuna-lid.stl  -D 'part="lid"'  varuna-enclosure.scad
```
Or open `varuna-enclosure.scad` in the OpenSCAD GUI and set `part` at the top.

## What lines up automatically (from the PCB)
- 4× M3 PCB standoffs at the board hole positions (±95, ±46)
- LED window over the 6-LED top row (y=45, x −40…+40)
- Button holes for PAIR (−76,−15) and RESET (−58,−15)
- Slide-switch slot for SW1 (−58, 34)
- Bottom-wall cable band for the bottom-edge connectors (J_AC/J_FL/J_PR/J_DBG)
- Right-wall cable band for J_COIL / J_OL (to the contactor/overload)

## ⚠ Before printing — measure and tune these parameters
The DIN-stack and depth values are **reference guesses**; verify against your real
hardware and the first test print:
- `din_zone_h`, `din_rail_w`, `contactor_depth` — measure the CJX2-3211 + MaK-1 2P stack
- `pcb_clear_top` — tallest LV part (ESP32 DevKit / relay) height above the board
- `boss_dia` — 5.2 for self-tapping M3, or ~4.0 if using heat-set inserts
- `wall`, `floor_t`, `lip`, `fit` — wall strength + lid fit clearance
- Print the **lid in clear filament** (or leave the LED window open / glue a clear
  acrylic strip) so the labelled LED row shows through the cover.

This is a starting model — expect 1–2 fit-test prints before it's right. It is NOT
IP-rated as drawn; add gaskets/sealing if you need weatherproofing.
