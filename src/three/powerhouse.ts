import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { UnitState } from '@/types/plant'

const UNIT_SPACING = 14
const UNIT_COUNT = 4

const COLOR = {
  generating: 0x00ff88,
  pumping: 0xff9d00,
  fault: 0xff3860,
  stopped: 0x4a5a72,
  cyan: 0x00d4ff,
  steel: 0x6a7a90,
  steelDark: 0x3a4658,
  concrete: 0x2a3242,
  water: 0x1e88ff
}

interface UnitMesh {
  group: THREE.Group
  rotor: THREE.Group
  statusRing: THREE.Mesh
  statusLight: THREE.PointLight
  ringMat: THREE.MeshStandardMaterial
  label: THREE.Sprite
  hitTarget: THREE.Mesh
  unitId: number
  flowParticles: THREE.Points
  flowGeom: THREE.BufferGeometry
  flowDir: number // +1 down(generating) -1 up(pumping) 0 stop
  spinSpeed: number
  baseX: number // 机组基准 x 坐标(用于振动抖动复位)
  vibration: number // 当前振动 mm/s(驱动抖动幅度)
}


export class PowerhouseScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private units: UnitMesh[] = []
  private clock = new THREE.Clock()
  private rafId = 0
  private container: HTMLElement
  private onSelect: (id: number | null) => void
  private hitTargets: THREE.Mesh[] = []
  // 巡检漫游
  private tourActive = false
  private tourIndex = 0
  private tourDwell = 0
  private waypoints: { pos: THREE.Vector3; target: THREE.Vector3; unitId: number | null }[] = []

  constructor(container: HTMLElement, onSelect: (id: number | null) => void) {
    this.container = container
    this.onSelect = onSelect

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x060f1c)
    this.scene.fog = new THREE.Fog(0x060f1c, 60, 160)

    const w = container.clientWidth
    const h = container.clientHeight
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
    this.camera.position.set(34, 26, 40)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(0, 4, 0)
    this.controls.maxPolarAngle = Math.PI * 0.49
    this.controls.minDistance = 18
    this.controls.maxDistance = 110

    this.buildLights()
    this.buildCavern()
    this.buildCrane()
    for (let i = 0; i < UNIT_COUNT; i++) this.buildUnit(i)
    this.buildWaypoints()

    this.renderer.domElement.addEventListener('pointerdown', this.handleClick)
    this.animate()
  }

  private buildWaypoints() {
    // 总览点
    this.waypoints.push({
      pos: new THREE.Vector3(34, 26, 40),
      target: new THREE.Vector3(0, 4, 0),
      unitId: null
    })
    // 逐台机组近景
    this.units.forEach((um) => {
      this.waypoints.push({
        pos: new THREE.Vector3(um.baseX + 7, 11, 18),
        target: new THREE.Vector3(um.baseX, 5, 0),
        unitId: um.unitId
      })
    })
  }


  private buildLights() {
    this.scene.add(new THREE.AmbientLight(0x4a6a9a, 0.7))
    const key = new THREE.DirectionalLight(0xcfe8ff, 1.1)
    key.position.set(30, 50, 20)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 200
    key.shadow.camera.left = -60
    key.shadow.camera.right = 60
    key.shadow.camera.top = 60
    key.shadow.camera.bottom = -60
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x2a4a8a, 0.5)
    fill.position.set(-30, 20, -20)
    this.scene.add(fill)
    // 厂房顶部灯带
    for (let i = 0; i < UNIT_COUNT; i++) {
      const x = (i - (UNIT_COUNT - 1) / 2) * UNIT_SPACING
      const lamp = new THREE.PointLight(0x88c0ff, 0.6, 40)
      lamp.position.set(x, 22, 0)
      this.scene.add(lamp)
    }
  }

  private buildCavern() {
    const hallLen = UNIT_COUNT * UNIT_SPACING + 10
    const hallW = 26
    // 地面
    const floorMat = new THREE.MeshStandardMaterial({
      color: COLOR.concrete, roughness: 0.9, metalness: 0.1
    })
    const floor = new THREE.Mesh(new THREE.BoxGeometry(hallLen, 1, hallW), floorMat)
    floor.position.y = -0.5
    floor.receiveShadow = true
    this.scene.add(floor)
    // 后墙
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x202838, roughness: 1, metalness: 0, side: THREE.DoubleSide
    })
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(hallLen, 26, 1), wallMat)
    backWall.position.set(0, 13, -hallW / 2)
    backWall.receiveShadow = true
    this.scene.add(backWall)
    // 拱顶 (半圆柱)
    const archGeom = new THREE.CylinderGeometry(hallW / 2, hallW / 2, hallLen, 32, 1, true, 0, Math.PI)
    const arch = new THREE.Mesh(archGeom, wallMat)
    arch.rotation.z = Math.PI / 2
    arch.position.y = 26
    this.scene.add(arch)
    // 网格地坪线
    const grid = new THREE.GridHelper(hallLen, UNIT_COUNT * 2, 0x00d4ff, 0x14304a)
    ;(grid.material as THREE.Material).opacity = 0.25
    ;(grid.material as THREE.Material).transparent = true
    grid.position.y = 0.02
    this.scene.add(grid)
  }


  private buildCrane() {
    const hallLen = UNIT_COUNT * UNIT_SPACING + 10
    const railMat = new THREE.MeshStandardMaterial({
      color: COLOR.steelDark, roughness: 0.5, metalness: 0.8
    })
    // 两侧吊车轨道
    for (const z of [-10, 10]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(hallLen, 0.6, 0.6), railMat)
      rail.position.set(0, 19, z)
      this.scene.add(rail)
    }
    // 桥式起重机大梁
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 22), railMat)
    beam.position.set(-UNIT_SPACING, 19.5, 0)
    beam.castShadow = true
    this.scene.add(beam)
    const trolley = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.6, 3),
      new THREE.MeshStandardMaterial({ color: COLOR.cyan, roughness: 0.4, metalness: 0.7, emissive: 0x003344 })
    )
    trolley.position.set(-UNIT_SPACING, 18.4, 0)
    this.scene.add(trolley)
  }

  private makeLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(8,22,42,0.85)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 252, 60)
    ctx.fillStyle = '#e6f1ff'
    ctx.font = 'bold 30px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 34)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(7, 1.75, 1)
    return sprite
  }


  private buildUnit(index: number) {
    const x = (index - (UNIT_COUNT - 1) / 2) * UNIT_SPACING
    const group = new THREE.Group()
    group.position.x = x

    const steelMat = new THREE.MeshStandardMaterial({
      color: COLOR.steel, roughness: 0.4, metalness: 0.85
    })
    const darkMat = new THREE.MeshStandardMaterial({
      color: COLOR.steelDark, roughness: 0.5, metalness: 0.8
    })

    // 发电机机壳 (大圆柱)
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4, 6, 36), steelMat
    )
    housing.position.y = 6
    housing.castShadow = true
    group.add(housing)
    // 机壳顶盖
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4, 0.8, 36), darkMat)
    cap.position.y = 9.2
    group.add(cap)

    // 旋转部分: 转子 + 主轴
    const rotor = new THREE.Group()
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 12, 20), darkMat)
    shaft.position.y = 4
    rotor.add(shaft)
    // 转子辐条 (可见旋转)
    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 0.6), steelMat)
      spoke.position.y = 9.4
      spoke.rotation.y = (s / 6) * Math.PI * 2
      spoke.geometry.translate(1.6, 0, 0)
      rotor.add(spoke)
    }
    group.add(rotor)

    // 蜗壳 (环形进水)
    const volute = new THREE.Mesh(new THREE.TorusGeometry(3.6, 1.4, 16, 32), darkMat)
    volute.rotation.x = Math.PI / 2
    volute.position.y = 1.6
    volute.castShadow = true
    group.add(volute)
    // 尾水管 (向下锥形)
    const draft = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 3.2, 4, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: COLOR.steelDark, roughness: 0.6, metalness: 0.7, side: THREE.DoubleSide })
    )
    draft.position.y = -2
    group.add(draft)


    // 压力钢管 (从后上方斜插进蜗壳)
    const penstock = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 14, 20),
      new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.3, metalness: 0.7 })
    )
    penstock.position.set(0, 7, -8)
    penstock.rotation.x = Math.PI / 3.2
    group.add(penstock)

    // 状态发光环 (机组底座)
    const ringMat = new THREE.MeshStandardMaterial({
      color: COLOR.stopped, emissive: COLOR.stopped, emissiveIntensity: 1.2
    })
    const statusRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.22, 12, 48), ringMat)
    statusRing.rotation.x = Math.PI / 2
    statusRing.position.y = 0.4
    group.add(statusRing)
    const statusLight = new THREE.PointLight(COLOR.stopped, 0.8, 18)
    statusLight.position.set(0, 2, 0)
    group.add(statusLight)

    // 点击热区 (透明大圆柱)
    const hitTarget = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 14, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    hitTarget.position.y = 5
    hitTarget.userData.unitId = index + 1
    group.add(hitTarget)
    this.hitTargets.push(hitTarget)

    // 标签
    const label = this.makeLabelSprite(`#${index + 1} 机组`)
    label.position.set(0, 13, 0)
    group.add(label)

    // 水流粒子 (沿压力钢管→尾水管路径)
    const { points, geom } = this.buildFlowParticles()
    group.add(points)

    this.scene.add(group)
    this.units.push({
      group, rotor, statusRing, statusLight, ringMat, label,
      hitTarget, unitId: index + 1,
      flowParticles: points, flowGeom: geom, flowDir: 0, spinSpeed: 0,
      baseX: x, vibration: 0
    })
  }


  // 水流路径关键点: 钢管入口 → 蜗壳 → 转轮 → 尾水管出口
  private flowPath = [
    new THREE.Vector3(0, 13, -12),
    new THREE.Vector3(0, 7, -8),
    new THREE.Vector3(0, 2.4, -3.6),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0, -4.5, 1.5)
  ]
  private flowCurve = new THREE.CatmullRomCurve3(this.flowPath)

  private buildFlowParticles() {
    const N = 90
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(N * 3)
    const offsets = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      offsets[i] = i / N
      const p = this.flowCurve.getPoint(offsets[i])
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.userData.offsets = offsets
    const mat = new THREE.PointsMaterial({
      color: COLOR.water, size: 0.7, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    const points = new THREE.Points(geom, mat)
    return { points, geom }
  }

  private handleClick = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.hitTargets, false)
    if (hits.length > 0) {
      this.onSelect(hits[0].object.userData.unitId as number)
    } else {
      this.onSelect(null)
    }
  }


  /** 由外部传入机组状态更新视觉 */
  update(states: UnitState[], selectedId: number | null) {
    states.forEach((st) => {
      const um = this.units.find((u) => u.unitId === st.id)
      if (!um) return
      const c = new THREE.Color(COLOR[st.mode])
      um.ringMat.color.copy(c)
      um.ringMat.emissive.copy(c)
      um.statusLight.color.copy(c)

      // 选中高亮
      const selected = selectedId === st.id
      um.statusLight.intensity = selected ? 2.2 : 0.9
      um.ringMat.emissiveIntensity = selected ? 2.4 : 1.2

      // 旋转速度 (rpm → rad/帧基准)
      um.spinSpeed = (st.speedRpm / 333) * 0.5
      um.vibration = st.vibration

      // 水流方向与强度
      const flowMat = um.flowParticles.material as THREE.PointsMaterial
      if (st.mode === 'generating') {
        um.flowDir = 1
        flowMat.opacity = 0.9
        flowMat.color.set(0x00e0ff)
      } else if (st.mode === 'pumping') {
        um.flowDir = -1
        flowMat.opacity = 0.9
        flowMat.color.set(0xff9d00)
      } else {
        um.flowDir = 0
        flowMat.opacity = Math.max(0, flowMat.opacity - 0.05)
      }
    })
  }

  private updateFlow(um: UnitMesh, dt: number) {
    if (um.flowDir === 0) return
    const offsets = um.flowGeom.userData.offsets as Float32Array
    const pos = um.flowGeom.attributes.position as THREE.BufferAttribute
    const speed = dt * 0.18 * um.flowDir
    for (let i = 0; i < offsets.length; i++) {
      let t = offsets[i] + speed
      t = ((t % 1) + 1) % 1
      offsets[i] = t
      const p = this.flowCurve.getPoint(t)
      pos.setXYZ(i, p.x, p.y, p.z)
    }
    pos.needsUpdate = true
  }


  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.units.forEach((um) => {
      um.rotor.rotation.y += um.spinSpeed
      this.updateFlow(um, dt * 60)
      // 振动抖动: 振动越大(故障时~8mm/s)抖动越明显
      if (um.vibration > 4) {
        const amp = Math.min(0.12, (um.vibration - 4) * 0.02)
        um.group.position.x = um.baseX + (Math.random() - 0.5) * amp
        um.group.position.z = (Math.random() - 0.5) * amp
      } else if (um.group.position.x !== um.baseX) {
        um.group.position.x = um.baseX
        um.group.position.z = 0
      }
    })
    if (this.tourActive) this.updateTour(dt)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updateTour(dt: number) {
    const wp = this.waypoints[this.tourIndex]
    this.camera.position.lerp(wp.pos, 0.025)
    this.controls.target.lerp(wp.target, 0.05)
    if (this.camera.position.distanceTo(wp.pos) < 2.5) {
      this.tourDwell += dt
      if (this.tourDwell > 2.8) {
        this.tourDwell = 0
        this.tourIndex = (this.tourIndex + 1) % this.waypoints.length
        const next = this.waypoints[this.tourIndex]
        this.onSelect(next.unitId)
      }
    }
  }

  /** 开关巡检漫游 */
  setTour(on: boolean) {
    this.tourActive = on
    this.controls.enabled = !on
    if (on) {
      this.tourIndex = 0
      this.tourDwell = 0
    }
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  /** 镜头聚焦到指定机组 */
  focusUnit(id: number | null) {
    if (id == null) {
      this.controls.target.set(0, 4, 0)
      return
    }
    const x = (id - 1 - (UNIT_COUNT - 1) / 2) * UNIT_SPACING
    this.controls.target.set(x, 5, 0)
  }

  dispose() {
    cancelAnimationFrame(this.rafId)
    this.renderer.domElement.removeEventListener('pointerdown', this.handleClick)
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
