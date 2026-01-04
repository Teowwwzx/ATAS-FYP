# manage_ports.ps1
# Simple tool to manage ports and processes

function Show-Menu {
    Clear-Host
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host "   Port Management Tool       " -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host "0. Start all services (Backend & Frontend)"
    Write-Host "1. List all active listening ports"
    Write-Host "2. Search for a specific port"
    Write-Host "3. Kill process by port number"
    Write-Host "4. Exit"
    Write-Host "==============================" -ForegroundColor Cyan
}

function List-Ports {
    Write-Host "`nFetching active listening ports..." -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Sort-Object LocalPort
    
    if ($connections) {
        Write-Host "`nLocal Address`t`tPort`tPID`tProcess Name" -ForegroundColor Green
        Write-Host "-------------`t`t----`t---`t------------" -ForegroundColor Green
        
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            $processName = if ($process) { $process.ProcessName } else { "Unknown" }
            Write-Host "$($conn.LocalAddress)`t`t$($conn.LocalPort)`t$($conn.OwningProcess)`t$processName"
        }
    } else {
        Write-Host "No active listening ports found." -ForegroundColor Yellow
    }
    Pause
}

function Search-Port {
    $port = Read-Host "`nEnter port number to search"
    if (-not [string]::IsNullOrWhiteSpace($port)) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($connections) {
            Write-Host "`nFound connections on port $port :" -ForegroundColor Green
             Write-Host "`nLocal Address`t`tPort`tPID`tProcess Name`tState" -ForegroundColor Green
             Write-Host "-------------`t`t----`t---`t------------`t-----" -ForegroundColor Green

            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                $processName = if ($process) { $process.ProcessName } else { "Unknown" }
                Write-Host "$($conn.LocalAddress)`t`t$($conn.LocalPort)`t$($conn.OwningProcess)`t$processName`t$($conn.State)"
            }
        } else {
            Write-Host "No connections found on port $port." -ForegroundColor Yellow
        }
    }
    Pause
}

function Kill-Process-By-Port {
    $port = Read-Host "`nEnter port number to kill process"
    if (-not [string]::IsNullOrWhiteSpace($port)) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($connections) {
            $pids = $connections.OwningProcess | Select-Object -Unique
            foreach ($procId in $pids) {
                try {
                    $process = Get-Process -Id $procId -ErrorAction Stop
                    $confirm = Read-Host "Kill process '$($process.ProcessName)' (PID: $procId)? (y/n)"
                    if ($confirm -eq 'y') {
                        Stop-Process -Id $procId -Force
                        Write-Host "Process $procId terminated." -ForegroundColor Green
                    }
                } catch {
                    Write-Host "Could not find or terminate process with PID $procId. (It might have already ended or requires Admin privileges)" -ForegroundColor Red
                }
            }
        } else {
             Write-Host "No process found listening on port $port." -ForegroundColor Yellow
        }
    }
    Pause
}

# Main Loop
do {
    Show-Menu
    $choice = Read-Host "Select an option"
    switch ($choice) {
        '0' { . .\dev.ps1 }
        '1' { List-Ports }
        '2' { Search-Port }
        '3' { Kill-Process-By-Port }
        '4' { Write-Host "Exiting..."; break }
        default { Write-Host "Invalid option. Please try again." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($true)
