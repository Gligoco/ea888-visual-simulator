import './style.css'
import * as THREE from 'three'
import Stats from 'stats.js'
import { GUI } from 'dat.gui'
import { buildInlineFourEA888 } from './engine'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const appRoot = document.querySelector<HTMLDivElement>('#app')!
appRoot.innerHTML = ''

const canvas = document.createElement('canvas')
canvas.id = 'ea888-canvas'
canvas.style.width = '100%'
canvas.style.height = '100vh'
canvas.style.display = 'block'
appRoot.appendChild(canvas)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setClearColor(0x0b0f1a, 1)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0f1a)

// Physically-based environment for metal reflections
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000)
scene.add(camera)

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202020, 0.7)
scene.add(hemiLight)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4)
dirLight.position.set(5, 10, 7)
dirLight.castShadow = true
scene.add(dirLight)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.0, roughness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Minimal placeholder model group for EA888 assembly; real parts will be added in modules
const ea888Group = new THREE.Group()
ea888Group.position.y = 1.2
scene.add(ea888Group)

// Frame placeholder: block body
const blockMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4, clearcoat: 0.4 })
const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.0), blockMaterial)
blockMesh.castShadow = true
blockMesh.receiveShadow = true
ea888Group.add(blockMesh)

// Camera rig
const cameraRig = new THREE.Object3D()
scene.add(cameraRig)
const focus = new THREE.Vector3(0, 0.8, 0)

// Optional orbit controls (lazy import to keep bundle light if tree-shaken)
let controls: any
import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.copy(focus)
})

// Stats
const stats = new Stats()
stats.showPanel(0)
stats.dom.style.position = 'fixed'
stats.dom.style.left = '0px'
stats.dom.style.top = '0px'
document.body.appendChild(stats.dom)

// GUI
const gui = new GUI()
const renderConfig = {
  exposure: 1.0,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
}

gui.add(renderConfig, 'exposure', 0.2, 2.0, 0.01).name('Exposure').onChange((v: number) => {
  renderer.toneMappingExposure = v
})

gui.add(renderConfig, 'pixelRatio', 0.5, 2.0, 0.1).name('Pixel Ratio').onChange((v: number) => {
  renderer.setPixelRatio(v)
  onResize()
})

function onResize() {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', onResize)

// Layout initial size
onResize()

// Place camera
function frameSubject(distance: number = 4.5) {
  const offset = new THREE.Vector3(0, 1.2, distance)
  camera.position.copy(offset)
  camera.lookAt(focus)
}
frameSubject()

// Animation loop
let lastTime = performance.now()

const ea888Assembly = buildInlineFourEA888()
ea888Group.add(ea888Assembly)

const sim = { rpm: 1500 }

gui.add(sim, 'rpm', 300, 7000, 50).name('RPM')

let crankAngle = 0

function animate(now: number) {
  stats.begin()

  const dt = Math.min(0.05, (now - lastTime) / 1000)
  lastTime = now

  // dtheta = 2*pi * rpm/60 * dt
  const angularVelocity = (Math.PI * 2 * sim.rpm) / 60
  crankAngle = (crankAngle + angularVelocity * dt) % (Math.PI * 2)

  // Update engine sub-assemblies
  const updater = (ea888Assembly as any).__update
  if (typeof updater === 'function') {
    updater(crankAngle)
  }

  if (controls) controls.update()
  renderer.render(scene, camera)

  stats.end()
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
