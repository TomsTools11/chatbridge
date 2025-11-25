#!/bin/bash

# ChatBridge Railway Deployment Script
# This script helps you deploy ChatBridge to Railway

set -e

echo "🚂 ChatBridge Railway Deployment"
echo "================================"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Login check
echo "Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

echo "✅ Logged in to Railway"
echo ""

# Initialize or link project
echo "Setting up Railway project..."
if [ ! -f "railway.json" ]; then
    echo "No railway.json found. Creating new project or linking existing..."
    railway init
fi

echo ""
echo "📋 Deployment Checklist:"
echo ""
echo "Before deploying, make sure you have:"
echo "  [ ] Created PostgreSQL database in Railway"
echo "  [ ] Created Redis database in Railway"
echo "  [ ] Set all required environment variables"
echo "  [ ] Configured Slack app"
echo "  [ ] Configured AWS SES"
echo ""
read -p "Have you completed the checklist? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete the checklist first."
    echo "See RAILWAY_DEPLOYMENT.md for details."
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy API
echo "📡 Deploying API service..."
railway up --service api || echo "⚠️  API deployment failed or service doesn't exist yet"

echo ""

# Deploy Worker
echo "⚙️  Deploying Worker service..."
railway up --service worker || echo "⚠️  Worker deployment failed or service doesn't exist yet"

echo ""

# Deploy Dashboard
echo "🎨 Deploying Admin Dashboard..."
railway up --service admin-dashboard || echo "⚠️  Dashboard deployment failed or service doesn't exist yet"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run database migrations: railway run --service api pnpm db:push"
echo "2. Check services are running: railway status"
echo "3. View logs: railway logs"
echo "4. Get service URLs: railway domain"
echo ""
echo "📚 See RAILWAY_DEPLOYMENT.md for detailed instructions"
