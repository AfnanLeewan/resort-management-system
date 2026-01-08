import {
  Room,
  Booking,
  Payment,
  MaintenanceReport,
  User,
  RoomType,
  InventoryItem,
  InventoryTransaction,
  AttendanceRecord
} from "../types";

const STORAGE_KEYS = {
  ROOMS: "rrms_rooms",
  BOOKINGS: "rrms_bookings",
  PAYMENTS: "rrms_payments",
  MAINTENANCE: "rrms_maintenance",
  USERS: "rrms_users",
  CURRENT_USER: "rrms_current_user",
  ATTENDANCE: "rrms_attendance",
  RECEIPT_COUNTER: "rrms_receipt_counter",
  INVOICE_COUNTER: "rrms_invoice_counter",
  INVENTORY_ITEMS: "rrms_inventory_items",
  INVENTORY_TRANSACTIONS: "rrms_inventory_transactions",
};

// Initialize rooms (20 single, 10 double)
export function initializeRooms(): Room[] {
  const rooms: Room[] = [];

  // Single bed rooms (1-20)
  for (let i = 1; i <= 20; i++) {
    rooms.push({
      id: `room-${i}`,
      number: i,
      type: "single",
      status: "available",
    });
  }

  // Double bed rooms (21-30)
  for (let i = 21; i <= 30; i++) {
    rooms.push({
      id: `room-${i}`,
      number: i,
      type: "double",
      status: "available",
    });
  }

  return rooms;
}

// Initialize default users
export function initializeUsers(): User[] {
  return [
    {
      id: "user-1",
      username: "frontdesk",
      name: "Front Desk",
      role: "front-desk",
      phone: "081-234-5678",
      photoUrl: "figma:asset/bdc67e81075d656093375b06f582f3c7e7c85848.png",
      status: 'on-duty',
      isOnline: true,
      shifts: [{ day: 'Mon', start: '08:00', end: '17:00' }, { day: 'Tue', start: '08:00', end: '17:00' }, { day: 'Wed', start: '08:00', end: '17:00' }, { day: 'Thu', start: '08:00', end: '17:00' }, { day: 'Fri', start: '08:00', end: '17:00' }]
    },
    {
      id: "user-2",
      username: "housekeeping",
      name: "Housekeeping",
      role: "housekeeping",
      phone: "081-234-5679",
      photoUrl: "figma:asset/d8d21c028238122393306637841c2d0f5e135b80.png",
      status: 'off-duty',
      isOnline: false,
      shifts: [{ day: 'Wed', start: '09:00', end: '18:00' }, { day: 'Thu', start: '09:00', end: '18:00' }, { day: 'Fri', start: '09:00', end: '18:00' }, { day: 'Sat', start: '09:00', end: '18:00' }, { day: 'Sun', start: '09:00', end: '18:00' }]
    },
    {
      id: "user-3",
      username: "manager",
      name: "Manager",
      role: "management",
      phone: "081-234-5680",
      photoUrl: "figma:asset/547f385c742353a8105658e8071e687103288a78.png",
      status: 'on-duty',
      isOnline: true,
    },
    {
      id: "user-4",
      username: "board",
      name: "Board Director",
      role: "board",
      phone: "081-234-5681",
      status: 'off-duty',
      isOnline: false,
    },
  ];
}

// Generic storage helpers
export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
}

export function loadFromStorage<T>(
  key: string,
  defaultValue: T,
): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Error loading from storage:", error);
    return defaultValue;
  }
}

// Room operations
export function getRooms(): Room[] {
  let rooms = loadFromStorage<Room[]>(STORAGE_KEYS.ROOMS, []);
  if (rooms.length === 0) {
    rooms = initializeRooms();
    saveToStorage(STORAGE_KEYS.ROOMS, rooms);
  }
  return rooms;
}

export function saveRooms(rooms: Room[]): void {
  saveToStorage(STORAGE_KEYS.ROOMS, rooms);
}

