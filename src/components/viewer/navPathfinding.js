/**
 * Orthogonal interior pathfinding over navmesh.
 *
 * Strategy:
 * 1) Build a triangle graph + fast triangle point queries from navmesh.
 * 2) Build an orthogonal (N/S/E/W) walkable grid inside navmesh.
 * 3) Run A* with Manhattan heuristic and turn/center penalties.
 * 4) Return route simplified to straight segments + 90-degree turns only.
 */
import * as THREE from 'three'

const TRI_EPS = 1e-4
const DEFAULT_GRID_CELL = 0.72
const MAX_GRID_CELLS = 220000

const DIRS = [
  { dx: 1, dz: 0, axis: 'x' },
  { dx: -1, dz: 0, axis: 'x' },
  { dx: 0, dz: 1, axis: 'z' },
  { dx: 0, dz: -1, axis: 'z' },
]

function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function cellKey(ix, iz) {
  return `${ix},${iz}`
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function pointInTriXZ(px, pz, ax, az, bx, bz, cx, cz) {
  const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz)
  const d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz)
  const d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az)

  const hasNeg = (d1 < -TRI_EPS) || (d2 < -TRI_EPS) || (d3 < -TRI_EPS)
  const hasPos = (d1 > TRI_EPS) || (d2 > TRI_EPS) || (d3 > TRI_EPS)
  return !(hasNeg && hasPos)
}

function boundsFromTriangles(triBounds, triCount) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (let t = 0; t < triCount; t++) {
    minX = Math.min(minX, triBounds[t * 4])
    maxX = Math.max(maxX, triBounds[t * 4 + 1])
    minZ = Math.min(minZ, triBounds[t * 4 + 2])
    maxZ = Math.max(maxZ, triBounds[t * 4 + 3])
  }

  return { minX, maxX, minZ, maxZ }
}

function getSpatialCandidates(x, z, graph) {
  const spatial = graph.spatialHash
  if (!spatial) return null
  const ix = Math.floor(x / spatial.cellSize)
  const iz = Math.floor(z / spatial.cellSize)
  return spatial.cells.get(cellKey(ix, iz)) ?? null
}

function triContainsXZ(tri, x, z, graph) {
  const { triBounds, tris, verts } = graph

  const minX = triBounds[tri * 4] - TRI_EPS
  const maxX = triBounds[tri * 4 + 1] + TRI_EPS
  const minZ = triBounds[tri * 4 + 2] - TRI_EPS
  const maxZ = triBounds[tri * 4 + 3] + TRI_EPS
  if (x < minX || x > maxX || z < minZ || z > maxZ) return false

  const ia = tris[tri * 3]
  const ib = tris[tri * 3 + 1]
  const ic = tris[tri * 3 + 2]

  return pointInTriXZ(
    x,
    z,
    verts[ia * 3], verts[ia * 3 + 2],
    verts[ib * 3], verts[ib * 3 + 2],
    verts[ic * 3], verts[ic * 3 + 2],
  )
}

function pointInNavMeshStrict(x, z, graph) {
  const candidates = getSpatialCandidates(x, z, graph)
  if (candidates && candidates.length > 0) {
    for (let i = 0; i < candidates.length; i++) {
      if (triContainsXZ(candidates[i], x, z, graph)) return true
    }
    return false
  }

  const triCount = graph.triCount ?? 0
  for (let t = 0; t < triCount; t++) {
    if (triContainsXZ(t, x, z, graph)) return true
  }
  return false
}

function idxToCoord(index, width) {
  const ix = index % width
  const iz = (index - ix) / width
  return { ix, iz }
}

function coordToIdx(ix, iz, width) {
  return (iz * width) + ix
}

function cellCenter(index, grid, y = 0) {
  const { ix, iz } = idxToCoord(index, grid.width)
  return new THREE.Vector3(
    grid.originX + (ix * grid.cellSize),
    y,
    grid.originZ + (iz * grid.cellSize),
  )
}

function inside(ix, iz, grid) {
  return ix >= 0 && iz >= 0 && ix < grid.width && iz < grid.height
}

