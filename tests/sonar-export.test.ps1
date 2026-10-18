$ErrorActionPreference = 'Stop'
$previousToken = $env:SONAR_TOKEN
$previousProject = $env:SONAR_PROJECT_KEY
$env:SONAR_TOKEN = 'test-token'
$env:SONAR_PROJECT_KEY = 'test project'
$state = @{ requests = 0; exported = $null; emptyPage = $false; envExists = $true; envText = "# Credenciais locais`nSONAR_TOKEN='file-token # literal'`nSONAR_PROJECTKEY=`"file project`""; expectedToken = 'file-token # literal'; expectedProject = 'file project' }

function Test-SonarEnvPath {
    param($LiteralPath, $PathType)
    if ($LiteralPath -ne (Join-Path $PSScriptRoot '../.env') -and $LiteralPath -ne ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.env')))) { throw 'Caminho do .env inválido.' }
    return $state.envExists
}

function Get-SonarTestEnv {
    param($LiteralPath, [switch]$Raw, $Encoding)
    return $state.envText
}

function Invoke-SonarTestRequest {
    param($Uri, $Headers)
    $state.requests++
    $expectedProject = [uri]::EscapeDataString($state.expectedProject)
    if ($Headers.Authorization -ne "Bearer $($state.expectedToken)" -or $Uri -notlike "*componentKeys=$expectedProject&*") { throw 'Pedido inválido.' }
    if ($state.emptyPage) { return @{ issues = @(); paging = @{ total = 2 } } }
    return @{ issues = @(@{ key = "issue-$($state.requests)" }); paging = @{ total = 2 } }
}

function Write-SonarTestExport {
    param([Parameter(ValueFromPipeline = $true)]$Value, $Path, $Encoding)
    process { $state.exported = $Value | ConvertFrom-Json }
}

Set-Item Function:Test-Path ${function:Test-SonarEnvPath}
Set-Item Function:Get-Content ${function:Get-SonarTestEnv}
Set-Item Function:Invoke-RestMethod ${function:Invoke-SonarTestRequest}
Set-Item Function:Set-Content ${function:Write-SonarTestExport}

try {
    & "$PSScriptRoot/../sonar-export.ps1"
    if ($state.requests -ne 2 -or $state.exported.total -ne 2 -or $state.exported.issues.Count -ne 2) { throw 'Paginação inválida.' }
    if ($env:SONAR_TOKEN -ne 'test-token' -or $env:SONAR_PROJECT_KEY -ne 'test project') { throw 'O ambiente do terminal não deve mudar.' }
    $state.envText = 'SONAR_TOKEN=''$(throw "dotenv executed")'''
    $state.envText += "`nSONAR_PROJECT_KEY=canonical project # comentário`nSONAR_PROJECTKEY=ignored"
    $state.expectedToken = '$(throw "dotenv executed")'
    $state.expectedProject = 'canonical project'
    $state.requests = 0
    & "$PSScriptRoot/../sonar-export.ps1"
    if ($state.requests -ne 2) { throw 'Nome canônico e valores literais devem funcionar.' }
    $state.envExists = $false
    $state.expectedToken = 'test-token'
    $state.expectedProject = 'test project'
    $state.requests = 0
    & "$PSScriptRoot/../sonar-export.ps1"
    if ($state.requests -ne 2) { throw 'Sem .env deve usar o ambiente.' }
    $state.emptyPage = $true
    $state.exported = $null
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (-not $failed -or $null -ne $state.exported) { throw 'Página vazia deve falhar sem gravar export.' }
    $state.emptyPage = $false
    $state.requests = 0
    $env:SONAR_TOKEN = ''
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (-not $failed -or $state.requests -ne 0) { throw 'Token ausente deve falhar antes da rede.' }
    $state.envExists = $true
    $state.envText = 'SONAR_TOKEN=""'
    $env:SONAR_TOKEN = 'terminal-token'
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (-not $failed -or $state.requests -ne 0) { throw 'Token vazio no arquivo deve falhar antes da rede, mesmo com token no terminal.' }
    $state.envText = "SONAR_TOKEN=file-token`nSONAR_PROJECT_KEY=`"`"`nSONAR_PROJECTKEY=ignored"
    $failed = $false
    try { & "$PSScriptRoot/../sonar-export.ps1" } catch { $failed = $true }
    if (-not $failed -or $state.requests -ne 0) { throw 'Projeto canônico vazio no arquivo deve falhar antes da rede.' }
    Write-Host 'Sonar export: .env, aliases, prioridade, valores literais, paginação e falhas validados sem rede/arquivo.'
} finally {
    $env:SONAR_TOKEN = $previousToken
    $env:SONAR_PROJECT_KEY = $previousProject
}
