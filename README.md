# Blood Connect: Location-Aware Blood Donor Coordination PWA

Blood Connect is a full-stack MERN Progressive Web App (PWA) designed to coordinate blood donation during medical emergencies. It combines **MongoDB geospatial queries (2dsphere)**, an **Adaptive Search Radius Engine (1 km to 10 km)**, an **Offline-first architecture (IndexedDB with idempotency)**, **Socket.IO real-time radar updates**, and **privacy-controlled donor contact disclosure**.

---

## 🌟 Key Features

1. **Geospatial Location Matching**:
   - Stores user and hospital coordinates using GeoJSON `Point` (`[longitude, latitude]`).
   - Evaluates proximity using MongoDB `2dsphere` indexes and calculates precise Haversine distance in kilometers.
   - Filters candidate donors by compatibility, active status, and explicit donor availability.

2. **Adaptive Search Radius Engine (Core Innovation)**:
   - Initial requests search within an immediate **1 km perimeter**.
   - A persistent backend scheduler (`node-cron` / interval worker) continuously monitors donor responses.
   - If response thresholds are not met, the search boundary automatically expands in calibrated steps (**1 km &rarr; 2 km &rarr; 4 km &rarr; 6 km &rarr; 8 km &rarr; 10 km**).
   - Only **newly eligible donors** are matched and notified (guaranteed by unique compound indexes `requestId + donorId`).
   - If the 10 km maximum perimeter is reached without sufficient response, the requester is immediately alerted to contact local hospital blood banks or emergency helplines directly.
   - Includes a development/demonstration trigger to test radius expansion on demand.

3. **Offline-First PWA (IndexedDB + Service Worker)**:
   - Built with `vite-plugin-pwa` and Workbox caching strategies.
   - When offline or during hospital connectivity drops, requests are validated locally, assigned a unique UUID `idempotencyKey`, and queued in **IndexedDB** (`idb`).
   - The UI displays an "Offline Engine: Waiting for connection" banner and queued draft counter.
   - Background sync automatically replays queued drafts upon network recovery; the backend enforces idempotency to prevent duplicate requests.

4. **Privacy-Preserving Donor Contact Sharing**:
   - Donors' personal mobile numbers and emails are **never exposed publicly**.
   - Contact details are encrypted/shielded until the donor explicitly **accepts** the request and **grants contact consent**.

5. **Live Radar & In-App Alerts (Socket.IO)**:
   - Real-time bidirectional updates stream new match alerts, donor responses, radius expansion events, and fulfillment confirmations directly to connected clients.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Axios, Socket.IO Client, Leaflet & React-Leaflet, Lucide Icons, `idb` (IndexedDB), `vite-plugin-pwa`.
- **Backend**: Node.js, Express.js (REST API under `/api/v1`), Socket.IO, Mongoose, bcryptjs, jsonwebtoken, express-rate-limit, helmet, morgan.
- **Database**: MongoDB with geospatial `2dsphere` indexes.
- **Testing**: Node.js Native Test Runner (`node --test`), Supertest.

---

## 📁 Repository Structure

