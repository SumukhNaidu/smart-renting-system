$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host "Starting backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; & 'C:\Users\naidu\AppData\Local\Programs\Python\Python313\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2
Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm install; npm run dev -- --host 0.0.0.0 --port 4173"

Write-Host "App is starting..."
Write-Host "Backend: http://localhost:8000/api/docs"
Write-Host "Frontend: http://localhost:4173"
