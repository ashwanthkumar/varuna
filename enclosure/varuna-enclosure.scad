// ============================================================================
// Varuna — single-box enclosure (PCB + DIN rail together)
// Wall-mounted, side-hinged door. Hinge on RIGHT, door swings LEFT.
//
// MOUNTING ORIENTATION (looking at the front of the box on a wall):
//   * Hinge on RIGHT side (east wall), door swings to the LEFT to open
//   * Cable entry at BOTTOM (cables hang down; gravity-friendly)
//   * DIN rail at TOP of the cavity, mounted horizontally (rail axis runs
//     left-right). The CJX2-3211 contactor + MaK-1 2P overload stack sits
//     upright on the rail — its L1/L2 terminals at top, T1/T2 at bottom.
//   * LEDs on the PCB top row are visible through the lid window.
//
// Cutout positions are derived from the PCB coordinates in
// ../pcb/index.circuit.tsx (board 200×100 mm, origin at PCB center).
//
// Parts: base() and lid_for_print(). Both print separately, flat. After
// printing, slide a 3mm rod or M3 screw through the hinge knuckles to join
// them. The LID prints with its rim above the plate; FLIP IT 180° around its
// long axis (X axis) before installing — that puts the rim hanging into the
// cavity and aligns the cutouts with the LEDs/buttons in the base.
//
// ⚠ Reference values for the DIN stack, contactor depth, and wall thickness.
//   Measure your real CJX2-3211 + MaK-1 2P stack and a test print, then
//   tweak the parameters at the top.
// ============================================================================

// ---- WHAT TO RENDER -------------------------------------------------------
part = "open";      // "hinged" | "open" | "base" | "lid"
                      //   hinged -> assembled view, lid CLOSED (DEFAULT)
                      //   open   -> assembled view, lid swung 90° open
                      //   base   -> base STL (for printing)
                      //   lid    -> lid STL (for printing, flipped from installed)

// ---- PCB (from ../pcb/index.circuit.tsx) ----------------------------------
pcb_w = 200; pcb_h = 100; pcb_t = 1.6;
pcb_clear_top = 18;   // tallest LV part (ESP32 DevKit / relays) above PCB

hole_dia = 3.2;
holes = [[-95,46],[95,46],[-95,-46],[95,-46]];
standoff_h = 6;
standoff_od = 6;
boss_dia = 5.2;       // self-tap M3 (or 4.0 for heat-set insert)

// ---- DIN-rail compartment (TOP of cavity) ---------------------------------
din_zone_h = 95;      // vertical space (along Y) reserved for the contactor stack
din_rail_w = 35;      // standard top-hat DIN rail width
// contactor_depth is the WORST-CASE Z budget for the full DIN stack above the
// cavity floor: DIN boss (din_boss_h) + rail thickness (~8mm hat) + contactor
// body sticking out of the rail (~75mm for CJX2-3211). 5+8+75 = 88mm; round
// to 95 for margin. Measure your real contactor + overload stack and adjust.
contactor_depth = 95;

// ---- DIN-rail mounting (M3 self-tap screw bosses) -------------------------
// Standard practice in 3D-printed enclosures: drill two M3 clearance holes
// in your 35mm top-hat rail at din_boss_spacing apart, then screw the rail
// down through the bosses below. Kept low so the rail + contactor stack
// fits within contactor_depth.
din_boss_dia       = 6;     // outer dia of each boss
din_boss_hole_dia  = 2.5;   // self-tap pilot for M3
din_boss_h         = 5;     // boss height above floor — rail rests on these
din_boss_spacing   = 140;   // X-distance between the two bosses

// ---- External cable entries -----------------------------------------------
// Both openings accept either a rubber grommet (non-IP) or a PG11/M12 cable
// gland (IP-rated). Sized for ~10mm OD cables (3-core 2.5mm² mains in,
// 2-core motor out).
mains_slot_wy = 14;    // WEST-wall mains opening: Y-span
mains_slot_z  = 14;    // WEST-wall mains opening: Z-height
motor_slot_w  = 16;    // SOUTH-wall motor opening: X-span (matches sensor slots)
motor_slot_z  = 14;    // SOUTH-wall motor opening: Z-height
motor_slot_box_x = 180;// SOUTH-wall motor opening: X centre in box coords
                       //   (clear of the 4 sensor slots which sit at box x≈66..132)

