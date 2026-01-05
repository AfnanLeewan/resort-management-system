// Core types for Royyan Resort Management System

export type RoomType = 'single' | 'double';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type BookingSource = 'walk-in' | 'phone' | 'ota';
export type PricingTier = 'general' | 'tour' | 'vip';
export type PaymentMethod = 'cash' | 'transfer' | 'qr';
export type UserRole = 'front-desk' | 'housekeeping' | 'management' | 'board';

export interface Room {
  id: string;
  number: number;
  type: RoomType;
  status: RoomStatus;
  currentBookingId?: string;
}

export interface Guest {
  name: string;
  idNumber: string; // ID Card or Passport
  phone: string;
}

export interface Booking {
  id: string;
  roomIds: string[]; // Support for group bookings
  guest: Guest;
  checkInDate: string;
  checkOutDate: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  pricingTier: PricingTier;
  baseRate: number;
  source: BookingSource;
  status: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled';
  groupName?: string; // For tour groups
  notes?: string;
  additionalCharges?: Charge[];
  createdAt: string;
  createdBy: string;
}

export interface Charge {
  id: string;
  bookingId: string;
  type: 'room' | 'early-checkin' | 'late-checkout' | 'discount' | 'other';
  description: string;
  amount: number;
  authorizedBy?: string; // For discounts
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  receiptNumber: string;
  invoiceNumber: string;
  paidAt: string;
  paidBy: string;
  charges: Charge[];
  subtotal: number;
  vat: number;
  total: number;
}

export interface MaintenanceReport {
  id: string;
  roomId: string;
  reportedBy: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'resolved';
  reportedAt: string;
  resolvedAt?: string;
  photos?: string[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface DashboardStats {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  todayRevenue: number;
  monthRevenue: number;
  checkInsToday: number;
  checkOutsToday: number;
  pendingMaintenance: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minLevel: number; // For reorder warnings
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string; // Cache name for history
  date: string; // ISO String
  type: 'in' | 'out'; // in = receive, out = issue
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  balanceAfter: number; // Snapshot of balance
  payer: string; // Person who paid/issued
  receiver: string; // Person who received
  notes?: string;
  createdAt: string;
  createdBy: string;
}