function neighborIndices(index, grid) {
  const { ix, iz } = idxToCoord(index, grid.width)
  const out = []

  for (let d = 0; d < DIRS.length; d++) {
    const nx = ix + DIRS[d].dx
    const nz = iz + DIRS[d].dz
    if (!inside(nx, nz, grid)) continue
    out.push({ idx: coordToIdx(nx, nz, grid.width), dir: d })
  }

  return out
}

function buildOrthogonalGrid(graph, options = {}) {
  const triCount = graph.triCount ?? 0
  if (triCount <= 0) {
    return {
      cellSize: DEFAULT_GRID_CELL,
      originX: 0,
      originZ: 0,
      width: 0,
      height: 0,
      walkable: new Uint8Array(0),
      component: new Int32Array(0),
      clearance: new Float32Array(0),
      maxClearance: 1,
      walkableIds: [],
      walkableCount: 0,
      componentSizes: [],
    }
  }

  const b = boundsFromTriangles(graph.triBounds, triCount)

  let cellSize = Math.max(0.35, options.gridCellSize ?? DEFAULT_GRID_CELL)
  let width = 0
  let height = 0
  let originX = 0
  let originZ = 0

  for (let guard = 0; guard < 10; guard++) {
    const pad = cellSize * 2
    originX = b.minX - pad
    originZ = b.minZ - pad

    width = Math.max(1, Math.ceil(((b.maxX - b.minX) + (pad * 2)) / cellSize) + 1)
    height = Math.max(1, Math.ceil(((b.maxZ - b.minZ) + (pad * 2)) / cellSize) + 1)

    if ((width * height) <= MAX_GRID_CELLS) break
    cellSize *= 1.18
  }

  const total = width * height
  const walkable = new Uint8Array(total)
  const walkableIds = []

  for (let iz = 0; iz < height; iz++) {
    for (let ix = 0; ix < width; ix++) {
      const id = coordToIdx(ix, iz, width)
      const x = originX + (ix * cellSize)
      const z = originZ + (iz * cellSize)
      if (!pointInNavMeshStrict(x, z, graph)) continue
      walkable[id] = 1
      walkableIds.push(id)
    }
  }

  const component = new Int32Array(total)
  component.fill(-1)
  const componentSizes = []

  const queue = new Int32Array(total)
  for (let i = 0; i < walkableIds.length; i++) {
    const seed = walkableIds[i]
    if (component[seed] >= 0) continue

    const compId = componentSizes.length
    let head = 0
    let tail = 0
    queue[tail++] = seed
    component[seed] = compId
    let size = 0

    while (head < tail) {
      const cur = queue[head++]
      size += 1
      const nbs = neighborIndices(cur, { width, height })
      for (let k = 0; k < nbs.length; k++) {
        const nb = nbs[k].idx
        if (!walkable[nb] || component[nb] >= 0) continue
        component[nb] = compId
        queue[tail++] = nb
      }
    }

    componentSizes.push(size)
  }

  const clearance = new Float32Array(total)
  const dist = new Int32Array(total)
  dist.fill(-1)

  let head = 0
  let tail = 0

  for (let i = 0; i < walkableIds.length; i++) {
    const id = walkableIds[i]
    const { ix, iz } = idxToCoord(id, width)

    let border = false
    for (let d = 0; d < DIRS.length; d++) {
      const nx = ix + DIRS[d].dx
      const nz = iz + DIRS[d].dz
      if (!inside(nx, nz, { width, height })) {
        border = true
        break
      }
      const nb = coordToIdx(nx, nz, width)
      if (!walkable[nb]) {
        border = true
        break
      }
    }

    if (border) {
      dist[id] = 0
      queue[tail++] = id
    }
  }

  while (head < tail) {
    const cur = queue[head++]
    const curD = dist[cur]
    const nbs = neighborIndices(cur, { width, height })

    for (let k = 0; k < nbs.length; k++) {
      const nb = nbs[k].idx
      if (!walkable[nb] || dist[nb] >= 0) continue
      dist[nb] = curD + 1
      queue[tail++] = nb
    }
  }

  let maxClearance = cellSize * 0.5
  for (let i = 0; i < walkableIds.length; i++) {
    const id = walkableIds[i]
    const d = dist[id] >= 0 ? dist[id] : 0
    const c = (d + 0.5) * cellSize
    clearance[id] = c
    if (c > maxClearance) maxClearance = c
  }

  return {
    cellSize,
    originX,
    originZ,
    width,
    height,
    walkable,
    component,
    clearance,
    maxClearance,
    walkableIds,
    walkableCount: walkableIds.length,
    componentSizes,
  }
}

