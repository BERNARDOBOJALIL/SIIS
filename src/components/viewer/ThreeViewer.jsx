import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader }   from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer }          from 'three'
import {
  Search, X, Layers, Building2, RotateCcw, Info, Navigation2, XCircle,
  MapPin, Crosshair, ArrowRight,
} from 'lucide-react'
import { buildNavGraph, findPath, findTriangle } from './navPathfinding'

const MODELS = [
  { file: '/assempbfinal 1.glb', nav: '/NAVMESH_EXPORT_PB.glb', label: 'Planta Baja', short: 'PB', entryName: 'Sólido44-2', origin: [14.94, -4.60, 33.47] },
  { file: '/assempaiditfinal.glb', nav: '/NAVMESH_EXPORT_P1_FINAL.glb', label: 'Planta 1',    short: 'P1', entryName: 'Sólido27-1', origin: [12.63, -1.60, 31.42] },
]

const C_HOVER    = new THREE.Color(0xff3b3b)
const C_SELECTED = new THREE.Color(0xcc0000)
const C_FOUND    = new THREE.Color(0xff9500)

const ANIM_HOVER   = 280
const ANIM_CAM     = 1600
const ANIM_LIFT    = 700
const LIFT_DELAY   = 0.58
const HOVER_LIFT   = 2.4
const HOVER_OUT    = 1.3
const SELECT_LIFT_MIN = 0.35
const SELECT_LIFT_MAX = 1.2
const SELECT_LIFT_FACTOR = 0.2
const IDLE_TIMEOUT = 30000  // ms — inactividad para regresar a vista general
const SELECT_CAM_PAD = 1.01
const ROUTE_FRAME_MARGIN_FRAC = 1
const ROUTE_FRAME_MARGIN_ABS = 1
const ROUTE_FRAME_MIN_SPAN = 1
const ROUTE_INDICATOR_COLOR = 0x00eaff
const ROUTE_CLICK_Z_OFFSET = 20
const RENDER_PIXEL_RATIO_MAX = 1.25
const ENABLE_SHADOWS = false
const LABEL_UPDATE_FPS = 24
const POINTER_MOVE_INTERVAL_MS = 32

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
const DRACO_DECODER_PATH = '/draco/'

function meshStatus(name) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return STATUS_WEIGHTED[h % STATUS_WEIGHTED.length]
}

function formatEntryName(name) {
  if (!name) return ''
  const normalized = name
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/bañ|bano|banos|bath/i.test(normalized)) {
    return 'Baños'
  }

  const jCodes = [...normalized.matchAll(/[jJ][\s_-]?(\d{1,3})/g)]
    .map(([, code]) => `J-${String(Number.parseInt(code, 10)).padStart(3, '0')}`)
  const uniqueJCodes = [...new Set(jCodes)]
  if (uniqueJCodes.length > 0) {
    return uniqueJCodes.join(' / ')
  }

  return normalized
    .replace(/\s*\/\s*/g, ' / ')
    .trim()
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

const _raycaster = new THREE.Raycaster()
const _rayMouse  = new THREE.Vector2()

function doRaycast(nx, ny, camera, objects, recursive = false) {
  _rayMouse.set(nx, ny)
  _raycaster.setFromCamera(_rayMouse, camera)
  return _raycaster.intersectObjects(objects, recursive)
}

function getMeshColor(mesh) {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  return mat?.color ? mat.color.clone() : new THREE.Color(0xcccccc)
}

function setMeshColor(mesh, color) {
  const apply = m => { if (m?.color) m.color.set(color) }
  Array.isArray(mesh.material) ? mesh.material.forEach(apply) : apply(mesh.material)
}

function setObjectColor(obj, color) {
  obj.traverse(node => {
    if (node.isMesh) setMeshColor(node, color)
  })
}

function setEntryColor(entry, color) {
  const targets = entry?.colorMeshes?.length
    ? entry.colorMeshes
    : (entry?.focusMeshes?.length
      ? entry.focusMeshes
      : entry?.meshes)
  if (targets?.length) {
    targets.forEach(m => setMeshColor(m, color))
    return
  }
  if (entry?.mesh) setObjectColor(entry.mesh, color)
}

function getObjectColor(obj) {
  let color = null
  obj.traverse(node => {
    if (color || !node.isMesh) return
    color = getMeshColor(node)
  })
  return color ?? new THREE.Color(0xcccccc)
}

function countObjectMeshes(obj) {
  let count = 0
  obj.traverse(node => {
    if (node.isMesh) count++
  })
  return count
}

function collectObjectMeshes(obj) {
  const out = []
  obj.traverse(node => {
    if (node.isMesh) out.push(node)
  })
  return out
}

function getBoundsForMeshList(meshList) {
  const bb = new THREE.Box3().makeEmpty()
  meshList.forEach(m => bb.expandByObject(m))
  return bb
}

function getWeightedCenterFromMeshes(meshList) {
  if (!meshList || meshList.length === 0) return new THREE.Vector3()

  let wSum = 0
  let wx = 0, wy = 0, wz = 0
  let minY = Infinity
  let maxY = -Infinity

  meshList.forEach(m => {
    const bb = new THREE.Box3().setFromObject(m)
    if (bb.isEmpty()) return
    const sz = bb.getSize(new THREE.Vector3())
    const cen = bb.getCenter(new THREE.Vector3())
    const weight = Math.max(sz.x * sz.z, 0.0001)
    wx += cen.x * weight
    wy += cen.y * weight
    wz += cen.z * weight
    wSum += weight
    minY = Math.min(minY, bb.min.y)
    maxY = Math.max(maxY, bb.max.y)
  })

  if (wSum <= 0) return getBoundsForMeshList(meshList).getCenter(new THREE.Vector3())

  const out = new THREE.Vector3(wx / wSum, wy / wSum, wz / wSum)
  if (Number.isFinite(minY) && Number.isFinite(maxY)) {
    out.y = (minY + maxY) * 0.5
  }
  return out
}

function getVisualCenterFromMeshes(meshList) {
  if (!meshList || meshList.length === 0) return new THREE.Vector3()

  let samples = 0
  let sx = 0, sy = 0, sz = 0
  const tmp = new THREE.Vector3()
  const MAX_SAMPLES_PER_MESH = 5000

  meshList.forEach(mesh => {
    const pos = mesh.geometry?.attributes?.position
    if (!pos || pos.count === 0) return
    mesh.updateWorldMatrix(true, false)
    const step = Math.max(1, Math.ceil(pos.count / MAX_SAMPLES_PER_MESH))
    for (let i = 0; i < pos.count; i += step) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      sx += tmp.x
      sy += tmp.y
      sz += tmp.z
      samples++
    }
  })

  if (samples > 0) {
    return new THREE.Vector3(sx / samples, sy / samples, sz / samples)
  }

  return getWeightedCenterFromMeshes(meshList)
}

function collectFrontierMeshes(root) {
  const meshes = []
  let minDepth = Infinity
  const stack = [{ node: root, depth: 0 }]

  while (stack.length > 0) {
    const { node, depth } = stack.pop()
    if (node.isMesh) {
      if (depth < minDepth) {
        minDepth = depth
        meshes.length = 0
        meshes.push(node)
      } else if (depth === minDepth) {
        meshes.push(node)
      }
      continue
    }
    node.children.forEach(child => stack.push({ node: child, depth: depth + 1 }))
  }

  return meshes
}

function getEntryMeshList(entry, mode = 'focus') {
  if (!entry) return []
  if (mode === 'full') {
    if (entry.meshes?.length) return entry.meshes
    return entry.mesh ? [entry.mesh] : []
  }
  if (entry.focusMeshes?.length) return entry.focusMeshes
  if (entry.meshes?.length) return entry.meshes
  return entry.mesh ? [entry.mesh] : []
}

