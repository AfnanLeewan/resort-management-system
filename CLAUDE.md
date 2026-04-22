# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build → dist/
```

Docker:
```bash
docker-compose up -d   # Run production build via nginx on port 80
```

No test runner is configured in this project.

## Environment Setup

Copy `.env.example` to `.env` and configure:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEMO_MODE=false   # true = use localStorage fallback
```

Without Supabase credentials, the app automatically runs in **demo mode** using localStorage.

## Architecture Overview

**Stack:** React 18 + TypeScript + Vite + Supabase + TailwindCSS + Radix UI

### Data Layer (Dual Backend)

All data access goes through `src/utils/api.ts`, which transparently switches between Supabase and localStorage based on connection state. Custom hooks in `src/hooks/useSupabase.ts` wrap these API functions:
- `useRooms()`, `useBookings()`, `usePayments()`, `useUsers()`, `useInventory()`, `useAttendance()`, `useDashboardData()`

The generic `useAsyncData<T>()` hook handles loading/error state for any async operation.

### Authentication & Routing

No auth framework — session is stored in localStorage. `App.tsx` reads the current user and renders the appropriate view based on `UserRole`. Six roles exist: `front-desk`, `housekeeping`, `management`, `board`, `part-time`, `repair`.

### Component Structure

- **Feature components** (`src/components/*.tsx`): Large, self-contained screens — `FrontDesk.tsx`, `RoomGrid.tsx`, `Housekeeping.tsx`, `Dashboard.tsx`, `Reports.tsx`, etc.
- **Modal components**: `CheckInModal.tsx`, `CheckOutModal.tsx`, `BookingDetailsModal.tsx`, `ReceiptModal.tsx` — these handle the main booking workflow
- **UI primitives** (`src/components/ui/`): 49 Radix UI-based components (Button, Dialog, Card, etc.)

### Database Schema (Supabase)

11 main tables: `users`, `rooms`, `bookings`, `booking_rooms`, `charges`, `payments`, `maintenance_reports`, `attendance_records`, `inventory_items`, `inventory_transactions`, `counters`.

The `booking_rooms` join table enables group bookings (one booking → multiple rooms). The `charges` table handles add-ons (early check-in, late check-out, discounts). The `counters` table manages receipt/invoice number sequencing.

Database setup: run `supabase/schema.sql` in the Supabase SQL editor. For test data: `supabase/uat_setup.sql`.

### Business Domain

- 30 rooms: 20 single, 10 double
- 3 pricing tiers: General (฿890), Tour (฿840), VIP (฿400)
- Room statuses: `available`, `occupied`, `cleaning`, `maintenance`
- Booking sources: `walk-in`, `phone`, `ota`
- Optional LINE notification integration via Supabase Edge Functions (`supabase/functions/`)

### Branch Strategy

- `main` — production
- `uat-main` — UAT environment
- `dev-main` — active development (current)
