# ✅ Quick Start Checklist

## 🚀 Langkah-Langkah Setup (15-20 Menit)

### Phase 1: Database Setup (5 menit)

- [ ] Buka terminal/command prompt
- [ ] Start MySQL:
  ```bash
  # macOS
  brew services start mysql
  ```
- [ ] Create database & import schema:
  ```bash
  cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard
  mysql -u root -p smart_energy_dashboard < backend/database/schema.sql
  ```
- [ ] Verify data:
  ```bash
  mysql -u root -p smart_energy_dashboard
  SELECT COUNT(*) FROM classes;  # Should show 5
  SELECT COUNT(*) FROM devices;  # Should show 10
  EXIT;
  ```

### Phase 2: Backend Setup (5 menit)

- [ ] Navigate to backend:
  ```bash
  cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard/backend
  ```
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Check `.env` file (should be already created):
  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=smart_energy_dashboard
  PORT=5000
  ```
- [ ] Start backend server:
  ```bash
  npm run dev
  ```
  
  Expected output:
  ```
  ✅ Database connected successfully
  🚀 Smart Energy Dashboard API running on port 5000
  ```

- [ ] Test health check in another terminal:
  ```bash
  curl http://localhost:5000/health
  ```

### Phase 3: Frontend Setup (5 menit)

- [ ] In another terminal, navigate to frontend:
  ```bash
  cd /Users/HCMPublic/Kuliah/Unesa\ Dashboard
  ```
- [ ] Create `.env.local` file:
  ```bash
  touch .env.local
  ```
- [ ] Add API URL:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
  ```
- [ ] Start frontend:
  ```bash
  npm run dev
  ```
  
  Expected output:
  ```
  ▲ Next.js 14.1.0
  - Local: http://localhost:3001
  ```

### Phase 4: Testing Integration (5 menit)

- [ ] Open browser: http://localhost:3001
- [ ] Check if page loads without errors
- [ ] Open browser console (F12)
- [ ] Look for any CORS or API errors
- [ ] Verify data is displaying in dashboard

### Phase 5: Verify All Endpoints (5 menit)

Test key endpoints:

- [ ] Get Classes:
  ```bash
  curl http://localhost:5000/api/v1/classes
  ```
  Response should show: Kelas A, B, C, D, E

- [ ] Get Devices:
  ```bash
  curl http://localhost:5000/api/v1/devices
  ```
  Response should show 10 devices

- [ ] Get Settings:
  ```bash
  curl http://localhost:5000/api/v1/settings
  ```

- [ ] Create Alert:
  ```bash
  curl -X POST http://localhost:5000/api/v1/alerts \
    -H "Content-Type: application/json" \
    -d '{
      "device_id": 1,
      "class_id": 1,
      "type": "warning",
      "title": "Test Alert",
      "message": "Testing API",
      "severity": "high"
    }'
  ```

---

## 📊 Files Created & Location

### Backend Files (in `backend/` folder)
```
backend/
├── server.js                  # Main Express app
├── package.json              # Dependencies
├── .env                      # Config (already created)
├── .gitignore
├── .editorconfig
├── config/
│   └── database.js
├── controllers/
│   ├── ClassController.js
│   ├── DeviceController.js
│   ├── ConsumptionController.js
│   ├── AlertController.js
│   └── SettingsController.js
├── models/
│   ├── Class.js
│   ├── Device.js
│   ├── Consumption.js
│   ├── Alert.js
│   └── Settings.js
├── routes/
│   ├── classRoutes.js
│   ├── deviceRoutes.js
│   ├── consumptionRoutes.js
│   ├── alertRoutes.js
│   └── settingsRoutes.js
├── database/
│   └── schema.sql
├── README.md
├── API_DOCUMENTATION.md
├── STRUCTURE.md
├── setup.sh
└── setup.bat
```

### Frontend Files (to create)
```
src/
└── lib/
    └── apiClient.ts          # API service layer (NEW)

.env.local                     # Frontend config (NEW)
```

