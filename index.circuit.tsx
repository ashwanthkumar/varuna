/**
 * Varuna — ESP32 Water-Level Pump Controller
 * ------------------------------------------------------------------
 * Controls a 2HP single-phase motor by directly driving an external DOL
 * CONTACTOR COIL (e.g. CJX2-3211 / LC1D32, 220VAC coil) via an onboard relay.
 * The board + contactor + thermal overload relay together form the DOL starter,
 * all mounted in one DIN-rail enclosure. The contactor (NOT this PCB) carries
 * the motor current; the PCB relay only switches the ~200mA coil.
 *
 *  AC Mains (230V) ──► MOV (RV1) ──► HLK-5M05 (AC→5V DC)
 *        5V ──► [PWR SW] ──► ESP32 DevKit (VIN) + ULN2003 + relay coil
 *      3V3 (from DevKit LDO) ──► sensor pull-ups
 *
 *  GPIO23 ─► ULN2003 IN1 ─► RLY_MOTOR (HELD) ─► J_COIL ─► contactor A1/A2
 *  GPIO21 ◄─ J_OL ◄─ thermal-overload aux NC contact (trip sense)
 *  2x float switches + 3x SS probes ─► protected front-ends ─► GPIOs
 *  6x LEDs + 2 buttons (pairing / factory reset)
 *
 * EXTERNAL DOL components (DIN-rail, NOT on PCB — see parts.txt):
 *   Contactor      : CJX2-3211 (32A AC-3, 220VAC coil)  -> wired to J_COIL
 *   Overload relay : LRD-22 (clips under contactor, dial to motor FLA ~12A)
 *                    its 95-96 NC aux contact -> wired to J_OL for trip sense
 *   Upstream       : 20A Type-C MCB in the DB panel
 *
 * FLOORPLAN (board 200 x 100 mm, origin = center, x∈[-100,100] y∈[-50,50])
 *  - Left  : HIGH-VOLTAGE zone — AC terminal, MOV, HLK-5M05, power switch
 *  - Center: ESP32 DevKit on two 19-pin female headers (rotated)
 *  - Right : ULN2003, RLY_MOTOR, J_COIL (coil out), J_OL (overload sense), LEDs
 *  - Bottom: float + probe terminals with protected front-ends
 *
 * ⚠ SAFETY / FAB NOTES
 *  - Keep >=3mm creepage/clearance on the AC side (J_AC, RV1, U_PSU AC pins)
 *    AND on the coil-switching side (RLY_MOTOR contacts, J_COIL, net.LIVE/NEUTRAL
 *    which now carry 230VAC across to the relay). Hand-route + widen these.
 *  - RELAY CONTACT MAPPING (pin2/pin3 = coil; pin5 = COM; pin1/pin4 = NO/NC) is
 *    inferred from the C35449 footprint. CONFIRM NO vs NC with a multimeter
 *    before field-wiring to the contactor coil.
 *  - The thermal overload relay (LRD) provides motor jam/overcurrent protection
 *    — it is mandatory and lives on the DIN rail, not the PCB.
 *  - Do NOT wrap positioned children in <group> here — a group re-anchors child
 *    pcbX/pcbY to the group origin and scrambles this absolute floorplan.
 */

import { HLK_5M05 } from "./imports/HLK_5M05"
import { ULN2003ADR } from "./imports/ULN2003ADR"
import { SRD_05VDC_SL_C } from "./imports/SRD_05VDC_SL_C"
import { WJ128V_5_0_03P_14_00A as Terminal3P } from "./imports/WJ128V_5_0_03P_14_00A"
import { WJ500V_5_08_2P as Terminal2P } from "./imports/WJ500V_5_08_2P"
import { DB128L_5_08_4P_GN_S as Terminal4P } from "./imports/DB128L_5_08_4P_GN_S"
import { SS12D10G3 } from "./imports/SS12D10G3"
import { TMOV14RP275E } from "./imports/TMOV14RP275E"
import { PRTR5V0U2X } from "./imports/PRTR5V0U2X"
import { TS_1101_C_W as TactileButton } from "./imports/TS_1101_C_W"

