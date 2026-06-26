import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const COLOR = {
  grassLow: 0x46523a,
  grassHigh: 0x5c6646,
  rock: 0x77694e,
  rockDark: 0x564a37,
  dam: 0x9aa0a8,
  spoil: 0x8a7a5c,
  truck: 0xffc02a,
  water: 0x1fa8ff
}

// 布局: 山体在后方(z 负), 上水库库盆开在山顶平台, 大坝在平台前缘(正对镜头);
// 下水库挖在前方谷地(z 正). 相机从前方高位俯视, 主体不被遮挡.
const MOUNT_Z = -70
const PLATEAU = 110 // 山顶平台高程
const BASIN = { x: 0, z: -70, radius: 42, depth: 24 } // 上水库库盆
const LOWER = { x: 0, z: 86, radius: 34, floor: 3 } // 下水库
const DAM_FRONT_Z = BASIN.z + BASIN.radius - 2 // 坝在库盆前缘

export function heightAt(x: number, z: number): number {
  const dz = z - MOUNT_Z
  const r = Math.sqrt(x * x + dz * dz)
  const over = Math.max(0, r - 46)
  let h = PLATEAU / (1 + (over / 42) * (over / 42))
  h += 5 + 2 * Math.sin(x * 0.045) * Math.cos(z * 0.05)
  return h
}

interface Truck { mesh: THREE.Group; t: number; speed: number }


const ROAD_PTS = [
  new THREE.Vector3(BASIN.x + 6, PLATEAU - 6, DAM_FRONT_Z + 4),
  new THREE.Vector3(-34, 78, -34),
  new THREE.Vector3(-48, 52, 4),
  new THREE.Vector3(-30, 28, 44),
  new THREE.Vector3(0, 12, 70),
  new THREE.Vector3(LOWER.x - 4, LOWER.floor + 4, LOWER.z - 30)
]

