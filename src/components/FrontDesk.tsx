import { useState, useMemo } from 'react';
import { Booking, Room, User } from '../types';
import { getRooms, getBookings, addBooking, updateBooking, updateRoomStatus } from '../utils/storage';
import { getTodayDateString, formatDate, formatDateTime } from '../utils/dateHelpers';
import { PRICING } from '../utils/pricing';
import { Plus, Search, Calendar, Users, Phone, CreditCard } from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';

interface FrontDeskProps {
  currentUser: User;
}

export function FrontDesk({ currentUser }: FrontDeskProps) {
  const [view, setView] = useState<'list' | 'new-booking'>('list');
  const [bookings, setBookings] = useState<Booking[]>(getBookings());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    idNumber: '',
    phone: '',
    checkInDate: getTodayDateString(),
    checkOutDate: '',
    roomType: 'single' as 'single' | 'double',
    roomCount: 1,
    pricingTier: 'general' as 'general' | 'tour' | 'vip',
    source: 'walk-in' as 'walk-in' | 'phone' | 'ota',
    groupName: '',
    notes: '',
  });

  const rooms = getRooms();
  const availableRooms = rooms.filter(r => r.status === 'available');

  const filteredBookings = useMemo(() => {
    if (!searchTerm) return bookings;
    const term = searchTerm.toLowerCase();
    return bookings.filter(b => 
      b.guest.name.toLowerCase().includes(term) ||
      b.guest.phone.includes(term) ||
      b.guest.idNumber.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  const todayBookings = useMemo(() => {
    const today = getTodayDateString();
    return filteredBookings.filter(b => 
      b.checkInDate === today || b.checkOutDate === today
    );
  }, [filteredBookings]);

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.idNumber || !newBooking.phone || !newBooking.checkOutDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน / Please fill all required fields');
      return;
    }

    // Find available rooms of the requested type
    const availableRoomsOfType = availableRooms.filter(r => r.type === newBooking.roomType);
    
    if (availableRoomsOfType.length < newBooking.roomCount) {
      alert(`ห้องว่างไม่เพียงพอ / Not enough available rooms. Available: ${availableRoomsOfType.length}`);
      return;
    }

    // Select rooms
    const selectedRooms = availableRoomsOfType.slice(0, newBooking.roomCount);
    const roomIds = selectedRooms.map(r => r.id);

    // Create booking
    const booking: Booking = {
      id: `BK${Date.now()}`,
      roomIds,
      guest: {
        name: newBooking.guestName,
        idNumber: newBooking.idNumber,
        phone: newBooking.phone,
      },
      checkInDate: newBooking.checkInDate,
      checkOutDate: newBooking.checkOutDate,
      pricingTier: newBooking.pricingTier,
      baseRate: PRICING[newBooking.pricingTier],
      source: newBooking.source,
      status: 'reserved',
      groupName: newBooking.groupName || undefined,
      notes: newBooking.notes || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    addBooking(booking);
    
    // Update room status to reserved (we'll keep them available until check-in)
    // This is intentional - rooms are only marked occupied on actual check-in
    
    // Refresh bookings
    setBookings(getBookings());
    
    // Reset form
    setNewBooking({
      guestName: '',
      idNumber: '',
      phone: '',
      checkInDate: getTodayDateString(),
      checkOutDate: '',
      roomType: 'single',
      roomCount: 1,
      pricingTier: 'general',
      source: 'walk-in',
      groupName: '',
      notes: '',
    });
    
    setView('list');
    alert('✅ สร้างการจองสำเร็จ / Booking created successfully!');
  };

  const handleCheckIn = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckIn(true);
  };

  const handleCheckOut = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCheckOut(true);
  };

  const handleCheckInComplete = () => {
    setShowCheckIn(false);
    setSelectedBooking(null);
    setBookings(getBookings());
  };

  const handleCheckOutComplete = () => {
    setShowCheckOut(false);
    setSelectedBooking(null);
    setBookings(getBookings());
  };

  const getStatusBadge = (status: Booking['status']) => {
    const styles = {
      'reserved': 'bg-blue-100 text-blue-800 border-blue-300',
      'checked-in': 'bg-green-100 text-green-800 border-green-300',
      'checked-out': 'bg-gray-100 text-gray-800 border-gray-300',
      'cancelled': 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      'reserved': 'จอง',
      'checked-in': 'เช็คอิน',
      'checked-out': 'เช็คเอาท์',
      'cancelled': 'ยกเลิก',
    };
    return (
      <span className={`px-4 py-2 rounded-lg border-2 ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (view === 'new-booking') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-black mb-2">สร้างการจองใหม่ / New Booking</h2>
            <p className="text-gray-600">กรอกข้อมูลผู้เข้าพักและห้องพัก</p>
          </div>
          <button
            onClick={() => setView('list')}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
          >
            ← ย้อนกลับ / Back
          </button>
        </div>

        <div className="bg-white rounded-lg p-8 border border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Guest Information */}
            <div className="space-y-5">
              <h3 className="text-neutral-900 pb-3 border-b border-neutral-200">
                ข้อมูลผู้เข้าพัก / Guest Information
              </h3>
              
              <div>
                <label className="block text-neutral-700 mb-2">ชื่อ-นามสกุล / Full Name *</label>
                <input
                  type="text"
                  value={newBooking.guestName}
                  onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                  placeholder="ใส่ชื่อ-นามสกุล"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">เลขบัตรประชาชน/Passport *</label>
                <input
                  type="text"
                  value={newBooking.idNumber}
                  onChange={(e) => setNewBooking({ ...newBooking, idNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                  placeholder="เลขบัตร 13 หลัก หรือ Passport"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">เบอร์โทรศัพท์ / Phone *</label>
                <input
                  type="tel"
                  value={newBooking.phone}
                  onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                  placeholder="08x-xxx-xxxx"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">ช่องทางการจอง / Booking Source</label>
                <select
                  value={newBooking.source}
                  onChange={(e) => setNewBooking({ ...newBooking, source: e.target.value as any })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                >
                  <option value="walk-in">Walk-in (เดินเข้า)</option>
                  <option value="phone">Phone (โทรศัพท์)</option>
                  <option value="ota">OTA (Agoda/Booking)</option>
                </select>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-5">
              <h3 className="text-neutral-900 pb-3 border-b border-neutral-200">
                รายละเอียดการจอง / Booking Details
              </h3>

              <div>
                <label className="block text-neutral-700 mb-2">วันเช็คอิน / Check-in Date *</label>
                <input
                  type="date"
                  value={newBooking.checkInDate}
                  onChange={(e) => setNewBooking({ ...newBooking, checkInDate: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">วันเช็คเอาท์ / Check-out Date *</label>
                <input
                  type="date"
                  value={newBooking.checkOutDate}
                  onChange={(e) => setNewBooking({ ...newBooking, checkOutDate: e.target.value })}
                  min={newBooking.checkInDate}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">ประเภทห้อง / Room Type</label>
                <select
                  value={newBooking.roomType}
                  onChange={(e) => setNewBooking({ ...newBooking, roomType: e.target.value as any })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                >
                  <option value="single">เตียงเดี่ยว / Single Bed</option>
                  <option value="double">เตียงคู่ / Double Bed</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">จำนวนห้อง / Number of Rooms</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newBooking.roomCount}
                  onChange={(e) => setNewBooking({ ...newBooking, roomCount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                />
                <p className="text-sm text-neutral-500 mt-1">
                  ห้องว่าง: {availableRooms.filter(r => r.type === newBooking.roomType).length} ห้อง
                </p>
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">ประเภทลูกค้า / Pricing Tier</label>
                <select
                  value={newBooking.pricingTier}
                  onChange={(e) => setNewBooking({ ...newBooking, pricingTier: e.target.value as any })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                >
                  <option value="general">ทั่วไป ฿890 / General Customer</option>
                  <option value="tour">ทัวร์/แนะนำ ฿840 / Tour/Referral</option>
                  <option value="vip">ผู้ถือหุ้น/VIP ฿400 / Shareholder/VIP</option>
                </select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="md:col-span-2 space-y-5">
              <h3 className="text-neutral-900 pb-3 border-b border-neutral-200">
                ข้อมูลเพิ่มเติม (ถ้ามี) / Additional Information
              </h3>

              <div>
                <label className="block text-neutral-700 mb-2">ชื่อกรุ๊ปทัวร์ / Group Name (สำหรับทัวร์)</label>
                <input
                  type="text"
                  value={newBooking.groupName}
                  onChange={(e) => setNewBooking({ ...newBooking, groupName: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                  placeholder="ชื่อบริษัททัวร์หรือกรุ๊ป"
                />
              </div>

              <div>
                <label className="block text-neutral-700 mb-2">หมายเหตุ / Notes</label>
                <textarea
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={handleCreateBooking}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-lg transition-colors"
            >
              ✅ สร้างการจอง / Create Booking
            </button>
            <button
              onClick={() => setView('list')}
              className="px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-300 transition-colors"
            >
              ยกเลิก / Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900 mb-2">Front Desk / เคาน์เตอร์</h2>
          <p className="text-neutral-600">จัดการการจองและเช็คอิน-เช็คเอาท์</p>
        </div>
        <button
          onClick={() => setView('new-booking')}
          className="flex items-center gap-2 px-6 py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>สร้างการจองใหม่</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, เลขบัตร, หรือเลขการจอง"
            className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Today's Activities */}
      {todayBookings.length > 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
          <h3 className="text-neutral-900 mb-4">📅 กิจกรรมวันนี้ / Today's Activities</h3>
          <div className="space-y-3">
            {todayBookings.map(booking => {
              const isCheckIn = booking.checkInDate === getTodayDateString();
              const isCheckOut = booking.checkOutDate === getTodayDateString();
              return (
                <div key={booking.id} className="bg-white rounded-xl p-4 border-2 border-yellow-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-yellow-900">{booking.guest.name}</span>
                      <span className="text-yellow-700 ml-3">
                        {isCheckIn && '→ เช็คอิน'}
                        {isCheckOut && '← เช็คเอาท์'}
                      </span>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-left text-neutral-700">เลขจอง</th>
                <th className="px-6 py-4 text-left text-neutral-700">ผู้เข้าพัก</th>
                <th className="px-6 py-4 text-left text-neutral-700">เบอร์โทร</th>
                <th className="px-6 py-4 text-left text-neutral-700">วันที่เข้า-ออก</th>
                <th className="px-6 py-4 text-left text-neutral-700">ห้อง</th>
                <th className="px-6 py-4 text-left text-neutral-700">สถานะ</th>
                <th className="px-6 py-4 text-left text-neutral-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredBookings.map(booking => {
                const bookingRooms = rooms.filter(r => booking.roomIds.includes(r.id));
                const roomNumbers = bookingRooms.map(r => r.number).join(', ');
                
                return (
                  <tr key={booking.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-neutral-900">{booking.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-neutral-900">{booking.guest.name}</div>
                      {booking.groupName && (
                        <div className="text-sm text-neutral-500">กรุ๊ป: {booking.groupName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{booking.guest.phone}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      <div>{formatDate(booking.checkInDate)}</div>
                      <div className="text-sm text-neutral-500">→ {formatDate(booking.checkOutDate)}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{roomNumbers}</td>
                    <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {booking.status === 'reserved' && (
                          <button
                            onClick={() => handleCheckIn(booking)}
                            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm"
                          >
                            เช็คอิน
                          </button>
                        )}
                        {booking.status === 'checked-in' && (
                          <button
                            onClick={() => handleCheckOut(booking)}
                            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm"
                          >
                            เช็คเอาท์
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredBookings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              ไม่พบการจอง / No bookings found
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCheckIn && selectedBooking && (
        <CheckInModal
          booking={selectedBooking}
          onClose={() => {
            setShowCheckIn(false);
            setSelectedBooking(null);
          }}
          onComplete={handleCheckInComplete}
          currentUser={currentUser}
        />
      )}

      {showCheckOut && selectedBooking && (
        <CheckOutModal
          booking={selectedBooking}
          onClose={() => {
            setShowCheckOut(false);
            setSelectedBooking(null);
          }}
          onComplete={handleCheckOutComplete}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}