// ---- Box shell ------------------------------------------------------------
wall = 2.4; floor_t = 2.4; margin = 8;
lid_t = 2.0; lip = 4; rim_wall = 1.8;
fit_clear = 0.3;      // rim-to-cavity-wall clearance

// Cavity / box dimensions
inner_w = pcb_w + 2*margin;                   // 216
inner_h = pcb_h + 2*margin + din_zone_h;      // 100 + 16 + 95 = 211
inner_d = max(pcb_clear_top + standoff_h + pcb_t, contactor_depth) + 2;

box_ox = inner_w + 2*wall;                    // outer X
box_oy = inner_h + 2*wall;                    // outer Y
base_d = inner_d + floor_t;                   // base depth (+Z)

// PCB at BOTTOM of cavity, DIN at TOP (centered-cavity coords)
pcb_cy = -inner_h/2 + margin + pcb_h/2;
din_cy = +inner_h/2 - margin - din_zone_h/2;

// ---- helpers --------------------------------------------------------------
function pcbX(x) = x;
function pcbY(y) = pcb_cy + y;
function pcbToBoxX(x) = wall + inner_w/2 + pcbX(x);
function pcbToBoxY(y) = wall + inner_h/2 + pcbY(y);

// ---- LID cutout positions (PCB-frame coords) ------------------------------
// LED COLUMN — vertical strip on the RIGHT edge of the lid.
//   6 LEDs stacked at PCB x=92, y from -32.5 (PRB) to +32.5 (PWR), 13mm spacing.
led_x = 92; led_y0 = -32.5; led_y1 = 32.5; led_win_w = 8; led_win_pad = 5;
btns = [[-76,-15],[-58,-15]]; btn_hole_dia = 7;
// SW1 slot — bottom-left, vertical slide (pcbRotation=90 on the SS12D10G3)
sw_pos = [-85,-42]; sw_slot = [6,14];

// ---- Cable slots ----------------------------------------------------------
// After the PCB rework, the TOP-edge connectors (J_AC, J_OL, J_COIL) connect
// to DIN-rail components INSIDE the enclosure — they need NO external cable
// slots. Only the bottom-edge connectors (J_DBG, J_FL1/2, J_PR) exit via the
// south wall to hanging cables.
gland_h = 14;
slot_w = 16;
// PCB X positions of bottom-edge connectors → slots in the SOUTH wall
south_slot_xs = [-44, -10, 4, 22];   // J_DBG, J_FL1, J_FL2, J_PR
// East/north slots no longer needed
east_slot_ys_pcb = [];

// ---- HINGE (side-hinge on EAST wall, axis along Y) ------------------------
// Pin axis at (x = box_ox + hinge_clearance, varying y, z = base_d - 1).
// Knuckles alternate between base (even indices) and lid (odd indices).
hinge_knuckle_diam = 8;
hinge_pin_diam = 3;
hinge_pin_hole_d = 3.4;
hinge_clearance = 5;
hinge_pin_z = base_d - 1;
hinge_pin_x = box_ox + hinge_clearance;
hinge_len = 80;
hinge_center_y = wall + inner_h/2 + din_cy;   // hinge centered on DIN zone
hinge_seg_count = 5;
hinge_gap = 0.4;
hinge_seg_len = (hinge_len - hinge_gap*(hinge_seg_count-1)) / hinge_seg_count;
function hinge_seg_y(i) = let(
  y0 = hinge_center_y - hinge_len/2,
  start = y0 + i*(hinge_seg_len + hinge_gap)
) [start, start + hinge_seg_len];

// Knuckle segment supported by an arm extending from the east wall (base) or
// the lid east edge. The hull() makes it taper smoothly from the wall/edge
// to the knuckle cylinder.
module knuckle_seg(i, anchor_x, anchor_z_lo, anchor_z_hi, anchor_thickness) {
  yr = hinge_seg_y(i);
  hull() {
    // Anchor (small slab on wall/lid edge)
    translate([anchor_x, yr[0], anchor_z_lo])
      cube([anchor_thickness, yr[1] - yr[0], anchor_z_hi - anchor_z_lo]);
    // Cylinder at pin axis, axis along +Y
    translate([hinge_pin_x, yr[0], hinge_pin_z])
      rotate([-90, 0, 0])
        cylinder(d=hinge_knuckle_diam, h=yr[1]-yr[0]);
  }
}

module base_knuckle(i) {
  // Anchor on the east wall TOP edge (z just below base_d, spanning wall thickness)
  knuckle_seg(i, box_ox - 2, base_d - 2, base_d, 2);
}

