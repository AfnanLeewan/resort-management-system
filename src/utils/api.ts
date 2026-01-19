/**
 * Royyan Resort Management System - API Service Layer
 * 
 * This module provides a unified API for all data operations,
 * supporting both Supabase (production) and LocalStorage (demo mode).
 */

import { supabase, isInDemoMode } from '../lib/supabase';
import {
  Room,
  Booking,
  Payment,
  MaintenanceReport,
  User,
  InventoryItem,
  InventoryTransaction,
  AttendanceRecord,
  Charge,
  WorkShift,
} from '../types';

// Import localStorage functions as fallback
import * as localStorage from './storage';

// =====================================================
// HELPER: Convert Supabase row to app type
// =====================================================

function mapUserFromDB(row: any): User {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    phone: row.phone || undefined,
    photoUrl: row.photo_url || undefined,
    status: row.status,
    lastCheckIn: row.last_check_in || undefined,
    lastCheckOut: row.last_check_out || undefined,
    isOnline: row.is_online,
    shifts: row.shifts as WorkShift[] || [],
  };
}

function mapRoomFromDB(row: any): Room {
  return {
    id: row.id,
    number: row.number,
    type: row.type,
    status: row.status,
    currentBookingId: row.current_booking_id || undefined,
  };
}

function mapBookingFromDB(row: any, roomIds: string[] = []): Booking {
  return {
    id: row.id,
    roomIds: roomIds,
    guest: {
      name: row.guest_name,
      idNumber: row.guest_id_number,
      phone: row.guest_phone,
      address: row.guest_address || undefined,
    },
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    actualCheckInTime: row.actual_check_in_time || undefined,
    actualCheckOutTime: row.actual_check_out_time || undefined,
    pricingTier: row.pricing_tier,
    baseRate: Number(row.base_rate),
    deposit: row.deposit ? Number(row.deposit) : undefined,
    source: row.source,
    status: row.status,
    groupName: row.group_name || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || '',
  };
}

function mapPaymentFromDB(row: any, charges: Charge[] = []): Payment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount),
    method: row.method,
    receiptNumber: row.receipt_number,
    invoiceNumber: row.invoice_number,
    paidAt: row.paid_at,
    paidBy: row.paid_by || '',
    charges: charges,
    subtotal: Number(row.subtotal),
    vat: Number(row.vat),
    total: Number(row.total),
  };
}

function mapMaintenanceFromDB(row: any): MaintenanceReport {
  return {
    id: row.id,
    roomId: row.room_id,
    reportedBy: row.reported_by || '',
    description: row.description,
    priority: row.priority,
    status: row.status,
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at || undefined,
    photos: row.photos as string[] || [],
  };
}

function mapInventoryItemFromDB(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    minLevel: row.min_level,
  };
}

function mapInventoryTransactionFromDB(row: any): InventoryTransaction {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    date: row.date,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: Number(row.price_per_unit),
    totalPrice: Number(row.total_price),
    balanceAfter: row.balance_after,
    payer: row.payer,
    receiver: row.receiver,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || '',
  };
}

function mapAttendanceFromDB(row: any): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    timestamp: row.timestamp,
    note: row.note || undefined,
    leaveReason: row.leave_reason || undefined,
    leaveDate: row.leave_date || undefined,
  };
}

// =====================================================
// USERS API
// =====================================================

export async function getUsers(): Promise<User[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getUsers();
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return localStorage.getUsers();
  }

  return data.map(mapUserFromDB);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  if (isInDemoMode || !supabase) {
    const users = localStorage.getUsers();
    return users.find(u => u.username === username) || null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return mapUserFromDB(data);
}

