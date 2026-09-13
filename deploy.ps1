# ==============================================================================
# Production Deployment Script
# Builds the production bundle and safely deploys the 'release' directory
# to the remote 'production' branch using git subtree.
# ==============================================================================

$ErrorActionPreference = "Stop"

# 0. Preparation & Validation
Write-Host "Starting production deployment process..." -ForegroundColor Cyan

# Ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($currentBranch) -or $currentBranch -eq "HEAD") {
    Write-Host "Error: Cannot deploy from a detached HEAD state. Please checkout a branch first." -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$deployBranch = "temp-deploy-$timestamp"

Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host "Temporary deployment branch: $deployBranch" -ForegroundColor Cyan

# 1. Clean release directory before building
if (Test-Path "release") {
    Write-Host "Cleaning previous release directory..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force "release"
}

# 2. Run production build
Write-Host "Executing production build (npm run build:prod)..." -ForegroundColor Cyan
& npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Production build failed with exit code $LASTEXITCODE. Aborting deployment." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Verify build artifacts
$botBundle = "release/dist/Bot.js"
$prodPackage = "release/package.json"

if (-not (Test-Path $botBundle)) {
    Write-Host "Error: Expected bundle file '$botBundle' was not found." -ForegroundColor Red
    exit 1
}
if ((Get-Item $botBundle).Length -eq 0) {
    Write-Host "Error: Bundle file '$botBundle' is empty." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $prodPackage)) {
    Write-Host "Error: Production '$prodPackage' was not found." -ForegroundColor Red
    exit 1
}

Write-Host "Build verification passed." -ForegroundColor Green

try {
    # 4. Switch to temporary branch to perform deployment work
    Write-Host "Creating and switching to temporary branch: $deployBranch..." -ForegroundColor Cyan
    git checkout -b $deployBranch

    # 5. Stage release directory (force add in case it's in .gitignore)
    Write-Host "Staging release artifacts..." -ForegroundColor Cyan
    git add -f release

    # EXCLUSION: Ensure real .env is NEVER committed to production
    if (Test-Path "release/.env") {
        Write-Host "Excluding real .env from production push..." -ForegroundColor Yellow
        git rm --cached -f release/.env 2>$null
        git reset release/.env 2>$null
    }

    # 6. Commit release artifacts on temporary branch
    $staged = git diff --cached --name-only
    if ($staged) {
        Write-Host "Committing release artifacts on temporary branch..." -ForegroundColor Cyan
        git commit -m "chore(release): production build $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } else {
        Write-Host "No staged changes to commit for release." -ForegroundColor Yellow
    }

    # 7. Split release subtree and push to production branch
    Write-Host "Splitting release subtree..." -ForegroundColor Cyan
    $subtree_id = (git subtree split --prefix release).Trim()

    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($subtree_id)) {
        Write-Host "Pushing subtree commit $subtree_id to origin/production..." -ForegroundColor Cyan
        git push origin "${subtree_id}:refs/heads/production" --force
        Write-Host "Successfully pushed to production branch!" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to split release subtree." -ForegroundColor Red
        exit 1
    }
}
finally {
    # 8. Cleanup: Always return to the original branch and remove the temporary branch
    Write-Host "Returning to '$currentBranch' branch..." -ForegroundColor Cyan
    git checkout $currentBranch 2>$null

    Write-Host "Deleting temporary branch '$deployBranch'..." -ForegroundColor Cyan
    git branch -D $deployBranch 2>$null

    # Unstage any accidental tracking of release on original branch
    git reset HEAD release 2>$null
    git restore --staged release 2>$null
}

Write-Host "Production deployment process completed successfully!" -ForegroundColor Green
