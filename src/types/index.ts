// Core types for Royyan Resort Management System

export type RoomType = 'single' | 'double';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type BookingSource = 'walk-in' | 'phone' | 'ota';
export type PricingTier = 'general' | 'tour' | 'vip';
export type PaymentMethod = 'cash' | 'transfer' | 'qr';
export type UserRole = 'front-desk' | 'housekeeping' | 'management' | 'board' | 'part-time' | 'repair';

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
  address?: string;
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
  deposit?: number;
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
  status: 'pending' | 'in-progress' | 'completed' | 'resolved';
  reportedAt: string;
  resolvedAt?: string;
  photos?: string[];
}

export interface WorkShift {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  start: string; // "08:00"
  end: string;   // "17:00"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  photoUrl?: string;
  status: 'on-duty' | 'off-duty' | 'on-leave';
  lastCheckIn?: string;
  lastCheckOut?: string;
  shifts?: WorkShift[];
  isOnline?: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  type: 'check-in' | 'check-out' | 'leave';
  timestamp: string;
  note?: string;
  leaveReason?: string;
  leaveDate?: string; // For leave records that might be for a future/past date
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

// LINE Integration Types
export interface StaffLineMapping {
  id: string;
  userId: string;
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  registrationCode?: string;
  status: 'active' | 'inactive' | 'pending';
  richMenuId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineNotification {
  id: string;
  recipientUserId?: string;
  recipientLineId: string;
  notificationType: 'checkout_alert' | 'repair_request' | 'repair_complete' | 'clean_complete';
  relatedRoomId?: string;
  relatedMaintenanceId?: string;
  messageContent?: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface LineCleaningTask {
  id: string;
  roomId: string;
  bookingId?: string;
  assignedTo?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'inspected' | 'needs_repair' | 'pending_repair_details';
  checkoutTime?: string;
  acceptedAt?: string;
  completedAt?: string;
  inspectedAt?: string;
  inspectedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface LineRegistrationCode {
  id: string;
  userId: string;
  code: string;
  expiresAt: string;
  usedAt?: string;
  usedByLineId?: string;
  createdAt: string;
}

export interface LineBotConfig {
  id: string;
  channelId?: string;
  channelSecret?: string;
  channelAccessToken?: string;
  housekeeperRichMenuId?: string;
  technicianRichMenuId?: string;
  adminRichMenuId?: string;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
