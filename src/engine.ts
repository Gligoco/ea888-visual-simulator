import * as THREE from 'three'

export interface RotationalParams {
  rpm: number
}

export class Crankshaft {
  public root: THREE.Object3D
  public throwRadius: number
  public counterweight: THREE.Mesh
  private angleRad: number

  constructor(throwRadius: number) {
    this.throwRadius = throwRadius
    this.root = new THREE.Object3D()
    this.angleRad = 0

    const material = new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 32), material)
    main.rotation.z = Math.PI / 2
    main.castShadow = true
    main.receiveShadow = true
    this.root.add(main)

    this.counterweight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.2), material)
    this.counterweight.position.set(0, 0, 0)
    this.root.add(this.counterweight)
  }

  setAngleRadians(theta: number): void {
    this.angleRad = theta
    this.root.rotation.y = theta
  }

  getJournalWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    target.set(0, 0, this.throwRadius)
    target.applyEuler(new THREE.Euler(0, this.angleRad, 0))
    target.applyMatrix4(this.root.matrixWorld)
    return target
  }
}

export class ConnectingRod {
  public root: THREE.Object3D
  public smallEnd: THREE.Object3D
  public bigEnd: THREE.Object3D
  public length: number

  private rodMesh: THREE.Mesh

  constructor(length: number) {
    this.length = length
    this.root = new THREE.Object3D()

    const mat = new THREE.MeshPhysicalMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.3 })
    this.rodMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, length, 0.05), mat)
    this.rodMesh.castShadow = true
    this.rodMesh.position.y = length / 2

    this.smallEnd = new THREE.Object3D()
    this.bigEnd = new THREE.Object3D()

    this.root.add(this.bigEnd)
    this.root.add(this.rodMesh)
    this.root.add(this.smallEnd)
  }

  alignBetween(worldA: THREE.Vector3, worldB: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(worldB, worldA)

    const length = dir.length()
    this.rodMesh.scale.y = length / this.length

    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    this.root.position.copy(worldA)
    this.root.quaternion.copy(quat)
    this.smallEnd.position.set(0, length, 0)
  }
}

export class Piston {
  public root: THREE.Object3D
  public crown: THREE.Mesh
  public pinHeight: number

  constructor(pinHeight: number) {
    this.pinHeight = pinHeight
    this.root = new THREE.Object3D()

    const mat = new THREE.MeshPhysicalMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.2 })
    this.crown = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 48), mat)
    this.crown.castShadow = true
    this.root.add(this.crown)
  }

  setHeight(y: number): void {
    this.root.position.y = y
  }
}

export class Camshaft {
  public root: THREE.Object3D
  public angleRad: number

  constructor() {
    this.root = new THREE.Object3D()
    this.angleRad = 0

    const mat = new THREE.MeshPhysicalMaterial({ color: 0x818cf8, metalness: 0.85, roughness: 0.35 })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 24), mat)
    shaft.rotation.z = Math.PI / 2
    shaft.castShadow = true
    this.root.add(shaft)
  }

  setCrankAngle(crankAngleRad: number): void {
    // 2:1 cam:crank ratio
    this.angleRad = crankAngleRad / 2
    this.root.rotation.y = this.angleRad
  }
}

// Simple valve visual
class Valve {
  public root: THREE.Object3D
  private baseY: number

  constructor(baseY: number) {
    this.root = new THREE.Object3D()
    this.baseY = baseY
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xbfc5ce, metalness: 0.85, roughness: 0.3 })
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 16), mat)
    stem.castShadow = true
    stem.position.y = -0.06
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 24), mat)
    head.position.y = -0.12
    head.castShadow = true
    this.root.add(stem)
    this.root.add(head)
    this.root.position.y = baseY
  }

  setLift(amount: number) {
    // Positive lift moves valve downwards into the cylinder
    this.root.position.y = this.baseY - amount
  }
}

// Simple sprocket/belt visuals to echo EA888 timing layout
class Sprocket {
  public root: THREE.Object3D
  public radius: number
  private wheel: THREE.Mesh

  constructor(radius: number, thickness: number, color: number = 0xb0b7c3) {
    this.radius = radius
    this.root = new THREE.Object3D()

    const geom = new THREE.CylinderGeometry(radius, radius, thickness, 48, 1, true)
    const mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.3 })
    this.wheel = new THREE.Mesh(geom, mat)
    this.wheel.rotation.z = Math.PI / 2
    this.wheel.castShadow = true
    this.wheel.receiveShadow = true

    // Accent ring for teeth hint
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.04, thickness * 0.12, 12, 64), mat)
    rim.rotation.y = Math.PI / 2
    rim.castShadow = true
    this.root.add(this.wheel)
    this.root.add(rim)
  }

  setAngle(theta: number) {
    this.root.rotation.y = theta
  }
}

