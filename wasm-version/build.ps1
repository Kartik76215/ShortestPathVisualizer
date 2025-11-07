# ================================
# build.ps1 — WebAssembly Builder
# ================================

Write-Host "Setting up Emscripten environment..." -ForegroundColor Cyan

# Path to your emsdk installation
$emsdkPath = "D:\test2\emsdk"
$emsdkEnv = Join-Path $emsdkPath "emsdk_env.ps1"

if (!(Test-Path $emsdkEnv)) {
    Write-Host "ERROR: Emscripten not found at $emsdkEnv" -ForegroundColor Red
    exit 1
}

# Dot-source the Emscripten environment script (important!)
. "$emsdkEnv"

Write-Host "Emscripten environment loaded successfully." -ForegroundColor Green

# Step 2: Compile your C++ code to WebAssembly
$cppFile = "pathfinder.cpp"

if (!(Test-Path $cppFile)) {
    Write-Host "ERROR: $cppFile not found in $(Get-Location)" -ForegroundColor Red
    exit 1
}

Write-Host "Compiling $cppFile to WebAssembly..."
emcc $cppFile -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="PathModule" `
    --bind `
    -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']" `
    -o "pathfinder.js"


if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Generated files:"
    Write-Host " - pathfinder.js"
    Write-Host " - pathfinder.wasm"
} else {
    Write-Host "Build failed. Please check for compiler errors." -ForegroundColor Red
}

Write-Host ""
Write-Host "To run locally:" -ForegroundColor Yellow
Write-Host "python -m http.server 8080"
Write-Host "Then open: http://localhost:8080/wasm-version/"
