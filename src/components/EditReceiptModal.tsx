import { useState, useMemo } from 'react';
import { Booking, Payment, User, Charge } from '../types';
import * as api from '../utils/api';
import { formatCurrency } from '../utils/dateHelpers';
import { extractVAT, extractBasePrice } from '../utils/pricing';
import { X, Plus, Trash2, Loader2, FileText, Banknote, Building, Smartphone, Save } from 'lucide-react';

interface EditReceiptModalProps {
  booking: Booking;
  payment: Payment;
  roomNumbers: string;
  currentUser: User;
  onClose: () => void;
  onSave: () => void;
}

export function EditReceiptModal({ booking, payment, roomNumbers, currentUser, onClose, onSave }: EditReceiptModalProps) {
  const canApplyDiscount = currentUser.role === 'board' || currentUser.role === 'management';

  const fixedCharges = payment.charges.filter(c =>
    ['room', 'early-checkin', 'late-checkout'].includes(c.type)
  );

  const existingDiscount = payment.charges.find(c => c.type === 'discount');
  const existingEditableCharges = payment.charges.filter(c =>
    !['room', 'early-checkin', 'late-checkout'].includes(c.type) && c.type !== 'discount'
  );

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qr'>(payment.method);
  const [editableCharges, setEditableCharges] = useState<Charge[]>(existingEditableCharges);
  const [discount, setDiscount] = useState(existingDiscount ? Math.abs(existingDiscount.amount) : 0);
  const [discountReason, setDiscountReason] = useState(
    existingDiscount?.description?.replace('ส่วนลด: ', '') || ''
  );
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [editReason, setEditReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const allCharges = useMemo<Charge[]>(() => {
    const charges: Charge[] = [...fixedCharges, ...editableCharges];
    if (discount > 0 && canApplyDiscount) {
      charges.push({
        id: `charge-discount-edit`,
        bookingId: booking.id,
        type: 'discount',
        description: `ส่วนลด: ${discountReason || 'ไม่ระบุ'}`,
        amount: -discount,
        authorizedBy: currentUser.id,
      });
    }
    return charges;
  }, [fixedCharges, editableCharges, discount, discountReason, canApplyDiscount, booking.id, currentUser.id]);

  const total = useMemo(() => allCharges.reduce((sum, c) => sum + c.amount, 0), [allCharges]);
  const vat = useMemo(() => extractVAT(total), [total]);
  const subtotal = useMemo(() => extractBasePrice(total), [total]);

  const handleAddCharge = () => {
    const amount = parseFloat(newCharge.amount);
    if (!newCharge.description || !amount) return;
    setEditableCharges([...editableCharges, {
      id: `charge-edit-${Date.now()}`,
      bookingId: booking.id,
      type: 'other',
      description: newCharge.description,
      amount,
    }]);
    setNewCharge({ description: '', amount: '' });
  };

  const handleRemoveCharge = (chargeId: string) => {
    setEditableCharges(editableCharges.filter(c => c.id !== chargeId));
  };

  const handleSave = async () => {
    if (!editReason.trim()) {
      alert('กรุณาระบุเหตุผลในการแก้ไขใบเสร็จ / Please provide a reason for editing');
      return;
    }

    setProcessing(true);
    try {
      await api.deletePayment(payment.id);

      const updatedPayment: Payment = {
        id: `PAY${Date.now()}`,
        bookingId: payment.bookingId,
        amount: total,
        method: paymentMethod,
        receiptNumber: payment.receiptNumber,
        invoiceNumber: payment.invoiceNumber,
        paidAt: payment.paidAt,
        paidBy: payment.paidBy,
        charges: allCharges,
        subtotal,
        vat,
        total,
      };

      await api.addPayment(updatedPayment);
      alert('✅ แก้ไขใบเสร็จสำเร็จ / Receipt updated successfully!');
      onSave();
    } catch (err) {
      console.error('Failed to update receipt:', err);
      alert('❌ ไม่สามารถแก้ไขใบเสร็จได้ / Failed to update receipt');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">แก้ไขใบเสร็จรับเงิน</h2>
            <p className="text-slate-500 text-sm">Edit Receipt • No. {payment.receiptNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <div className="font-bold text-amber-800">การแก้ไขใบเสร็จ</div>
              <div className="text-amber-700 text-sm">
                ห้อง: {roomNumbers} | ผู้เข้าพัก: {booking.guest.name} | ใบเสร็จเลขที่: {payment.receiptNumber}
              </div>
              <div className="text-amber-600 text-xs mt-1">
                เลขที่ใบเสร็จจะยังคงเดิม ข้อมูลการชำระเงินจะถูกอัปเดต
              </div>
            </div>
          </div>

          {/* Fixed Charges (read-only) */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              รายการค่าห้องพัก (ไม่สามารถแก้ไขได้)
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {fixedCharges.length > 0 ? (
                <table className="w-full">
                  <tbody className="divide-y divide-slate-100">
                    {fixedCharges.map((charge, i) => (
                      <tr key={i} className="bg-slate-50">
                        <td className="px-4 py-3 text-slate-600 text-sm">{charge.description}</td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-sm">
                          {formatCurrency(charge.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-3 text-slate-400 text-sm text-center">ไม่มีรายการค่าห้องพัก</div>
              )}
            </div>
          </div>

          {/* Editable Charges */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">รายการค่าใช้จ่ายอื่นๆ (แก้ไขได้)</h3>
            <div className="space-y-2 mb-4">
              {editableCharges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 group"
                >
                  <span className="text-slate-700 text-sm">{charge.description}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-sm ${charge.amount < 0 ? 'text-green-600' : 'text-slate-800'}`}>
                      {formatCurrency(charge.amount)}
                    </span>
                    <button
                      onClick={() => handleRemoveCharge(charge.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {editableCharges.length === 0 && (
                <div className="text-center py-4 text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                  ไม่มีรายการอื่นๆ
                </div>
              )}
            </div>

            {/* Add new charge */}
            <div className="flex gap-3">
              <input
                type="text"
                value={newCharge.description}
                onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-orange-400 text-sm"
                placeholder="รายละเอียดรายการ"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCharge()}
              />
              <input
                type="number"
                value={newCharge.amount}
                onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                className="w-36 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-orange-400 text-sm text-right"
                placeholder="จำนวนเงิน"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCharge()}
              />
              <button
                onClick={handleAddCharge}
                disabled={!newCharge.description || !newCharge.amount}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">ใส่จำนวนเงินติดลบ (เช่น -200) สำหรับรายการหัก/คืนเงิน</p>
          </div>

          {/* Discount Section (management/board only) */}
          {canApplyDiscount && (
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-2xl p-6">
              <h3 className="text-yellow-800 font-bold mb-4 flex items-center gap-2">
                🔐 ส่วนลดพิเศษ (สำหรับผู้มีสิทธิ์)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-yellow-800 text-xs font-bold uppercase tracking-wider mb-1">
                    จำนวนเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:border-yellow-500 outline-none bg-white text-yellow-900 font-bold"
                    placeholder="0"
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

          {/* Payment Method */}
          <div>
            <label className="block text-slate-700 font-bold mb-4">วิธีการชำระเงิน</label>
            <div className="grid grid-cols-3 gap-4">
              {(['cash', 'transfer', 'qr'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === method
                      ? method === 'cash'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : method === 'transfer'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {method === 'cash' && <Banknote className="w-8 h-8" />}
                  {method === 'transfer' && <Building className="w-8 h-8" />}
                  {method === 'qr' && <Smartphone className="w-8 h-8" />}
                  <span className="font-bold text-sm">
                    {method === 'cash' ? 'เงินสด' : method === 'transfer' ? 'โอนเงิน' : 'QR Code'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-700">สรุปยอดรวม</h3>
            </div>
            <div className="p-6">
              <table className="w-full">
                <tfoot>
                  <tr>
                    <td className="py-2 text-slate-500 text-right text-sm">ยอดรวมก่อน VAT</td>
                    <td className="py-2 text-right font-mono text-slate-700 pl-8">{formatCurrency(subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 text-right text-sm">VAT 7% (รวมในราคาแล้ว)</td>
                    <td className="py-2 text-right font-mono text-slate-700">{formatCurrency(vat)}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="pt-4 pb-2 text-slate-800 text-right font-bold text-lg">ยอดรวมสุทธิ</td>
                    <td className="pt-4 pb-2 text-right font-bold text-2xl font-mono text-orange-600">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Edit Reason (Required for audit) */}
          <div>
            <label className="block text-slate-700 font-bold mb-2">
              เหตุผลในการแก้ไขใบเสร็จ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-orange-400 text-slate-800 resize-none"
              placeholder="เช่น แก้ไขวิธีการชำระเงิน, เพิ่มค่าบริการที่ตกหล่น, แก้ไขส่วนลด..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={processing || !editReason.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  บันทึกการแก้ไข
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
