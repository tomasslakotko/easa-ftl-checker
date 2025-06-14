# 🚀 EASA FTL Checker - Deployment Guide

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- Git repository initialized
- Production build created (`npm run build`)

## 🌐 Deployment Options

### Option 1: Heroku (Recommended - Free Tier Available)

#### Step 1: Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Login and Create App
```bash
heroku login
heroku create your-easa-ftl-checker
```

#### Step 3: Deploy
```bash
git add .
git commit -m "Ready for deployment"
git push heroku main
```

#### Step 4: Open Your App
```bash
heroku open
```

**Your app will be available at:** `https://your-easa-ftl-checker.herokuapp.com`

---

### Option 2: Vercel (Serverless)

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Deploy
```bash
vercel --prod
```

#### Step 3: Configure
- Set build command: `npm run build`
- Set output directory: `client/build`
- Set install command: `npm install`

---

### Option 3: Netlify (Static + Functions)

#### Step 1: Build for Production
```bash
npm run build
```

#### Step 2: Deploy via Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=client/build
```

#### Step 3: Configure Functions
- Create `netlify/functions` directory
- Move API endpoints to serverless functions

---

### Option 4: Railway (Alternative to Heroku)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 2: Login and Deploy
```bash
railway login
railway init
railway up
```

---

### Option 5: DigitalOcean App Platform

#### Step 1: Connect GitHub Repository
1. Go to DigitalOcean App Platform
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`

---

## 🔧 Environment Variables

Set these environment variables in your deployment platform:

```bash
NODE_ENV=production
PORT=3001  # Usually auto-set by platform
```

## 🧪 Local Production Test

Test your production build locally:

```bash
# Build the app
npm run build

# Start production server
NODE_ENV=production npm start

# Visit: http://localhost:3001
```

## 📊 Performance Optimizations

The app includes:
- ✅ Gzip compression
- ✅ Security headers (Helmet)
- ✅ Static file serving
- ✅ Production React build
- ✅ API rate limiting ready

## 🔒 Security Features

- CORS configured for production
- Helmet security headers
- Input validation on all endpoints
- File upload limits
- XSS protection

## 📈 Monitoring

Add these services for production monitoring:
- **Heroku**: Built-in metrics
- **Vercel**: Analytics dashboard
- **Netlify**: Built-in analytics
- **External**: New Relic, DataDog, or Sentry

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**: Check Node.js version (18+ required)
2. **API Not Working**: Verify CORS settings in server.js
3. **Static Files 404**: Ensure build folder exists
4. **Memory Issues**: Increase dyno size on Heroku

### Debug Commands:
```bash
# Check build
npm run build

# Test locally
NODE_ENV=production npm start

# Check logs (Heroku)
heroku logs --tail
```

## 🎯 Quick Deploy Commands

### Heroku (Fastest)
```bash
heroku create your-app-name
git push heroku main
heroku open
```

### Vercel (Simplest)
```bash
vercel --prod
```

### Railway (Modern)
```bash
railway init
railway up
```

---

## 🌟 Your App Features

Once deployed, your EASA FTL Checker will have:

- ✈️ **Roster Parsing**: Upload and parse flight rosters
- 📊 **EASA Compliance**: Check flight time limitations
- 🕐 **Standby Preview**: View available flights during standby
- 🌍 **Multi-language**: English and Russian support
- 📱 **Responsive**: Works on all devices
- 🔒 **Secure**: Production-ready security

**Ready to deploy? Choose your platform and follow the steps above!** 🚀 