# start.ps1
# Shortcut to open two terminals for Backend and Frontend

# 1. Backend: venv and uvicorn
Write-Host "Opening Backend terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn app.main:app --host 127.0.0.2 --reload"

# 2. Frontend: npm run build (Note: Consider using 'npm run dev' for development)
Write-Host "Opening Frontend terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run build"

Write-Host "`nTerminals launched!" -ForegroundColor Green