function nearestWalkableCell(point, grid, componentFilter = -1) {
  if (!grid || grid.walkableCount <= 0) return -1

  const cx = clamp(Math.round((point.x - grid.originX) / grid.cellSize), 0, grid.width - 1)
  const cz = clamp(Math.round((point.z - grid.originZ) / grid.cellSize), 0, grid.height - 1)

  let best = -1
  let bestD2 = Infinity
  let bestClear = -Infinity

  const consider = (ix, iz) => {
    if (!inside(ix, iz, grid)) return
    const id = coordToIdx(ix, iz, grid.width)
    if (!grid.walkable[id]) return
    if (componentFilter >= 0 && grid.component[id] !== componentFilter) return

    const x = grid.originX + (ix * grid.cellSize)
    const z = grid.originZ + (iz * grid.cellSize)
    const dx = x - point.x
    const dz = z - point.z
    const d2 = (dx * dx) + (dz * dz)
    const c = grid.clearance[id]

    if (
      d2 < bestD2 - 1e-8
      || (Math.abs(d2 - bestD2) <= 1e-8 && c > bestClear)
    ) {
      best = id
      bestD2 = d2
      bestClear = c
    }
  }

  const maxR = Math.max(grid.width, grid.height)
  for (let r = 0; r <= maxR; r++) {
    if (r === 0) {
      consider(cx, cz)
    } else {
      const minX = cx - r
      const maxX = cx + r
      const minZ = cz - r
      const maxZ = cz + r

      for (let ix = minX; ix <= maxX; ix++) {
        consider(ix, minZ)
        consider(ix, maxZ)
      }
      for (let iz = minZ + 1; iz < maxZ; iz++) {
        consider(minX, iz)
        consider(maxX, iz)
      }
    }

    if (best >= 0) {
      const reached = Math.sqrt(bestD2)
      if (reached <= (r * grid.cellSize) + grid.cellSize) break
    }
  }

  if (best >= 0) return best

  for (let i = 0; i < grid.walkableIds.length; i++) {
    const id = grid.walkableIds[i]
    if (componentFilter >= 0 && grid.component[id] !== componentFilter) continue

    const { ix, iz } = idxToCoord(id, grid.width)
    const x = grid.originX + (ix * grid.cellSize)
    const z = grid.originZ + (iz * grid.cellSize)
    const dx = x - point.x
    const dz = z - point.z
    const d2 = (dx * dx) + (dz * dz)
    const c = grid.clearance[id]

    if (
      d2 < bestD2 - 1e-8
      || (Math.abs(d2 - bestD2) <= 1e-8 && c > bestClear)
    ) {
      best = id
      bestD2 = d2
      bestClear = c
    }
  }

  return best
}

class MinHeap {
  constructor() {
    this.arr = []
  }

  push(item) {
    this.arr.push(item)
    this.up(this.arr.length - 1)
  }

  up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.arr[p].f <= this.arr[i].f) break
      const t = this.arr[p]
      this.arr[p] = this.arr[i]
      this.arr[i] = t
      i = p
    }
  }

  pop() {
    if (this.arr.length === 0) return null
    const root = this.arr[0]
    const tail = this.arr.pop()
    if (this.arr.length > 0) {
      this.arr[0] = tail
      this.down(0)
    }
    return root
  }

  down(i) {
    const n = this.arr.length
    while (true) {
      const l = (i * 2) + 1
      const r = l + 1
      let best = i
      if (l < n && this.arr[l].f < this.arr[best].f) best = l
      if (r < n && this.arr[r].f < this.arr[best].f) best = r
      if (best === i) break
      const t = this.arr[i]
      this.arr[i] = this.arr[best]
      this.arr[best] = t
      i = best
    }
  }

  get size() {
    return this.arr.length
  }
}