module lid_knuckle_installed(i) {
  // Anchor on lid east edge (x just inside box_ox, at lid plate thickness)
  knuckle_seg(i, box_ox - 0.01, base_d, base_d + lid_t, 0.01);
}

module hinge_pin_hole() {
  y0 = hinge_center_y - hinge_len/2;
  translate([hinge_pin_x, y0 - 5, hinge_pin_z])
    rotate([-90, 0, 0])
      cylinder(d=hinge_pin_hole_d, h=hinge_len + 10, $fn=24);
}

// ===========================================================================
$fn = 48;

module box_outer(d) cube([box_ox, box_oy, d]);
module box_inner(d) translate([wall, wall, floor_t]) cube([inner_w, inner_h, d]);

// ---- BASE -----------------------------------------------------------------
module base() {
  difference() {
    union() {
      box_outer(base_d);
      for (i = [0 : 2 : hinge_seg_count-1]) base_knuckle(i);
    }
    box_inner(base_d);
    // SOUTH-wall cable slots — one per bottom-edge connector (sensor wires)
    for (px = south_slot_xs)
      translate([pcbToBoxX(px) - slot_w/2, -1, floor_t])
        cube([slot_w, wall + 2, gland_h]);
    // EAST-wall cable slots (J_COIL / J_OL), below hinge zone
    for (py = east_slot_ys_pcb)
      translate([box_ox - wall - 1, pcbToBoxY(py) - slot_w/2, floor_t])
        cube([wall + 2, slot_w, gland_h]);
    // WEST-wall MAINS entry — supply L/N/E enters here, next to the DIN
    // row (centered on DIN zone in Y) where the MCB/contactor live.
    translate([-1,
               wall + inner_h/2 + din_cy - mains_slot_wy/2,
               floor_t])
      cube([wall + 2, mains_slot_wy, mains_slot_z]);
    // SOUTH-wall MOTOR exit — motor cable to the pump, clear of the
    // sensor slots on the left half of the south wall.
    translate([motor_slot_box_x - motor_slot_w/2, -1, floor_t])
      cube([motor_slot_w, wall + 2, motor_slot_z]);
    // Bore the hinge pin through the knuckles
    hinge_pin_hole();
    // ----- Engraved zone labels on the cavity floor -----
    // Tells the installer which half of the box holds what. Recessed 0.6mm
    // into the floor (so they don't lift the PCB or foul the DIN rail).
    floor_label_depth = 0.6;
    // "PCB" — centered on the PCB area (visible when PCB is removed)
    translate([wall + inner_w/2,
               wall + inner_h/2 + pcb_cy,
               floor_t - floor_label_depth])
      linear_extrude(floor_label_depth + 0.4)
        text("PCB", size=30, halign="center", valign="center",
             font="Liberation Sans:style=Bold");
    // "DIN RAIL" — centered on the DIN zone, between the two screw bosses
    translate([wall + inner_w/2,
               wall + inner_h/2 + din_cy,
               floor_t - floor_label_depth])
      linear_extrude(floor_label_depth + 0.4)
        text("DIN RAIL", size=16, halign="center", valign="center",
             font="Liberation Sans:style=Bold");
  }
  // PCB standoffs (M3 self-tap)
  for (p = holes)
    translate([pcbToBoxX(p[0]), pcbToBoxY(p[1]), floor_t])
      difference() {
        cylinder(h=standoff_h, d=standoff_od);
        translate([0, 0, -0.1])
          cylinder(h=standoff_h + 0.2, d=(boss_dia < 4.5 ? boss_dia : 2.9));
      }
  // DIN-rail mounting bosses (M3 self-tap). Two cylindrical bosses on the
  // cavity floor, din_boss_spacing apart in X, centered on the DIN zone in
  // Y. The user drills two M3 clearance holes in their 35mm top-hat rail at
  // matching pitch, then screws the rail down through the bosses. Bosses
  // are LOW (din_boss_h) so the rail + contactor stack clears the lid.
  for (sx = [-1, 1])
    translate([wall + inner_w/2 + sx * din_boss_spacing/2,
               wall + inner_h/2 + din_cy, floor_t])
      difference() {
        cylinder(h=din_boss_h, d=din_boss_dia);
        translate([0, 0, -0.1])
          cylinder(h=din_boss_h + 0.2, d=din_boss_hole_dia);
      }
  // Lid screw bosses on the WEST corners (latching side, opposite the hinge)
  for (cy = [wall + 4, inner_h + wall - 4])
    translate([wall + 4, cy, floor_t])
      cylinder(h=inner_d - 6, d=6);
  // "TOP ↑" silkscreen on the north outer wall (raised text)
  translate([box_ox/2, box_oy + 0.01, base_d - 12])
    rotate([90, 0, 180])
      linear_extrude(0.6)
        text("TOP", size=8, halign="center", valign="center");
}