function getEntryBounds(entry, mode = 'focus') {
  const list = getEntryMeshList(entry, mode)
  if (list.length > 0) return getBoundsForMeshList(list)
  return new THREE.Box3().setFromObject(entry.mesh)
}

function getEntryWorldCenter(entry, mode = 'focus') {
  if (mode === 'focus' && entry?.visualCenterLocal) {
    return entry.mesh.localToWorld(entry.visualCenterLocal.clone())
  }
  const list = getEntryMeshList(entry, mode)
  if (list.length > 0) return getWeightedCenterFromMeshes(list)
  return getEntryBounds(entry, mode).getCenter(new THREE.Vector3())
}

function getLargestMeshByVolume(meshList) {
  let best = null
  let bestVolume = -1
  meshList.forEach(m => {
    const bb = new THREE.Box3().setFromObject(m)
    const sz = bb.getSize(new THREE.Vector3())
    const volume = sz.x * sz.y * sz.z
    if (volume > bestVolume) {
      bestVolume = volume
      best = m
    }
  })
  return best
}

const _labelAnchorRay = new THREE.Raycaster()

function getEntryLabelAnchorWorld(entry) {
  const bb = getEntryBounds(entry, 'focus')
  if (bb.isEmpty()) return getEntryWorldCenter(entry)
  const size = bb.getSize(new THREE.Vector3())
  const center = getEntryWorldCenter(entry, 'focus')
  const rayStartY = bb.max.y + Math.max(2, size.y * 2)
  const maxSpan = Math.max(size.x, size.z, 0.5)
  const radius = maxSpan * 0.22
  const sampleOffsets = [
    [0, 0],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [0.72, 0.72], [0.72, -0.72], [-0.72, 0.72], [-0.72, -0.72],
  ]

  let bestHit = null
  let bestD2 = Infinity
  for (const [ox, oz] of sampleOffsets) {
    const origin = new THREE.Vector3(
      center.x + ox * radius,
      rayStartY,
      center.z + oz * radius,
    )
    _labelAnchorRay.set(origin, new THREE.Vector3(0, -1, 0))
    const hits = _labelAnchorRay.intersectObjects(getEntryMeshList(entry, 'focus'), false)
    if (hits.length === 0) continue
    const h = hits[0]
    const dx = h.point.x - center.x
    const dz = h.point.z - center.z
    const d2 = dx * dx + dz * dz
    if (d2 < bestD2) {
      bestD2 = d2
      bestHit = h
    }
  }

  if (bestHit) return bestHit.point.clone()

  return new THREE.Vector3(
    center.x,
    bb.min.y + Math.min(0.4, Math.max(size.y * 0.1, 0.05)),
    center.z,
  )
}