function manhattanFromCells(aCell, bCell, grid) {
  const a = idxToCoord(aCell, grid.width)
  const b = idxToCoord(bCell, grid.width)
  return (Math.abs(a.ix - b.ix) + Math.abs(a.iz - b.iz)) * grid.cellSize
}

function reconstructCellPath(goalState, parent, grid) {
  const cells = []
  let s = goalState
  while (s >= 0) {
    const cell = Math.floor(s / 5)
    if (cells.length === 0 || cells[cells.length - 1] !== cell) cells.push(cell)
    s = parent[s]
  }
  cells.reverse()
  return cells
}

function simplifyOrthogonalPoints(points) {
  if (!points || points.length <= 2) return points ? points.map(p => p.clone()) : []

  const dedup = [points[0].clone()]
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceToSquared(dedup[dedup.length - 1]) <= 1e-8) continue
    dedup.push(points[i].clone())
  }

  if (dedup.length <= 2) return dedup

  const out = [dedup[0].clone()]
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1]
    const b = dedup[i]
    const c = dedup[i + 1]

    const sameX = Math.abs(a.x - b.x) <= 1e-5 && Math.abs(b.x - c.x) <= 1e-5
    const sameZ = Math.abs(a.z - b.z) <= 1e-5 && Math.abs(b.z - c.z) <= 1e-5

    if (sameX || sameZ) continue
    out.push(b.clone())
  }

  out.push(dedup[dedup.length - 1].clone())
  return out
}

function cellPathLength(cellPath, grid) {
  if (!cellPath || cellPath.length <= 1) return 0
  return (cellPath.length - 1) * grid.cellSize
}

function cellPathTurns(cellPath, grid) {
  if (!cellPath || cellPath.length < 3) return 0
  let turns = 0
  let prevAxis = null

  for (let i = 1; i < cellPath.length; i++) {
    const a = idxToCoord(cellPath[i - 1], grid.width)
    const b = idxToCoord(cellPath[i], grid.width)
    const axis = Math.abs(b.ix - a.ix) >= Math.abs(b.iz - a.iz) ? 'x' : 'z'
    if (prevAxis && axis !== prevAxis) turns += 1
    prevAxis = axis
  }

  return turns
}

function cellPathCenterPenalty(cellPath, grid) {
  if (!cellPath || cellPath.length <= 1) return 0
  const denom = Math.max(grid.maxClearance, 1e-6)
  let total = 0

  for (let i = 1; i < cellPath.length; i++) {
    const cell = cellPath[i]
    const wallProx = 1 - (grid.clearance[cell] / denom)
    total += Math.max(0, wallProx)
  }

  return total
}

function evaluateCellPath(cellPath, grid, options) {
  const turnPenalty = options.turnPenalty ?? 2.8
  const centerWeight = options.centerWeight ?? 0.45

  const length = cellPathLength(cellPath, grid)
  const turns = cellPathTurns(cellPath, grid)
  const centerPenalty = cellPathCenterPenalty(cellPath, grid)

  return {
    length,
    turns,
    centerPenalty,
    score: length + (turns * turnPenalty) + (centerPenalty * centerWeight),
  }
}

/**
 * A* over orthogonal grid states (cell + previous direction).
 */
