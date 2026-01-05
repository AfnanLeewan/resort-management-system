import { useState, useMemo } from 'react';
import { User } from '../types';
import { getBookings, getPayments, getRooms, exportToCSV } from '../utils/storage';
import { formatCurrency, formatDateTime } from '../utils/dateHelpers';
import { Download, FileText, DollarSign, TrendingUp, Calendar, Printer, CreditCard, Banknote, Smartphone, Building, Info } from 'lucide-react';

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

  const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, iconBg }: { icon: any, title: string, value: string, subtitle: string, colorClass: string, iconBg: string }) => (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-4 rounded-2xl ${iconBg} transition-colors`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
      </div>
      <div className="text-slate-500 text-sm mb-1 font-medium">{title}</div>
      <div className={`text-3xl font-bold ${colorClass} mb-1`}>{value}</div>
      <div className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded w-fit">{subtitle}</div>
    </div>
  );

  const BreakdownItem = ({ label, value, percentage, subValue, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-4 -mx-4 transition-colors rounded-xl">
      <div className="flex items-center gap-4">
        {Icon && <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Icon className="w-5 h-5" /></div>}
        <div>
            <div className="text-slate-800 font-bold">{label}</div>
            {subValue && <div className="text-sm text-slate-400">{subValue}</div>}
        </div>
      </div>
      <div className="text-right">
        <div className="text-slate-800 font-bold">{value}</div>
        <div className="text-xs text-slate-400 font-medium">{percentage}%</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">รายงานสรุปผล</h2>
          <p className="text-slate-500">Revenue & Tax Reports</p>
        </div>
        <div className="flex gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 border-r border-slate-200 pr-4 mr-2">
             <Calendar className="w-4 h-4 text-slate-400" />
             <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
             />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-colors font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors font-bold text-sm shadow-md shadow-slate-200"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title="รายได้รวม / Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`${stats.totalTransactions} รายการ`}
          colorClass="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          icon={TrendingUp}
          title="ก่อนภาษี / Subtotal"
          value={formatCurrency(stats.totalSubtotal)}
          subtitle="Revenue before VAT"
          colorClass="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={FileText}
          title="ภาษีมูลค่าเพิ่ม / VAT 7%"
          value={formatCurrency(stats.totalVAT)}
          subtitle="Tax Amount"
          colorClass="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          icon={Calendar}
          title="ห้อง-คืน / Room Nights"
          value={stats.roomNights.toString()}
          subtitle="Nights Sold"
          colorClass="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-slate-400" />
            ช่องทางการชำระเงิน
          </h3>
          <div className="space-y-2">
            <BreakdownItem 
              icon={Banknote}
              label="เงินสด"
              subValue="Cash Payment"
              value={formatCurrency(stats.cashPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.cashPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              icon={Building}
              label="โอนเงิน"
              subValue="Bank Transfer"
              value={formatCurrency(stats.transferPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.transferPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
            <BreakdownItem 
              icon={Smartphone}
              label="สแกน QR"
              subValue="QR Code Payment"
              value={formatCurrency(stats.qrPayments)}
              percentage={stats.totalRevenue > 0 ? ((stats.qrPayments / stats.totalRevenue) * 100).toFixed(1) : '0'}
            />
          </div>
        </div>

        {/* Customer Tiers */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-400" />
            ประเภทลูกค้า
          </h3>
          <div className="space-y-2">
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
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">รายการล่าสุด (Recent Transactions)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[15%] text-xs font-bold text-slate-400 uppercase tracking-wider">วันที่</th>
                <th className="px-6 py-4 w-[15%] text-xs font-bold text-slate-400 uppercase tracking-wider">ใบเสร็จ</th>
                <th className="px-6 py-4 w-[20%] text-xs font-bold text-slate-400 uppercase tracking-wider">ลูกค้า</th>
                <th className="px-6 py-4 w-[15%] text-xs font-bold text-slate-400 uppercase tracking-wider">ห้อง</th>
                <th className="px-6 py-4 w-[15%] text-xs font-bold text-slate-400 uppercase tracking-wider text-right">ยอดรวม</th>
                <th className="px-6 py-4 w-[20%] text-xs font-bold text-slate-400 uppercase tracking-wider text-right">วิธีชำระ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthPayments.map(payment => {
                const booking = bookings.find(b => b.id === payment.bookingId);
                const bookingRooms = booking ? rooms.filter(r => booking.roomIds.includes(r.id)) : [];
                const roomNumbers = bookingRooms.map(r => r.number).join(', ');
                
                return (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {formatDateTime(payment.paidAt)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 bg-slate-50 w-fit rounded px-2">
                      {payment.receiptNumber}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {booking?.guest.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{roomNumbers}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(payment.total)}</td>
                    <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          payment.method === 'cash' ? 'bg-orange-100 text-orange-700' :
                          payment.method === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                       }`}>
                          {payment.method}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {monthPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">ไม่พบรายการในเดือนนี้</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Notes */}
      <div className="p-6 rounded-3xl bg-slate-100 text-slate-500 text-sm flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <p><strong>หมายเหตุ:</strong> ระบบคำนวณภาษีมูลค่าเพิ่ม (VAT) 7% แบบรวมใน (Inclusive) ข้อมูลนี้ใช้สำหรับตรวจสอบภายในเท่านั้น กรุณาตรวจสอบกับเอกสารใบกำกับภาษีฉบับจริงอีกครั้งเพื่อความถูกต้องทางบัญชี</p>
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    )
}
