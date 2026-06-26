import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const COLOR = {
  grassLow: 0x3c4a30,
  grassHigh: 0x55603f,
  rock: 0x6b5e44,
  rockDark: 0x4f4536,
  dam: 0x8f949c,
  damFace: 0x4a90d9,
  spoil: 0x7a6b50,
  truck: 0xffc02a,
  water: 0x16b6ff,
  road: 0x33301f
}

// 山体高程函数: 一座有平顶的山(顶部做上水库), 向前(+z)坡降到谷地
export function heightAt(x: number, z: number): number {
  const dx = x + 40
  const dz = z + 25
  const r = Math.sqrt(dx * dx + dz * dz)
  // 平顶高原(上水库所在), 半径50内约124m, 之外平滑坡降
  const over = Math.max(0, r - 48)
  let h = 126 / (1 + (over / 46) * (over / 46))
  // 后侧次峰
  h += 46 * Math.exp(-(((x - 70) ** 2) + ((z + 60) ** 2)) / (2 * 55 * 55))
  // 基底平原
  h += 6
  // 细微起伏
  h += 2.2 * Math.sin(x * 0.05) * Math.cos(z * 0.045)
  return h
}

interface Truck { mesh: THREE.Group; t: number; speed: number }


const BASIN = { x: -40, z: -25, rim: 124, radius: 40, depth: 26 }
const ROAD_PTS = [
  new THREE.Vector3(BASIN.x + 28, BASIN.rim - 4, BASIN.z + 18),
  new THREE.Vector3(0, 96, 6),
  new THREE.Vector3(28, 60, 40),
  new THREE.Vector3(46, 32, 66),
  new THREE.Vector3(58, 14, 92)
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
  private basinWater: THREE.Mesh | null = null
  private damProgress = 0.5
  private upperProgress = 0.5

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0c1622)
    this.scene.fog = new THREE.Fog(0x0c1622, 200, 520)

    const w = container.clientWidth
    const h = container.clientHeight
    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 3000)
    this.camera.position.set(140, 130, 180)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(-10, 50, 0)
    this.controls.maxPolarAngle = Math.PI * 0.49
    this.controls.minDistance = 80
    this.controls.maxDistance = 520

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
    this.scene.add(new THREE.AmbientLight(0x6a7a9a, 0.85))
    const sun = new THREE.DirectionalLight(0xffe8c8, 1.25)
    sun.position.set(120, 200, 90)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 600
    const s = 240
    sun.shadow.camera.left = -s
    sun.shadow.camera.right = s
    sun.shadow.camera.top = s
    sun.shadow.camera.bottom = -s
    this.scene.add(sun)
  }


  // 山体地形网格(按高程函数起伏 + 高度着色)
  private buildTerrain() {
    const SIZE = 380
    const SEG = 140
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
      // 在上水库库盆范围内压成盆地(开挖)
      const dr = Math.sqrt((x - BASIN.x) ** 2 + (z - BASIN.z) ** 2)
      if (dr < BASIN.radius) {
        const t = dr / BASIN.radius
        const floor = BASIN.rim - BASIN.depth
        y = floor + (BASIN.rim - floor) * Math.pow(t, 2.2)
      }
      pos.setY(i, y)
      const c = new THREE.Color()
      if (y > 95) c.copy(cRock).lerp(cHigh, Math.max(0, 1 - (y - 95) / 40))
      else c.copy(cLow).lerp(cHigh, Math.min(1, y / 90))
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false })
    const terrain = new THREE.Mesh(geo, mat)
    terrain.receiveShadow = true
    terrain.castShadow = true
    this.scene.add(terrain)
  }

  // 上水库库盆: 阶梯开挖马道(嵌在盆地内)
  private buildBasin() {
    const grp = new THREE.Group()
    grp.position.set(BASIN.x, 0, BASIN.z)
    const tiers = 5
    for (let i = 0; i < tiers; i++) {
      const rOuter = BASIN.radius - 2 - i * 6
      const y = BASIN.rim - 3 - (i / tiers) * BASIN.depth
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter, 1.1, 6, 40),
        new THREE.MeshStandardMaterial({ color: i % 2 ? COLOR.rockDark : COLOR.rock, roughness: 1 })
      )
      ring.rotation.x = Math.PI / 2
      ring.position.y = y
      grp.add(ring)
    }
    // 库盆水体(随蓄水进度上升)
    this.basinWater = new THREE.Mesh(
      new THREE.CircleGeometry(BASIN.radius - 4, 48),
      new THREE.MeshStandardMaterial({
        color: COLOR.water, transparent: true, opacity: 0.82,
        roughness: 0.2, metalness: 0.1
      })
    )
    this.basinWater.rotation.x = -Math.PI / 2
    this.basinWater.position.set(BASIN.x, BASIN.rim - BASIN.depth + 1, BASIN.z)
    this.scene.add(this.basinWater)
    this.scene.add(grp)
  }

  // 面板堆石坝: 沿库盆下游(+z)弧形坝段, 高度随填筑进度
  private buildDam() {
    const fullH = BASIN.depth + 10
    const geo = new THREE.CylinderGeometry(
      BASIN.radius + 6, BASIN.radius + 12, fullH, 40, 1, true,
      Math.PI * 0.15, Math.PI * 0.7
    )
    this.dam = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: COLOR.dam, roughness: 0.85, side: THREE.DoubleSide })
    )
    this.dam.position.set(BASIN.x, BASIN.rim - fullH / 2, BASIN.z)
    this.dam.castShadow = true
    this.scene.add(this.dam)
    // 设计坝顶轮廓线框
    const target = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.16 })
    )
    target.position.copy(this.dam.position)
    this.scene.add(target)
  }


  // 下水库: 谷地水池
  private buildLowerReservoir() {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(36, 40),
      new THREE.MeshStandardMaterial({ color: 0x1184e0, transparent: true, opacity: 0.8, roughness: 0.2 })
    )
    water.rotation.x = -Math.PI / 2
    water.position.set(62, heightAt(62, 100) + 1, 100)
    this.scene.add(water)
  }

  private buildSpoilHeap() {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(26, 24, 20),
      new THREE.MeshStandardMaterial({ color: COLOR.spoil, roughness: 1 })
    )
    cone.position.set(-30, heightAt(-30, 80) + 12, 80)
    cone.castShadow = true
    this.scene.add(cone)
  }

  private buildRoadAndTrucks() {
    this.roadCurve = new THREE.CatmullRomCurve3(ROAD_PTS)
    const road = new THREE.Mesh(
      new THREE.TubeGeometry(this.roadCurve, 100, 3.2, 8, false),
      new THREE.MeshStandardMaterial({ color: COLOR.road, roughness: 1 })
    )
    road.receiveShadow = true
    this.scene.add(road)
    for (let i = 0; i < 9; i++) {
      const truck = this.makeTruck()
      this.scene.add(truck)
      this.trucks.push({ mesh: truck, t: i / 9, speed: 0.02 + Math.random() * 0.012 })
    }
  }

  private makeTruck(): THREE.Group {
    const g = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 2.6, 3.2),
      new THREE.MeshStandardMaterial({ color: COLOR.truck, roughness: 0.5, metalness: 0.3 })
    )
    body.position.y = 2.2
    body.castShadow = true
    g.add(body)
    const load = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.8, 2.8),
      new THREE.MeshStandardMaterial({ color: COLOR.rockDark, roughness: 1 })
    )
    load.position.set(-0.7, 3.7, 0)
    g.add(load)
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.7, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xdab020 })
    )
    cab.position.set(2.2, 2.9, 0)
    g.add(cab)
    return g
  }

  private labelSprite(text: string, x: number, y: number, z: number, color = '#00d4ff') {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 56
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(8,22,42,0.85)'
    ctx.fillRect(0, 0, 256, 56)
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 252, 52)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 30)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })
    )
    sprite.scale.set(34, 7.4, 1)
    sprite.position.set(x, y, z)
    this.scene.add(sprite)
  }

  private buildLabels() {
    this.labelSprite('上水库（库盆开挖+面板堆石坝）', BASIN.x, BASIN.rim + 22, BASIN.z, '#00ff88')
    this.labelSprite('下水库', 62, heightAt(62, 100) + 20, 100, '#19a0ff')
    this.labelSprite('1#弃渣场', -30, heightAt(-30, 80) + 32, 80, '#a78bfa')
  }


  /** 时间驱动: 更新坝高、蓄水位、开挖揭示 */
  setTime(_t: number, damProgress: number, upperProgress: number) {
    this.damProgress = Math.max(0.02, Math.min(1, damProgress))
    this.upperProgress = Math.max(0, Math.min(1, upperProgress))
    const fullH = BASIN.depth + 10
    if (this.dam) {
      this.dam.scale.y = this.damProgress
      this.dam.position.y = BASIN.rim - (fullH * this.damProgress) / 2
    }
    if (this.basinWater) {
      // 蓄水位: 坝建得越高、开挖越完成, 水位越高
      const floor = BASIN.rim - BASIN.depth
      const lvl = floor + 1 + this.damProgress * (BASIN.depth - 3)
      this.basinWater.position.y = lvl
      const opacity = 0.2 + this.damProgress * 0.62
      ;(this.basinWater.material as THREE.MeshStandardMaterial).opacity = opacity
    }
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const up = new THREE.Vector3(0, 1, 0)
    this.trucks.forEach((tr) => {
      // 满载下山(挖→坝): 沿路线正向; 速度随当前挖填强度
      tr.t = (tr.t + tr.speed * dt * 6) % 1
      const pos = this.roadCurve.getPoint(tr.t)
      tr.mesh.position.copy(pos)
      const tan = this.roadCurve.getTangent(tr.t)
      tr.mesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(new THREE.Vector3(), tan, up)
      )
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
