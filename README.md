# 🧭 Shortest Path Visualizer

An interactive pathfinding visualizer built with **JavaScript** and **C++ WebAssembly** — visualize **A***, **Dijkstra**, and **BFS** in real-time.

### 🌐 Versions
- **Classic Version (JavaScript only):** `/classic-version/`
- **WASM Version (C++ + Emscripten):** `/wasm-version/`

### ⚙️ Build (for WASM)
To rebuild the WebAssembly files from the C++ source:
```bash
emcc pathfinder.cpp -O3 --bind -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="PathModule" -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']" -o pathfinder.js
```

### 🚀 Run Locally
```bash
python -m http.server 8080
```
Then open [http://localhost:8080/](http://localhost:8080/)

### ✨ Features
- Interactive grid visualization  
- Drag and drop **Start** / **End** nodes  
- Wall drawing and random maze generation  
- Algorithm animation (BFS, Dijkstra, A*)  
- Optimized C++ backend (WebAssembly)  

### 👨‍💻 Author
Developed by [@Kartik76215](https://github.com/Kartik76215)

---

### 🧠 Built With
- **C++** + [Emscripten](https://emscripten.org/)
- **JavaScript (Vanilla)**  
- **HTML5 + CSS3 Animations**
