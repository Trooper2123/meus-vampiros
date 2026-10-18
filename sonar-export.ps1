$ErrorActionPreference = "Stop"

$sonarToken = $env:SONAR_TOKEN
$sonarProject = $env:SONAR_PROJECT_KEY
$envPath = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $envPath -PathType Leaf) {
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $credentials = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8 |
        & node -e "const fs = require('node:fs'); const dotenv = require(require.resolve('dotenv', { paths: [process.argv[1]] })); const values = dotenv.parse(fs.readFileSync(0, 'utf8')); process.stdout.write(JSON.stringify({ token: values.SONAR_TOKEN, project: values.SONAR_PROJECT_KEY ?? values.SONAR_PROJECTKEY }));" $PSScriptRoot
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível carregar as credenciais do .env.' }
    $credentials = $credentials | ConvertFrom-Json
    if ($null -ne $credentials.token) { $sonarToken = $credentials.token }
    if ($null -ne $credentials.project) { $sonarProject = $credentials.project }
}

if ([string]::IsNullOrWhiteSpace($sonarToken) -or [string]::IsNullOrWhiteSpace($sonarProject)) {
    throw "Defina SONAR_TOKEN e SONAR_PROJECT_KEY (ou SONAR_PROJECTKEY) no .env ou neste terminal."
}

$headers = @{
    Authorization = "Bearer $sonarToken"
}

$project = [uri]::EscapeDataString($sonarProject)
$issues = @()
$page = 1

do {
    $url = "https://sonarcloud.io/api/issues/search?componentKeys=$project&resolved=false&ps=500&p=$page"
    $result = Invoke-RestMethod -Uri $url -Headers $headers

    if (-not $result.issues -and $issues.Count -lt $result.paging.total) {
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