// Semantic pin-label overrides (spread last in each import, so these win).
const RELAY_PINS = { pin1: "NC", pin2: "COILA", pin3: "COILB", pin4: "NO", pin5: "COM" } as const
const ULN_PINS = {
  pin1: "IN1", pin2: "IN2", pin3: "IN3", pin4: "IN4", pin5: "IN5", pin6: "IN6",
  pin7: "IN7", pin8: "GND", pin9: "COM", pin10: "OUT7", pin11: "OUT6", pin12: "OUT5",
  pin13: "OUT4", pin14: "OUT3", pin15: "OUT2", pin16: "OUT1",
} as const
const HLK_PINS = { pin1: "ACN", pin2: "ACL", pin3: "GND", pin4: "V5" } as const
const AC_PINS = { pin1: "L", pin2: "N", pin3: "E" } as const
// J_COIL drives the external DOL contactor coil (e.g. CJX2-3211, 220VAC coil):
//   A1 = switched Live (relay NO), A2 = Neutral. Relay holds closed = motor ON.
const COIL_PINS = { pin1: "A1", pin2: "A2" } as const
// J_OL = thermal-overload-relay aux NC contact sense (dry contact, opto-isolated
//   is overkill — it is a volt-free contact). OL pin pulled up; GND is the return.
const OL_PINS = { pin1: "OL", pin2: "GND" } as const
const SW_PINS = { pin1: "SW", pin2: "GND" } as const
// SS12D10G3 SPDT slide switch used as the onboard power ON/OFF for the whole
// controller: pin2 = common (wiper, fed by PSU 5V), pin1 = ON throw to the
// board 5V rail, pin3 = unused throw.
const PWR_SW_PINS = { pin1: "P5_OUT", pin2: "P5_IN", pin3: "NC2" } as const

// Probe input pin labels for J_PR 4-pole terminal
// PR1=LOW probe, PR2=MID probe, PR3=HIGH probe, COM=shared excitation electrode
const PROBE_PINS = { pin1: "PR1", pin2: "PR2", pin3: "PR3", pin4: "COM" } as const
// PRTR5V0U2X: pin1=GND, pin4=VCC, pin2+pin3 = two protected IO lines
const TVS_FL_PINS  = { pin1: "GND", pin2: "FL1", pin3: "FL2", pin4: "VCC" } as const
const TVS_PR12_PINS = { pin1: "GND", pin2: "PR1", pin3: "PR2", pin4: "VCC" } as const
const TVS_PR3C_PINS = { pin1: "GND", pin2: "PR3", pin3: "COM", pin4: "VCC" } as const

