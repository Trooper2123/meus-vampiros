$ErrorActionPreference = "Stop"

if (!$env:SONAR_TOKEN -or !$env:SONAR_PROJECT_KEY) {
    throw "Defina SONAR_TOKEN e SONAR_PROJECT_KEY neste terminal."
}

$headers = @{
    Authorization = "Bearer $env:SONAR_TOKEN"
}

$project = [uri]::EscapeDataString($env:SONAR_PROJECT_KEY)
$issues = @()
$page = 1

do {
    $url = "https://sonarcloud.io/api/issues/search?componentKeys=$project&resolved=false&ps=500&p=$page"
    $result = Invoke-RestMethod -Uri $url -Headers $headers

    if (!$result.issues -and $issues.Count -lt $result.paging.total) {
        throw "O Sonar retornou uma página vazia antes do fim da paginação."
    }

    $issues += $result.issues
    $page++
} while ($issues.Count -lt $result.paging.total)

@{
    total = $issues.Count
    issues = $issues
} | ConvertTo-Json -Depth 100 |
    Set-Content -Path "sonar-issues.json" -Encoding UTF8

Write-Host "Exportados: $($issues.Count) problemas."
