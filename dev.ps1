# dev.ps1
# Shortcut to start both backend and frontend

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "   Starting ATAS Platform     " -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Start Backend
Write-Host "`n[1/2] Launching Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location backend; python run.py"

# Start Frontend
Write-Host "[2/2] Launching Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "`n==============================" -ForegroundColor Green
Write-Host "Both services are starting in separate windows." -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "==============================" -ForegroundColor Green
