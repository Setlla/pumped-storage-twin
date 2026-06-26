import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const COLOR = {
  ground: 0x3a4232,
  rock: 0x6b5e44,
  rockDark: 0x564a36,
  dam: 0x8a8f98,
  spoil: 0x7a6b50,
  truck: 0xffc02a,
  water: 0x16b6ff,
  road: 0x2a3140,
  steel: 0x9aa4b2
}

interface Truck {
  mesh: THREE.Group
  t: number
  speed: number
}

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
  private damCrest: THREE.Mesh | null = null
  private damProgress = 0.58

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a1420)
    this.scene.fog = new THREE.Fog(0x0a1420, 120, 320)

    const w = container.clientWidth
    const h = container.clientHeight
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
    this.camera.position.set(90, 70, 110)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(0, 6, 0)
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 50
    this.controls.maxDistance = 320

    this.buildLights()
    this.buildGround()
    this.buildExcavationPit()
    this.buildDam()
    this.buildSpoilHeap()
    this.buildRoadAndTrucks()
    this.buildExcavators()
    this.animate()
  }

  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0x6a7a9a, 0.8))
    const sun = new THREE.DirectionalLight(0xffe8c8, 1.2)
    sun.position.set(80, 120, 40)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 400
    const s = 160
    sun.shadow.camera.left = -s
    sun.shadow.camera.right = s
    sun.shadow.camera.top = s
    sun.shadow.camera.bottom = -s
    this.scene.add(sun)
  }

  private buildGround() {
    const geo = new THREE.PlaneGeometry(400, 400, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color: COLOR.ground, roughness: 1 })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    const grid = new THREE.GridHelper(400, 40, 0x14304a, 0x102236)
    ;(grid.material as THREE.Material).opacity = 0.25
    ;(grid.material as THREE.Material).transparent = true
    grid.position.y = 0.05
    this.scene.add(grid)
  }

  // 上水库库盆: 阶梯式开挖坑(逐级下挖的马道)
  private buildExcavationPit() {
    const pit = new THREE.Group()
    pit.position.set(-70, 0, -30)
    const tiers = 6
    for (let i = 0; i < tiers; i++) {
      const r = 46 - i * 6
      const depth = -i * 4
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? COLOR.rock : COLOR.rockDark,
        roughness: 0.95
      })
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r - 5, 4, 32, 1, true), mat)
      ring.position.y = depth - 2
      ring.receiveShadow = true
      ring.castShadow = true
      pit.add(ring)
      // 马道平台
      const bench = new THREE.Mesh(
        new THREE.RingGeometry(r - 5, r, 32),
        new THREE.MeshStandardMaterial({ color: COLOR.rockDark, roughness: 1, side: THREE.DoubleSide })
      )
      bench.rotation.x = -Math.PI / 2
      bench.position.y = depth - 4
      pit.add(bench)
    }
    // 坑底
    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(11, 32),
      new THREE.MeshStandardMaterial({ color: COLOR.rockDark, roughness: 1 })
    )
    bottom.rotation.x = -Math.PI / 2
    bottom.position.y = -tiers * 4 - 4
    pit.add(bottom)
    this.scene.add(pit)
    this.labelSprite('上水库库盆开挖', -70, 14, -30)
  }

  // 面板堆石坝: 梯形坝体, 高度随填筑进度
  private buildDam() {
    const grp = new THREE.Group()
    grp.position.set(20, 0, 30)
    const fullH = 48
    const len = 90
    // 已填筑体(高度=进度)
    const h = fullH * this.damProgress
    const geo = new THREE.BoxGeometry(len, h, 34)
    const mat = new THREE.MeshStandardMaterial({ color: COLOR.dam, roughness: 0.8 })
    this.damCrest = new THREE.Mesh(geo, mat)
    this.damCrest.position.y = h / 2
    this.damCrest.castShadow = true
    this.damCrest.receiveShadow = true
    grp.add(this.damCrest)
    // 上游面板(蓝灰斜面示意)
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(len, h * 1.3),
      new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })
    )
    face.position.set(0, h / 2, -17.2)
    face.rotation.x = -0.32
    grp.add(face)
    // 设计坝顶轮廓(线框示意目标高程)
    const target = new THREE.Mesh(
      new THREE.BoxGeometry(len, fullH, 34),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.18 })
    )
    target.position.y = fullH / 2
    grp.add(target)
    this.scene.add(grp)
    this.labelSprite('面板堆石坝（填筑中）', 20, fullH + 6, 30)
  }

  // 弃渣场: 锥形堆体
  private buildSpoilHeap() {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(34, 30, 24),
      new THREE.MeshStandardMaterial({ color: COLOR.spoil, roughness: 1 })
    )
    cone.position.set(95, 15, -60)
    cone.castShadow = true
    cone.receiveShadow = true
    this.scene.add(cone)
    this.labelSprite('1#弃渣场', 95, 36, -60)
  }

  // 运输道路 + 往返渣土车
  private buildRoadAndTrucks() {
    const pts = [
      new THREE.Vector3(-70, 0.4, -30),
      new THREE.Vector3(-40, 0.4, 10),
      new THREE.Vector3(0, 0.4, 24),
      new THREE.Vector3(40, 0.4, 20),
      new THREE.Vector3(70, 0.4, -20),
      new THREE.Vector3(95, 0.4, -58)
    ]
    this.roadCurve = new THREE.CatmullRomCurve3(pts)
    const road = new THREE.Mesh(
      new THREE.TubeGeometry(this.roadCurve, 80, 4, 8, false),
      new THREE.MeshStandardMaterial({ color: COLOR.road, roughness: 1 })
    )
    road.position.y = -0.2
    this.scene.add(road)

    for (let i = 0; i < 8; i++) {
      const truck = this.makeTruck()
      this.scene.add(truck)
      this.trucks.push({ mesh: truck, t: i / 8, speed: 0.018 + Math.random() * 0.01 })
    }
  }

  private makeTruck(): THREE.Group {
    const g = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.4, 3),
      new THREE.MeshStandardMaterial({ color: COLOR.truck, roughness: 0.5, metalness: 0.3 })
    )
    body.position.y = 2
    body.castShadow = true
    g.add(body)
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.6, 2.6),
      new THREE.MeshStandardMaterial({ color: COLOR.rockDark, roughness: 1 })
    )
    bed.position.set(-0.6, 3.4, 0)
    g.add(bed)
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xdab020 })
    )
    cab.position.set(2, 2.6, 0)
    g.add(cab)
    return g
  }

  private buildExcavators() {
    for (const [x, z] of [[-70, -30], [22, 30], [-44, 6]] as [number, number][]) {
      const g = new THREE.Group()
      g.position.set(x, 0, z)
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(5, 2, 3.4),
        new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.5 })
      )
      base.position.y = 1.5
      base.castShadow = true
      g.add(base)
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffa733 })
      )
      arm.position.set(1.5, 4, 0)
      arm.rotation.z = -0.7
      g.add(arm)
      this.scene.add(g)
    }
  }

  private labelSprite(text: string, x: number, y: number, z: number) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 56
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(8,22,42,0.85)'
    ctx.fillRect(0, 0, 256, 56)
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 252, 52)
    ctx.fillStyle = '#e6f1ff'
    ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 30)
    const tex = new THREE.CanvasTexture(canvas)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
    sprite.scale.set(26, 5.7, 1)
    sprite.position.set(x, y, z)
    this.scene.add(sprite)
  }

  /** 设置填筑进度(0~1), 更新坝高 */
  setDamProgress(p: number) {
    this.damProgress = Math.max(0.05, Math.min(1, p))
    if (this.damCrest) {
      const fullH = 48
      const h = fullH * this.damProgress
      this.damCrest.scale.y = this.damProgress
      this.damCrest.position.y = h / 2
    }
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const up = new THREE.Vector3(0, 1, 0)
    this.trucks.forEach((tr) => {
      tr.t = (tr.t + tr.speed * dt * 6) % 1
      const pos = this.roadCurve.getPoint(tr.t)
      tr.mesh.position.copy(pos)
      const tan = this.roadCurve.getTangent(tr.t)
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), tan, up)
      tr.mesh.quaternion.setFromRotationMatrix(m)
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
