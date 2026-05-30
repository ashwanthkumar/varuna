import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"]
} as const

export const SS12D10G3 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C7431053"
  ]
}}
      manufacturerPartNumber="SS12D10G3"
      footprint={<footprint>
        <platedhole  portHints={["pin3"]} pcbX="4.799965mm" pcbY="0mm" holeWidth="1.3000228mm" holeHeight="1.8000218mm" outerWidth="1.999996mm" outerHeight="2.499995mm" shape="pill" />
<platedhole  portHints={["pin2"]} pcbX="0.000127mm" pcbY="0mm" holeWidth="1.3000228mm" holeHeight="1.8000218mm" outerWidth="1.999996mm" outerHeight="2.499995mm" shape="pill" />
<platedhole  portHints={["pin1"]} pcbX="-4.799965mm" pcbY="0mm" holeWidth="1.3000228mm" holeHeight="1.8000218mm" outerWidth="1.999996mm" outerHeight="2.499995mm" shape="pill" />
<silkscreenpath route={[{"x":-6.349949199999969,"y":-3.350005999999894},{"x":-6.349949199999969,"y":3.3500060000000076}]} />
<silkscreenpath route={[{"x":6.35002540000005,"y":-3.350005999999894},{"x":-6.349949199999969,"y":-3.350005999999894}]} />
<silkscreenpath route={[{"x":6.35002540000005,"y":3.3500060000000076},{"x":6.35002540000005,"y":-3.350005999999894}]} />
<silkscreenpath route={[{"x":-6.349949199999969,"y":3.3500060000000076},{"x":6.35002540000005,"y":3.3500060000000076}]} />
<silkscreentext text="{NAME}" pcbX="-0.012065mm" pcbY="4.3528mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-6.624764999999911,"y":3.6027999999998883},{"x":6.600635000000011,"y":3.6027999999998883},{"x":6.600635000000011,"y":-3.6281999999999925},{"x":-6.624764999999911,"y":-3.6281999999999925},{"x":-6.624764999999911,"y":3.6027999999998883}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7431053.obj?uuid=8196340313e245578a6a6fe44c98efb6",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7431053.step?uuid=8196340313e245578a6a6fe44c98efb6",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.00496190000001695, y: 3.0752828000000436, z: -4.524711600000001 },
      }}
      {...props}
    />
  )
}