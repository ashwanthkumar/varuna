import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

export const TS_1101_C_W = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C318938"
  ]
}}
      manufacturerPartNumber="TS_1101_C_W"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="-3.6999926mm" pcbY="0mm" width="1.1999976mm" height="0.999998mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="3.6999926mm" pcbY="0mm" width="1.1999976mm" height="0.999998mm" shape="rect" />
<silkscreenpath route={[{"x":-1.3000228000000789,"y":0.6500114000000394},{"x":1.3000227999999652,"y":0.6500114000000394},{"x":1.3000227999999652,"y":-0.6500113999999257},{"x":-1.3000228000000789,"y":-0.6500113999999257},{"x":-1.3000228000000789,"y":0.6500114000000394}]} />
<silkscreenpath route={[{"x":2.999994000000015,"y":-0.9811511999998856},{"x":2.999994000000015,"y":-1.7999963999999409}]} />
<silkscreenpath route={[{"x":2.999994000000015,"y":1.8000217999999677},{"x":2.999994000000015,"y":0.9811257999999725}]} />
<silkscreenpath route={[{"x":-2.999994000000129,"y":-0.9811511999998856},{"x":-2.999994000000129,"y":-1.7999963999999409}]} />
<silkscreenpath route={[{"x":-2.999994000000129,"y":1.8000217999999677},{"x":-2.999994000000129,"y":0.9811257999999725}]} />
<silkscreenpath route={[{"x":2.999994000000015,"y":-1.7999963999999409},{"x":-2.999994000000129,"y":-1.7999963999999409}]} />
<silkscreenpath route={[{"x":-2.999994000000129,"y":1.8000217999999677},{"x":2.999994000000015,"y":1.8000217999999677}]} />
<silkscreentext text="{NAME}" pcbX="0.0127mm" pcbY="2.8542mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-4.542599999999993,"y":2.1041999999999916},{"x":4.56799999999987,"y":2.1041999999999916},{"x":4.56799999999987,"y":-2.1041999999999916},{"x":-4.542599999999993,"y":-2.1041999999999916},{"x":-4.542599999999993,"y":2.1041999999999916}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C318938.obj?uuid=d40d76ae324c41b0b1b57d4fd0c55e23",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C318938.step?uuid=d40d76ae324c41b0b1b57d4fd0c55e23",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: -0.000012700000070253736, z: -0.593335 },
      }}
      {...props}
    />
  )
}