export function astar(startCell, endCell, graph, options = {}) {
  const grid = graph?.orthGrid
  if (!grid || grid.walkableCount <= 0) return null
  if (startCell < 0 || endCell < 0) return null

  const totalCells = grid.width * grid.height
  const stateCount = totalCells * 5 // 4 dirs + start-state dir=4

  const g = new Float64Array(stateCount)
  const f = new Float64Array(stateCount)
  const parent = new Int32Array(stateCount)
  const closed = new Uint8Array(stateCount)

  g.fill(Infinity)
  f.fill(Infinity)
  parent.fill(-1)

  const turnPenalty = options.turnPenalty ?? 2.8
  const centerWeight = options.centerWeight ?? 0.45
  const axisPenaltyWeight = options.axisPenaltyWeight ?? 0.12

  const startCoord = idxToCoord(startCell, grid.width)
  const endCoord = idxToCoord(endCell, grid.width)
  const principalAxis = Math.abs(endCoord.ix - startCoord.ix) >= Math.abs(endCoord.iz - startCoord.iz) ? 'x' : 'z'

  const startState = (startCell * 5) + 4
  g[startState] = 0
  f[startState] = manhattanFromCells(startCell, endCell, grid)

  const heap = new MinHeap()
  heap.push({ state: startState, f: f[startState] })

  const startComp = grid.component[startCell]
  let goalState = -1

  while (heap.size > 0) {
    const node = heap.pop()
    if (!node) break

    const curState = node.state
    if (node.f > f[curState] + 1e-8) continue
    if (closed[curState]) continue
    closed[curState] = 1

    const curCell = Math.floor(curState / 5)
    const curDir = curState % 5

    if (curCell === endCell) {
      goalState = curState
      break
    }

    const cur = idxToCoord(curCell, grid.width)
    const candidates = []

    for (let d = 0; d < DIRS.length; d++) {
      const nx = cur.ix + DIRS[d].dx
      const nz = cur.iz + DIRS[d].dz
      if (!inside(nx, nz, grid)) continue

      const nbCell = coordToIdx(nx, nz, grid.width)
      if (!grid.walkable[nbCell]) continue
      if (grid.component[nbCell] !== startComp) continue

      const h = manhattanFromCells(nbCell, endCell, grid)
      const keepDir = (curDir < 4 && curDir === d) ? 0 : 1
      const wallProx = 1 - (grid.clearance[nbCell] / Math.max(grid.maxClearance, 1e-6))

      candidates.push({
        nbCell,
        dir: d,
        h,
        keepDir,
        wallProx,
      })
    }

    candidates.sort((a, b) => {
      if (a.h !== b.h) return a.h - b.h
      if (a.keepDir !== b.keepDir) return a.keepDir - b.keepDir
      if (a.wallProx !== b.wallProx) return a.wallProx - b.wallProx
      return a.nbCell - b.nbCell
    })

    for (let i = 0; i < candidates.length; i++) {
      const nb = candidates[i]
      const nbState = (nb.nbCell * 5) + nb.dir

      if (closed[nbState]) continue

      const step = grid.cellSize
      const turnCost = (curDir < 4 && curDir !== nb.dir) ? turnPenalty : 0
      const centerCost = centerWeight * nb.wallProx
      const axisCost = (DIRS[nb.dir].axis !== principalAxis) ? axisPenaltyWeight : 0

      const tentative = g[curState] + step + turnCost + centerCost + axisCost
      if (tentative >= g[nbState] - 1e-8) continue

      g[nbState] = tentative
      parent[nbState] = curState
      f[nbState] = tentative + nb.h
      heap.push({ state: nbState, f: f[nbState] })
    }
  }

  if (goalState < 0) {
    let best = -1
    let bestG = Infinity
    for (let d = 0; d < 5; d++) {
      const s = (endCell * 5) + d
      if (g[s] < bestG) {
        bestG = g[s]
        best = s
      }
    }
    goalState = best
  }

  if (goalState < 0 || !Number.isFinite(g[goalState])) return null
  return reconstructCellPath(goalState, parent, grid)
}

/**
 * Kept for compatibility with previous pipeline.
 * Orthogonal graph does not rely on triangle funneling.
 */
export function funnelPath(triPath, startPt, endPt) {
  if (!triPath || triPath.length === 0) return []
  return [startPt.clone(), endPt.clone()]
}

/**
 * Find the navmesh triangle containing the point XZ.
 */
export function findTriangle(point, graph) {
  const candidates = getSpatialCandidates(point.x, point.z, graph)
  if (candidates && candidates.length > 0) {
    for (let i = 0; i < candidates.length; i++) {
      const t = candidates[i]
      if (triContainsXZ(t, point.x, point.z, graph)) return t
    }
  }

  const triCount = graph.triCount ?? 0
  for (let t = 0; t < triCount; t++) {
    if (triContainsXZ(t, point.x, point.z, graph)) return t
  }

  let best = 0
  let bestD2 = Infinity
  const centroids = graph.centroids || []
  for (let t = 0; t < triCount; t++) {
    const dx = centroids[t].x - point.x
    const dz = centroids[t].z - point.z
    const d2 = (dx * dx) + (dz * dz)
    if (d2 < bestD2) {
      bestD2 = d2
      best = t
    }
  }
  return best
}

