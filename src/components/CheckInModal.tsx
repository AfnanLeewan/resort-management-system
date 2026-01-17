import { useState } from 'react';
import { Booking, User } from '../types';
import * as api from '../utils/api';
import { getCurrentLocalDateTime } from '../utils/dateHelpers';
import { X, User as UserIcon, Clock, CreditCard, Info, Loader2 } from 'lucide-react';

interface CheckInModalProps {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
  currentUser: User;
}

export function CheckInModal({ booking, onClose, onComplete, currentUser }: CheckInModalProps) {
  const [checkInTime, setCheckInTime] = useState(getCurrentLocalDateTime());
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      // Update booking status
      await api.updateBooking(booking.id, {
        status: 'checked-in',
        actualCheckInTime: checkInTime,
      });

      // Update room status to occupied
      for (const roomId of booking.roomIds) {
        await api.updateRoomStatus(roomId, 'occupied', booking.id);
      }

      alert('✅ เช็คอินสำเร็จ / Check-in successful!');
      onComplete();
    } catch (err) {
      console.error('Check-in failed:', err);
      alert('❌ ไม่สามารถเช็คอินได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">เช็คอินห้องพัก</h2>
            <p className="text-slate-500 text-sm">Check-in Process</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Guest Info Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserIcon className="w-24 h-24 text-slate-800" />
            </div>
            <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500">
                    <UserIcon className="w-4 h-4" />
                </div>
                ข้อมูลผู้เข้าพัก
            </h3>
            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ชื่อ-นามสกุล</div>
                <div className="text-slate-800 font-bold text-lg">{booking.guest.name}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">เบอร์โทรศัพท์</div>
                <div className="text-slate-800 font-medium">{booking.guest.phone}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">เลขบัตรประชาชน/Passport</div>
                <div className="text-slate-800 font-medium">{booking.guest.idNumber}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">เลขการจอง</div>
                <div className="text-slate-800 font-mono bg-white px-2 py-1 rounded border border-slate-200 w-fit text-sm">{booking.id}</div>
              </div>
            </div>
          </div>

          {/* Check-in Time Input */}
          <div>
            <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                เวลาเช็คอินจริง / Actual Check-in Time
            </label>
            <input
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all text-slate-800 font-medium bg-slate-50"
            />
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              หากเช็คอินก่อนเวลา 14:00 อาจมีค่าธรรมเนียมเพิ่มเติม (฿50/ชม. หรือเต็มวันหากเกิน 6 ชม.)
            </p>
          </div>

          {/* Policy Note */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
            <h3 className="text-orange-800 font-bold mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                ข้อกำหนดการเข้าพัก
            </h3>
            <ul className="text-orange-700 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                ไม่มีเงินมัดจำ (No deposit required)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                ชำระเงินเต็มจำนวนเมื่อเช็คเอาท์ (Full payment at check-out)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                เวลาเช็คเอาท์มาตรฐาน: 12:00 น.
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleCheckIn}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              ยืนยันเช็คอิน
            </button>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold transition-all"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    )
}