export function updateRoomStatus(
  roomId: string,
  status: Room["status"],
  bookingId?: string,
): void {
  const rooms = getRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (room) {
    room.status = status;
    room.currentBookingId = bookingId;
    saveRooms(rooms);
  }
}

// Booking operations
export function getBookings(): Booking[] {
  return loadFromStorage<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
}

export function saveBookings(bookings: Booking[]): void {
  saveToStorage(STORAGE_KEYS.BOOKINGS, bookings);
}

export function addBooking(booking: Booking): void {
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);
}

export function updateBooking(
  bookingId: string,
  updates: Partial<Booking>,
): void {
  const bookings = getBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index !== -1) {
    bookings[index] = { ...bookings[index], ...updates };
    saveBookings(bookings);
  }
}

// Payment operations
export function getPayments(): Payment[] {
  return loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
}

export function savePayments(payments: Payment[]): void {
  saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
}

export function addPayment(payment: Payment): void {
  const payments = getPayments();
  payments.push(payment);
  savePayments(payments);
}

// Maintenance operations
export function getMaintenanceReports(): MaintenanceReport[] {
  return loadFromStorage<MaintenanceReport[]>(
    STORAGE_KEYS.MAINTENANCE,
    [],
  );
}

export function saveMaintenanceReports(
  reports: MaintenanceReport[],
): void {
  saveToStorage(STORAGE_KEYS.MAINTENANCE, reports);
}

export function addMaintenanceReport(
  report: MaintenanceReport,
): void {
  const reports = getMaintenanceReports();
  reports.push(report);
  saveMaintenanceReports(reports);
}

export function updateMaintenanceReport(
  reportId: string,
  updates: Partial<MaintenanceReport>,
): void {
  const reports = getMaintenanceReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    reports[index] = { ...reports[index], ...updates };
    saveMaintenanceReports(reports);
  }
}

// User operations
export function getUsers(): User[] {
  let users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    users = initializeUsers();
    saveToStorage(STORAGE_KEYS.USERS, users);
  }
  return users;
}

export function saveUsers(users: User[]): void {
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function addUser(user: User): void {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function updateUser(id: string, updates: Partial<User>): void {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
  }
}

export function deleteUser(id: string): void {
  const users = getUsers();
  const newUsers = users.filter(u => u.id !== id);
  saveUsers(newUsers);
}

export function getCurrentUser(): User | null {
  return loadFromStorage<User | null>(
    STORAGE_KEYS.CURRENT_USER,
    null,
  );
}

export function setCurrentUser(user: User | null): void {
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

// Attendance operations
export function getAttendanceRecords(): AttendanceRecord[] {
  return loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  saveToStorage(STORAGE_KEYS.ATTENDANCE, records);
}

export function addAttendanceRecord(record: AttendanceRecord): void {
  const records = getAttendanceRecords();
  records.push(record);
  saveAttendanceRecords(records);
}

// Helper to clock in/out a user
export function toggleUserAttendance(userId: string, type: 'check-in' | 'check-out'): void {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  
  if (user) {
    const timestamp = new Date().toISOString();
    
    // Update user status
    user.status = type === 'check-in' ? 'on-duty' : 'off-duty';
    if (type === 'check-in') {
      user.lastCheckIn = timestamp;
      user.isOnline = true; // Auto set online when checking in
    } else {
      user.lastCheckOut = timestamp;
      user.isOnline = false; // Auto set offline when checking out (optional, but makes sense)
    }
    
    saveUsers(users);

    // Add record
    addAttendanceRecord({
      id: `ATT-${Date.now()}`,
      userId,
      type,
      timestamp,
    });
  }
}

export function recordLeave(userId: string, date: string, reason: string): void {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
        // We might want to update status if the leave is TODAY, but for now just record it
        // user.status = 'on-leave'; 
        // saveUsers(users);

        addAttendanceRecord({
            id: `ATT-LEAVE-${Date.now()}`,
            userId,
            type: 'leave',
            timestamp: new Date().toISOString(), // Record creation time
            leaveDate: date, // The actual leave date
            leaveReason: reason,
            note: reason
        });
    }
}

export function toggleUserOnlineStatus(userId: string): void {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.isOnline = !user.isOnline;
    saveUsers(users);
  }
}