function closestPointOnSegmentXZ(px, pz, ax, az, bx, bz) {
  const abx = bx - ax
  const abz = bz - az
  const ab2 = (abx * abx) + (abz * abz)

  if (ab2 <= 1e-10) {
    const dx = px - ax
    const dz = pz - az
    return { x: ax, z: az, d2: (dx * dx) + (dz * dz) }
  }

  let t = (((px - ax) * abx) + ((pz - az) * abz)) / ab2
  if (t < 0) t = 0
  if (t > 1) t = 1

  const x = ax + (abx * t)
  const z = az + (abz * t)
  const dx = px - x
  const dz = pz - z
  return { x, z, d2: (dx * dx) + (dz * dz) }
}

function closestPointOnTriXZ(px, pz, ax, az, bx, bz, cx, cz) {
  if (pointInTriXZ(px, pz, ax, az, bx, bz, cx, cz)) {
    return { x: px, z: pz, d2: 0 }
  }

  const ab = closestPointOnSegmentXZ(px, pz, ax, az, bx, bz)
  const bc = closestPointOnSegmentXZ(px, pz, bx, bz, cx, cz)
  const ca = closestPointOnSegmentXZ(px, pz, cx, cz, ax, az)

  let best = ab
  if (bc.d2 < best.d2) best = bc
  if (ca.d2 < best.d2) best = ca
  return best
}

/**
 * Snaps a target point to the reachable orthogonal grid component of `from`.
 */
export function nearestReachablePointInComponent(from, to, graph, _options = {}) {
  const grid = graph?.orthGrid
  if (grid && grid.walkableCount > 0) {
    const startCell = nearestWalkableCell(from, grid)
    if (startCell < 0) return null
    const startComp = grid.component[startCell]

    const targetCell = nearestWalkableCell(to, grid, startComp)
    if (targetCell < 0) return null

    const out = cellCenter(targetCell, grid, to.y)
    return out
  }

  const startTri = findTriangle(from, graph)
  if (startTri == null || startTri < 0) return null

  const { verts, tris, adj } = graph
  const triCount = graph.triCount ?? 0

  const inComp = new Uint8Array(triCount)
  const queue = [startTri]
  let qHead = 0
  inComp[startTri] = 1
  const comp = []

  while (qHead < queue.length) {
    const t = queue[qHead++]
    comp.push(t)
    const nbs = adj[t] || []
    for (let i = 0; i < nbs.length; i++) {
      const nb = nbs[i]
      if (inComp[nb]) continue
      inComp[nb] = 1
      queue.push(nb)
    }
  }

  let bestTri = -1
  let bestX = from.x
  let bestZ = from.z
  let bestD2 = Infinity

  for (let i = 0; i < comp.length; i++) {
    const tri = comp[i]
    const ia = tris[tri * 3]
    const ib = tris[tri * 3 + 1]
    const ic = tris[tri * 3 + 2]

    const cp = closestPointOnTriXZ(
      to.x,
      to.z,
      verts[ia * 3], verts[ia * 3 + 2],
      verts[ib * 3], verts[ib * 3 + 2],
      verts[ic * 3], verts[ic * 3 + 2],
    )

    if (cp.d2 < bestD2) {
      bestD2 = cp.d2
      bestTri = tri
      bestX = cp.x
      bestZ = cp.z
    }
  }

  if (bestTri < 0) return null
  return new THREE.Vector3(bestX, to.y, bestZ)
}

/**
 * Build graph from navmesh geometry.
 */
