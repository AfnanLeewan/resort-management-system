import { Booking, MaintenanceReport } from '../types';
import { addBooking, addMaintenanceReport } from './storage';

// This function can be called to add demo data for testing
export function seedDemoData() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Demo booking 1 - Checked in
  const booking1: Booking = {
    id: 'BK001',
    roomIds: ['room-1'],
    guest: {
      name: 'สมชาย ใจดี',
      idNumber: '1234567890123',
      phone: '081-234-5678',
    },
    checkInDate: todayStr,
    checkOutDate: tomorrowStr,
    actualCheckInTime: new Date().toISOString(),
    pricingTier: 'general',
    baseRate: 890,
    source: 'walk-in',
    status: 'checked-in',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
  };

  // Demo booking 2 - Reserved for tomorrow
  const booking2: Booking = {
    id: 'BK002',
    roomIds: ['room-5', 'room-6'],
    guest: {
      name: 'Tour Company ABC',
      idNumber: 'TOUR123456',
      phone: '082-345-6789',
    },
    checkInDate: tomorrowStr,
    checkOutDate: nextWeekStr,
    pricingTier: 'tour',
    baseRate: 840,
    source: 'phone',
    status: 'reserved',
    groupName: 'ABC Tour Group',
    notes: 'กรุ๊ปทัวร์ 2 ห้อง',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
  };

  // Demo maintenance report
  const report1: MaintenanceReport = {
    id: 'MR001',
    roomId: 'room-10',
    reportedBy: 'user-2',
    description: 'แอร์ไม่เย็น ต้องเรียกช่างตรวจสอบ',
    priority: 'high',
    status: 'pending',
    reportedAt: new Date().toISOString(),
  };

  try {
    addBooking(booking1);
    addBooking(booking2);
    addMaintenanceReport(report1);
    console.log('✅ Demo data seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
}

// Export a function to check if demo data already exists
export function hasDemoData(): boolean {
  const bookings = JSON.parse(localStorage.getItem('rrms_bookings') || '[]');
  return bookings.length > 0;
}