export default () => (
  <board width="200mm" height="100mm">
    {/* ============================================================ */}
    {/* POWER:  AC mains in -> protection -> AC/DC -> 5V rail        */}
    {/* ============================================================ */}
    {/* J_AC at bottom-left edge (pcbRotation=0 → wire entry faces DOWN, out of board).
       With rotation 0: pin1(L) at x=center-5=-85, pin2(N) at x=-80, pin3(E) at x=-75.
       Aligned with sensor connectors at y=-42 for a clean bottom-edge connector row. */}
    {/* Bottom-edge connector row — front (wire-entry) faces all flush at y=-47.58.
       Each part has a different body depth (pad-to-face), so pcbY is offset per
       part: WJ128V(J_AC)=5.58 -> pcbY=-42.0; DB128L(J_PR)=5.36 -> -42.22;
       WJ500V(J_FL)=4.77 -> -42.81. */}
    <Terminal3P
      name="J_AC"
      pinLabels={AC_PINS}
      schX={-13}
      schY={6}
      pcbX={-80}
      pcbY={-42}
    />
    {/* RV1 = TMOV14RP275E: 275Vac MOV across L-N (JLC C1528070).
       Clamps mains transients. No PCB fuse — upstream MCB in the DB panel
       provides overcurrent protection; HLK-5M05 has internal protection.
       pin3/pin4 are alt pads for the same nodes as pin1/pin2. */}
    <TMOV14RP275E
      name="RV1"
      pinLabels={{ pin1: "A", pin2: "B", pin3: "B_alt", pin4: "A_alt" }}
      schX={-11}
      schY={4}
      pcbX={-87.5}
      pcbY={28}
    />
    {/* U_PSU = Hi-Link HLK-5M05 isolated AC->5V/1A module (JLC C209907).
       AC (primary) pins on the LEFT short side at x=-88.8; DC (secondary)
       pins on the RIGHT at x=-55.2 — the module body IS the isolation
       barrier, so all mains copper is kept on the left (x <= -83). */}
    <HLK_5M05
      name="U_PSU"
      pinLabels={HLK_PINS}
      schX={-10}
      schY={6}
      pcbX={-72}
      pcbY={8}
    />
    {/* Onboard power ON/OFF — SS12D10G3 SPDT slide switch, pcbRotation=90 makes
       it slide UP/DOWN (vertical) like a standard panel rocker/slider. */}
    <SS12D10G3
      name="SW1"
      pinLabels={PWR_SW_PINS}
      schX={-7}
      schY={6}
      pcbRotation={90}
      pcbX={-58}
      pcbY={34}
    />
    <capacitor name="C1" capacitance="100uF" footprint="1206" schX={-13} schY={2.5} pcbX={-48} pcbY={6} />
    <capacitor name="C2" capacitance="100nF" footprint="0603" schX={-11} schY={2.5} pcbX={-48} pcbY={1} />

    {/* AC-side connectivity — HAND-ROUTED for 230V creepage.
       J_AC is now at the BOTTOM edge (pcbRotation=0, y=-42):
         pin1(L) at x=-85, pin2(N) at x=-80, pin3(E) at x=-75.
       L lane goes straight UP at x=-85 to RV1.B (y=28) — no N crossing.
       N goes from (-80,-42) right to (-80,-35) then LEFT to x=-93 then UP.
       L and N never cross because L is at x=-85 (left of N at x=-80).
       Gap between L and N lanes: 8mm centre-to-centre = 7.2mm edge-to-edge. */}
    {/* L: up from bottom pin (y=-42), straight to RV1.B, then HLK.ACL */}
    <trace from="J_AC.L" to="RV1.B" thickness="0.8mm"
      path={[{ x: -85, y: -42 }, { x: -85, y: 28 }, { x: -86.23, y: 28 }]} />
    <trace from="RV1.B" to="U_PSU.ACL" thickness="0.8mm"
      path={[{ x: -86.23, y: 28 }, { x: -85, y: 28 }, { x: -85, y: 5 }, { x: -88.8, y: 5 }]} />
    {/* N: right then left to x=-93 lane, up to RV1.A */}
    <trace from="J_AC.N" to="RV1.A" thickness="0.8mm"
      path={[{ x: -80, y: -42 }, { x: -80, y: -35 }, { x: -93, y: -35 }, { x: -93, y: 28 }, { x: -88.77, y: 28 }]} />
    <trace from="RV1.A" to="U_PSU.ACN" thickness="0.8mm"
      path={[{ x: -88.77, y: 28 }, { x: -93, y: 28 }, { x: -93, y: 11 }, { x: -88.8, y: 11 }]} />
    {/* E: short stub downward, away from L/N */}
    <trace from="J_AC.E" to="net.EARTH" thickness="0.8mm"
      path={[{ x: -75, y: -42 }, { x: -75, y: -46 }]} />
    {/* Name the mains rails so the contactor-coil relay can tap them.
       LIVE is taken AFTER the MOV (RV1.B); NEUTRAL from RV1.A. The relay
       COM gets LIVE; the contactor coil return (J_COIL.A2) gets NEUTRAL.
       NOTE: these carry 230VAC across the board to the relay zone — the
       autorouter handles them, but for production verify >=3mm creepage
       around RLY_MOTOR contacts and J_COIL and widen by hand if needed. */}
    <trace from="RV1.B" to="net.LIVE" thickness="0.8mm" />
    <trace from="RV1.A" to="net.NEUTRAL" thickness="0.8mm" />
    {/* DC-side: PSU 5V -> onboard slide switch -> board 5V rail */}
    <trace from="U_PSU.V5" to="SW1.P5_IN" />
    <trace from="SW1.P5_OUT" to="net.V5" />
    <trace from="U_PSU.GND" to="net.GND" />
    <trace from="C1.pin1" to="net.V5" />
    <trace from="C1.pin2" to="net.GND" />
    <trace from="C2.pin1" to="net.V5" />
    <trace from="C2.pin2" to="net.GND" />

    {/* ============================================================ */}
    {/* MCU:  ESP32 DevKit (38-pin DOIT V1) on two female headers    */}
    {/* ============================================================ */}
    <pinheader
      name="ESP_L"
      pinCount={19}
      pitch="2.54mm"
      gender="female"
      pcbRotation={90}
      showSilkscreenPinLabels
      pinLabels={[
        "V3V3", "EN", "GPIO36", "GPIO39", "GPIO34", "GPIO35", "GPIO32",
        "GPIO33", "GPIO25", "GPIO26", "GPIO27", "GPIO14", "GPIO12",
        "GND_L", "GPIO13", "GPIO9", "GPIO10", "GPIO11", "V5_L",
      ]}
      schX={0}
      schY={0}
      pcbX={-13}
      pcbY={0}
    />
    <pinheader
      name="ESP_R"
      pinCount={19}
      pitch="2.54mm"
      gender="female"
      pcbRotation={90}
      showSilkscreenPinLabels
      pinLabels={[
        "GND_R1", "GPIO23", "GPIO22", "GPIO1", "GPIO3", "GPIO21", "GND_R2",
        "GPIO19", "GPIO18", "GPIO5", "GPIO17", "GPIO16", "GPIO4", "GPIO0",
        "GPIO2", "GPIO15", "GPIO8", "GPIO7", "GPIO6",
      ]}
      schX={4}
      schY={0}
      pcbX={13}
      pcbY={0}
    />

    {/* Power/ground to the DevKit */}
    <trace from="ESP_L.V5_L" to="net.V5" />
    <trace from="ESP_L.V3V3" to="net.V3V3" />
    <trace from="ESP_L.GND_L" to="net.GND" />
    <trace from="ESP_R.GND_R1" to="net.GND" />
    <trace from="ESP_R.GND_R2" to="net.GND" />

    {/* ============================================================ */}
    {/* UART DEBUG HEADER (J_DBG) — clip-on serial for field service  */}
    {/* 3-pin: TX(GPIO1) / RX(GPIO3) / GND. Connect a USB-TTL adapter */}
    {/* (3V3 logic) to read Serial logs without removing the DevKit.  */}
    {/* The DevKit's own USB still handles flashing; this is read/log  */}
    {/* access through a cover hole. Cross TX<->RX at the adapter.     */}
    {/* ============================================================ */}
    {/* J_DBG centred in the bottom gap between J_AC (right edge -72) and
       J_FL1 (left edge -16): gap centre x=-44. Above the connector row. */}
    <silkscreentext text="DBG TX RX G" pcbX={-44} pcbY={-9} anchorAlignment="center" fontSize={1.2} />
    <pinheader
      name="J_DBG"
      pinCount={3}
      pitch="2.54mm"
      gender="male"
      showSilkscreenPinLabels
      pinLabels={["TX", "RX", "GND"]}
      schX={4}
      schY={-6}
      pcbX={-44}
      pcbY={-15}
    />
    <trace from="J_DBG.TX" to="ESP_R.GPIO1" />
    <trace from="J_DBG.RX" to="ESP_R.GPIO3" />
    <trace from="J_DBG.GND" to="net.GND" />

    {/* ============================================================ */}
    {/* DRIVER + RELAY:  switch the external DOL contactor coil      */}
    {/* ============================================================ */}
    {/* ULN2003A darlington array (built-in flyback diodes on COM/pin9).
       Only IN1/OUT1 used (single motor). GPIO23 = motor ON/OFF (HELD, not pulsed). */}
    <ULN2003ADR
      name="U_DRV"
      pinLabels={ULN_PINS}
      schX={8}
      schY={2}
      pcbX={32}
      pcbY={2}
    />
    <trace from="ESP_R.GPIO23" to="U_DRV.IN1" />
    <trace from="U_DRV.GND" to="net.GND" />
    <trace from="U_DRV.COM" to="net.V5" />

    {/* RLY_MOTOR = SRD-05VDC-SL-C (JLC C35449). Switches the CONTACTOR COIL,
       not the motor. Coil current (~200mA @230VAC for CJX2-32) is well within
       the relay's 10A/250VAC contact rating.
         COM  <- mains Live (net.LIVE, after MOV)
         NO   -> J_COIL.A1  (switched Live to contactor A1)
         COILA<- 5V, COILB <- ULN OUT1
       GPIO23 HIGH -> relay closes -> coil energised -> contactor pulls in -> motor runs. */}
    <SRD_05VDC_SL_C
      name="RLY_MOTOR"
      pinLabels={RELAY_PINS}
      schX={11}
      schY={2}
      pcbX={50}
      pcbY={6}
    />
    <trace from="RLY_MOTOR.COILA" to="net.V5" />
    <trace from="RLY_MOTOR.COILB" to="U_DRV.OUT1" />

    {/* J_COIL: 2-pole terminal to the contactor coil (A1/A2).
       A1 = switched Live from relay NO; A2 = Neutral. */}
    <Terminal2P
      name="J_COIL"
      pinLabels={COIL_PINS}
      schX={14}
      schY={3}
      pcbRotation={90}
      pcbX={76}
      pcbY={16}
    />
    {/* mains Live in -> relay COM; relay NO -> coil A1 (hand-routed, 0.8mm) */}
    <trace from="RLY_MOTOR.COM" to="net.LIVE" thickness="0.8mm" />
    <trace from="RLY_MOTOR.NO" to="J_COIL.A1" thickness="0.8mm" />
    <trace from="J_COIL.A2" to="net.NEUTRAL" thickness="0.8mm" />

    {/* J_OL: thermal-overload-relay aux NC contact sense (volt-free).
       Wire the overload's 95-96 NC contact across OL-GND. GPIO21 reads:
       HIGH (pulled up) = healthy; LOW (contact closed to GND) = NOT tripped.
       When the overload TRIPS, the NC contact OPENS -> GPIO21 reads HIGH.
       Firmware: treat sustained HIGH while motor commanded ON as a trip fault. */}
    <Terminal2P
      name="J_OL"
      pinLabels={OL_PINS}
      schX={14}
      schY={-2}
      pcbRotation={90}
      pcbX={76}
      pcbY={-10}
    />
    <resistor name="RU_OL" resistance="10k" footprint="0603" schX={12} schY={-2} pcbX={60} pcbY={-10} />
    <resistor name="RS_OL" resistance="220" footprint="0603" schX={12} schY={-3} pcbX={60} pcbY={-15} />
    <capacitor name="CF_OL" capacitance="100nF" footprint="0603" schX={13} schY={-2} pcbX={64} pcbY={-10} />
    <trace from="RU_OL.pin1" to="net.V3V3" />
    <trace from="RU_OL.pin2" to="ESP_R.GPIO21" />
    <trace from="CF_OL.pin1" to="ESP_R.GPIO21" />
    <trace from="CF_OL.pin2" to="net.GND" />
    <trace from="RS_OL.pin1" to="ESP_R.GPIO21" />
    <trace from="RS_OL.pin2" to="J_OL.OL" />
    <trace from="J_OL.GND" to="net.GND" />

    {/* ============================================================ */}
    {/* LED INDICATOR CLUSTER — grouped in one labelled row along the */}
    {/* top edge so all 6 are visible through a transparent front      */}
    {/* cover. Bold silkscreen labels above each LED.                  */}
    {/*                                                                */}
    {/*  Layout per channel (top→down): LABEL(y=49) LED(y=45) R(y=40)  */}
    {/*  6 LEDs evenly spaced 13mm apart, centred on the board.        */}
    {/*   PWR(red)  WIFI(grn)  MOTOR(yel)  FL1(blu)  FL2(blu)  PRB(blu)*/}
    {/* ============================================================ */}
    {/* PWR — always on (5V rail, no GPIO) */}
    <silkscreentext text="PWR" pcbX={-32.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED_PWR" color="red" footprint="0603" schX={7} schY={-3} pcbX={-32.5} pcbY={45} />
    <resistor name="R_PWR" resistance="1k" footprint="0603" schX={6} schY={-3} pcbX={-32.5} pcbY={40} />
    <trace from="R_PWR.pin1" to="net.V5" />
    <trace from="R_PWR.pin2" to="LED_PWR.pin1" />
    <trace from="LED_PWR.pin2" to="net.GND" />

    {/* WIFI — system/WiFi status (GPIO4) */}
    <silkscreentext text="WIFI" pcbX={-19.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED1" color="green" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C965799"] }} schX={9.5} schY={-3} pcbX={-19.5} pcbY={45} />
    <resistor name="R_LED" resistance="330" footprint="0603" schX={8} schY={-3} pcbX={-19.5} pcbY={40} />
    <trace from="ESP_R.GPIO4" to="R_LED.pin1" />
    <trace from="R_LED.pin2" to="LED1.pin1" />
    <trace from="LED1.pin2" to="net.GND" />

    {/* MOTOR — pump running (GPIO17) */}
    <silkscreentext text="MOTOR" pcbX={-6.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED_MOTOR" color="yellow" footprint="0603" schX={11} schY={-3} pcbX={-6.5} pcbY={45} />
    <resistor name="R_MOTOR" resistance="330" footprint="0603" schX={10} schY={-3} pcbX={-6.5} pcbY={40} />
    <trace from="ESP_R.GPIO17" to="R_MOTOR.pin1" />
    <trace from="R_MOTOR.pin2" to="LED_MOTOR.pin1" />
    <trace from="LED_MOTOR.pin2" to="net.GND" />

    {/* FL1 — float switch 1 / tank LOW (GPIO19) */}
    <silkscreentext text="FL1" pcbX={6.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED_FL1" color="blue" footprint="0603" schX={7} schY={-5} pcbX={6.5} pcbY={45} />
    <resistor name="R_FL1" resistance="330" footprint="0603" schX={6} schY={-5} pcbX={6.5} pcbY={40} />
    <trace from="ESP_R.GPIO19" to="R_FL1.pin1" />
    <trace from="R_FL1.pin2" to="LED_FL1.pin1" />
    <trace from="LED_FL1.pin2" to="net.GND" />

    {/* FL2 — float switch 2 / tank HIGH (GPIO18) */}
    <silkscreentext text="FL2" pcbX={19.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED_FL2" color="blue" footprint="0603" schX={9} schY={-5} pcbX={19.5} pcbY={45} />
    <resistor name="R_FL2" resistance="330" footprint="0603" schX={8} schY={-5} pcbX={19.5} pcbY={40} />
    <trace from="ESP_R.GPIO18" to="R_FL2.pin1" />
    <trace from="R_FL2.pin2" to="LED_FL2.pin1" />
    <trace from="LED_FL2.pin2" to="net.GND" />

    {/* PRB — probe water detected (GPIO5) */}
    <silkscreentext text="PRB" pcbX={32.5} pcbY={49} anchorAlignment="center" fontSize={1.5} />
    <led name="LED_PRB" color="blue" footprint="0603" schX={11} schY={-5} pcbX={32.5} pcbY={45} />
    <resistor name="R_PRB" resistance="330" footprint="0603" schX={10} schY={-5} pcbX={32.5} pcbY={40} />
    <trace from="ESP_R.GPIO5" to="R_PRB.pin1" />
    <trace from="R_PRB.pin2" to="LED_PRB.pin1" />
    <trace from="LED_PRB.pin2" to="net.GND" />

    {/* ============================================================ */}
    {/* BUTTONS — below the HLK module, labelled for transparent cover */}
    {/* BTN_PAIR : WiFi pairing / config mode (GPIO0 — boot pin, runtime OK) */}
    {/* BTN_RST  : factory reset (GPIO16)                            */}
    {/* Active-LOW (button shorts to GND), 10k pull-up + 100nF debounce. */}
    {/* Use TALL through-hole tactile buttons so the actuator reaches  */}
    {/* the cover holes for direct finger press (see parts.txt).       */}
    {/* Placed at x=-76/-62, clear of the AC lanes (L@x=-85, N@x=-93). */}
    {/* ============================================================ */}
    {/* TS-1101-C-W 6x6mm THT tactile button (JLC C318938).
       4-pin: pin1/pin3 = one side, pin2/pin4 = other side; press bridges them.
       Wire pin1 -> GND, pin2 -> GPIO/pull-up node (SPST). Fit a tall keycap /
       extender or use a cover hole over the actuator for finger access. */}
    {/* PAIR + RESET grouped below the HLK module (x=-76/-58). */}
    <silkscreentext text="PAIR" pcbX={-76} pcbY={-7} anchorAlignment="center" fontSize={1.5} />
    <TactileButton name="BTN_PAIR" schX={6} schY={-7} pcbX={-76} pcbY={-15} />
    <resistor name="R_BPAIR" resistance="10k" footprint="0603" schX={7} schY={-7} pcbX={-68} pcbY={-21} />
    <capacitor name="C_BPAIR" capacitance="100nF" footprint="0603" schX={8} schY={-7} pcbX={-76} pcbY={-21} />
    <trace from="BTN_PAIR.pin1" to="net.GND" />
    <trace from="BTN_PAIR.pin2" to="R_BPAIR.pin2" />
    <trace from="R_BPAIR.pin1" to="net.V3V3" />
    <trace from="BTN_PAIR.pin2" to="ESP_R.GPIO0" />
    <trace from="C_BPAIR.pin1" to="ESP_R.GPIO0" />
    <trace from="C_BPAIR.pin2" to="net.GND" />

    <silkscreentext text="RESET" pcbX={-58} pcbY={-7} anchorAlignment="center" fontSize={1.5} />
    <TactileButton name="BTN_RST" schX={10} schY={-7} pcbX={-58} pcbY={-15} />
    <resistor name="R_BRST" resistance="10k" footprint="0603" schX={11} schY={-7} pcbX={-50} pcbY={-21} />
    <capacitor name="C_BRST" capacitance="100nF" footprint="0603" schX={12} schY={-7} pcbX={-58} pcbY={-21} />
    <trace from="BTN_RST.pin1" to="net.GND" />
    <trace from="BTN_RST.pin2" to="R_BRST.pin2" />
    <trace from="R_BRST.pin1" to="net.V3V3" />
    <trace from="BTN_RST.pin2" to="ESP_R.GPIO16" />
    <trace from="C_BRST.pin1" to="ESP_R.GPIO16" />
    <trace from="C_BRST.pin2" to="net.GND" />

    {/* ============================================================ */}
    {/* FLOAT SWITCH INPUTS (2x dry-contact, CAT6 pair 1+2)         */}
    {/*                                                              */}
    {/*  V3V3 -[10k RU]- GPIO36/39 -[220R RS]- TVS_FL - J_FL.SW    */}
    {/*                      |                                       */}
    {/*                    100nF CF                                  */}
    {/*                      |                                       */}
    {/*                     GND ─── J_FL.GND                        */}
    {/*                                                              */}
    {/*  Float closes SW→GND → GPIO reads LOW                       */}
    {/* ============================================================ */}
    <Terminal2P name="J_FL1" pinLabels={{ pin1: "SW", pin2: "GND" }}
      schX={-22} schY={-5} pcbX={-10} pcbY={-42.81} />
    <Terminal2P name="J_FL2" pinLabels={{ pin1: "SW", pin2: "GND" }}
      schX={-18} schY={-5} pcbX={4} pcbY={-42.81} />

    {/* TVS_FL: PRTR5V0U2X protects both float lines */}
    <PRTR5V0U2X name="TVS_FL" pinLabels={TVS_FL_PINS}
      schX={-20} schY={-7} pcbX={-3} pcbY={-32} />
    <trace from="TVS_FL.GND" to="net.GND" />
    <trace from="TVS_FL.VCC" to="net.V3V3" />
    <trace from="TVS_FL.FL1" to="J_FL1.SW" />
    <trace from="TVS_FL.FL2" to="J_FL2.SW" />

    {/* Float 1 front-end — GPIO36 (input-only, external pull-up) */}
    <resistor name="RU_FL1" resistance="10k" footprint="0603" schX={-22} schY={-8} pcbX={-19} pcbY={-22} />
    <resistor name="RS_FL1" resistance="220" footprint="0603" schX={-22} schY={-9.5} pcbX={-19} pcbY={-27} />
    <capacitor name="CF_FL1" capacitance="100nF" footprint="0603" schX={-21} schY={-8} pcbX={-8} pcbY={-22} />
    <trace from="RU_FL1.pin1" to="net.V3V3" />
    <trace from="RU_FL1.pin2" to="ESP_L.GPIO36" />
    <trace from="CF_FL1.pin1" to="ESP_L.GPIO36" />
    <trace from="CF_FL1.pin2" to="net.GND" />
    <trace from="RS_FL1.pin1" to="ESP_L.GPIO36" />
    <trace from="RS_FL1.pin2" to="TVS_FL.FL1" />
    <trace from="J_FL1.GND" to="net.GND" />

    {/* Float 2 front-end — GPIO39 (input-only, external pull-up) */}
    <resistor name="RU_FL2" resistance="10k" footprint="0603" schX={-18} schY={-8} pcbX={4} pcbY={-22} />
    <resistor name="RS_FL2" resistance="220" footprint="0603" schX={-18} schY={-9.5} pcbX={4} pcbY={-27} />
    <capacitor name="CF_FL2" capacitance="100nF" footprint="0603" schX={-17} schY={-8} pcbX={9} pcbY={-22} />
    <trace from="RU_FL2.pin1" to="net.V3V3" />
    <trace from="RU_FL2.pin2" to="ESP_L.GPIO39" />
    <trace from="CF_FL2.pin1" to="ESP_L.GPIO39" />
    <trace from="CF_FL2.pin2" to="net.GND" />
    <trace from="RS_FL2.pin1" to="ESP_L.GPIO39" />
    <trace from="RS_FL2.pin2" to="TVS_FL.FL2" />
    <trace from="J_FL2.GND" to="net.GND" />

    {/* ============================================================ */}
    {/* SS PROBE INPUTS (3x + shared common, CAT6 pair 3+4)         */}
    {/*                                                              */}
    {/*  GPIO33 -[1k R_EXC]- TVS_PR3C.COM - J_PR.COM (electrode)   */}
    {/*                                                              */}
    {/*  J_PR.PR1 - TVS_PR12 -[220R RS]- GPIO34 -[10k RD]- GND     */}
    {/*  J_PR.PR2 - TVS_PR12 -[220R RS]- GPIO35 -[10k RD]- GND     */}
    {/*  J_PR.PR3 - TVS_PR3C -[220R RS]- GPIO32 -[10k RD]- GND     */}
    {/*                                                              */}
    {/*  AC excitation: GPIO33 pulses HIGH briefly; firmware reads  */}
    {/*  GPIO34/35/32 in sync. Water bridging COM to probe → HIGH.  */}
    {/*  Pull-DOWN so GPIOs read LOW when no water / excitation OFF.*/}
    {/*  ⚠ GPIO34/35 are input-only on ESP32 — no internal pull.    */}
    {/* ============================================================ */}
    <Terminal4P name="J_PR" pinLabels={PROBE_PINS}
      schX={-14} schY={-5} pcbX={22} pcbY={-42.22} />

    {/* TVS_PR12: protects probe lines 1 + 2 */}
    <PRTR5V0U2X name="TVS_PR12" pinLabels={TVS_PR12_PINS}
      schX={-14} schY={-7} pcbX={16} pcbY={-32} />
    <trace from="TVS_PR12.GND" to="net.GND" />
    <trace from="TVS_PR12.VCC" to="net.V3V3" />
    <trace from="TVS_PR12.PR1" to="J_PR.PR1" />
    <trace from="TVS_PR12.PR2" to="J_PR.PR2" />

    {/* TVS_PR3C: protects probe line 3 + COM excitation */}
    <PRTR5V0U2X name="TVS_PR3C" pinLabels={TVS_PR3C_PINS}
      schX={-10} schY={-7} pcbX={30} pcbY={-32} />
    <trace from="TVS_PR3C.GND" to="net.GND" />
    <trace from="TVS_PR3C.VCC" to="net.V3V3" />
    <trace from="TVS_PR3C.PR3" to="J_PR.PR3" />
    <trace from="TVS_PR3C.COM" to="J_PR.COM" />

    {/* Probe excitation: GPIO33 → 1kΩ → COM electrode */}
    <resistor name="R_EXC" resistance="1k" footprint="0603"
      schX={-10} schY={-9} pcbX={36} pcbY={-27} />
    <trace from="ESP_L.GPIO33" to="R_EXC.pin1" />
    <trace from="R_EXC.pin2" to="TVS_PR3C.COM" />

    {/* Probe 1 front-end — GPIO34 (input-only, external pull-DOWN) */}
    <resistor name="RD_PR1" resistance="10k" footprint="0603" schX={-16} schY={-8} pcbX={18} pcbY={-22} />
    <resistor name="RS_PR1" resistance="220" footprint="0603" schX={-16} schY={-9.5} pcbX={18} pcbY={-27} />
    <capacitor name="CF_PR1" capacitance="100nF" footprint="0603" schX={-15} schY={-8} pcbX={23} pcbY={-22} />
    <trace from="RD_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="RD_PR1.pin2" to="net.GND" />
    <trace from="CF_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="CF_PR1.pin2" to="net.GND" />
    <trace from="RS_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="RS_PR1.pin2" to="TVS_PR12.PR1" />

    {/* Probe 2 front-end — GPIO35 (input-only, external pull-DOWN) */}
    <resistor name="RD_PR2" resistance="10k" footprint="0603" schX={-12} schY={-8} pcbX={36} pcbY={-22} />
    <resistor name="RS_PR2" resistance="220" footprint="0603" schX={-12} schY={-9.5} pcbX={42} pcbY={-27} />
    <capacitor name="CF_PR2" capacitance="100nF" footprint="0603" schX={-11} schY={-8} pcbX={42} pcbY={-22} />
    <trace from="RD_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="RD_PR2.pin2" to="net.GND" />
    <trace from="CF_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="CF_PR2.pin2" to="net.GND" />
    <trace from="RS_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="RS_PR2.pin2" to="TVS_PR12.PR2" />

    {/* Probe 3 front-end — GPIO32 (normal GPIO, external pull-DOWN) */}
    <resistor name="RD_PR3" resistance="10k" footprint="0603" schX={-8} schY={-8} pcbX={48} pcbY={-25} />
    <resistor name="RS_PR3" resistance="220" footprint="0603" schX={-8} schY={-9.5} pcbX={48} pcbY={-30} />
    <capacitor name="CF_PR3" capacitance="100nF" footprint="0603" schX={-7} schY={-8} pcbX={48} pcbY={-35} />
    <trace from="RD_PR3.pin1" to="ESP_L.GPIO32" />
    <trace from="RD_PR3.pin2" to="net.GND" />
    <trace from="CF_PR3.pin1" to="ESP_L.GPIO32" />
    <trace from="CF_PR3.pin2" to="net.GND" />
    <trace from="RS_PR3.pin1" to="ESP_L.GPIO32" />
    <trace from="RS_PR3.pin2" to="TVS_PR3C.PR3" />

    {/* ============================================================ */}
    {/* Mounting holes (M3) — clear board corners                    */}
    {/* ============================================================ */}
    <hole name="H1" diameter="3.2mm" pcbX={-95} pcbY={46} />
    <hole name="H2" diameter="3.2mm" pcbX={95} pcbY={46} />
    <hole name="H3" diameter="3.2mm" pcbX={-95} pcbY={-46} />
    <hole name="H4" diameter="3.2mm" pcbX={95} pcbY={-46} />
  </board>
)