class TimingChainPath extends THREE.Curve<THREE.Vector3> {
  private points: THREE.Vector3[]
  constructor(points: THREE.Vector3[]) {
    super()
    this.points = points
  }
  getPoint(t: number, _optionalTarget: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const p = (this.points.length - 1) * t
    const i = Math.floor(p)
    const f = p - i
    if (i >= this.points.length - 1) return this.points[this.points.length - 1].clone()
    return new THREE.Vector3().lerpVectors(this.points[i], this.points[i + 1], f)
  }
}

function buildChainMesh(pathPoints: THREE.Vector3[]): THREE.Mesh {
  const curve = new TimingChainPath(pathPoints)
  const tube = new THREE.TubeGeometry(curve, 120, 0.015, 8, true)
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a6, metalness: 1.0, roughness: 0.25 })
  const mesh = new THREE.Mesh(tube, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export interface CylinderKinematicsConfig {
  crankThrowRadius: number
  rodLength: number
  deckHeight: number
  boreCenterZ: number
  tdcPhaseRadians: number
}

export class CylinderKinematics {
  public group: THREE.Group
  public crank: Crankshaft
  public rod: ConnectingRod
  public piston: Piston

  private config: CylinderKinematicsConfig
  private temp: { a: THREE.Vector3; b: THREE.Vector3 }

  constructor(config: CylinderKinematicsConfig) {
    this.config = config
    this.group = new THREE.Group()

    this.crank = new Crankshaft(config.crankThrowRadius)
    this.rod = new ConnectingRod(config.rodLength)
    this.piston = new Piston(0.03)

    this.group.add(this.crank.root)
    this.group.add(this.rod.root)
    this.group.add(this.piston.root)

    this.crank.root.position.z = config.boreCenterZ

    this.temp = { a: new THREE.Vector3(), b: new THREE.Vector3() }
  }

  update(crankAngleRad: number): void {
    const theta = crankAngleRad + this.config.tdcPhaseRadians
    this.crank.setAngleRadians(theta)

    // Slider-crank kinematics
    const r = this.config.crankThrowRadius
    const l = this.config.rodLength

    // y relative to crank center
    const y = r * Math.cos(theta) + Math.sqrt(Math.max(l * l - Math.pow(r * Math.sin(theta), 2), 0))
    const deckY = this.config.deckHeight

    // Position piston crown at deckY - y from crank center (upwards)
    this.piston.setHeight(deckY - y)

    // Rod alignment between crank pin and piston pin
    this.crank.getJournalWorldPosition(this.temp.a)

    const pistonPinWorld = new THREE.Vector3(this.crank.root.position.x, deckY - y, this.config.boreCenterZ)
    this.rod.alignBetween(this.temp.a, pistonPinWorld)
  }
}

export function buildInlineFourEA888(): THREE.Group {
  const assembly = new THREE.Group()

  const deckHeight = 0.5
  const crankThrowRadius = 0.043
  const rodLength = 0.145

  const zSpacing = 0.095
  const bores = [ -1.5 * zSpacing, -0.5 * zSpacing, 0.5 * zSpacing, 1.5 * zSpacing ]

  const phase = [0, Math.PI, Math.PI, 0] // 1-3-4-2 firing approximation for visuals

  const cylinders: CylinderKinematics[] = []
  for (let i = 0; i < 4; i++) {
    const cyl = new CylinderKinematics({
      crankThrowRadius,
      rodLength,
      deckHeight,
      boreCenterZ: bores[i],
      tdcPhaseRadians: phase[i],
    })
    assembly.add(cyl.group)
    cylinders.push(cyl)
  }

  // Timing components (visual)
  const timingGroup = new THREE.Group()
  assembly.add(timingGroup)

  // Crank sprocket location (front-left lower as in illustration)
  const crankSprocket = new Sprocket(0.08, 0.04)
  crankSprocket.root.position.set(-0.55, 0.05, bores[0] - 0.18)
  timingGroup.add(crankSprocket.root)

  // Dual cams up at head plane
  const camY = deckHeight + 0.12
  const intakeCam = new Camshaft()
  intakeCam.root.position.set(-0.25, camY, bores[0] - 0.15)
  const exhaustCam = new Camshaft()
  exhaustCam.root.position.set(-0.25, camY, bores[3] + 0.15)
  timingGroup.add(intakeCam.root)
  timingGroup.add(exhaustCam.root)

  // Cam sprockets at the left ends of cams
  const camRadius = 0.12
  const intakeSprocket = new Sprocket(camRadius, 0.05)
  intakeSprocket.root.position.copy(intakeCam.root.position).add(new THREE.Vector3(-0.45, 0, 0))
  const exhaustSprocket = new Sprocket(camRadius, 0.05)
  exhaustSprocket.root.position.copy(exhaustCam.root.position).add(new THREE.Vector3(-0.45, 0, 0))
  timingGroup.add(intakeSprocket.root)
  timingGroup.add(exhaustSprocket.root)

  // Chain path: approximate rectangle with rounded corners following sprockets
  const pA = crankSprocket.root.position.clone()
  const pB = intakeSprocket.root.position.clone()
  const pC = exhaustSprocket.root.position.clone()

  const chainPoints: THREE.Vector3[] = []
  // Up from crank to intake sprocket
  chainPoints.push(pA.clone().add(new THREE.Vector3(0.1, 0, 0)))
  chainPoints.push(new THREE.Vector3(pA.x + 0.1, camY - 0.03, pB.z))
  // Across to exhaust sprocket
  chainPoints.push(new THREE.Vector3(pC.x + 0.02, camY - 0.03, pC.z))
  // Down near crank and close loop
  chainPoints.push(new THREE.Vector3(pA.x + 0.1, 0.03, pA.z))

  const chainMesh = buildChainMesh(chainPoints)
  timingGroup.add(chainMesh)

  // Valve bank visuals (one intake and one exhaust per cylinder)
  const valveGroup = new THREE.Group()
  assembly.add(valveGroup)
  const intakeValves: Valve[] = []
  const exhaustValves: Valve[] = []
  for (let i = 0; i < 4; i++) {
    const z = bores[i]
    const intakeValve = new Valve(deckHeight + 0.08)
    intakeValve.root.position.set(-0.05, 0, z - 0.11)
    const exhaustValve = new Valve(deckHeight + 0.08)
    exhaustValve.root.position.set(-0.05, 0, z + 0.11)
    valveGroup.add(intakeValve.root)
    valveGroup.add(exhaustValve.root)
    intakeValves.push(intakeValve)
    exhaustValves.push(exhaustValve)
  }

  function lobeLift(phi: number, center: number, duration: number, maxLift: number): number {
    // Normalize to [-PI, PI]
    let d = phi - center
    d = Math.atan2(Math.sin(d), Math.cos(d))
    if (Math.abs(d) > duration / 2) return 0
    const t = (Math.cos((d / (duration / 2)) * Math.PI) + 1) / 2
    return maxLift * t
  }

  // Drive loop hook on the group
  ;(assembly as any).__update = (angle: number) => {
    for (const cyl of cylinders) cyl.update(angle)
    // Spin sprockets to sell the motion; cams at half crank speed
    crankSprocket.setAngle(angle)
    const camAngle = angle / 2
    intakeSprocket.setAngle(camAngle)
    exhaustSprocket.setAngle(camAngle)
    intakeCam.setCrankAngle(angle)
    exhaustCam.setCrankAngle(angle)

    // Valve motion: derive each cylinder's cam phase
    const duration = (120 * Math.PI) / 180 // 120° cam duration
    const liftMax = 0.015
    for (let i = 0; i < 4; i++) {
      const phi = camAngle + phase[i] / 2
      // Intake centered around +60° cam
      const li = lobeLift(phi, (60 * Math.PI) / 180, duration, liftMax)
      // Exhaust centered around -60° cam
      const le = lobeLift(phi, (-60 * Math.PI) / 180, duration, liftMax)
      intakeValves[i].setLift(li)
      exhaustValves[i].setLift(le)
    }
  }

  // Visuals: simple head plane
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.08, zSpacing * 4 + 0.2),
    new THREE.MeshPhysicalMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.5 })
  )
  head.position.y = deckHeight
  head.castShadow = true
  head.receiveShadow = true
  assembly.add(head)

  // Exploded view controller
  ;(assembly as any).__setExploded = (t: number) => {
    const k = THREE.MathUtils.clamp(t, 0, 1)
    head.position.y = deckHeight + k * 0.15
    intakeCam.root.position.z = (bores[0] - 0.15) - k * 0.12
    exhaustCam.root.position.z = (bores[3] + 0.15) + k * 0.12
    timingGroup.position.x = -k * 0.15
    valveGroup.position.y = k * 0.05
  }

  // Expose references for labels
  assembly.userData = {
    intakeCam: intakeCam.root,
    exhaustCam: exhaustCam.root,
    crankSprocket: crankSprocket.root,
    chain: chainMesh,
    head,
    cylinders,
  }

  return assembly
}