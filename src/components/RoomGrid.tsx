import { useState, useEffect, useMemo, useCallback } from 'react';
import { Room, User, Booking, Payment } from '../types';
import * as api from '../utils/api';
import * as lineService from '../utils/lineService';
import { extractBasePrice, extractVAT } from '../utils/pricing';
import { 
  Bed, 
  BedDouble, 
  Sparkles, 
  Wrench, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Check, 
  X, 
  Plus, 
  Info, 
  Users,
  TrendingUp,
  CalendarCheck,
  LogIn,
  LogOut,
  Layers,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Printer,
  MessageCircle,
  Smartphone,
  MapPin,
  Banknote,
  ArrowLeft,
  Waves,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/dateHelpers';
import { PRICING } from '../utils/pricing';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { MaintenanceReportModal } from './MaintenanceReportModal';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from './ui/utils';
import { buttonVariants } from './ui/button';
import logo from "figma:asset/84dd509e490bb18f47d2514ab68671ebde53721b.png";

interface RoomGridProps {
  currentUser?: User;
  onRoomSelect?: (room: Room) => void;
}

export function RoomGrid({ currentUser, onRoomSelect }: RoomGridProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Multi-selection state
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState<Booking | null>(null);
  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState<Booking | null>(null);
  const [selectedRoomForMaintenance, setSelectedRoomForMaintenance] = useState<Room | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [loadedRooms, loadedBookings] = await Promise.all([
        api.getRooms(),
        api.getBookings(),
      ]);
      setRooms(loadedRooms);
      setBookings(loadedBookings);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Helper to update room status
  const handleUpdateRoomStatus = async (roomId: string, status: Room['status']) => {
    try {
      await api.updateRoomStatus(roomId, status);
      await loadData();
    } catch (err) {
      console.error('Failed to update room status:', err);
    }
  };

  // Request cleaning manually
  const handleRequestCleaning = async (room: Room) => {
    try {
      // Update room status to cleaning
      await api.updateRoomStatus(room.id, 'cleaning');
      
      // Send LINE notification to housekeepers
      const roomType = (room as any).displayType === 'double' ? 'เตียงคู่' : 'เตียงเดี่ยว';
      await lineService.sendCleaningRequest(room.id, room.number, roomType);
      
      alert(`✅ ส่งคำขอทำความสะอาด\n\nห้อง ${room.number}\nระบบจะส่งการแจ้งเตือนไปยัง LINE ของแม่บ้าน`);
      
      await loadData();
    } catch (err) {
      console.error('Failed to request cleaning:', err);
      alert('❌ ไม่สามารถส่งคำขอทำความสะอาดได้');
    }
  };

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const isToday = selectedDateStr === getTodayDateString();

  // Helper to determine status for a specific date
  const getRoomStatusForDate = (room: Room, dateStr: string) => {
    // If it's today, we respect physical status first (cleaning/maintenance)
    if (dateStr === getTodayDateString()) {
        if (room.status === 'cleaning' || room.status === 'maintenance') return room.status;
    }

    // Check booking overlap
    // Booking occupies room if: checkIn <= date < checkOut
    const booking = bookings.find(b => 
        b.roomIds.includes(room.id) && 
        b.status !== 'cancelled' &&
        b.status !== 'checked-out' && // Fix: Ignore checked-out bookings
        b.checkInDate <= dateStr && 
        b.checkOutDate > dateStr
    );

    if (booking) {
        // If checked in, show as occupied (Green)
        if (booking.status === 'checked-in') return 'occupied';
        // If checking in on this date (and not checked in yet)
        if (booking.checkInDate === dateStr) return 'reserved';
        // If staying over (already checked in or reserved previous days)
        return 'occupied';
    }

    return 'available';
  };

  // Stats Calculation based on SELECTED DATE
  const stats = useMemo(() => {
    const total = rooms.length;
    let available = 0;
    let occupied = 0; // Stay over
    let reserved = 0; // Arrival
    let maintenance = 0;

    rooms.forEach(room => {
        const status = getRoomStatusForDate(room, selectedDateStr);
        if (status === 'available') available++;
        else if (status === 'occupied') occupied++;
        else if (status === 'reserved') reserved++;
        else if (status === 'cleaning' || status === 'maintenance') maintenance++;
    });

    return { total, available, occupied, reserved, maintenance };
  }, [rooms, bookings, selectedDateStr]);

  // Identify reserved rooms for selected date (for icon display logic)
  const getBookingForRoomDate = (roomId: string, dateStr: string) => {
     return bookings.find(b => 
        b.roomIds.includes(roomId) && 
        b.status !== 'cancelled' &&
        b.status !== 'checked-out' && // Fix: Don't show checked-out bookings as active
        b.checkInDate <= dateStr && 
        b.checkOutDate > dateStr
    );
  };

  // Map and sort rooms
  const { rcRooms, rbRooms, raRooms, allSortedRooms } = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => a.number - b.number);
    const rc = sorted.slice(0, 10).map((r, i) => ({ ...r, label: `RC${String(i + 1).padStart(2, '0')}`, displayType: 'single' }));
    const rb = sorted.slice(10, 20).map((r, i) => ({ ...r, label: `RB${String(i + 1).padStart(2, '0')}`, displayType: 'single' }));
    const ra = sorted.slice(20, 30).map((r, i) => ({ ...r, label: `RA${String(i + 1).padStart(2, '0')}`, displayType: 'double' }));
    
    return {
      rcRooms: [...rc].reverse(),
      rbRooms: [...rb].reverse(),
      raRooms: ra,
      allSortedRooms: [...rc, ...rb, ...ra] // For lookup
    };
  }, [rooms]);

  const handleRoomClick = (room: Room) => {
    const roomWithMeta = allSortedRooms.find(r => r.id === room.id) || room;
    
    if (isMultiSelectMode) {
      if (selectedRooms.find(r => r.id === room.id)) {
        setSelectedRooms(selectedRooms.filter(r => r.id !== room.id));
      } else {
        setSelectedRooms([...selectedRooms, roomWithMeta]);
      }
    } else {
      setSelectedRooms([roomWithMeta]);
    }
    onRoomSelect?.(room);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50';
      case 'reserved': return 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200';
      case 'occupied': return 'bg-green-600 border-green-600 text-white hover:bg-green-700';
      case 'cleaning': return 'bg-orange-100 border-orange-200 text-orange-800 hover:bg-orange-200';
      case 'maintenance': return 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100';
      default: return 'bg-white border-slate-200 text-slate-700';
    }
  };

  const getStatusIcon = (status: string, type: string) => {
    if (status === 'occupied') return <div className="font-bold text-xs tracking-wider">BUSY</div>;
    if (status === 'cleaning') return <Sparkles className="w-5 h-5" />;
    if (status === 'maintenance') return <Wrench className="w-5 h-5" />;
    if (status === 'reserved') return <Clock className="w-5 h-5" />;
    
    return type === 'double' 
      ? <div className="flex gap-0.5"><Bed className="w-4 h-4 text-slate-400" /><Bed className="w-4 h-4 text-slate-400" /></div>
      : <BedDouble className="w-6 h-6 text-slate-400" />;
  };

  const RoomButton = ({ room }: { room: any }) => {
    if (!room) return <div className="w-full aspect-square opacity-0" />;
    
    const isSelected = selectedRooms.some(r => r.id === room.id);
    const status = getRoomStatusForDate(room, selectedDateStr);
    
    return (
      <button
        onClick={() => handleRoomClick(room)}
        className={`
          w-full aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 shadow-sm relative group
          ${getStatusColor(status)}
          ${isSelected ? 'ring-4 ring-orange-400/30 ring-offset-2 border-orange-500 z-10 scale-105' : ''}
        `}
      >
        <div className="text-lg font-bold mb-1">{room.label}</div>
        {getStatusIcon(status, room.displayType)}
        
        {/* Selection Indicator for Multi-mode */}
        {isSelected && isMultiSelectMode && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
             <Check className="w-2 h-2 text-white" />
          </div>
        )}
      </button>
    );
  };

  const RoomPair = ({ r1, r2 }: { r1?: any, r2?: any }) => (
    <div className="flex flex-row gap-3 w-full h-full">
      <div className="flex-1 min-w-0"><RoomButton room={r1} /></div>
      <div className="flex-1 min-w-0"><RoomButton room={r2} /></div>
    </div>
  );

  // Hydrate selectedRooms with fresh data to ensure status is up-to-date
  const freshSelectedRooms = useMemo(() => {
     return selectedRooms.map(s => rooms.find(r => r.id === s.id) || s);
  }, [selectedRooms, rooms]);

  // Derived state for the central view
  const singleSelectedRoom = freshSelectedRooms.length === 1 ? freshSelectedRooms[0] : null;
  const isGroupSelection = freshSelectedRooms.length > 1;

  // Change Date Handlers
  const handlePrevDate = () => setSelectedDate(prev => addDays(prev, -1));
  const handleNextDate = () => setSelectedDate(prev => addDays(prev, 1));

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Dashboard Stats Row with Date Picker */}
      <div className="flex flex-col gap-6 shrink-0">
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                    <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">ตรวจสอบสถานะห้องพัก</h2>
                    <p className="text-slate-500 text-sm">เลือกวันที่เพื่อดูการจอง���่วงหน้า</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <button onClick={handlePrevDate} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-500 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-700 font-bold min-w-[160px] justify-center hover:bg-slate-50 transition-colors">
                      <CalendarIcon className="w-4 h-4 text-orange-500" />
                      {format(selectedDate, "d MMMM yyyy", { locale: th })}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      locale={th}
                    />
                  </PopoverContent>
                </Popover>
                <button onClick={handleNextDate} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-500 transition-all">
                    <ChevronRight className="w-5 h-5" />
                </button>
                
                {!isToday && (
                    <button 
                        onClick={() => setSelectedDate(new Date())}
                        className="ml-2 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                    >
                        วันนี้
                    </button>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard 
            label="ห้องพักทั้งหมด" 
            value={stats.total} 
            icon={BedDouble} 
            color="bg-slate-600" 
            subtext="Total Rooms"
            />
            <StatCard 
            label="ห้องว่าง" 
            value={stats.available} 
            icon={Check} 
            color="bg-green-500" 
            subtext={isToday ? "Available Now" : "Available"}
            />
            <StatCard 
            label="จองแล้ว/เข้าพัก" // Combined for clarity? Or specific?
            value={stats.reserved} 
            icon={Clock} 
            color="bg-blue-500" 
            subtext="New Arrivals"
            />
            <StatCard 
            label="พักค้างคืน/เช็คอินแล้ว" 
            value={stats.occupied} 
            icon={Users} 
            color="bg-green-600" 
            subtext="Occupied / Checked In"
            />
            <StatCard 
            label="ปรับปรุง/ทำความสะอาด" 
            value={stats.maintenance} 
            icon={Wrench} 
            color="bg-orange-400" 
            subtext="Maintenance"
            />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {/* Main Room Layout Map */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ผังห้องพัก
                <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                    {format(selectedDate, "d MMM yyyy", { locale: th })}
                </span>
            </h3>
            
            <div className="flex items-center gap-6">
              {/* Multi-Select Toggle */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  setSelectedRooms([]); // Clear selection when toggling mode
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  isMultiSelectMode 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                {isMultiSelectMode ? 'โหมดเลือกหลายห้อง (เปิด)' : 'โหมดเลือกหลายห้อง (ปิด)'}
              </button>

              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span> ว่าง</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span> จองเข้าพัก (Arrival)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-600"></span> เช็คอินแล้ว/ไม่ว่าง</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span> ปิดปรับปรุง</div>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-6 min-h-0">
            {/* Left Wing (RC) */}
            <div className="lg:col-span-1 flex flex-col justify-center gap-3 overflow-y-auto pr-2">
               <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Wing RC</div>
               {Array.from({ length: 5 }).map((_, i) => (
                  <RoomPair key={i} r1={rcRooms[i*2]} r2={rcRooms[i*2+1]} />
               ))}
            </div>

            {/* Center Area (Details & RB) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Central Visual / Details Box */}
              <div className="flex-1 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 relative overflow-hidden transition-all duration-300">
                {singleSelectedRoom && !isGroupSelection ? (
                   // SINGLE ROOM VIEW
                   <div className="absolute inset-0 bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto w-full">
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl font-bold text-slate-800">{(singleSelectedRoom as any).label}</h2>
                                {(() => {
                                    const effectiveStatus = getRoomStatusForDate(singleSelectedRoom, selectedDateStr);
                                    return (
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                                        effectiveStatus === 'available' ? 'bg-green-100 text-green-700' :
                                        effectiveStatus === 'reserved' ? 'bg-blue-100 text-blue-700' :
                                        effectiveStatus === 'occupied' ? 'bg-green-600 text-white' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {effectiveStatus === 'available' ? 'ว่าง' :
                                        effectiveStatus === 'reserved' ? 'จองเข้าพัก (Arrival)' :
                                        effectiveStatus === 'occupied' ? 'เช็คอินแล้ว/ไม่ว่าง' : 
                                        effectiveStatus === 'cleaning' ? 'กำลังทำความสะอาด' : 'ปิดปรับปรุง'}
                                        </div>
                                    );
                                })()}
                              </div>
                              <div className="text-slate-500 text-lg flex items-center gap-2">
                                {(singleSelectedRoom as any).displayType === 'double' ? <Users className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                {(singleSelectedRoom as any).displayType === 'double' ? 'เตียงคู่ (Twin Beds)' : 'เตียงเดี่ยว (King Bed)'}
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => setSelectedRooms([])}
                              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>

                          <div className="space-y-6">
                            {/* LOGIC FOR ACTION BUTTONS */}
                            {(() => {
                                const status = getRoomStatusForDate(singleSelectedRoom, selectedDateStr);
                                const booking = getBookingForRoomDate(singleSelectedRoom.id, selectedDateStr);

                                if (status === 'available') {
                                    return (
                                      <div className="bg-green-50 p-8 rounded-3xl border border-green-100 text-center">
                                        <h4 className="text-xl font-bold text-green-800 mb-2">ห้องว่างสำหรับวันที่เลือก</h4>
                                        <p className="text-green-600 mb-6">
                                            {isToday 
                                                ? 'สามารถทำรายการจองได้ทันที' 
                                                : `ว่างในวันที่ ${format(selectedDate, 'd MMM yyyy', { locale: th })}`
                                            }
                                        </p>
                                        <div className="flex justify-center gap-4">
                                          <button 
                                            onClick={() => setShowBookingModal(true)}
                                            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 text-lg flex items-center gap-2"
                                          >
                                            <Plus className="w-5 h-5" />
                                            {isToday ? 'จองห้องนี้' : 'จองล่วงหน้า'}
                                          </button>
                                          {isToday && (
                                            <button 
                                                onClick={() => {
                                                  setSelectedRoomForMaintenance(singleSelectedRoom);
                                                  setShowMaintenanceModal(true);
                                                }}
                                                className="px-6 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all flex items-center gap-2"
                                            >
                                                <Wrench className="w-5 h-5" />
                                                แจ้งซ่อม
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                }

                                if (booking) {
                                    const isArrival = booking.checkInDate === selectedDateStr;
                                    const isCheckedIn = booking.status === 'checked-in';
                                    
                                    return (
                                       <div className={`p-8 rounded-3xl border ${isArrival && !isCheckedIn ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                                          <div className="flex items-center gap-6 mb-8">
                                             <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ${isArrival && !isCheckedIn ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {booking.guest.name.charAt(0)}
                                             </div>
                                             <div>
                                                <div className={`text-sm font-bold uppercase tracking-wider mb-1 ${isArrival && !isCheckedIn ? 'text-blue-400' : 'text-slate-400'}`}>
                                                    {isArrival && !isCheckedIn ? 'Arrival (รอเช็คอิน)' : isCheckedIn ? 'Checked In (เข้าพักแล้ว)' : 'Stay Over (ค้างคืน)'}
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">{booking.guest.name}</div>
                                                <div className="text-slate-500">{booking.guest.phone}</div>
                                                {booking.groupName && (
                                                  <div className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200">
                                                    Group: {booking.groupName}
                                                  </div>
                                                )}
                                             </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-8 mb-8">
                                             <div className="bg-white p-4 rounded-xl border border-slate-100">
                                                <div className="text-slate-400 text-sm mb-1">เช็คอิน</div>
                                                <div className="text-xl font-bold text-slate-700">{formatDate(booking.checkInDate)}</div>
                                                {booking.actualCheckInTime && <div className="text-xs text-green-600 font-bold mt-1">เวลา: {format(parseISO(booking.actualCheckInTime), 'HH:mm')}</div>}
                                             </div>
                                             <div className="bg-white p-4 rounded-xl border border-slate-100">
                                                <div className="text-slate-400 text-sm mb-1">เช็คเอาท์</div>
                                                <div className="text-xl font-bold text-slate-700">{formatDate(booking.checkOutDate)}</div>
                                             </div>
                                          </div>

                                          {isToday && (
                                              <div className="flex gap-4">
                                                 {/* Check In Button for Arrivals */}
                                                 {isArrival && !isCheckedIn && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedBookingForCheckIn(booking);
                                                            setShowCheckInModal(true);
                                                        }}
                                                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                                    >
                                                        <LogIn className="w-5 h-5" />
                                                        เช็คอิน
                                                    </button>
                                                 )}
                                                 
                                                 {(!isArrival || isCheckedIn) && (
                                                     <div className="flex-1 flex gap-2">
                                                         <button 
                                                            onClick={() => {
                                                                setSelectedBookingForCheckOut(booking);
                                                                setShowCheckOutModal(true);
                                                            }}
                                                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
                                                         >
                                                            ดูบิล / ชำระเงิน
                                                         </button>
                                                         <button
                                                             onClick={() => {
                                                                setSelectedBookingForCheckOut(booking);
                                                                setShowCheckOutModal(true);
                                                            }} 
                                                             className="px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all border border-slate-200"
                                                             title="Download Receipt"
                                                         >
                                                             <Printer className="w-6 h-6" />
                                                         </button>
                                                     </div>
                                                 )}

                                                 {/* Allow checkout only if occupied/checked-in/stayover */}
                                                 {(status === 'occupied' || isCheckedIn) && (
                                                      <button 
                                                         onClick={() => handleUpdateRoomStatus(singleSelectedRoom.id, 'cleaning')}
                                                         className="flex-1 py-4 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 rounded-xl font-bold transition-all"
                                                      >
                                                         เช็คเอาท์
                                                      </button>
                                                  )}
                                              </div>
                                          )}
                                          {!isToday && (
                                            <div className="text-center text-slate-400 text-sm">
                                                ข้อมูลสำหรับวันที่ {format(selectedDate, "d MMM yyyy", { locale: th })}
                                            </div>
                                          )}
                                       </div>
                                    );
                                }

                                // Fallback for cleaning/maintenance
                                return (
                                   <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 text-center">
                                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mx-auto mb-4">
                                        <Wrench className="w-8 h-8" />
                                      </div>
                                      <h4 className="text-xl font-bold text-orange-800 mb-2">กำลังดำเนินการ</h4>
                                      <p className="text-orange-600 mb-8">
                                         {status === 'cleaning' ? 'แม่บ้านกำลังทำความสะอาดห้องนี้' : 'ช่างกำลังซ่อมบำรุงห้องนี้'}
                                      </p>
                                      {isToday && (
                                           <button 
                                              onClick={() => handleUpdateRoomStatus(singleSelectedRoom.id, 'available')}
                                              className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-200 transition-all"
                                           >
                                              เสร็จสิ้นการดำเนินการ
                                           </button>
                                       )}
                                   </div>
                                );
                            })()}
                          </div>
                        </div>
                      </div>
                   </div>
                ) : isGroupSelection ? (
                  // GROUP SELECTION VIEW
                  <div className="absolute inset-0 bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                       <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-6">
                          <Layers className="w-10 h-10" />
                       </div>
                       <h2 className="text-3xl font-bold text-slate-800 mb-2">จัดการแบบกลุ่ม (Group Action)</h2>
                       <p className="text-slate-500 mb-8">คุณได้เลือกห้องพักจำนวน <span className="text-orange-500 font-bold text-xl">{selectedRooms.length}</span> ห้อง</p>
                       
                       <div className="flex flex-wrap justify-center gap-2 max-w-2xl mb-8">
                          {selectedRooms.map((r: any) => (
                             <div key={r.id} className="px-3 py-1 bg-slate-100 rounded-lg text-slate-600 font-bold border border-slate-200">
                                {r.label}
                             </div>
                          ))}
                       </div>

                       {selectedRooms.some(r => getRoomStatusForDate(r, selectedDateStr) !== 'available') ? (
                          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 max-w-md w-full mb-6">
                             <p className="font-bold flex items-center justify-center gap-2">
                                <X className="w-5 h-5" />
                                ไม่สามารถจองได้
                             </p>
                             <p className="text-sm mt-1">มีห้องพักบางห้องที่ไม่ว่างในช่วงวันที่เลือก</p>
                          </div>
                       ) : (
                          <div className="w-full max-w-md space-y-4">
                             <button 
                                onClick={() => setShowBookingModal(true)}
                                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 text-lg"
                             >
                                สร้างการจองกลุ่ม ({selectedRooms.length} ห้อง)
                             </button>
                          </div>
                       )}
                       
                       <button 
                          onClick={() => setSelectedRooms([])}
                          className="mt-6 text-slate-400 hover:text-slate-600 font-bold text-sm flex items-center gap-2"
                       >
                          <Trash2 className="w-4 h-4" />
                          ยกเลิกการเลือกทั้งหมด
                       </button>
                    </div>
                  </div>
                ) : (
                  // EMPTY STATE
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-50 transition-opacity">
                    <img 
                      src={logo}
                      className="w-48 h-48 object-contain mx-auto mb-6 grayscale opacity-50"
                      alt="Watermark"
                    />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">เลือกห้องพัก</h3>
                    <p className="font-medium text-slate-500">คลิกที่ห้องพักในแผนผังเพื่อดูรายละเอียดและจัดการ</p>
                  </div>
                )}
              </div>

              {/* Pool Service Button */}
              <button 
                onClick={() => setShowPoolModal(true)}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white p-4 rounded-3xl shadow-lg shadow-cyan-100 flex items-center justify-between transition-all group active:scale-95"
              >
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <Waves className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                          <h4 className="text-lg font-bold">ใช้บริการสระว่ายน้ำ</h4>
                          <p className="text-cyan-100 text-sm">Swimming Pool Service</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="text-lg font-bold bg-white/20 px-3 py-1 rounded-lg">฿50 / ท่าน</span>
                      <ChevronRight className="w-6 h-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
              </button>

              {/* Bottom Wing (RB) */}
              <div className="relative pt-6 shrink-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 uppercase tracking-wider">Wing RB</div>
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="col-span-1">
                      <RoomPair r1={rbRooms[i*2]} r2={rbRooms[i*2+1]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Wing (RA) */}
            <div className="lg:col-span-1 flex flex-col justify-center gap-3 overflow-y-auto pl-2">
               <div className="text-center text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Wing RA</div>
               {Array.from({ length: 5 }).map((_, i) => (
                  <RoomPair key={i} r1={raRooms[i*2]} r2={raRooms[i*2+1]} />
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedRooms.length > 0 && currentUser && (
        <BookingModal 
          rooms={selectedRooms}
          onClose={() => setShowBookingModal(false)}
          currentUser={currentUser}
          initialDate={selectedDateStr}
          onSuccess={() => {
            setShowBookingModal(false);
            setSelectedRooms([]); // Clear selection after booking
            loadData();
            alert('บันทึกการจองสำเร็จ / Booking created successfully');
          }}
        />
      )}

      {/* Pool Service Modal */}
      {showPoolModal && (
          <PoolServiceModal 
            onClose={() => setShowPoolModal(false)}
            currentUser={currentUser}
            onSuccess={() => {
                setShowPoolModal(false);
                loadData(); // Refresh bookings/income
                alert('บันทึกรายรับเรียบร้อย / Payment recorded');
            }}
          />
      )}

      {/* Check In Modal */}
      {showCheckInModal && selectedBookingForCheckIn && currentUser && (
        <CheckInModal 
          booking={selectedBookingForCheckIn}
          onClose={() => setShowCheckInModal(false)}
          currentUser={currentUser}
          onComplete={() => {
            setShowCheckInModal(false);
            loadData();
            setSelectedBookingForCheckIn(null);
          }}
        />
      )}

      {/* Check Out Modal (Bill/Payment) */}
      {showCheckOutModal && selectedBookingForCheckOut && currentUser && (
          <CheckOutModal 
             booking={selectedBookingForCheckOut}
             onClose={() => setShowCheckOutModal(false)}
             currentUser={currentUser}
             onComplete={() => {
                setShowCheckOutModal(false);
                loadData();
                setSelectedBookingForCheckOut(null);
             }}
          />
      )}

      {/* Maintenance Report Modal */}
      {showMaintenanceModal && selectedRoomForMaintenance && currentUser && (
        <MaintenanceReportModal
          room={selectedRoomForMaintenance}
          currentUser={currentUser}
          onClose={() => {
            setShowMaintenanceModal(false);
            setSelectedRoomForMaintenance(null);
          }}
          onSuccess={() => {
            setShowMaintenanceModal(false);
            setSelectedRoomForMaintenance(null);
            setSelectedRooms([]);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// --- Components ---

function StatCard({ label, value, icon: Icon, color, subtext }: any) {
  return (
    <div className={`${color} rounded-2xl p-6 text-white shadow-lg shadow-orange-100 relative overflow-hidden group transition-transform hover:-translate-y-1`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-6 h-6 text-white" />
          </div>
          {/* Decorative Circle */}
          <div className="w-16 h-16 bg-white/10 rounded-full absolute -top-4 -right-4 blur-xl group-hover:scale-150 transition-transform duration-500" />
        </div>
        <h3 className="text-4xl font-bold mb-1">{value}</h3>
        <p className="font-medium opacity-90">{label}</p>
        <p className="text-xs opacity-60 mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function PoolServiceModal({ onClose, onSuccess, currentUser }: any) {
    const [guestName, setGuestName] = useState('');
    const [count, setCount] = useState(1);
    const pricePerPerson = 50;
    const total = count * pricePerPerson;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!guestName) return;

        try {
            // 1. Create a "Service Booking" to track the transaction context
            const bookingId = `POOL-${Date.now()}`;
            const booking: Booking = {
                id: bookingId,
                roomIds: [], // No rooms involved
                guest: { name: guestName, phone: '-', idNumber: '-' },
                checkInDate: getTodayDateString(),
                checkOutDate: getTodayDateString(),
                pricingTier: 'general',
                baseRate: total,
                source: 'walk-in',
                status: 'checked-out', // Service completed immediately upon payment
                groupName: count > 1 ? `Pool Group (${count})` : undefined,
                notes: `Pool Service: ${count} person(s)`,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.id || 'system'
            };
            
            // Get the REAL Booking UUID from Supabase (or fallback ID)
            const realBookingId = await api.addBooking(booking);

            // 2. Create the Payment Record
            const [receiptNumber, invoiceNumber] = await Promise.all([
                api.getNextReceiptNumber(),
                api.getNextInvoiceNumber(),
            ]);
            
            const payment: Payment = {
                id: `PAY-${Date.now()}`,
                bookingId: realBookingId, // Use real UUID
                amount: total,
                method: 'cash',
                receiptNumber,
                invoiceNumber,
                paidAt: new Date().toISOString(),
                paidBy: currentUser?.name || 'Staff',
                charges: [
                    {
                        id: `CHG-${Date.now()}`,
                        bookingId: realBookingId, // Use real UUID
                        type: 'other',
                        description: `ค่าบริการสระว่ายน้ำ (Swimming Pool) x${count}`,
                        amount: total,
                    }
                ],
                subtotal: extractBasePrice(total),
                vat: extractVAT(total),
                total: total
            };

            await api.addPayment(payment);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to process pool service:', err);
            alert('❌ ไม่สามารถบันทึกรายการได้');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                            <Waves className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">บริการสระว่ายน้ำ</h3>
                            <p className="text-slate-500 text-sm">Swimming Pool Service</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ชื่อผู้ใช้บริการ (Guest Name)</label>
                        <input 
                            required
                            autoFocus
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-lg text-slate-800"
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            placeholder="ระบุชื่อลูกค้า..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">จำนวนผู้ใช้บริการ (ท่าน)</label>
                        <div className="flex items-center gap-4">
                            <button 
                                type="button"
                                onClick={() => setCount(Math.max(1, count - 1))}
                                className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xl transition-colors"
                            >
                                -
                            </button>
                            <div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xl text-slate-800">
                                {count}
                            </div>
                            <button 
                                type="button"
                                onClick={() => setCount(count + 1)}
                                className="w-12 h-12 flex items-center justify-center rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 font-bold text-xl transition-colors shadow-lg shadow-cyan-200"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between text-slate-500 text-sm">
                            <span>ราคาต่อท่าน</span>
                            <span>{pricePerPerson} บาท</span>
                        </div>
                        <div className="flex justify-between text-slate-800 font-bold text-lg pt-2 border-t border-slate-200">
                            <span>ยอดรวมสุทธิ</span>
                            <span className="text-cyan-600">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-cyan-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Check className="w-6 h-6" />
                        ยืนยันและรับเงิน
                    </button>
                </form>
            </div>
        </div>
    );
}

function BookingModal({ rooms, onClose, onSuccess, currentUser, initialDate }: any) {
  const [formData, setFormData] = useState({
    guestName: '',
    idNumber: '',
    address: '',
    phone: '',
    whatsapp: '',
    deposit: '',
    groupName: '',
    checkInDate: initialDate || getTodayDateString(),
    checkOutDate: '',
  });

  const [activeDateField, setActiveDateField] = useState<'checkIn' | 'checkOut' | null>(null);

  const isGroup = rooms.length > 1;
  const label = isGroup ? `${rooms.length} ห้อง: ${rooms.map((r: any) => r.label).join(', ')}` : rooms[0].label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestName || !formData.phone || !formData.checkOutDate) return;

    const booking: Booking = {
      id: `BK${Date.now()}`,
      roomIds: rooms.map((r: any) => r.id),
      guest: { 
          name: formData.guestName, 
          idNumber: formData.idNumber || '-', 
          phone: formData.phone,
          address: formData.address || undefined
      },
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
      pricingTier: isGroup ? 'tour' : 'general', // Auto set tour tier for groups?
      baseRate: isGroup ? PRICING['tour'] * rooms.length : PRICING['general'], // Simple calc
      deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
      source: 'walk-in',
      status: 'reserved',
      groupName: formData.groupName || undefined,
      notes: formData.whatsapp ? `WhatsApp: ${formData.whatsapp}` : undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };
    try {
      await api.addBooking(booking);
      onSuccess();
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('❌ ไม่สามารถสร้างการจองได้');
    }
  };

  const handleDateSelect = (field: 'checkInDate' | 'checkOutDate', date: Date | undefined) => {
    if (!date) return;
    setFormData(prev => ({
      ...prev,
      [field]: format(date, 'yyyy-MM-dd')
    }));
    
    // Auto-flow logic
    if (field === 'checkInDate') {
        // If we picked check-in, automatically open check-out next
        setActiveDateField('checkOut');
    } else {
        // If we picked check-out, close the calendar
        setActiveDateField(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              {isGroup ? 'สร้างการจองใหม่ (กลุ่ม)' : 'สร้างการจองใหม่'}
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-h-20 overflow-y-auto">{label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
             {isGroup && (
               <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">ชื่อคณะทัวร์ / กลุ่ม (Group Name)</label>
                  <input 
                    className="w-full p-3 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.groupName}
                    onChange={e => setFormData({...formData, groupName: e.target.value})}
                    placeholder="เช่น คณะทัวร์คุณสมหญิง"
                  />
               </div>
             )}

             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ชื่อผู้จอง / หัวหน้าทัวร์</label>
                <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                    required
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    value={formData.guestName}
                    onChange={e => setFormData({...formData, guestName: e.target.value})}
                    placeholder="เช่น สมชาย ใจดี"
                    />
                </div>
             </div>
             
             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เลขบัตรประชาชน / Passport</label>
                <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    value={formData.idNumber}
                    onChange={e => setFormData({...formData, idNumber: e.target.value})}
                    placeholder="เลขบัตรประชาชน 13 หลัก หรือ Passport No."
                    />
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ที่อยู่ (Address)</label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด"
                    />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เบอร์โทรศัพท์</label>
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                        required
                        type="tel"
                        className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="08x-xxx-xxxx"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">WhatsApp (ต่างชาติ)</label>
                    <div className="relative">
                        <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        <input 
                        type="text"
                        className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        placeholder="+66..."
                        />
                    </div>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เงินมัดจำ (Deposit)</label>
                <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                    type="number"
                    min="0"
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono font-bold text-lg text-slate-800"
                    value={formData.deposit}
                    onChange={e => setFormData({...formData, deposit: e.target.value})}
                    placeholder="0.00"
                    />
                </div>
             </div>

             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-lg font-bold text-slate-700 mb-2">วันเช็คอิน <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setActiveDateField(activeDateField === 'checkIn' ? null : 'checkIn')}
                      className={cn(
                        "w-full flex items-center gap-2 p-4 bg-slate-50 border rounded-xl hover:bg-slate-100 transition-all text-left font-normal text-lg h-16",
                        !formData.checkInDate && "text-slate-400",
                        activeDateField === 'checkIn' ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50" : "border-slate-200"
                      )}
                    >
                      <CalendarIcon className={cn("w-5 h-5", activeDateField === 'checkIn' ? "text-orange-500" : "text-slate-500")} />
                      {formData.checkInDate ? (
                        <span className="text-slate-700">{format(parseISO(formData.checkInDate), "d MMMM yyyy", { locale: th })}</span>
                      ) : (
                        <span>เลือกวันที่</span>
                      )}
                    </button>
                 </div>
                 <div>
                    <label className="block text-lg font-bold text-slate-700 mb-2">วันเช็คเอาท์ <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setActiveDateField(activeDateField === 'checkOut' ? null : 'checkOut')}
                      className={cn(
                        "w-full flex items-center gap-2 p-4 bg-slate-50 border rounded-xl hover:bg-slate-100 transition-all text-left font-normal text-lg h-16",
                        !formData.checkOutDate && "text-slate-400",
                        activeDateField === 'checkOut' ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50" : "border-slate-200"
                      )}
                    >
                      <CalendarIcon className={cn("w-5 h-5", activeDateField === 'checkOut' ? "text-orange-500" : "text-slate-500")} />
                      {formData.checkOutDate ? (
                        <span className="text-slate-700">{format(parseISO(formData.checkOutDate), "d MMMM yyyy", { locale: th })}</span>
                      ) : (
                        <span>เลือกวันที่</span>
                      )}
                    </button>
                 </div>
               </div>

               {activeDateField && (
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center justify-between mb-4 px-2">
                       <span className="font-bold text-slate-500">
                          {activeDateField === 'checkIn' ? 'เลือกวันเช็คอิน (Check In)' : 'เลือกวันเช็คเอาท์ (Check Out)'}
                       </span>
                       <button 
                         type="button" 
                         onClick={() => setActiveDateField(null)}
                         className="text-xs font-bold text-slate-400 hover:text-slate-600"
                       >
                         ปิดปฏิทิน
                       </button>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex justify-center">
                      <Calendar
                        mode="single"
                        selected={activeDateField === 'checkIn' 
                          ? (formData.checkInDate ? parseISO(formData.checkInDate) : undefined)
                          : (formData.checkOutDate ? parseISO(formData.checkOutDate) : undefined)
                        }
                        onSelect={(date) => handleDateSelect(activeDateField === 'checkIn' ? 'checkInDate' : 'checkOutDate', date)}
                        initialFocus
                        disabled={(date) => 
                          activeDateField === 'checkOut' && formData.checkInDate
                            ? date <= parseISO(formData.checkInDate) 
                            : date < new Date()
                        }
                        locale={th}
                        className="p-4"
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-6",
                          caption: "flex justify-center pt-2 relative items-center w-full mb-4",
                          caption_label: "text-2xl font-normal text-slate-800",
                          nav: "space-x-1 flex items-center",
                          nav_button: cn(
                            buttonVariants({ variant: "outline" }),
                            "h-12 w-12 bg-transparent p-0 opacity-50 hover:opacity-100 border-slate-200 rounded-xl"
                          ),
                          nav_button_previous: "absolute left-0",
                          nav_button_next: "absolute right-0",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex mb-2 justify-between",
                          head_cell: "text-slate-400 rounded-md w-12 font-normal text-lg",
                          row: "flex w-full mt-2 justify-between",
                          cell: "h-12 w-12 text-center text-lg p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-12 w-12 p-0 font-normal aria-selected:opacity-100 text-lg rounded-xl hover:bg-slate-100"
                          ),
                          day_selected: "bg-slate-900 text-white hover:bg-slate-800 focus:bg-slate-900 rounded-xl",
                          day_today: "bg-slate-100 text-slate-900",
                          day_outside: "text-slate-300 opacity-50",
                          day_disabled: "text-slate-300 opacity-50",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>
                  </div>
               )}
             </div>
          </div>
          
          <button type="submit" className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
            <Check className="w-6 h-6" />
            ยืนยันการจอง
          </button>
        </form>
      </div>
    </div>
  );
}
