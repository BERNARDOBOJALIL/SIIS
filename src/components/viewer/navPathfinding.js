/**
 * NavMesh pathfinding: builds adjacency graph from triangle mesh,
 * runs A* on triangle centroids, then applies the Simple Stupid Funnel
 * algorithm for a smooth corridor path.
 */
import * as THREE from 'three'

/* ────────────────────────────────────────────
   1.  Build graph from BufferGeometry
   ──────────────────────────────────────────── */

/**
 * @param {THREE.BufferGeometry} geo  – indexed geometry from the navmesh GLB
 * @param {THREE.Matrix4} matrix      – world matrix of the navmesh node
 * @returns {{ verts: Float32Array, tris: Uint32Array, centroids: THREE.Vector3[],
 *             adj: number[][], edges: Map<string, [number,number]> }}
 */
export function buildNavGraph(geo, matrix) {
  /* ensure index + position exist */
  const pos = geo.attributes.position
  const idx = geo.index
  if (!pos || !idx) throw new Error('NavMesh geometry missing position or index')

  /* clone verts and apply world transform */
  const rawCount = pos.count
  const verts = new Float32Array(rawCount * 3)
  const _v = new THREE.Vector3()
  for (let i = 0; i < rawCount; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(matrix)
    verts[i * 3]     = _v.x
    verts[i * 3 + 1] = _v.y
    verts[i * 3 + 2] = _v.z
  }

  /* ── Canonical vertex mapping ──
     Unity nav meshes duplicate vertices at shared edges.
     We snap positions to an epsilon grid and map every raw index
     to a canonical index so edge-sharing works correctly. */
  const EPS = 0.001
  const canonMap = new Map()   // posKey → canonical index
  const canonical = new Uint32Array(rawCount)
  let nextCanon = 0
  for (let i = 0; i < rawCount; i++) {
    const kx = Math.round(verts[i * 3]     / EPS) * EPS
    const ky = Math.round(verts[i * 3 + 1] / EPS) * EPS
    const kz = Math.round(verts[i * 3 + 2] / EPS) * EPS
    const key = `${kx.toFixed(3)},${ky.toFixed(3)},${kz.toFixed(3)}`
    if (canonMap.has(key)) {
      canonical[i] = canonMap.get(key)
    } else {
      canonMap.set(key, nextCanon)
      canonical[i] = nextCanon++
    }
  }

  const triCount = idx.count / 3
  const tris     = new Uint32Array(idx.count)
  for (let i = 0; i < idx.count; i++) tris[i] = idx.getX(i)

  /* centroids */
  const centroids = []
  for (let t = 0; t < triCount; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2]
    centroids.push(new THREE.Vector3(
      (verts[a * 3] + verts[b * 3] + verts[c * 3]) / 3,
      (verts[a * 3 + 1] + verts[b * 3 + 1] + verts[c * 3 + 1]) / 3,
      (verts[a * 3 + 2] + verts[b * 3 + 2] + verts[c * 3 + 2]) / 3,
    ))
  }

  /* adjacency using CANONICAL indices so duplicated verts still match */
  const edgeMap = new Map()   // "canon0-canon1" → [triIdx, …]
  function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}` }

  for (let t = 0; t < triCount; t++) {
    const c0 = canonical[tris[t * 3]]
    const c1 = canonical[tris[t * 3 + 1]]
    const c2 = canonical[tris[t * 3 + 2]]
    for (const ek of [edgeKey(c0, c1), edgeKey(c1, c2), edgeKey(c2, c0)]) {
      if (!edgeMap.has(ek)) edgeMap.set(ek, [])
      edgeMap.get(ek).push(t)
    }
  }

  const adj = Array.from({ length: triCount }, () => [])
  const sharedEdges = new Map()   // "triA-triB" → [rawVertA, rawVertB]

  edgeMap.forEach((triList, ek) => {
    if (triList.length < 2) return
    /* Register adjacency between every pair sharing this edge */
    for (let i = 0; i < triList.length; i++) {
      for (let j = i + 1; j < triList.length; j++) {
        const a = triList[i], b = triList[j]
        if (!adj[a].includes(b)) adj[a].push(b)
        if (!adj[b].includes(a)) adj[b].push(a)
        /* Store one representative raw-vertex pair for the portal edge.
           Pick the first raw vert from each canonical index. */
        const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`
        if (!sharedEdges.has(pairKey)) {
          const [cv0, cv1] = ek.split('-').map(Number)
          /* Find a raw index that maps to each canonical index,
             preferring one that belongs to triangle a */
          let rv0 = -1, rv1 = -1
          for (let vi = 0; vi < 3; vi++) {
            const raw = tris[a * 3 + vi]
            if (canonical[raw] === cv0 && rv0 < 0) rv0 = raw
            if (canonical[raw] === cv1 && rv1 < 0) rv1 = raw
          }
          if (rv0 < 0 || rv1 < 0) {
            /* Fallback: search from triangle b */
            for (let vi = 0; vi < 3; vi++) {
              const raw = tris[b * 3 + vi]
              if (canonical[raw] === cv0 && rv0 < 0) rv0 = raw
              if (canonical[raw] === cv1 && rv1 < 0) rv1 = raw
            }
          }
          if (rv0 >= 0 && rv1 >= 0) sharedEdges.set(pairKey, [rv0, rv1])
        }
      }
    }
  })

  console.log(`[Nav] Graph: ${triCount} tris, ${nextCanon} unique verts (from ${rawCount}), ` +
    `adj edges: ${sharedEdges.size}, isolated: ${adj.filter(a => a.length === 0).length}`)

  return { verts, tris, centroids, adj, sharedEdges, triCount }
}

