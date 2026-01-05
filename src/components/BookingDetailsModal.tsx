import { useState } from 'react';
import { Booking, Charge, User } from '../types';
import { updateBooking } from '../utils/storage';
import { X, Save, Plus, Trash2, FileText, User as UserIcon, Phone, CreditCard, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../utils/dateHelpers';

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
  const [notes, setNotes] = useState(booking.notes || '');
  
  const [additionalCharges, setAdditionalCharges] = useState<Charge[]>(booking.additionalCharges || []);
  
  // New Charge Form
  const [newChargeDesc, setNewChargeDesc] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('other');

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

  const handleSave = () => {
    updateBooking(booking.id, {
      guest: {
        ...booking.guest,
        name: guestName,
        phone: phone,
        idNumber: idNumber,
      },
      notes: notes,
      additionalCharges: additionalCharges
    });
    
    alert('บันทึกข้อมูลเรียบร้อย / Saved successfully');
    onUpdate();
    onClose();
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
        </div>
      </div>
    </div>
  );
}