### Documentation Files (root folder)
```
SETUP_GUIDE.md                 # Comprehensive setup guide
BACKEND_SUMMARY.md             # Backend overview
API_ROUTES.md                  # Route visualization
.env.example                   # Environment template
```

---

## 🔍 Troubleshooting During Setup

### Issue: "MySQL Connection Refused"

```bash
# Check if MySQL is running
brew services list

# Start MySQL
brew services start mysql

# Verify connection
mysql -u root -p
# Leave password empty, just press Enter
```

### Issue: "Port 5000 Already in Use"

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

### Issue: "Module not found: express"

```bash
# Make sure you're in backend folder
cd backend

# Install all dependencies
npm install
```

### Issue: "CORS Error in Frontend"

```bash
# Check .env.local in frontend folder
cat .env.local

# Should contain:
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# If not, create/update it
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > .env.local
```

### Issue: "Cannot Find Database"

```bash
# Check if database exists
mysql -u root -p -e "SHOW DATABASES;"

# If not, create it
mysql -u root -p -e "CREATE DATABASE smart_energy_dashboard;"

# Import schema
mysql -u root -p smart_energy_dashboard < /Users/HCMPublic/Kuliah/Unesa\ Dashboard/backend/database/schema.sql
```

---

## 🎯 Verification Steps

### Backend Running?
```bash
# In new terminal, check:
curl http://localhost:5000/health

# Should respond with:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Smart Energy Dashboard API is running"
}
```

### Frontend Running?
```bash
# Open browser:
http://localhost:3001

# Should see dashboard page (not error 404)
```

### Database Connected?
```bash
# Check backend logs:
# Should see: ✅ Database connected successfully
```

### API Working?
```bash
# Get classes:
curl http://localhost:5000/api/v1/classes

# Should return JSON with success: true
```

---

## 📚 Documentation Quick Links

- **Setup Guide**: `SETUP_GUIDE.md` - Lengkap & step-by-step
- **Backend Summary**: `BACKEND_SUMMARY.md` - Ringkasan backend
- **API Routes**: `API_ROUTES.md` - Visual API overview
- **Backend README**: `backend/README.md` - Detail API documentation
- **Backend Structure**: `backend/STRUCTURE.md` - Struktur file & fitur

---

## 💡 Tips

1. **Keep Terminals Open**
   - Terminal 1: MySQL (if needed)
   - Terminal 2: Backend (npm run dev)
   - Terminal 3: Frontend (npm run dev)

2. **Check Logs**
   - Look at backend console for errors
   - Open browser DevTools (F12) untuk frontend errors

3. **Test Before Full Integration**
   - Test API with cURL first
   - Then test in Postman/Thunder Client
   - Finally test in frontend

4. **Hot Reload**
   - Backend auto-restarts on file change (npm run dev)
   - Frontend auto-refreshes on file change

5. **Database**
   - Check schema.sql for table structure
   - Use MySQL Workbench untuk visual database management

---

## 🎉 Success Checklist

When everything is working:

- [ ] MySQL is running
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3001
- [ ] No errors in browser console
- [ ] No errors in backend terminal
- [ ] API endpoints responding correctly
- [ ] Frontend can fetch data from backend
- [ ] Dashboard displays device data

---

## 📞 Quick Reference

**Frontend URL**: http://localhost:3001
**Backend URL**: http://localhost:5000
**API Base**: http://localhost:5000/api/v1
**Database**: smart_energy_dashboard
**DB User**: root
**DB Host**: localhost:3030

---

## 🚀 Next Steps After Setup

1. ✅ Setup sudah selesai
2. Modify frontend components untuk meet requirements
3. Add real-time data updates (WebSocket)
4. Implement authentication (optional)
5. Deploy ke production (later)

---

**Estimated Setup Time**: 15-20 minutes
**Difficulty Level**: Easy
**Status**: ✅ Ready to go!

Good luck! 🎯
