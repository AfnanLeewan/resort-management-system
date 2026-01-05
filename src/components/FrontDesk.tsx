import { useState, useMemo } from 'react';
import { Booking, Room, User } from '../types';
import { getRooms, getBookings, addBooking, updateBooking, updateRoomStatus } from '../utils/storage';
import { getTodayDateString, formatDate, formatDateTime, formatCurrency } from '../utils/dateHelpers';
import { PRICING, extractBasePrice, extractVAT } from '../utils/pricing';
import { Plus, Search, Calendar as CalendarIcon, Users, Phone, CreditCard, ArrowLeft, User as UserIcon, CalendarDays, BedDouble, Info, CheckCircle2, Clock, Check, FileText } from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { BookingDetailsModal } from './BookingDetailsModal';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from './ui/utils';

interface FrontDeskProps {
  currentUser: User;
}

export function FrontDesk({ currentUser }: FrontDeskProps) {
  const [view, setView] = useState<'list' | 'new-booking'>('list');
  const [bookings, setBookings] = useState<Booking[]>(getBookings());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Modal States
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    idNumber: '',
    phone: '',
    checkInDate: getTodayDateString(),
    checkOutDate: '',
    roomType: 'single' as 'single' | 'double',
    selectedRoomIds: [] as string[],
    pricingTier: 'general' as 'general' | 'tour' | 'vip',
    source: 'walk-in' as 'walk-in' | 'phone' | 'ota',
    groupName: '',
    notes: '',
  });

  const rooms = getRooms();
  const availableRooms = rooms.filter(r => r.status === 'available');

  // Logic for sorting and labeling rooms (Same as RoomGrid)
  const labeledRooms = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => a.number - b.number);
    const rc = sorted.slice(0, 10).map((r, i) => ({ ...r, label: `RC${String(i + 1).padStart(2, '0')}`, displayType: 'single' }));
    const rb = sorted.slice(10, 20).map((r, i) => ({ ...r, label: `RB${String(i + 1).padStart(2, '0')}`, displayType: 'single' }));
    const ra = sorted.slice(20, 30).map((r, i) => ({ ...r, label: `RA${String(i + 1).padStart(2, '0')}`, displayType: 'double' }));
    
    return [...rc, ...rb, ...ra];
  }, [rooms]);

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

    if (newBooking.selectedRoomIds.length === 0) {
        alert('กรุณาเลือกห้องพักอย่างน้อย 1 ห้อง / Please select at least 1 room');
        return;
    }

    const booking: Booking = {
      id: `BK${Date.now()}`,
      roomIds: newBooking.selectedRoomIds,
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
    setBookings(getBookings());
    
    setNewBooking({
      guestName: '',
      idNumber: '',
      phone: '',
      checkInDate: getTodayDateString(),
      checkOutDate: '',
      roomType: 'single',
      selectedRoomIds: [],
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

  const handleShowDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
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

  const toggleRoomSelection = (roomId: string) => {
    setNewBooking(prev => {
        const isSelected = prev.selectedRoomIds.includes(roomId);
        if (isSelected) {
            return { ...prev, selectedRoomIds: prev.selectedRoomIds.filter(id => id !== roomId) };
        } else {
            return { ...prev, selectedRoomIds: [...prev.selectedRoomIds, roomId] };
        }
    });
  };

  const getStatusBadge = (status: Booking['status']) => {
    const styles = {
      'reserved': 'bg-blue-50 text-blue-700 border-blue-200',
      'checked-in': 'bg-green-50 text-green-700 border-green-200',
      'checked-out': 'bg-slate-100 text-slate-600 border-slate-200',
      'cancelled': 'bg-red-50 text-red-700 border-red-200',
    };
    const labels = {
      'reserved': 'จองล่วงหน้า',
      'checked-in': 'เข้าพักอยู่',
      'checked-out': 'เช็คเอาท์แล้ว',
      'cancelled': 'ยกเลิก',
    };
    return (
      <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredAvailableLabeledRooms = labeledRooms.filter(r => r.status === 'available' && r.type === newBooking.roomType);

  if (view === 'new-booking') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">สร้างการจองใหม่</h2>
            <p className="text-slate-500">กรอกข้อมูลผู้เข้าพักและห้องพักเพื่อทำการจอง</p>
          </div>
          <button
            onClick={() => setView('list')}
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-colors flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            ย้อนกลับ
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Guest Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                 <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <UserIcon className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">ข้อมูลผู้เข้าพัก</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                    <label className="block text-slate-700 font-bold mb-2">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <input
                    type="text"
                    value={newBooking.guestName}
                    onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                    placeholder="เช่น สมชาย ใจดี"
                    />
                </div>

                <div>
                    <label className="block text-slate-700 font-bold mb-2">เลขบัตรประชาชน/Passport <span className="text-red-500">*</span></label>
                    <input
                    type="text"
                    value={newBooking.idNumber}
                    onChange={(e) => setNewBooking({ ...newBooking, idNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                    placeholder="เลขบัตร 13 หลัก"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                        <input
                        type="tel"
                        value={newBooking.phone}
                        onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                        placeholder="08x-xxx-xxxx"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">ช่องทางการจอง</label>
                        <select
                        value={newBooking.source}
                        onChange={(e) => setNewBooking({ ...newBooking, source: e.target.value as any })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                        >
                        <option value="walk-in">Walk-in (หน้าร้าน)</option>
                        <option value="phone">Phone (โทรศัพท์)</option>
                        <option value="ota">OTA (Agoda/Booking)</option>
                        </select>
                    </div>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <CalendarDays className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">รายละเอียดห้องพัก</h3>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">วันเช็คอิน <span className="text-red-500">*</span></label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(
                                "w-full px-4 py-3 border border-slate-200 rounded-xl outline-none transition-all bg-slate-50 text-left flex items-center gap-2",
                                !newBooking.checkInDate && "text-slate-400"
                            )}>
                                <CalendarIcon className="w-4 h-4 text-slate-500" />
                                {newBooking.checkInDate ? format(new Date(newBooking.checkInDate), "PPP", { locale: th }) : "เลือกวันที่"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={newBooking.checkInDate ? new Date(newBooking.checkInDate) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        setNewBooking({ ...newBooking, checkInDate: format(date, "yyyy-MM-dd") });
                                    }
                                }}
                                initialFocus
                                locale={th}
                            />
                          </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <label className="block text-slate-700 font-bold mb-2">วันเช็คเอาท์ <span className="text-red-500">*</span></label>
                         <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(
                                "w-full px-4 py-3 border border-slate-200 rounded-xl outline-none transition-all bg-slate-50 text-left flex items-center gap-2",
                                !newBooking.checkOutDate && "text-slate-400"
                            )}>
                                <CalendarIcon className="w-4 h-4 text-slate-500" />
                                {newBooking.checkOutDate ? format(new Date(newBooking.checkOutDate), "PPP", { locale: th }) : "เลือกวันที่"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={newBooking.checkOutDate ? new Date(newBooking.checkOutDate) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        setNewBooking({ ...newBooking, checkOutDate: format(date, "yyyy-MM-dd") });
                                    }
                                }}
                                disabled={(date) => newBooking.checkInDate ? date < new Date(newBooking.checkInDate) : false}
                                initialFocus
                                locale={th}
                            />
                          </PopoverContent>
                        </Popover>
                    </div>
                 </div>

                 <div>
                    <label className="block text-slate-700 font-bold mb-2">ประเภทห้อง</label>
                    <select
                        value={newBooking.roomType}
                        onChange={(e) => setNewBooking({ ...newBooking, roomType: e.target.value as any, selectedRoomIds: [] })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                    >
                        <option value="single">เตียงเดี่ยว (Single)</option>
                        <option value="double">เตียงคู่ (Double)</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-slate-700 font-bold mb-2 flex justify-between items-center">
                        <span>เลือกห้องพัก ({newBooking.selectedRoomIds.length})</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            ว่าง {filteredAvailableLabeledRooms.length} ห้อง
                        </span>
                    </label>
                    
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                        {filteredAvailableLabeledRooms.map((room) => {
                            const isSelected = newBooking.selectedRoomIds.includes(room.id);
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => toggleRoomSelection(room.id)}
                                    className={cn(
                                        "py-2 px-1 rounded-lg text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1",
                                        isSelected 
                                            ? "bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-200" 
                                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-500"
                                    )}
                                >
                                    <span>{room.label}</span>
                                    {isSelected && <Check className="w-3 h-3" />}
                                </button>
                            );
                        })}
                        {filteredAvailableLabeledRooms.length === 0 && (
                            <div className="col-span-full text-center py-4 text-slate-400 text-sm">
                                ไม่มีห้องว่างในประเภทนี้
                            </div>
                        )}
                    </div>
                 </div>

                 <div>
                    <label className="block text-slate-700 font-bold mb-2">ประเภทราคา / Tier</label>
                    <select
                    value={newBooking.pricingTier}
                    onChange={(e) => setNewBooking({ ...newBooking, pricingTier: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                    >
                    <option value="general">ทั่วไป ฿890 (General)</option>
                    <option value="tour">ทัวร์/แนะนำ ฿840 (Tour)</option>
                    <option value="vip">ผู้ถือหุ้น/VIP ฿400 (Shareholder)</option>
                    </select>
                    <div className="mt-2 text-xs text-slate-500 flex gap-2 pl-1 flex-wrap">
                        <span className="font-medium text-slate-700">ราคา {formatCurrency(PRICING[newBooking.pricingTier])} (รวม VAT 7%)</span>
                        <span className="text-slate-300">|</span>
                        <span>ค่าห้อง: {formatCurrency(extractBasePrice(PRICING[newBooking.pricingTier]))}</span>
                        <span className="text-slate-300">|</span>
                        <span>VAT: {formatCurrency(extractVAT(PRICING[newBooking.pricingTier]))}</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-400" />
                  ข้อมูลเพิ่มเติม
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">ชื่อกรุ๊ปทัวร์ (ถ้ามี)</label>
                    <input
                    type="text"
                    value={newBooking.groupName}
                    onChange={(e) => setNewBooking({ ...newBooking, groupName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                    placeholder="ระบุชื่อกรุ๊ป"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">หมายเหตุ</label>
                    <textarea
                    value={newBooking.notes}
                    onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                    rows={1}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50 resize-none"
                    placeholder="ความต้องการพิเศษ..."
                    />
                  </div>
               </div>
            </div>
          </div>

          <div className="mt-12 flex gap-4 pt-6 border-t border-slate-100">
            <button
              onClick={handleCreateBooking}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              ยืนยันการจอง {newBooking.selectedRoomIds.length > 0 && `(${newBooking.selectedRoomIds.length} ห้อง)`}
            </button>
            <button
              onClick={() => setView('list')}
              className="px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">เคาน์เตอร์บริการ</h2>
          <p className="text-slate-500">จัดการการจอง เช็คอิน และเช็คเอาท์</p>
        </div>
        <button
          onClick={() => setView('new-booking')}
          className="flex items-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all shadow-lg shadow-orange-200 font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>สร้างการจองใหม่</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <Search className="w-6 h-6 text-slate-400" />
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, หรือเลขการจอง..."
                className="w-full text-lg outline-none placeholder:text-slate-300 text-slate-800"
            />
         </div>
         <div className="bg-slate-800 rounded-3xl p-6 text-white flex items-center justify-between shadow-lg shadow-slate-200">
            <div>
                <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">กิจกรรมวันนี้</div>
                <div className="text-3xl font-bold">{todayBookings.length}</div>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl">
                <Clock className="w-8 h-8 text-orange-400" />
            </div>
         </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขจอง</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้เข้าพัก</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เบอร์โทร</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่เข้า-ออก</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ห้อง</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.map(booking => {
                const bookingRooms = labeledRooms.filter(r => booking.roomIds.includes(r.id));
                const roomNumbers = bookingRooms.map(r => r.label).join(', ');
                
                const isPool = booking.id.startsWith('POOL-');

                return (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs">{booking.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{booking.guest.name}</div>
                      {booking.groupName && (
                        <div className="text-xs text-purple-600 font-bold mt-1 bg-purple-50 px-2 py-0.5 rounded w-fit">
                            {booking.groupName}
                        </div>
                      )}
                      {isPool && (
                         <div className="text-xs text-cyan-600 font-bold mt-1 bg-cyan-50 px-2 py-0.5 rounded w-fit">
                            บริการสระว่ายน้ำ
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{booking.guest.phone}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {formatDate(booking.checkInDate)}</span>
                        {isPool ? (
                             <span className="flex items-center gap-1 opacity-50"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> -</span>
                        ) : (
                             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> {formatDate(booking.checkOutDate)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{isPool ? '-' : roomNumbers}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        {booking.status === 'reserved' && (
                          <button
                            onClick={() => handleCheckIn(booking)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors text-sm font-bold shadow-sm"
                          >
                            เช็คอิน
                          </button>
                        )}
                        {booking.status === 'checked-in' && (
                          <button
                            onClick={() => handleCheckOut(booking)}
                            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors text-sm font-bold"
                          >
                            เช็คเอาท์
                          </button>
                        )}
                        {booking.status === 'checked-out' && (
                           <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold">
                              เสร็จสิ้น
                           </span>
                        )}

                        {/* Details Button - For non-pool items mostly, but why not all? */}
                        {!isPool && (
                            <button
                                onClick={() => handleShowDetails(booking)}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-orange-500 rounded-xl transition-colors"
                                title="รายละเอียด / แก้ไข"
                            >
                                <FileText className="w-5 h-5" />
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
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
               <Search className="w-16 h-16 mb-4 opacity-20" />
               <p className="font-medium">ไม่พบข้อมูลการจอง</p>
            </div>
          )}
        </div>
      </div>

      {showCheckIn && selectedBooking && (
        <CheckInModal
          booking={selectedBooking}
          onClose={() => setShowCheckIn(false)}
          onComplete={handleCheckInComplete}
          currentUser={currentUser}
        />
      )}

      {showCheckOut && selectedBooking && (
        <CheckOutModal
          booking={selectedBooking}
          onClose={() => setShowCheckOut(false)}
          onComplete={handleCheckOutComplete}
          currentUser={currentUser}
        />
      )}

      {showDetails && selectedBooking && (
         <BookingDetailsModal 
            booking={selectedBooking}
            onClose={() => setShowDetails(false)}
            onUpdate={() => setBookings(getBookings())}
            currentUser={currentUser}
         />
      )}
    </div>
  );
}
