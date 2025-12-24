import { useState, useMemo } from 'react';
import { User } from '../types';
import { getBookings, getPayments, getRooms, exportToCSV } from '../utils/storage';
import { formatCurrency, formatDateTime } from '../utils/dateHelpers';
import { Download, FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface ReportsProps {
  currentUser: User;
}

export function Reports({ currentUser }: ReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const bookings = getBookings();
  const payments = getPayments();
  const rooms = getRooms();

  // Filter payments by selected month
  const monthPayments = useMemo(() => {
    return payments.filter(p => p.paidAt.startsWith(selectedMonth));
  }, [payments, selectedMonth]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = monthPayments.reduce((sum, p) => sum + p.total, 0);
    const totalVAT = monthPayments.reduce((sum, p) => sum + p.vat, 0);
    const totalSubtotal = monthPayments.reduce((sum, p) => sum + p.subtotal, 0);
    const totalTransactions = monthPayments.length;
    
    // Payment method breakdown
    const cashPayments = monthPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.total, 0);
    const transferPayments = monthPayments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.total, 0);
    const qrPayments = monthPayments.filter(p => p.method === 'qr').reduce((sum, p) => sum + p.total, 0);

    // Pricing tier breakdown
    const generalRevenue = monthPayments
      .filter(p => {
        const booking = bookings.find(b => b.id === p.bookingId);
        return booking?.pricingTier === 'general';
      })
      .reduce((sum, p) => sum + p.total, 0);
    
    const tourRevenue = monthPayments
      .filter(p => {
        const booking = bookings.find(b => b.id === p.bookingId);
        return booking?.pricingTier === 'tour';
      })
      .reduce((sum, p) => sum + p.total, 0);
    
    const vipRevenue = monthPayments
      .filter(p => {
        const booking = bookings.find(b => b.id === p.bookingId);
        return booking?.pricingTier === 'vip';
      })
      .reduce((sum, p) => sum + p.total, 0);

    // Room nights sold
    const roomNights = monthPayments.reduce((sum, p) => {
      const roomCharges = p.charges.filter(c => c.type === 'room');
      return sum + roomCharges.length;
    }, 0);

    return {
      totalRevenue,
      totalVAT,
      totalSubtotal,
      totalTransactions,
      cashPayments,
      transferPayments,
      qrPayments,
      generalRevenue,
      tourRevenue,
      vipRevenue,
      roomNights,
    };
  }, [monthPayments, bookings]);

  const handleExportCSV = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `royyan-resort-report-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const StatCard = ({ icon: Icon, title, value, subtitle }: { icon: any, title: string, value: string, subtitle: string }) => (
    <div className="bg-white rounded-lg p-6 border border-neutral-200">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-neutral-100">
          <Icon className="w-6 h-6 text-neutral-900" />
        </div>
      </div>
      <div className="text-neutral-600 text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900 mb-1">{value}</div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  );

  const BreakdownItem = ({ label, value, percentage, subValue }: { label: string, value: string, percentage: string, subValue?: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
      <div>
        <div className="text-neutral-900 font-medium">{label}</div>
        {subValue && <div className="text-sm text-neutral-500">{subValue}</div>}
      </div>
      <div className="text-right">
        <div className="text-neutral-900 font-bold">{value}</div>
        <div className="text-xs text-neutral-500">{percentage}%</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">รายงาน / Reports</h2>
          <p className="text-neutral-600">สรุปรายได้และภาษีประจำเดือน</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors font-medium"
          >
            <FileText className="w-4 h-4" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-lg p-6 border border-neutral-200 flex items-center gap-4">
        <label className="text-neutral-700 font-medium whitespace-nowrap">เลือกเดือน / Select Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title="รายได้รวม / Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`${stats.totalTransactions} รายการ (Transactions)`}
        />
        <StatCard
          icon={TrendingUp}
          title="ก่อนภาษี / Subtotal"
          value={formatCurrency(stats.totalSubtotal)}
          subtitle="ไม่รวม VAT"
        />
        <StatCard
          icon={FileText}
          title="ภาษีมูลค่าเพิ่ม / VAT 7%"
          value={formatCurrency(stats.totalVAT)}
          subtitle="นำส่งสรรพากร"
        />
        <StatCard
          icon={Calendar}
          title="ห้อง-คืน / Room Nights"
          value={stats.roomNights.toString()}
          subtitle="จำนวนคืนที่ขายได้"
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods */}
        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
            ช่องทางการชำระเงิน / Payment Methods
          </h3>
          <div className="space-y-1">
            <BreakdownItem 
              label="เงินสด / Cash"
              value={formatCurrency(stats.cashPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.cashPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              label="โอนเงิน / Transfer"
              value={formatCurrency(stats.transferPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.transferPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              label="สแกน QR / QR Code"
              value={formatCurrency(stats.qrPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.qrPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
          </div>
        </div>

        {/* Customer Tiers */}
        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
            ประเภทลูกค้า / Customer Type
          </h3>
          <div className="space-y-1">
            <BreakdownItem 
              label="ลูกค้าทั่วไป (฿890)"
              subValue="General Customer"
              value={formatCurrency(stats.generalRevenue)}
              percentage={stats.totalRevenue > 0 ? ((stats.generalRevenue / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              label="ทัวร์/แนะนำ (฿840)"
              subValue="Tour / Referral"
              value={formatCurrency(stats.tourRevenue)}
              percentage={stats.totalRevenue > 0 ? ((stats.tourRevenue / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              label="VIP / ผู้ถือหุ้น (฿400)"
              subValue="Shareholder / VIP"
              value={formatCurrency(stats.vipRevenue)}
              percentage={stats.totalRevenue > 0 ? ((stats.vipRevenue / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <h3 className="font-bold text-neutral-900">รายการล่าสุด / Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-neutral-500 font-medium border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 w-[15%]">วันที่ / Date</th>
                <th className="px-6 py-4 w-[15%]">ใบเสร็จ / Receipt</th>
                <th className="px-6 py-4 w-[20%]">ลูกค้า / Guest</th>
                <th className="px-6 py-4 w-[15%]">ห้อง / Room</th>
                <th className="px-6 py-4 w-[15%] text-right">ยอดรวม / Total</th>
                <th className="px-6 py-4 w-[20%] text-right">วิธีชำระ / Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {monthPayments.map(payment => {
                const booking = bookings.find(b => b.id === payment.bookingId);
                const bookingRooms = booking ? rooms.filter(r => booking.roomIds.includes(r.id)) : [];
                const roomNumbers = bookingRooms.map(r => r.number).join(', ');
                
                return (
                  <tr key={payment.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-neutral-600">
                      {formatDateTime(payment.paidAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-500">
                      {payment.receiptNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {booking?.guest.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{roomNumbers}</td>
                    <td className="px-6 py-4 text-right font-medium text-neutral-900">{formatCurrency(payment.total)}</td>
                    <td className="px-6 py-4 text-right text-neutral-600 capitalize">
                      {payment.method}
                    </td>
                  </tr>
                );
              })}
              {monthPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    ไม่พบรายการในเดือนนี้ / No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Notes */}
      <div className="p-4 rounded-lg bg-neutral-100 text-neutral-600 text-sm">
        <p><strong>หมายเหตุ:</strong> ระบบคำนวณภาษีมูลค่าเพิ่ม (VAT) 7% แบบรวมใน (Inclusive) ข้อมูลนี้ใช้สำหรับตรวจสอบภายในเท่านั้น กรุณาตรวจสอบกับเอกสารใบกำกับภาษีฉบับจริงอีกครั้ง</p>
      </div>
    </div>
  );
}