export function buildNavGraph(geo, matrix) {
  const pos = geo.attributes.position
  const idx = geo.index
  if (!pos || !idx) throw new Error('NavMesh geometry missing position or index')

  const rawCount = pos.count
  const verts = new Float32Array(rawCount * 3)
  const tmp = new THREE.Vector3()

  for (let i = 0; i < rawCount; i++) {
    tmp.fromBufferAttribute(pos, i).applyMatrix4(matrix)
    verts[i * 3] = tmp.x
    verts[i * 3 + 1] = tmp.y
    verts[i * 3 + 2] = tmp.z
  }

  const canonical = new Uint32Array(rawCount)
  const canonMap = new Map()
  const SNAP_EPS = 0.001
  let nextCanon = 0

  for (let i = 0; i < rawCount; i++) {
    const kx = Math.round(verts[i * 3] / SNAP_EPS) * SNAP_EPS
    const ky = Math.round(verts[i * 3 + 1] / SNAP_EPS) * SNAP_EPS
    const kz = Math.round(verts[i * 3 + 2] / SNAP_EPS) * SNAP_EPS
    const key = `${kx.toFixed(3)},${ky.toFixed(3)},${kz.toFixed(3)}`

    if (canonMap.has(key)) {
      canonical[i] = canonMap.get(key)
    } else {
      canonMap.set(key, nextCanon)
      canonical[i] = nextCanon
      nextCanon += 1
    }
  }

  const triCount = Math.floor(idx.count / 3)
  const tris = new Uint32Array(idx.count)
  for (let i = 0; i < idx.count; i++) tris[i] = idx.getX(i)

  const centroids = new Array(triCount)
  const triBounds = new Float32Array(triCount * 4)

  for (let t = 0; t < triCount; t++) {
    const ia = tris[t * 3]
    const ib = tris[t * 3 + 1]
    const ic = tris[t * 3 + 2]

    const ax = verts[ia * 3]
    const ay = verts[ia * 3 + 1]
    const az = verts[ia * 3 + 2]
    const bx = verts[ib * 3]
    const by = verts[ib * 3 + 1]
    const bz = verts[ib * 3 + 2]
    const cx = verts[ic * 3]
    const cy = verts[ic * 3 + 1]
    const cz = verts[ic * 3 + 2]

    centroids[t] = new THREE.Vector3(
      (ax + bx + cx) / 3,
      (ay + by + cy) / 3,
      (az + bz + cz) / 3,
    )

    triBounds[t * 4] = Math.min(ax, bx, cx)
    triBounds[t * 4 + 1] = Math.max(ax, bx, cx)
    triBounds[t * 4 + 2] = Math.min(az, bz, cz)
    triBounds[t * 4 + 3] = Math.max(az, bz, cz)
  }

  const edgeMap = new Map()
  for (let t = 0; t < triCount; t++) {
    const c0 = canonical[tris[t * 3]]
    const c1 = canonical[tris[t * 3 + 1]]
    const c2 = canonical[tris[t * 3 + 2]]

    const e0 = edgeKey(c0, c1)
    const e1 = edgeKey(c1, c2)
    const e2 = edgeKey(c2, c0)

    if (!edgeMap.has(e0)) edgeMap.set(e0, [])
    if (!edgeMap.has(e1)) edgeMap.set(e1, [])
    if (!edgeMap.has(e2)) edgeMap.set(e2, [])

    edgeMap.get(e0).push(t)
    edgeMap.get(e1).push(t)
    edgeMap.get(e2).push(t)
  }

  const adj = Array.from({ length: triCount }, () => [])
  const sharedEdges = new Map()

  edgeMap.forEach((triList, ek) => {
    if (triList.length < 2) return

    for (let i = 0; i < triList.length; i++) {
      for (let j = i + 1; j < triList.length; j++) {
        const ta = triList[i]
        const tb = triList[j]

        if (!adj[ta].includes(tb)) adj[ta].push(tb)
        if (!adj[tb].includes(ta)) adj[tb].push(ta)

        const pairKey = ta < tb ? `${ta}-${tb}` : `${tb}-${ta}`
        if (sharedEdges.has(pairKey)) continue

        const [cv0, cv1] = ek.split('-').map(Number)
        let rv0 = -1
        let rv1 = -1

        for (let k = 0; k < 3; k++) {
          const raw = tris[ta * 3 + k]
          if (canonical[raw] === cv0 && rv0 < 0) rv0 = raw
          if (canonical[raw] === cv1 && rv1 < 0) rv1 = raw
        }

        if (rv0 < 0 || rv1 < 0) {
          for (let k = 0; k < 3; k++) {
            const raw = tris[tb * 3 + k]
            if (canonical[raw] === cv0 && rv0 < 0) rv0 = raw
            if (canonical[raw] === cv1 && rv1 < 0) rv1 = raw
          }
        }

        if (rv0 >= 0 && rv1 >= 0) {
          sharedEdges.set(pairKey, [rv0, rv1])
        }
      }
    }
  })

  const cells = new Map()
  const spatialCellSize = 2.4

  for (let t = 0; t < triCount; t++) {
    const minX = triBounds[t * 4]
    const maxX = triBounds[t * 4 + 1]
    const minZ = triBounds[t * 4 + 2]
    const maxZ = triBounds[t * 4 + 3]

    const minIx = Math.floor(minX / spatialCellSize)
    const maxIx = Math.floor(maxX / spatialCellSize)
    const minIz = Math.floor(minZ / spatialCellSize)
    const maxIz = Math.floor(maxZ / spatialCellSize)

    for (let ix = minIx; ix <= maxIx; ix++) {
      for (let iz = minIz; iz <= maxIz; iz++) {
        const key = cellKey(ix, iz)
        if (!cells.has(key)) cells.set(key, [])
        cells.get(key).push(t)
      }
    }
  }

  const graph = {
    verts,
    tris,
    centroids,
    adj,
    sharedEdges,
    triCount,
    triBounds,
    spatialHash: {
      cellSize: spatialCellSize,
      cells,
    },
    orthGrid: null,
  }

  graph.orthGrid = buildOrthogonalGrid(graph)
  return graph
}

