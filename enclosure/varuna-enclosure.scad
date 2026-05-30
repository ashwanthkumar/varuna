// ============================================================================
// Varuna — single-box enclosure (PCB + DIN rail together)
// Parametric OpenSCAD. Cutout positions are derived from the PCB coordinates
// in ../pcb/index.circuit.tsx (board 200 x 100 mm, origin at center).
//
// Two printable parts: base() and lid().  Render one at a time (see RENDER).
// Units: millimetres.
//
// ⚠ Dimensions for the contactor/overload (DIN stack) and wall thickness are
//   REFERENCE values — measure your actual LEYDEN CJX2-3211 + MaK-1 2P and the
//   printed fit, then tweak the parameters below. This is a starting model.
// ============================================================================

// ---- WHAT TO RENDER -------------------------------------------------------
part = "both";        // "base" | "lid" | "both"  (use "base"/"lid" to export STLs)
explode = 30;         // gap between base & lid when part=="both" (preview only)

// ---- PCB (from ../pcb/index.circuit.tsx) ----------------------------------
pcb_w   = 200;        // board width  (x)
pcb_h   = 100;        // board height (y)
pcb_t   = 1.6;        // board thickness
pcb_clear_top = 18;   // clearance above PCB for the tallest LV part (ESP DevKit / relays)

// PCB mounting holes (M3) — from circuit.json, board-centre origin
hole_dia   = 3.2;
holes = [[-95,46],[95,46],[-95,-46],[95,-46]];
standoff_h = 6;       // PCB sits this high above the base floor
standoff_od = 6;
boss_dia   = 5.2;     // self-tap boss for M3 (or use heat-set inserts: set 4.0)

// ---- DIN-rail compartment (contactor + overload stack) --------------------
// The CJX2-3211 + MaK-1 2P stack mounts on 35mm DIN rail BELOW the PCB zone.
din_zone_h     = 95;  // vertical space reserved for the DIN stack (measure yours!)
din_rail_w     = 35;  // standard top-hat DIN rail
contactor_depth= 80;  // how deep the contactor body sits (drives box depth)

// ---- Box shell ------------------------------------------------------------
wall      = 2.4;      // shell wall thickness
floor_t   = 2.4;
margin    = 8;        // gap from PCB edge to inner wall
lid_t     = 2.0;
lip       = 4;        // overlap lip between base and lid

// Inner cavity dimensions
inner_w = pcb_w + 2*margin;                 // 216
inner_h = pcb_h + margin + din_zone_h + margin;  // PCB zone + DIN zone stacked in Y
inner_d = max(pcb_clear_top + standoff_h + pcb_t, contactor_depth) + 2; // depth

// Where the PCB sits inside the cavity: top portion. PCB-centre offset within cavity.
// Cavity Y spans [-inner_h/2, inner_h/2]; PCB zone is the TOP, DIN zone the BOTTOM.
pcb_cy = inner_h/2 - margin - pcb_h/2;       // PCB centre Y in cavity coords
din_cy = -inner_h/2 + margin + din_zone_h/2; // DIN stack centre Y

// ---- helper: map a PCB (x,y) to cavity coords -----------------------------
function pcbX(x) = x;                         // board centre == cavity X centre
function pcbY(y) = pcb_cy + y;               // shift board into its zone

// ---- LID cutouts (positions from PCB coords) ------------------------------
// LED row (top edge, y=45): one long window over all 6 LEDs.
led_y = 45; led_x0 = -40; led_x1 = 40; led_win_h = 8;
// Buttons: BTN_PAIR(-76,-15), BTN_RST(-58,-15)
btns = [[-76,-15],[-58,-15]]; btn_hole_dia = 7;   // clears a 6mm cap
// Slide switch SW1 (-58, 34): slot for the actuator
sw_pos = [-58,34]; sw_slot = [6,14];

// ---- Cable entry slots (edge cutouts) -------------------------------------
// Bottom-edge connectors (J_AC,J_FL1,J_FL2,J_PR,J_DBG) at y≈-42 -> exit the
// cavity bottom wall. Right-edge connectors (J_COIL,J_OL at x=76) -> right wall.
gland_h = 14;  // height of the cable slot band

