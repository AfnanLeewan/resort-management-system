import { useState, useMemo } from 'react';
import { Booking, User, Payment, Charge } from '../types';
import { updateBooking, updateRoomStatus, addPayment, getRooms, getNextReceiptNumber, getNextInvoiceNumber } from '../utils/storage';
import { calculateNights, calculateHoursDifference, calculateVAT, calculateTotal, getBaseRate } from '../utils/pricing';
import { formatCurrency, formatDateTime } from '../utils/dateHelpers';
import { X, Printer } from 'lucide-react';

interface CheckOutModalProps {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
  currentUser: User;
}

export function CheckOutModal({ booking, onClose, onComplete, currentUser }: CheckOutModalProps) {
  const [checkOutTime, setCheckOutTime] = useState(new Date().toISOString().slice(0, 16));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qr'>('cash');
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const rooms = getRooms();
  const bookingRooms = rooms.filter(r => booking.roomIds.includes(r.id));
  const roomNumbers = bookingRooms.map(r => r.number).join(', ');

  // Calculate charges
  const charges = useMemo<Charge[]>(() => {
    const chargeList: Charge[] = [];
    const nights = calculateNights(booking.checkInDate, booking.checkOutDate);

    // Room charges
    booking.roomIds.forEach((roomId, index) => {
      const room = rooms.find(r => r.id === roomId);
      chargeList.push({
        id: `charge-room-${index}`,
        bookingId: booking.id,
        type: 'room',
        description: `ห้อง ${room?.number} - ${nights} คืน @ ฿${booking.baseRate}`,
        amount: booking.baseRate * nights,
      });
    });

    // Early check-in penalty (if checked in before 14:00)
    if (booking.actualCheckInTime) {
      const scheduledCheckIn = new Date(`${booking.checkInDate}T14:00:00`);
      const actualCheckIn = new Date(booking.actualCheckInTime);
      if (actualCheckIn < scheduledCheckIn) {
        const hoursEarly = calculateHoursDifference(booking.actualCheckInTime, scheduledCheckIn.toISOString());
        if (hoursEarly > 0) {
          chargeList.push({
            id: `charge-early-checkin`,
            bookingId: booking.id,
            type: 'early-checkin',
            description: `เช็คอินก่อนเวลา ${hoursEarly} ชั่วโมง @ ฿50/ชม.`,
            amount: hoursEarly * 50,
          });
        }
      }
    }

    // Late check-out penalty (if checking out after 12:00)
    const scheduledCheckOut = new Date(`${booking.checkOutDate}T12:00:00`);
    const actualCheckOut = new Date(checkOutTime);
    if (actualCheckOut > scheduledCheckOut) {
      const hoursLate = calculateHoursDifference(scheduledCheckOut.toISOString(), checkOutTime);
      if (hoursLate > 0) {
        chargeList.push({
          id: `charge-late-checkout`,
          bookingId: booking.id,
          type: 'late-checkout',
          description: `เช็คเอาท์ช้า ${hoursLate} ชั่วโมง @ ฿50/ชม.`,
          amount: hoursLate * 50,
        });
      }
    }

    // Discount (only if authorized)
    if (discount > 0 && (currentUser.role === 'board' || currentUser.role === 'management')) {
      chargeList.push({
        id: `charge-discount`,
        bookingId: booking.id,
        type: 'discount',
        description: `ส่วนลด: ${discountReason || 'ไม่ระบุ'}`,
        amount: -discount,
        authorizedBy: currentUser.id,
      });
    }

    return chargeList;
  }, [booking, rooms, checkOutTime, discount, discountReason, currentUser]);

  const subtotal = useMemo(() => {
    return charges.reduce((sum, charge) => sum + charge.amount, 0);
  }, [charges]);

  const vat = useMemo(() => calculateVAT(subtotal), [subtotal]);
  const total = useMemo(() => calculateTotal(subtotal), [subtotal]);

  const canApplyDiscount = currentUser.role === 'board' || currentUser.role === 'management';

  const handlePayment = () => {
    if (!confirm(`ยืนยันการชำระเงิน ${formatCurrency(total)} ?`)) {
      return;
    }

    // Create payment record
    const payment: Payment = {
      id: `PAY${Date.now()}`,
      bookingId: booking.id,
      amount: total,
      method: paymentMethod,
      receiptNumber: getNextReceiptNumber(),
      invoiceNumber: getNextInvoiceNumber(),
      paidAt: new Date().toISOString(),
      paidBy: currentUser.id,
      charges,
      subtotal,
      vat,
      total,
    };

    // Save payment
    addPayment(payment);

    // Update booking status
    updateBooking(booking.id, {
      status: 'checked-out',
      actualCheckOutTime: checkOutTime,
    });

    // Update room status to cleaning
    booking.roomIds.forEach(roomId => {
      updateRoomStatus(roomId, 'cleaning');
    });

    // Show receipt
    setReceipt(payment);
    setShowReceipt(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleComplete = () => {
    alert('✅ เช็คเอาท์สำเร็จ / Check-out successful!');
    onComplete();
  };

  if (showReceipt && receipt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-8 py-6 flex items-center justify-between">
            <h2 className="text-black">ใบเสร็จ / Receipt</h2>
            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Printer className="w-5 h-5" />
                <span>พิมพ์ / Print</span>
              </button>
              <button
                onClick={handleComplete}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
              >
                ✅ เสร็จสิ้น
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6" id="receipt-content">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-200 pb-6">
              <h1 className="text-black mb-2">Royyan Resort</h1>
              <p className="text-gray-600">ใบเสร็จรับเงิน / Tax Invoice & Receipt</p>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-gray-600 text-sm">เลขที่ใบเสร็จ / Receipt No.</div>
                <div className="text-gray-900">{receipt.receiptNumber}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">เลขที่ใบกำกับภาษี / Invoice No.</div>
                <div className="text-gray-900">{receipt.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">วันที่ / Date</div>
                <div className="text-gray-900">{formatDateTime(receipt.paidAt)}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">เลขที่การจอง / Booking ID</div>
                <div className="text-gray-900">{booking.id}</div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <h3 className="text-gray-900 mb-4">ข้อมูลผู้เข้าพัก / Guest Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-600 text-sm">ชื่อ-นามสกุล</div>
                  <div className="text-gray-900">{booking.guest.name}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">เบอร์โทร</div>
                  <div className="text-gray-900">{booking.guest.phone}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">เลขบัตร</div>
                  <div className="text-gray-900">{booking.guest.idNumber}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">ห้องพัก</div>
                  <div className="text-gray-900">{roomNumbers}</div>
                </div>
              </div>
            </div>

            {/* Charges */}
            <div>
              <h3 className="text-gray-900 mb-4">รายการค่าใช้จ่าย / Charges</h3>
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-700">รายการ / Description</th>
                    <th className="px-4 py-3 text-right text-gray-700">จำนวน / Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {receipt.charges.map((charge, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">{charge.description}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(charge.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-right text-gray-700">ยอดรวมก่อน VAT / Subtotal:</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(receipt.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-right text-gray-700">VAT 7%:</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(receipt.vat)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-4 text-right text-gray-900">ยอดรวมทั้งสิ้น / Total:</td>
                    <td className="px-4 py-4 text-right text-black">{formatCurrency(receipt.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Method */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="text-blue-700 text-sm">วิธีการชำระเงิน / Payment Method</div>
              <div className="text-blue-900">
                {receipt.method === 'cash' && '💵 เงินสด / Cash'}
                {receipt.method === 'transfer' && '🏦 โอนเงิน / Bank Transfer'}
                {receipt.method === 'qr' && '📱 QR Code'}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm border-t-2 border-gray-200 pt-6">
              <p>ขอบคุณที่ใช้บริการ Royyan Resort</p>
              <p>Thank you for staying with us!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-black">เช็คเอาท์และชำระเงิน / Check-out & Payment</h2>
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
            <h3 className="text-blue-900 mb-4">ข้อมูลการจอง / Booking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-blue-700 text-sm">ชื่อ-นามสกุล</div>
                <div className="text-blue-900">{booking.guest.name}</div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">ห้องพัก</div>
                <div className="text-blue-900">{roomNumbers}</div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">เช็คอินจริง</div>
                <div className="text-blue-900">
                  {booking.actualCheckInTime ? formatDateTime(booking.actualCheckInTime) : '-'}
                </div>
              </div>
              <div>
                <div className="text-blue-700 text-sm">ประเภทลูกค้า</div>
                <div className="text-blue-900">
                  {booking.pricingTier === 'general' && 'ทั่วไป (฿890)'}
                  {booking.pricingTier === 'tour' && 'ทัวร์ (฿840)'}
                  {booking.pricingTier === 'vip' && 'VIP (฿400)'}
                </div>
              </div>
            </div>
          </div>

          {/* Check-out Time */}
          <div>
            <label className="block text-gray-700 mb-2">เวลาเช็คเอาท์จริง / Actual Check-out Time</label>
            <input
              type="datetime-local"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              * เช็คเอาท์หลัง 12:00 น. มีค่าธรรมเนียม ฿50/ชั่วโมง
            </p>
          </div>

          {/* Charges Summary */}
          <div className="border-2 border-gray-200 rounded-xl p-6">
            <h3 className="text-gray-900 mb-4">รายการค่าใช้จ่าย / Charges</h3>
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                {charges.map((charge, index) => (
                  <tr key={index}>
                    <td className="py-3 text-gray-900">{charge.description}</td>
                    <td className="py-3 text-right text-gray-900">{formatCurrency(charge.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr>
                  <td className="py-3 text-gray-700">ยอดรวมก่อน VAT / Subtotal:</td>
                  <td className="py-3 text-right text-gray-900">{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">VAT 7%:</td>
                  <td className="py-3 text-right text-gray-900">{formatCurrency(vat)}</td>
                </tr>
                <tr className="border-t-2 border-gray-300">
                  <td className="py-4 text-gray-900">ยอดรวมทั้งสิ้น / Total:</td>
                  <td className="py-4 text-right text-black">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Discount (Board/Management only) */}
          {canApplyDiscount && (
            <div className="border-2 border-yellow-300 bg-yellow-50 rounded-xl p-6">
              <h3 className="text-yellow-900 mb-4">🔐 ส่วนลด / Discount (ต้องได้รับอนุมัติ)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-yellow-800 mb-2">จำนวนส่วนลด / Discount Amount (฿)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-yellow-800 mb-2">เหตุผล / Reason</label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:border-yellow-500 focus:outline-none"
                    placeholder="ระบุเหตุผล"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-gray-700 mb-3">วิธีการชำระเงิน / Payment Method</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="mb-2">💵</div>
                  <div>เงินสด / Cash</div>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="mb-2">🏦</div>
                  <div>โอนเงิน / Transfer</div>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('qr')}
                className={`p-6 border-2 rounded-xl transition-all ${
                  paymentMethod === 'qr'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="mb-2">📱</div>
                  <div>QR Code</div>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handlePayment}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl transition-colors"
            >
              💳 รับชำระเงิน {formatCurrency(total)}
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
