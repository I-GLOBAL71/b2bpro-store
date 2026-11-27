<#
.SYNOPSIS
  Configure les 3 tâches planifiées Windows quotidiennes de prospection autonome pour b2bpro.store.
  Cadence (heures ouvrées) : 09h15 (Matin), 11h45 (Midi) et 15h15 (Après-midi) -> 15 e-mails/jour max + 1 article Dev.to/jour.
#>

$ProjectDir = "C:\Users\Administrateur\Documents\project\b2bpro"
$BunPath = "C:\Users\Administrateur\.bun\bin\bun.exe"
if (-not (Test-Path $BunPath)) {
    $BunPath = (Get-Command bun.exe -ErrorAction SilentlyContinue).Source
    if (-not $BunPath) { $BunPath = "bun.exe" }
}

$ScriptPath = "$ProjectDir\scripts\prospect-autonomous-runner.ts"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  PLANIFICATEUR PROSPECTION AUTONOME — b2bpro.store" -ForegroundColor Cyan
Write-Host "  Cadence : 09h15 (Matin) | 11h45 (Midi) | 15h15 (Après-midi)" -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Cyan

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$Tasks = @(
    @{
        Name = "B2BPro_Prospection_Matin"
        Time = "09:15"
        Args = "run `"$ScriptPath`" --wave=matin --limit=5"
        Desc = "Prospection autonome B2B (Matin 09h15 - 5 e-mails 1-à-1 + Dev.to)"
    },
    @{
        Name = "B2BPro_Prospection_Midi"
        Time = "11:45"
        Args = "run `"$ScriptPath`" --wave=midi --limit=5 --skip-social"
        Desc = "Prospection autonome B2B (Midi 11h45 - 5 e-mails 1-à-1)"
    },
    @{
        Name = "B2BPro_Prospection_ApresMidi"
        Time = "15:15"
        Args = "run `"$ScriptPath`" --wave=apres-midi --limit=5 --skip-social"
        Desc = "Prospection autonome B2B (Après-midi 15h15 - 5 e-mails 1-à-1)"
    }
)

foreach ($t in $Tasks) {
    $Action = New-ScheduledTaskAction -Execute $BunPath -Argument $t.Args -WorkingDirectory $ProjectDir
    $Trigger = New-ScheduledTaskTrigger -Daily -At $t.Time
    Unregister-ScheduledTask -TaskName $t.Name -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $t.Name -Action $Action -Trigger $Trigger -Settings $Settings -Description $t.Desc | Out-Null
    Write-Host "✓ Tâche planifiée créée : $($t.Name) (Tous les jours à $($t.Time))" -ForegroundColor Green
}

Write-Host "`n🎉 La prospection autonome quotidienne est active !" -ForegroundColor Yellow
