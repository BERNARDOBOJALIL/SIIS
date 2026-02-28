import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer }          from 'three'
import {
  Search, X, Layers, Building2, RotateCcw, Info,
} from 'lucide-react'

const MODELS = [
  { file: '/Ensamblaje2_PB.glb', label: 'Planta Baja', short: 'PB' },
  { file: '/P1_ENSAMB_v2.glb',   label: 'Planta 1',    short: 'P1' },
]

const C_HOVER    = new THREE.Color(0xff3b3b)
const C_SELECTED = new THREE.Color(0xcc0000)
const C_FOUND    = new THREE.Color(0xff9500)

const ANIM_HOVER   = 280
const ANIM_CAM     = 1800
const ANIM_LIFT    = 700
const LIFT_DELAY   = 0.72
const HOVER_LIFT   = 2.4
const HOVER_OUT    = 1.3
const IDLE_TIMEOUT = 30000  // ms — inactividad para regresar a vista general

const STATUS_COLORS = {
  disponible: '#22c55e', ocupado: '#ef4444', administrativo: '#3b82f6',
  mantenimiento: '#f59e0b', evento: '#8b5cf6', sin_asignar: '#94a3b8',
}
const STATUS_WEIGHTED = [
  'disponible','disponible','disponible',
  'ocupado','ocupado','ocupado',
  'administrativo','mantenimiento','evento','sin_asignar',
]
const MIN_LABEL_FRAC = 0.04

function meshStatus(name) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return STATUS_WEIGHTED[h % STATUS_WEIGHTED.length]
}

function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2 }
function easeOutExpo(t)    { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t) }
function easeInOutQuart(t) { return t < 0.5 ? 8*t*t*t*t : 1-Math.pow(-2*t+2,4)/2 }

function toNDC(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  return { nx:(cx/rect.width)*2-1, ny:-(cy/rect.height)*2+1, cx, cy }
}

function doRaycast(nx, ny, camera, objects) {
  const rc = new THREE.Raycaster()
  rc.setFromCamera(new THREE.Vector2(nx, ny), camera)
  return rc.intersectObjects(objects, false)
}

function getMeshColor(mesh) {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  return mat?.color ? mat.color.clone() : new THREE.Color(0xcccccc)
}

function setMeshColor(mesh, color) {
  const apply = m => { if (m?.color) m.color.set(color) }
  Array.isArray(mesh.material) ? mesh.material.forEach(apply) : apply(mesh.material)
}

function disposeObj(obj) {
  obj.traverse(n => {
    n.geometry?.dispose()
    ;(Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
      m?.map?.dispose()
      m?.dispose()
    })
  })
}

function fitCamera(bbox, camera, elevDeg, padMult) {
  const sphere   = bbox.getBoundingSphere(new THREE.Sphere())
  const fovHalf  = THREE.MathUtils.degToRad(camera.fov / 2)
  const hFovHalf = Math.atan(Math.tan(fovHalf) * camera.aspect)
  const distV = sphere.radius / Math.tan(fovHalf)
  const distH = sphere.radius / Math.tan(hFovHalf)
  const dist  = Math.max(distV, distH) * padMult
  const elev  = THREE.MathUtils.degToRad(elevDeg)
  const pos   = new THREE.Vector3(
    sphere.center.x,
    sphere.center.y + dist * Math.sin(elev),
    sphere.center.z + dist * Math.cos(elev),
  )
  return { pos, target: sphere.center.clone() }
}

