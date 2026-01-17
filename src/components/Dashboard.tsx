import { useMemo, useState } from 'react';
import { DashboardStats } from '../types';
import { useDashboardData } from '../hooks/useSupabase';
import { isToday, isThisMonth, formatCurrency } from '../utils/dateHelpers';
import { TrendingUp, Bed, AlertCircle, DollarSign, Users, Calendar, HelpCircle, BookOpen, Loader2 } from 'lucide-react';
import { QuickGuide } from './QuickGuide';

export function Dashboard() {
  const [showGuide, setShowGuide] = useState(false);
  const { rooms, bookings, payments, maintenanceReports: maintenance, loading, error } = useDashboardData();
  
  const stats = useMemo<DashboardStats>(() => {
    if (loading) {
      return {
        occupancyRate: 0,
        totalRooms: 0,
        occupiedRooms: 0,
        availableRooms: 0,
        cleaningRooms: 0,
        maintenanceRooms: 0,
        todayRevenue: 0,
        monthRevenue: 0,
        checkInsToday: 0,
        checkOutsToday: 0,
        pendingMaintenance: 0,
      };
    }

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const cleaningRooms = rooms.filter(r => r.status === 'cleaning').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
    const occupancyRate = (occupiedRooms / totalRooms) * 100;

    const todayPayments = payments.filter(p => isToday(p.paidAt));
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.total, 0);

    const monthPayments = payments.filter(p => isThisMonth(p.paidAt));
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.total, 0);

    const checkInsToday = bookings.filter(b => 
      b.status === 'checked-in' && b.actualCheckInTime && isToday(b.actualCheckInTime)
    ).length;

    const checkOutsToday = bookings.filter(b => 
      b.status === 'checked-out' && b.actualCheckOutTime && isToday(b.actualCheckOutTime)
    ).length;

    const pendingMaintenance = maintenance.filter(m => m.status !== 'resolved').length;

    return {
      occupancyRate,
      totalRooms,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      maintenanceRooms,
      todayRevenue,
      monthRevenue,
      checkInsToday,
      checkOutsToday,
      pendingMaintenance,
    };
  }, [rooms, bookings, payments, maintenance, loading]);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    colorClass,
    iconBgClass,
    iconColorClass,
    subtext 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    colorClass?: string;
    iconBgClass: string;
    iconColorClass: string;
    subtext?: string;
  }) => (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${iconBgClass}`}>
          <Icon className={`w-6 h-6 ${iconColorClass}`} />
        </div>
        {subtext && (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                Info
            </span>
        )}
      </div>
      <div className="text-slate-500 mb-1 text-sm font-medium">{label}</div>
      <div className={`text-3xl font-bold ${colorClass || 'text-slate-800'} mb-2`}>{value}</div>
      {subtext && <div className="text-sm text-slate-400">{subtext}</div>}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h2>
          <p className="text-slate-500">ภาพรวมของรีสอร์ทประจำวันนี้</p>
        </div>
        <button
            onClick={() => setShowGuide(true)}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all shadow-lg shadow-orange-200 font-bold active:scale-95"
          >
            <BookOpen className="w-5 h-5" />
            <span>คู่มือใช้งาน</span>
          </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 text-orange-100">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <span className="font-medium">รายได้วันนี้ / Today's Revenue</span>
                </div>
                <div className="text-5xl font-bold mb-4">{formatCurrency(stats.todayRevenue)}</div>
                <div className="flex items-center gap-4 text-sm text-orange-100 bg-black/10 w-fit px-4 py-2 rounded-xl backdrop-blur-sm">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span> {stats.checkInsToday} Check-ins</span>
                    <span className="w-px h-4 bg-white/20"></span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full"></span> {stats.checkOutsToday} Check-outs</span>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-slate-800">
                <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 text-slate-500">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-slate-600" />
                    </div>
                    <span className="font-medium">รายได้เดือนนี้ / This Month</span>
                </div>
                <div className="text-5xl font-bold text-slate-800 mb-4">{formatCurrency(stats.monthRevenue)}</div>
                <div className="text-slate-400 text-sm">ยอดรวมรายได้สะสมประจำเดือน</div>
            </div>
        </div>
      </div>

      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={Bed}
          label="อัตราการเข้าพัก / Occupancy"
          value={`${stats.occupancyRate.toFixed(1)}%`}
          colorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
          iconColorClass="text-indigo-600"
          subtext={`${stats.occupiedRooms} จาก ${stats.totalRooms} ห้อง`}
        />
        <StatCard
          icon={Calendar}
          label="ห้องว่าง / Available"
          value={stats.availableRooms}
          colorClass="text-green-600"
          iconBgClass="bg-green-50"
          iconColorClass="text-green-600"
          subtext="พร้อมขาย"
        />
        <StatCard
          icon={Users}
          label="กำลังทำความสะอาด"
          value={stats.cleaningRooms}
          colorClass="text-orange-500"
          iconBgClass="bg-orange-50"
          iconColorClass="text-orange-500"
          subtext="รอทำความสะอาด"
        />
        <StatCard
          icon={AlertCircle}
          label="ซ่อมบำรุง / Maintenance"
          value={stats.pendingMaintenance > 0 ? stats.maintenanceRooms : stats.maintenanceRooms}
          colorClass="text-red-500"
          iconBgClass="bg-red-50"
          iconColorClass="text-red-500"
          subtext={stats.pendingMaintenance > 0 ? `${stats.pendingMaintenance} รายการรอดำเนินการ` : "ปกติ"}
        />
      </div>

      {/* Quick Info & Guide Button (Mobile) */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
            ข้อมูลห้องพัก / Room Info
          </h3>
          <button
            onClick={() => setShowGuide(true)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors shadow-lg shadow-orange-200 text-sm font-bold"
          >
            <BookOpen className="w-4 h-4" />
            <span>คู่มือ</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-200/50">
          <div>
            <div className="text-slate-500 text-sm mb-2 font-medium">เตียงเดี่ยว</div>
            <div className="text-2xl font-bold text-slate-800">20 <span className="text-sm font-normal text-slate-400">ห้อง</span></div>
          </div>
          <div>
            <div className="text-slate-500 text-sm mb-2 font-medium">เตียงคู่</div>
            <div className="text-2xl font-bold text-slate-800">10 <span className="text-sm font-normal text-slate-400">ห้อง</span></div>
          </div>
          <div>
            <div className="text-slate-500 text-sm mb-2 font-medium">ราคาทั่วไป</div>
            <div className="text-2xl font-bold text-slate-800">฿890</div>
          </div>
          <div>
            <div className="text-slate-500 text-sm mb-2 font-medium">ราคาทัวร์</div>
            <div className="text-2xl font-bold text-slate-800">฿840</div>
          </div>
        </div>
      </div>

      {/* Quick Guide Modal */}
      {showGuide && <QuickGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
