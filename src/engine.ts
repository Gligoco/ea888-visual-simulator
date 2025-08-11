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
    // Compute mid if needed later for wrist pin visualization or bearings
    // const mid = new THREE.Vector3().addVectors(worldA, worldB).multiplyScalar(0.5)

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

  // Drive loop hook on the group
  ;(assembly as any).__update = (angle: number) => {
    for (const cyl of cylinders) cyl.update(angle)
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

  return assembly
}