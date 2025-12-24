import { useState, useEffect, useMemo } from 'react';
import { Room, User, Booking } from '../types';
import { getRooms, getBookings, addBooking, updateRoomStatus } from '../utils/storage';
import { 
  Bed, 
  BedDouble, 
  Sparkles, 
  Wrench, 
  Calendar, 
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
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/dateHelpers';
import { PRICING } from '../utils/pricing';

interface RoomGridProps {
  currentUser?: User;
  onRoomSelect?: (room: Room) => void;
}

export function RoomGrid({ currentUser, onRoomSelect }: RoomGridProps) {
  const [rooms, setRooms] = useState<Room[]>(() => getRooms());
  const [bookings, setBookings] = useState<Booking[]>(() => getBookings());
  
  // Multi-selection state
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Load data
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms(getRooms());
      setBookings(getBookings());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Stats Calculation
  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance' || r.status === 'cleaning').length;
    return { total, available, occupied, maintenance };
  }, [rooms]);

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

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available': return 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50';
      case 'occupied': return 'bg-slate-800 border-slate-800 text-white hover:bg-slate-700';
      case 'cleaning': return 'bg-orange-100 border-orange-200 text-orange-800 hover:bg-orange-200';
      case 'maintenance': return 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100';
    }
  };

  const getStatusIcon = (status: Room['status'], type: string) => {
    if (status === 'occupied') return <div className="font-bold text-xs tracking-wider">BUSY</div>;
    if (status === 'cleaning') return <Sparkles className="w-5 h-5" />;
    if (status === 'maintenance') return <Wrench className="w-5 h-5" />;
    
    return type === 'double' 
      ? <div className="flex gap-0.5"><Bed className="w-4 h-4 text-slate-400" /><Bed className="w-4 h-4 text-slate-400" /></div>
      : <BedDouble className="w-6 h-6 text-slate-400" />;
  };

  const RoomButton = ({ room }: { room: any }) => {
    if (!room) return <div className="w-full aspect-square opacity-0" />;
    
    const isSelected = selectedRooms.some(r => r.id === room.id);
    
    return (
      <button
        onClick={() => handleRoomClick(room)}
        className={`
          w-full aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 shadow-sm relative group
          ${getStatusColor(room.status)}
          ${isSelected ? 'ring-4 ring-orange-400/30 ring-offset-2 border-orange-500 z-10 scale-105' : ''}
        `}
      >
        <div className="text-lg font-bold mb-1">{room.label}</div>
        {getStatusIcon(room.status, room.displayType)}
        
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

  // Derived state for the central view
  const singleSelectedRoom = selectedRooms.length === 1 ? selectedRooms[0] : null;
  const isGroupSelection = selectedRooms.length > 1;

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Dashboard Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <StatCard 
          label="ห้องพักทั้งหมด" 
          value={stats.total} 
          icon={BedDouble} 
          color="bg-orange-500" 
          subtext="จำนวนห้องทั้งหมดในระบบ"
        />
        <StatCard 
          label="ห้องว่าง" 
          value={stats.available} 
          icon={Check} 
          color="bg-green-500" 
          subtext="พร้อมให้บริการ"
        />
        <StatCard 
          label="มีผู้เข้าพัก" 
          value={stats.occupied} 
          icon={Users} 
          color="bg-slate-800" 
          subtext="กำลังใช้งานอยู่"
        />
        <StatCard 
          label="ปรับปรุง/ทำความสะอาด" 
          value={stats.maintenance} 
          icon={Wrench} 
          color="bg-orange-400" 
          subtext="ทำความสะอาด หรือ ซ่อมบำรุง"
        />
      </div>

      <div className="flex-1 min-h-0">
        {/* Main Room Layout Map */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xl font-bold text-slate-800">ผังห้องพัก</h3>
            
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
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-800"></span> มีผู้เข้าพัก</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span> ไม่พร้อมใช้งาน</div>
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
                   // SINGLE ROOM VIEW (Existing Logic)
                   <div className="absolute inset-0 bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto w-full">
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl font-bold text-slate-800">{(singleSelectedRoom as any).label}</h2>
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                                  singleSelectedRoom.status === 'available' ? 'bg-green-100 text-green-700' :
                                  singleSelectedRoom.status === 'occupied' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {singleSelectedRoom.status === 'available' ? 'ว่าง' :
                                   singleSelectedRoom.status === 'occupied' ? 'มีผู้เข้าพัก' : 
                                   singleSelectedRoom.status === 'cleaning' ? 'กำลังทำความสะอาด' : 'ปิดปรับปรุง'}
                                </div>
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
                            {/* Action Buttons based on status */}
                            {singleSelectedRoom.status === 'available' && (
                              <div className="bg-green-50 p-8 rounded-3xl border border-green-100 text-center">
                                <h4 className="text-xl font-bold text-green-800 mb-2">ห้องว่างพร้อมบริการ</h4>
                                <p className="text-green-600 mb-6">สามารถทำรายการจองได้ทันที</p>
                                <div className="flex justify-center gap-4">
                                  <button 
                                    onClick={() => setShowBookingModal(true)}
                                    className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 text-lg flex items-center gap-2"
                                  >
                                    <Plus className="w-5 h-5" />
                                    จองห้องนี้
                                  </button>
                                  <button 
                                    onClick={() => { updateRoomStatus(singleSelectedRoom.id, 'maintenance'); setRooms(getRooms()); }}
                                    className="px-6 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all"
                                  >
                                    แจ้งซ่อม
                                  </button>
                                </div>
                              </div>
                            )}

                            {singleSelectedRoom.status === 'occupied' && (() => {
                               const booking = bookings.find(b => b.roomIds.includes(singleSelectedRoom.id) && (b.status === 'checked-in' || b.status === 'reserved'));
                               if (!booking) return null;
                               return (
                                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                                    <div className="flex items-center gap-6 mb-8">
                                       <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-bold">
                                          {booking.guest.name.charAt(0)}
                                       </div>
                                       <div>
                                          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">ผู้เข้าพักปัจจุบัน</div>
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
                                       </div>
                                       <div className="bg-white p-4 rounded-xl border border-slate-100">
                                          <div className="text-slate-400 text-sm mb-1">เช็คเอาท์</div>
                                          <div className="text-xl font-bold text-slate-700">{formatDate(booking.checkOutDate)}</div>
                                       </div>
                                    </div>

                                    <div className="flex gap-4">
                                       <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-200">
                                          ดูบิล / ชำระเงิน
                                       </button>
                                       <button 
                                          onClick={() => { updateRoomStatus(singleSelectedRoom.id, 'cleaning'); setRooms(getRooms()); }}
                                          className="flex-1 py-4 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 rounded-xl font-bold transition-all"
                                       >
                                          เช็คเอาท์
                                       </button>
                                    </div>
                                  </div>
                               );
                            })()}

                            {(singleSelectedRoom.status === 'cleaning' || singleSelectedRoom.status === 'maintenance') && (
                               <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 text-center">
                                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mx-auto mb-4">
                                    <Wrench className="w-8 h-8" />
                                  </div>
                                  <h4 className="text-xl font-bold text-orange-800 mb-2">กำลังดำเนินการ</h4>
                                  <p className="text-orange-600 mb-8">
                                     {singleSelectedRoom.status === 'cleaning' ? 'แม่บ้านกำลังทำความสะอาดห้องนี้' : 'ช่างกำลังซ่อมบำรุงห้องนี้'}
                                  </p>
                                  <button 
                                     onClick={() => { updateRoomStatus(singleSelectedRoom.id, 'available'); setRooms(getRooms()); }}
                                     className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-200 transition-all"
                                  >
                                     เสร็จสิ้นการดำเนินการ
                                  </button>
                               </div>
                            )}
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

                       {selectedRooms.some(r => r.status !== 'available') ? (
                          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 max-w-md w-full mb-6">
                             <p className="font-bold flex items-center justify-center gap-2">
                                <X className="w-5 h-5" />
                                ไม่สามารถจองได้
                             </p>
                             <p className="text-sm mt-1">มีห้องพักบางห้องที่ไม่ว่างหรือกำลังปรับปรุง กรุณาเลือกเฉพาะห้องว่างเพื่อทำการจองแบบกลุ่ม</p>
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
                      src="https://cdn.discordapp.com/attachments/906608190219755631/1452947801762955306/303410614_407072674865676_8245980228075636848_n.png?ex=694cfc16&is=694baa96&hm=9107d4c13a20cf11b655c1155f67a4e65d1c317bfae72a3c5c42816b6103635c&" 
                      className="w-48 h-48 object-contain mx-auto mb-6 grayscale opacity-50"
                      alt="Watermark"
                    />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">เลือกห้องพัก</h3>
                    <p className="font-medium text-slate-500">คลิกที่ห้องพักในแผนผังเพื่อดูรายละเอียดและจัดการ</p>
                  </div>
                )}
              </div>

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
          onSuccess={() => {
            setShowBookingModal(false);
            setSelectedRooms([]); // Clear selection after booking
            setBookings(getBookings());
            setRooms(getRooms());
            alert('บันทึกการจองสำเร็จ / Booking created successfully');
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

function BookingModal({ rooms, onClose, onSuccess, currentUser }: any) {
  const [formData, setFormData] = useState({
    guestName: '',
    idNumber: '',
    phone: '',
    groupName: '',
    checkInDate: getTodayDateString(),
    checkOutDate: '',
  });

  const isGroup = rooms.length > 1;
  const label = isGroup ? `${rooms.length} ห้อง: ${rooms.map((r: any) => r.label).join(', ')}` : rooms[0].label;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestName || !formData.phone || !formData.checkOutDate) return;

    const booking: Booking = {
      id: `BK${Date.now()}`,
      roomIds: rooms.map((r: any) => r.id),
      guest: { name: formData.guestName, idNumber: formData.idNumber || '-', phone: formData.phone },
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
      pricingTier: isGroup ? 'tour' : 'general', // Auto set tour tier for groups?
      baseRate: isGroup ? PRICING['tour'] * rooms.length : PRICING['general'], // Simple calc
      source: 'walk-in',
      status: 'reserved',
      groupName: formData.groupName || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };
    addBooking(booking);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              {isGroup ? 'สร้างการจองแบบกลุ่ม' : 'สร้างการจองใหม่'}
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
                <input 
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  value={formData.guestName}
                  onChange={e => setFormData({...formData, guestName: e.target.value})}
                  placeholder="เช่น สมชาย ใจดี"
                />
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เลขบัตรประชาชน / Passport</label>
                <input 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  value={formData.idNumber}
                  onChange={e => setFormData({...formData, idNumber: e.target.value})}
                  placeholder="ระบุเลขบัตรประชาชน หรือ Passport"
                />
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เบอร์โทรศัพท์</label>
                <input 
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="08x-xxx-xxxx"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เช็คอิน</label>
                  <input 
                    type="date"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.checkInDate}
                    onChange={e => setFormData({...formData, checkInDate: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เช็คเอาท์</label>
                  <input 
                    type="date"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.checkOutDate}
                    min={formData.checkInDate}
                    onChange={e => setFormData({...formData, checkOutDate: e.target.value})}
                  />
               </div>
             </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95">
              ยืนยันการจอง {isGroup && `(${rooms.length} ห้อง)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}