export async function addUser(user: User): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.addUser(user);
    return;
  }

  const { error } = await supabase.from('users').insert({
    // id autogenerated
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone || null,
    photo_url: user.photoUrl || null,
    status: user.status,
    is_online: user.isOnline || false,
    shifts: user.shifts || [],
  });

  if (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.updateUser(id, updates);
    return;
  }

  const dbUpdates: any = {};
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.lastCheckIn !== undefined) dbUpdates.last_check_in = updates.lastCheckIn;
  if (updates.lastCheckOut !== undefined) dbUpdates.last_check_out = updates.lastCheckOut;
  if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
  if (updates.shifts !== undefined) dbUpdates.shifts = updates.shifts;

  const { error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.deleteUser(id);
    return;
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// =====================================================
// CURRENT USER (Session) - Always uses localStorage
// =====================================================

export function getCurrentUser(): User | null {
  return localStorage.getCurrentUser();
}

export function setCurrentUser(user: User | null): void {
  localStorage.setCurrentUser(user);
}

// =====================================================
// ROOMS API
// =====================================================

export async function getRooms(): Promise<Room[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getRooms();
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('number', { ascending: true });

  if (error) {
    console.error('Error fetching rooms:', error);
    return localStorage.getRooms();
  }

  return data.map(mapRoomFromDB);
}

export async function updateRoomStatus(
  roomId: string,
  status: Room['status'],
  bookingId?: string
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.updateRoomStatus(roomId, status, bookingId);
    return;
  }

  const { error } = await supabase
    .from('rooms')
    .update({
      status,
      current_booking_id: bookingId || null,
    })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room status:', error);
    throw error;
  }
}

// =====================================================
// BOOKINGS API
// =====================================================

export async function getBookings(): Promise<Booking[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getBookings();
  }

  // Fetch bookings with their room IDs
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return localStorage.getBookings();
  }

  // Fetch all booking_rooms
  const { data: bookingRoomsData, error: brError } = await supabase
    .from('booking_rooms')
    .select('booking_id, room_id');

  if (brError) {
    console.error('Error fetching booking_rooms:', brError);
    return localStorage.getBookings();
  }

  // Map room IDs to bookings
  return bookingsData.map(booking => {
    const roomIds = bookingRoomsData
      .filter(br => br.booking_id === booking.id)
      .map(br => br.room_id);
    return mapBookingFromDB(booking, roomIds);
  });
}

export async function addBooking(booking: Booking): Promise<string> {
  if (isInDemoMode || !supabase) {
    localStorage.addBooking(booking);
    return booking.id;
  }

  // Insert booking - don't specify id, let Supabase generate UUID
  // Also don't specify created_by as it requires a valid user UUID from DB
  const { data: insertedBooking, error: bookingError } = await supabase.from('bookings').insert({
    guest_name: booking.guest.name,
    guest_id_number: booking.guest.idNumber,
    guest_phone: booking.guest.phone,
    guest_address: booking.guest.address || null,
    check_in_date: booking.checkInDate,
    check_out_date: booking.checkOutDate,
    actual_check_in_time: booking.actualCheckInTime || null,
    actual_check_out_time: booking.actualCheckOutTime || null,
    pricing_tier: booking.pricingTier,
    base_rate: booking.baseRate,
    deposit: booking.deposit || null,
    source: booking.source,
    status: booking.status,
    group_name: booking.groupName || null,
    notes: booking.notes || null,
    // created_by omitted - would need valid UUID from users table
  }).select('id').single();

  if (bookingError) {
    console.error('Error adding booking:', bookingError.message, bookingError.details, bookingError.hint);
    throw bookingError;
  }

  // Use the generated booking ID from Supabase
  const newBookingId = insertedBooking?.id || booking.id;

  // Insert booking_rooms using the room numbers (we need to look up room UUIDs)
  if (booking.roomIds.length > 0) {
    // Get room UUIDs from room numbers
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, number')
      .in('number', booking.roomIds.map(id => {
        // If roomId is a number, use it directly
        // If it's a string starting with numbers, extract the number
        const num = parseInt(id.toString().replace(/\D/g, ''));
        return isNaN(num) ? id : num;
      }));
    
    // Also try matching by id directly (in case roomIds are UUIDs)
    const { data: roomsByUuid } = await supabase
      .from('rooms')
      .select('id')
      .in('id', booking.roomIds);

    // Combine both approaches
    const validRoomIds = [
      ...(roomsData || []).map(r => r.id),
      ...(roomsByUuid || []).map(r => r.id)
    ];

    // Remove duplicates
    const uniqueRoomIds = [...new Set(validRoomIds)];

    if (uniqueRoomIds.length > 0) {
      const bookingRooms = uniqueRoomIds.map(roomId => ({
        booking_id: newBookingId,
        room_id: roomId,
      }));

      const { error: roomsError } = await supabase
        .from('booking_rooms')
        .insert(bookingRooms);

      if (roomsError) {
        console.error('Error adding booking rooms:', roomsError);
        // Continue anyway, but log it
      }
    }
  }

  return newBookingId;
}