export class ConstructionScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private clock = new THREE.Clock()
  private rafId = 0
  private container: HTMLElement
  private trucks: Truck[] = []
  private roadCurve!: THREE.CatmullRomCurve3
  private dam: THREE.Mesh | null = null
  private damTarget: THREE.Mesh | null = null
  private basinWater: THREE.Mesh | null = null
  private lowerWater: THREE.Mesh | null = null
  private spoil: THREE.Mesh | null = null
  private benches: THREE.Group | null = null
  private damFullH = BASIN.depth + 10
  private progress = 0.5
  private damProgress = 0.5

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0c1622)
    this.scene.fog = new THREE.Fog(0x0c1622, 260, 620)

    const w = container.clientWidth
    const h = container.clientHeight
    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 3000)
    this.camera.position.set(30, 150, 220)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(0, 60, 0)
    this.controls.maxPolarAngle = Math.PI * 0.49
    this.controls.minDistance = 90
    this.controls.maxDistance = 560

    this.buildLights()
    this.buildTerrain()
    this.buildBasin()
    this.buildDam()
    this.buildLowerReservoir()
    this.buildSpoilHeap()
    this.buildRoadAndTrucks()
    this.buildLabels()
    this.animate()
  }

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0x7888a8, 0.9))
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.3)
    sun.position.set(90, 210, 160)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 700
    const s = 260
    sun.shadow.camera.left = -s
    sun.shadow.camera.right = s
    sun.shadow.camera.top = s
    sun.shadow.camera.bottom = -s
    this.scene.add(sun)
  }


  private smooth(t: number) { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x) }

  // 山体地形: 起伏网格 + 高度着色; 库盆(山顶)与下水库(谷地)挖成凹地
  private buildTerrain() {
    const SIZE = 420
    const SEG = 160
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors: number[] = []
    const cLow = new THREE.Color(COLOR.grassLow)
    const cHigh = new THREE.Color(COLOR.grassHigh)
    const cRock = new THREE.Color(COLOR.rock)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      let y = heightAt(x, z)
      // 上水库库盆(山顶挖凹)
      const dB = Math.sqrt((x - BASIN.x) ** 2 + (z - BASIN.z) ** 2)
      if (dB < BASIN.radius) {
        const floor = PLATEAU - BASIN.depth
        y = floor + (y - floor) * this.smooth(dB / BASIN.radius)
      }
      // 下水库(谷地挖凹)
      const dL = Math.sqrt((x - LOWER.x) ** 2 + (z - LOWER.z) ** 2)
      if (dL < LOWER.radius) {
        const natural = y
        y = Math.min(natural, LOWER.floor + (natural - LOWER.floor) * this.smooth(dL / LOWER.radius))
      }
      pos.setY(i, y)
      const c = new THREE.Color()
      if (y > 80) c.copy(cRock).lerp(cHigh, Math.max(0, 1 - (y - 80) / 45))
      else c.copy(cLow).lerp(cHigh, Math.min(1, y / 80))
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
    )
    terrain.receiveShadow = true
    terrain.castShadow = true
    this.scene.add(terrain)
  }

  // 库盆开挖台阶马道 + 库盆水体(随蓄水进度上升)
  private buildBasin() {
    this.benches = new THREE.Group()
    const tiers = 5
    for (let i = 0; i < tiers; i++) {
      const rOuter = BASIN.radius - 3 - i * 6.5
      const y = PLATEAU - 2 - (i / tiers) * BASIN.depth
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(2, rOuter), 1.0, 6, 44),
        new THREE.MeshStandardMaterial({ color: i % 2 ? COLOR.rockDark : COLOR.rock, roughness: 1 })
      )
      ring.rotation.x = Math.PI / 2
      ring.position.set(BASIN.x, y, BASIN.z)
      this.benches.add(ring)
    }
    this.scene.add(this.benches)

    this.basinWater = new THREE.Mesh(
      new THREE.CircleGeometry(BASIN.radius - 5, 48),
      new THREE.MeshStandardMaterial({ color: COLOR.water, transparent: true, opacity: 0.8, roughness: 0.15, metalness: 0.1 })
    )
    this.basinWater.rotation.x = -Math.PI / 2
    this.basinWater.position.set(BASIN.x, PLATEAU - BASIN.depth + 2, BASIN.z)
    this.scene.add(this.basinWater)
  }

  // 面板堆石坝: 平台前缘梯形坝, 自坝基向上随进度增高
  private buildDam() {
    const len = BASIN.radius * 2.1
    const base = PLATEAU - this.damFullH
    const makeDam = (mat: THREE.Material) => {
      const shape = new THREE.Shape()
      shape.moveTo(-len / 2, 0)
      shape.lineTo(len / 2, 0)
      shape.lineTo(len / 2 - 6, this.damFullH)
      shape.lineTo(-len / 2 + 6, this.damFullH)
      shape.closePath()
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 16, bevelEnabled: false })
      geo.translate(0, 0, -8)
      const m = new THREE.Mesh(geo, mat)
      m.position.set(BASIN.x, base, DAM_FRONT_Z)
      return m
    }
    this.dam = makeDam(new THREE.MeshStandardMaterial({ color: COLOR.dam, roughness: 0.8 }))
    this.dam.castShadow = true
    this.scene.add(this.dam)
    // 设计坝顶轮廓线框
    this.damTarget = makeDam(new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.15 }))
    this.scene.add(this.damTarget)
  }


  private buildLowerReservoir() {
    this.lowerWater = new THREE.Mesh(
      new THREE.CircleGeometry(LOWER.radius - 4, 44),
      new THREE.MeshStandardMaterial({ color: 0x1184e0, transparent: true, opacity: 0.78, roughness: 0.15 })
    )
    this.lowerWater.rotation.x = -Math.PI / 2
    this.lowerWater.position.set(LOWER.x, LOWER.floor + 6, LOWER.z)
    this.scene.add(this.lowerWater)
  }

  private buildSpoilHeap() {
    const baseY = heightAt(-92, 30)
    this.spoil = new THREE.Mesh(
      new THREE.ConeGeometry(24, 26, 22),
      new THREE.MeshStandardMaterial({ color: COLOR.spoil, roughness: 1 })
    )
    this.spoil.position.set(-92, baseY + 13, 30)
    this.spoil.castShadow = true
    this.scene.add(this.spoil)
  }

  private buildRoadAndTrucks() {
    this.roadCurve = new THREE.CatmullRomCurve3(ROAD_PTS)
    const road = new THREE.Mesh(
      new THREE.TubeGeometry(this.roadCurve, 110, 4, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x35311f, roughness: 1 })
    )
    road.receiveShadow = true
    this.scene.add(road)
    for (let i = 0; i < 10; i++) {
      const t = this.makeTruck()
      this.scene.add(t)
      this.trucks.push({ mesh: t, t: i / 10, speed: 0.022 + Math.random() * 0.012 })
    }
  }

  private makeTruck(): THREE.Group {
    const g = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(7, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: COLOR.truck, roughness: 0.5, metalness: 0.3 })
    )
    body.position.y = 2.8
    body.castShadow = true
    g.add(body)
    const load = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.4, 3.6),
      new THREE.MeshStandardMaterial({ color: COLOR.rockDark, roughness: 1 })
    )
    load.position.set(-0.9, 4.8, 0)
    g.add(load)
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2.2, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xd8aa1c })
    )
    cab.position.set(2.9, 3.6, 0)
    g.add(cab)
    g.scale.setScalar(1.6)
    return g
  }

  private labelSprite(text: string, x: number, y: number, z: number, color = '#00d4ff') {
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 56
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(8,22,42,0.88)'
    ctx.fillRect(0, 0, 320, 56)
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 316, 52)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 160, 30)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })
    )
    sprite.scale.set(48, 8.4, 1)
    sprite.position.set(x, y, z)
    this.scene.add(sprite)
  }

  private buildLabels() {
    this.labelSprite('上水库 · 库盆开挖 + 面板堆石坝', BASIN.x, PLATEAU + 24, BASIN.z, '#00ff88')
    this.labelSprite('下水库', LOWER.x, LOWER.floor + 26, LOWER.z, '#19a0ff')
    this.labelSprite('1#弃渣场', -92, heightAt(-92, 30) + 34, 30, '#a78bfa')
  }

  /** 时间驱动: 坝高、蓄水位、开挖揭示、弃渣堆积随进度 */
  setTime(_t: number, damProgress: number, upperProgress: number) {
    this.damProgress = Math.max(0.02, Math.min(1, damProgress))
    this.progress = Math.max(0, Math.min(1, upperProgress))
    // 坝体自坝基向上增高
    if (this.dam) this.dam.scale.y = this.damProgress
    // 库盆蓄水位(坝建得越高蓄得越满)
    if (this.basinWater) {
      const floor = PLATEAU - BASIN.depth
      this.basinWater.position.y = floor + 2 + this.damProgress * (BASIN.depth - 4)
      ;(this.basinWater.material as THREE.MeshStandardMaterial).opacity = 0.25 + this.damProgress * 0.6
      this.basinWater.visible = this.damProgress > 0.08
    }
    // 开挖台阶随开挖进度逐级显现
    if (this.benches) {
      const shown = Math.ceil(this.progress * this.benches.children.length)
      this.benches.children.forEach((m, i) => { m.visible = i < shown })
    }
    // 下水库蓄水
    if (this.lowerWater) this.lowerWater.visible = this.progress > 0.2
    // 弃渣堆积
    if (this.spoil) {
      const s = 0.25 + this.progress * 0.9
      this.spoil.scale.set(s, s, s)
    }
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const up = new THREE.Vector3(0, 1, 0)
    this.trucks.forEach((tr) => {
      tr.t = (tr.t + tr.speed * dt * 5) % 1
      const pos = this.roadCurve.getPoint(tr.t)
      tr.mesh.position.copy(pos)
      const tan = this.roadCurve.getTangent(tr.t)
      tr.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), tan, up))
    })
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    cancelAnimationFrame(this.rafId)
    this.controls.dispose()
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      if (m.material) {
        const mat = m.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat.dispose()
      }
    })
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
