# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build → dist/
```

E2E tests (Playwright):
```bash
npx playwright test            # Run all tests
npx playwright test login      # Run a single test file
```

## Docker — Multi-Environment

Two environments run as separate containers simultaneously:

```bash
# UAT (port 8080)
docker-compose -p resort-uat -f docker-compose.yml -f docker-compose.uat.yml --env-file .env.uat up -d --build

# Production (port 80)
docker-compose -p resort-prd -f docker-compose.yml -f docker-compose.prd.yml --env-file .env.prd up -d --build

# Stop individually
docker-compose -p resort-uat down
docker-compose -p resort-prd down
```

Env files: `.env.uat` (port 8080), `.env.prd` (port 80). `VITE_*` vars are baked into the JS bundle at build time — each environment requires its own `docker build`.

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEMO_MODE=false   # true = localStorage fallback, no Supabase needed
APP_PORT=80
```

## Architecture Overview

**Stack:** React 18 + TypeScript + Vite + Supabase + TailwindCSS + Radix UI

### Data Layer (Dual Backend)

`src/utils/api.ts` is the single data access point — it transparently switches between Supabase and localStorage based on `VITE_DEMO_MODE` or connection state. Never call Supabase directly from components.

`src/utils/storage.ts` implements the full localStorage mirror of the API (same function signatures).

Custom hooks in `src/hooks/useSupabase.ts` wrap API functions and expose `{ data, loading, error, refetch }`:
- `useRooms()`, `useBookings()`, `usePayments()`, `useUsers()`, `useInventory()`, `useAttendance()`
- `useDashboardData()` — fetches rooms, bookings, payments, maintenance in parallel
- `useReceiptNumber()`, `useInvoiceNumber()` — counter state from the `counters` table

The generic `useAsyncData<T>(fn)` hook handles loading/error state for any async operation and is the base for all specialized hooks.

### Authentication & Routing

No auth framework — session stored in localStorage via `getCurrentUser()` / `setCurrentUser()` in `src/utils/storage.ts`. `App.tsx` holds `currentUser` state and renders the active view based on `UserRole`.

Seven roles: `front-desk`, `housekeeping`, `management`, `board`, `part-time`, `repair`. Default view per role:
- `housekeeping` → housekeeping view
- `board` → reports view
- `repair` → maintenance view
- all others → dashboard

Routing is state-based (not URL-based) — `currentView` string in `App.tsx`.

### Component Structure

- **Feature screens** (`src/components/*.tsx`): `FrontDesk.tsx`, `RoomGrid.tsx`, `RoomManagement.tsx`, `Housekeeping.tsx`, `Dashboard.tsx`, `Reports.tsx`, `StaffDashboard.tsx`, `Inventory.tsx`, `MaintenanceList.tsx`, `LineSettings.tsx`
- **Booking workflow modals**: `CheckInModal.tsx`, `CheckOutModal.tsx`, `BookingDetailsModal.tsx`, `ReceiptModal.tsx`
- **UI primitives** (`src/components/ui/`): Radix UI-based components (Button, Dialog, Card, etc.)

### Utilities

- `src/utils/pricing.ts` — pricing tier calculations (General ฿890, Tour ฿840, VIP ฿400)
- `src/utils/roomHelpers.ts` — room status helpers
- `src/utils/dateHelpers.ts` — date formatting/calculation
- `src/utils/lineService.ts` — LINE Messaging API integration via Supabase Edge Functions
- `src/types/index.ts` — all TypeScript interfaces for domain entities

### Database Schema (Supabase)

11 main tables: `users`, `rooms`, `bookings`, `booking_rooms`, `charges`, `payments`, `maintenance_reports`, `attendance_records`, `inventory_items`, `inventory_transactions`, `counters`.

Key relationships:
- `booking_rooms` join table enables group bookings (one booking → multiple rooms)
- `charges` handles add-ons: early check-in, late check-out, discounts
- `counters` sequences receipt/invoice numbers — always use `getNextReceiptNumber()` / `getNextInvoiceNumber()` from `api.ts`, never generate manually

Database setup: run `supabase/schema.sql` in the Supabase SQL editor. For UAT seed data: `supabase/uat_setup.sql`.

### Business Domain

- 30 rooms: 20 single, 10 double
- Room statuses: `available`, `occupied`, `cleaning`, `maintenance`
- Booking statuses: `reserved`, `checked-in`, `checked-out`, `cancelled`
- Booking sources: `walk-in`, `phone`, `ota`
- LINE notification integration via Supabase Edge Functions (`supabase/functions/`)

### Branch Strategy

- `main` — production
- `uat-main` — UAT environment
- `prod-main` — production container branch
- `dev-main` — active development
