Write-Host "== SonarQube analysis (frontend) =="
if (-not $env:SONAR_HOST_URL) { Write-Error "Missing SONAR_HOST_URL environment variable"; exit 1 }
if (-not $env:SONAR_TOKEN)    { Write-Error "Missing SONAR_TOKEN environment variable"; exit 1 }
if (-not $env:PROJECT_KEY)    { Write-Error "Missing PROJECT_KEY environment variable (frontend project key)"; exit 1 }

Push-Location $PSScriptRoot\..\
try {
  if (Test-Path package.json) {
    Write-Host "Installing deps (if needed)"
    npm ci | Out-Host
    Write-Host "Running unit tests with coverage"
    npm run test -- --watch=false --code-coverage | Out-Host
  }
  $scanCmd = @(
    "-Dsonar.projectKey=$($env:PROJECT_KEY)",
    "-Dsonar.host.url=$($env:SONAR_HOST_URL)",
    "-Dsonar.login=$($env:SONAR_TOKEN)"
  )
  npx sonar-scanner @scanCmd | Out-Host
}
finally { Pop-Location }

Write-Host "Done. Check the project in SonarQube: $($env:PROJECT_KEY)"

