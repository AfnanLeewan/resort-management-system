/**
 * Custom React hooks for Supabase data fetching
 * Provides easy-to-use async state management for all data types
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';
import {
  Room,
  Booking,
  Payment,
  MaintenanceReport,
  User,
  InventoryItem,
  InventoryTransaction,
  AttendanceRecord,
} from '../types';

// Generic hook for async data fetching
function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// =====================================================
// USERS HOOK
// =====================================================

export function useUsers() {
  const { data, loading, error, refetch } = useAsyncData<User[]>(
    () => api.getUsers(),
    []
  );

  return {
    users: data || [],
    loading,
    error,
    refetch,
    addUser: async (user: User) => {
      await api.addUser(user);
      await refetch();
    },
    updateUser: async (id: string, updates: Partial<User>) => {
      await api.updateUser(id, updates);
      await refetch();
    },
    deleteUser: async (id: string) => {
      await api.deleteUser(id);
      await refetch();
    },
  };
}

// =====================================================
// ROOMS HOOK
// =====================================================

export function useRooms() {
  const { data, loading, error, refetch } = useAsyncData<Room[]>(
    () => api.getRooms(),
    []
  );

  return {
    rooms: data || [],
    loading,
    error,
    refetch,
    updateRoomStatus: async (
      roomId: string,
      status: Room['status'],
      bookingId?: string
    ) => {
      await api.updateRoomStatus(roomId, status, bookingId);
      await refetch();
    },
  };
}

// =====================================================
// BOOKINGS HOOK
// =====================================================

export function useBookings() {
  const { data, loading, error, refetch } = useAsyncData<Booking[]>(
    () => api.getBookings(),
    []
  );

  return {
    bookings: data || [],
    loading,
    error,
    refetch,
    addBooking: async (booking: Booking) => {
      await api.addBooking(booking);
      await refetch();
    },
    updateBooking: async (bookingId: string, updates: Partial<Booking>) => {
      await api.updateBooking(bookingId, updates);
      await refetch();
    },
  };
}

// =====================================================
// PAYMENTS HOOK
// =====================================================

export function usePayments() {
  const { data, loading, error, refetch } = useAsyncData<Payment[]>(
    () => api.getPayments(),
    []
  );

  return {
    payments: data || [],
    loading,
    error,
    refetch,
    addPayment: async (payment: Payment) => {
      await api.addPayment(payment);
      await refetch();
    },
  };
}

// =====================================================
// MAINTENANCE HOOK
// =====================================================

export function useMaintenanceReports() {
  const { data, loading, error, refetch } = useAsyncData<MaintenanceReport[]>(
    () => api.getMaintenanceReports(),
    []
  );

  return {
    reports: data || [],
    loading,
    error,
    refetch,
    addReport: async (report: MaintenanceReport) => {
      await api.addMaintenanceReport(report);
      await refetch();
    },
    updateReport: async (
      reportId: string,
      updates: Partial<MaintenanceReport>
    ) => {
      await api.updateMaintenanceReport(reportId, updates);
      await refetch();
    },
  };
}

// =====================================================
// ATTENDANCE HOOK
// =====================================================

export function useAttendance() {
  const { data, loading, error, refetch } = useAsyncData<AttendanceRecord[]>(
    () => api.getAttendanceRecords(),
    []
  );

  return {
    records: data || [],
    loading,
    error,
    refetch,
    toggleAttendance: async (
      userId: string,
      type: 'check-in' | 'check-out'
    ) => {
      await api.toggleUserAttendance(userId, type);
      await refetch();
    },
    recordLeave: async (userId: string, date: string, reason: string) => {
      await api.recordLeave(userId, date, reason);
      await refetch();
    },
  };
}

// =====================================================
// INVENTORY HOOK
// =====================================================

export function useInventory() {
  const itemsResult = useAsyncData<InventoryItem[]>(
    () => api.getInventoryItems(),
    []
  );
  const transactionsResult = useAsyncData<InventoryTransaction[]>(
    () => api.getInventoryTransactions(),
    []
  );

  const refetchAll = async () => {
    await Promise.all([itemsResult.refetch(), transactionsResult.refetch()]);
  };

  return {
    items: itemsResult.data || [],
    transactions: transactionsResult.data || [],
    loading: itemsResult.loading || transactionsResult.loading,
    error: itemsResult.error || transactionsResult.error,
    refetch: refetchAll,
    addItem: async (item: InventoryItem) => {
      await api.addInventoryItem(item);
      await refetchAll();
    },
    updateItem: async (id: string, updates: Partial<InventoryItem>) => {
      await api.updateInventoryItem(id, updates);
      await refetchAll();
    },
    deleteItem: async (id: string) => {
      await api.deleteInventoryItem(id);
      await refetchAll();
    },
    addTransaction: async (transaction: InventoryTransaction) => {
      await api.addInventoryTransaction(transaction);
      await refetchAll();
    },
  };
}

// =====================================================
// COMBINED DATA HOOK (for Dashboard)
// =====================================================

export function useDashboardData() {
  const rooms = useRooms();
  const bookings = useBookings();
  const payments = usePayments();
  const maintenance = useMaintenanceReports();

  const loading = rooms.loading || bookings.loading || payments.loading || maintenance.loading;
  const error = rooms.error || bookings.error || payments.error || maintenance.error;

  const refetchAll = async () => {
    await Promise.all([
      rooms.refetch(),
      bookings.refetch(),
      payments.refetch(),
      maintenance.refetch(),
    ]);
  };

  return {
    rooms: rooms.rooms,
    bookings: bookings.bookings,
    payments: payments.payments,
    maintenanceReports: maintenance.reports,
    loading,
    error,
    refetch: refetchAll,
  };
}

// =====================================================
// COUNTER HOOKS
// =====================================================

export function useReceiptNumber() {
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  const generate = useCallback(async () => {
    const num = await api.getNextReceiptNumber();
    setReceiptNumber(num);
    return num;
  }, []);

  return { receiptNumber, generate };
}

export function useInvoiceNumber() {
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  const generate = useCallback(async () => {
    const num = await api.getNextInvoiceNumber();
    setInvoiceNumber(num);
    return num;
  }, []);

  return { invoiceNumber, generate };
}
