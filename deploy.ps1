# Deployment script for production branch using git subtree
# This script builds the project and pushes the 'release' folder to the 'production' branch.
# IMPROVED: Uses a temporary deployment branch to protect the local development branch.

# 0. Preparation: Identify current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
$deployBranch = "temp-deploy-$(Get-Date -Format 'yyyyMMdd-HHmm')"

Write-Host "Current branch is: $currentBranch" -ForegroundColor Cyan
Write-Host "Creating temporary deployment branch: $deployBranch" -ForegroundColor Cyan

# 1. Run build
Write-Host "Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting." -ForegroundColor Red
    exit $LASTEXITCODE
}

try {
    # 2. Switch to temporary branch to perform deployment work
    # This ensures that even if the script is interrupted, the Beta branch remains untouched.
    git checkout -b $deployBranch

    # 3. Add and commit the release folder (forcing it in case it's ignored)
    Write-Host "Staging release folder..." -ForegroundColor Cyan
    git add -f release

    # EXCLUSION: Ensure .env is NOT staged for production
    if (Test-Path "release/.env") {
        Write-Host "Excluding .env from production push..." -ForegroundColor Yellow
        git reset release/.env
    }

    # Check if there are staged changes to commit
    $staged = git diff --cached --name-only
    if ($staged) {
        Write-Host "Committing release artifacts on temporary branch..." -ForegroundColor Cyan
        git commit -m "chore: production build $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    } else {
        Write-Host "No new changes to commit for release." -ForegroundColor Yellow
    }

    # 4. Push to production branch using subtree
    Write-Host "Pushing to production branch..." -ForegroundColor Cyan
    # Using 'split' to create a temporary commit and then pushing it to 'production'
    $subtree_id = git subtree split --prefix release
    if ($LASTEXITCODE -eq 0) {
        git push origin "${subtree_id}:refs/heads/production" --force
        Write-Host "Successfully pushed to production branch!" -ForegroundColor Green
    } else {
        Write-Host "Failed to split subtree." -ForegroundColor Red
    }
}
finally {
    # 5. Cleanup: Always return to the original branch and delete the temporary one
    Write-Host "Returning to $currentBranch branch..." -ForegroundColor Cyan
    git checkout $currentBranch

    Write-Host "Deleting temporary branch $deployBranch..." -ForegroundColor Cyan
    git branch -D $deployBranch
    
    # Ensure any stray staging from the 'add -f' is cleared on the original branch
    git restore --staged release 2>$null
}

Write-Host "Deployment process finished!" -ForegroundColor Green