export async function updateBooking(
  bookingId: string,
  updates: Partial<Booking>
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.updateBooking(bookingId, updates);
    return;
  }

  const dbUpdates: any = {};
  if (updates.guest) {
    if (updates.guest.name) dbUpdates.guest_name = updates.guest.name;
    if (updates.guest.idNumber) dbUpdates.guest_id_number = updates.guest.idNumber;
    if (updates.guest.phone) dbUpdates.guest_phone = updates.guest.phone;
    if (updates.guest.address !== undefined) dbUpdates.guest_address = updates.guest.address;
  }
  if (updates.checkInDate !== undefined) dbUpdates.check_in_date = updates.checkInDate;
  if (updates.checkOutDate !== undefined) dbUpdates.check_out_date = updates.checkOutDate;
  if (updates.actualCheckInTime !== undefined) dbUpdates.actual_check_in_time = updates.actualCheckInTime;
  if (updates.actualCheckOutTime !== undefined) dbUpdates.actual_check_out_time = updates.actualCheckOutTime;
  if (updates.pricingTier !== undefined) dbUpdates.pricing_tier = updates.pricingTier;
  if (updates.baseRate !== undefined) dbUpdates.base_rate = updates.baseRate;
  if (updates.deposit !== undefined) dbUpdates.deposit = updates.deposit;
  if (updates.source !== undefined) dbUpdates.source = updates.source;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { error } = await supabase
    .from('bookings')
    .update(dbUpdates)
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

// =====================================================
// PAYMENTS API
// =====================================================

export async function getPayments(): Promise<Payment[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getPayments();
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return localStorage.getPayments();
  }

  // Fetch charges for each payment
  const bookingIds = data.map(p => p.booking_id);
  const { data: chargesData } = await supabase
    .from('charges')
    .select('*')
    .in('booking_id', bookingIds);

  return data.map(payment => {
    const charges = (chargesData || [])
      .filter(c => c.booking_id === payment.booking_id)
      .map(c => ({
        id: c.id,
        bookingId: c.booking_id,
        type: c.type as Charge['type'],
        description: c.description,
        amount: Number(c.amount),
        authorizedBy: c.authorized_by || undefined,
      }));
    return mapPaymentFromDB(payment, charges);
  });
}

export async function getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
  if (isInDemoMode || !supabase) {
    const payments = localStorage.getPayments();
    return payments.find(p => p.bookingId === bookingId) || null;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching payment by booking ID:', error);
    return null;
  }

  if (!data) return null;
  
  // Fetch charges
  const { data: chargesData } = await supabase
    .from('charges')
    .select('*')
    .eq('booking_id', bookingId);

   const charges = (chargesData || []).map(c => ({
        id: c.id,
        bookingId: c.booking_id,
        type: c.type as Charge['type'],
        description: c.description,
        amount: Number(c.amount),
        authorizedBy: c.authorized_by || undefined,
      }));

  return mapPaymentFromDB(data, charges);
}

export async function addPayment(payment: Payment): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.addPayment(payment);
    return;
  }

  // First, we need to get the Supabase booking UUID from our local booking ID
  // The booking_id in payment might be a local ID like "BK..." or a Supabase UUID
  let bookingUuid = payment.bookingId;
  
  // Try to find the booking in Supabase if it looks like a local ID
  if (!payment.bookingId.includes('-')) {
    // It's not a UUID, try to find the booking by matching data
    console.log('Payment bookingId is not a UUID, looking up booking...');
  }

  // Insert charges first (without specifying ID - let Supabase generate UUID)
  if (payment.charges.length > 0) {
    const chargesInsert = payment.charges.map(c => ({
      // Don't specify id - let Supabase auto-generate
      booking_id: bookingUuid,
      type: c.type,
      description: c.description,
      amount: c.amount,
      // Don't specify authorized_by unless it's a valid UUID
    }));

    const { error: chargesError } = await supabase
      .from('charges')
      .insert(chargesInsert as any);

    if (chargesError) {
      console.error('Error adding charges:', chargesError.message, chargesError.details, chargesError.hint);
      throw chargesError;
    }
  }

  // Insert payment (without specifying ID - let Supabase generate UUID)
  const { error } = await supabase.from('payments').insert({
    // Don't specify id - let Supabase auto-generate
    booking_id: bookingUuid,
    amount: payment.amount,
    method: payment.method,
    receipt_number: payment.receiptNumber,
    invoice_number: payment.invoiceNumber,
    subtotal: payment.subtotal,
    vat: payment.vat,
    total: payment.total,
    // Don't specify paid_by unless it's a valid UUID
  } as any);

  if (error) {
    console.error('Error adding payment:', error.message, error.details, error.hint);
    throw error;
  }
}

