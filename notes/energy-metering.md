# Energy / Current / Voltage Metering — deferred feature notes

Status: **REMOVED from the board** (reverted, see "Git history" below). This file
captures the research + decisions so it can be re-added later without redoing the
investigation.

Why it was removed: the isolated metering subcircuit (and especially the on-board
current-transformer option) added too much complexity for now — mains current on
the PCB, heavy terminals, datasheet-driven passive tuning. Deferred to a later rev.

---

## Why add metering at all

**Current-based dry-run protection.** A pump running DRY draws noticeably LESS
current than when pumping water (no hydraulic load): roughly 60–75% of rated FLA.
Watching motor amps gives a second, independent dry-run trip on top of the SS
probe — it still protects the pump even if a probe wire fails. It also catches
over-current (jam / locked rotor) and enables power / energy (kWh) telemetry.

Rule of thumb for a 2HP single-phase motor (~12A FLA):
- Pumping normally: ~12A
- Running dry: ~7–9A  → if current < ~80% of healthy baseline for >5s while the
  motor is commanded ON → declare dry-run, STOP, apply ≥5 min restart lockout.
- Calibrate thresholds against the real motor at first install.

---

## Three approaches considered

### 1. External clamp/ring CT → board terminal (SAFEST, was implemented then reverted)
- A current transformer (CT) clamps/loops around the **motor Live wire** (off-board).
- Its 2 low-voltage leads land on a 2-pin board terminal (`J_CT`).
- On-board burden resistor + metering IC do the rest.
- **Motor current never touches the PCB** — safest. CT mounts in the panel wiring,
  NOT on the DIN rail.
- ⚠ Buy the **bare CT**, not the CT+breakout-board version (the breakout duplicates
  the on-board burden/op-amp).
- ⚠ Never leave a CT clamped on a live wire with open (unconnected) secondary.

### 2. On-board CT with Live-in / Motor-out terminals (most integrated, NOT built)
- ZMCT103C soldered to the board; a thick insulated **wire jumper threaded through
  the CT hole** carries the motor Live from `J_LINE_IN` terminal to `J_MOTOR` terminal.
- User plugs Live into one terminal, motor into the other — board auto-measures V/I/E.
- ⚠ Brings the full ~15A motor current ONTO the PCB: needs heavy-duty terminals
  (e.g. KF128-7.62, ~16–25A), a ≥4mm mains-current creepage zone (hand-routed), and
  an assembly step (thread jumper through CT). Board enters the motor power path.
- This is how commercial smart plugs / Sonoff POW work.

### 3. Dedicated energy-meter IC (was implemented with approach 1, then reverted)
- **BL0942** single-phase metering IC: true V / I / power / energy over UART or SPI.
- Pairs with an external CT (current) + **ZMPT101B** voltage transformer (voltage).
- Both CT and ZMPT are galvanically isolated from mains.

---

## Parts found (JLCPCB, in stock at time of research)

| Part | JLC C# | Role |
|------|--------|------|
| BL0942 | C2909509 (alt C2837510) | single-phase energy-metering IC (UART/SPI) |
| ZMPT101B | C111858 | voltage transformer (isolated mains V sense) |
| ZMCT103C | C94571 | current transformer (5A/5mA class, ring) |
| ATM90E26-YU | C616398 | alt metering IC (SPI/UART) |
| HLW8032 | C128023 | alt metering IC (UART) |
| KF128-7.62-2P | C474956 | heavy 7.62mm terminal (for on-board-CT power path) |

CT options for the clamp approach: ZMCT103C (ring) or SCT-013 (split-core clamp),
rated ≥15A. Burden resistor (R_BUR) must match the chosen CT ratio.

---

## What the reverted design looked like (approach 1 + 3)

- **U_MTR** = BL0942, digital link on **GPIO25 / GPIO26** (free UART-capable pins,
  no conflict with existing assignments).
- **U_VT** = ZMPT101B: primary via 2× series 100k off net.LIVE/NEUTRAL (two resistors
  share the 230Vac stress), secondary burden (R_VBUR ~1k) to BL0942 VP.
- **J_CT** = WJ500V-5.08-2P 2-pin terminal (C8465) for the external CT; R_BUR (~20Ω
  REF) burden → BL0942 IP/IN.
- Placed in the below-HLK area; PAIR/RESET buttons were temporarily moved top-right
  to free that space (also reverted — buttons are back below HLK).
- ⚠ All conditioning passive values (R_BUR, R_VT1/2, R_VBUR) and the BL0942 interface
  pin roles (UART vs SPI, SEL pin) were REFERENCE/placeholder values — must be
  finalized against the BL0942 + chosen-CT datasheets before fab.

BL0942 import pin labels (from JLC import, for reference):
`VDD, IP, IN, VP, GND, A1, A2_NCS, CF2, ZX, CF1, SEL, SCLK_BPS, pin13, pin14`
(confirm exact RX/TX vs CS/CLK/SDO roles in the datasheet.)

---

## Firmware hook (when re-added)

- GPIO25/26 = BL0942 serial link.
- Add to automation STOP conditions: "motor current < dry-run threshold while
  running" and "current > over-current limit (jam)".
- After START, wait 3–5s for steady state, capture running current as baseline.

---

## Git history (to un-revert / cherry-pick later)

The feature lived in these commits, then was reverted:
- `3ccac0a` feat: add BL0942 energy metering (CT + ZMPT101B), move buttons right
- `edefd1b` docs: document current-based dry-run + metering wiring
- `0e7af52` docs(install): add section 5b CT/energy metering wiring
- `1784037` fix: nudge METER BL0942 silk label up

To bring it back: `git revert` the corresponding revert commits, or
`git cherry-pick 3ccac0a` and resolve against current layout. The BL0942 /
ZMPT101B import files were deleted by the revert — re-import with
`tsci import C2909509` and `tsci import C111858`.

---

## Recommendation for the future rev

Start with **approach 1 (external clamp CT → J_CT)** — it keeps mains current off
the board and is the lowest-risk way to get current-based dry-run. Add the ZMPT101B
voltage sense only if true power/kWh is needed; for dry-run alone, current is enough.
Only consider the on-board CT (approach 2) if a single-box "Live in / Motor out"
product is worth the heavy-terminal + creepage + assembly cost.