/* ────────────────────────────────────────────
   2.  Locate point → triangle
   ──────────────────────────────────────────── */

const _abc = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
const _pt  = new THREE.Vector3()

function pointInTriXZ(px, pz, ax, az, bx, bz, cx, cz) {
  const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz)
  const d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz)
  const d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az)
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
  return !(hasNeg && hasPos)
}

/**
 * Find the triangle index that contains the XZ projection of `point`.
 * Falls back to nearest centroid if no containment (mesh/model offset).
 */
export function findTriangle(point, graph) {
  const { verts, tris, triCount, centroids } = graph
  /* Exact containment in XZ */
  for (let t = 0; t < triCount; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2]
    if (pointInTriXZ(
      point.x, point.z,
      verts[a * 3], verts[a * 3 + 2],
      verts[b * 3], verts[b * 3 + 2],
      verts[c * 3], verts[c * 3 + 2],
    )) return t
  }
  /* Fallback: nearest centroid */
  let best = 0, bestD = Infinity
  for (let t = 0; t < triCount; t++) {
    const dx = centroids[t].x - point.x
    const dz = centroids[t].z - point.z
    const d = dx * dx + dz * dz
    if (d < bestD) { bestD = d; best = t }
  }
  return best
}

/* ────────────────────────────────────────────
   3.  A* on triangle graph
   ──────────────────────────────────────────── */

export function astar(startTri, endTri, graph) {
  const { centroids, adj } = graph
  const open = new Set([startTri])
  const cameFrom = new Map()
  const gScore = new Map([[startTri, 0]])
  const fScore = new Map([[startTri, centroids[startTri].distanceTo(centroids[endTri])]])

  while (open.size > 0) {
    /* pick node in open with lowest fScore */
    let current = -1, best = Infinity
    for (const n of open) {
      const f = fScore.get(n) ?? Infinity
      if (f < best) { best = f; current = n }
    }
    if (current === endTri) {
      /* reconstruct */
      const path = [current]
      while (cameFrom.has(current)) {
        current = cameFrom.get(current)
        path.push(current)
      }
      path.reverse()
      return path
    }
    open.delete(current)
    for (const nb of adj[current]) {
      const tentG = (gScore.get(current) ?? Infinity) +
        centroids[current].distanceTo(centroids[nb])
      if (tentG < (gScore.get(nb) ?? Infinity)) {
        cameFrom.set(nb, current)
        gScore.set(nb, tentG)
        fScore.set(nb, tentG + centroids[nb].distanceTo(centroids[endTri]))
        open.add(nb)
      }
    }
  }
  return null  // no path
}

/* ────────────────────────────────────────────
   4.  Simple Stupid Funnel (Mikko Mononen)
   ──────────────────────────────────────────── */

function triArea2D(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)
}

/**
 * Given a sequence of triangles (A*), extract the portal edges and run
 * the funnel algorithm to get a smooth polyline path.
 * @returns {THREE.Vector3[]}
 */
