#!/bin/bash

# Tasky Production Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

echo "=========================================="
echo "🚀 Tasky Production Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Not on main branch!${NC}"
    echo "Current branch: $BRANCH"
    echo "Please switch to main branch first: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Error: Uncommitted changes detected!${NC}"
    echo "Please commit or stash your changes first"
    git status -s
    exit 1
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes from GitHub...${NC}"
git pull origin main

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Build frontend
echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build

# Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
cd api
npm install
npm run build
cd ..

echo -e "${GREEN}✅ Build completed successfully!${NC}"

# Instructions for server deployment
echo ""
echo "=========================================="
echo "📋 Next Steps for Production Server:"
echo "=========================================="
echo ""
echo "1. SSH to your production server"
echo "2. Navigate to your app directory"
echo "3. Run these commands:"
echo ""
echo "   git pull origin main"
echo "   npm install"
echo "   npm run build"
echo "   cd api"
echo "   npm install"
echo "   npm run build"
echo "   cd .."
echo "   pm2 restart all  # or your process manager"
echo ""
echo "=========================================="