// Receipt and Invoice counters
export function getNextReceiptNumber(): string {
  const counter =
    loadFromStorage<number>(STORAGE_KEYS.RECEIPT_COUNTER, 0) +
    1;
  saveToStorage(STORAGE_KEYS.RECEIPT_COUNTER, counter);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `REC-${year}${month}-${String(counter).padStart(5, "0")}`;
}

export function getNextInvoiceNumber(): string {
  const counter =
    loadFromStorage<number>(STORAGE_KEYS.INVOICE_COUNTER, 0) +
    1;
  saveToStorage(STORAGE_KEYS.INVOICE_COUNTER, counter);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `INV-${year}${month}-${String(counter).padStart(5, "0")}`;
}

// Export data for tax reporting
export function exportToCSV(): string {
  const payments = getPayments();
  const bookings = getBookings();

  let csv =
    "Receipt Number,Invoice Number,Date,Guest Name,Room Numbers,Nights,Subtotal,VAT,Total,Payment Method\n";

  payments.forEach((payment) => {
    const booking = bookings.find(
      (b) => b.id === payment.bookingId,
    );
    if (booking) {
      const rooms = getRooms();
      const roomNumbers = booking.roomIds
        .map((id) => {
          const room = rooms.find((r) => r.id === id);
          return room?.number || "";
        })
        .join("+");

      csv += `${payment.receiptNumber},${payment.invoiceNumber},${payment.paidAt},${booking.guest.name},${roomNumbers},`;
      csv += `${payment.charges.filter((c) => c.type === "room").length},${payment.subtotal.toFixed(2)},`;
      csv += `${payment.vat.toFixed(2)},${payment.total.toFixed(2)},${payment.method}\n`;
    }
  });

  return csv;
}

// Inventory operations
export function getInventoryItems(): InventoryItem[] {
  return loadFromStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS, []);
}

export function saveInventoryItems(items: InventoryItem[]): void {
  saveToStorage(STORAGE_KEYS.INVENTORY_ITEMS, items);
}

export function addInventoryItem(item: InventoryItem): void {
  const items = getInventoryItems();
  items.push(item);
  saveInventoryItems(items);
}

export function updateInventoryItem(id: string, updates: Partial<InventoryItem>): void {
  const items = getInventoryItems();
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveInventoryItems(items);
  }
}

export function deleteInventoryItem(id: string): void {
  const items = getInventoryItems();
  const newItems = items.filter(i => i.id !== id);
  saveInventoryItems(newItems);
}

export function getInventoryTransactions(): InventoryTransaction[] {
  return loadFromStorage<InventoryTransaction[]>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, []);
}

export function saveInventoryTransactions(transactions: InventoryTransaction[]): void {
  saveToStorage(STORAGE_KEYS.INVENTORY_TRANSACTIONS, transactions);
}

export function addInventoryTransaction(transaction: InventoryTransaction): void {
  const transactions = getInventoryTransactions();
  transactions.push(transaction);
  saveInventoryTransactions(transactions);

  // Automatically update item quantity
  const items = getInventoryItems();
  const itemIndex = items.findIndex(i => i.id === transaction.itemId);
  if (itemIndex !== -1) {
    const item = items[itemIndex];
    if (transaction.type === 'in') {
      item.quantity += transaction.quantity;
    } else {
      item.quantity -= transaction.quantity;
    }
    saveInventoryItems(items);
  }
}

// Clear all data (for testing)
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}