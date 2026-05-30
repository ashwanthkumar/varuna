import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

export const BK250_250 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C268764"
  ]
}}
      manufacturerPartNumber="BK250_250"
      footprint={<footprint>
        <platedhole  portHints={["pin1"]} pcbX="-2.549906mm" pcbY="0mm" outerDiameter="1.7999964mm" holeDiameter="0.999998mm" shape="circle" />
<platedhole  portHints={["pin2"]} pcbX="2.549906mm" pcbY="0mm" outerDiameter="1.7999964mm" holeDiameter="0.999998mm" shape="circle" />
<silkscreenpath route={[{"x":-4.699990600000092,"y":2.300020800000084},{"x":4.699990599999978,"y":2.299995400000057}]} />
<silkscreenpath route={[{"x":-4.699990600000092,"y":-2.3000207999999702},{"x":4.699990599999978,"y":-2.2999953999999434}]} />
<silkscreenpath route={[{"x":-4.699990600000092,"y":2.300020800000084},{"x":-4.699990600000092,"y":-2.3000207999999702}]} />
<silkscreenpath route={[{"x":4.699990599999978,"y":2.299995400000057},{"x":4.699990599999978,"y":-2.2999953999999434}]} />
<silkscreenpath route={[{"x":0,"y":-0.1269999999999527},{"x":0.050307815105497866,"y":-0.3474129394717238},{"x":0.19126718065570003,"y":-0.5241703930937547},{"x":0.39495936555022126,"y":-0.6222633793883006},{"x":0.6210406344497414,"y":-0.6222633793883006},{"x":0.8247328193442627,"y":-0.5241703930937547},{"x":0.9656921848944648,"y":-0.3474129394717238},{"x":1.0159999999999627,"y":-0.1269999999999527}]} />
<silkscreenpath route={[{"x":0,"y":0},{"x":-0.05030781510561155,"y":0.2204129394717711},{"x":-0.19126718065581372,"y":0.397170393093802},{"x":-0.39495936555022126,"y":0.49526337938846154},{"x":-0.6210406344498551,"y":0.49526337938846154},{"x":-0.8247328193442627,"y":0.397170393093802},{"x":-0.9656921848945785,"y":0.2204129394717711},{"x":-1.0160000000000764,"y":0}]} />
<silkscreenpath route={[{"x":1.0159999999999627,"y":-0.1269999999999527},{"x":1.2699999999998681,"y":-0.1269999999999527}]} />
<silkscreenpath route={[{"x":-1.0160000000000764,"y":0},{"x":-1.2699999999999818,"y":0}]} />
<silkscreentext text="{NAME}" pcbX="0mm" pcbY="3.3114mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-4.949000000000069,"y":2.5614000000000487},{"x":4.948999999999842,"y":2.5614000000000487},{"x":4.948999999999842,"y":-2.5614000000000487},{"x":-4.949000000000069,"y":-2.5614000000000487},{"x":-4.949000000000069,"y":2.5614000000000487}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C268764.obj?uuid=001e38801aca4d4eb6cea6ef633a5a92",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C268764.step?uuid=001e38801aca4d4eb6cea6ef633a5a92",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0, z: -7.800009 },
      }}
      {...props}
    />
  )
}