export default function ThreeViewer() {
  const mountRef = useRef(null)

  const R = useRef({
    renderer: null, scene: null, camera: null,
    controls: null, timer: null, raf: null,
    labelsOverlay: null, labelsSvg: null,
    defaultPos:    new THREE.Vector3(0, 28, 42),
    defaultTarget: new THREE.Vector3(0, 0, 0),
  })

  const meshes      = useRef([])
  const animMap     = useRef(new Map())
  const hoverRef    = useRef(null)
  const selectedRef = useRef(null)
  const camAnim     = useRef({
    active: false, t: 0,
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromDist: 0, toDist: 0,
    fromDir: new THREE.Vector3(0, 0, 1),
    qEnd: new THREE.Quaternion(),
  })
  const handlersRef = useRef({ onPointerMove: null, onClick: null })
  const idleTimerRef = useRef(null)   // timeout de inactividad 30s
  const labelsDataRef = useRef([])

  const [activeModel,   setActiveModel]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [tooltip,       setTooltip]       = useState({ visible:false, name:'', x:0, y:0 })
  const [search,        setSearch]        = useState('')
  const [selectedName,  setSelectedName]  = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)

  /* ── Limpia todas las etiquetas del overlay ── */
  function cleanupLabels() {
    labelsDataRef.current.forEach(lbl => {
      lbl.el?.remove()
      lbl.lineEl?.remove()
    })
    labelsDataRef.current = []
    meshes.current.forEach(entry => { entry._label = null })
  }

  /* ── Muestra / oculta todas las etiquetas ── */
  function setLabelsVisible(visible) {
    const el = R.current.labelsOverlay
    if (!el) return
    el.style.opacity = visible ? '1' : '0'
  }

  function startMeshAnim(entry, toLocalPos, duration, easing) {
    duration = duration ?? ANIM_HOVER
    easing   = easing   ?? easeOutExpo
    animMap.current.set(entry.mesh.uuid, {
      mesh:     entry.mesh,
      t:        0,
      fromPos:  entry.mesh.position.clone(),
      toPos:    toLocalPos.clone(),
      duration,
      easing,
    })
  }

  function startCamAnim(toPos, toTarget) {
    const { camera, controls } = R.current
    const fTgt = controls.target.clone()
    const tTgt = toTarget.clone()
    const fromOff = camera.position.clone().sub(fTgt)
    const toOff   = toPos.clone().sub(tTgt)
    const fromDist = fromOff.length() || 1
    const toDist   = toOff.length()   || 1
    const fromDir  = fromOff.divideScalar(fromDist)
    const toDir    = toOff.divideScalar(toDist)
    camAnim.current = {
      active: true, t: 0,
      fromTarget: fTgt, toTarget: tTgt,
      toPos: toPos.clone(),
      fromDist, toDist,
      fromDir,
      qEnd: new THREE.Quaternion().setFromUnitVectors(fromDir, toDir),
    }
  }

  function hoverLocalTarget(entry) {
    const ow = entry.origWorldPos
    const outDir = new THREE.Vector3(ow.x, 0, ow.z)
    const len = outDir.length()
    if (len > 0.01) outDir.divideScalar(len)
    else outDir.set(0, 0, 1)
    const targetWorld = ow.clone()
      .addScaledVector(outDir, HOVER_OUT)
      .add(new THREE.Vector3(0, HOVER_LIFT, 0))
    if (entry.mesh.parent)
      return entry.mesh.parent.worldToLocal(targetWorld.clone())
    return targetWorld
  }

  function liftLocalTarget(entry, extraHeight) {
    const wp = new THREE.Vector3()
    entry.mesh.getWorldPosition(wp)
    const targetWorld = wp.clone().add(new THREE.Vector3(0, extraHeight, 0))
    if (entry.mesh.parent)
      return entry.mesh.parent.worldToLocal(targetWorld.clone())
    return targetWorld
  }

  function deselectEntry(entry) {
    clearTimeout(entry._liftTimer)
    entry._liftTimer = null
    setMeshColor(entry.mesh, entry.origColor)
    startMeshAnim(entry, entry.origPos, ANIM_LIFT, easeInOutQuart)
    selectedRef.current = null
    setSelectedName(null)
    setSelectedStatus(null)
    setLabelsVisible(true)
  }

  function resetView() {
    if (selectedRef.current) deselectEntry(selectedRef.current)
    startCamAnim(R.current.defaultPos, R.current.defaultTarget)
    setLabelsVisible(true)
    clearIdleTimer()
  }

  /** Reinicia el timer de inactividad (30s). Cualquier interacción lo resetea. */
  function resetIdleTimer() {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      /* Solo regresar si no hay pieza seleccionada */
      if (!selectedRef.current) {
        startCamAnim(R.current.defaultPos, R.current.defaultTarget)
      }
    }, IDLE_TIMEOUT)
  }

  function clearIdleTimer() {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
  }

  function switchModel(idx) {
    if (idx === activeModel || transitioning) return
    setSearch('')
    setActiveModel(idx)
  }

  handlersRef.current.onPointerMove = function(e) {
    const { camera, renderer } = R.current
    if (!camera || !renderer || meshes.current.length === 0) return
    resetIdleTimer()   // cualquier movimiento reinicia el timer de 30s
    const { nx, ny, cx, cy } = toNDC(e, renderer.domElement)
    const hits     = doRaycast(nx, ny, camera, meshes.current.map(m => m.mesh))
    const prev     = hoverRef.current
    const hitEntry = hits.length > 0
      ? meshes.current.find(m => m.mesh === hits[0].object)
      : null
    if (hitEntry !== prev) {
      if (prev && prev !== selectedRef.current) {
        setMeshColor(prev.mesh, prev.origColor)
        startMeshAnim(prev, prev.origPos)
      }
      if (hitEntry && hitEntry !== selectedRef.current) {
        setMeshColor(hitEntry.mesh, C_HOVER)
        startMeshAnim(hitEntry, hoverLocalTarget(hitEntry))
      }
      hoverRef.current = hitEntry
      renderer.domElement.style.cursor = hitEntry ? 'pointer' : 'default'
    }
    setTooltip(hitEntry
      ? { visible:true,  name:hitEntry.name, x:cx, y:cy }
      : { visible:false, name:'',            x:cx, y:cy }
    )
  }

  handlersRef.current.onClick = function(e) {
    const { camera, renderer, defaultPos, defaultTarget } = R.current
    if (!camera || !renderer || meshes.current.length === 0) return
    const { nx, ny } = toNDC(e, renderer.domElement)
    const hits = doRaycast(nx, ny, camera, meshes.current.map(m => m.mesh))
    const prev = selectedRef.current
    if (hits.length === 0) {
      /*
       * Click en vacío: si hay pieza seleccionada la deselecciona y regresa.
       * Si no hay pieza seleccionada → cámara libre, NO regresa sola.
       * El timer de inactividad (30s) se encarga de regresar.
       */
      if (prev) {
        deselectEntry(prev)
        startCamAnim(defaultPos, defaultTarget)
      }
      resetIdleTimer()
      return
    }
    const entry = meshes.current.find(m => m.mesh === hits[0].object)
    if (!entry) return
    if (prev === entry) {
      deselectEntry(entry)
      startCamAnim(defaultPos, defaultTarget)
      return
    }
    if (prev) deselectEntry(prev)
    setMeshColor(entry.mesh, C_SELECTED)
    selectedRef.current = entry
    setSelectedName(entry.name)
    setSelectedStatus(meshStatus(entry.name))
    setLabelsVisible(false)

    const bbox = new THREE.Box3().setFromObject(entry.mesh)
    const { pos: camPos, target: camTarget } = fitCamera(bbox, camera, 90, 1.45)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()
    const pieceSize = bbox.getSize(new THREE.Vector3())
    const maxSz     = Math.max(pieceSize.x, pieceSize.y, pieceSize.z, 0.5)
    const liftHeight = Math.max(maxSz * 0.85, 2.2)
    entry._liftTimer = setTimeout(() => {
      if (selectedRef.current === entry)
        startMeshAnim(entry, liftLocalTarget(entry, liftHeight), ANIM_LIFT, easeInOutQuart)
    }, ANIM_CAM * LIFT_DELAY)
  }

  useEffect(() => {
    const mount = mountRef.current
    const r     = R.current

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace    = THREE.SRGBColorSpace
    renderer.shadowMap.enabled   = true
    renderer.shadowMap.type      = THREE.PCFShadowMap
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1)
    mount.appendChild(renderer.domElement)
    r.renderer = renderer

    const timer = new Timer()
    r.timer = timer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xeeeeee)
    scene.fog = new THREE.FogExp2(0xeeeeee, 0.007)
    r.scene = scene

    const camera = new THREE.PerspectiveCamera(42, (mount.clientWidth||1)/(mount.clientHeight||1), 0.1, 800)
    camera.position.copy(r.defaultPos)
    r.camera = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.minDistance   = 3
    controls.maxDistance   = 180
    controls.maxPolarAngle = Math.PI * 0.88
    r.controls = controls

    /* ── Overlay HTML para labels con anti-overlap ── */
    const labelsOverlay = document.createElement('div')
    labelsOverlay.className = 'labels-overlay'
    mount.appendChild(labelsOverlay)
    const labelsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    labelsSvg.setAttribute('class', 'labels-svg')
    labelsOverlay.appendChild(labelsSvg)
    r.labelsOverlay = labelsOverlay
    r.labelsSvg = labelsSvg

    /* ── Iluminación perpendicular ── */
    scene.add(new THREE.AmbientLight(0xffffff, 1.0))
    const sun = new THREE.DirectionalLight(0xffffff, 2.8)
    sun.position.set(0, 50, 0)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far  = 200
    sun.shadow.camera.left = sun.shadow.camera.bottom = -60
    sun.shadow.camera.right = sun.shadow.camera.top   =  60
    sun.shadow.bias = -0.001
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.45)
    fill.position.set(-10, 8, -12)
    scene.add(fill)
    scene.add(new THREE.DirectionalLight(0xffffff, 0.25)).position.set(0, -5, -20)

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(mount)

    function tickMeshAnims(dt) {
      animMap.current.forEach((anim, uuid) => {
        anim.t = Math.min(1, anim.t + (dt * 1000) / anim.duration)
        anim.mesh.position.lerpVectors(anim.fromPos, anim.toPos, anim.easing(anim.t))
        if (anim.t >= 1) {
          anim.mesh.position.copy(anim.toPos)
          animMap.current.delete(uuid)
        }
      })
    }

    const _qSlerp = new THREE.Quaternion()
    const _dirTmp = new THREE.Vector3()
    function tickCamAnim(dt) {
      const a = camAnim.current
      if (!a.active) return
      a.t = Math.min(1, a.t + (dt * 1000) / ANIM_CAM)
      const ease = easeInOutQuart(a.t)
      /* Interpolate target linearly */
      const tx = a.fromTarget.x + (a.toTarget.x - a.fromTarget.x) * ease
      const ty = a.fromTarget.y + (a.toTarget.y - a.fromTarget.y) * ease
      const tz = a.fromTarget.z + (a.toTarget.z - a.fromTarget.z) * ease
      R.current.controls.target.set(tx, ty, tz)
      /* Spherical-lerp the offset direction for smooth arc */
      _qSlerp.identity().slerp(a.qEnd, ease)
      _dirTmp.copy(a.fromDir).applyQuaternion(_qSlerp)
      const d = a.fromDist + (a.toDist - a.fromDist) * ease
      R.current.camera.position.set(tx + _dirTmp.x * d, ty + _dirTmp.y * d, tz + _dirTmp.z * d)
      if (a.t >= 1) {
        R.current.camera.position.copy(a.toPos)
        R.current.controls.target.copy(a.toTarget)
        a.active = false
      }
    }

    /* ── Label overlay: proyección + anti-overlap cada frame ── */
    const _projV  = new THREE.Vector3()
    const _worldP = new THREE.Vector3()
    function updateLabelsOverlay() {
      const labels = labelsDataRef.current
      if (labels.length === 0) return
      const cw = renderer.domElement.clientWidth
      const ch = renderer.domElement.clientHeight
      if (cw === 0 || ch === 0) return
      const PAD = 6

      /* 1 — Proyectar anclas a coordenadas de pantalla */
      for (const lbl of labels) {
        lbl.mesh.getWorldPosition(_worldP)
        _projV.copy(_worldP).add(lbl.anchorOffset)
        _projV.project(camera)
        lbl.anchorSX = (_projV.x * 0.5 + 0.5) * cw
        lbl.anchorSY = (-_projV.y * 0.5 + 0.5) * ch
        lbl.behind   = _projV.z > 1
        lbl.onScreen = !lbl.behind
          && lbl.anchorSX > -80 && lbl.anchorSX < cw + 80
          && lbl.anchorSY > -60 && lbl.anchorSY < ch + 60
      }

      /* 2 — Filtrar visibles, posición inicial sobre el ancla */
      const vis = []
      for (const lbl of labels) {
        if (!lbl.onScreen) continue
        lbl.cx = lbl.anchorSX
        lbl.cy = lbl.anchorSY - 24
        vis.push(lbl)
      }

      /* 3 — Resolver solapamientos: relaxation multi-pass en ambos ejes */
      const MAX_ITER = 12
      for (let iter = 0; iter < MAX_ITER; iter++) {
        let moved = false
        for (let i = 0; i < vis.length; i++) {
          const a = vis[i]
          for (let j = i + 1; j < vis.length; j++) {
            const b = vis[j]
            const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(a.cx - b.cx)
            const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs((a.cy - a.h / 2) - (b.cy - b.h / 2))
            if (overlapX <= 0 || overlapY <= 0) continue
            /* Push apart along the axis of least overlap */
            moved = true
            if (overlapX < overlapY) {
              const shift = (overlapX / 2) + 1
              if (a.cx <= b.cx) { a.cx -= shift; b.cx += shift }
              else               { a.cx += shift; b.cx -= shift }
            } else {
              const shift = (overlapY / 2) + 1
              if (a.cy <= b.cy) { a.cy -= shift; b.cy += shift }
              else               { a.cy += shift; b.cy -= shift }
            }
          }
        }
        if (!moved) break
      }

      /* 4 — Acotar dentro del viewport */
      for (const lbl of vis) {
        lbl.cx = Math.max(lbl.w / 2 + 2, Math.min(cw - lbl.w / 2 - 2, lbl.cx))
        lbl.cy = Math.max(lbl.h + 2, Math.min(ch - 2, lbl.cy))
      }

      /* 5 — Suavizar movimiento: lerp displayX/Y hacia cx/cy */
      const LERP = 0.12
      for (const lbl of labels) {
        if (!lbl.onScreen) {
          lbl.el.style.display = 'none'
          lbl.lineEl.style.display = 'none'
          continue
        }
        lbl.displayX += (lbl.cx - lbl.displayX) * LERP
        lbl.displayY += (lbl.cy - lbl.displayY) * LERP
        const dx = lbl.displayX - lbl.cx
        const dy = lbl.displayY - lbl.cy
        if (dx * dx + dy * dy < 0.25) {
          lbl.displayX = lbl.cx
          lbl.displayY = lbl.cy
        }
        lbl.el.style.display  = ''
        lbl.el.style.transform = `translate(${lbl.displayX}px,${lbl.displayY}px) translate(-50%,-100%)`
        const ldx = lbl.displayX - lbl.anchorSX
        const ldy = lbl.displayY - lbl.anchorSY
        if (ldx * ldx + ldy * ldy > 225) {
          lbl.lineEl.style.display = ''
          lbl.lineEl.setAttribute('x1', lbl.anchorSX)
          lbl.lineEl.setAttribute('y1', lbl.anchorSY)
          lbl.lineEl.setAttribute('x2', lbl.displayX)
          lbl.lineEl.setAttribute('y2', lbl.displayY)
        } else {
          lbl.lineEl.style.display = 'none'
        }
      }
    }

    function loop() {
      r.raf = requestAnimationFrame(loop)
      timer.update()
      const dt = timer.getDelta()
      tickMeshAnims(dt)
      tickCamAnim(dt)
      controls.update()
      renderer.render(scene, camera)
      updateLabelsOverlay()
    }
    loop()

    const pmWrapper = (e) => handlersRef.current.onPointerMove?.(e)
    const clWrapper = (e) => handlersRef.current.onClick?.(e)
    renderer.domElement.addEventListener('pointermove', pmWrapper, { passive: true })
    renderer.domElement.addEventListener('click', clWrapper)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(r.raf)
      clearTimeout(idleTimerRef.current)
      cleanupLabels()
      renderer.domElement.removeEventListener('pointermove', pmWrapper)
      renderer.domElement.removeEventListener('click', clWrapper)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      if (mount.contains(labelsOverlay)) mount.removeChild(labelsOverlay)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { scene, camera, controls } = R.current
    if (!scene) return

    /*
     * Bandera stale: en StrictMode (dev) React invoca los efectos dos veces.
     * La primera invocación se limpia antes de la segunda.  Si el callback
     * asíncrono del GLTFLoader de la primera invocación llega DESPUÉS
     * de que la segunda ya inició, escribiría meshes fantasma en
     * meshes.current, provocando que hover/click no funcionen.
     * Con `stale` el callback simplemente aborta si su efecto fue limpiado.
     */
    let stale = false

    setLoading(true)
    setTransitioning(true)
    setSelectedName(null)
    setSelectedStatus(null)
    setTooltip({ visible:false, name:'', x:0, y:0 })

    /* Limpiar labels del overlay antes de destruir los meshes */
    cleanupLabels()

    scene.children.slice().forEach(child => {
      if (child.isLight) return
      scene.remove(child)
      disposeObj(child)
    })
    meshes.current      = []
    animMap.current.clear()
    hoverRef.current    = null
    selectedRef.current = null
    camAnim.current.active = false

    new GLTFLoader().load(
      MODELS[activeModel].file,
      gltf => {
        /* Si este efecto fue desmontado (StrictMode) no tocar nada */
        if (stale) return

        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const cen = box.getCenter(new THREE.Vector3())
        model.position.sub(cen)
        scene.add(model)
        scene.updateMatrixWorld(true)

        /* Limpiar meshes por seguridad (doble protección) */
        meshes.current = []

        let n = 0
        model.traverse(node => {
          if (!node.isMesh) return
          n++
          node.name          = node.name?.trim() || `Parte ${n}`
          node.castShadow    = true
          node.receiveShadow = true
          node.material = Array.isArray(node.material)
            ? node.material.map(m => m.clone())
            : node.material.clone()
          const origWorldPos = new THREE.Vector3()
          node.getWorldPosition(origWorldPos)
          meshes.current.push({
            mesh:         node,
            origPos:      node.position.clone(),
            origWorldPos: origWorldPos.clone(),
            origScale:    node.scale.clone(),
            origColor:    getMeshColor(node).clone(),
            name:         node.name,
            _label:       null,
            _liftTimer:   null,
          })
        })

        /* ── Labels siempre visibles + tinte por estado ── */
        const nb = new THREE.Box3().setFromObject(model)
        const modelSize = nb.getSize(new THREE.Vector3())
        const modelMaxDim = Math.max(modelSize.x, modelSize.y, modelSize.z)
        const minRadius = modelMaxDim * MIN_LABEL_FRAC

        /* ── Crear labels en overlay DOM + tinte por estado ── */
        const overlay = R.current.labelsOverlay
        const svgEl   = R.current.labelsSvg
        labelsDataRef.current = []

        meshes.current.forEach(entry => {
          const bb = new THREE.Box3().setFromObject(entry.mesh)
          const sz = bb.getSize(new THREE.Vector3())
          const rad = Math.max(sz.x, sz.y, sz.z) / 2
          if (rad < minRadius) return

          const status = meshStatus(entry.name)
          const sColor = STATUS_COLORS[status]

          /* Tinte del material con el color de estado */
          const tinted = entry.origColor.clone().lerp(new THREE.Color(sColor), 0.30)
          setMeshColor(entry.mesh, tinted)
          entry.origColor = tinted.clone()

          /* Ancla = top center del bounding box (world space) */
          const anchor = new THREE.Vector3(
            (bb.min.x + bb.max.x) / 2,
            bb.max.y,
            (bb.min.z + bb.max.z) / 2,
          )
          const meshWP = new THREE.Vector3()
          entry.mesh.getWorldPosition(meshWP)
          const anchorOffset = anchor.clone().sub(meshWP)

          /* Crear div del label */
          const div = document.createElement('div')
          div.className = 'room-label'
          div.innerHTML =
            `<span class="label-dot"></span>` +
            `<span class="label-text">${entry.name}</span>`
          div.style.setProperty('--label-accent', sColor)
          overlay.appendChild(div)

          /* Línea SVG conectora */
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('class', 'label-connector')
          line.setAttribute('stroke', sColor)
          svgEl.appendChild(line)

          const data = {
            mesh: entry.mesh, anchorOffset,
            el: div, lineEl: line, name: entry.name,
            w: 0, h: 0, cx: 0, cy: 0,
            displayX: 0, displayY: 0,
            anchorSX: 0, anchorSY: 0,
            onScreen: false, behind: false,
          }
          labelsDataRef.current.push(data)
          entry._label = data
        })

        /* Medir tamaños reales tras append + init display pos */
        labelsDataRef.current.forEach(lbl => {
          const r = lbl.el.getBoundingClientRect()
          lbl.w = r.width  || 80
          lbl.h = r.height || 22
          lbl.displayX = lbl.cx
          lbl.displayY = lbl.cy
        })

        camera.updateProjectionMatrix()
        const { pos, target } = fitCamera(nb, camera, 48, 1.05)
        R.current.defaultPos.copy(pos)
        R.current.defaultTarget.copy(target)
        camera.position.copy(pos)
        controls.target.copy(target)
        controls.update()

        setLoading(false)
        setTransitioning(false)
        setLabelsVisible(true)
      },
      undefined,
      err => {
        if (stale) return
        console.error('GLB error', err)
        setLoading(false)
        setTransitioning(false)
      }
    )

    return () => { stale = true }
  }, [activeModel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (meshes.current.length === 0) return
    meshes.current.forEach(e => {
      if (e === selectedRef.current) return
      if (search.trim() && e.name.toLowerCase().includes(search.toLowerCase()))
        setMeshColor(e.mesh, C_FOUND)
      else
        setMeshColor(e.mesh, e.origColor)
    })
  }, [search])

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--color-surface)' }}>

      <div className="viewer-toolbar flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
        style={{
          background:'var(--color-site-white)',
          borderBottom:'1px solid var(--color-border)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
        }}>

        <div className="flex items-center gap-2 flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg"
          style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
          <Search size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="text-[13px] outline-none flex-1 min-w-0 bg-transparent"
            style={{ color:'var(--color-text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="rounded p-0.5 transition-opacity hover:opacity-70"
              style={{ color:'var(--color-text-muted)' }}>
              <X size={11} />
            </button>
          )}
        </div>

        <div className="w-px h-5 shrink-0 toolbar-divider" style={{ background:'var(--color-border)' }} />

        <div className="flex rounded-lg overflow-hidden shrink-0"
          style={{ border:'1px solid var(--color-border)' }}>
          {MODELS.map((m, i) => (
            <button key={i} onClick={() => switchModel(i)} disabled={transitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-all duration-200"
              style={{
                background:  i === activeModel ? 'var(--color-primary)' : 'var(--color-site-white)',
                color:       i === activeModel ? '#fff'                  : 'var(--color-text)',
                borderRight: i < MODELS.length - 1 ? '1px solid var(--color-border)' : 'none',
                opacity:     transitioning ? 0.5 : 1,
              }}>
              <Layers size={11} />
              <span className="btn-label">{m.label}</span>
              <span className="btn-short">{m.short}</span>
            </button>
          ))}
        </div>

        <button onClick={resetView} title="Resetear vista"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 shrink-0"
          style={{ background:'var(--color-bg)', color:'var(--color-text-muted)', border:'1px solid var(--color-border)' }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, { background:'var(--color-primary)', color:'#fff', borderColor:'var(--color-primary)' })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, { background:'var(--color-bg)', color:'var(--color-text-muted)', borderColor:'var(--color-border)' })}>
          <RotateCcw size={12} />
          <span className="btn-label">Resetear</span>
        </button>

        <div className="ml-auto shrink-0">
          {!selectedName && (
            <div className="flex items-center gap-1.5 text-[12px]"
              style={{ color:'var(--color-text-muted)' }}>
              <Building2 size={13} />
              <span className="btn-label">{MODELS[activeModel].label}</span>
              <span className="btn-short">{MODELS[activeModel].short}</span>
            </div>
          )}
        </div>
      </div>

      <div ref={mountRef} className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background:'rgba(238,238,238,0.92)', backdropFilter:'blur(8px)' }}>
            <div className="w-9 h-9 rounded-full border-[3px] animate-spin"
              style={{ borderColor:'var(--color-border)', borderTopColor:'var(--color-primary)' }} />
            <p className="text-[13px] font-semibold" style={{ color:'var(--color-text)' }}>
              Cargando — {MODELS[activeModel].label}
            </p>
          </div>
        )}
        {tooltip.visible && !selectedName && (
          <div className="absolute z-20 pointer-events-none"
            style={{ left: tooltip.x + 16, top: tooltip.y - 16 }}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold shadow-lg"
              style={{
                background:'rgba(17,17,17,0.86)', color:'#fff',
                border:'1px solid var(--color-primary)',
                whiteSpace:'nowrap', backdropFilter:'blur(6px)',
              }}>
              <Info size={11} />
              {tooltip.name}
            </div>
          </div>
        )}

        {/* ── Badge pieza seleccionada ── */}
        {selectedName && (
          <div className="selected-badge-wrap">
            <div className="selected-badge" style={{ '--badge-accent': STATUS_COLORS[selectedStatus] || '#94a3b8' }}>
              <span className="selected-badge-dot" />
              <span className="selected-badge-name">{selectedName}</span>
              <span className="selected-badge-status">{selectedStatus?.replace('_', ' ') ?? ''}</span>
            </div>
          </div>
        )}

        {!selectedName && (
          <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
            style={{
              background:'rgba(255,255,255,0.80)', color:'var(--color-text-muted)',
              border:'1px solid var(--color-border)', backdropFilter:'blur(4px)',
            }}>
            <RotateCcw size={11} />
            Tocar pieza para enfocar · 30s inactivo = vista general
          </div>
        )}
      </div>
    </div>
  )
}