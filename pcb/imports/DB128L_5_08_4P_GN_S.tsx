import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"]
} as const

export const DB128L_5_08_4P_GN_S = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C2827883"
  ]
}}
      manufacturerPartNumber="DB128L_5_08_4P_GN_S"
      footprint={<footprint>
        <platedhole  portHints={["pin4"]} pcbX="-7.62mm" pcbY="0mm" outerDiameter="2.3999952mm" holeDiameter="1.5000224mm" shape="circle" />
<platedhole  portHints={["pin3"]} pcbX="-2.54mm" pcbY="0mm" outerDiameter="2.3999952mm" holeDiameter="1.5000224mm" shape="circle" />
<platedhole  portHints={["pin2"]} pcbX="2.54mm" pcbY="0mm" outerDiameter="2.3999952mm" holeDiameter="1.5000224mm" shape="circle" />
<platedhole  portHints={["pin1"]} pcbX="7.62mm" pcbY="0mm" outerDiameter="2.3999952mm" holeDiameter="1.5000224mm" shape="circle" />
<silkscreenpath route={[{"x":-10.759998799999948,"y":3.184982199999922},{"x":-10.160025399999995,"y":3.468268399999829}]} />
<silkscreenpath route={[{"x":-10.759998799999948,"y":4.184980199999927},{"x":-10.160025399999995,"y":3.9053515999999036}]} />
<silkscreenpath route={[{"x":-10.759998799999948,"y":-3.015995999999973},{"x":-10.160025399999995,"y":-3.2949134000000413}]} />
<silkscreenpath route={[{"x":-10.759998799999948,"y":-4.0159940000000915},{"x":-10.160025399999995,"y":-3.7405564000000595}]} />
<silkscreenpath route={[{"x":-10.759998799999948,"y":-3.015995999999973},{"x":-10.759998799999948,"y":-4.0159940000000915}]} />
<silkscreenpath route={[{"x":-10.759998799999948,"y":4.184980199999927},{"x":-10.759998799999948,"y":3.184982199999922}]} />
<silkscreenpath route={[{"x":-10.160025399999995,"y":-4.999964600000112},{"x":-10.160025399999995,"y":4.999990000000025}]} />
<silkscreenpath route={[{"x":10.159974600000055,"y":-4.999964600000112},{"x":10.159974600000055,"y":4.999990000000025}]} />
<silkscreenpath route={[{"x":-10.160025399999995,"y":-4.999964600000112},{"x":10.159974600000055,"y":-4.999964600000112}]} />
<silkscreenpath route={[{"x":10.159974600000055,"y":4.999990000000025},{"x":-10.159999999999854,"y":4.999990000000025}]} />
<silkscreentext text="{NAME}" pcbX="-0.287274mm" pcbY="6.1308mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-11.014773999999875,"y":5.380799999999908},{"x":10.440226000000052,"y":5.380799999999908},{"x":10.440226000000052,"y":-5.355400000000145},{"x":-11.014773999999875,"y":-5.355400000000145},{"x":-11.014773999999875,"y":5.380799999999908}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2827883.obj?uuid=f75eec745ad74d2aa7afb539ee783975",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2827883.step?uuid=f75eec745ad74d2aa7afb539ee783975",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0.015011200000026648, z: -0.000006999999999646178 },
      }}
      {...props}
    />
  )
}