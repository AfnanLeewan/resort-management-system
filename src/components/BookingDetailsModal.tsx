import { useState, useEffect, useMemo } from 'react';
import { Booking, Charge, User, Room } from '../types';
import * as api from '../utils/api';
import { X, Save, Plus, Trash2, FileText, User as UserIcon, Phone, CreditCard, ShoppingBag, MapPin, Banknote, Loader2, MinusCircle, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../utils/dateHelpers';
import { calculateNights } from '../utils/pricing';
import { formatRoomName } from '../utils/roomHelpers';

interface BookingDetailsModalProps {
   booking: Booking;
   onClose: () => void;
   onUpdate: () => void;
   currentUser: User;
}

export function BookingDetailsModal({ booking, onClose, onUpdate, currentUser }: BookingDetailsModalProps) {
  const [guestName, setGuestName] = useState(booking.guest.name);
  const [phone, setPhone] = useState(booking.guest.phone);
  const [idNumber, setIdNumber] = useState(booking.guest.idNumber);
  const [address, setAddress] = useState(booking.guest.address || '');
  const [deposit, setDeposit] = useState(booking.deposit?.toString() || '');
  const [notes, setNotes] = useState(booking.notes || '');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [selectedRoomsToCancel, setSelectedRoomsToCancel] = useState<string[]>([]);

  useEffect(() => {
    api.getRooms().then(setAllRooms).catch(console.error);
  }, []);

  const labeledBookingRooms = useMemo(() => {
    const sorted = [...allRooms].sort((a, b) => a.number - b.number);
    const rc = sorted.slice(0, 10).map((r, i) => ({ ...r, label: `RC${String(i + 1).padStart(2, '0')}` }));
    const rb = sorted.slice(10, 20).map((r, i) => ({ ...r, label: `RB${String(i + 1).padStart(2, '0')}` }));
    const ra = sorted.slice(20, 30).map((r, i) => ({ ...r, label: `RA${String(i + 1).padStart(2, '0')}` }));
    return [...rc, ...rb, ...ra].filter(r => booking.roomIds.includes(r.id));
  }, [allRooms, booking.roomIds]);

  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);

  const toggleRoomToCancel = (roomId: string) => {
    setSelectedRoomsToCancel(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handlePartialCancel = async () => {
    if (selectedRoomsToCancel.length === 0) return;
    if (selectedRoomsToCancel.length >= booking.roomIds.length) {
      alert('ไม่สามารถยกเลิกห้องทั้งหมดได้ กรุณาใช้ปุ่มยกเลิกการจองแทน');
      return;
    }

    const roomLabels = selectedRoomsToCancel
      .map(id => labeledBookingRooms.find(r => r.id === id)?.label ?? id)
      .join(', ');

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะยกเลิกห้อง ${roomLabels}?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    setCancelling(true);
    try {
      await api.partialCancelRooms(booking.id, selectedRoomsToCancel);
      alert(`✅ ยกเลิกห้อง ${roomLabels} เรียบร้อยแล้ว`);
      setSelectedRoomsToCancel([]);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to partially cancel rooms:', err);
      alert('❌ ไม่สามารถยกเลิกห้องพักได้');
    } finally {
      setCancelling(false);
    }
  };

  const [additionalCharges, setAdditionalCharges] = useState<Charge[]>(booking.additionalCharges || []);

  // New Charge Form
  const [newChargeDesc, setNewChargeDesc] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('other');

  // Room guests
  const [roomGuests, setRoomGuests] = useState<Record<string, Partial<User>>>(booking.roomGuests || {});

  // Change room state
  const [isChangingRoom, setIsChangingRoom] = useState(false);
  const [changingRoomId, setChangingRoomId] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoomId, setSelectedNewRoomId] = useState('');

   const loadAvailableRooms = async () => {
      try {
         const rooms = await api.getRooms();
         setAllRooms(rooms);
         setAvailableRooms(rooms.filter(r => r.status === 'available' || r.status === 'cleaning'));
      } catch (err) {
         console.error('Failed to load rooms:', err);
      }
   };

   const handleChangeRoomClick = (roomId: string) => {
      setChangingRoomId(roomId);
      setIsChangingRoom(true);
      loadAvailableRooms();
   };

   const handleConfirmChangeRoom = async () => {
      if (!changingRoomId || !selectedNewRoomId) return;

      try {
         await api.changeBookingRoom(booking.id, changingRoomId, selectedNewRoomId, booking.status);
         alert('เปลี่ยนห้องเรียบร้อย / Room changed successfully');
         setIsChangingRoom(false);
         setChangingRoomId(null);
         setSelectedNewRoomId('');
         onUpdate();
         onClose(); // Close modal to refresh data cleanly
      } catch (err) {
         console.error('Failed to change room:', err);
         alert('❌ ไม่สามารถเปลี่ยนห้องได้');
      }
   };

   const PRESET_SERVICES = [
      { id: 'extra-bed', name: 'เตียงเสริม', price: 150 },
      { id: 'charcoal', name: 'ถ่านก่อไฟ', price: 25 },
      { id: 'grill', name: 'เตาปิ้งย่าง', price: 0 },
      { id: 'other', name: 'อื่นๆ', price: null },
   ];

   const handlePresetChangeWithState = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const serviceId = e.target.value;
      setSelectedPreset(serviceId);

      const service = PRESET_SERVICES.find(s => s.id === serviceId);
      if (service) {
         if (service.id === 'other') {
            setNewChargeDesc('');
            setNewChargeAmount('');
         } else {
            setNewChargeDesc(service.name);
            setNewChargeAmount(service.price?.toString() || '0');
         }
      }
   };

   const handleAddChargeWithReset = () => {
      if (!newChargeDesc || newChargeAmount === '') return;

      const amount = parseFloat(newChargeAmount);
      if (isNaN(amount) || amount < 0) return;

      const newCharge: Charge = {
         id: `CHG-${Date.now()}`,
         bookingId: booking.id,
         type: 'other',
         description: newChargeDesc,
         amount: amount,
      };

      setAdditionalCharges([...additionalCharges, newCharge]);
      setNewChargeDesc('');
      setNewChargeAmount('');
      setSelectedPreset('other');
   };

   const handleRemoveCharge = (id: string) => {
      setAdditionalCharges(additionalCharges.filter(c => c.id !== id));
   };

   const handleSave = async () => {
      setSaving(true);
      try {
         await api.updateBooking(booking.id, {
            guest: {
               ...booking.guest,
               name: guestName,
               phone: phone,
               idNumber: idNumber,
               address: address,
            },
            deposit: deposit ? parseFloat(deposit) : 0,
            notes: notes,
            additionalCharges: additionalCharges,
            roomGuests: roomGuests
         });

         alert('บันทึกข้อมูลเรียบร้อย / Saved successfully');
         onUpdate();
         onClose();
      } catch (err) {
         console.error('Failed to save booking:', err);
         alert('❌ ไม่สามารถบันทึกข้อมูลได้');
      } finally {
         setSaving(false);
      }
   };

   return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
         <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">รายละเอียดการจอง</h2>
                  <p className="text-slate-500 text-sm">Booking Details & Services</p>
               </div>
               <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
               >
                  <X className="w-6 h-6" />
               </button>
            </div>

            <div className="p-8 space-y-8">
               {/* Guest Information */}
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                     <UserIcon className="w-5 h-5 text-orange-500" />
                     แก้ไขข้อมูลผู้เข้าพัก
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ชื่อ-นามสกุล</label>
                        <div className="relative">
                           <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">เบอร์โทรศัพท์</label>
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">เลขบัตร/Passport</label>
                        <div className="relative">
                           <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ที่อยู่</label>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">เงินมัดจำ</label>
                        <div className="relative">
                           <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              type="number"
                              min="0"
                              value={deposit}
                              onChange={(e) => setDeposit(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white font-mono font-bold text-slate-700"
                              placeholder="0.00"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">หมายเหตุ</label>
                        <div className="relative">
                           <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
                              placeholder="เช่น เตียงเสริม, แพ้อาหาร"
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Assigned Rooms & Guests */}
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                     <MapPin className="w-5 h-5 text-cyan-500" />
                     ห้องที่เข้าพัก
                  </h3>
                  <div className="space-y-4">
                     {booking.roomIds.map(roomId => {
                        let roomLabel = roomId; // Fallback
                        const roomNum = parseInt(roomId.replace(/\D/g, ''));
                        if (!isNaN(roomNum)) {
                           roomLabel = roomNum <= 20 ? `ห้องเดี่ยว (Single) - 1 Bed, RM${roomNum}` : `ห้องคู่ (Double) - 2 Beds, RM${roomNum}`;
                        }

                        return (
                           <div key={roomId} className="bg-white p-4 rounded-xl border border-slate-200">
                              <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                                 <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                                    {roomLabel}
                                 </span>
                                 <button
                                    onClick={() => handleChangeRoomClick(roomId)}
                                    className="flex items-center gap-1 text-sm font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
                                 >
                                    <ArrowRightLeft className="w-4 h-4" />
                                    เปลี่ยนห้อง (Change)
                                 </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-cyan-100">
                                 <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อผู้เข้าพักประจำห้อง</label>
                                    <input
                                       value={roomGuests[roomId]?.name || ''}
                                       onChange={(e) => setRoomGuests({ ...roomGuests, [roomId]: { ...roomGuests[roomId], name: e.target.value } })}
                                       placeholder="ระบุชื่อ (ถ้ามี)..."
                                       className="w-full text-sm py-1.5 px-3 border border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-100 outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">เบอร์โทรประจำห้อง</label>
                                    <input
                                       value={roomGuests[roomId]?.phone || ''}
                                       onChange={(e) => setRoomGuests({ ...roomGuests, [roomId]: { ...roomGuests[roomId], phone: e.target.value } })}
                                       placeholder="08x-xxx-xxxx"
                                       className="w-full text-sm py-1.5 px-3 border border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-100 outline-none"
                                    />
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* Change Room Modal Overlay */}
               {isChangingRoom && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60]">
                     <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">เลือกห้องใหม่</h3>
                        <div className="mb-4">
                           <p className="text-sm text-slate-500 mb-2">ย้ายจากห้อง: <span className="font-bold text-slate-700">{allRooms.find(r => r.id === changingRoomId) ? formatRoomName(allRooms.find(r => r.id === changingRoomId)!.number) : changingRoomId}</span></p>
                           <select
                              value={selectedNewRoomId}
                              onChange={(e) => setSelectedNewRoomId(e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none"
                           >
                              <option value="">-- เลือกห้องว่าง --</option>
                              {availableRooms.map(r => (
                                 <option key={r.id} value={r.id}>
                                    {formatRoomName(r.number)} - {r.type === 'single' ? 'Single' : 'Double'} ({r.status})
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                           <button onClick={() => setIsChangingRoom(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">ยกเลิก</button>
                           <button
                              onClick={handleConfirmChangeRoom}
                              disabled={!selectedNewRoomId}
                              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md"
                           >
                              ยืนยันการเปลี่ยนห้อง
                           </button>
                        </div>
                     </div>
                  </div>
               )}

               {/* Additional Services */}
               <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-slate-800 font-bold flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-purple-500" />
                        บริการเสริม & ค่าใช้จ่ายอื่นๆ
                     </h3>
                  </div>

                  {/* Add New Charge Form */}
                  <div className="flex flex-col gap-3 mb-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                     <div className="flex gap-2">
                        <select
                           value={selectedPreset}
                           onChange={handlePresetChangeWithState}
                           className="w-1/3 px-4 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none bg-white text-slate-700 font-medium"
                        >
                           {PRESET_SERVICES.map(service => (
                              <option key={service.id} value={service.id}>
                                 {service.name} {service.price !== null ? `(${service.price}฿)` : ''}
                              </option>
                           ))}
                        </select>
                        <input
                           value={newChargeDesc}
                           onChange={(e) => setNewChargeDesc(e.target.value)}
                           placeholder="รายละเอียดรายการ (เช่น เตียงเสริม)"
                           className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none bg-white"
                        />
                     </div>
                     <div className="flex gap-2 items-center justify-end">
                        <label className="text-sm font-bold text-slate-600 mr-2">ราคา (บาท):</label>
                        <input
                           type="number"
                           value={newChargeAmount}
                           onChange={(e) => setNewChargeAmount(e.target.value)}
                           placeholder="0.00"
                           className="w-32 px-4 py-2 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-right font-mono font-bold text-purple-700 bg-white"
                        />
                        <button
                           onClick={handleAddChargeWithReset}
                           className="ml-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex items-center gap-2 font-bold shadow-md shadow-purple-200"
                        >
                           <Plus className="w-4 h-4" />
                           เพิ่มรายการ
                        </button>
                     </div>
                  </div>

                  {/* Charges List */}
                  {additionalCharges.length > 0 ? (
                     <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-100">
                              <tr>
                                 <th className="px-4 py-2 text-left text-slate-500">รายการ</th>
                                 <th className="px-4 py-2 text-right text-slate-500">ราคา</th>
                                 <th className="px-4 py-2 w-10"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {additionalCharges.map((charge) => (
                                 <tr key={charge.id}>
                                    <td className="px-4 py-3 text-slate-700 font-medium">{charge.description}</td>
                                    <td className="px-4 py-3 text-right text-slate-700 font-mono">{formatCurrency(charge.amount)}</td>
                                    <td className="px-4 py-3 text-center">
                                       <button
                                          onClick={() => handleRemoveCharge(charge.id)}
                                          className="text-slate-400 hover:text-red-500 transition-colors"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                              <tr className="bg-slate-100/50 font-bold">
                                 <td className="px-4 py-3 text-slate-600 text-right">รวมบริการเสริม</td>
                                 <td className="px-4 py-3 text-right text-purple-700 font-mono text-base">
                                    {formatCurrency(additionalCharges.reduce((sum, c) => sum + c.amount, 0))}
                                 </td>
                                 <td></td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  ) : (
                     <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        ไม่มีรายการเพิ่มเติม
                     </div>
                  )}
               </div>

               <div className="flex gap-4 pt-6 border-t border-slate-100">
                  <button
                     onClick={handleSave}
                     className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                     <Save className="w-5 h-5" />
                     บันทึกการเปลี่ยนแปลง
                  </button>
               </div>

          {/* Partial Room Cancellation */}
          {booking.roomIds.length > 1 && (booking.status === 'reserved' || booking.status === 'checked-in') && (
            <div className="pt-6 border-t border-slate-100 mt-2">
              <h3 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-orange-500" />
                ยกเลิกห้องพักบางส่วน (Partial Room Cancellation)
              </h3>
              <p className="text-sm text-slate-500 mb-4">เลือกห้องที่ต้องการยกเลิก — ต้องเหลืออย่างน้อย 1 ห้อง</p>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                {labeledBookingRooms.map(room => {
                  const isSelected = selectedRoomsToCancel.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => toggleRoomToCancel(room.id)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${
                        isSelected
                          ? 'bg-red-500 text-white border-red-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-500'
                      }`}
                    >
                      {room.label}
                    </button>
                  );
                })}
              </div>

              {selectedRoomsToCancel.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 mb-4 text-sm">
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>ห้องเดิม</span>
                      <span className="font-bold">{booking.roomIds.length} ห้อง</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>ยกเลิก</span>
                      <span className="font-bold">−{selectedRoomsToCancel.length} ห้อง</span>
                    </div>
                    <div className="flex justify-between border-t border-orange-200 pt-1 font-bold text-slate-800">
                      <span>คงเหลือ</span>
                      <span>{booking.roomIds.length - selectedRoomsToCancel.length} ห้อง</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200 space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>ยอดเดิม ({booking.roomIds.length} ห้อง × {nights} คืน @ ฿{booking.baseRate})</span>
                      <span className="line-through">{formatCurrency(booking.baseRate * nights * booking.roomIds.length)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>ยอดใหม่ ({booking.roomIds.length - selectedRoomsToCancel.length} ห้อง × {nights} คืน)</span>
                      <span className="text-green-700">{formatCurrency(booking.baseRate * nights * (booking.roomIds.length - selectedRoomsToCancel.length))}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePartialCancel}
                disabled={selectedRoomsToCancel.length === 0 || cancelling}
                className="w-full py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-5 h-5" />}
                ยกเลิก {selectedRoomsToCancel.length > 0 ? `${selectedRoomsToCancel.length} ห้องที่เลือก` : 'ห้องที่เลือก'}
              </button>
            </div>
          )}

            </div>

          {/* Danger Zone */}
          {booking.status === 'reserved' && (
             <div className="pt-6 border-t border-slate-100 mt-2">
                <button
                   onClick={async () => {
                      if (confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                         try {
                            await api.updateBooking(booking.id, { status: 'cancelled' });
                            alert('ยกเลิกการจองเรียบร้อยแล้ว');
                            onUpdate();
                            onClose();
                         } catch (err) {
                            console.error('Failed to cancel booking:', err);
                            alert('❌ ไม่สามารถยกเลิกการจองได้');
                         }
                      }
                   }}
                   className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-100"
                >
                   <Trash2 className="w-5 h-5" />
                   ยกเลิกการจอง (Cancel Booking)
                </button>
             </div>
          )}
        </div>
      </div>
   );
}