```
blood-connect/
├── client/
│   ├── public/
│   │   ├── icons/
│   │   │   └── icon.svg
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── LeafletMap.jsx      # Leaflet map with radius circle & pins
│   │   │   ├── Navbar.jsx          # Responsive header & network status
│   │   │   ├── OfflineBanner.jsx   # Offline indicator & sync trigger
│   │   │   └── ToastAlert.jsx      # Real-time notification toast
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # User session & auth state
│   │   │   ├── NotificationContext.jsx # Live in-app alerts
│   │   │   ├── OfflineContext.jsx  # IndexedDB queue & connectivity
│   │   │   └── SocketContext.jsx   # Socket.IO connection & rooms
│   │   ├── offline/
│   │   │   ├── db.js               # idb IndexedDB storage layer
│   │   │   └── syncManager.js      # Connectivity check & replay worker
│   │   ├── pages/
│   │   │   ├── AdminDashboardPage.jsx # Platform KPIs & moderation
│   │   │   ├── CreateRequestPage.jsx  # Blood request form with map
│   │   │   ├── DashboardPage.jsx      # Action decks (Need Blood / Donate)
│   │   │   ├── DonorDashboardPage.jsx # Matched alerts & response flow
│   │   │   ├── LandingPage.jsx        # Hero & demo credentials
│   │   │   ├── LoginPage.jsx          # Login with quick autofill
│   │   │   ├── MyRequestsPage.jsx     # Created requests overview
│   │   │   ├── NotificationsPage.jsx  # In-app notifications list
│   │   │   ├── ProfilePage.jsx        # Profile & donor settings
│   │   │   └── RequestDetailsPage.jsx # Live Radar View
│   │   ├── services/
│   │   │   └── api.js              # Axios instance with auth interceptor
│   │   ├── styles/
│   │   │   └── index.css           # Glassmorphism & healthcare design tokens
│   │   ├── App.jsx                 # Routing & protected routes
│   │   └── main.jsx                # PWA Service Worker entrypoint
│   ├── index.html
│   ├── package.json
│   └── vite.config.js              # Vite & VitePWA configuration
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── constants.js        # Blood groups & compatibility matrix
│   │   │   └── db.js               # MongoDB connection handler
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── matchController.js
│   │   │   ├── notificationController.js
│   │   │   ├── pushController.js
│   │   │   ├── requestController.js
│   │   │   └── userController.js
│   │   ├── jobs/
│   │   │   └── radiusScheduler.js  # Scheduled evaluation engine
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification & admin guard
│   │   │   ├── errorHandler.js     # Centralized error handler
│   │   │   ├── rateLimiter.js      # Request throttling
│   │   │   └── validation.js       # Input & coordinate sanitization
│   │   ├── models/
│   │   │   ├── AuditLog.js
│   │   │   ├── BloodRequest.js     # Request schema with 2dsphere index
│   │   │   ├── Notification.js
│   │   │   ├── PushSubscription.js
│   │   │   ├── RequestMatch.js     # Unique compound index (requestId+donorId)
│   │   │   └── User.js             # User & Donor schema with 2dsphere index
│   │   ├── routes/
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── matchRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── pushRoutes.js
│   │   │   ├── requestRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── scripts/
│   │   │   └── seed.js             # Synthetic donors at calibrated coordinates
│   │   ├── services/
│   │   │   ├── adaptiveRadiusService.js # Atomic radius evaluation engine
│   │   │   ├── matchingService.js       # Geospatial query & privacy filter
│   │   │   └── notificationService.js   # In-app & Socket delivery
│   │   ├── socket/
│   │   │   └── socketHandler.js    # Socket.IO auth & room management
│   │   ├── utils/
│   │   │   ├── bloodCompatibility.js
│   │   │   └── distance.js         # Haversine distance calculations
│   │   ├── app.js                  # Express application setup
│   │   └── server.js               # Server entrypoint
│   ├── tests/
│   │   └── api.test.js             # API test suite
│   ├── .env.example
│   ├── .env
│   └── package.json
├── package.json                    # Monorepo concurrency scripts
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ (tested on v24.18.0)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI.

### 1. Environment Configuration

The backend reads its configuration from `server/.env`. A default `.env` file is pre-configured for local development:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/blood_connect
JWT_SECRET=super_secret_jwt_blood_connect_2026_key_918237
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
RADIUS_EVAL_INTERVAL_SECONDS=30
INITIAL_RADIUS_KM=1
MAX_RADIUS_KM=10
RADIUS_INCREMENT_KM=1
```

### 2. Install Dependencies

From the project root:
```bash
npm run install:all
```
*(Or run `npm install` inside both `server/` and `client/` directories)*

### 3. Seed Demonstration Data

Populate the database with synthetic donor profiles at calibrated coordinates (inside and outside the 1 km radius), test requesters, and sample requests:

```bash
npm run seed
# or: cd server && node src/scripts/seed.js
```

### 4. Run the Full Application

To run both backend API (port 5000) and frontend client (port 5173) concurrently:
```bash
npm run dev
```

Or run them individually in separate terminal sessions:
- **Backend**: `cd server && npm run dev` (runs nodemon on `http://localhost:5000`)
- **Frontend**: `cd client && npm run dev` (runs Vite on `http://localhost:5173`)

