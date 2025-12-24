import { useState } from 'react';
import { Booking, User } from '../types';
import { updateBooking, updateRoomStatus } from '../utils/storage';
import { X } from 'lucide-react';

interface CheckInModalProps {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
  currentUser: User;
}

export function CheckInModal({ booking, onClose, onComplete, currentUser }: CheckInModalProps) {
  const [checkInTime, setCheckInTime] = useState(new Date().toISOString().slice(0, 16));

  const handleCheckIn = () => {
    // Update booking status
    updateBooking(booking.id, {
      status: 'checked-in',
      actualCheckInTime: checkInTime,
    });

    // Update room status to occupied
    booking.roomIds.forEach(roomId => {
      updateRoomStatus(roomId, 'occupied', booking.id);
    });

    alert('✅ เช็คอินสำเร็จ / Check-in successful!');
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-black">เช็คอิน / Check-in</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Guest Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-blue-900 mb-4">ข้อมูลผู้เข้าพัก / Guest Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-blue-700 text-sm">ชื่อ-นามสกุล</div>
                <div className="text-blue-900">{booking.guest.name}</div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">เบอร์โทร</div>
                <div className="text-blue-900">{booking.guest.phone}</div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">เลขบัตร</div>
                <div className="text-blue-900">{booking.guest.idNumber}</div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">เลขการจอง</div>
                <div className="text-blue-900">{booking.id}</div>
              </div>
            </div>
          </div>

          {/* Check-in Time */}
          <div>
            <label className="block text-gray-700 mb-2">เวลาเช็คอินจริง / Actual Check-in Time</label>
            <input
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              * หากเช็คอินก่อนเวลา 14:00 อาจมีค่าธรรมเนียมเพิ่มเติม (฿50/ชั่วโมง)
            </p>
          </div>

          {/* Confirmation Note */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <h3 className="text-yellow-900 mb-2">⚠️ หมายเหตุ / Note</h3>
            <ul className="text-yellow-800 space-y-1 text-sm">
              <li>• ไม่มีเงินมัดจำ / No deposit required</li>
              <li>• ชำระเงินเต็มจำนวนเมื่อเช็คเอาท์ / Full payment at check-out</li>
              <li>• เวลาเช็คเอาท์มาตรฐาน: 12:00 น. / Standard check-out: 12:00 PM</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCheckIn}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl transition-colors"
            >
              ✅ ยืนยันเช็คอิน / Confirm Check-in
            </button>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              ยกเลิก / Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