// ===========================================================================
$fn = 48;

module box_outer(d) cube([inner_w+2*wall, inner_h+2*wall, d]);
module box_inner(d) translate([wall,wall,floor_t]) cube([inner_w, inner_h, d]);

// ---- BASE -----------------------------------------------------------------
module base() {
  base_d = inner_d + floor_t;
  difference() {
    // shell
    box_outer(base_d);
    box_inner(base_d);          // hollow
    // bottom-edge cable slots (connector wire entry)
    translate([wall+inner_w*0.10, -1, floor_t])
      cube([inner_w*0.80, wall+2, gland_h]);
    // right-edge cable slots (J_COIL / J_OL)
    translate([inner_w+wall-1, wall+inner_h*0.55, floor_t])
      cube([wall+2, inner_h*0.30, gland_h]);
  }
  // PCB standoffs at the 4 hole positions
  for (p = holes)
    translate([wall+inner_w/2+pcbX(p[0]), wall+inner_h/2+pcbY(p[1]), floor_t])
      difference() {
        cylinder(h=standoff_h, d=standoff_od);
        translate([0,0,-0.1]) cylinder(h=standoff_h+0.2, d= boss_dia<4.5?boss_dia:2.9);
      }
  // DIN-rail mount posts (two pedestals; clip a real 35mm rail on top)
  for (sx = [-1,1])
    translate([wall+inner_w/2 + sx*70, wall+inner_h/2+din_cy, floor_t])
      cube([10, din_rail_w+6, 12], center=true);
  // corner screw bosses for the lid
  for (cx=[wall+4, inner_w+wall-4], cy=[wall+4, inner_h+wall-4])
    translate([cx,cy,floor_t]) cylinder(h=inner_d-6, d=6);
}

// ---- LID ------------------------------------------------------------------
module lid() {
  difference() {
    cube([inner_w+2*wall, inner_h+2*wall, lid_t]);
    // LED window (long slot over the 6-LED row)
    translate([wall+inner_w/2+led_x0, wall+inner_h/2+pcbY(led_y)-led_win_h/2, -1])
      cube([led_x1-led_x0, led_win_h, lid_t+2]);
    // button holes
    for (b=btns)
      translate([wall+inner_w/2+pcbX(b[0]), wall+inner_h/2+pcbY(b[1]), -1])
        cylinder(h=lid_t+2, d=btn_hole_dia);
    // slide-switch slot
    translate([wall+inner_w/2+pcbX(sw_pos[0]), wall+inner_h/2+pcbY(sw_pos[1]), -1])
      cube([sw_slot[0], sw_slot[1], lid_t+2], center=false);
    // lid corner screw holes
    for (cx=[wall+4, inner_w+wall-4], cy=[wall+4, inner_h+wall-4])
      translate([cx,cy,-1]) cylinder(h=lid_t+2, d=3.4);
  }
  // alignment lip: a thin rectangular rim that drops into the base cavity.
  // Outer = cavity inner size minus a small fit clearance; inner hollow = -2mm wall.
  fit = 0.3;                       // clearance so the lid drops in
  rim_o_w = inner_w - 2*fit;
  rim_o_h = inner_h - 2*fit;
  rim_wall = 1.8;
  translate([wall+fit, wall+fit, lid_t])
    difference() {
      cube([rim_o_w, rim_o_h, lip]);
      translate([rim_wall, rim_wall, -1])
        cube([rim_o_w-2*rim_wall, rim_o_h-2*rim_wall, lip+2]);
    }
  // NOTE: print the lid in CLEAR filament (or leave the LED window open / glue
  // a clear acrylic strip) so the labelled LED row shows through.
}

// ---- ASSEMBLY -------------------------------------------------------------
if (part=="base") base();
else if (part=="lid") lid();
else {
  base();
  translate([0,0, inner_d+floor_t+explode]) lid();
}
