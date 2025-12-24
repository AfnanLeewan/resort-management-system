import { useMemo, useState } from 'react';
import { DashboardStats } from '../types';
import { getRooms, getBookings, getPayments, getMaintenanceReports } from '../utils/storage';
import { isToday, isThisMonth, formatCurrency } from '../utils/dateHelpers';
import { TrendingUp, Bed, AlertCircle, DollarSign, Users, Calendar, HelpCircle } from 'lucide-react';
import { QuickGuide } from './QuickGuide';

export function Dashboard() {
  const [showGuide, setShowGuide] = useState(false);
  
  const stats = useMemo<DashboardStats>(() => {
    const rooms = getRooms();
    const bookings = getBookings();
    const payments = getPayments();
    const maintenance = getMaintenanceReports();

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
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color, 
    subtext 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    color: string;
    subtext?: string;
  }) => (
    <div className="bg-white rounded-lg p-6 border border-neutral-200">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-neutral-100">
          <Icon className="w-6 h-6 text-neutral-700" />
        </div>
      </div>
      <div className="text-neutral-600 mb-2 text-sm">{label}</div>
      <div className="text-neutral-900 mb-1">{value}</div>
      {subtext && <div className="text-sm text-neutral-500">{subtext}</div>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-neutral-900 mb-2">Dashboard</h2>
        <p className="text-neutral-600">ภาพรวมของรีสอร์ท</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          icon={DollarSign}
          label="รายได้วันนี้ / Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          color="green"
          subtext={`${stats.checkInsToday} Check-ins, ${stats.checkOutsToday} Check-outs`}
        />
        <StatCard
          icon={TrendingUp}
          label="รายได้เดือนนี้ / This Month"
          value={formatCurrency(stats.monthRevenue)}
          color="blue"
        />
      </div>

      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={Bed}
          label="อัตราการเข้าพัก / Occupancy"
          value={`${stats.occupancyRate.toFixed(1)}%`}
          color="purple"
          subtext={`${stats.occupiedRooms}/${stats.totalRooms} ห้อง`}
        />
        <StatCard
          icon={Calendar}
          label="ห้องว่าง / Available"
          value={stats.availableRooms}
          color="green"
        />
        <StatCard
          icon={Users}
          label="กำลังทำความสะอาด"
          value={stats.cleaningRooms}
          color="yellow"
        />
        <StatCard
          icon={AlertCircle}
          label="ซ่อมบำรุง / Maintenance"
          value={stats.pendingMaintenance > 0 ? stats.maintenanceRooms : stats.maintenanceRooms}
          color="red"
          subtext={stats.pendingMaintenance > 0 ? `${stats.pendingMaintenance} รายการรอดำเนินการ` : undefined}
        />
      </div>

      {/* Quick Info */}
      <div className="bg-white border border-neutral-200 rounded-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-neutral-900">Quick Stats</h3>
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>คู่มือใช้งาน</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-neutral-600 text-sm mb-1">เตียงเดี่ยว</div>
            <div className="text-neutral-900">20 ห้อง</div>
          </div>
          <div>
            <div className="text-neutral-600 text-sm mb-1">เตียงคู่</div>
            <div className="text-neutral-900">10 ห้อง</div>
          </div>
          <div>
            <div className="text-neutral-600 text-sm mb-1">ราคาทั่วไป</div>
            <div className="text-neutral-900">฿890</div>
          </div>
          <div>
            <div className="text-neutral-600 text-sm mb-1">ราคาทัวร์</div>
            <div className="text-neutral-900">฿840</div>
          </div>
        </div>
      </div>

      {/* Quick Guide Modal */}
      {showGuide && <QuickGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}