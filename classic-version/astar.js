// ======== astar.js ========
// Robust, tested A* pathfinding algorithm for your grid (JS fallback)

function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function runAStarJS(stateGrid, start, end, neighbors) {
  const startKey = start.join(",");
  const endKey = end.join(",");

  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, heuristic(start, end)]]);
  const cameFrom = new Map();

  const openSet = [{ key: startKey, f: fScore.get(startKey) }];
  const openKeys = new Set([startKey]);

  const closedSet = new Set();
  const visitOrder = [];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift().key;
    openKeys.delete(current);

    if (closedSet.has(current)) continue;
    closedSet.add(current);

    const [r, c] = current.split(",").map(Number);
    visitOrder.push([r, c]);

    if (current === endKey) {
      return reconstructPathJS(cameFrom, start, end, visitOrder);
    }

    for (const [nr, nc] of neighbors(r, c)) {
      if (stateGrid[nr][nc].wall) continue;
      const neighborKey = `${nr},${nc}`;
      if (closedSet.has(neighborKey)) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + 1;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        const fVal = tentativeG + heuristic([nr, nc], end);
        fScore.set(neighborKey, fVal);

        if (!openKeys.has(neighborKey)) {
          openSet.push({ key: neighborKey, f: fVal });
          openKeys.add(neighborKey);
        }
      }
    }
  }

  return { visitOrder, path: [] };
}

function reconstructPathJS(cameFrom, start, end, visitOrder) {
  const startK = start.join(",");
  const endK = end.join(",");
  const path = [];

  if (!cameFrom.has(endK) && startK !== endK)
    return { visitOrder, path: [] };

  let current = endK;
  while (current) {
    path.unshift(current.split(",").map(Number));
    if (current === startK) break;
    current = cameFrom.get(current);
  }

  return { visitOrder, path };
}
