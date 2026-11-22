# AssetHub: Smart Department Asset Booking and Management System

**AssetHub** is an academic resource scheduling, inventory tracking, and equipment requisition Enterprise Resource Planning (ERP) platform built with the **MERN Stack** (MongoDB Atlas, Express.js, React.js with Vite, Node.js, and TypeScript).

It provides real-time booking conflict prevention, separate role-based workflows for Administrators (HOD / Lab In-Charge), Faculty (Professors), and Lab Technicians, all 35 departmental asset types, permanent equipment grants, consumable stock dispensing, return audits, official PDF gatepass slips, and tamper-evident audit logs.

---

## 🏛️ System Features

1. **Academic Command Center & KPI Matrix**:
   - Total Units, Bookable Now, Approvals Due, Active Checkouts, Permanent Allocations, and Low Stock Alerts.
   - Interactive SVG Equipment Deployment donut chart, 6 active laboratory deployment monitors, and quarterly hardware compliance metrics.
2. **Three Requisition Modes**:
   - **Mode 1: Temporary Booking (Daily / Hourly)**: Select equipment, date, start time, return deadline, venue, and course code.
   - **Booking Conflict Prevention Engine**: Live algorithmic overlap verification prevents double-booking the same asset for overlapping times.
   - **Mode 2: Permanent Allocation (Term)**: Long-term workstation and dedicated hardware custody tied to faculty research grants.
   - **Mode 3: Consumable Stock Issue**: Direct inventory draw for whiteboard markers, dusters, copy paper reams, and chalks with automated threshold tracking.
3. **Approvals & Dispatch Desk**:
   - One-click Admin approval or rejection with mandatory administrative rationale.
   - Physical dispatch hand-over and return inspection auditing (Intact, Minor Wear, Damaged).
   - Stamped official campus gatepass with printable barcode.
4. **All 35 Asset Types Pre-Configured**:
   - **Classroom Stationery (11 Items)**: Whiteboard duster, Black marker, Blue marker, Red marker, Dust-free chalk box, Board cleaner spray, A4 paper reams, Heavy-duty stapler, Scissors, Tape dispenser, 2-hole paper punch.
   - **Technical & IT Equipment (12 Items)**: Epson 3LCD Projector, 84" Projector screen, Dell OptiPlex Core i7 Desktop PC, ThinkPad E14 Laptop, Keyboard & Mouse Combo, Network Laser Printer, Flatbed A4 Scanner, 6-Way Extension Board, 3m 4K HDMI Cable, 100W PD Type-C Cable, 5m VGA Cable, 7-Port USB 3.0 Hub.
   - **Audio & Presentation (8 Items)**: Portable PA Speaker, Shure SM58 Wired Mic, Sennheiser UHF Wireless Mic, Audio Adapter Kit, Wireless Spotlight Clicker, Red Beam Laser Pointer, Universal Remote Control, Audio-Technica Headphones.
   - **Recording & Accessories (4 Items)**: Logitech C920 HD Webcam, IPEVO Document Camera, Manfrotto 290 Tripod, 18" Bi-Color Ring Light.
5. **Authentication & RBAC**:
   - JWT tokens signed with secure secrets, bcrypt password hashing, and role-guarded endpoints (`admin`, `faculty`, `tech`).

---

## 💻 Windows VS Code Setup Instructions

Follow these exact steps to run AssetHub on a Windows computer in Visual Studio Code:

