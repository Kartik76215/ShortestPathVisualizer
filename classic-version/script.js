document.addEventListener("DOMContentLoaded", () => {
  const gridEl = document.getElementById("grid");
  const rowsInput = document.getElementById("rows");
  const colsInput = document.getElementById("cols");
  const runBtn = document.getElementById("runBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resetBtn = document.getElementById("resetBtn");
  const mazeBtn = document.getElementById("mazeBtn");
  const algorithmSelect = document.getElementById("algorithm");
  const speedInput = document.getElementById("speed");
  const statusEl = document.getElementById("status");
  const modeButtons = document.querySelectorAll(".mode");

  let wasmAvailable = false;
  let wasmModule = null;
  if (window.PathModulePromise) {
    // Try to initialize
    window.PathModulePromise.then(m => {
      wasmAvailable = true;
      wasmModule = m;
      console.log("WASM module initialized — using C++ implementations where available.");
    }).catch(e => {
      console.warn("WASM initialization failed, falling back to JS:", e);
    });
  }

  let state = {
    rows: 20,
    cols: 30,
    grid: [],
    start: { r: 10, c: 5 },
    end: { r: 10, c: 20 },
    mouseDown: false,
    mode: "wall",
    animating: false,
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const status = (s) => (statusEl.textContent = s);

  // === Grid build ===
  function buildGrid() {
    const oldStart = { ...state.start };
    const oldEnd = { ...state.end };
    const oldRows = state.rows;
    const oldCols = state.cols;

    state.rows = Math.max(8, Math.min(60, Number(rowsInput.value) || 20));
    state.cols = Math.max(8, Math.min(100, Number(colsInput.value) || 30));

    const rowRatio = state.rows / oldRows;
    const colRatio = state.cols / oldCols;
    state.start.r = Math.min(state.rows - 1, Math.round(oldStart.r * rowRatio));
    state.start.c = Math.min(state.cols - 1, Math.round(oldStart.c * colRatio));
    state.end.r = Math.min(state.rows - 1, Math.round(oldEnd.r * rowRatio));
    state.end.c = Math.min(state.cols - 1, Math.round(oldEnd.c * colRatio));

    document.documentElement.style.setProperty(
      "--cell-size",
      Math.max(20, Math.min(36, 560 / state.cols)) + "px"
    );
    gridEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;

    const frag = document.createDocumentFragment();
    state.grid = [];
    for (let r = 0; r < state.rows; r++) {
      const row = [];
      for (let c = 0; c < state.cols; c++) {
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.r = r;
        div.dataset.c = c;
        div.addEventListener("mousedown", onCellDown);
        div.addEventListener("mouseenter", onCellEnter);
        div.addEventListener("mouseup", onCellUp);
        frag.appendChild(div);
        row.push({ el: div, wall: false });
      }
      state.grid.push(row);
    }
    gridEl.innerHTML = "";
    gridEl.appendChild(frag);
    placeStartEnd();
  }

  function placeStartEnd() {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const el = state.grid[r][c].el;
        el.classList.remove("start", "end", "visited", "path");
      }
    }
    const { r: sr, c: sc } = state.start;
    const { r: er, c: ec } = state.end;
    state.grid[sr][sc].el.classList.add("start");
    state.grid[er][ec].el.classList.add("end");
  }

  // === Event handling ===
  function onCellDown() {
    if (state.animating) return;
    state.mouseDown = true;
    const r = +this.dataset.r,
      c = +this.dataset.c;
    if (state.mode === "wall") toggleWall(r, c);
    else if (state.mode === "start") moveStart(r, c);
    else if (state.mode === "end") moveEnd(r, c);
  }
  function onCellEnter() {
    if (!state.mouseDown || state.animating) return;
    const r = +this.dataset.r,
      c = +this.dataset.c;
    if (state.mode === "wall") toggleWall(r, c);
  }
  function onCellUp() {
    state.mouseDown = false;
  }
  document.body.addEventListener("mouseup", () => (state.mouseDown = false));

  function toggleWall(r, c) {
    if (
      (r === state.start.r && c === state.start.c) ||
      (r === state.end.r && c === state.end.c)
    )
      return;
    const cell = state.grid[r][c];
    cell.wall = !cell.wall;
    cell.el.classList.toggle("wall", cell.wall);
  }

  function moveStart(r, c) {
    if (state.grid[r][c].wall || (r === state.end.r && c === state.end.c)) return;
    state.grid[state.start.r][state.start.c].el.classList.remove("start");
    state.start = { r, c };
    state.grid[r][c].el.classList.add("start");
  }

  function moveEnd(r, c) {
    if (state.grid[r][c].wall || (r === state.start.r && c === state.start.c)) return;
    state.grid[state.end.r][state.end.c].el.classList.remove("end");
    state.end = { r, c };
    state.grid[r][c].el.classList.add("end");
  }

  // === Controls ===
  modeButtons.forEach((b) =>
    b.addEventListener("click", () => {
      modeButtons.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      state.mode = b.dataset.mode;
    })
  );

  clearBtn.addEventListener("click", () => {
    state.grid.flat().forEach((c) =>
      c.el.classList.remove("visited", "path")
    );
    status("cleared");
  });

  resetBtn.addEventListener("click", () => {
    buildGrid();
    status("reset");
  });

  mazeBtn.addEventListener("click", () => {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (
          (r === state.start.r && c === state.start.c) ||
          (r === state.end.r && c === state.end.c)
        )
          continue;
        state.grid[r][c].wall = Math.random() < 0.25;
        state.grid[r][c].el.classList.toggle("wall", state.grid[r][c].wall);
      }
    }
    status("randomized");
  });

  const neighbors = (r, c) => {
    const out = [];
    if (r > 0) out.push([r - 1, c]);
    if (r < state.rows - 1) out.push([r + 1, c]);
    if (c > 0) out.push([r, c - 1]);
    if (c < state.cols - 1) out.push([r, c + 1]);
    return out;
  };

  // === JS algorithms (fallback) ===
  function bfsJS() {
    const start = [state.start.r, state.start.c],
      end = [state.end.r, state.end.c];
    const q = [start],
      visited = new Set([start.join(",")]),
      prev = new Map(),
      visitOrder = [];
    while (q.length) {
      const [r, c] = q.shift();
      visitOrder.push([r, c]);
      if (r === end[0] && c === end[1]) break;
      for (const [nr, nc] of neighbors(r, c)) {
        const key = `${nr},${nc}`;
        if (visited.has(key) || state.grid[nr][nc].wall) continue;
        visited.add(key);
        prev.set(key, `${r},${c}`);
        q.push([nr, nc]);
      }
    }
    return reconstruct(prev, start, end, visitOrder);
  }

  function dijkstraJS() {
    const start = [state.start.r, state.start.c],
      end = [state.end.r, state.end.c];
    const startKey = start.join(","), endKey = end.join(",");
    const dist = new Map([[startKey, 0]]);
    const prev = new Map();
    const pq = [{ key: startKey, d: 0 }];
    const visitOrder = [];
    const visited = new Set();
    while (pq.length) {
      pq.sort((a, b) => a.d - b.d);
      const { key, d } = pq.shift();
      if (visited.has(key)) continue;
      visited.add(key);
      const [r, c] = key.split(",").map(Number);
      visitOrder.push([r, c]);
      if (key === endKey) break;
      for (const [nr, nc] of neighbors(r, c)) {
        if (state.grid[nr][nc].wall) continue;
        const nk = `${nr},${nc}`, nd = d + 1;
        if (nd < (dist.get(nk) || Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, key);
          pq.push({ key: nk, d: nd });
        }
      }
    }
    return reconstruct(prev, start, end, visitOrder);
  }

  function reconstruct(prev, start, end, visitOrder) {
    const startK = start.join(","), endK = end.join(",");
    const path = [];
    if (!prev.has(endK) && startK !== endK)
      return { visitOrder, path: [] };
    let cur = endK;
    while (cur) {
      path.unshift(cur.split(",").map(Number));
      if (cur === startK) break;
      cur = prev.get(cur);
    }
    return { visitOrder, path };
  }

  // === Animation ===
  async function animate({ visitOrder, path }) {
    const delay = Math.max(5, Number(speedInput.value));
    for (const [r, c] of visitOrder) {
      const el = state.grid[r][c].el;
      if (!el.classList.contains("start") && !el.classList.contains("end"))
        el.classList.add("visited");
      await sleep(delay);
    }
    for (const [r, c] of path) {
      const el = state.grid[r][c].el;
      if (!el.classList.contains("start") && !el.classList.contains("end"))
        el.classList.add("path");
      await sleep(delay / 2);
    }
    status(path.length ? "done" : "no path");
  }

  runBtn.addEventListener("click", async () => {
    if (state.animating) return;
    state.animating = true;
    state.grid.flat().forEach((c) =>
      c.el.classList.remove("visited", "path")
    );
    status("running...");

    const grid = state.grid.map(row => row.map(cell => cell.wall ? 1 : 0));
    const algo = algorithmSelect.value;

    let result;
    try {
      if (wasmAvailable && wasmModule) {
        if (algo === "bfs" && wasmModule.runBFS) {
          result = wasmModule.runBFS(grid, state.start.r, state.start.c, state.end.r, state.end.c);
        } else if (algo === "dijkstra" && wasmModule.runDijkstra) {
          result = wasmModule.runDijkstra(grid, state.start.r, state.start.c, state.end.r, state.end.c);
        } else if (algo === "astar" && wasmModule.runAStar) {
          result = wasmModule.runAStar(grid, state.start.r, state.start.c, state.end.r, state.end.c);
        } else {
          // algorithm not in wasm, fallback to JS
          throw "WASM missing algo";
        }
        // wasm returns a JS object with path and visitOrder
      } else {
        // Use JS fallback implementations
        if (algo === "bfs") result = bfsJS();
        else if (algo === "dijkstra") result = dijkstraJS();
        else result = runAStarJS(state.grid, [state.start.r, state.start.c], [state.end.r, state.end.c], neighbors);
      }
    } catch (e) {
      console.warn("WASM call failed, falling back to JS. Error:", e);
      // Ensure fallback
      if (algo === "bfs") result = bfsJS();
      else if (algo === "dijkstra") result = dijkstraJS();
      else result = runAStarJS(state.grid, [state.start.r, state.start.c], [state.end.r, state.end.c], neighbors);
    }

    // Normalize result (some wasm bindings may return typed arrays; assume object with visitOrder and path arrays)
    const visitOrder = result.visitOrder || result.visitorder || result.visit || [];
    const path = result.path || result.Path || [];

    await animate({ visitOrder, path });
    state.animating = false;
  });

  rowsInput.addEventListener("input", buildGrid);
  colsInput.addEventListener("input", buildGrid);

  buildGrid();
  status("idle");
});
