import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["AC2"],
  pin2: ["AC1"],
  pin3: ["-VO"],
  pin4: ["+VO"]
} as const

export const HLK_5M05 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C209907"
  ]
}}
      manufacturerPartNumber="HLK_5M05"
      footprint={<footprint>
        <platedhole  portHints={["pin4"]} pcbX="16.799941mm" pcbY="-8.999982mm" outerDiameter="1.999996mm" holeDiameter="1.1999976mm" shape="circle" />
<platedhole  portHints={["pin3"]} pcbX="16.799941mm" pcbY="8.999982mm" outerDiameter="1.999996mm" holeDiameter="1.1999976mm" shape="circle" />
<platedhole  portHints={["pin2"]} pcbX="-16.799941mm" pcbY="-2.999994mm" outerDiameter="1.999996mm" holeDiameter="1.1999976mm" shape="circle" />
<platedhole  portHints={["pin1"]} pcbX="-16.799941mm" pcbY="2.999994mm" outerDiameter="1.999996mm" holeDiameter="1.1999976mm" shape="circle" />
<silkscreenpath route={[{"x":-19.049923799999988,"y":-11.556999999999903},{"x":19.050025400000095,"y":-11.556999999999903}]} />
<silkscreenpath route={[{"x":19.050025400000095,"y":11.500002400000085},{"x":-19.049923799999988,"y":11.500002400000085},{"x":-19.049923799999988,"y":-11.556999999999903}]} />
<silkscreenpath route={[{"x":19.050025400000095,"y":11.500002400000085},{"x":19.050025400000095,"y":-11.500027799999998}]} />
<silkscreentext text="{NAME}" pcbX="0.010541mm" pcbY="12.624818mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-19.416458999999918,"y":11.874818000000005},{"x":19.43754100000001,"y":11.874818000000005},{"x":19.43754100000001,"y":-11.942381999999952},{"x":-19.416458999999918,"y":-11.942381999999952},{"x":-19.416458999999918,"y":11.874818000000005}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C209907.obj?uuid=a115d9b146674a5f8100f549d81b0497",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C209907.step?uuid=a115d9b146674a5f8100f549d81b0497",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012700000070253736, y: 0.000012699999956566899, z: -11.25001 },
      }}
      {...props}
    />
  )
}