export function funnelPath(triPath, startPt, endPt, graph) {
  if (!triPath || triPath.length === 0) return []
  if (triPath.length === 1) return [startPt.clone(), endPt.clone()]

  const { verts, sharedEdges, centroids } = graph

  /* Build portal list */
  const portals = []
  portals.push({ left: startPt.clone(), right: startPt.clone() })

  for (let i = 0; i < triPath.length - 1; i++) {
    const a = triPath[i], b = triPath[i + 1]
    const pk = a < b ? `${a}-${b}` : `${b}-${a}`
    const ev = sharedEdges.get(pk)
    if (!ev) continue
    const [v0, v1] = ev
    const p0 = new THREE.Vector3(verts[v0 * 3], verts[v0 * 3 + 1], verts[v0 * 3 + 2])
    const p1 = new THREE.Vector3(verts[v1 * 3], verts[v1 * 3 + 1], verts[v1 * 3 + 2])
    /* Determine left/right using the centroid of the CURRENT triangle
       (the one we're leaving). This keeps winding consistent even for
       long curved paths where startPt is far away. */
    const curCen = centroids[a]
    if (triArea2D(curCen, p0, p1) > 0) {
      portals.push({ left: p0, right: p1 })
    } else {
      portals.push({ left: p1, right: p0 })
    }
  }
  portals.push({ left: endPt.clone(), right: endPt.clone() })

  /* Funnel algorithm with infinite-loop guard */
  const MAX_ITERS = portals.length * 3
  let iters = 0
  const pts = []
  let apex = portals[0].left.clone()
  let apexIdx = 0
  let leftIdx = 0, rightIdx = 0
  let portalLeft = portals[0].left.clone()
  let portalRight = portals[0].right.clone()
  pts.push(apex.clone())

  for (let i = 1; i < portals.length; i++) {
    if (++iters > MAX_ITERS) { console.warn('[Nav] Funnel loop limit'); break }
    const newLeft  = portals[i].left
    const newRight = portals[i].right

    /* Update right */
    if (triArea2D(apex, portalRight, newRight) <= 0) {
      if (apex.equals(portalRight) || triArea2D(apex, portalLeft, newRight) > 0) {
        portalRight = newRight.clone()
        rightIdx = i
      } else {
        pts.push(portalLeft.clone())
        apex = portalLeft.clone()
        apexIdx = leftIdx
        portalLeft = apex.clone()
        portalRight = apex.clone()
        leftIdx = apexIdx
        rightIdx = apexIdx
        i = apexIdx + 1
        continue
      }
    }

    /* Update left */
    if (triArea2D(apex, portalLeft, newLeft) >= 0) {
      if (apex.equals(portalLeft) || triArea2D(apex, portalRight, newLeft) < 0) {
        portalLeft = newLeft.clone()
        leftIdx = i
      } else {
        pts.push(portalRight.clone())
        apex = portalRight.clone()
        apexIdx = rightIdx
        portalLeft = apex.clone()
        portalRight = apex.clone()
        leftIdx = apexIdx
        rightIdx = apexIdx
        i = apexIdx + 1
        continue
      }
    }
  }

  /* Append end if not already there */
  const last = pts[pts.length - 1]
  if (!last.equals(endPt)) pts.push(endPt.clone())

  return pts
}

/* ────────────────────────────────────────────
   5.  High-level: find smooth path between
       two world positions through nav mesh
   ──────────────────────────────────────────── */

/**
 * @param {THREE.Vector3} from
 * @param {THREE.Vector3} to
 * @param {object} graph   – output of buildNavGraph()
 * @returns {THREE.Vector3[] | null}
 */
export function findPath(from, to, graph) {
  const startTri = findTriangle(from, graph)
  const endTri   = findTriangle(to,   graph)
  console.log('[Nav] findPath: startTri', startTri,
    'centroid', graph.centroids[startTri]?.toArray().map(v=>v.toFixed(2)),
    '| endTri', endTri,
    'centroid', graph.centroids[endTri]?.toArray().map(v=>v.toFixed(2)))
  const triRoute = astar(startTri, endTri, graph)
  console.log('[Nav] A* route:', triRoute ? triRoute.length + ' tris' : 'null')
  if (!triRoute) return null

  /* Try funnel first */
  const funnel = funnelPath(triRoute, from, to, graph)
  if (funnel && funnel.length >= 2) {
    console.log('[Nav] Funnel path:', funnel.length, 'waypoints')
    return funnel
  }

  /* Fallback: use triangle centroids as path */
  console.log('[Nav] Funnel failed, using centroid fallback')
  const pts = [from.clone()]
  for (const t of triRoute) pts.push(graph.centroids[t].clone())
  pts.push(to.clone())
  return pts
}
