<#
.SYNOPSIS
  Configure les 2 tâches planifiées Windows quotidiennes pour B2B Pro.
  Cadence : 09h30 (Matin) et 16h15 (Après-midi) tous les jours.
#>

$ProjectDir = "C:\Users\Administrateur\Documents\project\b2bpro"
$BunPath = "C:\Users\Administrateur\.bun\bin\bun.exe"
if (-not (Test-Path $BunPath)) {
    $BunPath = (Get-Command bun.exe -ErrorAction SilentlyContinue).Source
    if (-not $BunPath) { $BunPath = "bun.exe" }
}

$ScriptPath = "$ProjectDir\scripts\auto-daily-runner.ts"

Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CONFIGURATION DU PLANIFICATEUR DE TÂCHES WINDOWS — b2bpro.store" -ForegroundColor Cyan
Write-Host "  Cadence : 09h30 (Matin) & 16h15 (Après-midi) tous les jours" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# 1. Tâche du Matin (09h30)
$TaskMatin = "B2BPro_DailyBlog_Matin"
$ActionMatin = New-ScheduledTaskAction -Execute $BunPath -Argument "run `"$ScriptPath`" --slot=matin" -WorkingDirectory $ProjectDir
$TriggerMatin = New-ScheduledTaskTrigger -Daily -At "09:30"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $TaskMatin -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskMatin -Action $ActionMatin -Trigger $TriggerMatin -Settings $Settings -Description "Publication automatique quotidienne du blog B2B Pro (Matin 09h30)" | Out-Null
Write-Host "✓ Tâche planifiée créée : $TaskMatin (Tous les jours à 09h30)" -ForegroundColor Green

# 2. Tâche de l'Après-midi (16h15)
$TaskApresMidi = "B2BPro_DailyBlog_ApresMidi"
$ActionApresMidi = New-ScheduledTaskAction -Execute $BunPath -Argument "run `"$ScriptPath`" --slot=apres-midi" -WorkingDirectory $ProjectDir
$TriggerApresMidi = New-ScheduledTaskTrigger -Daily -At "16:15"

Unregister-ScheduledTask -TaskName $TaskApresMidi -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskApresMidi -Action $ActionApresMidi -Trigger $TriggerApresMidi -Settings $Settings -Description "Publication automatique quotidienne du blog B2B Pro (Après-midi 16h15)" | Out-Null
Write-Host "✓ Tâche planifiée créée : $TaskApresMidi (Tous les jours à 16h15)" -ForegroundColor Green

Write-Host "`n🎉 Le démarrage automatique quotidien est désormais ACTIF sur cette machine !" -ForegroundColor Yellow
Write-Host "Les articles seront rédigés, vérifiés S+, illustrés et synchronisés sur Neon automatiquement tous les jours.`n"
