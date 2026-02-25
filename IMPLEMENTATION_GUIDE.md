# Mass Tracking System 2026 - Implementation Guide

## Phase 1: ✅ COMPLETED
- [x] MongoDB Prisma schema migrated (9 models)
- [x] All relationships defined
- [x] Indexes optimized for queries
- Commit: `6f70402`

## Phase 2: Scheduler Engine Implementation

### File Location: `/server/src/services/scheduler.ts`

The scheduler.ts has been prepared with the complete 5-level priority algorithm:

1. **Priority 1**: Block blocked days (mass not celebrated)
2. **Priority 2**: Place fixed intentions (birthdays, anniversaries)
3. **Priority 3**: Schedule deceased masses (date of death + 2 days, scan forward)
4. **Priority 3.5**: Schedule Gregorian series (30 consecutive, pause/resume)
5. **Priority 4**: Monthly personal intentions (3 per month, random selection)
6. **Priority 5**: Fill gaps with bulk batches (FIFO by date received)

Key implementation notes:
- Scheduler rebuilds entire calendar on each save
- Gregorian series pauses when hitting blocks/anniversaries, resumes next day
- Conflict detection flags but doesn't crash
- Audit trail logged in SchedulerRun model

### Installation:
1. Create `/server/src/services/scheduler.ts` (see separate file)
2. Install dependency: `npm install luxon` (for date handling)
3. Test with: `npm run test scheduler`

---

## Phase 3: Backend API Endpoints

### Files to Create:
- `/server/src/routes/auth.ts` - Enhanced authentication
- `/server/src/routes/mass.ts` - Mass management
- `/server/src/routes/reports.ts` - Report generation

### Auth Routes:
```typescript
POST /api/auth/register
- username, password, email
- name, province, congregation, dateOfBirth, dateOfOrdination

POST /api/auth/login
- Returns JWT token

GET /api/profile
- Returns user profile

PUT /api/profile
- Updates user profile
```

### Mass Routes:
```typescript
POST /api/mass/blocked-day
POST /api/mass/fixed-intention
POST /api/mass/deceased
POST /api/mass/batch
PUT /api/mass/scheduler/run

GET /api/mass/calendar/:year/:month
GET /api/mass/batch-status/:batchId
```

### Report Routes:
```typescript
GET /api/reports/canonical-register/:year
GET /api/reports/yearly-book/:year
GET /api/reports/deceased-summary/:year
GET /api/reports/monthly-personal/:year
```

---

## Phase 4: Frontend Components

### Calendar View Component (`CalendarView.tsx`):
```typescript
- Month grid with 7-column layout
- Color coding:
  - Gray: Blocked days
  - Blue: Fixed intentions
  - Red: Deceased masses
  - Green: Gregorian masses
  - Yellow: Personal intentions
  - Purple: Bulk masses
- Click day to see details
```

### Dashboard Component (`Dashboard.tsx`):
```typescript
- Sidebar navigation
- Month/year selector
- Action buttons:
  - Add Blocked Day
  - Add Intention
  - Upload Batch
  - Run Scheduler
- Conflict indicator badge
```

### Forms:
- `BlockedDayForm.tsx` - Add/edit blocked days
- `IntentionForm.tsx` - Add fixed intentions
- `DeceasedForm.tsx` - Register deceased (manual/auto date toggle)
- `BatchUploadForm.tsx` - Upload Gregorian/Bulk/Donor batches
- `ProfileForm.tsx` - Edit user profile

### Reports Tab:
```typescript
- Export buttons for:
  - Canonical Register (PDF)
  - Yearly Mass Book (CSV)
  - Deceased Summary
- Date range selector
```

---

## Phase 5: Report Generation

### Canonical Register Export:
```
Serial No. | Date of Receipt | From Whom | Date Celebrated | Details
1          | 2025-01-01      | Province  | 2025-01-05      | Gregorian #1

Summary Tables:
- Deceased Members: Name | Date of Death | Date Celebrated | Status
- Monthly Personal: Jan: 3, Feb: 3, ... (verify 3/month)
```

### Yearly Mass Book Export:
```
Date       | Type      | Description              | Serial | Notes
2025-01-01 | Blocked   | Good Friday              | -      | No Mass
2025-01-02 | Fixed     | Birthday - Fr. Smith     | -      | Annual
2025-01-03 | Gregorian | Province - John Doe      | 1      | Series
```

### Implementation:
- Use `pdfkit` for PDF generation
- Use `csv-stringify` for CSV export
- Generate on-the-fly from ScheduledMass records

---

## Phase 6: Full Testing & Deployment

