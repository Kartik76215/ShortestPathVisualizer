// wasm-bridge.js — stable WebAssembly bridge for Emscripten output
let wasmModule = null;

export async function initWasm() {
  if (wasmModule) return wasmModule;

  try {
    // Load the generated Emscripten module dynamically if not already loaded
    if (typeof PathModule === "undefined") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./pathfinder.js";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    // Initialize WebAssembly module
    wasmModule = await PathModule({
      locateFile: (file) => `./${file}`, // ensures .wasm file is found
    });

    console.log("✅ WebAssembly module loaded successfully!");
    return wasmModule;
  } catch (err) {
    console.error("❌ Failed to initialize WebAssembly:", err);
    throw err;
  }
}

// Wrapper to call the C++ findPath() function safely
export async function findPath(sr, sc, er, ec) {
  if (!wasmModule) await initWasm();

  try {
    // Call the exported WASM function
    const rawResult = wasmModule.ccall(
      "findPath", // C++ function name
      "string",   // return type
      ["number", "number", "number", "number"], // arg types
      [sr, sc, er, ec] // arg values
    );

    // Clean the returned string (remove trailing nulls/newlines)
    const cleaned = rawResult?.trim().replace(/\0/g, "") ?? "[]";

    console.log("📦 Cleaned WASM output:", cleaned);

    // Parse to usable JSON
    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (err) {
    console.error("⚠️ Error calling findPath:", err);
    throw err;
  }
}