### 1. Prerequisites
- **Node.js**: Install Node.js v18 or v20+ from [nodejs.org](https://nodejs.org). Verify by running in PowerShell or Command Prompt:
  ```powershell
  node -v
  npm -v
  ```
- **Visual Studio Code**: Download from [code.visualstudio.com](https://code.visualstudio.com).
- **Git** (optional): From [git-scm.com](https://git-scm.com).

### 2. Open Project in VS Code
1. Open Visual Studio Code.
2. Click **File > Open Folder...** and select the `AssetHub` directory.
3. Open an integrated terminal in VS Code by pressing ``Ctrl + ` `` or going to **Terminal > New Terminal**.

### 3. Install Dependencies
In the VS Code terminal, execute:
```powershell
npm install
```

### 4. Configure Environment Variables
1. Create a `.env` file in the root folder (or copy from `.env.example`):
   ```powershell
   copy .env.example .env
   ```
2. Open `.env` in VS Code and configure:
   ```ini
   # MongoDB Atlas Database URI (replace with your Atlas connection string)
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/assethub?retryWrites=true&w=majority"

   # JWT secret for token authentication
   JWT_SECRET="assethub_jwt_secret_academic_erp_2026_secure_key"

   # Server Port
   PORT=3000
   ```
   > **Note**: If `MONGODB_URI` is left blank, AssetHub will automatically run using its built-in in-memory Mongoose data engine. You can test and demonstrate the full system instantly!

### 5. (Optional) Setup MongoDB Atlas Cluster
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free M0 cluster.
2. Under **Database Access**, create a database user (e.g., `assethub_admin`) and set a password.
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
4. Click **Connect > Drivers > Node.js** and copy your connection string into `MONGODB_URI`.
5. Seed the database with all 35 assets and users:
   ```powershell
   npm run seed
   ```

### 6. Start the Application
Run the unified full-stack server (runs Express API backend on port 3000 with Vite React frontend):
```powershell
npm run dev
```
Open your browser at:
```
http://localhost:3000
```

---

## 🔑 Default Academic User Credentials

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin (HOD)** | Dr. Rajesh Sharma | `admin@assethub.edu` | `Admin@123` |
| **Faculty** | Prof. Ananya Iyer | `faculty@assethub.edu` | `Faculty@123` |
| **Tech Officer** | S. Nair | `tech@assethub.edu` | `Tech@123` |
| **Visiting Prof** | Dr. K. Raman | `k.raman@assethub.edu` | `Faculty@123` |

*Quick switcher*: You can switch between Admin and Faculty at any time using the "Viewing as:" toggle in the header or the profile menu.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login` — Sign in and receive JWT token.
- `POST /api/auth/register` — Enroll faculty or staff.
- `GET /api/auth/me` — Get authenticated user details.
- `POST /api/auth/switch-demo-role` — Fast switcher between demo accounts.

### Assets & Inventory
- `GET /api/assets` — Retrieve all catalog assets with filtering (`category`, `stockStatus`, `search`).
- `GET /api/assets/:code` — Retrieve single asset details and live on-hand quantity.
- `POST /api/assets` — Register new asset (Admin only).
- `PATCH /api/assets/:code/adjust-stock` — Adjust on-hand quantity and update threshold warning status.
- `GET /api/assets/export/csv` — Stream and download complete stock ledger in CSV format.

### Requisitions & Bookings
- `GET /api/bookings` — Query requisitions filtered by requester email, status, or type.
- `POST /api/bookings/check-conflict` — Live conflict verification engine checking date & time slot overlaps.
- `POST /api/bookings` — Create a new temporary, permanent, or consumable requisition.
- `POST /api/bookings/:reqId/approve` — Approve request (Admin only) or issue stock.
- `POST /api/bookings/:reqId/reject` — Reject request with required reason and remarks (Admin only).
- `POST /api/bookings/:reqId/dispatch` — Mark asset handed over to faculty (Tech/Admin).
- `POST /api/bookings/:reqId/return` — Check in returned asset with condition audit (Intact, Minor Wear, Damaged).
- `POST /api/bookings/:reqId/cancel` — Cancel pending requisition.

### Dashboard & Analytics
- `GET /api/stats/dashboard` — Live operational KPIs, active checkouts, venue utilization, and donut metrics.
- `GET /api/stats/audit-logs` — Activity stream and immutable security audit logs.
- `GET /api/stats/health` — Cluster latency, MongoDB Atlas status, and node health.

---

## 🛡️ License & Academic Integrity
AssetHub is built for academic department asset management and lab resource tracking.
Licensed under the Apache-2.0 License.