/**
 * High-level orthogonal routing API.
 */
export function findPath(from, to, graph, options = {}) {
  const grid = graph?.orthGrid
  if (!grid || grid.walkableCount <= 0) return null

  const startCell = nearestWalkableCell(from, grid)
  if (startCell < 0) return null

  const startComp = grid.component[startCell]
  const endCell = nearestWalkableCell(to, grid, startComp)
  if (endCell < 0) return null

  const turnPenalty = options.turnPenalty ?? 3.2
  const centerWeight = options.centerWeight ?? 0.45
  const axisPenaltyWeight = options.axisPenaltyWeight ?? 0.12
  const maxLengthRatio = options.maxLengthRatio ?? 1.1

  const baseline = astar(startCell, endCell, { orthGrid: grid }, {
    turnPenalty: 0,
    centerWeight: 0,
    axisPenaltyWeight: 0,
  })

  const balanced = astar(startCell, endCell, { orthGrid: grid }, {
    turnPenalty: Math.max(0.9, turnPenalty * 0.48),
    centerWeight: centerWeight * 0.38,
    axisPenaltyWeight: axisPenaltyWeight * 0.45,
  })

  const styled = astar(startCell, endCell, { orthGrid: grid }, {
    turnPenalty,
    centerWeight,
    axisPenaltyWeight,
  })

  const candidates = []
  const seen = new Set()
  for (const path of [styled, balanced, baseline]) {
    if (!path || path.length === 0) continue
    const key = path.join(',')
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(path)
  }
  if (candidates.length === 0) return null

  const shortestLen = Math.max(
    baseline && baseline.length > 0 ? cellPathLength(baseline, grid) : manhattanFromCells(startCell, endCell, grid),
    1e-6,
  )

  let bestAny = null
  let bestWithinRatio = null

  for (let i = 0; i < candidates.length; i++) {
    const path = candidates[i]
    const stats = evaluateCellPath(path, grid, { turnPenalty, centerWeight })
    const ratio = stats.length / shortestLen
    const rec = { path, ...stats, ratio }

    if (!bestAny || rec.score < bestAny.score || (Math.abs(rec.score - bestAny.score) <= 1e-8 && rec.length < bestAny.length)) {
      bestAny = rec
    }

    if (ratio <= maxLengthRatio) {
      if (!bestWithinRatio || rec.score < bestWithinRatio.score || (Math.abs(rec.score - bestWithinRatio.score) <= 1e-8 && rec.length < bestWithinRatio.length)) {
        bestWithinRatio = rec
      }
    }
  }

  const chosen = (bestWithinRatio ?? bestAny)?.path
  if (!chosen || chosen.length === 0) return null

  const points = chosen.map(c => cellCenter(c, grid, from.y))
  const simplified = simplifyOrthogonalPoints(points)

  if (simplified.length >= 1) simplified[0].y = from.y
  if (simplified.length >= 2) simplified[simplified.length - 1].y = to.y

  return simplified
}
