$ErrorActionPreference = 'Stop'
$previousToken = $env:SONAR_TOKEN
$previousProject = $env:SONAR_PROJECT_KEY
$env:SONAR_TOKEN = 'test-token'
$env:SONAR_PROJECT_KEY = 'test project'
$state = @{ requests = 0; exported = $null; emptyPage = $false }

function Invoke-RestMethod {
    param($Uri, $Headers)
    $state.requests++
    if ($Headers.Authorization -ne 'Bearer test-token' -or $Uri -notlike '*componentKeys=test%20project*') { throw 'Pedido inválido.' }
    if ($state.emptyPage) { return @{ issues = @(); paging = @{ total = 2 } } }
    return @{ issues = @(@{ key = "issue-$($state.requests)" }); paging = @{ total = 2 } }
}

function Set-Content {
    param([Parameter(ValueFromPipeline = $true)]$Value, $Path, $Encoding)
    process { $state.exported = $Value | ConvertFrom-Json }
}

try {
    & "$PSScriptRoot/../sonar-export.ps1"
    if ($state.requests -ne 2 -or $state.exported.total -ne 2 -or $state.exported.issues.Count -ne 2) { throw 'Paginação inválida.' }
    $state.emptyPage = $true
    $state.exported = $null
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (!$failed -or $null -ne $state.exported) { throw 'Página vazia deve falhar sem gravar export.' }
    $env:SONAR_TOKEN = ''
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (!$failed) { throw 'Token ausente deve falhar.' }
    Write-Host 'Sonar export: paginação, página vazia e token ausente validados sem rede/arquivo.'
} finally {
    $env:SONAR_TOKEN = $previousToken
    $env:SONAR_PROJECT_KEY = $previousProject
}
