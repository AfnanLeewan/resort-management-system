import { Payment, Booking } from '../types';
import { formatCurrency, formatDateTime } from '../utils/dateHelpers';
import { Printer, User as UserIcon, FileText, Banknote, Building, Smartphone } from 'lucide-react';
import logo from "figma:asset/84dd509e490bb18f47d2514ab68671ebde53721b.png";

interface ReceiptModalProps {
  booking: Booking;
  payment: Payment;
  roomNumbers: string;
  onClose: () => void;
}

export function ReceiptModal({ booking, payment, roomNumbers, onClose }: ReceiptModalProps) {
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">ใบเสร็จรับเงิน</h2>
            <p className="text-slate-500 text-sm">Receipt & Tax Invoice</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrintReceipt}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-colors font-bold shadow-lg shadow-slate-200"
            >
              <Printer className="w-5 h-5" />
              <span>พิมพ์</span>
            </button>
            <button
              onClick={onClose}
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
                      <span className="text-2xl font-bold text-slate-900 border-b-2 border-slate-900 pb-1">ใบเสร็จรับเงิน</span>
                  </div>
                  <div className="text-right w-1/3 space-y-1">
                      <div className="text-slate-800 font-bold text-lg font-mono">No. {payment.receiptNumber}</div>
                      <div className="text-slate-600 text-sm font-mono">Tax Inv. {payment.invoiceNumber}</div>
                  </div>
              </div>
              <div className="flex justify-end">
                  <div className="text-right text-slate-800">
                      <span className="font-bold mr-2">วันที่ Date :</span>
                      <span className="border-b border-slate-400 border-dotted px-2 inline-block min-w-[150px] text-center font-medium">
                          {formatDateTime(payment.paidAt)}
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
                {payment.charges.map((charge, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-slate-800">{charge.description}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(charge.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-right text-slate-500 text-sm">ยอดรวมก่อน VAT</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(payment.subtotal)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-right text-slate-500 text-sm">VAT 7% (รวมในราคาแล้ว)</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{formatCurrency(payment.vat)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-4 text-right text-slate-800 font-bold">ยอดรวมทั้งสิ้น</td>
                  <td className="px-4 py-4 text-right text-orange-600 font-bold text-xl font-mono">{formatCurrency(payment.total)}</td>
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
              {payment.method === 'cash' && <><Banknote className="w-5 h-5"/> เงินสด / Cash</>}
              {payment.method === 'transfer' && <><Building className="w-5 h-5"/> โอนเงิน / Bank Transfer</>}
              {payment.method === 'qr' && <><Smartphone className="w-5 h-5"/> QR Code</>}
            </div>
          </div>

          <div className="text-center text-slate-400 text-xs pt-6 border-t border-slate-100">
            <p>ขอบคุณที่ใช้บริการ Royyan Resort</p>
          </div>
        </div>
      </div>
    </div>
  );
}