---

## 🧪 Testing and Verification

### Run Backend Integration Tests
A full API test suite tests database connectivity, authentication, request creation, idempotency replay prevention, and adaptive radius expansion:

```bash
cd server
npm test
# or: node --test tests/api.test.js
```

### Demonstration Accounts & Credentials

All test accounts use the password: `password123`

| Account Role | Email | Coordinates / Characteristics |
| :--- | :--- | :--- |
| **Primary Requester (Rahul Sharma)** | `requester@bloodconnect.org` | AIIMS Hospital Trauma Center |
| **Donor 1 (Aarav Patel)** | `donor.aarav@bloodconnect.org` | **0.6 km away** (A+, Available, Within 1 km radius) |
| **Donor 2 (Priya Iyer)** | `donor.priya@bloodconnect.org` | **0.5 km away** (O- Universal Donor, Within 1 km) |
| **Donor 3 (Vikram Singh)** | `donor.vikram@bloodconnect.org` | **2.2 km away** (A+, Matched upon 1st radius expansion) |
| **Donor 4 (Neha Verma)** | `donor.neha@bloodconnect.org` | **4.2 km away** (A-, Matched upon 2nd radius expansion) |
| **Donor 7 (Rohan Gupta)** | `donor.rohan@bloodconnect.org` | **18 km away** (Out of maximum 10 km search range) |
| **System Admin** | `admin@bloodconnect.org` | Full Moderation & Analytics access |

---

## 🔬 How to Test Core Features

### 1. Test Location-Based Matching
1. Log in as `requester@bloodconnect.org` (or use the one-click demo autofill on the Login page).
2. Click **I Need Blood** on the Dashboard.
3. Fill out the request form (e.g., A+ blood, 2 units, hospital at default coordinates `[77.2090, 28.5672]`).
4. Click **Launch Adaptive Blood Request**.
5. Observe that the request initializes at **1 km radius** and immediately matches **Donor 1 (0.6 km away)** and **Donor 2 (0.5 km away)**, while excluding Donor 3 (2.2 km away) and Donor 7 (18 km away).

### 2. Test Adaptive Radius Expansion Engine
1. On the **Live Radar Page** (`/requests/:id`), view the Leaflet map with the 1 km red radius circle.
2. Under the **Adaptive Perimeter Engine** panel, click **Expand Search Radius Now (Dev Test)**.
3. The radius increases (e.g. from 1 km to 2 km).
4. **Donor 3 (Vikram Singh, 2.2 km away)** is now within range and automatically matched!
5. Notice that the **Expansion History Timeline** records the expansion step without duplicating alerts to previously matched donors.

### 3. Test Donor Response & Privacy Consent
1. Open an incognito browser window or log out and log in as `donor.aarav@bloodconnect.org`.
2. Go to **Donor Coordination Feed** (`/donations`).
3. Click **Accept & Donate** and check the box **"Share my phone number with requester"**.
4. Switch back to the requester's Live Radar page: the donor's status updates in real time via Socket.IO, displaying the verified contact card with phone number and direct call button.

### 4. Test Offline Request Queue & Idempotent Sync
1. Open DevTools in your browser and switch Network throttling to **Offline** (or toggle your Wi-Fi).
2. Notice the top banner switch to: `"Offline Mode Active: Requests are safely queued in local storage (IndexedDB)"`.
3. Fill out and submit a new blood request.
4. The request is assigned a unique `idempotencyKey` and stored in IndexedDB.
5. Restore network connectivity (switch back to Online).
6. The sync worker detects connection restoration, replays the draft against `/api/v1/requests`, and marks it synchronized without duplicating entries.

---

## 🛡 Security & Privacy Highlights

- **Bcrypt Password Hashing**: Passwords are never stored in plaintext.
- **JWT Authentication**: Protected API endpoints enforce token authorization.
- **Privacy Shielding**: Donors' personal coordinates are never broadcast raw; contact details require explicit two-way consent.
- **Rate Limiting**: Protects sensitive endpoints against brute-force attacks.
- **Idempotency Guarantees**: Prevents accidental double-posting of blood requests during unstable network connections.
