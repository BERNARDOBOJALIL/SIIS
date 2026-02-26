import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer }         from 'three'
import {
  Search, X, Layers, Building2, RotateCcw, ZoomIn, Info,
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
    defaultPos:    new THREE.Vector3(0, 28, 42),
    defaultTarget: new THREE.Vector3(0, 0, 0),
  })

  const meshes      = useRef([])
  const animMap     = useRef(new Map())
  const hoverRef    = useRef(null)
  const selectedRef = useRef(null)
  const camAnim     = useRef({
    active: false, t: 0,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
  })
  const handlersRef = useRef({ onPointerMove: null, onClick: null })
  const idleTimerRef = useRef(null)   // timeout de inactividad 30s

  const [activeModel,   setActiveModel]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [tooltip,       setTooltip]       = useState({ visible:false, name:'', x:0, y:0 })
  const [search,        setSearch]        = useState('')
  const [selectedName,  setSelectedName]  = useState(null)

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
    camAnim.current = {
      active:     true, t: 0,
      fromPos:    camera.position.clone(),
      toPos:      toPos.clone(),
      fromTarget: controls.target.clone(),
      toTarget:   toTarget.clone(),
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
  }

  function resetView() {
    if (selectedRef.current) deselectEntry(selectedRef.current)
    startCamAnim(R.current.defaultPos, R.current.defaultTarget)
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

    /*
     * Usar fitCamera con el bbox de la pieza individual.
     * Esto calcula la distancia correcta considerando tanto el FOV vertical
     * como el horizontal y la bounding sphere, así piezas alargadas, anchas
     * o de cualquier proporción quedan perfectamente centradas y completas.
     */
    /*
     * Cámara perpendicular (casi cenital, 88°) sobre la pieza.
     * fitCamera calcula la distancia exacta para que quepa completa
     * sin importar forma o tamaño.
     */
    const bbox = new THREE.Box3().setFromObject(entry.mesh)
    const { pos: camPos, target: camTarget } = fitCamera(bbox, camera, 88, 1.45)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()  // no aplicar idle mientras hay selección
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const sun = new THREE.DirectionalLight(0xfff8f0, 2.6)
    sun.position.set(14, 24, 12)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far  = 200
    sun.shadow.bias = -0.001
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.55)
    fill.position.set(-10, 8, -12)
    scene.add(fill)
    scene.add(new THREE.DirectionalLight(0xffffff, 0.3)).position.set(0, -5, -20)

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

    function tickCamAnim(dt) {
      const a = camAnim.current
      if (!a.active) return
      a.t = Math.min(1, a.t + (dt * 1000) / ANIM_CAM)
      const ease = easeInOutCubic(a.t)
      R.current.camera.position.lerpVectors(a.fromPos, a.toPos, ease)
      R.current.controls.target.lerpVectors(a.fromTarget, a.toTarget, ease)
      if (a.t >= 1) {
        R.current.camera.position.copy(a.toPos)
        R.current.controls.target.copy(a.toTarget)
        a.active = false
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
      renderer.domElement.removeEventListener('pointermove', pmWrapper)
      renderer.domElement.removeEventListener('click', clWrapper)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
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
    setTooltip({ visible:false, name:'', x:0, y:0 })

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
            _liftTimer:   null,
          })
        })

        const nb = new THREE.Box3().setFromObject(model)
        camera.updateProjectionMatrix()
        const { pos, target } = fitCamera(nb, camera, 48, 1.05)
        R.current.defaultPos.copy(pos)
        R.current.defaultTarget.copy(target)
        camera.position.copy(pos)
        controls.target.copy(target)
        controls.update()

        setLoading(false)
        setTransitioning(false)
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

      <div className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
        style={{
          background:'var(--color-site-white)',
          borderBottom:'1px solid var(--color-border)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
        }}>

        <div className="flex items-center gap-2 flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg"
          style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
          <Search size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pieza…"
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

        <div className="w-px h-5 shrink-0" style={{ background:'var(--color-border)' }} />

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
              {m.label}
            </button>
          ))}
        </div>

        <button onClick={resetView} title="Resetear vista"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 shrink-0"
          style={{ background:'var(--color-bg)', color:'var(--color-text-muted)', border:'1px solid var(--color-border)' }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, { background:'var(--color-primary)', color:'#fff', borderColor:'var(--color-primary)' })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, { background:'var(--color-bg)', color:'var(--color-text-muted)', borderColor:'var(--color-border)' })}>
          <RotateCcw size={12} />
          Resetear
        </button>

        <div className="ml-auto shrink-0">
          {selectedName ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background:'var(--color-primary)', color:'#fff' }}>
              <ZoomIn size={12} />
              {selectedName}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px]"
              style={{ color:'var(--color-text-muted)' }}>
              <Building2 size={13} />
              {MODELS[activeModel].label}
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
        {tooltip.visible && (
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
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
          style={{
            background:'rgba(255,255,255,0.80)', color:'var(--color-text-muted)',
            border:'1px solid var(--color-border)', backdropFilter:'blur(4px)',
          }}>
          <RotateCcw size={11} />
          Arrastrar · Scroll · Click pieza para enfocar · 30s inactivo = vista general
        </div>
      </div>
    </div>
  )
}