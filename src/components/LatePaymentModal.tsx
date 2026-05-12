import { useState, useMemo, useEffect } from 'react';
import { Booking, User, Payment, Charge, Room } from '../types';
import * as api from '../utils/api';
import { calculateNights, calculateHoursDifference, extractVAT, extractBasePrice, calculateEarlyCheckInCharge, calculateLateCheckOutCharge } from '../utils/pricing';
import { formatCurrency, formatDateTime, getCurrentLocalDateTime } from '../utils/dateHelpers';
import { X, Printer, CreditCard, Banknote, Smartphone, FileText, User as UserIcon, Building, Loader2, Plus, Trash2, Clock, Info } from 'lucide-react';
import logo from "../assets/Royyan_logo.JPG";

interface LatePaymentModalProps {
  booking: Booking;
  onClose: () => void;
  onComplete: () => void;
  currentUser: User;
}

const getChargeLabel = (type: string) => {
  switch (type) {
    case 'service': return 'บริการ';
    case 'food': return 'อาหาร/เครื่องดื่ม';
    case 'room': return 'เตียงเสริม';
    default: return 'อื่นๆ';
  }
};

export function LatePaymentModal({ booking, onClose, onComplete, currentUser }: LatePaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState(getCurrentLocalDateTime());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qr'>('cash');
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [penalty, setPenalty] = useState(0);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [extraCharges, setExtraCharges] = useState<{ type: string; description: string; amount: number }[]>([]);
  const [newExtraCharge, setNewExtraCharge] = useState({ type: 'other', description: '', amount: 0 });

  const handleAddExtraCharge = () => {
    if (!newExtraCharge.description || newExtraCharge.amount <= 0) return;
    setExtraCharges([...extraCharges, { ...newExtraCharge }]);
    setNewExtraCharge({ type: 'other', description: '', amount: 0 });
  };

  const handleRemoveExtraCharge = (index: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const loadedRooms = await api.getRooms();
        setRooms(loadedRooms);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, []);

  const bookingRooms = rooms.filter(r => booking.roomIds.includes(r.id));
  const roomNumbers = bookingRooms.map(r => r.number).join(', ');

  // Use actual checkout time from booking (already checked out) or fall back to scheduled checkout
  const effectiveCheckOutTime = booking.actualCheckOutTime || `${booking.checkOutDate}T12:00:00`;

  const charges = useMemo<Charge[]>(() => {
    const chargeList: Charge[] = [];
    const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
    const numberOfRooms = booking.roomIds.length;
    const perRoomRate = booking.baseRate;

    booking.roomIds.forEach((roomId, index) => {
      const room = rooms.find(r => r.id === roomId);
      chargeList.push({
        id: `charge-room-${index}`,
        bookingId: booking.id,
        type: 'room',
        description: `ห้อง ${room?.number ?? '-'} - ${nights} คืน @ ฿${perRoomRate}`,
        amount: perRoomRate * nights,
      });
    });

    if (booking.actualCheckInTime) {
      const scheduledCheckIn = new Date(`${booking.checkInDate}T14:00:00`);
      const actualCheckIn = new Date(booking.actualCheckInTime);
      if (actualCheckIn < scheduledCheckIn) {
        const hoursEarly = calculateHoursDifference(booking.actualCheckInTime, scheduledCheckIn.toISOString());
        if (hoursEarly > 0) {
          const perRoomEarlyCharge = calculateEarlyCheckInCharge(hoursEarly, perRoomRate);
          const totalEarlyCharge = perRoomEarlyCharge * numberOfRooms;
          const description = hoursEarly > 6
            ? `เช็คอินก่อนเวลา ${hoursEarly} ชั่วโมง (คิดเต็มวัน) x ${numberOfRooms} ห้อง`
            : `เช็คอินก่อนเวลา ${hoursEarly} ชั่วโมง @ ฿50/ชม. x ${numberOfRooms} ห้อง`;
          chargeList.push({
            id: `charge-early-checkin`,
            bookingId: booking.id,
            type: 'early-checkin',
            description,
            amount: totalEarlyCharge,
          });
        }
      }
    }

    const scheduledCheckOut = new Date(`${booking.checkOutDate}T12:00:00`);
    const actualCheckOut = new Date(effectiveCheckOutTime);
    if (actualCheckOut > scheduledCheckOut) {
      const hoursLate = calculateHoursDifference(scheduledCheckOut.toISOString(), effectiveCheckOutTime);
      if (hoursLate > 0) {
        const perRoomLateCharge = calculateLateCheckOutCharge(hoursLate, perRoomRate);
        const totalLateCharge = perRoomLateCharge * numberOfRooms;
        const description = hoursLate > 6
          ? `เช็คเอาท์ช้า ${hoursLate} ชั่วโมง (คิดเต็มวัน) x ${numberOfRooms} ห้อง`
          : `เช็คเอาท์ช้า ${hoursLate} ชั่วโมง @ ฿50/ชม. x ${numberOfRooms} ห้อง`;
        chargeList.push({
          id: `charge-late-checkout`,
          bookingId: booking.id,
          type: 'late-checkout',
          description,
          amount: totalLateCharge,
        });
      }
    }

    if (booking.additionalCharges && booking.additionalCharges.length > 0) {
      chargeList.push(...booking.additionalCharges);
    }

    if (booking.deposit && booking.deposit > 0) {
      chargeList.push({
        id: `charge-deposit`,
        bookingId: booking.id,
        type: 'other',
        description: `หักเงินมัดจำ (Deposit)`,
        amount: -booking.deposit,
      });
    }

    if (penalty > 0) {
      chargeList.push({
        id: `charge-penalty`,
        bookingId: booking.id,
        type: 'other',
        description: `ค่าปรับ/เสียหาย: ${penaltyReason || 'ไม่ระบุ'}`,
        amount: penalty,
      });
    }

    extraCharges.forEach((charge, index) => {
      let dbType = 'other';
      if (charge.type === 'room') dbType = 'room';
      chargeList.push({
        id: `charge-extra-${index}`,
        bookingId: booking.id,
        type: dbType as any,
        description: charge.type !== 'other' && charge.type !== 'room'
          ? `[${getChargeLabel(charge.type)}] ${charge.description}`
          : charge.description,
        amount: charge.amount,
      });
    });

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
  }, [booking, rooms, effectiveCheckOutTime, discount, discountReason, penalty, penaltyReason, currentUser, extraCharges]);

  const total = useMemo(() => charges.reduce((sum, c) => sum + c.amount, 0), [charges]);
  const vat = useMemo(() => extractVAT(total), [total]);
  const subtotal = useMemo(() => extractBasePrice(total), [total]);
  const canApplyDiscount = currentUser.role === 'board' || currentUser.role === 'management';

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const [receiptNumber, invoiceNumber] = await Promise.all([
        api.getNextReceiptNumber(),
        api.getNextInvoiceNumber(),
      ]);

      // Use selected payment date (retroactive)
      const paidAt = new Date(paymentDate).toISOString();

      const payment: Payment = {
        id: `PAY${Date.now()}`,
        bookingId: booking.id,
        amount: total,
        method: paymentMethod,
        receiptNumber,
        invoiceNumber,
        paidAt,
        paidBy: currentUser.id,
        charges,
        subtotal,
        vat,
        total,
      };

      await api.addPayment(payment);
      setReceipt(payment);
      setShowReceipt(true);
    } catch (err) {
      console.error('Late payment failed:', err);
      alert('❌ ไม่สามารถบันทึกการชำระเงินได้');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="text-slate-700 font-medium">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (showReceipt && receipt) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">ใบกำกับภาษีและใบเสร็จรับเงิน (ย้อนหลัง)</h2>
              <p className="text-slate-500 text-sm">Retroactive Receipt & Tax Invoice</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-colors font-bold shadow-lg shadow-slate-200"
              >
                <Printer className="w-5 h-5" />
                <span>พิมพ์</span>
              </button>
              <button
                onClick={() => { onComplete(); }}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-colors font-bold shadow-lg shadow-green-200"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>

          <div className="p-8 space-y-8" id="receipt-content">
            {/* Header */}
            <div className="text-center pb-6 border-b border-slate-100 space-y-1">
              <div className="flex justify-center mb-4">
                <img src={logo} alt="Royyan Resort Logo" className="h-24 w-auto object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">รอยยาน รีสอร์ท</h1>
              <h2 className="text-xl font-bold text-slate-900 mb-2">ROYYAN RESORT</h2>
              <div className="text-sm font-bold text-slate-800">บริษัท รอยยาน คอร์ปอเรชั่น (ไทยแลนด์) จำกัด</div>
              <div className="text-sm font-bold text-slate-800 mb-2">ROYYAN CORPORATION (THAILAND) Co., LTD.</div>
              <div className="text-xs text-slate-600">เลขที่ 478 หมู่ที่ 2 ถนนยนตรการกำธร ตำบลฉลุง อำเภอเมือง จังหวัดสตูล 91140</div>
              <div className="text-xs text-slate-600">Address: No. 478 Moo 2 Yontrakankumton Rd., Chalung, Muang, Satun. 91140</div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                เลขประจำตัวผู้เสียภาษี: 0 9155 66000 11 0 Tax Number 0 9155 66000 11 0 Tel: 088-7673581
              </div>
            </div>

            {/* Receipt Numbers Row */}
            <div className="py-2 px-2">
              <div className="flex justify-between items-end mb-2">
                <div className="text-slate-800 font-bold text-lg w-1/3">เล่มที่ 001</div>
                <div className="text-center w-1/3">
                  <span className="text-xl font-bold text-slate-900 border-b-2 border-slate-900 pb-1">ใบกำกับภาษีและใบเสร็จรับเงิน</span>
                </div>
                <div className="text-right w-1/3 space-y-1">
                  <div className="text-slate-800 font-bold text-lg font-mono">No. {receipt.receiptNumber}</div>
                  <div className="text-slate-600 text-sm font-mono">Tax Inv. {receipt.invoiceNumber}</div>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="text-right text-slate-800">
                  <span className="font-bold mr-2">วันที่ Date :</span>
                  <span className="border-b border-slate-400 border-dotted px-2 inline-block min-w-[150px] text-center font-medium">
                    {formatDateTime(receipt.paidAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="border border-slate-200 rounded-2xl p-6">
              <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-orange-500" />
                ข้อมูลผู้เข้าพัก
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 text-sm">ชื่อ-นามสกุล</div>
                  <div className="text-slate-900 font-medium">{booking.guest.name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">เบอร์โทร</div>
                  <div className="text-slate-900 font-medium">{booking.guest.phone}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">เลขบัตร</div>
                  <div className="text-slate-900 font-medium">{booking.guest.idNumber}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">ห้องพัก</div>
                  <div className="text-slate-900 font-medium">{roomNumbers}</div>
                </div>
              </div>
            </div>

            {/* Charges */}
            <div>
              <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                รายการค่าใช้จ่าย
              </h3>
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-600 text-sm font-bold">รายการ</th>
                    <th className="px-4 py-3 text-right text-slate-600 text-sm font-bold">จำนวนเงิน (รวม VAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.charges.map((charge, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-slate-800">{charge.description}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(charge.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-right text-slate-500 text-sm">ยอดรวมก่อน VAT</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(receipt.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-right text-slate-500 text-sm">VAT 7% (รวมในราคาแล้ว)</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(receipt.vat)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-4 text-right text-slate-800 font-bold">ยอดรวมทั้งสิ้น</td>
                    <td className="px-4 py-4 text-right text-orange-600 font-bold text-xl font-mono">{formatCurrency(receipt.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Method */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="text-orange-800 text-sm font-bold">วิธีการชำระเงิน</div>
                <div className="text-orange-600 text-sm">Payment Method</div>
              </div>
              <div className="text-orange-900 font-bold text-lg flex items-center gap-2">
                {receipt.method === 'cash' && <><Banknote className="w-5 h-5" /> เงินสด / Cash</>}
                {receipt.method === 'transfer' && <><Building className="w-5 h-5" /> โอนเงิน / Bank Transfer</>}
                {receipt.method === 'qr' && <><Smartphone className="w-5 h-5" /> QR Code</>}
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-4 pb-2 break-inside-avoid">
              <div className="flex justify-between items-end gap-12">
                <div className="flex-1 text-center">
                  <div className="border-b border-slate-400 border-dotted h-8 mb-2"></div>
                  <div className="text-slate-800 font-bold text-sm">ผู้รับเงิน / Receiver</div>
                  <div className="text-slate-400 text-xs mt-1">วันที่ ______/______/______</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-b border-slate-400 border-dotted h-8 mb-2"></div>
                  <div className="text-slate-800 font-bold text-sm">ผู้จ่ายเงิน / Payer</div>
                  <div className="text-slate-400 text-xs mt-1">วันที่ ______/______/______</div>
                </div>
              </div>
            </div>

            <div className="text-center text-slate-400 text-xs pt-4 border-t border-slate-100">
              <p>ขอบคุณที่ใช้บริการ Royyan Resort</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">รับชำระเงินย้อนหลัง</h2>
            <p className="text-slate-500 text-sm">Late Payment & Retroactive Receipt</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-amber-800 font-bold text-sm">ชำระเงินย้อนหลัง</div>
              <div className="text-amber-700 text-xs mt-1">
                การจองนี้เช็คเอาท์แล้วแต่ยังไม่มีการชำระเงิน กรุณาระบุวันที่ชำระเงินจริงเพื่อออกใบเสร็จย้อนหลัง
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Guest Info */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-orange-500" />
                ข้อมูลการจอง
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">ชื่อ-นามสกุล</div>
                  <div className="text-slate-900 font-medium">{booking.guest.name}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">ห้องพัก</div>
                  <div className="text-slate-900 font-medium">{roomNumbers}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">เช็คอินจริง</div>
                  <div className="text-slate-900 font-medium">
                    {booking.actualCheckInTime ? formatDateTime(booking.actualCheckInTime) : '-'}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">เช็คเอาท์จริง</div>
                  <div className="text-slate-900 font-medium">
                    {booking.actualCheckOutTime ? formatDateTime(booking.actualCheckOutTime) : '-'}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-slate-500 text-sm">ประเภทลูกค้า</div>
                  <div className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-slate-600">
                    {booking.pricingTier === 'general' && 'ทั่วไป (฿890)'}
                    {booking.pricingTier === 'tour' && 'ทัวร์ (฿840)'}
                    {booking.pricingTier === 'vip' && 'VIP (฿400)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Date */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <label className="block text-slate-700 font-bold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                วันที่ชำระเงินจริง (ย้อนหลัง)
              </label>
              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all text-slate-800 font-medium bg-slate-50"
              />
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                ระบุวันที่ลูกค้าชำระเงินจริง ใบเสร็จจะอ้างอิงวันที่นี้
              </p>
            </div>
          </div>

          {/* Charges Summary */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                สรุปค่าใช้จ่าย
              </h3>
            </div>
            <div className="p-6">
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  {charges.map((charge, index) => (
                    <tr key={index}>
                      <td className="py-3 text-slate-800 text-sm">{charge.description}</td>
                      <td className="py-3 text-right text-slate-800 font-mono font-medium">{formatCurrency(charge.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200">
                  <tr>
                    <td className="py-3 text-slate-500 text-right text-sm pt-4">ยอดรวมก่อน VAT</td>
                    <td className="py-3 text-slate-800 text-right font-mono pt-4">{formatCurrency(subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-500 text-right text-sm">VAT 7% (รวมในราคาแล้ว)</td>
                    <td className="py-3 text-slate-800 text-right font-mono">{formatCurrency(vat)}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="py-4 text-slate-800 text-right font-bold text-lg">ยอดรวมสุทธิ</td>
                    <td className="py-4 text-orange-600 text-right font-bold text-2xl font-mono">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Extra Charges */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-6">
            <h3 className="text-purple-800 font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              ค่าใช้จ่ายเพิ่มเติม (ถ้ามี)
            </h3>
            <div className="flex flex-col gap-4 mb-4">
              <div className="grid grid-cols-[1fr_2fr] gap-4">
                <select
                  value={newExtraCharge.type}
                  onChange={(e) => setNewExtraCharge({ ...newExtraCharge, type: e.target.value })}
                  className="px-4 py-3 border border-purple-200 rounded-xl focus:border-purple-500 outline-none bg-white text-purple-900 font-bold"
                >
                  <option value="other">อื่นๆ</option>
                  <option value="service">บริการ</option>
                  <option value="food">อาหาร/เครื่องดื่ม</option>
                  <option value="room">เตียงเสริม</option>
                </select>
                <input
                  type="text"
                  value={newExtraCharge.description}
                  onChange={(e) => setNewExtraCharge({ ...newExtraCharge, description: e.target.value })}
                  className="px-4 py-3 border border-purple-200 rounded-xl focus:border-purple-500 outline-none bg-white text-purple-900"
                  placeholder="รายละเอียดรายการ"
                />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-4 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-purple-800 text-sm font-bold whitespace-nowrap">ราคา (บาท):</span>
                  <input
                    type="number"
                    min="0"
                    value={newExtraCharge.amount === 0 ? '' : newExtraCharge.amount}
                    onChange={(e) => setNewExtraCharge({ ...newExtraCharge, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:border-purple-500 outline-none bg-white text-purple-900 font-bold text-center"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={handleAddExtraCharge}
                  disabled={!newExtraCharge.description || newExtraCharge.amount <= 0}
                  className="h-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  เพิ่ม
                </button>
              </div>
            </div>
            {extraCharges.length > 0 ? (
              <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-purple-50">
                    {extraCharges.map((charge, index) => (
                      <tr key={index} className="group hover:bg-purple-50/50">
                        <td className="py-3 px-4 text-slate-700 text-sm">{charge.description}</td>
                        <td className="py-3 px-4 text-right text-slate-700 font-bold">{formatCurrency(charge.amount)}</td>
                        <td className="py-3 px-4 w-10">
                          <button
                            onClick={() => handleRemoveExtraCharge(index)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-purple-100 rounded-xl text-slate-300 text-sm">
                ไม่มีรายการเพิ่มเติม
              </div>
            )}
          </div>

          {/* Discount Section */}
          {canApplyDiscount && (
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-2xl p-6">
              <h3 className="text-yellow-800 font-bold mb-4">🔐 ส่วนลดพิเศษ (Admin Only)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-yellow-800 text-xs font-bold uppercase tracking-wider mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:border-yellow-500 outline-none bg-white text-yellow-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-yellow-800 text-xs font-bold uppercase tracking-wider mb-1">เหตุผล</label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:border-yellow-500 outline-none bg-white text-yellow-900"
                    placeholder="ระบุเหตุผลการลดราคา"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Penalty Section */}
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6">
            <h3 className="text-red-800 font-bold mb-4">⚠️ ค่าปรับ / ความเสียหาย</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-red-800 text-xs font-bold uppercase tracking-wider mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={penalty === 0 ? '' : penalty}
                  onChange={(e) => setPenalty(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-red-200 rounded-xl focus:border-red-500 outline-none bg-white text-red-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-red-800 text-xs font-bold uppercase tracking-wider mb-1">เหตุผล</label>
                <input
                  type="text"
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full px-4 py-3 border border-red-200 rounded-xl focus:border-red-500 outline-none bg-white text-red-900"
                  placeholder="เช่น ทำแก้วแตก, กุญแจหาย"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-700 font-bold mb-4">เลือกวิธีการชำระเงิน</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === 'cash'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50'
                }`}
              >
                <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-orange-600' : 'text-slate-400'}`} />
                <span className="font-bold">เงินสด</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50'
                }`}
              >
                <Building className={`w-8 h-8 ${paymentMethod === 'transfer' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-bold">โอนเงิน</span>
              </button>
              <button
                onClick={() => setPaymentMethod('qr')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === 'qr'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-purple-200 hover:bg-purple-50/50'
                }`}
              >
                <Smartphone className={`w-8 h-8 ${paymentMethod === 'qr' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="font-bold">QR Code</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-slate-100">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  บันทึกการชำระเงินและออกใบเสร็จ {formatCurrency(total)}
                </>
              )}
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