// ---- LID (designed in INSTALLED orientation) ------------------------------
// Plate at z=base_d..base_d+lid_t, rim hanging into cavity at z=base_d-lip..base_d.
// Cutout (x,y) positions match the corresponding features in the base directly.
module lid_installed() {
  rim_o_w = inner_w - 2*fit_clear;
  rim_o_h = inner_h - 2*fit_clear;
  difference() {
    union() {
      // Plate
      translate([0, 0, base_d]) cube([box_ox, box_oy, lid_t]);
      // Rim (hangs into cavity)
      translate([wall + fit_clear, wall + fit_clear, base_d - lip])
        difference() {
          cube([rim_o_w, rim_o_h, lip]);
          translate([rim_wall, rim_wall, -1])
            cube([rim_o_w - 2*rim_wall, rim_o_h - 2*rim_wall, lip + 2]);
        }
      // Lid hinge knuckles (odd segments)
      for (i = [1 : 2 : hinge_seg_count-1]) lid_knuckle_installed(i);
    }
    // ----- cutouts in the plate -----
    // LED window — vertical slot over the 6-LED column on the right edge.
    translate([pcbToBoxX(led_x) - led_win_w/2,
               pcbToBoxY(led_y0) - led_win_pad,
               base_d - 1])
      cube([led_win_w, (led_y1 - led_y0) + 2*led_win_pad, lid_t + 2]);
    // Button holes
    for (b = btns)
      translate([pcbToBoxX(b[0]), pcbToBoxY(b[1]), base_d - 1])
        cylinder(h=lid_t + 2, d=btn_hole_dia);
    // Switch slot
    translate([pcbToBoxX(sw_pos[0]) - sw_slot[0]/2,
               pcbToBoxY(sw_pos[1]) - sw_slot[1]/2,
               base_d - 1])
      cube([sw_slot[0], sw_slot[1], lid_t + 2]);
    // Lid screw holes (WEST corners only — east is the hinge)
    for (cy = [wall + 4, inner_h + wall - 4])
      translate([wall + 4, cy, base_d - 1])
        cylinder(h=lid_t + 2, d=3.4);
    // Hinge pin hole through the knuckles
    hinge_pin_hole();
    // ----- engraved text on the lid's TOP face (visible side) -----
    // Recessed text — subtracts 0.6mm deep into the plate from the top face.
    // "PROJECT VARUNA" up top (above the DIN zone, clear of cutouts)
    title_depth = 0.6;
    translate([box_ox/2, box_oy - 18, base_d + lid_t - title_depth])
      linear_extrude(title_depth + 0.4)
        text("PROJECT VARUNA", size=12, halign="center", valign="center",
             font="Liberation Sans:style=Bold");
    // "made with <3 in chennai" at the bottom (clear of SW1 slot in x)
    translate([box_ox/2, 14, base_d + lid_t - title_depth])
      linear_extrude(title_depth + 0.4)
        text("made with <3 in chennai", size=7, halign="center", valign="center",
             font="Liberation Sans:style=Italic");
  }
}

// LID for STL print: flip lid_installed() so the rim ends up above the plate
// (printable) and the plate sits at z=0..lid_t on the bed.
// Mirror around (y = box_oy/2, z = (base_d + lid_t)/2) via 180° X-rotation
// through that point.
module lid_for_print() {
  y0 = box_oy / 2;
  z0 = (base_d + lid_t) / 2;
  translate([0, y0, z0])
    rotate([180, 0, 0])
      translate([0, -y0, -z0])
        lid_installed();
}

// ---- ASSEMBLY -------------------------------------------------------------
if (part == "base") base();
else if (part == "lid") lid_for_print();
else if (part == "open") {
  // Lid swung 90° open about the hinge pin axis (Y axis at (hinge_pin_x, ?, hinge_pin_z))
  base();
  translate([hinge_pin_x, 0, hinge_pin_z])
    rotate([0, 90, 0])
      translate([-hinge_pin_x, 0, -hinge_pin_z])
        lid_installed();
}
else {  // "hinged" = CLOSED assembly (default)
  base();
  lid_installed();
}
