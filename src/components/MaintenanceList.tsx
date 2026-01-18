import { useState, useEffect, useMemo } from 'react';
import { MaintenanceReport, Room, User } from '../types';
import * as api from '../utils/api';
import { formatDateTime } from '../utils/dateHelpers';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter, 
  RefreshCw,
  Search,
  Calendar,
  User as UserIcon,
  MessageSquare,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Settings
} from 'lucide-react';

interface MaintenanceListProps {
  currentUser: User;
}

export function MaintenanceList({ currentUser }: MaintenanceListProps) {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedReports, loadedRooms, loadedUsers] = await Promise.all([
        api.getMaintenanceReports(),
        api.getRooms(),
        api.getUsers(),
      ]);
      setReports(loadedReports);
      setRooms(loadedRooms);
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get room label from room ID
  const getRoomLabel = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 'N/A';
    if (room.number <= 10) return `RC${String(room.number).padStart(2, '0')}`;
    if (room.number <= 20) return `RB${String(room.number - 10).padStart(2, '0')}`;
    return `RA${String(room.number - 20).padStart(2, '0')}`;
  };

  // Get room number from room ID  
  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.number || 0;
  };

  // Get user name from user ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(r => r.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.description.toLowerCase().includes(query) ||
        getRoomLabel(r.roomId).toLowerCase().includes(query) ||
        getUserName(r.reportedBy).toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortOrder === 'newest') {
      result.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    } else if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());
    } else if (sortOrder === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    return result;
  }, [reports, statusFilter, priorityFilter, searchQuery, sortOrder, rooms, users]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      inProgress: reports.filter(r => r.status === 'in-progress').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      highPriority: reports.filter(r => r.priority === 'high' && r.status !== 'resolved').length,
    };
  }, [reports]);

  // Handle status update
  const handleUpdateStatus = async (reportId: string, newStatus: MaintenanceReport['status']) => {
    try {
      const updates: Partial<MaintenanceReport> = {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
      };

      await api.updateMaintenanceReport(reportId, updates);

      // If resolved, update room status to cleaning
      if (newStatus === 'resolved') {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          await api.updateRoomStatus(report.roomId, 'cleaning');
        }
      }

      // Reload data
      await loadData();
    } catch (err) {
      console.error('Failed to update report:', err);
      alert('❌ ไม่สามารถอัพเดทสถานะได้');
    }
  };

  const getPriorityBadge = (priority: MaintenanceReport['priority']) => {
    const styles = {
      'low': 'bg-slate-100 text-slate-600 border-slate-200',
      'medium': 'bg-orange-100 text-orange-700 border-orange-200',
      'high': 'bg-red-100 text-red-700 border-red-200 animate-pulse',
    };
    const labels = {
      'low': 'ปกติ',
      'medium': 'ปานกลาง',
      'high': 'ด่วน',
    };
    const icons = {
      'low': '🔵',
      'medium': '🟠',
      'high': '🔴',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${styles[priority]}`}>
        <span>{icons[priority]}</span>
        {labels[priority]}
      </span>
    );
  };

  const getStatusBadge = (status: MaintenanceReport['status']) => {
    const styles = {
      'pending': 'bg-orange-50 text-orange-700 border-orange-200',
      'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
      'resolved': 'bg-green-50 text-green-700 border-green-200',
    };
    const labels = {
      'pending': 'รอรับเรื่อง',
      'in-progress': 'กำลังซ่อม',
      'resolved': 'เสร็จสิ้น',
    };
    const icons = {
      'pending': <Clock className="w-3.5 h-3.5" />,
      'in-progress': <Settings className="w-3.5 h-3.5 animate-spin" />,
      'resolved': <CheckCircle className="w-3.5 h-3.5" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-200">
              <Wrench className="w-7 h-7" />
            </div>
            รายการแจ้งซ่อม
          </h2>
          <p className="text-slate-500">Maintenance Reports • ติดตามและจัดการงานซ่อมบำรุงทั้งหมด</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-slate-500 font-medium text-sm">ทั้งหมด</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{stats.total}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-orange-600 font-medium text-sm">รอรับเรื่อง</span>
          </div>
          <div className="text-3xl font-black text-orange-600">{stats.pending}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-blue-600 font-medium text-sm">กำลังซ่อม</span>
          </div>
          <div className="text-3xl font-black text-blue-600">{stats.inProgress}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-xl text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-green-600 font-medium text-sm">เสร็จสิ้น</span>
          </div>
          <div className="text-3xl font-black text-green-600">{stats.resolved}</div>
        </div>

        <div className={`bg-white rounded-2xl p-5 border shadow-sm hover:-translate-y-1 transition-transform ${stats.highPriority > 0 ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${stats.highPriority > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className={`font-medium text-sm ${stats.highPriority > 0 ? 'text-red-600' : 'text-slate-400'}`}>งานด่วน</span>
          </div>
          <div className={`text-3xl font-black ${stats.highPriority > 0 ? 'text-red-600' : 'text-slate-300'}`}>{stats.highPriority}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-300 transition-all">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาด้วยคำอธิบาย, ห้อง, หรือชื่อผู้แจ้ง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Filter Dropdowns Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all min-w-[160px]"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending">รอรับเรื่อง</option>
                <option value="in-progress">กำลังซ่อม</option>
                <option value="resolved">เสร็จสิ้น</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all min-w-[180px]"
              >
                <option value="all">ความเร่งด่วน: ทั้งหมด</option>
                <option value="high">ด่วนที่สุด</option>
                <option value="medium">ปานกลาง</option>
                <option value="low">ปกติ</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="appearance-none px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all min-w-[170px]"
              >
                <option value="newest">เรียง: ล่าสุดก่อน</option>
                <option value="oldest">เรียง: เก่าสุดก่อน</option>
                <option value="priority">เรียง: ความเร่งด่วน</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่พบรายการ</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'ลองเปลี่ยนตัวกรองเพื่อดูรายการอื่น'
                : 'ยังไม่มีรายการแจ้งซ่อมในระบบ'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ห้อง</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ความเร่งด่วน</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้แจ้ง</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เวลาแจ้ง</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map(report => (
                  <tr 
                    key={report.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      report.priority === 'high' && report.status !== 'resolved' ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${
                          report.status === 'resolved' 
                            ? 'bg-green-100 text-green-700' 
                            : report.priority === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-orange-100 text-orange-700'
                        }`}>
                          {getRoomLabel(report.roomId)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="max-w-xs">
                        <p className="text-slate-800 font-medium line-clamp-2">{report.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">{getPriorityBadge(report.priority)}</td>
                    <td className="px-6 py-5">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-slate-600 font-medium text-sm">{getUserName(report.reportedBy)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(report.reportedAt)}</span>
                      </div>
                      {report.resolvedAt && (
                        <div className="flex items-center gap-2 text-green-600 text-xs mt-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>เสร็จ: {formatDateTime(report.resolvedAt)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {(currentUser.role === 'management' || currentUser.role === 'front-desk' || currentUser.role === 'repair') && report.status !== 'resolved' && (
                        <div className="flex gap-2">
                          {report.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'in-progress')}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors text-xs font-bold shadow-sm"
                            >
                              รับงาน
                            </button>
                          )}
                          {report.status === 'in-progress' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-xs font-bold shadow-sm"
                            >
                              เสร็จสิ้น
                            </button>
                          )}
                        </div>
                      )}
                      {report.status === 'resolved' && (
                        <span className="text-green-600 text-xs font-medium">✓ ดำเนินการแล้ว</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LINE Integration Info */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="p-4 bg-green-100 rounded-2xl text-green-600 shrink-0">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-green-800 mb-2">ระบบแจ้งเตือน LINE Integration</h3>
          <p className="text-green-700 text-sm mb-4">
            เมื่อมีการแจ้งซ่อมใหม่ ระบบจะส่งข้อความแจ้งเตือนไปยังกลุ่ม LINE ของแผนกซ่อมบำรุงและผู้จัดการโดยอัตโนมัติ 
            งานด่วนจะได้รับการแจ้งเตือนพิเศษทันที
          </p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm">
              ทดสอบการส่งข้อความ
            </button>
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl font-bold text-sm hover:bg-green-50 transition-colors">
              ตั้งค่า Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
