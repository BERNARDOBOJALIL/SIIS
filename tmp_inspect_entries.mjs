import fs from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

globalThis.self = globalThis
if (!globalThis.createImageBitmap) globalThis.createImageBitmap = async () => ({})

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

function getEntryFrame(meshes) {
  const centers = []
  let wSum = 0
  let wx = 0
  let wz = 0

  meshes.forEach(mesh => {
    const bb = new THREE.Box3().setFromObject(mesh)
    if (bb.isEmpty()) return
    const sz = bb.getSize(new THREE.Vector3())
    const c = bb.getCenter(new THREE.Vector3())
    const w = Math.max(sz.x * sz.z, 0.0001)
    centers.push({ c, hx: sz.x * 0.5, hz: sz.z * 0.5 })
    wx += c.x * w
    wz += c.z * w
    wSum += w
  })

  if (centers.length === 0) return null
  const cx = wSum > 0
    ? (wx / wSum)
    : centers.reduce((acc, it) => acc + it.c.x, 0) / centers.length
  const cz = wSum > 0
    ? (wz / wSum)
    : centers.reduce((acc, it) => acc + it.c.z, 0) / centers.length

  let hx = 0
  let hz = 0
  centers.forEach(({ c, hx: mx, hz: mz }) => {
    hx = Math.max(hx, Math.abs(c.x - cx) + mx)
    hz = Math.max(hz, Math.abs(c.z - cz) + mz)
  })
  return { width: hx * 2, depth: hz * 2 }
}

function inspect(file) {
  const buf = fs.readFileSync(file)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const loader = new GLTFLoader()

  return new Promise((resolve, reject) => {
    loader.parse(
      ab,
      '',
      gltf => {
        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const cen = box.getCenter(new THREE.Vector3())
        model.position.sub(cen)
        model.updateMatrixWorld(true)

        const roots = resolveInteractiveRoots(model)
        const rows = roots.map((root, i) => {
          const name = (root.name || '').trim() || `Zona ${i + 1}`
          const meshes = collectObjectMeshes(root)
          const frame = getEntryFrame(meshes)
          const area = frame ? (frame.width * frame.depth) : 0
          return {
            name,
            meshes: meshes.length,
            w: frame?.width ?? 0,
            d: frame?.depth ?? 0,
            area,
          }
        })
        rows.sort((a, b) => b.area - a.area)

        console.log('---', file, 'roots:', rows.length)
        rows.slice(0, 25).forEach(r => {
          console.log(`${r.name} | meshes=${r.meshes} | frame=${r.w.toFixed(2)} x ${r.d.toFixed(2)} | area=${r.area.toFixed(2)}`)
        })
        resolve()
      },
      err => reject(err),
    )
  })
}

async function main() {
  await inspect('public/assempbfinal 1.glb')
  await inspect('public/assempaiditfinal.glb')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