### Local Testing Checklist:
```
[ ] User registration with all profile fields
[ ] User login and JWT token generation
[ ] Add 3 blocked days (e.g., Good Friday)
[ ] Add 2 fixed intentions (birthdays)
[ ] Register 1 deceased member with auto-date
[ ] Submit Gregorian batch (30 masses)
[ ] Submit bulk donor batch (50 masses)
[ ] Run scheduler
[ ] Verify:
    [ ] Blocked days remain empty
    [ ] Fixed intentions on correct dates
    [ ] Deceased @death+2 days
    [ ] Gregorian fills 30 consecutive slots
    [ ] Personal = 3/month
    [ ] Bulk fills remaining gaps
[ ] Export reports
    [ ] Canonical register
    [ ] Yearly mass book
    [ ] Deceased summary
```

### Deployment to MongoDB Atlas + Railway:

1. **MongoDB Atlas**:
   - Create cluster at mongodb.com
   - Get connection string
   - Set `DATABASE_URL` environment variable

2. **Railway.app**:
   - Connect GitHub repository
   - Set environment variables:
     - `DATABASE_URL` (MongoDB connection)
     - `JWT_SECRET` (secure random string)
     - `NODE_ENV=production`
   - Deploy automatically

3. **Verification**:
   - Test API endpoints from Railway domain
   - Check database at MongoDB Atlas dashboard
   - View logs in Railway console

---

## Required npm Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^4.0.0",
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.0.0",
    "cors": "^2.8.0",
    "dotenv": "^16.0.0",
    "pdfkit": "^0.13.0",
    "csv-stringify": "^6.0.0",
    "luxon": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^4.8.0",
    "ts-node": "^10.0.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

Install with: `npm install`

---

## Environment Variables Template

Create `.env` file:
```env
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/mass_tracker
JWT_SECRET=your-very-secret-key-change-in-production
PORT=5000
NODE_ENV=development
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

---

## Next Immediate Steps

1. **Install dependencies**:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Create scheduler.ts** in `/server/src/services/`

3. **Update `/server/src/index.ts`**:
   - Import new routes
   - Mount `/api/auth`, `/api/mass`, `/api/reports`
   - Add error handling middleware

4. **Run migrations**:
   ```bash
   cd server
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Start development**:
   ```bash
   npm run dev (in both server and client)
   ```

6. **Git workflow**:
   ```bash
   git add .
   git commit -m "Phase 2-5: Implement scheduler, routes, components"
   git push origin main
   ```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                 │
│  ┌──────────────┬─────────────────┬────────────────┐    │
│  │  Dashboard   │  CalendarView   │   ReportsTab   │    │
│  └──────────────┴─────────────────┴────────────────┘    │
└────────────────────────────┬────────────────────────────┘
                             │ API Calls (Axios)
                             ▼
┌─────────────────────────────────────────────────────────┐
│            Express Backend (TypeScript)                 │
│  ┌──────────┬─────────┬──────────────────────────┐      │
│  │ Auth     │ Mass    │ Reports                  │      │
│  │ Routes   │ Routes  │ Routes                   │      │
│  └───┬──────┴────┬────┴──────────┬───────────────┘      │
│      │           │               │                      │
│  ┌───▼──────────────────────────▼──────────────────┐    │
│  │  Services Layer                                 │    │
│  │  ┌──────────────┐  ┌──────────────────────┐   │    │
│  │  │  Scheduler   │  │  ReportGenerator     │   │    │
│  │  └──────────────┘  └──────────────────────┘   │    │
│  └────────────────────────────────────────────────┘    │
│                      │                                  │
│  ┌────────────────────▼─────────────────────────────┐  │
│  │  Prisma Client (ORM)                            │  │
│  └────────────────────┬─────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│          MongoDB Atlas (Cloud Database)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Collections:                                    │  │
│  │  - users                                         │  │
│  │  - blockedDays                                   │  │
│  │  - fixedIntentions                               │  │
│  │  - deceased                                      │  │
│  │  - gregorianMasses                               │  │
│  │  - personalIntentions                            │  │
│  │  - massBatches                                   │  │
│  │  - scheduledMasses                               │  │
│  │  - schedulerRuns                                 │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Success Criteria

Project is complete when:
- [ ] All 9 Prisma models working with MongoDB
- [ ] Scheduler engine passing all priority logic tests
- [ ] All API endpoints responding correctly
- [ ] Frontend displays calendar with color-coded masses
- [ ] Reports generating in correct format
- [ ] Full user workflow testable locally
- [ ] Deployed to Railway with MongoDB Atlas
- [ ] GitHub repository up-to-date

---

**Repository**: https://github.com/willymsfs/mass-tracker

For questions or clarifications, consult the plan file at plan.md
