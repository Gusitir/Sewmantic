# scripts/gen_sample.ps1
# Script de automatización end-to-end para compilación, generación y verificación de muestra textil
# pattern-ai-core

$ErrorActionPreference = "Stop"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "[PIPELINE SAMPLE] Iniciando generación de muestra end-to-end" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# 1. Compilación del proyecto TypeScript
Write-Host "`n[PASO 1/3] Compilando proyecto TypeScript (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Falló la compilación TypeScript con código $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Host "[OK] Compilación exitosa en dist/" -ForegroundColor Green

# 2. Ejecución del CLI para generar la muestra
$Prompt = "Hoodie Oversize Streetwear con capucha cruzada y bolsillo canguro"
$OutputDir = "output"
$ConceptSlug = "streetwear_oversize_hoodie"
$ConceptDir = Join-Path $OutputDir $ConceptSlug

Write-Host "`n[PASO 2/3] Ejecutando CLI para generar moldería paramétrica..." -ForegroundColor Yellow
Write-Host "  Comando: node dist/index.js generate `"$Prompt`" --provider mock --output $OutputDir" -ForegroundColor Gray

node dist/index.js generate "$Prompt" --provider mock --output "$OutputDir"
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Falló la ejecución del CLI con código $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Host "[OK] Pipeline ejecutado con éxito." -ForegroundColor Green

# 3. Verificación exhaustiva de entregables en output/
Write-Host "`n[PASO 3/3] Verificando existencia e integridad de archivos generados en $ConceptDir..." -ForegroundColor Yellow

$ExpectedFiles = @(
    "$ConceptSlug`_tiled_a4.pdf",
    "$ConceptSlug`_tiled_letter.pdf",
    "$ConceptSlug`_plotter_a0.pdf",
    "$ConceptSlug`_continuous.svg",
    "$ConceptSlug`_techpack.pdf",
    "$ConceptSlug`_techpack.md",
    "$ConceptSlug`_dna.json",
    "$ConceptSlug`_techpack.json"
)

$AllPassed = $true

foreach ($FileName in $ExpectedFiles) {
    $FilePath = Join-Path $ConceptDir $FileName
    if (Test-Path $FilePath) {
        $Item = Get-Item $FilePath
        $Size = $Item.Length
        if ($Size -gt 0) {
            $SizeKb = [math]::Round($Size / 1024, 2)
            Write-Host "  [OK] $FileName ($SizeKb KB, $Size bytes)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $FileName existe pero tiene tamaño 0 bytes!" -ForegroundColor Red
            $AllPassed = $false
        }
    } else {
        Write-Host "  [FAIL] Archivo NO encontrado: $FilePath" -ForegroundColor Red
        $AllPassed = $false
    }
}

Write-Host "`n=============================================================" -ForegroundColor Cyan
if ($AllPassed) {
    Write-Host "[MUESTRA VERIFICADA] El set completo de 8 entregables fue generado correctamente!" -ForegroundColor Green
    Write-Host "Directorio: $(Resolve-Path $ConceptDir)" -ForegroundColor Green
    Write-Host "=============================================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "[ERROR] Uno o más archivos requeridos faltan o están vacíos." -ForegroundColor Red
    Write-Host "=============================================================" -ForegroundColor Cyan
    exit 1
}
