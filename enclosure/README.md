# Varuna enclosure (OpenSCAD)

Parametric single-box enclosure that holds the **Varuna PCB** (on standoffs) plus a
short **35 mm DIN rail** for the external contactor + overload relay — one all-in-one
unit. Cutout positions are derived from the PCB coordinates in
`../pcb/index.circuit.tsx` (board 200 × 100 mm, centre origin).

## Files
- `varuna-enclosure.scad` — the model. `base()`, `lid()`, and a print-in-place
  hinged layout (`part="hinged"`).
- `docs/` — **optional, gitignored.** Local mirror of the BOSL2 wiki for
  offline reference. Fetch on demand (see "Prerequisites" below).

## Prerequisites (one-time setup)

You need **OpenSCAD** and the **BOSL2** library installed. The BOSL2 wiki
mirror in `docs/` is optional but recommended for offline lookup.

### macOS
```bash
# 1) OpenSCAD — download the app from https://openscad.org/downloads.html
#    or install via Homebrew:
brew install --cask openscad

# 2) BOSL2 library (required — the SCAD uses BOSL2 primitives)
mkdir -p "$HOME/Documents/OpenSCAD/libraries"
git clone https://github.com/BelfrySCAD/BOSL2 \
  "$HOME/Documents/OpenSCAD/libraries/BOSL2"

# 3) (Optional) BOSL2 wiki for offline docs
git clone https://github.com/BelfrySCAD/BOSL2.wiki enclosure/docs
```

### Linux
```bash
# 1) OpenSCAD — via your package manager
sudo apt install openscad     # Debian/Ubuntu
# or:  sudo dnf install openscad   # Fedora

# 2) BOSL2 library
mkdir -p "$HOME/.local/share/OpenSCAD/libraries"
git clone https://github.com/BelfrySCAD/BOSL2 \
  "$HOME/.local/share/OpenSCAD/libraries/BOSL2"

# 3) (Optional) BOSL2 wiki for offline docs
git clone https://github.com/BelfrySCAD/BOSL2.wiki enclosure/docs
```

### Windows
1. Install OpenSCAD from <https://openscad.org/downloads.html>.
2. Clone BOSL2 into `%APPDATA%\OpenSCAD\libraries\BOSL2`:
   ```cmd
   git clone https://github.com/BelfrySCAD/BOSL2 %APPDATA%\OpenSCAD\libraries\BOSL2
   ```
3. *(Optional)* Clone the BOSL2 wiki for offline docs:
   ```cmd
   git clone https://github.com/BelfrySCAD/BOSL2.wiki enclosure\docs
   ```

### Verify the setup
From the repo root:
```bash
APP=/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD   # macOS path
# (Linux: APP=openscad     Windows: APP=openscad.com from install dir)
$APP -o /tmp/varuna-base.stl -D 'part="base"' enclosure/varuna-enclosure.scad
```
Expect `Status: NoError` and an STL written to `/tmp/varuna-base.stl`.

Relevant BOSL2 wiki pages once `docs/` is cloned: `docs/hinges.scad.md`
(knuckle_hinge, snap_lock) and `docs/living_hinge.scad.md`.

## Hinge (BOSL2)

The lid can be joined to the base with a **print-in-place knuckle hinge** from the
BOSL2 library (`knuckle_hinge()`), placed along the back wall. Requires BOSL2
installed in your OpenSCAD libraries (it already is here).

```bash
# print-in-place: base + lid coplanar, joined by the hinge — print once, fold shut
$APP -o varuna-hinged.stl -D 'part="hinged"' varuna-enclosure.scad
```
Tune `hinge_segs / hinge_offset / hinge_knuckle_diam / hinge_pin_diam / hinge_gap`
at the top of the SCAD. The drop-in `base`/`lid` exports still work if you don't
want a hinge.

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
- Vertical LED window over the 6-LED column on the right edge (x=92, y −32.5…+32.5)
- Button holes for PAIR (−76,−15) and RESET (−58,−15)
- Slide-switch slot for SW1 (−85, −42, bottom-left)
- Sensor cable slots in the south wall, one per bottom-edge connector
  (J_DBG, J_FL1, J_FL2, J_PR)
- DIN-rail mounting bosses centered on the DIN zone (top half of the cavity)

## DIN-rail mounting

Two **M3 self-tap bosses** on the cavity floor, `din_boss_spacing` (default 140 mm)
apart, centered on the DIN zone in Y. To install the rail:

1. Cut a length of standard **35 mm top-hat DIN rail** (steel or aluminium) to fit
   the cavity — roughly `inner_w − 2·wall − few mm` (≈ 210 mm).
2. **Drill two M3 clearance holes** (Ø 3.2–3.5 mm) in the rail at 140 mm pitch,
   matching `din_boss_spacing`.
3. Place the rail over the bosses and drive **two M3 × 8 mm self-tapping screws**
   down through the rail into the bosses. (Or set `din_boss_hole_dia` to ~4 mm
   and use a brass M3 heat-set insert for stronger reusable threads.)
4. Clip the contactor + overload + (optional) MCB onto the rail as usual.

