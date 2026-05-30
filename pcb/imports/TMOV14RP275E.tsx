import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

export const TMOV14RP275E = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C1528070"
  ]
}}
      manufacturerPartNumber="TMOV14RP275E"
      footprint={<footprint>
        <platedhole  portHints={["pin1"]} pcbX="-3.24993mm" pcbY="0.999998mm" outerDiameter="1.499997mm" holeDiameter="0.9000236mm" shape="circle" />
<platedhole  portHints={["pin2"]} pcbX="3.24993mm" pcbY="-0.999998mm" outerDiameter="1.499997mm" holeDiameter="0.9000236mm" shape="circle" />
<silkscreenpath route={[{"x":-6.999986000000035,"y":4.749977800000124},{"x":-6.999986000000035,"y":-4.750003199999924},{"x":6.999985999999922,"y":-4.750003199999924},{"x":6.999985999999922,"y":4.749977800000124},{"x":-6.999986000000035,"y":4.749977800000124}]} />
<silkscreentext text="{NAME}" pcbX="-0.0254mm" pcbY="5.7752mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-7.285799999999881,"y":5.025200000000041},{"x":7.2349999999999,"y":5.025200000000041},{"x":7.2349999999999,"y":-4.9997999999999365},{"x":-7.285799999999881,"y":-4.9997999999999365},{"x":-7.285799999999881,"y":5.025200000000041}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C1528070.obj?uuid=b1d41dee342f45629cf1fd88b7ec6c66",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C1528070.step?uuid=b1d41dee342f45629cf1fd88b7ec6c66",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.000012700000070253736, y: 0, z: -0.000006999999999646178 },
      }}
      {...props}
    />
  )
}