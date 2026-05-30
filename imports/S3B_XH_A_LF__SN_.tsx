import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"]
} as const

export const S3B_XH_A_LF__SN_ = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C157928"
  ]
}}
      manufacturerPartNumber="S3B_XH_A_LF__SN_"
      footprint={<footprint>
        <platedhole  portHints={["pin2"]} pcbX="-0.000127mm" pcbY="0mm" outerDiameter="1.5999968mm" holeDiameter="0.999998mm" shape="circle" />
<platedhole  portHints={["pin3"]} pcbX="-2.499995mm" pcbY="0mm" outerDiameter="1.5999968mm" holeDiameter="0.999998mm" shape="circle" />
<platedhole  portHints={["pin1"]} pcbX="2.499995mm" pcbY="0mm" outerDiameter="1.5999968mm" holeDiameter="0.999998mm" shape="circle" />
<silkscreenpath route={[{"x":-5.0000916000001325,"y":9.200007000000028},{"x":-5.0000916000001325,"y":-2.2999953999999434}]} />
<silkscreenpath route={[{"x":4.999989999999912,"y":9.199880000000007},{"x":4.999964599999998,"y":-2.301265400000034}]} />
<silkscreenpath route={[{"x":-5.0001424000000725,"y":9.199880000000007},{"x":4.999964599999998,"y":9.199880000000007}]} />
<silkscreenpath route={[{"x":-5.0001424000000725,"y":-2.301265400000034},{"x":4.999964599999998,"y":-2.301265400000034}]} />
<silkscreenpath route={[{"x":-3.9301166000000194,"y":-2.286000000000058},{"x":-3.9301166000000194,"y":0},{"x":-2.533116600000085,"y":0}]} />
<silkscreenpath route={[{"x":3.8099745999999186,"y":-2.286000000000058},{"x":3.8099745999999186,"y":0},{"x":2.5399746000000505,"y":0}]} />
<silkscreenpath route={[{"x":3.604717199999982,"y":0},{"x":3.5311334000000443,"y":0}]} />
<silkscreenpath route={[{"x":1.4688565999998673,"y":0},{"x":1.0310114000000112,"y":0}]} />
<silkscreenpath route={[{"x":-1.0312653999999384,"y":0},{"x":-1.468856599999981,"y":0}]} />
<silkscreenpath route={[{"x":-3.5311334000000443,"y":0},{"x":-3.9301166000000194,"y":0}]} />
<silkscreentext text="{NAME}" pcbX="0.008763mm" pcbY="10.3472mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-5.384736999999973,"y":9.597200000000157},{"x":5.402262999999948,"y":9.597200000000157},{"x":5.402262999999948,"y":-2.6884000000000015},{"x":-5.384736999999973,"y":-2.6884000000000015},{"x":-5.384736999999973,"y":9.597200000000157}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C157928.obj?uuid=edae3d0470b24825b9dc1de738dfcda5",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C157928.step?uuid=edae3d0470b24825b9dc1de738dfcda5",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.000012700000070253736, y: -0.013988500000027937, z: 0.09999300000000044 },
      }}
      {...props}
    />
  )
}