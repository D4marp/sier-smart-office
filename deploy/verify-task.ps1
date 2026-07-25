$out = 'C:\Users\fisip\Downloads\unesa-psikologi-main\unesa-psikologi-main\deploy\verify-result.log'
$t = Get-ScheduledTask -TaskName 'FISIPOL-SmartEnergy-Dashboard'
$lines = @()
$lines += "State: $($t.State)"
$lines += "RunAs: $($t.Principal.UserId) / RunLevel: $($t.Principal.RunLevel)"
$lines += "TriggerDelay: $($t.Triggers.Delay)"
$lines += "Action: $($t.Actions.Execute) $($t.Actions.Arguments)"
Start-ScheduledTask -TaskName 'FISIPOL-SmartEnergy-Dashboard'
$lines += "Triggered at $([DateTime]::Now.ToString('HH:mm:ss'))"
$lines | Out-File $out -Encoding utf8
