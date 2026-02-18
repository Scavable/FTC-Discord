# Deployment script for production branch using git subtree
# This script builds the project and pushes the 'release' folder to the 'production' branch.

# 1. Run build
Write-Host "Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Check for changes in 'release' folder
# Remove any existing .env files from the release folder to ensure they are not committed
if (Test-Path "release/.env") {
    Write-Host "Removing sensitive .env from release folder before staging..." -ForegroundColor Yellow
    Remove-Item "release/.env" -Force
}

$hasChanges = git status release --short
if (-not $hasChanges) {
    Write-Host "No changes detected in release folder. Is the build up to date?" -ForegroundColor Yellow
    # We might still want to proceed if the user wants to force a push, but usually, we stop.
}

# 3. Add and commit the release folder (forcing it in case it's ignored)
Write-Host "Staging release folder..." -ForegroundColor Cyan
git add -f release

# Check if there are staged changes to commit
$staged = git diff --cached --name-only
if ($staged) {
    Write-Host "Committing release artifacts..." -ForegroundColor Cyan
    git commit -m "chore: production build $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
} else {
    Write-Host "No new changes to commit for release." -ForegroundColor Yellow
}

# 4. Push to production branch using subtree
Write-Host "Pushing to production branch..." -ForegroundColor Cyan
# Using 'split' to create a temporary commit and then pushing it to 'production'
# This ensures that only the contents of 'release' end up in the production branch.
$subtree_id = git subtree split --prefix release
if ($LASTEXITCODE -eq 0) {
    git push origin "${subtree_id}:production" --force
    Write-Host "Successfully pushed to production branch!" -ForegroundColor Green
} else {
    Write-Host "Failed to split subtree." -ForegroundColor Red
}

# 5. Optional: Remove the commit from your current branch to keep it clean
# If you don't want the "production build" commit in your main history:
if ($staged) {
    Write-Host "Cleaning up local commit to keep history clean..." -ForegroundColor Cyan
    git reset --soft HEAD~1
    git restore --staged release
}
Write-Host "Done!" -ForegroundColor Green