function resolveInteractiveRoots(model) {
  const meshChildren = node => node.children
    .map(child => ({ child, meshCount: countObjectMeshes(child) }))
    .filter(item => item.meshCount > 0)

  let container = model
  while (container.children.length === 1 && !container.children[0].isMesh) {
    container = container.children[0]
  }

  const MAX_DESCENT = 10
  for (let i = 0; i < MAX_DESCENT; i++) {
    const layer = meshChildren(container)
    if (layer.length === 0) break
    if (layer.length === 1) {
      container = layer[0].child
      continue
    }

    /* If one branch is overwhelmingly dominant (e.g., real model + tiny helper),
       descend into it so we don't keep a wrapper level as interactive root. */
    const total = layer.reduce((acc, it) => acc + it.meshCount, 0)
    const sorted = [...layer].sort((a, b) => b.meshCount - a.meshCount)
    const first = sorted[0]
    const second = sorted[1]
    const dominant = total > 0
      && (first.meshCount / total) >= 0.85
      && (!second || (second.meshCount / total) <= 0.15)

    if (dominant) {
      container = first.child
      continue
    }

    return layer.map(it => it.child)
  }

  const finalLayer = meshChildren(container)
  if (finalLayer.length > 0) return finalLayer.map(it => it.child)
  if (countObjectMeshes(container) > 0) return [container]
  return []
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

function fitCamera(bbox, camera, elevDeg, padMult, azimuthRad = 0) {
  const sphere   = bbox.getBoundingSphere(new THREE.Sphere())
  const fovHalf  = THREE.MathUtils.degToRad(camera.fov / 2)
  const hFovHalf = Math.atan(Math.tan(fovHalf) * camera.aspect)
  const distV = sphere.radius / Math.tan(fovHalf)
  const distH = sphere.radius / Math.tan(hFovHalf)
  const dist  = Math.max(distV, distH) * padMult
  const elev  = THREE.MathUtils.degToRad(elevDeg)
  const horiz = dist * Math.cos(elev)
  const pos   = new THREE.Vector3(
    sphere.center.x + horiz * Math.sin(azimuthRad),
    sphere.center.y + dist  * Math.sin(elev),
    sphere.center.z + horiz * Math.cos(azimuthRad),
  )
  return { pos, target: sphere.center.clone() }
}

function fitCameraTopDown(bbox, camera, padMult = 1.08) {
  const size = bbox.getSize(new THREE.Vector3())
  const center = bbox.getCenter(new THREE.Vector3())
  const fovHalf  = THREE.MathUtils.degToRad(camera.fov / 2)
  const hFovHalf = Math.atan(Math.tan(fovHalf) * camera.aspect)
  const distX = (size.x * 0.5) / Math.tan(hFovHalf)
  const distZ = (size.z * 0.5) / Math.tan(fovHalf)
  const dist = Math.max(distX, distZ, 1.2) * padMult
  return {
    pos: new THREE.Vector3(center.x, center.y + dist, center.z),
    target: center.clone(),
  }
}

function topDownFitDistanceForBBox(bbox, camera, padMult = 1.0) {
  const size = bbox.getSize(new THREE.Vector3())
  const fovHalf  = THREE.MathUtils.degToRad(camera.fov / 2)
  const hFovHalf = Math.atan(Math.tan(fovHalf) * camera.aspect)
  const distX = (size.x * 0.5) / Math.tan(hFovHalf)
  const distZ = (size.z * 0.5) / Math.tan(fovHalf)
  return Math.max(distX, distZ, 0.8) * padMult
}

function getEntryFrameFromSolids(entry, focusPoint = null) {
  const meshes = getEntryMeshList(entry, 'full')
  if (!meshes || meshes.length === 0) {
    const bbox = getEntryBounds(entry, 'full')
    const center = bbox.getCenter(new THREE.Vector3())
    return {
      bbox,
      center,
      maxY: bbox.max.y,
    }
  }

  const solids = []

  meshes.forEach(mesh => {
    const bb = new THREE.Box3().setFromObject(mesh)
    if (bb.isEmpty()) return
    const size = bb.getSize(new THREE.Vector3())
    const center = bb.getCenter(new THREE.Vector3())
    solids.push({
      center,
      minX: bb.min.x,
      maxX: bb.max.x,
      minZ: bb.min.z,
      maxZ: bb.max.z,
      minY: bb.min.y,
      maxY: bb.max.y,
      weight: Math.max(size.x * size.z, 0.0001),
    })
  })

  if (solids.length === 0) {
    const bbox = getEntryBounds(entry, 'full')
    const center = bbox.getCenter(new THREE.Vector3())
    return {
      bbox,
      center,
      maxY: bbox.max.y,
    }
  }

  let frameSolids = solids
  if (focusPoint && solids.length > 4) {
    const ranked = solids
      .map(s => ({
        ...s,
        dist: Math.hypot(s.center.x - focusPoint.x, s.center.z - focusPoint.z),
      }))
      .sort((a, b) => a.dist - b.dist)

    const qIdx = Math.max(0, Math.floor((ranked.length - 1) * 0.75))
    const qDist = ranked[qIdx].dist
    const dynamicRadius = Math.max(6, qDist + Math.max(3, qDist * 0.6))
    const nearby = ranked.filter(s => s.dist <= dynamicRadius)
    frameSolids = nearby.length > 0 ? nearby : [ranked[0]]
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  frameSolids.forEach(s => {
    minX = Math.min(minX, s.minX)
    maxX = Math.max(maxX, s.maxX)
    minZ = Math.min(minZ, s.minZ)
    maxZ = Math.max(maxZ, s.maxZ)
    minY = Math.min(minY, s.minY)
    maxY = Math.max(maxY, s.maxY)
  })

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
    const bbox = getEntryBounds(entry, 'full')
    const center = bbox.getCenter(new THREE.Vector3())
    return {
      bbox,
      center,
      maxY: bbox.max.y,
    }
  }

  if ((maxX - minX) < 0.8) {
    const cx = (minX + maxX) * 0.5
    minX = cx - 0.4
    maxX = cx + 0.4
  }
  if ((maxZ - minZ) < 0.8) {
    const cz = (minZ + maxZ) * 0.5
    minZ = cz - 0.4
    maxZ = cz + 0.4
  }

  const y0 = Number.isFinite(minY) ? minY : 0
  const y1 = Number.isFinite(maxY) ? maxY : 0

  const bbox = new THREE.Box3(
    new THREE.Vector3(minX, y0, minZ),
    new THREE.Vector3(maxX, y1, maxZ),
  )

  const center = bbox.getCenter(new THREE.Vector3())

  return {
    bbox,
    center,
    maxY: y1,
  }
}

function fitEntryCameraTopDown(entry, camera, padMult = 1.02, focusPoint = null) {
  const frame = getEntryFrameFromSolids(entry, focusPoint)
  const dist = topDownFitDistanceForBBox(frame.bbox, camera, padMult)
  return {
    bbox: frame.bbox,
    pos: new THREE.Vector3(frame.center.x, frame.maxY + dist, frame.center.z),
    target: frame.center.clone(),
  }
}

function fitRouteCameraTopDown(points, camera, padMult = 1.0) {
  if (!points || points.length === 0) return null
  const bb = new THREE.Box3()
  points.forEach(p => bb.expandByPoint(p))
  if (bb.isEmpty()) return null

  const center = bb.getCenter(new THREE.Vector3())
  const size = bb.getSize(new THREE.Vector3())
  const marginX = Math.max(ROUTE_FRAME_MARGIN_ABS, size.x * ROUTE_FRAME_MARGIN_FRAC)
  const marginZ = Math.max(ROUTE_FRAME_MARGIN_ABS, size.z * ROUTE_FRAME_MARGIN_FRAC)
  const halfX = Math.max(
    (size.x * 0.5) + marginX,
    ROUTE_FRAME_MIN_SPAN * 0.5,
  )
  const halfZ = Math.max(
    (size.z * 0.5) + marginZ,
    ROUTE_FRAME_MIN_SPAN * 0.5,
  )
  bb.min.x = center.x - halfX
  bb.max.x = center.x + halfX
  bb.min.z = center.z - halfZ
  bb.max.z = center.z + halfZ

  return fitCameraTopDown(bb, camera, padMult)
}

export default function ThreeViewer() {
  const mountRef = useRef(null)
  const dracoLoaderRef = useRef(null)

  const R = useRef({
    renderer: null, scene: null, camera: null,
    controls: null, timer: null, raf: null,
    labelsOverlay: null, labelsSvg: null,
    defaultPos:    new THREE.Vector3(0, 28, 42),
    defaultTarget: new THREE.Vector3(0, 0, 0),
  })

  const meshes      = useRef([])
  const pickablesRef = useRef([])
  const focusPickablesRef = useRef([])
  const pickableToEntryRef = useRef(new Map())
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
    fromUp: new THREE.Vector3(0, 1, 0),
    toUp:   new THREE.Vector3(0, 1, 0),
  })
  const handlersRef = useRef({ onPointerMove: null, onClick: null, onLabelClick: null })
  const idleTimerRef = useRef(null)   // timeout de inactividad 30s
  const labelsDataRef = useRef([])
  const tooltipRef = useRef({ visible:false, name:'', x:0, y:0 })
  const lastPointerMoveRef = useRef(0)

  const [activeModel,   setActiveModel]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [tooltip,       setTooltip]       = useState({ visible:false, name:'', x:0, y:0 })
  const [search,        setSearch]        = useState('')
  const [selectedName,  setSelectedName]  = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)

  /* ── Navigation state ── */
  const navGraphRef  = useRef(null)      // built nav graph
  const navLineRef   = useRef(null)      // THREE.Mesh for route tube
  const navDotRef    = useRef(null)      // animated dot group
  const navAnimRef   = useRef({ active: false, t: 0, pathLen: 0, points: [] })
  const navDebugRef  = useRef(null)      // debug wireframe mesh
  const navMarkersRef = useRef([])       // origin/dest marker meshes
  const navOriginPt  = useRef(null)      // THREE.Vector3 — clicked origin (building space)
  const navDestPt    = useRef(null)      // THREE.Vector3 — clicked dest (building space)
  const navOffsetRef = useRef(new THREE.Vector3()) // scene->nav offset (added before pathfinding)
  const modelCenterRef = useRef(new THREE.Vector3())
  const [navMode,      setNavMode]      = useState(false)   // navigation panel open
  const [navOrigin,    setNavOrigin]     = useState(null)    // display label for origin
  const [navDest,      setNavDest]       = useState(null)    // display label for dest
  const [navActive,    setNavActive]     = useState(false)   // route displayed

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
    /* When showing all, reset per-label hiding */
    if (visible) {
      labelsDataRef.current.forEach(lbl => { lbl._hidden = false })
    }
  }

  /** Show only the label for `key`; hide all others */
  function showOnlyLabel(key) {
    const el = R.current.labelsOverlay
    if (!el) return
    el.style.opacity = '1'
    labelsDataRef.current.forEach(lbl => {
      lbl._hidden = lbl.key !== key
    })
  }

  /** Show only labels whose keys are in `keys` set; hide the rest */
  function showOnlyLabels(keys) {
    const el = R.current.labelsOverlay
    if (!el) return
    el.style.opacity = '1'
    labelsDataRef.current.forEach(lbl => {
      lbl._hidden = !keys.has(lbl.key)
    })
  }

  function commitTooltip(next) {
    const prev = tooltipRef.current
    const changedIdentity = prev.visible !== next.visible || prev.name !== next.name
    const movedEnough = Math.abs(next.x - prev.x) > 10 || Math.abs(next.y - prev.y) > 10
    tooltipRef.current = next
    if (changedIdentity || (next.visible && movedEnough)) {
      setTooltip(next)
    }
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
    /* Up vector: if destination looks straight down, use Z- as up to
       avoid gimbal lock; otherwise standard Y-up */
    const fromUp = camera.up.clone()
    const toUp   = Math.abs(toDir.y) > 0.99
      ? new THREE.Vector3(0, 0, -1)
      : new THREE.Vector3(0, 1, 0)
    camAnim.current = {
      active: true, t: 0,
      fromTarget: fTgt, toTarget: tTgt,
      toPos: toPos.clone(),
      fromDist, toDist,
      fromDir,
      qEnd: new THREE.Quaternion().setFromUnitVectors(fromDir, toDir),
      fromUp, toUp,
    }
  }

  function toParentLocalDelta(entry, worldPoint, worldDelta) {
    if (!entry.mesh.parent) return worldDelta.clone()
    const fromLocal = entry.mesh.parent.worldToLocal(worldPoint.clone())
    const toLocal   = entry.mesh.parent.worldToLocal(worldPoint.clone().add(worldDelta))
    return toLocal.sub(fromLocal)
  }

  function hoverLocalTarget(entry) {
    const center = entry.origWorldPos
    const outDir = new THREE.Vector3(center.x, 0, center.z)
    const len = outDir.length()
    if (len > 0.01) outDir.divideScalar(len)
    else outDir.set(0, 0, 1)
    const deltaWorld = outDir.clone().multiplyScalar(HOVER_OUT)
      .add(new THREE.Vector3(0, HOVER_LIFT, 0))
    const localDelta = toParentLocalDelta(entry, center, deltaWorld)
    return entry.origPos.clone().add(localDelta)
  }

  function liftLocalTarget(entry, extraHeight) {
    const center = getEntryWorldCenter(entry)
    const deltaWorld = new THREE.Vector3(0, extraHeight, 0)
    const localDelta = toParentLocalDelta(entry, center, deltaWorld)
    return entry.mesh.position.clone().add(localDelta)
  }

  function deselectEntry(entry) {
    clearTimeout(entry._liftTimer)
    entry._liftTimer = null
    setEntryColor(entry, entry.origColor)
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
    if (navMode || navActive) {
      idleTimerRef.current = null
      return
    }
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
    exitNavigation()
    setActiveModel(idx)
  }

  /* ── Navigation helpers ── */
  function clearRouteVisuals() {
    const scene = R.current.scene
    if (navLineRef.current) {
      navLineRef.current.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
      scene?.remove(navLineRef.current)
      navLineRef.current = null
    }
    if (navDotRef.current) {
      navDotRef.current.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
      scene?.remove(navDotRef.current)
      navDotRef.current = null
    }
    navAnimRef.current = { active: false, t: 0, pathLen: 0, polylinePoints: [] }
  }

  function clearNavMarkers() {
    const scene = R.current.scene
    navMarkersRef.current.forEach(m => {
      m.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
      scene?.remove(m)
    })
    navMarkersRef.current = []
  }

  function addNavMarker(point, color, type) {
    const scene = R.current.scene
    const group = new THREE.Group()
    group.position.copy(point)

    if (type === 'origin') {
      /* ORIGIN: pulsing ring on ground + vertical beam */
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 2.0, 48),
        new THREE.MeshBasicMaterial({ color: 0x22cc44, transparent: true, opacity: 0.55, depthTest: false, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.08
      ring.renderOrder = 1000
      group.add(ring)
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 2.6, 48),
        new THREE.MeshBasicMaterial({ color: 0x22cc44, transparent: true, opacity: 0.25, depthTest: false, side: THREE.DoubleSide }),
      )
      ring2.rotation.x = -Math.PI / 2
      ring2.position.y = 0.06
      ring2.renderOrder = 999
      group.add(ring2)
      /* Vertical glow beam */
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 6, 8),
        new THREE.MeshBasicMaterial({ color: 0x22cc44, transparent: true, opacity: 0.4, depthTest: false }),
      )
      beam.position.y = 3
      beam.renderOrder = 1001
      group.add(beam)
      /* Label "TÚ" sprite */
      const canvas = document.createElement('canvas')
      canvas.width = 128; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#22cc44'
      ctx.roundRect(0, 0, 128, 64, 12)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 36px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TÚ', 64, 32)
      const tex = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(3.2, 1.6, 1)
      sprite.position.y = 7
      sprite.renderOrder = 1002
      group.add(sprite)
    } else {
      /* DEST: big inverted drop pin + flag */
      const pin = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 2.0, 16),
        new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false }),
      )
      pin.rotation.x = Math.PI  // point downward
      pin.position.y = 1.0
      pin.renderOrder = 1001
      group.add(pin)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false }),
      )
      head.position.y = 2.8
      head.renderOrder = 1002
      group.add(head)
      /* Inner dot */
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
      )
      dot.position.y = 2.8
      dot.renderOrder = 1003
      group.add(dot)
      /* Glow pulse ring */
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 2.2, 48),
        new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.06
      ring.renderOrder = 999
      group.add(ring)
      /* "DESTINO" label sprite */
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ff2222'
      ctx.roundRect(0, 0, 256, 64, 12)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 30px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('DESTINO', 128, 32)
      const tex = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(5.0, 1.25, 1)
      sprite.position.y = 5
      sprite.renderOrder = 1004
      group.add(sprite)
    }

    scene.add(group)
    navMarkersRef.current.push(group)
  }

  function clearNavDebug() {
    const scene = R.current.scene
    if (navDebugRef.current) {
      scene?.remove(navDebugRef.current)
      navDebugRef.current.geometry?.dispose()
      if (Array.isArray(navDebugRef.current.material))
        navDebugRef.current.material.forEach(m => m.dispose())
      else
        navDebugRef.current.material?.dispose()
      navDebugRef.current = null
    }
  }

  function exitNavigation() {
    clearRouteVisuals()
    clearNavMarkers()
    clearNavDebug()
    navOriginPt.current = null
    navDestPt.current = null
    setNavMode(false)
    setNavOrigin(null)
    setNavDest(null)
    setNavActive(false)
    if (selectedRef.current) deselectEntry(selectedRef.current)
    /* Restore all labels and return camera to default */
    setLabelsVisible(true)
    startCamAnim(R.current.defaultPos, R.current.defaultTarget)
  }

  function dedupePolylinePoints(pts, minDistSq = 0.0001) {
    if (!pts || pts.length === 0) return []
    const out = [pts[0].clone()]
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].distanceToSquared(out[out.length - 1]) <= minDistSq) continue
      out.push(pts[i].clone())
    }
    return out
  }

  /** Compute cumulative distances along a polyline and total length */
  function polylineDistances(pts) {
    const dists = [0]
    let total = 0
    for (let i = 1; i < pts.length; i++) {
      total += pts[i].distanceTo(pts[i - 1])
      dists.push(total)
    }
    return { dists, total }
  }

  /** Sample a point along a polyline at parameter t ∈ [0,1] */
  function samplePolyline(pts, dists, totalLen, t) {
    const d = t * totalLen
    for (let i = 1; i < pts.length; i++) {
      if (d <= dists[i]) {
        const segLen = dists[i] - dists[i - 1]
        const frac = segLen > 0 ? (d - dists[i - 1]) / segLen : 0
        return new THREE.Vector3().lerpVectors(pts[i - 1], pts[i], frac)
      }
    }
    return pts[pts.length - 1].clone()
  }

  function sceneToNavPoint(point) {
    return point.clone().add(navOffsetRef.current)
  }

  function navToScenePoint(point) {
    return point.clone().sub(navOffsetRef.current)
  }

  function nearestReachableNavPoint(from, to, graph) {
    const startTri = findTriangle(from, graph)
    if (startTri == null || startTri < 0) return null

    const triCount = graph.triCount ?? graph.centroids.length
    const visited = new Uint8Array(triCount)
    const queue = [startTri]
    let qHead = 0
    visited[startTri] = 1

    let bestTri = startTri
    let bestD2 = Infinity

    while (qHead < queue.length) {
      const tri = queue[qHead++]
      const c = graph.centroids[tri]
      const dx = c.x - to.x
      const dz = c.z - to.z
      const d2 = dx * dx + dz * dz
      if (d2 < bestD2) {
        bestD2 = d2
        bestTri = tri
      }

      const nbs = graph.adj[tri] || []
      for (const nb of nbs) {
        if (visited[nb]) continue
        visited[nb] = 1
        queue.push(nb)
      }
    }

    if (bestTri == null) return null
    const p = graph.centroids[bestTri].clone()
    p.y = to.y
    return p
  }

  function buildRoute() {
    const graph = navGraphRef.current
    const fromScene = navOriginPt.current
    const toScene   = navDestPt.current
    if (!graph || !fromScene || !toScene) return

    clearRouteVisuals()
    if (selectedRef.current) deselectEntry(selectedRef.current)

    const fromNav = sceneToNavPoint(fromScene)
    const toNav = sceneToNavPoint(toScene)

    let routeTargetNav = toNav.clone()
    let waypointsNav = findPath(fromNav.clone(), routeTargetNav.clone(), graph)
    if (!waypointsNav || waypointsNav.length < 2) {
      const fallback = nearestReachableNavPoint(fromNav, toNav, graph)
      if (fallback) {
        routeTargetNav = fallback
        waypointsNav = findPath(fromNav.clone(), routeTargetNav.clone(), graph)
        if (waypointsNav && waypointsNav.length >= 2) {
          const fallbackScene = navToScenePoint(routeTargetNav)
          navDestPt.current = fallbackScene.clone()
          while (navMarkersRef.current.length > 1) {
            const old = navMarkersRef.current.pop()
            old.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
            R.current.scene?.remove(old)
          }
          addNavMarker(fallbackScene, 0xff3333, 'dest')
        }
      }
    }
    if (!waypointsNav || waypointsNav.length < 2) {
      return
    }

    const routeTargetScene = navToScenePoint(routeTargetNav)
    const waypoints = waypointsNav.map(p => navToScenePoint(p.clone()))

    /* Flatten Y to the building floor level */
    const floorY = Math.min(fromScene.y, routeTargetScene.y) + 0.15
    waypoints.forEach(p => { p.y = floorY })

    const routePoints = dedupePolylinePoints(waypoints)
    if (routePoints.length < 2) return

    const { dists, total: pathLen } = polylineDistances(routePoints)

    /* ── Route group ── */
    const routeGroup = new THREE.Group()
    routeGroup.renderOrder = 999

    /* ── Outer glow (wide flat segments) ── */
    const segmentForward = new THREE.Vector3(0, 0, 1)
    for (let i = 1; i < routePoints.length; i++) {
      const a = routePoints[i - 1], b = routePoints[i]
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      if (len < 0.01) continue
      dir.normalize()
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff2200, transparent: true, opacity: 0.22,
        depthTest: false, side: THREE.DoubleSide,
      })
      const box = new THREE.Mesh(new THREE.BoxGeometry(
        1.2,
        0.06,
        len,
      ), mat)
      box.position.copy(mid)
      box.quaternion.setFromUnitVectors(segmentForward, dir)
      box.renderOrder = 998
      routeGroup.add(box)
    }

    /* ── Core line (bright, solid) ── */
    const coreGeo = new THREE.BufferGeometry().setFromPoints(routePoints)
    const coreMat = new THREE.LineBasicMaterial({
      color: 0xff0000, linewidth: 2, depthTest: false,
    })
    const coreLine = new THREE.Line(coreGeo, coreMat)
    coreLine.renderOrder = 999
    routeGroup.add(coreLine)

    /* ── Animated dashed line overlay ── */
    const dashGeo = new THREE.BufferGeometry().setFromPoints(routePoints)
    const dashMat = new THREE.LineDashedMaterial({
      color: 0xffffff, transparent: true, opacity: 0.7,
      dashSize: 1.0, gapSize: 0.6, depthTest: false,
    })
    const dashLine = new THREE.Line(dashGeo, dashMat)
    dashLine.computeLineDistances()
    dashLine.renderOrder = 1000
    routeGroup.add(dashLine)

    R.current.scene.add(routeGroup)
    navLineRef.current = routeGroup

    /* ── Animated arrow dot (cone + sphere + glow) ── */
    const dotGroup = new THREE.Group()
    const innerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 20, 14),
      new THREE.MeshBasicMaterial({
        color: ROUTE_INDICATOR_COLOR,
        depthTest: false,
        depthWrite: false,
      }),
    )
    innerSphere.renderOrder = 1003
    dotGroup.add(innerSphere)

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 1.45, 18),
      new THREE.MeshBasicMaterial({
        color: ROUTE_INDICATOR_COLOR,
        depthTest: false,
        depthWrite: false,
      }),
    )
    cone.rotation.x = Math.PI / 2
    cone.position.z = 0.95
    cone.renderOrder = 1003
    dotGroup.add(cone)

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.14, 16, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        depthTest: false,
        depthWrite: false,
      }),
    )
    halo.rotation.x = Math.PI / 2
    halo.renderOrder = 1002
    dotGroup.add(halo)

    const outerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.65, 20, 14),
      new THREE.MeshBasicMaterial({
        color: ROUTE_INDICATOR_COLOR,
        depthTest: false,
        depthWrite: false,
      }),
    )
    outerGlow.renderOrder = 1001
    dotGroup.add(outerGlow)

    dotGroup.position.copy(routePoints[0])
    dotGroup.userData.outerGlow = outerGlow
    dotGroup.userData.halo = halo
    R.current.scene.add(dotGroup)
    navDotRef.current = dotGroup

    /* Store anim data — polyline-based instead of curve */
    navAnimRef.current = {
      active: true, t: 0,
      pathLen,
      polylinePoints: routePoints,
      dists,
      dashMat,
      points: routePoints,
    }

    /* Frame camera to route extents only for maximum readable route zoom. */
    const framePoints = [...routePoints]
    framePoints.push(fromScene.clone())
    framePoints.push((navDestPt.current ?? routeTargetScene).clone())
    const routeFrame = fitRouteCameraTopDown(framePoints, R.current.camera, 1.0)
    if (routeFrame) {
      startCamAnim(routeFrame.pos, routeFrame.target)
    }
    setNavActive(true)
  }

  function enterNavMode() {
    if (selectedRef.current) deselectEntry(selectedRef.current)
    navDestPt.current = null
    setNavDest(null)
    setNavActive(false)
    clearRouteVisuals()
    clearNavMarkers()
    /* Fixed origin per floor */
    const o = MODELS[activeModel].origin
    const originPt = new THREE.Vector3(o[0], o[1], o[2])
    navOriginPt.current = originPt
    setNavOrigin('Entrada')
    addNavMarker(originPt, 0x22cc44, 'origin')
    setNavMode(true)
  }

  handlersRef.current.onLabelClick = function(entryKey) {
    const { camera, defaultPos, defaultTarget } = R.current
    if (!camera || meshes.current.length === 0) return
    const entry = meshes.current.find(m => m.key === entryKey)
    if (!entry) return

    if (navMode) {
      /* Navigate to this piece */
      const center = getEntryWorldCenter(entry, 'full')
      const pt = center.clone()
      pt.z += ROUTE_CLICK_Z_OFFSET

      navDestPt.current = pt
      setNavDest(entry.name)
      clearRouteVisuals()
      while (navMarkersRef.current.length > 1) {
        const old = navMarkersRef.current.pop()
        old.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
        R.current.scene?.remove(old)
      }
      addNavMarker(pt, 0xff3333, 'dest')
      const NEIGHBOR_DIST = 8
      const visibleKeys = new Set([entry.key])
      meshes.current.forEach(m => {
        const wp = getEntryWorldCenter(m)
        if (wp.distanceTo(center) < NEIGHBOR_DIST) visibleKeys.add(m.key)
      })
      showOnlyLabels(visibleKeys)
      buildRoute()
      return
    }

    /* Normal mode — select this piece */
    const prev = selectedRef.current
    if (prev === entry) {
      deselectEntry(entry)
      startCamAnim(defaultPos, defaultTarget)
      return
    }
    if (prev) deselectEntry(prev)
    setEntryColor(entry, C_SELECTED)
    selectedRef.current = entry
    setSelectedName(entry.name)
    setSelectedStatus(meshStatus(entry.rawName ?? entry.name))
    showOnlyLabel(entry.key)
    const focusPoint = getEntryWorldCenter(entry, 'focus')
    const { bbox, pos: camPos, target: camTarget } = fitEntryCameraTopDown(entry, camera, SELECT_CAM_PAD, focusPoint)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()
    const pieceSize = bbox.getSize(new THREE.Vector3())
    const maxSz = Math.max(pieceSize.x, pieceSize.y, pieceSize.z, 0.5)
    const liftHeight = Math.min(SELECT_LIFT_MAX, Math.max(maxSz * SELECT_LIFT_FACTOR, SELECT_LIFT_MIN))
    entry._liftTimer = setTimeout(() => {
      if (selectedRef.current === entry)
        startMeshAnim(entry, liftLocalTarget(entry, liftHeight), ANIM_LIFT, easeInOutQuart)
    }, ANIM_CAM * LIFT_DELAY)
  }

  handlersRef.current.onPointerMove = function(e) {
    const { camera, renderer } = R.current
    if (!camera || !renderer || meshes.current.length === 0) return
    const now = performance.now()
    if (now - lastPointerMoveRef.current < POINTER_MOVE_INTERVAL_MS) return
    lastPointerMoveRef.current = now
    resetIdleTimer()   // cualquier movimiento reinicia el timer de 30s
    const { nx, ny, cx, cy } = toNDC(e, renderer.domElement)
    const rayTargets = focusPickablesRef.current.length > 0
      ? focusPickablesRef.current
      : pickablesRef.current
    const hits     = doRaycast(nx, ny, camera, rayTargets)
    const prev     = hoverRef.current
    const hitEntry = hits.length > 0
      ? pickableToEntryRef.current.get(hits[0].object.uuid) ?? null
      : null
    if (hitEntry !== prev) {
      if (prev && prev !== selectedRef.current) {
        setEntryColor(prev, prev.origColor)
        startMeshAnim(prev, prev.origPos)
      }
      if (hitEntry && hitEntry !== selectedRef.current) {
        setEntryColor(hitEntry, C_HOVER)
        startMeshAnim(hitEntry, hoverLocalTarget(hitEntry))
      }
      hoverRef.current = hitEntry
      renderer.domElement.style.cursor = hitEntry ? 'pointer' : 'default'
    }
    commitTooltip(hitEntry
      ? { visible:true,  name:hitEntry.name, x:cx, y:cy }
      : { visible:false, name:'',            x:cx, y:cy }
    )
  }

  handlersRef.current.onClick = function(e) {
    const { camera, renderer, defaultPos, defaultTarget } = R.current
    if (!camera || !renderer || meshes.current.length === 0) return
    const { nx, ny } = toNDC(e, renderer.domElement)
    const rayTargets = navMode
      ? pickablesRef.current
      : (focusPickablesRef.current.length > 0 ? focusPickablesRef.current : pickablesRef.current)
    const hits = doRaycast(nx, ny, camera, rayTargets)

    /* ── Navigation mode: click places origin / dest ── */
    if (navMode) {
      if (hits.length === 0) return
      const entry = pickableToEntryRef.current.get(hits[0].object.uuid) ?? null
      const label = entry ? entry.name : 'punto'
      /* Use building surface hit; conversion to nav coordinates is handled
        in buildRoute using the computed scene->nav offset. */
      const pt = hits[0].point.clone()
      pt.z += ROUTE_CLICK_Z_OFFSET

      /* Origin is always fixed (set in enterNavMode), click only sets dest */
      navDestPt.current = pt
      setNavDest(label)
      clearRouteVisuals()
      /* Keep only origin marker, remove old dest marker */
      while (navMarkersRef.current.length > 1) {
        const old = navMarkersRef.current.pop()
        old.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
        R.current.scene?.remove(old)
      }
      addNavMarker(pt, 0xff3333, 'dest')
      /* Show labels for dest + contiguous solids so user can orient */
      const NEIGHBOR_DIST = 8  // max distance to consider "contiguous"
      const destWorld = hits[0].point.clone()
      const visibleKeys = new Set(entry ? [entry.key] : [])
      meshes.current.forEach(m => {
        const wp = getEntryWorldCenter(m)
        if (wp.distanceTo(destWorld) < NEIGHBOR_DIST) visibleKeys.add(m.key)
      })
      showOnlyLabels(visibleKeys)
      buildRoute()
      return
    }

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
    const entry = pickableToEntryRef.current.get(hits[0].object.uuid) ?? null
    if (!entry) return
    if (prev === entry) {
      deselectEntry(entry)
      startCamAnim(defaultPos, defaultTarget)
      return
    }
    if (prev) deselectEntry(prev)
    setEntryColor(entry, C_SELECTED)
    selectedRef.current = entry
    setSelectedName(entry.name)
    setSelectedStatus(meshStatus(entry.rawName ?? entry.name))
    showOnlyLabel(entry.key)

    const hitPoint = hits[0].point.clone()
    const { bbox, pos: camPos, target: camTarget } = fitEntryCameraTopDown(entry, camera, SELECT_CAM_PAD, hitPoint)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()
    const pieceSize = bbox.getSize(new THREE.Vector3())
    const maxSz     = Math.max(pieceSize.x, pieceSize.y, pieceSize.z, 0.5)
    const liftHeight = Math.min(SELECT_LIFT_MAX, Math.max(maxSz * SELECT_LIFT_FACTOR, SELECT_LIFT_MIN))
    entry._liftTimer = setTimeout(() => {
      if (selectedRef.current === entry)
        startMeshAnim(entry, liftLocalTarget(entry, liftHeight), ANIM_LIFT, easeInOutQuart)
    }, ANIM_CAM * LIFT_DELAY)
  }

  useEffect(() => {
    const mount = mountRef.current
    const r     = R.current

    if (!dracoLoaderRef.current) {
      const draco = new DRACOLoader()
      draco.setDecoderPath(DRACO_DECODER_PATH)
      dracoLoaderRef.current = draco
    }

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER_PIXEL_RATIO_MAX))
    renderer.outputColorSpace    = THREE.SRGBColorSpace
    renderer.shadowMap.enabled   = ENABLE_SHADOWS
    renderer.shadowMap.type      = THREE.PCFShadowMap
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1)
    mount.appendChild(renderer.domElement)
    r.renderer = renderer

    const timer = new Timer()
    r.timer = timer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xd5d5d5)
    scene.fog = new THREE.FogExp2(0xd5d5d5, 0.003)
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
    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    const sun = new THREE.DirectionalLight(0xffffff, 3.2)
    sun.position.set(0, 50, 0)
    sun.castShadow = ENABLE_SHADOWS
    if (ENABLE_SHADOWS) {
      sun.shadow.mapSize.setScalar(1024)
      sun.shadow.camera.near = 0.5
      sun.shadow.camera.far  = 200
      sun.shadow.camera.left = sun.shadow.camera.bottom = -60
      sun.shadow.camera.right = sun.shadow.camera.top   =  60
      sun.shadow.bias = -0.001
    }
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
    const _upTmp  = new THREE.Vector3()
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
      /* Interpolate up vector to avoid gimbal lock at 90° */
      _upTmp.lerpVectors(a.fromUp, a.toUp, ease).normalize()
      R.current.camera.up.copy(_upTmp)
      R.current.camera.lookAt(tx, ty, tz)
      if (a.t >= 1) {
        R.current.camera.position.copy(a.toPos)
        R.current.controls.target.copy(a.toTarget)
        R.current.camera.up.copy(a.toUp)
        R.current.camera.lookAt(a.toTarget)
        a.active = false
      }
    }

    /* ── Label overlay: proyección + anti-overlap cada frame ── */
    const _projV  = new THREE.Vector3()
    const _anchorW = new THREE.Vector3()
    function updateLabelsOverlay() {
      const labels = labelsDataRef.current
      if (labels.length === 0) return
      const cw = renderer.domElement.clientWidth
      const ch = renderer.domElement.clientHeight
      if (cw === 0 || ch === 0) return
      const PAD = 10

      /* 1 — Proyectar anclas a coordenadas de pantalla */
      for (const lbl of labels) {
        _anchorW.copy(lbl.anchorLocal)
        lbl.mesh.localToWorld(_anchorW)
        _projV.copy(_anchorW)
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
        if (!lbl.onScreen || lbl._hidden) continue
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

      /* 3b — Pass vertical de seguridad para reducir solapes residuales */
      vis.sort((a, b) => a.cy - b.cy)
      for (let i = 0; i < vis.length; i++) {
        const a = vis[i]
        for (let j = i + 1; j < vis.length; j++) {
          const b = vis[j]
          const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(a.cx - b.cx)
          const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs((a.cy - a.h / 2) - (b.cy - b.h / 2))
          if (overlapX <= 0 || overlapY <= 0) continue
          b.cy += overlapY + 2
          const side = a.cx <= b.cx ? 1 : -1
          b.cx += side * Math.min(14, overlapX / 2 + 2)
        }
      }

      /* 4 — Acotar dentro del viewport */
      for (const lbl of vis) {
        lbl.cx = Math.max(lbl.w / 2 + 2, Math.min(cw - lbl.w / 2 - 2, lbl.cx))
        lbl.cy = Math.max(lbl.h + 2, Math.min(ch - 2, lbl.cy))
      }

      /* 5 — Suavizar movimiento: lerp displayX/Y hacia cx/cy */
      const LERP = 0.12
      for (const lbl of labels) {
        if (!lbl.onScreen || lbl._hidden) {
          lbl.el.style.display = 'none'
          lbl.lineEl.style.display = 'none'
          continue
        }
        if (!lbl.initialized) {
          lbl.displayX = lbl.cx
          lbl.displayY = lbl.cy
          lbl.initialized = true
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

    /* ── Nav dot animation (polyline-based) ── */
    const _fwd = new THREE.Vector3()
    const _lookAt = new THREE.Vector3()
    function tickNavAnim(dt) {
      const a = navAnimRef.current
      if (!a.active || !navDotRef.current) return
      const speed = 6  // world units per second
      a.t += (dt * speed) / (a.pathLen || 1)
      if (a.t > 1) a.t -= 1   // loop

      /* Position along polyline */
      const pt = samplePolyline(a.polylinePoints, a.dists, a.pathLen, a.t)
      const bob = 0.18 * Math.sin(a.t * Math.PI * 18)
      navDotRef.current.position.set(pt.x, pt.y + bob, pt.z)

      /* Orient arrow in direction of travel */
      const lookT = Math.min(a.t + 0.005, 1)
      const ahead = samplePolyline(a.polylinePoints, a.dists, a.pathLen, lookT)
      _fwd.subVectors(ahead, pt)
      if (_fwd.lengthSq() > 0.0001) {
        _lookAt.copy(ahead)
        _lookAt.y = pt.y + bob
        navDotRef.current.lookAt(_lookAt)
      }

      /* Scale pulse */
      const pulse = 1.05 + 0.40 * Math.abs(Math.sin(a.t * Math.PI * 20))
      navDotRef.current.scale.setScalar(pulse)

      /* Solid outer shells pulse by scale (no transparency). */
      const { outerGlow, halo } = navDotRef.current.userData
      if (outerGlow) {
        const glowPulse = 1 + 0.30 * Math.abs(Math.sin(a.t * Math.PI * 18))
        outerGlow.scale.setScalar(glowPulse)
      }
      if (halo) {
        const ringPulse = 1 + 0.22 * Math.abs(Math.sin(a.t * Math.PI * 18))
        halo.scale.setScalar(ringPulse)
      }

      /* Animate dash offset for scrolling dashes */
      if (a.dashMat) {
        a.dashMat.dashOffset -= dt * 8
      }
    }

    let labelAcc = 0

    function loop() {
      r.raf = requestAnimationFrame(loop)
      timer.update()
      const dt = timer.getDelta()
      tickMeshAnims(dt)
      tickCamAnim(dt)
      tickNavAnim(dt)
      if (!camAnim.current.active) controls.update()
      else controls.target.copy(controls.target) // keep internal state in sync
      renderer.render(scene, camera)
      labelAcc += dt
      if (labelAcc >= (1 / LABEL_UPDATE_FPS)) {
        updateLabelsOverlay()
        labelAcc = 0
      }
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
      dracoLoaderRef.current?.dispose()
      dracoLoaderRef.current = null
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
    const emptyTooltip = { visible:false, name:'', x:0, y:0 }
    tooltipRef.current = emptyTooltip
    setTooltip(emptyTooltip)

    /* Limpiar labels del overlay antes de destruir los meshes */
    cleanupLabels()

    scene.children.slice().forEach(child => {
      if (child.isLight) return
      scene.remove(child)
      disposeObj(child)
    })
    meshes.current      = []
    pickablesRef.current = []
    focusPickablesRef.current = []
    pickableToEntryRef.current.clear()
    animMap.current.clear()
    hoverRef.current    = null
    selectedRef.current = null
    camAnim.current.active = false
    navGraphRef.current = null
    navOffsetRef.current.set(0, 0, 0)
    modelCenterRef.current.set(0, 0, 0)
    clearRouteVisuals()
    clearNavMarkers()
    clearNavDebug()

    const modelLoader = new GLTFLoader()
    if (dracoLoaderRef.current) modelLoader.setDRACOLoader(dracoLoaderRef.current)

    modelLoader.load(
      MODELS[activeModel].file,
      gltf => {
        /* Si este efecto fue desmontado (StrictMode) no tocar nada */
        if (stale) return

        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const cen = box.getCenter(new THREE.Vector3())
        modelCenterRef.current.copy(cen)
        model.position.sub(cen)
        scene.add(model)
        scene.updateMatrixWorld(true)

        /* Limpiar meshes por seguridad (doble protección) */
        meshes.current = []
        pickablesRef.current = []
        focusPickablesRef.current = []
        pickableToEntryRef.current.clear()

        const interactiveRoots = resolveInteractiveRoots(model)
        let n = 0
        interactiveRoots.forEach(root => {
          const objectMeshes = collectObjectMeshes(root)
          if (objectMeshes.length === 0) return

          const frontierMeshes = collectFrontierMeshes(root)
          const focusCandidates = frontierMeshes.length > 0
            ? frontierMeshes
            : objectMeshes
          const dominantFocusMesh = getLargestMeshByVolume(focusCandidates)
            ?? getLargestMeshByVolume(objectMeshes)
          const focusMeshes = dominantFocusMesh ? [dominantFocusMesh] : focusCandidates

          n++
          const rawName = root.name?.trim() || `Zona ${n}`
          const displayName = formatEntryName(rawName)
          root.name = rawName

          const colorMeshSet = new Set(focusMeshes)

          objectMeshes.forEach(m => {
            m.castShadow = ENABLE_SHADOWS
            m.receiveShadow = ENABLE_SHADOWS
            if (!colorMeshSet.has(m)) return
            m.material = Array.isArray(m.material)
              ? m.material.map(mat => mat?.clone?.() ?? mat)
              : (m.material?.clone?.() ?? m.material)
          })

          const origWorldPos = getVisualCenterFromMeshes(focusMeshes)
          const visualCenterLocal = root.worldToLocal(origWorldPos.clone())
          const entry = {
            key:          root.uuid,
            mesh:         root,
            meshes:       objectMeshes,
            focusMeshes,
            colorMeshes:  focusMeshes,
            visualCenterLocal,
            origPos:      root.position.clone(),
            origWorldPos: origWorldPos.clone(),
            origScale:    root.scale.clone(),
            origColor:    getObjectColor(dominantFocusMesh ?? root).clone(),
            rawName,
            name:         displayName,
            _label:       null,
            _liftTimer:   null,
          }
          meshes.current.push(entry)

          objectMeshes.forEach(m => {
            pickablesRef.current.push(m)
            pickableToEntryRef.current.set(m.uuid, entry)
          })
          focusMeshes.forEach(m => {
            focusPickablesRef.current.push(m)
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
          const bb = getEntryBounds(entry, 'full')
          const sz = bb.getSize(new THREE.Vector3())
          const rad = Math.max(sz.x, sz.y, sz.z) / 2
          if (rad < minRadius) return

          const status = meshStatus(entry.rawName ?? entry.name)
          const sColor = STATUS_COLORS[status]

          /* Tinte del material con el color de estado */
          const tinted = entry.origColor.clone().lerp(new THREE.Color(sColor), 0.45)
          setEntryColor(entry, tinted)
          entry.origColor = tinted.clone()

          /* Ancla = top center del bounding box (world space) */
          const anchor = getEntryLabelAnchorWorld(entry)
          const anchorLocal = entry.mesh.worldToLocal(anchor.clone())

          /* Crear div del label */
          const div = document.createElement('div')
          div.className = 'room-label'

          const dot = document.createElement('span')
          dot.className = 'label-dot'
          div.appendChild(dot)

          const text = document.createElement('span')
          text.className = 'label-text'
          text.textContent = entry.name
          div.appendChild(text)
          div.style.setProperty('--label-accent', sColor)
          div.style.cursor = 'pointer'
          div.addEventListener('click', (e) => {
            e.stopPropagation()
            handlersRef.current.onLabelClick?.(entry.key)
          })
          overlay.appendChild(div)

          /* Línea SVG conectora */
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('class', 'label-connector')
          line.setAttribute('stroke', sColor)
          svgEl.appendChild(line)

          const data = {
            mesh: entry.mesh, anchorLocal,
            el: div, lineEl: line, name: entry.name, key: entry.key,
            w: 0, h: 0, cx: 0, cy: 0,
            displayX: 0, displayY: 0, initialized: false,
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

        /* ── Load nav mesh for pathfinding ── */
        const navFile = MODELS[activeModel].nav
        if (navFile) {
          const navLoader = new GLTFLoader()
          if (dracoLoaderRef.current) navLoader.setDRACOLoader(dracoLoaderRef.current)

          navLoader.load(navFile, navGltf => {
            if (stale) return
            const navScene = navGltf.scene
            /* Nav and building are centered independently; keep the
              resulting offset so we can convert points scene<->nav
              consistently during pathfinding and rendering. */
            const navBox = new THREE.Box3().setFromObject(navScene)
            const navCen = navBox.getCenter(new THREE.Vector3())
            navScene.position.sub(navCen)
            navOffsetRef.current.copy(modelCenterRef.current).sub(navCen)
            navScene.updateMatrixWorld(true)

            let navGeo = null
            let navMatrix = new THREE.Matrix4()
            navScene.traverse(n => {
              if (n.isMesh && !navGeo) {
                navGeo = n.geometry
                navMatrix = n.matrixWorld.clone()
              }
            })
            if (navGeo) {
              const graph = buildNavGraph(navGeo, navMatrix)
              navGraphRef.current = graph
            }
          })
        }
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

  /* Route is now built directly in onClick handler, no effect needed */

  useEffect(() => {
    const controls = R.current.controls
    if (!controls) return

    if (navActive) {
      controls.enableRotate = true
      controls.enablePan = true
      controls.enableZoom = true
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI
      return
    }

    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI * 0.88
  }, [navActive])

  useEffect(() => {
    if (meshes.current.length === 0) return
    const q = search.trim().toLowerCase()
    meshes.current.forEach(e => {
      if (e === selectedRef.current) return
      const hit = q && (
        e.name.toLowerCase().includes(q)
        || (e.rawName?.toLowerCase()?.includes(q) ?? false)
      )
      if (hit)
        setEntryColor(e, C_FOUND)
      else
        setEntryColor(e, e.origColor)
    })
  }, [search])

  function findSearchMatch(query) {
    const q = query.trim().toLowerCase()
    if (!q || meshes.current.length === 0) return null

    const exact = meshes.current.find(e => {
      const name = e.name.toLowerCase()
      const raw = e.rawName?.toLowerCase() ?? ''
      return name === q || raw === q
    })
    if (exact) return exact

    const startsWith = meshes.current.find(e => {
      const name = e.name.toLowerCase()
      const raw = e.rawName?.toLowerCase() ?? ''
      return name.startsWith(q) || raw.startsWith(q)
    })
    if (startsWith) return startsWith

    return meshes.current.find(e => {
      const name = e.name.toLowerCase()
      const raw = e.rawName?.toLowerCase() ?? ''
      return name.includes(q) || raw.includes(q)
    }) ?? null
  }

  function triggerSearchSelection() {
    const match = findSearchMatch(search)
    if (!match) return
    handlersRef.current.onLabelClick?.(match.key)
  }

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
          <button
            onClick={triggerSearchSelection}
            disabled={!search.trim()}
            className="rounded p-0.5 transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color:'var(--color-text-muted)', flexShrink:0 }}>
            <Search size={13} />
          </button>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                triggerSearchSelection()
              }
            }}
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

        <button onClick={navMode ? exitNavigation : enterNavMode} title={navMode ? 'Salir navegación' : 'Navegar'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 shrink-0"
          style={{
            background: navMode ? 'var(--color-primary)' : 'var(--color-bg)',
            color:      navMode ? '#fff' : 'var(--color-text-muted)',
            border:     `1px solid ${navMode ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}>
          <Navigation2 size={12} />
          <span className="btn-label">{navMode ? 'Salir' : 'Navegar'}</span>
          <span className="btn-short">Nav</span>
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
        {selectedName && !navMode && (
          <div className="selected-badge-wrap">
            <div className="selected-badge" style={{ '--badge-accent': STATUS_COLORS[selectedStatus] || '#94a3b8' }}>
              <span className="selected-badge-dot" />
              <span className="selected-badge-name">{selectedName}</span>
              <span className="selected-badge-status">{selectedStatus?.replace('_', ' ') ?? ''}</span>
            </div>
          </div>
        )}

        {/* ── Navigation panel overlay ── */}
        {navMode && (
          <div className="nav-panel">
            <div className="nav-panel-header">
              <Navigation2 size={15} />
              <span>Navegación</span>
              <button onClick={exitNavigation} className="nav-close-btn" title="Salir de navegación">
                <X size={16} />
              </button>
            </div>

            <div className="nav-panel-body">
              {/* Origin row */}
              <div className="nav-row">
                <span className="nav-row-icon nav-row-icon--origin">
                  <Crosshair size={14} />
                </span>
                <div className="nav-row-text">
                  <span className="nav-row-label">Tu ubicación</span>
                  <span className="nav-row-value">{navOrigin || '—'}</span>
                </div>
              </div>

              <div className="nav-row-divider"><ArrowRight size={12} /></div>

              {/* Dest row */}
              <div className="nav-row">
                <span className={`nav-row-icon nav-row-icon--dest${navDest ? '' : ' nav-row-icon--waiting'}`}>
                  <MapPin size={14} />
                </span>
                <div className="nav-row-text">
                  <span className="nav-row-label">Destino</span>
                  <span className="nav-row-value">
                    {navDest || <em className="nav-row-hint">Toca una pieza en el modelo</em>}
                  </span>
                </div>
              </div>

              {/* Route status */}
              {navActive && (
                <div className="nav-route-status">
                  <span className="nav-dot-anim" />
                  <span>Ruta calculada</span>
                </div>
              )}

              {/* Change destination button */}
              {navDest && (
                <button
                  className="nav-change-dest-btn"
                  onClick={() => {
                    clearRouteVisuals()
                    /* Remove dest markers, keep origin marker */
                    while (navMarkersRef.current.length > 1) {
                      const old = navMarkersRef.current.pop()
                      old.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
                      R.current.scene?.remove(old)
                    }
                    navDestPt.current = null
                    setNavDest(null)
                    setNavActive(false)
                    setLabelsVisible(true)
                  }}
                >
                  <MapPin size={14} />
                  Cambiar destino
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Exit nav button (large, always visible when navigating) ── */}
        {navActive && (
          <button onClick={exitNavigation} className="nav-exit-fab">
            <XCircle size={20} />
            <span>Salir de navegación</span>
          </button>
        )}

        {!selectedName && !navMode && (
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