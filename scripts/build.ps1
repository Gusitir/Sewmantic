# scripts/build.ps1
# Mechanical build script for pattern-ai-core

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[BUILD] Starting TypeScript compilation..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[BUILD FAILED] TypeScript compilation failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "[BUILD SUCCESS] TypeScript compiled cleanly to dist/" -ForegroundColor Green
    exit 0
}
catch {
    Write-Error "[BUILD ERROR] An error occurred during build: $_"
    exit 1
}
