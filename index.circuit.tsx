/**
 * Varuna — ESP32 Water-Level Pump Controller
 * ------------------------------------------------------------------
 * Controls a 2HP single-phase motor via an L&T MK1 DOL starter by
 * emulating its remote START / STOP pushbuttons with a 2-channel relay.
 *
 *  AC Mains (230V) ──► MOV (RV1) ──► HLK-5M05 (AC→5V DC)
 *        5V ──► [PWR SW] ──► ESP32 DevKit (VIN) + ULN2003 + Relay coils
 *      3V3 (from DevKit LDO) ──► float-switch pull-ups
 *
 *  ESP32 GPIO23 ─► ULN2003 IN1 ─► RLY1 (START)  COM/NO/NC ─► MK1 remote START
 *  ESP32 GPIO22 ─► ULN2003 IN2 ─► RLY2 (STOP)   COM/NO/NC ─► MK1 remote STOP
 *  8x float switches ─► RC + pull-up front-end ─► input-capable GPIOs
 *  GPIO4 ─► status LED
 *
 * Real JLCPCB footprints are now used for every non-passive (imported into
 * ./imports via `tsci import <C-part>`):
 *   HLK-5M05 (C209907), ULN2003ADR (C7512), SRD-05VDC-SL-C x2 (C35449),
 *   WJ128V-5.0-3P AC/output terminals (C8270), WJ500V-5.08-2P float terminals (C8465).
 *
 * FLOORPLAN (board 200 x 120 mm, origin = center, x∈[-100,100] y∈[-60,60])
 *  - Left  : HIGH-VOLTAGE zone — AC terminal, MOV, HLK-5M05, power switch
 *  - Center: ESP32 DevKit on two 19-pin female headers (rotated)
 *  - Right : ULN2003 driver, 2x relay, START/STOP 3-pole output terminals, LED
 *  - Bottom: 8x 2-pole float-switch terminals with RC/pull-up front-ends
 *
 * ⚠ SAFETY / FAB NOTES
 *  - Keep >=3mm creepage/clearance on the AC side (J_AC, RV1, U_PSU AC pins)
 *    and on the relay-contact side (RLY/J_START/J_STOP). Route those by hand.
 *  - The relay contacts only switch the MK1's low-current remote pushbutton
 *    loop; the 2HP motor current is carried by the MK1 contactor, not this board.
 *  - RELAY CONTACT MAPPING (pin2/pin3 = coil; pin5 = COM; pin1/pin4 = NO/NC) is
 *    inferred from the C35449 footprint. CONFIRM NO vs NC with a multimeter /
 *    datasheet before field-wiring to the MK1.
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

// Semantic pin-label overrides (spread last in each import, so these win).
const RELAY_PINS = { pin1: "NC", pin2: "COILA", pin3: "COILB", pin4: "NO", pin5: "COM" } as const
const ULN_PINS = {
  pin1: "IN1", pin2: "IN2", pin3: "IN3", pin4: "IN4", pin5: "IN5", pin6: "IN6",
  pin7: "IN7", pin8: "GND", pin9: "COM", pin10: "OUT7", pin11: "OUT6", pin12: "OUT5",
  pin13: "OUT4", pin14: "OUT3", pin15: "OUT2", pin16: "OUT1",
} as const
const HLK_PINS = { pin1: "ACN", pin2: "ACL", pin3: "GND", pin4: "V5" } as const
const AC_PINS = { pin1: "L", pin2: "N", pin3: "E" } as const
const OUT_PINS = { pin1: "COM", pin2: "NO", pin3: "NC" } as const
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
    {/* J_AC rotated 180 so pad order (L->R) is E, N, L — puts L nearest the
       fuse/HLK and E at the far-left edge by the earth lug hole H1. */}
    <Terminal3P
      name="J_AC"
      pinLabels={AC_PINS}
      schX={-13}
      schY={6}
      pcbRotation={180}
      pcbX={-80}
      pcbY={44}
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
    {/* Onboard power ON/OFF — SS12D10G3 SPDT slide switch breaks the 5V rail */}
    <SS12D10G3
      name="SW1"
      pinLabels={PWR_SW_PINS}
      schX={-7}
      schY={6}
      pcbX={-90}
      pcbY={-22}
    />
    <capacitor name="C1" capacitance="100uF" footprint="1206" schX={-13} schY={2.5} pcbX={-48} pcbY={6} />
    <capacitor name="C2" capacitance="100nF" footprint="0603" schX={-11} schY={2.5} pcbX={-48} pcbY={1} />

    {/* AC-side connectivity — HAND-ROUTED for 230V creepage.
       L lane: x=-85, N lane: x=-93. Lane centre spacing = 8mm => edge gap
       = 8 - 0.8 = 7.2mm (well above the 3mm minimum for 230Vac).
       All mains copper stays on the HLK primary side (left of the module). */}
    {/* L: J_AC.L (pin at -75,44) -> drop to y=35 above RV1 courtyard -> left to RV1.B
       L lane centre-to-N lane centre = 18mm => edge gap = 17.2mm (well above 3mm min) */}
    <trace from="J_AC.L" to="RV1.B" thickness="0.8mm"
      path={[{ x: -75, y: 44 }, { x: -75, y: 35 }, { x: -86.23, y: 35 }, { x: -86.23, y: 28 }]} />
    <trace from="RV1.B" to="U_PSU.ACL" thickness="0.8mm"
      path={[{ x: -86.23, y: 28 }, { x: -85, y: 28 }, { x: -85, y: 5 }, { x: -88.8, y: 5 }]} />
    {/* N: J_AC.N (pin at -80,44) -> left to x=-93 -> down to RV1.A */}
    <trace from="J_AC.N" to="RV1.A" thickness="0.8mm"
      path={[{ x: -80, y: 44 }, { x: -93, y: 44 }, { x: -93, y: 28 }, { x: -88.77, y: 28 }]} />
    <trace from="RV1.A" to="U_PSU.ACN" thickness="0.8mm"
      path={[{ x: -88.77, y: 28 }, { x: -93, y: 28 }, { x: -93, y: 11 }, { x: -88.8, y: 11 }]} />
    {/* E: J_AC.E (pin at -85,44) -> short stub, isolated from L/N */}
    <trace from="J_AC.E" to="net.EARTH" thickness="0.8mm"
      path={[{ x: -85, y: 44 }, { x: -85, y: 40 }]} />
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
    {/* DRIVER + 2-CH RELAY:  emulate MK1 remote START / STOP        */}
    {/* ============================================================ */}
    {/* ULN2003A darlington array (built-in flyback diodes on COM/pin9). */}
    <ULN2003ADR
      name="U_DRV"
      pinLabels={ULN_PINS}
      schX={8}
      schY={2}
      pcbX={40}
      pcbY={22}
    />
    <trace from="ESP_R.GPIO23" to="U_DRV.IN1" />
    <trace from="ESP_R.GPIO22" to="U_DRV.IN2" />
    <trace from="U_DRV.GND" to="net.GND" />
    <trace from="U_DRV.COM" to="net.V5" />

    {/* RLY1 = START, RLY2 = STOP.  SRD-05VDC-SL-C (JLC C35449)         */}
    {/* No <group> wrapper — keep absolute pcbX/pcbY (see header note). */}
    {[
      { name: "RLY1", drv: "OUT1", term: "J_START", py: 36, sy: 3 },
      { name: "RLY2", drv: "OUT2", term: "J_STOP", py: 6, sy: 0.5 },
    ].map((r) => (
      <>
        <SRD_05VDC_SL_C
          name={r.name}
          pinLabels={RELAY_PINS}
          schX={11}
          schY={r.sy}
          pcbX={44}
          pcbY={r.py}
        />
        {/* coil: COILA -> 5V, COILB <- ULN open-collector output */}
        <trace from={`${r.name}.COILA`} to="net.V5" />
        <trace from={`${r.name}.COILB`} to={`U_DRV.${r.drv}`} />
        {/* dry contacts: 3-pole terminal rotated to face the right board edge */}
        <Terminal3P
          name={r.term}
          pinLabels={OUT_PINS}
          schX={14}
          schY={r.sy}
          pcbRotation={90}
          pcbX={64}
          pcbY={r.py}
        />
        <trace from={`${r.term}.COM`} to={`${r.name}.COM`} />
        <trace from={`${r.term}.NO`} to={`${r.name}.NO`} />
        <trace from={`${r.term}.NC`} to={`${r.name}.NC`} />
      </>
    ))}

    {/* ============================================================ */}
    {/* STATUS LED (GPIO4)                                           */}
    {/* ============================================================ */}
    <resistor name="R_LED" resistance="330" footprint="0603" schX={8} schY={-3} pcbX={20} pcbY={32} />
    <led name="LED1" color="green" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C965799"] }} schX={9.5} schY={-3} pcbX={26} pcbY={32} />
    <trace from="ESP_R.GPIO4" to="R_LED.pin1" />
    <trace from="R_LED.pin2" to="LED1.pin1" />
    <trace from="LED1.pin2" to="net.GND" />

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
      schX={-22} schY={-5} pcbX={-70} pcbY={-42} />
    <Terminal2P name="J_FL2" pinLabels={{ pin1: "SW", pin2: "GND" }}
      schX={-18} schY={-5} pcbX={-56} pcbY={-42} />

    {/* TVS_FL: PRTR5V0U2X protects both float lines */}
    <PRTR5V0U2X name="TVS_FL" pinLabels={TVS_FL_PINS}
      schX={-20} schY={-7} pcbX={-63} pcbY={-32} />
    <trace from="TVS_FL.GND" to="net.GND" />
    <trace from="TVS_FL.VCC" to="net.V3V3" />
    <trace from="TVS_FL.FL1" to="J_FL1.SW" />
    <trace from="TVS_FL.FL2" to="J_FL2.SW" />

    {/* Float 1 front-end — GPIO36 (input-only, external pull-up) */}
    <resistor name="RU_FL1" resistance="10k" footprint="0603" schX={-22} schY={-8} pcbX={-70} pcbY={-22} />
    <resistor name="RS_FL1" resistance="220" footprint="0603" schX={-22} schY={-9.5} pcbX={-70} pcbY={-27} />
    <capacitor name="CF_FL1" capacitance="100nF" footprint="0603" schX={-21} schY={-8} pcbX={-65} pcbY={-22} />
    <trace from="RU_FL1.pin1" to="net.V3V3" />
    <trace from="RU_FL1.pin2" to="ESP_L.GPIO36" />
    <trace from="CF_FL1.pin1" to="ESP_L.GPIO36" />
    <trace from="CF_FL1.pin2" to="net.GND" />
    <trace from="RS_FL1.pin1" to="ESP_L.GPIO36" />
    <trace from="RS_FL1.pin2" to="TVS_FL.FL1" />
    <trace from="J_FL1.GND" to="net.GND" />

    {/* Float 2 front-end — GPIO39 (input-only, external pull-up) */}
    <resistor name="RU_FL2" resistance="10k" footprint="0603" schX={-18} schY={-8} pcbX={-56} pcbY={-22} />
    <resistor name="RS_FL2" resistance="220" footprint="0603" schX={-18} schY={-9.5} pcbX={-56} pcbY={-27} />
    <capacitor name="CF_FL2" capacitance="100nF" footprint="0603" schX={-17} schY={-8} pcbX={-51} pcbY={-22} />
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
      schX={-14} schY={-5} pcbX={-35} pcbY={-42} />

    {/* TVS_PR12: protects probe lines 1 + 2 */}
    <PRTR5V0U2X name="TVS_PR12" pinLabels={TVS_PR12_PINS}
      schX={-14} schY={-7} pcbX={-44} pcbY={-32} />
    <trace from="TVS_PR12.GND" to="net.GND" />
    <trace from="TVS_PR12.VCC" to="net.V3V3" />
    <trace from="TVS_PR12.PR1" to="J_PR.PR1" />
    <trace from="TVS_PR12.PR2" to="J_PR.PR2" />

    {/* TVS_PR3C: protects probe line 3 + COM excitation */}
    <PRTR5V0U2X name="TVS_PR3C" pinLabels={TVS_PR3C_PINS}
      schX={-10} schY={-7} pcbX={-28} pcbY={-32} />
    <trace from="TVS_PR3C.GND" to="net.GND" />
    <trace from="TVS_PR3C.VCC" to="net.V3V3" />
    <trace from="TVS_PR3C.PR3" to="J_PR.PR3" />
    <trace from="TVS_PR3C.COM" to="J_PR.COM" />

    {/* Probe excitation: GPIO33 → 1kΩ → COM electrode */}
    <resistor name="R_EXC" resistance="1k" footprint="0603"
      schX={-10} schY={-9} pcbX={-32} pcbY={-27} />
    <trace from="ESP_L.GPIO33" to="R_EXC.pin1" />
    <trace from="R_EXC.pin2" to="TVS_PR3C.COM" />

    {/* Probe 1 front-end — GPIO34 (input-only, external pull-DOWN) */}
    <resistor name="RD_PR1" resistance="10k" footprint="0603" schX={-16} schY={-8} pcbX={-42} pcbY={-22} />
    <resistor name="RS_PR1" resistance="220" footprint="0603" schX={-16} schY={-9.5} pcbX={-42} pcbY={-27} />
    <capacitor name="CF_PR1" capacitance="100nF" footprint="0603" schX={-15} schY={-8} pcbX={-37} pcbY={-22} />
    <trace from="RD_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="RD_PR1.pin2" to="net.GND" />
    <trace from="CF_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="CF_PR1.pin2" to="net.GND" />
    <trace from="RS_PR1.pin1" to="ESP_L.GPIO34" />
    <trace from="RS_PR1.pin2" to="TVS_PR12.PR1" />

    {/* Probe 2 front-end — GPIO35 (input-only, external pull-DOWN) */}
    <resistor name="RD_PR2" resistance="10k" footprint="0603" schX={-12} schY={-8} pcbX={-28} pcbY={-22} />
    <resistor name="RS_PR2" resistance="220" footprint="0603" schX={-12} schY={-9.5} pcbX={-28} pcbY={-27} />
    <capacitor name="CF_PR2" capacitance="100nF" footprint="0603" schX={-11} schY={-8} pcbX={-23} pcbY={-27} />
    <trace from="RD_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="RD_PR2.pin2" to="net.GND" />
    <trace from="CF_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="CF_PR2.pin2" to="net.GND" />
    <trace from="RS_PR2.pin1" to="ESP_L.GPIO35" />
    <trace from="RS_PR2.pin2" to="TVS_PR12.PR2" />

    {/* Probe 3 front-end — GPIO32 (normal GPIO, external pull-DOWN) */}
    {/* Probe 3 passives shifted left to clear ESP_L courtyard (right edge x=-11.2) */}
    <resistor name="RD_PR3" resistance="10k" footprint="0603" schX={-8} schY={-8} pcbX={-20} pcbY={-22} />
    <resistor name="RS_PR3" resistance="220" footprint="0603" schX={-8} schY={-9.5} pcbX={-20} pcbY={-27} />
    <capacitor name="CF_PR3" capacitance="100nF" footprint="0603" schX={-7} schY={-8} pcbX={-33} pcbY={-22} />
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
    <hole name="H2" diameter="3.2mm" pcbX={70} pcbY={46} />
    <hole name="H3" diameter="3.2mm" pcbX={-95} pcbY={-46} />
    <hole name="H4" diameter="3.2mm" pcbX={70} pcbY={-46} />
  </board>
)
