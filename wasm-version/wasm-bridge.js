let wasmModule = null;

export async function initWasm() {
  if (wasmModule) return wasmModule;

  try {
    if (typeof PathModule === "undefined") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./pathfinder.js";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    wasmModule = await PathModule({
  locateFile: (file) => `./${file}`,
  });


    console.log("✅ WebAssembly module loaded successfully!");
    return wasmModule;
  } catch (err) {
    console.error("❌ Failed to initialize WebAssembly:", err);
    throw err;
  }
}

export function findPath(wasm, algo, sr, sc, er, ec, walls, rows, cols) {
  try {
    const result = wasm.findPath(algo, sr, sc, er, ec, walls, rows, cols);
    console.log("📦 WASM output:", result);
    return result;
  } catch (err) {
    console.error("❌ Error calling findPath:", err);
  }
}
