#!/bin/bash


set -e

echo "================================================"
echo "OptiTrade AI - GitHub Push Helper"
echo "================================================"
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME"
    echo ""
    echo "Example: ./push-to-github.sh bertin-nono-git"
    echo ""
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="optitrade-ai"

echo "GitHub Username: $GITHUB_USERNAME"
echo "Repository Name: $REPO_NAME"
echo ""

if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository. Please run this script from /home/ubuntu/optitrade-ai"
    exit 1
fi

echo "Step 1: Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

echo "Step 2: Creating main branch and merging feature branch..."
git checkout -b main 2>/dev/null || git checkout main
git merge feature/initial-implementation --no-edit
echo "✓ Merged feature branch to main"
echo ""

echo "Step 3: Adding GitHub remote..."
if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "✓ Added remote: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""

echo "================================================"
echo "IMPORTANT: Before proceeding, you must:"
echo "================================================"
echo "1. Go to https://github.com/new"
echo "2. Create a repository named: $REPO_NAME"
echo "3. Make it Public or Private (your choice)"
echo "4. DO NOT initialize with README, .gitignore, or license"
echo "5. Click 'Create repository'"
echo ""
echo "Press Enter when you've created the repository on GitHub..."
read

echo ""
echo "Step 4: Pushing to GitHub..."
echo "You may be prompted for your GitHub credentials."
echo ""

if git push -u origin main; then
    echo ""
    echo "================================================"
    echo "✓ SUCCESS! Repository pushed to GitHub"
    echo "================================================"
    echo ""
    echo "Your repository is now available at:"
    echo "https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "Next steps:"
    echo "1. Visit your repository on GitHub"
    echo "2. Add topics: trading, mdp, reinforcement-learning, fastapi, react"
    echo "3. Share with your team!"
    echo ""
else
    echo ""
    echo "================================================"
    echo "Push failed. Common issues:"
    echo "================================================"
    echo ""
    echo "1. Authentication Error:"
    echo "   - You may need a Personal Access Token (PAT)"
    echo "   - Go to: https://github.com/settings/tokens"
    echo "   - Generate new token with 'repo' scope"
    echo "   - Use the token as your password when prompted"
    echo ""
    echo "2. Repository doesn't exist:"
    echo "   - Make sure you created the repository on GitHub first"
    echo "   - Repository name must be exactly: $REPO_NAME"
    echo ""
    echo "3. Permission denied:"
    echo "   - Verify you have write access to the repository"
    echo ""
    echo "Try running the script again after fixing the issue."
    exit 1
fi