// =====================================================
// COUNTERS (Receipt/Invoice Numbers)
// =====================================================

export async function getNextReceiptNumber(): Promise<string> {
  if (isInDemoMode || !supabase) {
    return localStorage.getNextReceiptNumber();
  }

  const { data, error } = await supabase.rpc('get_next_counter', { counter_id: 'receipt' });

  if (error) {
    console.error('Error getting receipt number:', error);
    return localStorage.getNextReceiptNumber();
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `REC-${year}${month}-${String(data).padStart(5, '0')}`;
}

export async function getNextInvoiceNumber(): Promise<string> {
  if (isInDemoMode || !supabase) {
    return localStorage.getNextInvoiceNumber();
  }

  const { data, error } = await supabase.rpc('get_next_counter', { counter_id: 'invoice' });

  if (error) {
    console.error('Error getting invoice number:', error);
    return localStorage.getNextInvoiceNumber();
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(data).padStart(5, '0')}`;
}

// =====================================================
// MAINTENANCE REPORTS API
// =====================================================

export async function getMaintenanceReports(): Promise<MaintenanceReport[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getMaintenanceReports();
  }

  const { data, error } = await supabase
    .from('maintenance_reports')
    .select('*')
    .order('reported_at', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance reports:', error);
    return localStorage.getMaintenanceReports();
  }

  return data.map(mapMaintenanceFromDB);
}

export async function addMaintenanceReport(report: MaintenanceReport): Promise<MaintenanceReport> {
  if (isInDemoMode || !supabase) {
    localStorage.addMaintenanceReport(report);
    return report;
  }

  const { data, error } = await supabase.from('maintenance_reports').insert({
    // id autogenerated
    room_id: report.roomId,
    reported_by: report.reportedBy || null,
    description: report.description,
    priority: report.priority,
    status: report.status,
    photos: report.photos || [],
  } as any).select().single();

  if (error) {
    console.error('Error adding maintenance report:', error);
    throw error;
  }
  
  // Return the actual data from DB, mapped to our type
  return mapMaintenanceFromDB(data);
}

export async function updateMaintenanceReport(
  reportId: string,
  updates: Partial<MaintenanceReport>
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.updateMaintenanceReport(reportId, updates);
    return;
  }

  const dbUpdates: any = {};
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.resolvedAt !== undefined) dbUpdates.resolved_at = updates.resolvedAt;
  if (updates.photos !== undefined) dbUpdates.photos = updates.photos;

  const { error } = await supabase
    .from('maintenance_reports')
    .update(dbUpdates)
    .eq('id', reportId);

  if (error) {
    console.error('Error updating maintenance report:', error);
    throw error;
  }
}

// =====================================================
// ATTENDANCE API
// =====================================================

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getAttendanceRecords();
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching attendance records:', error);
    return localStorage.getAttendanceRecords();
  }

  return data.map(mapAttendanceFromDB);
}

export async function addAttendanceRecord(record: AttendanceRecord): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.addAttendanceRecord(record);
    return;
  }

  const { error } = await supabase.from('attendance_records').insert({
    // id autogenerated
    user_id: record.userId,
    type: record.type,
    note: record.note || null,
    leave_reason: record.leaveReason || null,
    leave_date: record.leaveDate || null,
  });

  if (error) {
    console.error('Error adding attendance record:', error);
    throw error;
  }
}

export async function toggleUserAttendance(
  userId: string,
  type: 'check-in' | 'check-out'
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.toggleUserAttendance(userId, type);
    return;
  }

  const timestamp = new Date().toISOString();

  // Update user status
  await updateUser(userId, {
    status: type === 'check-in' ? 'on-duty' : 'off-duty',
    lastCheckIn: type === 'check-in' ? timestamp : undefined,
    lastCheckOut: type === 'check-out' ? timestamp : undefined,
    isOnline: type === 'check-in',
  });

  // Add attendance record
  await addAttendanceRecord({
    id: `ATT-${Date.now()}`,
    userId,
    type,
    timestamp,
  });
}

export async function recordLeave(
  userId: string,
  date: string,
  reason: string
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.recordLeave(userId, date, reason);
    return;
  }

  await addAttendanceRecord({
    id: `ATT-LEAVE-${Date.now()}`,
    userId,
    type: 'leave',
    timestamp: new Date().toISOString(),
    leaveDate: date,
    leaveReason: reason,
    note: reason,
  });
}

export async function toggleUserOnlineStatus(userId: string): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.toggleUserOnlineStatus(userId);
    return;
  }

  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    await updateUser(userId, { isOnline: !user.isOnline });
  }
}

// =====================================================
// INVENTORY API
// =====================================================

export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getInventoryItems();
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching inventory items:', error);
    return localStorage.getInventoryItems();
  }

  return data.map(mapInventoryItemFromDB);
}

export async function addInventoryItem(item: InventoryItem): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.addInventoryItem(item);
    return;
  }

  const { error } = await supabase.from('inventory_items').insert({
    // id autogenerated
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    min_level: item.minLevel,
  });

  if (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.updateInventoryItem(id, updates);
    return;
  }

  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
  if (updates.minLevel !== undefined) dbUpdates.min_level = updates.minLevel;

  const { error } = await supabase
    .from('inventory_items')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.deleteInventoryItem(id);
    return;
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  if (isInDemoMode || !supabase) {
    return localStorage.getInventoryTransactions();
  }

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory transactions:', error);
    return localStorage.getInventoryTransactions();
  }

  return data.map(mapInventoryTransactionFromDB);
}

export async function addInventoryTransaction(
  transaction: InventoryTransaction
): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.addInventoryTransaction(transaction);
    return;
  }

  // Insert transaction
  const { error: txError } = await supabase.from('inventory_transactions').insert({
    // id autogenerated
    item_id: transaction.itemId,
    item_name: transaction.itemName,
    date: transaction.date,
    type: transaction.type,
    quantity: transaction.quantity,
    price_per_unit: transaction.pricePerUnit,
    total_price: transaction.totalPrice,
    balance_after: transaction.balanceAfter,
    payer: transaction.payer,
    receiver: transaction.receiver,
    notes: transaction.notes || null,
    created_by: transaction.createdBy || null,
  });

  if (txError) {
    console.error('Error adding inventory transaction:', txError);
    throw txError;
  }

  // Update item quantity
  const items = await getInventoryItems();
  const item = items.find(i => i.id === transaction.itemId);
  if (item) {
    const newQuantity = transaction.type === 'in'
      ? item.quantity + transaction.quantity
      : item.quantity - transaction.quantity;
    await updateInventoryItem(transaction.itemId, { quantity: newQuantity });
  }
}

// =====================================================
// EXPORT CSV (Uses local computation with API data)
// =====================================================

export async function exportToCSV(): Promise<string> {
  const payments = await getPayments();
  const bookings = await getBookings();
  const rooms = await getRooms();

  let csv = 'Receipt Number,Invoice Number,Date,Guest Name,Room Numbers,Nights,Subtotal,VAT,Total,Payment Method\n';

  payments.forEach((payment) => {
    const booking = bookings.find((b) => b.id === payment.bookingId);
    if (booking) {
      const roomNumbers = booking.roomIds
        .map((id) => {
          const room = rooms.find((r) => r.id === id);
          return room?.number || '';
        })
        .join('+');

      csv += `${payment.receiptNumber},${payment.invoiceNumber},${payment.paidAt},${booking.guest.name},${roomNumbers},`;
      csv += `${payment.charges.filter((c) => c.type === 'room').length},${payment.subtotal.toFixed(2)},`;
      csv += `${payment.vat.toFixed(2)},${payment.total.toFixed(2)},${payment.method}\n`;
    }
  });

  return csv;
}

// =====================================================
// CLEAR ALL DATA (Use with caution!)
// =====================================================

export async function clearAllData(): Promise<void> {
  if (isInDemoMode || !supabase) {
    localStorage.clearAllData();
    return;
  }

  // Clear in order to respect foreign key constraints
  await supabase.from('inventory_transactions').delete().neq('id', '');
  await supabase.from('inventory_items').delete().neq('id', '');
  await supabase.from('attendance_records').delete().neq('id', '');
  await supabase.from('maintenance_reports').delete().neq('id', '');
  await supabase.from('charges').delete().neq('id', '');
  await supabase.from('payments').delete().neq('id', '');
  await supabase.from('booking_rooms').delete().neq('id', '');
  await supabase.from('bookings').delete().neq('id', '');
  // Don't delete rooms and users - they are seed data
}
