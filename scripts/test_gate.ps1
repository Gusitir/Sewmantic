# scripts/test_gate.ps1
# Deterministic verification gate for pattern-ai-core

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[GATE] Running deterministic verification gate..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Compilation
Write-Host "`n[GATE 1/2] Compiling TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[GATE FAILED] Compilation failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Host "[GATE 1/2 PASS] Compilation successful." -ForegroundColor Green

# Step 2: Test Suite
Write-Host "`n[GATE 2/2] Running Vitest suite..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Error "[GATE FAILED] Vitest suite failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Host "[GATE 2/2 PASS] All tests passed cleanly." -ForegroundColor Green

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "[GATE PASSED] All deterministic checks verified successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
exit 0
