#!/bin/bash

# 🚀 EASA FTL Checker - Quick Deploy Script

echo "🚀 EASA FTL Checker - Deployment Script"
echo "========================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
fi

# Build the React app
echo "🔨 Building React application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Add all files to git
echo "📝 Adding files to Git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Production build ready for deployment - $(date)"

echo ""
echo "🎯 Choose your deployment platform:"
echo "1) Heroku (Recommended)"
echo "2) Vercel"
echo "3) Railway"
echo "4) Just commit (manual deploy later)"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🔵 Deploying to Heroku..."
        echo "Make sure you have:"
        echo "1. Heroku CLI installed"
        echo "2. Created a Heroku app: heroku create your-app-name"
        echo "3. Added Heroku remote: heroku git:remote -a your-app-name"
        echo ""
        read -p "Ready to deploy? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            git push heroku main
            echo "🎉 Deployed to Heroku!"
            heroku open
        fi
        ;;
    2)
        echo "🔶 Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
            echo "🎉 Deployed to Vercel!"
        else
            echo "Please install Vercel CLI: npm i -g vercel"
        fi
        ;;
    3)
        echo "🟣 Deploying to Railway..."
        if command -v railway &> /dev/null; then
            railway up
            echo "🎉 Deployed to Railway!"
        else
            echo "Please install Railway CLI: npm install -g @railway/cli"
        fi
        ;;
    4)
        echo "✅ Files committed and ready for manual deployment!"
        echo "Check DEPLOYMENT.md for detailed instructions."
        ;;
    *)
        echo "❌ Invalid choice. Files are committed and ready for deployment."
        ;;
esac

echo ""
echo "🌟 Your EASA FTL Checker is ready!"
echo "📖 See DEPLOYMENT.md for detailed deployment instructions"
echo "🔗 Local test: NODE_ENV=production npm start" 