# Supabase Backend Integration Guide

This guide describes how to set up and use Supabase as the backend for the Royyan Resort Management System.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Schema Setup](#database-schema-setup)
4. [Environment Configuration](#environment-configuration)
5. [Component Migration Guide](#component-migration-guide)
6. [API Reference](#api-reference)
7. [Demo Mode](#demo-mode)

---

## Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier works)

## Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from **Settings > API**
3. These will be used in your `.env` file

## Database Schema Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Paste and run the SQL script
5. This will create all tables, indexes, and seed data

### Tables Created

| Table | Purpose |
|-------|---------|
| `users` | Staff accounts and roles |
| `rooms` | Room inventory (30 rooms) |
| `bookings` | Reservations |
| `booking_rooms` | Many-to-many for group bookings |
| `charges` | Additional charges (early check-in, etc.) |
| `payments` | Payment records |
| `maintenance_reports` | Repair requests |
| `attendance_records` | Staff check-in/out |
| `inventory_items` | Stock items |
| `inventory_transactions` | Stock movements |
| `counters` | Receipt/invoice numbering |

## Environment Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_DEMO_MODE=false
```

3. Restart the development server:

```bash
npm run dev
```

## Component Migration Guide

### Before (LocalStorage)

```tsx
import { getRooms, updateRoomStatus } from '../utils/storage';

function MyComponent() {
  const rooms = getRooms(); // Synchronous
  
  const handleUpdate = () => {
    updateRoomStatus(roomId, 'available'); // Synchronous
  };
}
```

### After (Supabase with Hooks)

```tsx
import { useRooms } from '../hooks/useSupabase';

function MyComponent() {
  const { rooms, loading, error, updateRoomStatus } = useRooms();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const handleUpdate = async () => {
    await updateRoomStatus(roomId, 'available'); // Async
  };
}
```

### Available Hooks

| Hook | Returns | Use Case |
|------|---------|----------|
| `useRooms()` | `{ rooms, loading, error, refetch, updateRoomStatus }` | Room grid, status updates |
| `useBookings()` | `{ bookings, loading, error, refetch, addBooking, updateBooking }` | Front desk, reservations |
| `usePayments()` | `{ payments, loading, error, refetch, addPayment }` | Check-out, reports |
| `useMaintenanceReports()` | `{ reports, loading, error, refetch, addReport, updateReport }` | Housekeeping |
| `useUsers()` | `{ users, loading, error, refetch, addUser, updateUser, deleteUser }` | Staff management |
| `useInventory()` | `{ items, transactions, loading, error, ... }` | Inventory management |
| `useAttendance()` | `{ records, loading, error, toggleAttendance, recordLeave }` | Staff attendance |
| `useDashboardData()` | `{ rooms, bookings, payments, maintenanceReports, loading }` | Dashboard stats |

## API Reference

### Direct API Functions (in `src/utils/api.ts`)

All functions work with both Supabase and LocalStorage fallback:

#### Users
```ts
getUsers(): Promise<User[]>
getUserByUsername(username: string): Promise<User | null>
addUser(user: User): Promise<void>
updateUser(id: string, updates: Partial<User>): Promise<void>
deleteUser(id: string): Promise<void>
```

#### Rooms
```ts
getRooms(): Promise<Room[]>
updateRoomStatus(roomId: string, status: RoomStatus, bookingId?: string): Promise<void>
```

#### Bookings
```ts
getBookings(): Promise<Booking[]>
addBooking(booking: Booking): Promise<void>
updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void>
```

#### Payments
```ts
getPayments(): Promise<Payment[]>
addPayment(payment: Payment): Promise<void>
getNextReceiptNumber(): Promise<string>
getNextInvoiceNumber(): Promise<string>
```

#### Maintenance
```ts
getMaintenanceReports(): Promise<MaintenanceReport[]>
addMaintenanceReport(report: MaintenanceReport): Promise<void>
updateMaintenanceReport(id: string, updates: Partial<MaintenanceReport>): Promise<void>
```

#### Inventory
```ts
getInventoryItems(): Promise<InventoryItem[]>
addInventoryItem(item: InventoryItem): Promise<void>
updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void>
deleteInventoryItem(id: string): Promise<void>
getInventoryTransactions(): Promise<InventoryTransaction[]>
addInventoryTransaction(transaction: InventoryTransaction): Promise<void>
```

#### Attendance
```ts
getAttendanceRecords(): Promise<AttendanceRecord[]>
toggleUserAttendance(userId: string, type: 'check-in' | 'check-out'): Promise<void>
recordLeave(userId: string, date: string, reason: string): Promise<void>
```

#### Export
```ts
exportToCSV(): Promise<string>
```

## Demo Mode

The application automatically falls back to LocalStorage (demo mode) when:

1. `VITE_DEMO_MODE=true` in `.env`
2. Supabase credentials are not configured
3. Supabase connection fails

This ensures the app always works, even without a backend.

### Check Mode in Console

Open browser dev tools and look for:
- `✅ Supabase connected: https://...` - Using Supabase
- `⚠️ Supabase not configured. Running in demo mode...` - Using LocalStorage

---

## File Structure

```
src/
├── lib/
│   ├── supabase.ts          # Supabase client initialization
│   ├── database.types.ts    # TypeScript types for database
│   └── index.ts             # Barrel export
├── hooks/
│   ├── useSupabase.ts       # React hooks for data fetching
│   └── index.ts             # Barrel export
├── utils/
│   ├── api.ts               # API layer (Supabase + localStorage fallback)
│   └── storage.ts           # Original localStorage functions (kept as fallback)
└── ...

supabase/
└── schema.sql               # Database schema for Supabase
```

---

## Troubleshooting

### "Supabase not configured" warning

Ensure your `.env` file has:
- Correct `VITE_SUPABASE_URL` (not the placeholder)
- Correct `VITE_SUPABASE_ANON_KEY`

### Row Level Security (RLS) errors

The schema includes permissive RLS policies. For production, you should:
1. Enable Supabase Auth
2. Update RLS policies to check authenticated users

### Data not syncing

1. Check browser console for errors
2. Verify API calls in Network tab
3. Check Supabase dashboard logs

---

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run schema.sql
3. ✅ Configure .env
4. ✅ Migrate all components to use async API:
   - Dashboard
   - Login
   - FrontDesk
   - RoomGrid
   - Housekeeping
   - CheckInModal
   - CheckOutModal
   - BookingDetailsModal
   - Inventory
   - StaffDashboard
   - Reports
5. ⏳ Add Supabase Auth for secure login
6. ⏳ Add real-time subscriptions
7. ⏳ LINE Notify integration
8. ⏳ OTA integrations (Booking.com, Agoda, etc.)

---

**Note:** The current implementation uses anonymous access. For production, implement proper authentication using Supabase Auth.
