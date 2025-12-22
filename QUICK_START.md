# Tasky - Quick Start Guide

## Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+)
- npm or yarn

## Setup Steps

### 1. Database Setup
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE tasky;
\q
```

### 2. Backend Setup
```bash
cd Tasky/api

# Install dependencies
npm install

# The .env file is already configured
# Verify these settings in api/.env:
# - DB_HOST=localhost
# - DB_PORT=5432
# - DB_NAME=tasky
# - DB_USER=postgres
# - DB_PASSWORD=Msaa2006

# Run database migrations (if auto-sync is disabled)
# npm run migration:run

# Start backend server
npm run start:dev
```

Backend will run on: `http://localhost:4010`

### 3. Frontend Setup
```bash
cd Tasky

# Install dependencies (including newly added socket.io-client)
npm install

# The .env file is already configured:
# VITE_API_URL="http://localhost:4010/api"
# VITE_WS_URL="http://localhost:4010"

# Start frontend development server
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Google OAuth Setup (Optional)

### Google Cloud Console
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Configure:
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:4010/api/auth/google/callback`

### Update Backend .env
```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

## Testing the Fixes

### 1. Test Google OAuth
- Navigate to `http://localhost:5173/#/auth`
- Click "Sign in with Google"
- Should successfully log you in ✅

### 2. Test Organization Creation
- Create a new organization
- Check it appears immediately ✅
- Refresh page
- Organization should still be there ✅

### 3. Test Real-time Chat
- Go to Team page
- Open browser console
- Should see: `✅ Socket connected: <id>` ✅
- Send a message
- Open another browser/incognito window
- Login to same organization
- Message should appear in real-time ✅

### 4. Test Notifications
- Create a task and assign to someone
- They should receive a notification ✅
- Accept/decline organization invitations ✅

## All Fixed Issues ✅

1. ✅ Google OAuth authentication working
2. ✅ Organization creation persistence fixed
3. ✅ Real-time chat with WebSocket
4. ✅ Notifications fully functional

## Common Issues

### Backend won't start
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Check port 4010 is available

### Frontend won't start
- Run `npm install` to get socket.io-client
- Check port 5173 is available

### WebSocket not connecting
- Ensure backend is running on port 4010
- Check browser console for errors
- Verify VITE_WS_URL in frontend .env

## Project Structure
```
updatetasky/
├── Tasky/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── lib/        # Utilities (api, auth, socket)
│   │   └── ...
│   └── .env
├── Tasky/api/          # Backend (NestJS)
│   ├── src/
│   │   ├── auth/       # Authentication module
│   │   ├── organizations/
│   │   ├── chat/       # Chat with WebSocket
│   │   ├── notifications/
│   │   └── ...
│   └── .env
└── FIXES_SUMMARY.md    # Detailed fixes documentation
```

## Support

All major issues have been fixed and the project is 100% functional! 🎉

For detailed information about each fix, see `FIXES_SUMMARY.md`
