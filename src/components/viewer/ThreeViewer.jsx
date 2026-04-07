import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader }   from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader }    from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer }          from 'three'
import {
  Search, X, Layers, Building2, RotateCcw, Info, Navigation2, XCircle,
  MapPin, Crosshair, ArrowRight, Eye, EyeOff,
} from 'lucide-react'
import { buildNavGraph, findPath, findTriangle, nearestReachablePointInComponent } from './navPathfinding'

const MODELS = [
  { file: '/assempbfinal 1.glb', nav: '/NAVMESH_EXPORT_PB.glb', label: 'Planta Baja', short: 'PB', entryName: 'Sólido44-2', origin: [12.94, -4.60, 32.47] },
  { file: '/assempaiditfinal.glb', nav: '/NAVMESH_EXPORT_PA.glb', label: 'Planta Alta',    short: 'PA', entryName: 'Sólido27-1', origin: [22.3, -1.60, 29] },
]
const ASSET_REVISION = '20260406-1'

function withAssetRevision(url) {
  if (!url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}rev=${ASSET_REVISION}`
}

const C_HOVER    = new THREE.Color(0xff3b3b)
const C_SELECTED = new THREE.Color(0xcc0000)
const C_FOUND    = new THREE.Color(0xff9500)

const ANIM_HOVER   = 280
const ANIM_CAM     = 1600
const ANIM_LIFT    = 700
const LIFT_DELAY   = 0.58
const HOVER_LIFT   = 2.4
const HOVER_OUT    = 1.3
const SELECT_LIFT_FIXED = 0.68
const SELECT_LIFT_REF_SIZE = 12
const SELECT_LIFT_MIN = 0.22
const SELECT_LIFT_MAX = 0.92
const SELECT_CAMERA_FIXED_DIST = 18
const IDLE_TIMEOUT = 30000  // ms — inactividad para regresar a vista general
const SELECT_CAM_PAD = 1.003
const ROUTE_FRAME_PAD_MULT = 1.2
const ROUTE_FRAME_MARGIN_FRAC = 0.05
const ROUTE_FRAME_MARGIN_ABS = 0.42
const ROUTE_FRAME_MARGIN_MAX = 1.35
const ROUTE_FRAME_MIN_SPAN = 1.8
const ROUTE_INDICATOR_COLOR = 0x00eaff
const ROUTE_CLICK_Z_OFFSET = 20
const ORTHO_AXIS_SNAP_ABS = 0.55
const ORTHO_AXIS_SNAP_RATIO = 0.14
const ORTHO_ZIGZAG_SHORT_SEG = 1.8
const ORTHO_ZIGZAG_RETURN_TOL = 0.22
const RENDER_PIXEL_RATIO_MAX = 2
const ENABLE_SHADOWS = false
const LABEL_UPDATE_FPS = 24
const POINTER_MOVE_INTERVAL_MS = 50
const DEV_STATS_LOG_INTERVAL_MS = 4000
const LABEL_OVERLAP_MIN_DIST = 34
const LABEL_OVERLAP_ITER_LOAD = 24
const LABEL_OVERLAP_ITER_DYNAMIC = 10
const LABEL_MOVE_LERP = 0.52

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
const KTX2_TRANSCODER_PATH = 'https://unpkg.com/three@0.183.1/examples/jsm/libs/basis/'
const MATERIAL_TEXTURE_KEYS = [
  'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap',
  'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap',
  'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
  'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap',
  'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap',
]

function formatProgressMB(bytes = 0) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`
}

function buildGlbErrorMessage(err, filePath) {
  const raw = String(err?.message ?? err ?? '').trim()
  const lower = raw.toLowerCase()

  if (lower.includes('unexpected token') && lower.includes("token 'v'")) {
    return `No se pudo cargar ${filePath}: parece ser un puntero de Git LFS o una caché vieja del Service Worker. Ejecuta 'git lfs pull' y limpia caché del navegador.`
  }
  if (lower.includes('version ht') || lower.includes('git-lfs.github.com/spec/v1')) {
    return `No se pudo cargar ${filePath}: el archivo contiene un puntero de Git LFS (o respuesta cacheada antigua). Ejecuta 'git lfs pull' y limpia caché del navegador.`
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return `No se encontró ${filePath}. Verifica nombre y ruta dentro de /public.`
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return `No se pudo descargar ${filePath}. Revisa conexión de red y que el servidor de Vite esté activo.`
  }

  return `No se pudo cargar ${filePath}. ${raw || 'Error desconocido al parsear GLB.'}`
}

function disposeMaterialTextures(material, seenTextures = null) {
  if (!material) return
  MATERIAL_TEXTURE_KEYS.forEach(key => {
    const tex = material[key]
    if (!tex?.isTexture) return
    if (seenTextures && seenTextures.has(tex)) return
    seenTextures?.add(tex)
    tex.dispose()
  })
}

function optimizeTextureForRealtime(texture, renderer, optimizedTextures) {
  if (!texture?.isTexture || optimizedTextures.has(texture)) return
  optimizedTextures.add(texture)

  const maxAnisotropy = Math.max(
    1,
    Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1),
  )
  texture.anisotropy = maxAnisotropy

  const width = texture.image?.width ?? 0
  const height = texture.image?.height ?? 0
  const canMipMap = THREE.MathUtils.isPowerOfTwo(width) && THREE.MathUtils.isPowerOfTwo(height)
  texture.generateMipmaps = canMipMap
  texture.minFilter = canMipMap ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
}

function optimizeMeshForRealtime(mesh, renderer, optimizedTextures) {
  if (!mesh?.isMesh) return

  // OPT: enforce culling and cached bounds for cheaper per-frame visibility tests.
  mesh.frustumCulled = true
  if (mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    mesh.geometry.attributes?.position?.setUsage?.(THREE.StaticDrawUsage)
  }

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  materials.forEach(material => {
    if (!material) return
    MATERIAL_TEXTURE_KEYS.forEach(key => {
      optimizeTextureForRealtime(material[key], renderer, optimizedTextures)
    })
  })
}

function buildMaterialCacheKey(material) {
  if (!material) return null
  return [
    material.type,
    material.map?.uuid ?? '-',
    material.normalMap?.uuid ?? '-',
    material.roughnessMap?.uuid ?? '-',
    material.metalnessMap?.uuid ?? '-',
    material.emissiveMap?.uuid ?? '-',
    material.transparent ? 1 : 0,
    material.opacity ?? 1,
    material.side ?? 0,
    material.vertexColors ? 1 : 0,
    material.flatShading ? 1 : 0,
    material.color?.getHexString?.() ?? '-',
    material.roughness ?? '-',
    material.metalness ?? '-',
  ].join('|')
}

function getCachedMaterial(material, materialCache) {
  if (!material || !materialCache) return material
  const key = buildMaterialCacheKey(material)
  if (!key) return material
  const cached = materialCache.get(key)
  if (cached) return cached
  materialCache.set(key, material)
  return material
}

function applyMaterialCache(material, materialCache) {
  if (Array.isArray(material)) {
    return material.map(mat => getCachedMaterial(mat, materialCache))
  }
  return getCachedMaterial(material, materialCache)
}

function createLoadingPlaceholderModel() {
  const group = new THREE.Group()

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(24, 24, 0.24, 40),
    new THREE.MeshBasicMaterial({ color: 0xbebebe, transparent: true, opacity: 0.22 }),
  )
  floor.position.y = -0.6

  const wireShell = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8.5, 30),
    new THREE.MeshBasicMaterial({
      color: 0x9a9a9a,
      wireframe: true,
      transparent: true,
      opacity: 0.34,
    }),
  )
  wireShell.position.y = 3.8

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(9, 10, 9),
    new THREE.MeshBasicMaterial({ color: 0xd6d6d6, transparent: true, opacity: 0.42 }),
  )
  core.position.y = 4.7

  group.add(floor)
  group.add(wireShell)
  group.add(core)
  return group
}

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

function parseFirstJCodeNumber(value) {
  if (!value) return null
  const match = value.match(/\bJ[\s_-]?(\d{1,3})\b/i)
  if (!match) return null
  const codeNum = Number.parseInt(match[1], 10)
  return Number.isFinite(codeNum) ? codeNum : null
}

function formatJCode(codeNum) {
  return `J-${String(codeNum).padStart(3, '0')}`
}

function getRangeGap(minA, maxA, minB, maxB) {
  if (maxA < minB) return minB - maxA
  if (maxB < minA) return minA - maxB
  return 0
}