Tune `din_boss_h` (default 5 mm) to lift the rail off the floor if you need a
finger underneath; lower it (or set to 0) if you need every mm of contactor
depth. `contactor_depth` is the total Z budget for boss + rail + contactor
body — bump it if your stack is taller than 95 mm.

## Cable entries

| Opening | Wall | Box position | Size (W × H) | Carries |
|---------|------|--------------|--------------|---------|
| Mains in | **WEST** | centered on DIN zone in Y | 14 × 14 mm | 3-core L/N/E from supply → MCB |
| Motor out | **SOUTH** | x ≈ 180 (right of sensor slots) | 16 × 14 mm | 2-core motor L/N from contactor T-side |
| Sensors ×4 | **SOUTH** | one per bottom-edge connector | 16 × 14 mm each | CAT6 to floats + probes, J_DBG UART |

All openings are bare rectangular cutouts. For non-IP installs, fit a **rubber
grommet** (4–10 mm cable, ₹10 each). For dust/splash-resistant builds, drill the
opening out to thread a **PG11 or M12 cable gland** through it.

> **Mains entry side**: the supply enters from the WEST wall so the cable runs
> straight to the MCB/contactor on the DIN rail directly above it — no looping
> across the cavity.
> **Motor exit side**: the motor cable exits from the SOUTH wall on the right,
> clear of the sensor cables on the left — keeps sensitive low-voltage signal
> wires physically separated from the switched motor conductor.

## Hardware needed to assemble the printed enclosure

Print **one base** + **one lid** (separate prints, flat — the lid is auto-flipped
for printing via `part="lid"`). Then you need:

| Qty | Item | Length | Where it goes |
|-----|------|--------|---------------|
| 4 | M3 self-tap screw | 6–8 mm | PCB mount — through the 4 PCB corner holes into the printed standoffs |
| 2 | M3 self-tap screw | 6–8 mm | DIN rail mount — through the rail into the two printed bosses on the floor |
| 2 | M3 self-tap screw (or M3 machine + nut) | 16–20 mm | Lid-to-base — through the lid plate into the WEST corner bosses (opposite the hinge) |
| 1 | Ø 3 mm steel rod *or* M3 × 80 mm bolt | ~80 mm | Hinge pin — slides through all 5 knuckles (3 base + 2 lid) along the EAST wall |
| 1 | 35 mm top-hat DIN rail (steel/aluminium) | ~210 mm | Cut to fit the cavity, drilled at 140 mm pitch — screws to the two DIN bosses |
| 6 | Rubber grommets (10–14 mm OD) *or* PG11/M12 cable glands | — | One per cable opening: 1 mains in (W), 1 motor out (S), 4 sensors/UART (S) |

Optional upgrades:
- **M3 brass heat-set inserts** (×6 — for DIN rail + lid bosses) if you want
  re-usable metal threads instead of self-tapping into plastic. Bump
  `din_boss_hole_dia` to ~4.0 mm and the lid-boss diameter likewise.
- A drop of **paint or paint marker** rubbed across the engraved floor labels
  (`PCB`, `DIN RAIL`) and the lid title (`PROJECT VARUNA`) makes them pop.

### Assembly order

1. **Drill the DIN rail** — 2× Ø 3.2 mm clearance holes at 140 mm pitch
   (matches `din_boss_spacing`). Deburr the edges.
2. **Slide the hinge pin** through the 5 knuckles to join base and lid. The pin
   is a friction fit — peen / glue / cap one end so it can't back out.
3. **Screw the DIN rail down** through its drilled holes into the two M3
   bosses on the cavity floor.
4. **Drop in the PCB**, align with the 4 corner standoffs, and secure with the
   4× M3 self-tap screws.
5. **Fit grommets or glands** into the 6 cable openings *before* threading
   cables through.
6. **Wire** mains in (WEST), motor out (SOUTH-right), sensors + UART (SOUTH-left).
7. **Clip the contactor + overload** (and optional MCB) onto the rail and wire
   per `../INSTALL.txt`.
8. **Close the lid** and fasten with the 2× M3 screws into the WEST corner bosses.

> Quick BOM check: **8× M3 self-tap screws + 1 hinge pin + 1 DIN rail length +
> 6 grommets**. All in, under ₹200 of hardware on top of the prints.

## ⚠ Before printing — measure and tune these parameters
The DIN-stack and depth values are **reference guesses**; verify against your real
hardware and the first test print:
- `din_zone_h`, `din_rail_w`, `contactor_depth` — measure the CJX2-3211 + MaK-1 2P stack
- `din_boss_h`, `din_boss_spacing` — boss height + pitch between the two DIN screws
- `pcb_clear_top` — tallest LV part (ESP32 DevKit / relay) height above the board
- `boss_dia` — 5.2 for self-tapping M3, or ~4.0 if using heat-set inserts
- `wall`, `floor_t`, `lip`, `fit` — wall strength + lid fit clearance
- `mains_slot_*`, `motor_slot_*` — enlarge if you're using cable glands with
  bigger thread diameters than PG11/M12
- Print the **lid in clear filament** (or leave the LED window open / glue a clear
  acrylic strip) so the labelled LED row shows through the cover.

This is a starting model — expect 1–2 fit-test prints before it's right. It is NOT
IP-rated as drawn; add gaskets/sealing if you need weatherproofing.