function buildConsecutiveJGroups(entries) {
  const bboxCache = new Map()

  function getEntryBoundsCached(entry) {
    const cached = bboxCache.get(entry.key)
    if (cached) return cached
    const bounds = getEntryBounds(entry, 'full').clone()
    bboxCache.set(entry.key, bounds)
    return bounds
  }

  function areEntriesAdjacent(entryA, entryB) {
    if (!entryA || !entryB) return false

    const bbA = getEntryBoundsCached(entryA)
    const bbB = getEntryBoundsCached(entryB)
    if (bbA.isEmpty() || bbB.isEmpty()) return false

    const sizeA = bbA.getSize(new THREE.Vector3())
    const sizeB = bbB.getSize(new THREE.Vector3())
    const minPlanarSize = Math.max(
      0.5,
      Math.min(
        Math.max(sizeA.x, sizeA.z),
        Math.max(sizeB.x, sizeB.z),
      ),
    )

    const planarTol = THREE.MathUtils.clamp(minPlanarSize * 0.16, 0.25, 1.1)
    const yTol = THREE.MathUtils.clamp((sizeA.y + sizeB.y) * 0.25, 0.35, 1.5)

    const xGap = getRangeGap(bbA.min.x, bbA.max.x, bbB.min.x, bbB.max.x)
    const yGap = getRangeGap(bbA.min.y, bbA.max.y, bbB.min.y, bbB.max.y)
    const zGap = getRangeGap(bbA.min.z, bbA.max.z, bbB.min.z, bbB.max.z)

    if (yGap > yTol) return false

    const axisTouch =
      (xGap <= planarTol && zGap <= (planarTol * 0.35))
      || (zGap <= planarTol && xGap <= (planarTol * 0.35))

    if (axisTouch) return true

    const planarGap = Math.sqrt((xGap * xGap) + (zGap * zGap))
    return planarGap <= (planarTol * 0.75)
  }

  const codes = []
  entries.forEach(entry => {
    const codeNum = parseFirstJCodeNumber(entry.name)
      ?? parseFirstJCodeNumber(entry.rawName ?? '')
    if (codeNum == null) return
    codes.push({ key: entry.key, codeNum, entry })
  })

  if (codes.length < 2) {
    return { entryToGroup: new Map(), groups: new Map() }
  }

  codes.sort((a, b) => a.codeNum - b.codeNum || a.key.localeCompare(b.key))

  const clusters = []
  let current = [codes[0]]
  for (let i = 1; i < codes.length; i++) {
    const prev = current[current.length - 1]
    const next = codes[i]
    const isConsecutive = next.codeNum <= (prev.codeNum + 1)
    const adjacent = areEntriesAdjacent(prev.entry, next.entry)
    if (isConsecutive && adjacent) {
      current.push(next)
    } else {
      clusters.push(current)
      current = [next]
    }
  }
  clusters.push(current)

  const entryToGroup = new Map()
  const groups = new Map()

  let idx = 0
  clusters.forEach(cluster => {
    if (cluster.length < 2) return

    idx += 1
    const start = cluster[0].codeNum
    const end = cluster[cluster.length - 1].codeNum
    const memberKeys = cluster.map(item => item.key)
    const representativeKey = memberKeys[Math.floor(memberKeys.length / 2)] ?? memberKeys[0]
    const collapsedText = start === end
      ? formatJCode(start)
      : `${formatJCode(start)} - ${formatJCode(end)}`
    const key = `jgroup-${start}-${end}-${idx}`

    groups.set(key, {
      key,
      start,
      end,
      memberKeys,
      representativeKey,
      collapsedText,
    })
    memberKeys.forEach(memberKey => entryToGroup.set(memberKey, key))
  })

  return { entryToGroup, groups }
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
  const seenMaterials = new Set()
  const seenTextures = new Set()

  obj.traverse(n => {
    n.geometry?.dispose()

    const materials = Array.isArray(n.material) ? n.material : [n.material]
    materials.forEach(material => {
      if (!material || seenMaterials.has(material)) return
      seenMaterials.add(material)
      disposeMaterialTextures(material, seenTextures)
      material.dispose()
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

function getBoxCorners(box) {
  const min = box.min
  const max = box.max
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ]
}

function fitRouteCameraToView(points, camera, controls = null, padMult = ROUTE_FRAME_PAD_MULT) {
  if (!points || points.length === 0) return null
  const bb = new THREE.Box3().setFromPoints(points)
  if (bb.isEmpty()) return null

  const center = bb.getCenter(new THREE.Vector3())
  const size = bb.getSize(new THREE.Vector3())
  const planarSpan = Math.max(size.x, size.z, ROUTE_FRAME_MIN_SPAN)

  const marginX = THREE.MathUtils.clamp(
    size.x * ROUTE_FRAME_MARGIN_FRAC,
    ROUTE_FRAME_MARGIN_ABS,
    ROUTE_FRAME_MARGIN_MAX,
  )
  const marginY = THREE.MathUtils.clamp(
    Math.max(size.y * ROUTE_FRAME_MARGIN_FRAC, planarSpan * 0.04),
    ROUTE_FRAME_MARGIN_ABS * 0.45,
    ROUTE_FRAME_MARGIN_MAX * 0.65,
  )
  const marginZ = THREE.MathUtils.clamp(
    size.z * ROUTE_FRAME_MARGIN_FRAC,
    ROUTE_FRAME_MARGIN_ABS,
    ROUTE_FRAME_MARGIN_MAX,
  )
  const halfX = Math.max(
    (size.x * 0.5) + marginX,
    ROUTE_FRAME_MIN_SPAN * 0.5,
  )
  const halfY = Math.max(
    (size.y * 0.5) + marginY,
    ROUTE_FRAME_MIN_SPAN * 0.15,
  )
  const halfZ = Math.max(
    (size.z * 0.5) + marginZ,
    ROUTE_FRAME_MIN_SPAN * 0.5,
  )

  const frameBox = new THREE.Box3(
    new THREE.Vector3(center.x - halfX, center.y - halfY, center.z - halfZ),
    new THREE.Vector3(center.x + halfX, center.y + halfY, center.z + halfZ),
  )
  const frameCenter = frameBox.getCenter(new THREE.Vector3())

  const viewDir = camera.position.clone().sub(controls?.target ?? frameCenter)
  if (viewDir.lengthSq() <= 1e-8) {
    viewDir.set(0.24, 0.93, 0.28)
  }
  viewDir.normalize()

  if (viewDir.y <= 0.05) {
    viewDir.set(0.24, 0.93, 0.28)
  }
  viewDir.normalize()

  const forward = viewDir.clone().negate()
  const upHint = Math.abs(forward.y) > 0.985
    ? new THREE.Vector3(0, 0, -1)
    : new THREE.Vector3(0, 1, 0)

  const right = new THREE.Vector3().crossVectors(forward, upHint)
  if (right.lengthSq() <= 1e-8) {
    right.set(1, 0, 0)
  } else {
    right.normalize()
  }

  const up = new THREE.Vector3().crossVectors(right, forward).normalize()

  const corners = getBoxCorners(frameBox)
  const rel = new THREE.Vector3()
  let halfWidth = 0
  let halfHeight = 0
  let halfDepth = 0

  corners.forEach(corner => {
    rel.copy(corner).sub(frameCenter)
    halfWidth = Math.max(halfWidth, Math.abs(rel.dot(right)))
    halfHeight = Math.max(halfHeight, Math.abs(rel.dot(up)))
    halfDepth = Math.max(halfDepth, Math.abs(rel.dot(forward)))
  })

  const frameSize = frameBox.getSize(new THREE.Vector3())
  const maxDim = Math.max(frameSize.x, frameSize.y, frameSize.z)
  const fovHalf = THREE.MathUtils.degToRad(camera.fov * 0.5)
  const aspect = Math.max(0.1, camera.aspect || 1)
  const hFovHalf = Math.atan(Math.tan(fovHalf) * aspect)

  const fitHeightDistance = halfHeight / Math.max(Math.tan(fovHalf), 1e-6)
  const fitWidthDistance = halfWidth / Math.max(Math.tan(hFovHalf), 1e-6)
  const baseDistance = maxDim / Math.max(2 * Math.tan(fovHalf), 1e-6)

  let distance = Math.max(fitHeightDistance, fitWidthDistance, baseDistance)
  distance = (distance + halfDepth) * padMult
  distance = Math.max(distance, 1.2)

  return {
    bbox: frameBox,
    pos: frameCenter.clone().addScaledVector(viewDir, distance),
    target: frameCenter.clone(),
  }
}

function getEntrySelectionAnchorWorld(entry) {
  if (entry?._label?.anchorLocal) {
    return entry.mesh.localToWorld(entry._label.anchorLocal.clone())
  }
  return getEntryLabelAnchorWorld(entry)
}

function getEntryDynamicLiftHeight(entry, maxLiftByCamera = Infinity) {
  const dominantSize = Math.max(entry?.dominantSize ?? 0.001, 0.001)
  const scaledLift = SELECT_LIFT_FIXED * (SELECT_LIFT_REF_SIZE / dominantSize)
  const dynamicLift = THREE.MathUtils.clamp(scaledLift, SELECT_LIFT_MIN, SELECT_LIFT_MAX)
  return Math.min(dynamicLift, maxLiftByCamera)
}

function fitEntryCameraUsingAnchor(entry, camera, anchorWorld, padMult = 1.02) {
  const frame = getEntryFrameFromSolids(entry)
  const baseBbox = frame.bbox.clone()
  const rawTargetX = THREE.MathUtils.clamp(anchorWorld.x, baseBbox.min.x, baseBbox.max.x)
  const rawTargetY = THREE.MathUtils.clamp(anchorWorld.y, baseBbox.min.y, baseBbox.max.y)
  const rawTargetZ = THREE.MathUtils.clamp(anchorWorld.z, baseBbox.min.z, baseBbox.max.z)
  const target = new THREE.Vector3(
    rawTargetX,
    rawTargetY,
    rawTargetZ,
  )

  /* Fixed perpendicular distance for every piece. */
  const dist = Math.max(1.2, SELECT_CAMERA_FIXED_DIST * padMult)
  const maxLiftByCamera = Math.max(0, dist - 0.6)
  const liftHeight = getEntryDynamicLiftHeight(entry, maxLiftByCamera)

  const liftedBox = baseBbox.clone()
  liftedBox.max.y = baseBbox.max.y + liftHeight

  return {
    bbox: liftedBox,
    liftHeight,
    target,
    pos: new THREE.Vector3(target.x, target.y + dist, target.z),
  }
}

export default function ThreeViewer() {
  const mountRef = useRef(null)
  const dracoLoaderRef = useRef(null)
  const ktx2LoaderRef = useRef(null)
  const invalidateRenderRef = useRef(() => {})
  const updateLabelsLayoutRef = useRef(() => {})
  const loadingProxyRef = useRef(null)
  const loadingLiveRef = useRef(true)
  const labelsEnabledRef = useRef(true)

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
  const isolatedPickablesRef = useRef([])
  const pickableToEntryRef = useRef(new Map())
  const animMap     = useRef(new Map())
  const hoverRef    = useRef(null)
  const selectedRef = useRef(null)
  const isolatedEntryRef = useRef(null)
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
  const labelsByKeyRef = useRef(new Map())
  const entryToLabelGroupRef = useRef(new Map())
  const labelGroupsRef = useRef(new Map())
  const expandedLabelGroupRef = useRef(null)
  const tooltipRef = useRef({ visible:false, name:'', x:0, y:0 })
  const lastPointerMoveRef = useRef(0)

  const [activeModel,   setActiveModel]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [tooltip,       setTooltip]       = useState({ visible:false, name:'', x:0, y:0 })
  const [search,        setSearch]        = useState('')
  const [selectedName,  setSelectedName]  = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [labelsEnabled, setLabelsEnabled] = useState(true)
  const [assetError, setAssetError] = useState('')

  /* ── Navigation state ── */
  const navGraphRef  = useRef(null)      // built nav graph
  const navLineRef   = useRef(null)      // THREE.Mesh for route tube
  const navDotRef    = useRef(null)      // animated dot group
  const navAnimRef   = useRef({ active: false, t: 0, pathLen: 0, points: [] })
  const navMarkersRef = useRef([])       // origin/dest marker meshes
  const navOriginPt  = useRef(null)      // THREE.Vector3 — clicked origin (building space)
  const navDestPt    = useRef(null)      // THREE.Vector3 — clicked dest (building space)
  const navOffsetRef = useRef(new THREE.Vector3()) // scene->nav offset (added before pathfinding)
  const modelCenterRef = useRef(new THREE.Vector3())
  const [navMode,      setNavMode]      = useState(false)   // navigation panel open
  const [navOrigin,    setNavOrigin]     = useState(null)    // display label for origin
  const [navDest,      setNavDest]       = useState(null)    // display label for dest
  const navOriginLabelRef = useRef(null) // immediate origin label (avoids async state lag)
  const navDestLabelRef = useRef(null)   // immediate dest label (avoids async state lag)
  const [navActive,    setNavActive]     = useState(false)   // route displayed
  const [navInstructions, setNavInstructions] = useState([])  // array of instruction objects
  const [navSpeaking, setNavSpeaking]   = useState(false)    // is audio playing
  const navModeLiveRef = useRef(false)
  const navLoadStateRef = useRef({ modelIndex: -1, loading: false, promise: null })

  const [loadProgress, setLoadProgress] = useState({
    phase: 'Inicializando',
    loaded: 0,
    total: 0,
    percent: 0,
  })

  function updateLoadProgress(partial) {
    setLoadProgress(prev => {
      const resetting = partial.reset === true
      const next = {
        phase: partial.phase ?? prev.phase,
        loaded: partial.loaded ?? prev.loaded,
        total: partial.total ?? prev.total,
      }

      const rawPercent = next.total > 0
        ? (next.loaded / next.total) * 100
        : (next.loaded > 0 ? Math.min(95, prev.percent + 2.5) : (resetting ? 0 : prev.percent))
      const percent = resetting
        ? Math.min(100, rawPercent)
        : Math.max(prev.percent, Math.min(100, rawPercent))

      const changed =
        next.phase !== prev.phase
        || Math.abs(next.loaded - prev.loaded) >= (256 * 1024)
        || Math.abs(next.total - prev.total) >= (256 * 1024)
        || Math.abs(percent - prev.percent) >= 0.5

      if (!changed) return prev

      return {
        ...next,
        percent,
      }
    })
  }

  function setNavOriginValue(value) {
    navOriginLabelRef.current = value
    setNavOrigin(value)
  }

  function setNavDestValue(value) {
    navDestLabelRef.current = value
    setNavDest(value)
  }

  /* ── Limpia todas las etiquetas del overlay ── */
  function cleanupLabels() {
    labelsDataRef.current.forEach(lbl => {
      lbl.el?.remove()
      lbl.lineEl?.remove()
    })
    labelsDataRef.current = []
    labelsByKeyRef.current.clear()
    entryToLabelGroupRef.current.clear()
    labelGroupsRef.current.clear()
    expandedLabelGroupRef.current = null
    meshes.current.forEach(entry => { entry._label = null })
  }

  function measureLabelSize(lbl) {
    if (!lbl?.el) return
    const rect = lbl.el.getBoundingClientRect()
    lbl.w = rect.width || 80
    lbl.h = rect.height || 22
  }

  function setLabelText(lbl, text) {
    if (!lbl) return
    const nextText = text ?? ''
    lbl.name = nextText
    if (lbl.textEl && lbl.textEl.textContent !== nextText) {
      lbl.textEl.textContent = nextText
      measureLabelSize(lbl)
    }
  }

  function collapseAllLabelGroups() {
    expandedLabelGroupRef.current = null
    labelGroupsRef.current.forEach(group => {
      group.memberKeys.forEach(memberKey => {
        const lbl = labelsByKeyRef.current.get(memberKey)
        if (!lbl) return
        if (memberKey === group.representativeKey) {
          lbl._hidden = false
          setLabelText(lbl, group.collapsedText)
        } else {
          lbl._hidden = true
          setLabelText(lbl, lbl.entryLabelName)
        }
      })
    })
  }

  function expandLabelGroup(groupKey) {
    const targetGroup = labelGroupsRef.current.get(groupKey)
    if (!targetGroup) return false

    collapseAllLabelGroups()
    targetGroup.memberKeys.forEach(memberKey => {
      const lbl = labelsByKeyRef.current.get(memberKey)
      if (!lbl) return
      lbl._hidden = false
      setLabelText(lbl, lbl.entryLabelName)
    })
    expandedLabelGroupRef.current = groupKey
    return true
  }

  function showLabelsForSelection(entry) {
    const el = R.current.labelsOverlay
    if (!el || !entry) return

    labelsDataRef.current.forEach(lbl => { lbl._hidden = true })
    const groupKey = entryToLabelGroupRef.current.get(entry.key)

    if (groupKey && labelGroupsRef.current.has(groupKey)) {
      const expanded = expandLabelGroup(groupKey)
      if (expanded) {
        const members = new Set(labelGroupsRef.current.get(groupKey).memberKeys)
        labelsDataRef.current.forEach(lbl => {
          lbl._hidden = !members.has(lbl.key)
        })
      }
    } else {
      const lbl = labelsByKeyRef.current.get(entry.key)
      if (lbl) {
        lbl._hidden = false
        setLabelText(lbl, lbl.entryLabelName)
      }
      expandedLabelGroupRef.current = null
    }

    el.style.opacity = labelsEnabledRef.current ? '1' : '0'
    updateLabelsLayoutRef.current({ snap: true })
  }

  /* ── Muestra / oculta todas las etiquetas ── */
  function setLabelsVisible(visible) {
    const el = R.current.labelsOverlay
    if (!el) return
    /* When showing all, reset per-label hiding */
    if (visible) {
      labelsDataRef.current.forEach(lbl => { lbl._hidden = false })
      collapseAllLabelGroups()
      updateLabelsLayoutRef.current({ snap: true })
    }
    el.style.opacity = (visible && labelsEnabledRef.current) ? '1' : '0'
  }

  /** Show only labels whose keys are in `keys` set; hide the rest */
  function showOnlyLabels(keys) {
    const el = R.current.labelsOverlay
    if (!el) return
    expandedLabelGroupRef.current = null
    labelsDataRef.current.forEach(lbl => {
      lbl._hidden = !keys.has(lbl.key)
    })
    el.style.opacity = labelsEnabledRef.current ? '1' : '0'
    updateLabelsLayoutRef.current({ snap: true })
  }

  function isolateSelectedEntry(entry = null) {
    // OPT: hide all non-selected pieces so the clicked one is visually isolated.
    isolatedEntryRef.current = entry
    const isolate = !!entry

    if (isolate) {
      isolatedPickablesRef.current = getEntryMeshList(entry, 'full')
    } else {
      isolatedPickablesRef.current = []
    }

    meshes.current.forEach(item => {
      item.mesh.visible = !isolate || item === entry
    })
    invalidateRenderRef.current()
  }

  function getActiveRayTargets(nav = false) {
    if (nav) {
      return pickablesRef.current.filter(mesh => mesh.visible)
    }

    if (isolatedEntryRef.current && isolatedPickablesRef.current.length > 0) {
      return isolatedPickablesRef.current.filter(mesh => mesh.visible)
    }

    const baseTargets = focusPickablesRef.current.length > 0
      ? focusPickablesRef.current
      : pickablesRef.current

    return baseTargets.filter(mesh => mesh.visible)
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
    // OPT: animate only while needed by invalidating the render loop on demand.
    invalidateRenderRef.current()
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
    // OPT: schedule render work only while camera interpolation is active.
    invalidateRenderRef.current()
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

  function liftLocalTarget(entry, extraHeight, worldAnchor = null) {
    const center = worldAnchor ? worldAnchor.clone() : getEntryWorldCenter(entry)
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
    isolateSelectedEntry(null)
    setLabelsVisible(true)
  }

  function resetView() {
    if (selectedRef.current) deselectEntry(selectedRef.current)
    isolateSelectedEntry(null)
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
    setAssetError('')
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
    invalidateRenderRef.current()
  }

  function clearNavMarkers() {
    const scene = R.current.scene
    navMarkersRef.current.forEach(m => {
      m.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
      scene?.remove(m)
    })
    navMarkersRef.current = []
    invalidateRenderRef.current()
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
    invalidateRenderRef.current()
    return group
  }

  function ensureNavGraphLoaded() {
    const scene = R.current.scene
    if (!scene) return Promise.resolve(null)

    const navFile = MODELS[activeModel]?.nav
    if (!navFile) return Promise.resolve(null)

    const state = navLoadStateRef.current
    if (navGraphRef.current && state.modelIndex === activeModel) {
      return Promise.resolve(navGraphRef.current)
    }
    if (state.loading && state.modelIndex === activeModel && state.promise) {
      return state.promise
    }

    const navLoader = new GLTFLoader()
    if (dracoLoaderRef.current) navLoader.setDRACOLoader(dracoLoaderRef.current)
    if (ktx2LoaderRef.current) navLoader.setKTX2Loader(ktx2LoaderRef.current)
    navLoader.setMeshoptDecoder(MeshoptDecoder)

    // OPT: defer navmesh download until navigation mode is actually used.
    updateLoadProgress({ phase: 'Cargando navmesh', loaded: 0, total: 0 })

    state.modelIndex = activeModel
    state.loading = true

    const promise = new Promise(resolve => {
      navLoader.load(
        withAssetRevision(navFile),
        navGltf => {
          const latest = navLoadStateRef.current
          if (latest.modelIndex !== activeModel) {
            resolve(null)
            return
          }

          const navScene = navGltf.scene
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
            navGraphRef.current = buildNavGraph(navGeo, navMatrix)
          }

          updateLoadProgress({
            phase: 'Navmesh lista',
            loaded: 1,
            total: 1,
          })
          invalidateRenderRef.current()
          resolve(navGraphRef.current)
        },
        xhr => {
          const latest = navLoadStateRef.current
          if (latest.modelIndex !== activeModel) return
          updateLoadProgress({
            phase: 'Cargando navmesh',
            loaded: xhr?.loaded ?? 0,
            total: xhr?.total ?? 0,
          })
        },
        err => {
          const latest = navLoadStateRef.current
          if (latest.modelIndex !== activeModel) {
            resolve(null)
            return
          }
          console.error('Nav GLB error', err)
          setAssetError(buildGlbErrorMessage(err, navFile))
          updateLoadProgress({ phase: 'Error al cargar navmesh', loaded: 0, total: 0 })
          resolve(null)
        },
      )
    }).finally(() => {
      const latest = navLoadStateRef.current
      if (latest.modelIndex === activeModel) {
        latest.loading = false
        latest.promise = null
      }
    })

    state.promise = promise
    return promise
  }

  function exitNavigation() {
    clearRouteVisuals()
    clearNavMarkers()
    window.speechSynthesis?.cancel()
    setNavSpeaking(false)
    navOriginPt.current = null
    navDestPt.current = null
    setNavMode(false)
    setNavOriginValue(null)
    setNavDestValue(null)
    setNavActive(false)
    setNavInstructions([])
    if (selectedRef.current) deselectEntry(selectedRef.current)
    isolateSelectedEntry(null)
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

  function pointToSegmentDistanceSqXZ(p, a, b) {
    const abx = b.x - a.x
    const abz = b.z - a.z
    const ab2 = (abx * abx) + (abz * abz)
    if (ab2 <= 1e-10) {
      const dx = p.x - a.x
      const dz = p.z - a.z
      return (dx * dx) + (dz * dz)
    }

    let t = (((p.x - a.x) * abx) + ((p.z - a.z) * abz)) / ab2
    if (t < 0) t = 0
    if (t > 1) t = 1
    const qx = a.x + (abx * t)
    const qz = a.z + (abz * t)
    const dx = p.x - qx
    const dz = p.z - qz
    return (dx * dx) + (dz * dz)
  }

  function simplifyPolylineRDPXZ(pts, epsilon = 0.9) {
    if (!pts || pts.length <= 2) return pts ? pts.map(p => p.clone()) : []

    const epsSq = epsilon * epsilon

    function recurse(start, end, out) {
      if ((end - start) <= 1) return

      let bestIdx = -1
      let bestD2 = -1
      const a = pts[start]
      const b = pts[end]

      for (let i = start + 1; i < end; i++) {
        const d2 = pointToSegmentDistanceSqXZ(pts[i], a, b)
        if (d2 > bestD2) {
          bestD2 = d2
          bestIdx = i
        }
      }

      if (bestIdx >= 0 && bestD2 > epsSq) {
        recurse(start, bestIdx, out)
        out.push(pts[bestIdx].clone())
        recurse(bestIdx, end, out)
      }
    }

    const out = [pts[0].clone()]
    recurse(0, pts.length - 1, out)
    out.push(pts[pts.length - 1].clone())
    return out
  }

  function simplifyRouteGuidePoints(pts, graph = null) {
    if (!pts || pts.length <= 2) return pts ? pts.map(p => p.clone()) : []
    const { total } = polylineDistances(pts)
    const epsilon = Math.max(0.75, Math.min(1.9, total / 58))
    const rough = simplifyPolylineRDPXZ(pts, epsilon)
    if (!graph || rough.length <= 2) return rough

    /* Keep the longest valid jumps while ensuring each segment stays on navmesh. */
    const out = [rough[0].clone()]
    let i = 0
    while (i < rough.length - 1) {
      let best = i + 1
      for (let j = rough.length - 1; j > i + 1; j--) {
        if (isSegmentOnNavMeshStrict(rough[i], rough[j], graph)) {
          best = j
          break
        }
      }
      out.push(rough[best].clone())
      i = best
    }

    for (let k = 1; k < out.length; k++) {
      if (!isSegmentOnNavMeshStrict(out[k - 1], out[k], graph)) {
        return pts.map(p => p.clone())
      }
    }

    return out
  }

  function sceneToNavPoint(point) {
    return point.clone().add(navOffsetRef.current)
  }

  function navToScenePoint(point) {
    return point.clone().sub(navOffsetRef.current)
  }

  function pointInTriXZStrict(px, pz, ax, az, bx, bz, cx, cz) {
    const eps = 1e-5
    const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz)
    const d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz)
    const d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az)
    const hasNeg = (d1 < -eps) || (d2 < -eps) || (d3 < -eps)
    const hasPos = (d1 > eps) || (d2 > eps) || (d3 > eps)
    return !(hasNeg && hasPos)
  }

  function isPointOnNavMeshStrict(navPoint, graph) {
    if (!graph) return false
    const { verts, tris } = graph
    const triCount = graph.triCount ?? 0

    for (let t = 0; t < triCount; t++) {
      const ia = tris[t * 3]
      const ib = tris[t * 3 + 1]
      const ic = tris[t * 3 + 2]
      if (pointInTriXZStrict(
        navPoint.x,
        navPoint.z,
        verts[ia * 3], verts[ia * 3 + 2],
        verts[ib * 3], verts[ib * 3 + 2],
        verts[ic * 3], verts[ic * 3 + 2],
      )) return true
    }
    return false
  }

  function isSegmentOnNavMeshStrict(aScene, bScene, graph, step = 0.35) {
    if (!graph) return true
    const a = sceneToNavPoint(aScene)
    const b = sceneToNavPoint(bScene)
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    const samples = Math.max(2, Math.ceil(len / step))

    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const p = new THREE.Vector3(
        a.x + dx * t,
        a.y + ((b.y - a.y) * t),
        a.z + dz * t,
      )
      if (!isPointOnNavMeshStrict(p, graph)) return false
    }
    return true
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

  function trianglesConnected(startTri, endTri, graph) {
    if (startTri == null || endTri == null) return false
    if (startTri < 0 || endTri < 0) return false
    if (startTri === endTri) return true

    const triCount = graph.triCount ?? graph.centroids.length
    const visited = new Uint8Array(triCount)
    const queue = [startTri]
    let qHead = 0
    visited[startTri] = 1

    while (qHead < queue.length) {
      const tri = queue[qHead++]
      const nbs = graph.adj[tri] || []
      for (const nb of nbs) {
        if (nb === endTri) return true
        if (visited[nb]) continue
        visited[nb] = 1
        queue.push(nb)
      }
    }
    return false
  }

  function segmentAxisXZ(a, b) {
    return Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? 'x' : 'z'
  }

  function simplifyOrthogonalPolyline(pts, minDist = 0.2, graph = null) {
    if (!pts || pts.length === 0) return []
    const minDistSq = minDist * minDist
    const out = [pts[0].clone()]
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].distanceToSquared(out[out.length - 1]) <= minDistSq) continue
      out.push(pts[i].clone())
    }

    const EPS = 1e-4
    for (let i = out.length - 2; i >= 1; i--) {
      const a = out[i - 1]
      const b = out[i]
      const c = out[i + 1]
      const sameX = Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS
      const sameZ = Math.abs(a.z - b.z) < EPS && Math.abs(b.z - c.z) < EPS
      if ((sameX || sameZ) && (!graph || isSegmentOnNavMeshStrict(a, c, graph))) out.splice(i, 1)
    }

    const segAxis = (a, b) => (Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? 'x' : 'z')
    let i = 0
    while (i <= out.length - 4) {
      const p0 = out[i]
      const p1 = out[i + 1]
      const p2 = out[i + 2]
      const p3 = out[i + 3]
      const a1 = segAxis(p0, p1)
      const a2 = segAxis(p1, p2)
      const a3 = segAxis(p2, p3)

      if (a1 !== a2 && a1 === a3 && p1.distanceTo(p2) < ORTHO_ZIGZAG_SHORT_SEG) {
        const returnsSameLane = a1 === 'x'
          ? Math.abs(p0.z - p3.z) < ORTHO_ZIGZAG_RETURN_TOL
          : Math.abs(p0.x - p3.x) < ORTHO_ZIGZAG_RETURN_TOL
        if (returnsSameLane && (!graph || isSegmentOnNavMeshStrict(p0, p3, graph))) {
          out.splice(i + 1, 2)
          i = Math.max(0, i - 1)
          continue
        }
      }

      i++
    }

    if (out.length >= 4) {
      const segAxis = (a, b) => (Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? 'x' : 'z')
      const p0 = out[out.length - 4]
      const p1 = out[out.length - 3]
      const p2 = out[out.length - 2]
      const p3 = out[out.length - 1]
      const a1 = segAxis(p0, p1)
      const a2 = segAxis(p1, p2)
      const a3 = segAxis(p2, p3)
      if (a1 !== a2 && a1 === a3 && p1.distanceTo(p2) < (ORTHO_ZIGZAG_SHORT_SEG * 1.35)) {
        const nearSameLane = a1 === 'x'
          ? Math.abs(p0.z - p3.z) < (ORTHO_ZIGZAG_RETURN_TOL * 1.4)
          : Math.abs(p0.x - p3.x) < (ORTHO_ZIGZAG_RETURN_TOL * 1.4)
        if (nearSameLane && (!graph || isSegmentOnNavMeshStrict(p0, p3, graph))) {
          out.splice(out.length - 3, 2)
        }
      }
    }

    return out
  }

  function orthogonalizePolyline(pts, floorY, graph = null) {
    if (!pts || pts.length < 2) return pts ? pts.map(p => p.clone()) : []

    const out = [pts[0].clone()]
    out[0].y = floorY
    let lastAxis = null

    for (let i = 1; i < pts.length; i++) {
      const prev = out[out.length - 1]
      const rawNext = pts[i].clone()
      rawNext.y = floorY
      const next = rawNext.clone()

      let dx = next.x - prev.x
      let dz = next.z - prev.z
      const adx = Math.abs(dx)
      const adz = Math.abs(dz)

      if (adx <= ORTHO_AXIS_SNAP_ABS || (adz > 1e-5 && adx <= adz * ORTHO_AXIS_SNAP_RATIO)) {
        next.x = prev.x
        dx = 0
      } else if (adz <= ORTHO_AXIS_SNAP_ABS || (adx > 1e-5 && adz <= adx * ORTHO_AXIS_SNAP_RATIO)) {
        next.z = prev.z
        dz = 0
      }

      const axisAligned = Math.abs(dx) < 1e-4 || Math.abs(dz) < 1e-4
      if (axisAligned) {
        if (graph && !isSegmentOnNavMeshStrict(prev, next, graph)) {
          if (isSegmentOnNavMeshStrict(prev, rawNext, graph)) {
            out.push(rawNext)
            lastAxis = Math.abs(rawNext.x - prev.x) >= Math.abs(rawNext.z - prev.z) ? 'x' : 'z'
            continue
          }
          continue
        }
        out.push(next)
        lastAxis = Math.abs(dx) >= Math.abs(dz) ? 'x' : 'z'
        continue
      }

      const cornerXFirst = prev.clone()
      cornerXFirst.x = next.x
      cornerXFirst.y = floorY

      const cornerZFirst = prev.clone()
      cornerZFirst.z = next.z
      cornerZFirst.y = floorY

      const lookAhead = (i + 1 < pts.length) ? pts[i + 1] : next
      let scoreX = cornerXFirst.distanceToSquared(lookAhead)
      let scoreZ = cornerZFirst.distanceToSquared(lookAhead)

      if (lastAxis === 'x') scoreX *= 0.98
      if (lastAxis === 'z') scoreZ *= 0.98

      let preferred = scoreX <= scoreZ ? 'x' : 'z'
      if (Math.abs(scoreX - scoreZ) < 1e-4 && !lastAxis) {
        preferred = segmentAxisXZ(prev, next)
      }

      const canX = !graph || (
        isSegmentOnNavMeshStrict(prev, cornerXFirst, graph)
        && isSegmentOnNavMeshStrict(cornerXFirst, next, graph)
      )
      const canZ = !graph || (
        isSegmentOnNavMeshStrict(prev, cornerZFirst, graph)
        && isSegmentOnNavMeshStrict(cornerZFirst, next, graph)
      )

      if (canX && !canZ) preferred = 'x'
      else if (canZ && !canX) preferred = 'z'
      else if (!canX && !canZ) {
        if (!graph || isSegmentOnNavMeshStrict(prev, rawNext, graph)) {
          out.push(rawNext)
          lastAxis = Math.abs(rawNext.x - prev.x) >= Math.abs(rawNext.z - prev.z) ? 'x' : 'z'
        }
        continue
      }

      const corner = preferred === 'x' ? cornerXFirst : cornerZFirst

      out.push(corner)
      out.push(next)
      lastAxis = preferred === 'x' ? 'z' : 'x'
    }

    return simplifyOrthogonalPolyline(out, 0.35, graph)
  }

  function joinNatural(items, limit = 2) {
    const unique = [...new Set((items || []).filter(Boolean))].slice(0, limit)
    if (unique.length === 0) return ''
    if (unique.length === 1) return unique[0]
    if (unique.length === 2) return `${unique[0]} y ${unique[1]}`
    return `${unique.slice(0, -1).join(', ')} y ${unique[unique.length - 1]}`
  }

  function normalizeRoomLabel(name) {
    const value = String(name ?? '').trim()
    if (!value) return ''
    const parts = value.split('/').map(p => p.trim()).filter(Boolean)
    if (parts.length <= 1) return value
    return joinNatural(parts, parts.length)
  }

  function splitNameParts(name) {
    return String(name ?? '').split('/').map(p => p.trim()).filter(Boolean)
  }

  function isSalonLabelPart(part) {
    const token = String(part ?? '').trim().toUpperCase()
    if (!token) return false
    if (!token.startsWith('J')) return false
    if (token === 'J') return true
    return /[0-9]/.test(token) || /^J[\s\-_.]?[A-Z0-9]+$/.test(token)
  }

  function salonUnitsFromName(name) {
    const parts = splitNameParts(name)
    if (parts.length === 0) return 0
    return parts.filter(isSalonLabelPart).length
  }

  function inferEntrySpatialType(entry) {
    const name = `${entry?.name ?? ''} ${entry?.rawName ?? ''}`.toLowerCase()
    const corridorRegex = /(pasillo|corredor|hall|vestib|lobby|circulacion|andador|galeria|acceso)/
    const roomRegex = /(salon|aula|sala|laboratorio|lab|oficina|cubiculo|taller|biblioteca|auditorio|bano|baño|sanitario|recepcion|recepción)/

    if (corridorRegex.test(name)) return 'corridor'
    if (roomRegex.test(name)) return 'room'

    const bb = getEntryBounds(entry, 'full')
    if (bb.isEmpty()) return 'room'
    const size = bb.getSize(new THREE.Vector3())
    const length = Math.max(size.x, size.z)
    const width = Math.max(Math.min(size.x, size.z), 0.1)
    const elongation = length / width
    const footprint = size.x * size.z

    if ((elongation >= 2.5 && length >= 7) || (elongation >= 2.0 && footprint >= 70 && width <= 8)) {
      return 'corridor'
    }
    return 'room'
  }

  function getWaypointReferences(point, radius = 14) {
    const ranked = []
    meshes.current.forEach(entry => {
      const center = getEntryWorldCenter(entry, 'focus')
      const dist = center.distanceTo(point)
      if (dist <= radius) ranked.push({ entry, center, dist })
    })
    ranked.sort((a, b) => a.dist - b.dist)

    const corridors = []
    const corridorSeen = new Set()
    const rooms = []
    const roomSeen = new Set()
    ranked.slice(0, 10).forEach(({ entry, center, dist }) => {
      const kind = inferEntrySpatialType(entry)
      if (kind === 'corridor') {
        const lower = entry.name.toLowerCase()
        const corridorName = (/(pasillo|corredor|hall|vestib|lobby)/.test(lower))
          ? entry.name
          : `el pasillo junto a ${normalizeRoomLabel(entry.name)}`
        if (!corridorSeen.has(corridorName)) {
          corridorSeen.add(corridorName)
          corridors.push(corridorName)
        }
      } else {
        if (roomSeen.has(entry.key)) return
        roomSeen.add(entry.key)
        const salonUnits = salonUnitsFromName(entry.name)
        rooms.push({
          key: entry.key,
          name: entry.name,
          displayName: normalizeRoomLabel(entry.name),
          center: center.clone(),
          dist,
          isSalon: salonUnits > 0,
          salonUnits,
        })
      }
    })

    /* Infer corridor context when model names corridor geometry as a room-like area. */
    if (corridors.length === 0 && rooms.length >= 2) {
      corridors.push(`el pasillo entre ${rooms[0].displayName} y ${rooms[1].displayName}`)
    }

    return {
      corridors,
      rooms,
      roomNames: rooms.map(r => r.displayName),
    }
  }

  function buildRelativeCue(anchorPoint, forwardVec, refs, options = {}) {
    const { preferNonSalon = false } = options
    if (!refs) return ''
    let candidates = refs.rooms || []
    if (preferNonSalon) {
      const nonSalon = candidates.filter(r => !r.isSalon)
      if (nonSalon.length > 0) candidates = nonSalon
    }

    if (candidates.length === 0) {
      if (refs.corridors.length > 0) return `por ${refs.corridors[0]}`
      return ''
    }

    const candidate = candidates[0]
    const fwd2 = new THREE.Vector2(forwardVec.x, forwardVec.z)
    if (fwd2.lengthSq() < 0.0001) return `pasando ${candidate.displayName}`
    fwd2.normalize()

    const toRef = new THREE.Vector2(candidate.center.x - anchorPoint.x, candidate.center.z - anchorPoint.z)
    if (toRef.lengthSq() < 0.0001) return `pasando ${candidate.displayName}`
    toRef.normalize()

    const dot = fwd2.dot(toRef)
    if (dot > 0.35) return `pasando ${candidate.displayName}`
    return `pasando ${candidate.displayName}`
  }

  function analyzeSalonsAlongStraight(routePoints, startIndex, endIndex, destKey = null) {
    if (endIndex <= startIndex) return { count: 0, names: [] }
    const maxDistToSegment = 4.8
    const counted = new Set()
    let total = 0
    const names = []

    meshes.current.forEach(entry => {
      if (entry.key === destKey) return
      if (counted.has(entry.key)) return
      const units = salonUnitsFromName(entry.name)
      if (units <= 0) return

      const c = getEntryWorldCenter(entry, 'focus')
      let bestDist = Infinity

      for (let i = startIndex + 1; i <= endIndex; i++) {
        const a = routePoints[i - 1]
        const b = routePoints[i]
        const abx = b.x - a.x
        const abz = b.z - a.z
        const abLenSq = abx * abx + abz * abz
        if (abLenSq < 0.0001) continue

        let t = ((c.x - a.x) * abx + (c.z - a.z) * abz) / abLenSq
        t = Math.max(0, Math.min(1, t))
        const qx = a.x + abx * t
        const qz = a.z + abz * t
        const dist = Math.hypot(c.x - qx, c.z - qz)
        if (dist < bestDist) bestDist = dist
      }

      if (bestDist > maxDistToSegment) return
      counted.add(entry.key)
      total += units
      names.push(normalizeRoomLabel(entry.name))
    })

    return {
      count: total,
      names: [...new Set(names)],
    }
  }

  function segmentLength(routePoints, startIndex, endIndex) {
    if (endIndex <= startIndex) return 0
    let len = 0
    for (let i = startIndex + 1; i <= endIndex; i++) {
      len += routePoints[i].distanceTo(routePoints[i - 1])
    }
    return len
  }

  function buildStraightInstruction(routePoints, startIndex, endIndex, destKey, prefix = '') {
    if (endIndex <= startIndex) return null

    const segmentLen = segmentLength(routePoints, startIndex, endIndex)
    const isLongSegment = segmentLen >= 16
    const salonInfo = analyzeSalonsAlongStraight(routePoints, startIndex, endIndex, destKey)
    const salonCount = salonInfo.count
    const salonWord = salonCount === 1 ? 'salon' : 'salones'
    const anchorPoint = routePoints[endIndex]
    const forwardVec = new THREE.Vector3().subVectors(routePoints[endIndex], routePoints[startIndex])
    const refs = getWaypointReferences(anchorPoint, 13)
    const cue = buildRelativeCue(anchorPoint, forwardVec, refs, {
      preferNonSalon: salonCount === 0,
    })

    let line = `${prefix}Continua recto`
    if (salonCount > 0) {
      if (isLongSegment) {
        line += ` pasando ${salonCount} ${salonWord}`
      } else {
        const namedSalons = joinNatural(salonInfo.names, 2)
        if (namedSalons) line += ` pasando ${namedSalons}`
        else line += ` pasando ${salonCount} ${salonWord}`
      }
    }
    if (salonCount === 0 && cue) line += `, ${cue}`
    if (salonCount > 0 && isLongSegment && refs.corridors.length > 0) line += ` por ${refs.corridors[0]}`
    line += '.'

    return { text: line, voice: line }
  }

  function describeTurn(prev, current, next) {
    const v1 = new THREE.Vector2(current.x - prev.x, current.z - prev.z)
    const v2 = new THREE.Vector2(next.x - current.x, next.z - current.z)
    if (v1.lengthSq() < 0.0001 || v2.lengthSq() < 0.0001) return { type: 'recto', angle: 0 }
    v1.normalize()
    v2.normalize()
    const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1)
    const angle = Math.acos(dot) * (180 / Math.PI)
    if (angle < 30) return { type: 'recto', angle }
    if (angle > 150) return { type: 'retorno', angle }
    const cross = v1.x * v2.y - v1.y * v2.x
    return { type: cross > 0 ? 'derecha' : 'izquierda', angle }
  }

  function normalizeInstructionText(text) {
    return String(text ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  }

  function pushUniqueInstruction(list, text, voice = text) {
    if (!text) return
    const cleanText = String(text).replace(/\s+/g, ' ').trim()
    if (!cleanText) return
    const norm = normalizeInstructionText(cleanText)
    if (list.length > 0) {
      const lastNorm = normalizeInstructionText(list[list.length - 1].text)
      if (lastNorm === norm) return
    }
    list.push({ text: cleanText, voice: String(voice ?? cleanText).replace(/\s+/g, ' ').trim() })
  }

  function pickTurnReferenceName(point) {
    const refs = getWaypointReferences(point, 14)
    if (refs.corridors.length > 0) return refs.corridors[0]
    const nonSalon = refs.rooms.find(r => !r.isSalon)
    if (nonSalon) return nonSalon.displayName
    return refs.rooms[0]?.displayName ?? null
  }

  function collectVisibleTurnSteps(routePoints) {
    const rough = []
    for (let i = 1; i < routePoints.length - 1; i++) {
      const prev = routePoints[i - 1]
      const curr = routePoints[i]
      const next = routePoints[i + 1]
      const lenIn = curr.distanceTo(prev)
      const lenOut = next.distanceTo(curr)
      /* Ignore tiny micro-segments produced by snapping/smoothing artifacts. */
      if (lenIn < 1.1 || lenOut < 1.1) continue

      const turn = describeTurn(prev, curr, next)
      if (turn.type === 'recto') continue
      rough.push({ index: i, type: turn.type, angle: turn.angle })
    }

    if (rough.length <= 1) return rough

    const filtered = []
    for (const step of rough) {
      const last = filtered[filtered.length - 1]
      if (!last) {
        filtered.push(step)
        continue
      }

      /* Collapse immediate duplicates near the same corner, keep stronger angle. */
      if (step.index - last.index <= 1) {
        if (step.angle > last.angle) filtered[filtered.length - 1] = step
        continue
      }

      if (step.type === last.type) {
        const a = routePoints[last.index]
        const b = routePoints[step.index]
        if (a.distanceTo(b) < 2.2) {
          if (step.angle > last.angle) filtered[filtered.length - 1] = step
          continue
        }
      }

      filtered.push(step)
    }

    return filtered
  }

  function generateRouteInstructions(routePoints, labels = {}) {
    if (!routePoints || routePoints.length < 2) return []

    const originRaw = labels.origin ?? navOriginLabelRef.current ?? navOrigin ?? 'tu ubicacion'
    const destRaw = labels.dest ?? navDestLabelRef.current ?? navDest ?? 'destino'
    const originLabel = normalizeRoomLabel(originRaw)
    const destLabel = normalizeRoomLabel(destRaw)
    const instructions = []
    const totalPoints = routePoints.length

    const destEntry = meshes.current.find(e =>
      e.name === destRaw || e.name === destLabel || normalizeRoomLabel(e.name) === destLabel,
    )
    const destKey = destEntry?.key ?? null

    const turnSteps = collectVisibleTurnSteps(routePoints)

    const firstTurnIndex = turnSteps[0]?.index ?? (totalPoints - 1)
    const firstSegmentLength = segmentLength(routePoints, 0, firstTurnIndex)
    if (firstSegmentLength >= 3) {
      const firstStraight = buildStraightInstruction(
        routePoints,
        0,
        firstTurnIndex,
        destKey,
        `Sal desde ${originLabel}. `,
      )
      if (firstStraight) pushUniqueInstruction(instructions, firstStraight.text, firstStraight.voice)
    } else {
      pushUniqueInstruction(instructions, `Sal desde ${originLabel}.`)
    }

    for (let t = 0; t < turnSteps.length; t++) {
      const currentTurn = turnSteps[t]
      const point = routePoints[currentTurn.index]
      const refName = pickTurnReferenceName(point)

      let action = 'Gira'
      if (currentTurn.type === 'izquierda') action = 'Gira a la izquierda'
      else if (currentTurn.type === 'derecha') action = 'Gira a la derecha'
      else if (currentTurn.type === 'retorno') action = 'Da vuelta en U'

      const turnLine = refName
        ? `${action} en ${refName}.`
        : `${action} en el siguiente cruce.`
      pushUniqueInstruction(instructions, turnLine)

      const nextTurnIndex = turnSteps[t + 1]?.index ?? (totalPoints - 1)
      const afterTurnLength = segmentLength(routePoints, currentTurn.index, nextTurnIndex)
      /* Add straight guidance only on meaningful long spans to avoid repetitive noise. */
      if (afterTurnLength >= 10) {
        const straight = buildStraightInstruction(routePoints, currentTurn.index, nextTurnIndex, destKey)
        if (straight) pushUniqueInstruction(instructions, straight.text, straight.voice)
      }
    }

    pushUniqueInstruction(instructions, `Llegaste a ${destLabel}.`)

    return instructions
  }

  function pickBestSpanishVoice() {
    if (!window.speechSynthesis) return null
    const voices = window.speechSynthesis.getVoices() || []
    if (voices.length === 0) return null

    const scoreVoice = (v) => {
      const lang = String(v.lang || '').toLowerCase()
      const name = String(v.name || '').toLowerCase()
      let score = 0

      if (lang.startsWith('es-mx')) score += 55
      else if (lang.startsWith('es-es')) score += 45
      else if (lang.startsWith('es')) score += 35

      if (/natural|neural/.test(name)) score += 40
      if (/microsoft|google|siri|apple/.test(name)) score += 16
      if (/sabina|helena|paulina|jorge|dalia|sofia|sof[ií]a|alma/.test(name)) score += 14
      if (/desktop/.test(name)) score -= 5

      return score
    }

    return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null
  }

  function speakInstructions(instructions) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setNavSpeaking(true)

    const voice = pickBestSpanishVoice()

    let index = 0
    const speakNext = () => {
      if (index >= instructions.length || !navModeLiveRef.current) {
        setNavSpeaking(false)
        return
      }
      const instr = instructions[index]
      const utterance = new SpeechSynthesisUtterance(instr.voice)
      utterance.lang = voice?.lang || 'es-MX'
      utterance.rate = 0.91
      utterance.pitch = 1.03
      utterance.volume = 1
      if (voice) utterance.voice = voice

      utterance.onend = () => {
        index++
        const pause = 430 + Math.min(320, Math.round(instr.voice.length * 3.5))
        setTimeout(speakNext, pause)
      }
      utterance.onerror = () => {
        index++
        speakNext()
      }

      window.speechSynthesis.speak(utterance)
    }

    speakNext()
  }

  function toggleInstructionAudio() {
    if (navSpeaking) {
      window.speechSynthesis?.cancel()
      setNavSpeaking(false)
    } else {
      speakInstructions(navInstructions)
    }
  }

  async function buildRoute() {
    const graph = navGraphRef.current ?? await ensureNavGraphLoaded()
    const fromScene = navOriginPt.current
    const toScene   = navDestPt.current
    if (!graph || !fromScene || !toScene) return
    if (!navModeLiveRef.current) return

    clearRouteVisuals()
    if (selectedRef.current) deselectEntry(selectedRef.current)

    const fromNav = sceneToNavPoint(fromScene)
    const toNav = sceneToNavPoint(toScene)

    const routeStartNav = nearestReachablePointInComponent(fromNav, fromNav, graph, {
      clearance: 0.5,
      travelWeight: 0,
      targetWeight: 1.0,
      targetSlack: 0.8,
    })
    if (!routeStartNav) return

    const snappedOriginScene = navToScenePoint(routeStartNav)

    const startSnapDistSq = snappedOriginScene.distanceToSquared(fromScene)
    if (startSnapDistSq > 0.04) {
      navOriginPt.current = snappedOriginScene.clone()

      if (navMarkersRef.current.length > 0) {
        const oldOrigin = navMarkersRef.current.shift()
        oldOrigin.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
        R.current.scene?.remove(oldOrigin)
      }

      const newOriginMarker = addNavMarker(snappedOriginScene, 0x22cc44, 'origin')
      if (newOriginMarker && navMarkersRef.current[navMarkersRef.current.length - 1] === newOriginMarker) {
        navMarkersRef.current.pop()
        navMarkersRef.current.unshift(newOriginMarker)
      }
    }

    const routeTargetNav = nearestReachablePointInComponent(routeStartNav, toNav, graph, {
      clearance: 0.5,
      travelWeight: 0.14,
      targetWeight: 1.0,
      targetSlack: 1.6,
    })
    if (!routeTargetNav) return

    const waypointsNav = findPath(routeStartNav.clone(), routeTargetNav.clone(), graph, {
      turnPenalty: 3.2,
      centerWeight: 0.45,
      axisPenaltyWeight: 0.12,
      maxLengthRatio: 1.1,
    })

    const snappedDestScene = navToScenePoint(routeTargetNav)
    const snapDistSq = snappedDestScene.distanceToSquared(toScene)
    if (snapDistSq > 0.04) {
      navDestPt.current = snappedDestScene.clone()
      while (navMarkersRef.current.length > 1) {
        const old = navMarkersRef.current.pop()
        old.traverse(c => { c.geometry?.dispose(); c.material?.dispose() })
        R.current.scene?.remove(old)
      }
      addNavMarker(snappedDestScene, 0xff3333, 'dest')
    }

    if (!waypointsNav || waypointsNav.length < 2) return

    const routeStartScene = navToScenePoint(routeStartNav)
    const routeTargetScene = navToScenePoint(routeTargetNav)
    const rawWaypoints = waypointsNav.map(p => navToScenePoint(p.clone()))

    /* Flatten Y to the building floor level */
    const floorY = Math.min(routeStartScene.y, routeTargetScene.y) + 0.15
    rawWaypoints.forEach(p => { p.y = floorY })

    const routePoints = dedupePolylinePoints(simplifyOrthogonalPolyline(rawWaypoints, 0.18, graph))
    if (routePoints.length >= 2) {
      routePoints[0].copy(rawWaypoints[0])
      routePoints[routePoints.length - 1].copy(rawWaypoints[rawWaypoints.length - 1])
    }
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
    framePoints.push((navOriginPt.current ?? fromScene).clone())
    framePoints.push((navDestPt.current ?? routeTargetScene).clone())
    const routeFrame = fitRouteCameraToView(
      framePoints,
      R.current.camera,
      R.current.controls,
      ROUTE_FRAME_PAD_MULT,
    )
    if (routeFrame) {
      startCamAnim(routeFrame.pos, routeFrame.target)
    }

    /* Generate and speak instructions */
    const instructions = generateRouteInstructions(routePoints, {
      origin: navOriginLabelRef.current,
      dest: navDestLabelRef.current,
    })
    setNavInstructions(instructions)
    if (instructions.length > 0) {
      speakInstructions(instructions)
    }

    setNavActive(true)
    invalidateRenderRef.current()
  }

  function enterNavMode() {
    if (selectedRef.current) deselectEntry(selectedRef.current)
    isolateSelectedEntry(null)
    navDestPt.current = null
    setNavDestValue(null)
    setNavActive(false)
    setNavInstructions([])
    window.speechSynthesis?.cancel()
    setNavSpeaking(false)
    clearRouteVisuals()
    clearNavMarkers()
    /* Fixed origin per floor */
    const o = MODELS[activeModel].origin
    const originPt = new THREE.Vector3(o[0], o[1], o[2])
    navOriginPt.current = originPt
    setNavOriginValue('Entrada')
    addNavMarker(originPt, 0x22cc44, 'origin')
    setNavMode(true)

    // OPT: navmesh is loaded lazily only when navigation is requested.
    ensureNavGraphLoaded().then(() => {
      if (!navModeLiveRef.current) return
      invalidateRenderRef.current()
    })
  }

  handlersRef.current.onLabelClick = function(entryKey) {
    const { camera, defaultPos, defaultTarget } = R.current
    if (!camera || meshes.current.length === 0) return
    const entry = meshes.current.find(m => m.key === entryKey)
    if (!entry) return

    if (navMode) {
      /* Navigate to this piece */
      const center = getEntryWorldCenter(entry, 'focus')
      const pt = center.clone()

      navDestPt.current = pt
      setNavDestValue(entry.name)
      setNavActive(false)
      setNavInstructions([])
      window.speechSynthesis?.cancel()
      setNavSpeaking(false)
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

    const groupKey = entryToLabelGroupRef.current.get(entry.key)
    if (groupKey && labelGroupsRef.current.has(groupKey)) {
      // OPT: grouped labels expand first and do not trigger piece focus.
      expandLabelGroup(groupKey)
      const overlay = R.current.labelsOverlay
      if (overlay) overlay.style.opacity = labelsEnabledRef.current ? '1' : '0'
      updateLabelsLayoutRef.current({ snap: true })
      invalidateRenderRef.current()
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
    showLabelsForSelection(entry)
    isolateSelectedEntry(entry)
    const anchorPoint = getEntrySelectionAnchorWorld(entry)
    const { pos: camPos, target: camTarget, liftHeight } = fitEntryCameraUsingAnchor(entry, camera, anchorPoint, SELECT_CAM_PAD)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()
    entry._liftTimer = setTimeout(() => {
      if (selectedRef.current === entry)
        startMeshAnim(entry, liftLocalTarget(entry, liftHeight, anchorPoint), ANIM_LIFT, easeInOutQuart)
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
    const rayTargets = getActiveRayTargets(false)
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
    const rayTargets = getActiveRayTargets(navMode)
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
      setNavDestValue(label)
      setNavActive(false)
      setNavInstructions([])
      window.speechSynthesis?.cancel()
      setNavSpeaking(false)
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
    showLabelsForSelection(entry)
    isolateSelectedEntry(entry)

    const anchorPoint = getEntrySelectionAnchorWorld(entry)
    const { pos: camPos, target: camTarget, liftHeight } = fitEntryCameraUsingAnchor(entry, camera, anchorPoint, SELECT_CAM_PAD)
    startCamAnim(camPos, camTarget)
    clearIdleTimer()
    entry._liftTimer = setTimeout(() => {
      if (selectedRef.current === entry)
        startMeshAnim(entry, liftLocalTarget(entry, liftHeight, anchorPoint), ANIM_LIFT, easeInOutQuart)
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

    if (!ktx2LoaderRef.current) {
      const ktx2 = new KTX2Loader()
      // OPT: prepare Basis/KTX2 transcoding path for compressed textures.
      ktx2.setTranscoderPath(KTX2_TRANSCODER_PATH)
      ktx2.detectSupport(renderer)
      ktx2LoaderRef.current = ktx2
    } else {
      ktx2LoaderRef.current.detectSupport(renderer)
    }

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
      invalidateRenderRef.current()
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
    function updateLabelsOverlay(options = {}) {
      const snap = options.snap === true
      const resolveIterations = snap ? LABEL_OVERLAP_ITER_LOAD : LABEL_OVERLAP_ITER_DYNAMIC
      const labels = labelsDataRef.current
      if (labels.length === 0) return
      const cw = renderer.domElement.clientWidth
      const ch = renderer.domElement.clientHeight
      if (cw === 0 || ch === 0) return
      const PAD = 8
      const minDist = LABEL_OVERLAP_MIN_DIST

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
        if (!labelsEnabledRef.current || !lbl.onScreen || lbl._hidden) continue
        lbl.cx = lbl.anchorSX
        lbl.cy = lbl.anchorSY - 24
        vis.push(lbl)
      }

      /* 3 — Resolver solapamientos con separación mínima */
      for (let iter = 0; iter < resolveIterations; iter++) {
        let moved = false
        for (let i = 0; i < vis.length; i++) {
          const a = vis[i]
          for (let j = i + 1; j < vis.length; j++) {
            const b = vis[j]
            const dx = a.cx - b.cx
            const dy = a.cy - b.cy
            const dist = Math.sqrt((dx * dx) + (dy * dy))
            const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(dx)
            const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs(dy)
            const collisionByBox = overlapX > 0 && overlapY > 0
            const collisionByDistance = dist < minDist

            if (!collisionByBox && !collisionByDistance) continue

            moved = true
            if (dist > 0.0001 && collisionByDistance) {
              const push = ((minDist - dist) * 0.5) + 0.5
              const nx = dx / dist
              const ny = dy / dist
              a.cx += nx * push
              a.cy += ny * push
              b.cx -= nx * push
              b.cy -= ny * push
            } else {
              if (overlapX >= overlapY) {
                const shiftY = (overlapY * 0.5) + 1
                if (a.cy <= b.cy) { a.cy -= shiftY; b.cy += shiftY }
                else               { a.cy += shiftY; b.cy -= shiftY }
              } else {
                const shiftX = (overlapX * 0.5) + 1
                if (a.cx <= b.cx) { a.cx -= shiftX; b.cx += shiftX }
                else               { a.cx += shiftX; b.cx -= shiftX }
              }
            }
          }
        }
        if (!moved) break
      }

      /* 3b — Pass residual para escenas densas y evitar cruces persistentes */
      const residualPasses = snap ? 4 : 2
      for (let pass = 0; pass < residualPasses; pass++) {
        let adjusted = false
        vis.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx))

        for (let i = 0; i < vis.length; i++) {
          const a = vis[i]
          for (let j = i + 1; j < vis.length; j++) {
            const b = vis[j]
            const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(a.cx - b.cx)
            const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs(a.cy - b.cy)
            if (overlapX <= 0 || overlapY <= 0) continue

            adjusted = true
            const shiftY = overlapY + 1.6
            b.cy += shiftY
            const side = b.anchorSX >= a.anchorSX ? 1 : -1
            b.cx += side * Math.min(12, overlapX * 0.45 + 1)

            b.cx = Math.max(b.w / 2 + 2, Math.min(cw - b.w / 2 - 2, b.cx))
            b.cy = Math.max(b.h + 2, Math.min(ch - 2, b.cy))
          }
        }

        if (!adjusted) break
      }

      /* 4 — Acotar dentro del viewport */
      for (const lbl of vis) {
        lbl.cx = Math.max(lbl.w / 2 + 2, Math.min(cw - lbl.w / 2 - 2, lbl.cx))
        lbl.cy = Math.max(lbl.h + 2, Math.min(ch - 2, lbl.cy))
      }

      /* 4b — Barrido ordenado por lado para distribuir etiquetas claramente */
      const ordered = [...vis].sort((a, b) => (a.anchorSY - b.anchorSY) || (a.anchorSX - b.anchorSX))
      for (let i = 0; i < ordered.length; i++) {
        const lbl = ordered[i]
        const sideDir = lbl.anchorSX <= (cw * 0.5) ? -1 : 1
        const sideBase = sideDir < 0
          ? Math.min(lbl.cx, cw * 0.46)
          : Math.max(lbl.cx, cw * 0.54)

        lbl.cx = Math.max(lbl.w / 2 + 2, Math.min(cw - lbl.w / 2 - 2, sideBase))
        lbl.cy = Math.max(lbl.h + 2, Math.min(ch - 2, lbl.cy))

        for (let attempt = 0; attempt < 12; attempt++) {
          let collided = null
          for (let j = 0; j < i; j++) {
            const prev = ordered[j]
            const overlapX = (lbl.w / 2 + prev.w / 2 + PAD) - Math.abs(lbl.cx - prev.cx)
            const overlapY = (lbl.h / 2 + prev.h / 2 + PAD) - Math.abs(lbl.cy - prev.cy)
            if (overlapX > 0 && overlapY > 0) {
              collided = prev
              break
            }
          }

          if (!collided) break

          lbl.cy = collided.cy + (collided.h / 2 + lbl.h / 2 + PAD + 1.5)
          lbl.cx += sideDir * Math.min(22, 5 + attempt * 2.2)
          lbl.cx = Math.max(lbl.w / 2 + 2, Math.min(cw - lbl.w / 2 - 2, lbl.cx))
          lbl.cy = Math.max(lbl.h + 2, Math.min(ch - 2, lbl.cy))
        }
      }

      /* 4c — Reverse pass para compactar sin reintroducir solapes */
      for (let i = ordered.length - 1; i >= 0; i--) {
        const a = ordered[i]
        for (let j = i - 1; j >= 0; j--) {
          const b = ordered[j]
          const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(a.cx - b.cx)
          const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs(a.cy - b.cy)
          if (overlapX <= 0 || overlapY <= 0) continue
          b.cy = Math.max(b.h + 2, a.cy - (a.h / 2 + b.h / 2 + PAD + 1.5))
        }
      }

      /* 5 — Suavizar movimiento: lerp displayX/Y hacia cx/cy */
      const LERP = snap ? 1 : LABEL_MOVE_LERP
      const visibleLabels = []
      for (const lbl of labels) {
        const hidden = !labelsEnabledRef.current || !lbl.onScreen || lbl._hidden
        if (hidden) {
          lbl.el.style.display = 'none'
          lbl.lineEl.style.display = 'none'
          continue
        }

        if (!lbl.initialized || snap) {
          lbl.displayX = lbl.cx
          lbl.displayY = lbl.cy
          lbl.initialized = true
        } else {
          lbl.displayX += (lbl.cx - lbl.displayX) * LERP
          lbl.displayY += (lbl.cy - lbl.displayY) * LERP
          const dx = lbl.displayX - lbl.cx
          const dy = lbl.displayY - lbl.cy
          if (dx * dx + dy * dy < 0.25) {
            lbl.displayX = lbl.cx
            lbl.displayY = lbl.cy
          }
        }

        visibleLabels.push(lbl)
      }

      /* 5b — Si el lerp deja overlap visible, forzar snap local inmediato. */
      for (let pass = 0; pass < 2; pass++) {
        let corrected = false
        for (let i = 0; i < visibleLabels.length; i++) {
          const a = visibleLabels[i]
          for (let j = i + 1; j < visibleLabels.length; j++) {
            const b = visibleLabels[j]
            const overlapX = (a.w / 2 + b.w / 2 + 2) - Math.abs(a.displayX - b.displayX)
            const overlapY = (a.h / 2 + b.h / 2 + 2) - Math.abs(a.displayY - b.displayY)
            if (overlapX <= 0 || overlapY <= 0) continue

            corrected = true
            a.displayX = a.cx
            a.displayY = a.cy
            b.displayX = b.cx
            b.displayY = b.cy
          }
        }
        if (!corrected) break
      }

      for (const lbl of visibleLabels) {
        lbl.el.style.display  = ''
        lbl.el.style.visibility = 'visible'
        lbl.el.style.opacity = '1'
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

    updateLabelsLayoutRef.current = updateLabelsOverlay

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

    const runtime = {
      running: false,
      raf: 0,
      labelAcc: 0,
      needsRender: true,
      interacting: false,
      lastStatsLog: 0,
    }

    function scheduleRender() {
      runtime.needsRender = true
      if (runtime.running) return
      runtime.running = true
      timer.reset()
      runtime.raf = requestAnimationFrame(loop)
      r.raf = runtime.raf
    }

    function loop(now = performance.now()) {
      if (!runtime.running) return

      timer.update()
      const dt = timer.getDelta()

      const hadMeshAnims = animMap.current.size > 0
      const hadCamAnim = camAnim.current.active
      const hadNavAnim = navAnimRef.current.active

      tickMeshAnims(dt)
      tickCamAnim(dt)
      tickNavAnim(dt)

      let controlsChanged = false
      if (!camAnim.current.active) {
        controlsChanged = controls.update()
      }

      const animating =
        hadMeshAnims
        || hadCamAnim
        || hadNavAnim
        || animMap.current.size > 0
        || camAnim.current.active
        || navAnimRef.current.active

      const shouldRender = runtime.needsRender || controlsChanged || animating || loadingLiveRef.current

      if (shouldRender) {
        renderer.render(scene, camera)
        runtime.labelAcc += dt
        if (runtime.labelAcc >= (1 / LABEL_UPDATE_FPS)) {
          updateLabelsOverlay()
          runtime.labelAcc = 0
        }
        runtime.needsRender = false

        // OPT: lightweight runtime stats from renderer.info during development.
        if (import.meta.env.DEV && (now - runtime.lastStatsLog) >= DEV_STATS_LOG_INTERVAL_MS) {
          runtime.lastStatsLog = now
          const info = renderer.info
          console.debug(
            '[THREE][perf]',
            `calls=${info.render.calls}`,
            `triangles=${info.render.triangles}`,
            `points=${info.render.points}`,
          )
        }
      }

      const keepRunning =
        runtime.interacting
        || controlsChanged
        || animating
        || loadingLiveRef.current
        || runtime.needsRender

      if (keepRunning) {
        runtime.raf = requestAnimationFrame(loop)
        r.raf = runtime.raf
      } else {
        runtime.running = false
        runtime.raf = 0
        r.raf = 0
      }
    }

    invalidateRenderRef.current = scheduleRender
    scheduleRender()

    const onControlStart = () => {
      runtime.interacting = true
      scheduleRender()
    }
    const onControlEnd = () => {
      runtime.interacting = false
      scheduleRender()
    }
    const onControlChange = () => {
      scheduleRender()
    }
    controls.addEventListener('start', onControlStart)
    controls.addEventListener('end', onControlEnd)
    controls.addEventListener('change', onControlChange)

    const pmWrapper = (e) => handlersRef.current.onPointerMove?.(e)
    const clWrapper = (e) => handlersRef.current.onClick?.(e)
    renderer.domElement.addEventListener('pointermove', pmWrapper, { passive: true })
    renderer.domElement.addEventListener('click', clWrapper)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(runtime.raf || r.raf)
      clearTimeout(idleTimerRef.current)
      cleanupLabels()
      controls.removeEventListener('start', onControlStart)
      controls.removeEventListener('end', onControlEnd)
      controls.removeEventListener('change', onControlChange)
      renderer.domElement.removeEventListener('pointermove', pmWrapper)
      renderer.domElement.removeEventListener('click', clWrapper)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      if (mount.contains(labelsOverlay)) mount.removeChild(labelsOverlay)
      dracoLoaderRef.current?.dispose()
      dracoLoaderRef.current = null
      ktx2LoaderRef.current?.dispose()
      ktx2LoaderRef.current = null
      invalidateRenderRef.current = () => {}
      updateLabelsLayoutRef.current = () => {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { scene, camera, controls, renderer } = R.current
    if (!scene || !renderer) return

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
    loadingLiveRef.current = true
    setAssetError('')
    updateLoadProgress({
      phase: 'Preparando carga',
      loaded: 0,
      total: 0,
      reset: true,
    })
    setTransitioning(true)
    setSelectedName(null)
    setSelectedStatus(null)
    const emptyTooltip = { visible:false, name:'', x:0, y:0 }
    tooltipRef.current = emptyTooltip
    setTooltip(emptyTooltip)

    /* Limpiar labels del overlay antes de destruir los meshes */
    cleanupLabels()
    setLabelsVisible(false)

    scene.children.slice().forEach(child => {
      if (child.isLight) return
      scene.remove(child)
      disposeObj(child)
    })
    meshes.current      = []
    pickablesRef.current = []
    focusPickablesRef.current = []
    isolatedPickablesRef.current = []
    pickableToEntryRef.current.clear()
    labelsByKeyRef.current.clear()
    entryToLabelGroupRef.current.clear()
    labelGroupsRef.current.clear()
    expandedLabelGroupRef.current = null
    animMap.current.clear()
    hoverRef.current    = null
    selectedRef.current = null
    isolatedEntryRef.current = null
    camAnim.current.active = false
    navGraphRef.current = null
    navLoadStateRef.current.modelIndex = activeModel
    navLoadStateRef.current.loading = false
    navLoadStateRef.current.promise = null
    navOffsetRef.current.set(0, 0, 0)
    modelCenterRef.current.set(0, 0, 0)
    clearRouteVisuals()
    clearNavMarkers()

    // OPT: low-poly placeholder while the heavy GLB is parsed.
    const loadingProxy = createLoadingPlaceholderModel()
    scene.add(loadingProxy)
    loadingProxyRef.current = loadingProxy
    invalidateRenderRef.current()

    const loadingManager = new THREE.LoadingManager()
    loadingManager.onStart = () => {
      updateLoadProgress({
        phase: 'Descargando modelo',
        loaded: 0,
        total: 0,
      })
    }
    loadingManager.onLoad = () => {
      updateLoadProgress({
        phase: 'Procesando modelo',
        loaded: 1,
        total: 1,
      })
    }

    const modelLoader = new GLTFLoader(loadingManager)
    if (dracoLoaderRef.current) modelLoader.setDRACOLoader(dracoLoaderRef.current)
    if (ktx2LoaderRef.current) modelLoader.setKTX2Loader(ktx2LoaderRef.current)
    modelLoader.setMeshoptDecoder(MeshoptDecoder)

    modelLoader.load(
      withAssetRevision(MODELS[activeModel].file),
      gltf => {
        /* Si este efecto fue desmontado (StrictMode) no tocar nada */
        if (stale) return

        if (loadingProxyRef.current) {
          scene.remove(loadingProxyRef.current)
          disposeObj(loadingProxyRef.current)
          loadingProxyRef.current = null
        }

        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const cen = box.getCenter(new THREE.Vector3())
        modelCenterRef.current.copy(cen)
        model.position.sub(cen)
        scene.add(model)
        scene.updateMatrixWorld(true)

        const optimizedTextures = new Set()
        model.traverse(node => {
          // OPT: precompute bounds + texture filters once to reduce per-frame cost.
          optimizeMeshForRealtime(node, renderer, optimizedTextures)
        })

        /* Limpiar meshes por seguridad (doble protección) */
        meshes.current = []
        pickablesRef.current = []
        focusPickablesRef.current = []
        pickableToEntryRef.current.clear()

        const materialCache = new Map()

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
          const fullBounds = getBoundsForMeshList(objectMeshes)
          const fullSize = fullBounds.getSize(new THREE.Vector3())
          const dominantSize = Math.max(fullSize.x, fullSize.y, fullSize.z, 0.001)

          n++
          const rawName = root.name?.trim() || `Zona ${n}`
          const displayName = formatEntryName(rawName)
          root.name = rawName

          const colorMeshSet = new Set(focusMeshes)

          objectMeshes.forEach(m => {
            m.castShadow = ENABLE_SHADOWS
            m.receiveShadow = ENABLE_SHADOWS
            if (!colorMeshSet.has(m)) {
              // OPT: reuse equivalent static materials to lower memory pressure.
              m.material = applyMaterialCache(m.material, materialCache)
              return
            }
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
            dominantSize,
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

        const { entryToGroup, groups } = buildConsecutiveJGroups(meshes.current)
        entryToLabelGroupRef.current = entryToGroup
        labelGroupsRef.current = groups
        expandedLabelGroupRef.current = null

        /* ── Labels siempre visibles + tinte por estado ── */
        const nb = new THREE.Box3().setFromObject(model)
        const modelSize = nb.getSize(new THREE.Vector3())
        const modelMaxDim = Math.max(modelSize.x, modelSize.y, modelSize.z)
        const minRadius = modelMaxDim * MIN_LABEL_FRAC

        /* ── Crear labels en overlay DOM + tinte por estado ── */
        const overlay = R.current.labelsOverlay
        const svgEl   = R.current.labelsSvg
        labelsDataRef.current = []
        labelsByKeyRef.current.clear()

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
          div.style.visibility = 'hidden'
          div.style.opacity = '0'

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
            textEl: text,
            entryLabelName: entry.name,
            groupKey: entryToLabelGroupRef.current.get(entry.key) ?? null,
            w: 0, h: 0, cx: 0, cy: 0,
            displayX: 0, displayY: 0, initialized: false,
            anchorSX: 0, anchorSY: 0,
            onScreen: false, behind: false,
          }
          labelsDataRef.current.push(data)
          labelsByKeyRef.current.set(entry.key, data)
          entry._label = data
        })

        collapseAllLabelGroups()

        /* Medir tamaños reales tras append + init display pos */
        labelsDataRef.current.forEach(lbl => {
          measureLabelSize(lbl)
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

        // OPT: pre-layout labels so they appear directly in-place after load.
        updateLabelsLayoutRef.current({ snap: true })

        setLoading(false)
        loadingLiveRef.current = false
        setTransitioning(false)
        setLabelsVisible(true)
        updateLoadProgress({ phase: 'Modelo listo', loaded: 1, total: 1 })
        invalidateRenderRef.current()
      },
      xhr => {
        if (stale) return
        updateLoadProgress({
          phase: 'Descargando modelo',
          loaded: xhr?.loaded ?? 0,
          total: xhr?.total ?? 0,
        })
      },
      err => {
        if (stale) return
        console.error('GLB error', err)
        const modelFile = MODELS[activeModel]?.file ?? 'modelo'
        setAssetError(buildGlbErrorMessage(err, modelFile))
        updateLoadProgress({ phase: 'Error de carga', loaded: 0, total: 0 })
        setLoading(false)
        loadingLiveRef.current = false
        setTransitioning(false)
        if (loadingProxyRef.current) {
          scene.remove(loadingProxyRef.current)
          disposeObj(loadingProxyRef.current)
          loadingProxyRef.current = null
        }
        invalidateRenderRef.current()
      }
    )

    return () => {
      stale = true
      if (loadingProxyRef.current) {
        scene.remove(loadingProxyRef.current)
        disposeObj(loadingProxyRef.current)
        loadingProxyRef.current = null
      }
    }
  }, [activeModel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadingLiveRef.current = loading
    invalidateRenderRef.current()
  }, [loading])

  useEffect(() => {
    labelsEnabledRef.current = labelsEnabled

    if (selectedRef.current) {
      showLabelsForSelection(selectedRef.current)
    } else {
      setLabelsVisible(true)
    }

    if (labelsEnabled) {
      updateLabelsLayoutRef.current({ snap: true })
    }

    invalidateRenderRef.current()
  }, [labelsEnabled])

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
      invalidateRenderRef.current()
      return
    }

    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI * 0.88
    invalidateRenderRef.current()
  }, [navActive])

  useEffect(() => {
    navModeLiveRef.current = navMode
    invalidateRenderRef.current()
  }, [navMode])

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
    invalidateRenderRef.current()
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

        <button
          onClick={() => setLabelsEnabled(v => !v)}
          title={labelsEnabled ? 'Ocultar etiquetas' : 'Mostrar etiquetas'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 shrink-0"
          style={{
            background:'var(--color-bg)',
            color:'var(--color-text-muted)',
            border:'1px solid var(--color-border)',
          }}
        >
          {labelsEnabled ? <EyeOff size={12} /> : <Eye size={12} />}
          <span className="btn-label">{labelsEnabled ? 'Ocultar etiquetas' : 'Mostrar etiquetas'}</span>
          <span className="btn-short">Labels</span>
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
        {assetError && !loading && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[min(640px,92vw)] rounded-xl px-3 py-2 flex items-start gap-2"
            style={{
              background: 'rgba(255, 241, 242, 0.98)',
              border: '1px solid #fecdd3',
              color: '#9f1239',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            <XCircle size={16} className="shrink-0 mt-[2px]" />
            <p className="text-[12px] leading-5">{assetError}</p>
            <button
              type="button"
              onClick={() => setAssetError('')}
              className="ml-auto text-[11px] font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-70"
              style={{ color: '#9f1239', border: '1px solid #fda4af' }}
            >
              Cerrar
            </button>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background:'rgba(238,238,238,0.92)', backdropFilter:'blur(8px)' }}>
            <div className="w-9 h-9 rounded-full border-[3px] animate-spin"
              style={{ borderColor:'var(--color-border)', borderTopColor:'var(--color-primary)' }} />
            <p className="text-[13px] font-semibold" style={{ color:'var(--color-text)' }}>
              Cargando — {MODELS[activeModel].label}
            </p>
            <p className="text-[11px]" style={{ color:'var(--color-text-muted)' }}>
              {loadProgress.phase}
            </p>
            <div
              className="w-[min(360px,78vw)] h-2 rounded-full overflow-hidden"
              style={{ background:'rgba(0,0,0,0.10)' }}
            >
              <div
                className="h-full transition-all duration-200"
                style={{
                  // OPT: byte-aware progress feedback from XHR events/loading manager.
                  width: `${Math.max(2, Math.min(100, loadProgress.percent))}%`,
                  background: 'var(--color-primary)',
                }}
              />
            </div>
            <p className="text-[11px] tabular-nums" style={{ color:'var(--color-text-muted)' }}>
              {Math.round(loadProgress.percent)}%
              {loadProgress.total > 0
                ? ` · ${formatProgressMB(loadProgress.loaded)} / ${formatProgressMB(loadProgress.total)}`
                : (loadProgress.loaded > 0 ? ` · ${formatProgressMB(loadProgress.loaded)}` : '')}
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
                    setNavDestValue(null)
                    setNavActive(false)
                    setNavInstructions([])
                    window.speechSynthesis?.cancel()
                    setNavSpeaking(false)
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

        {/* ── Instructions panel ── */}
        {navActive && navInstructions.length > 0 && (
          <div className="nav-instructions-panel">
            <div className="nav-instructions-header">
              <span>Instrucciones</span>
              <button
                className="nav-instructions-audio-btn"
                onClick={toggleInstructionAudio}
                title={navSpeaking ? 'Pausar audio' : 'Reproducir audio'}
              >
                {navSpeaking ? '⏸️' : '🔊'}
              </button>
            </div>
            <div className="nav-instructions-list">
              {navInstructions.map((instr, idx) => (
                <div key={idx} className="nav-instruction-item">
                  <span className="nav-instruction-num">{idx + 1}</span>
                  <span className="nav-instruction-text">{instr.text}</span>
                </div>
              ))}
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