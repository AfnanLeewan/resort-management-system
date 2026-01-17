import { useState, useMemo, useEffect } from 'react';
import { User, MaintenanceReport, Room } from '../types';
import * as api from '../utils/api';
import { formatDateTime } from '../utils/dateHelpers';
import { Sparkles, Wrench, AlertTriangle, CheckCircle, MessageSquare, Check, X, Loader2 } from 'lucide-react';

interface HousekeepingProps {
  currentUser: User;
}

export function Housekeeping({ currentUser }: HousekeepingProps) {
  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'rooms' | 'maintenance'>('rooms');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newReport, setNewReport] = useState({
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedRooms, loadedReports] = await Promise.all([
        api.getRooms(),
        api.getMaintenanceReports(),
      ]);
      setRooms(loadedRooms.sort((a, b) => a.number - b.number));
      setReports(loadedReports);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived state for filtered rooms
  const cleaningRooms = useMemo(() => rooms.filter(r => r.status === 'cleaning'), [rooms]);
  const maintenanceRooms = useMemo(() => rooms.filter(r => r.status === 'maintenance'), [rooms]);
  const pendingReports = useMemo(() => reports.filter(r => r.status !== 'resolved'), [reports]);

  // Handle marking a room as clean
  const handleMarkClean = async (room: Room) => {
    if (confirm(`ยืนยันว่าห้อง ${room.number} สะอาดแล้ว?`)) {
      setSaving(true);
      try {
        await api.updateRoomStatus(room.id, 'available');
        // Update local state immediately for smooth UI
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.id === room.id ? { ...r, status: 'available' } : r
          )
        );
      } catch (err) {
        console.error('Failed to update room:', err);
        alert('❌ ไม่สามารถอัพเดทสถานะห้องได้');
      } finally {
        setSaving(false);
      }
    }
  };

  // Open modal to report maintenance
  const handleReportMaintenance = (room: Room) => {
    setSelectedRoom(room);
    setShowReportModal(true);
  };

  // Submit maintenance report
  const handleSubmitReport = async () => {
    if (!selectedRoom || !newReport.description) {
      alert('กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    setSaving(true);
    try {
      const report: MaintenanceReport = {
        id: `MR${Date.now()}`,
        roomId: selectedRoom.id,
        reportedBy: currentUser.id,
        description: newReport.description,
        priority: newReport.priority,
        status: 'pending',
        reportedAt: new Date().toISOString(),
      };

      await api.addMaintenanceReport(report);
      await api.updateRoomStatus(selectedRoom.id, 'maintenance');

      // Update local state
      setReports(prev => [...prev, report]);
      setRooms(prevRooms => 
          prevRooms.map(r => 
            r.id === selectedRoom.id ? { ...r, status: 'maintenance' } : r
          )
      );

      alert(`📱 LINE Notification Sent!\n\n⚠️ แจ้งซ่อม ห้อง ${selectedRoom.number}\n${newReport.description}\n\nระบบจะส่งการแจ้งเตือนไปยัง LINE ของผู้จัดการ`);

      // Reset form
      setShowReportModal(false);
      setSelectedRoom(null);
      setNewReport({ description: '', priority: 'medium' });
    } catch (err) {
      console.error('Failed to submit report:', err);
      alert('❌ ไม่สามารถส่งเรื่องแจ้งซ่อมได้');
    } finally {
      setSaving(false);
    }
  };

  // Update status of a maintenance report
  const handleUpdateReportStatus = async (reportId: string, status: MaintenanceReport['status']) => {
    setSaving(true);
    try {
      const updates: Partial<MaintenanceReport> = {
        status,
        resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
      };

      await api.updateMaintenanceReport(reportId, updates);

      // If resolved, update room status to cleaning
      if (status === 'resolved') {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          await api.updateRoomStatus(report.roomId, 'cleaning');
          // Update local room state
          setRooms(prevRooms => 
              prevRooms.map(r => 
                r.id === report.roomId ? { ...r, status: 'cleaning' } : r
              )
          );
        }
      }

      // Update local reports state
      setReports(prevReports => 
        prevReports.map(r => 
          r.id === reportId ? { 
            ...r, 
            status, 
            resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined 
          } : r
        )
      );
    } catch (err) {
      console.error('Failed to update report:', err);
      alert('❌ ไม่สามารถอัพเดทสถานะได้');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityBadge = (priority: MaintenanceReport['priority']) => {
    const styles = {
      'low': 'bg-slate-100 text-slate-600 border-slate-200',
      'medium': 'bg-orange-100 text-orange-700 border-orange-200',
      'high': 'bg-red-100 text-red-700 border-red-200',
    };
    const labels = {
      'low': 'ต่ำ',
      'medium': 'ปานกลาง',
      'high': 'สูง',
    };
    return (
      <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${styles[priority]}`}>
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
    return (
      <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">งานแม่บ้าน & ซ่อมบำรุง</h2>
          <p className="text-slate-500">Housekeeping & Maintenance Task Board</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setView('rooms')}
            className={`px-6 py-3 rounded-xl transition-all font-bold flex items-center gap-2 ${
              view === 'rooms'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            ห้องพัก
          </button>
          <button
            onClick={() => setView('maintenance')}
            className={`px-6 py-3 rounded-xl transition-all font-bold flex items-center gap-2 relative ${
              view === 'maintenance'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Wrench className="w-5 h-5" />
            รายการแจ้งซ่อม
            {pendingReports.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white">
                {pendingReports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Rooms View */}
      {view === 'rooms' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4 group hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                 <Sparkles className="w-8 h-8" />
              </div>
              <div>
                 <div className="text-slate-800 text-lg font-bold">รอทำความสะอาด</div>
                 <div className="text-slate-500 font-medium">{cleaningRooms.length} ห้อง</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4 group hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                 <Wrench className="w-8 h-8" />
              </div>
              <div>
                 <div className="text-slate-800 text-lg font-bold">กำลังซ่อมบำรุง</div>
                 <div className="text-slate-500 font-medium">{maintenanceRooms.length} ห้อง</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4 group hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                 <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                 <div className="text-slate-800 text-lg font-bold">รอดำเนินการ</div>
                 <div className="text-slate-500 font-medium">{pendingReports.length} รายการ</div>
              </div>
            </div>
          </div>

          {/* Cleaning Rooms */}
          {cleaningRooms.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200">
              <h3 className="text-slate-800 font-bold mb-6 flex items-center text-xl">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                    <Sparkles className="w-6 h-6" />
                </div>
                ห้องที่ต้องทำความสะอาด
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {cleaningRooms.map(room => (
                  <div key={room.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-300 transition-colors">
                    <div className="text-slate-800 font-black text-2xl mb-4">#{room.number}</div>
                    <button
                      onClick={() => handleMarkClean(room)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-xl transition-colors text-sm font-bold mb-2 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      สะอาด
                    </button>
                    <button
                      onClick={() => handleReportMaintenance(room)}
                      className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 py-2.5 px-3 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Wrench className="w-4 h-4" />
                      แจ้งซ่อม
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Rooms */}
          {maintenanceRooms.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200">
              <h3 className="text-slate-800 font-bold mb-6 flex items-center text-xl">
                 <div className="p-2 bg-orange-50 rounded-lg text-orange-600 mr-3">
                    <Wrench className="w-6 h-6" />
                </div>
                ห้องที่อยู่ระหว่างซ่อมบำรุง
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {maintenanceRooms.map(room => {
                  const report = reports.find(r => r.roomId === room.id && r.status !== 'resolved');
                  return (
                    <div key={room.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                      <div className="text-orange-900 font-black text-2xl mb-2">#{room.number}</div>
                      {report && (
                        <div className="text-xs text-orange-800 mb-3 bg-orange-100/50 p-2 rounded-lg line-clamp-2 min-h-[2.5em]">
                            {report.description}
                        </div>
                      )}
                      <div className="text-xs text-white bg-orange-500 font-bold py-1 px-2 rounded-full inline-block">
                        กำลังซ่อม
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cleaningRooms.length === 0 && maintenanceRooms.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">เยี่ยมมาก! ไม่มีงานค้าง</h3>
              <p className="text-slate-500">ห้องพักทั้งหมดพร้อมให้บริการลูกค้า</p>
            </div>
          )}
        </>
      )}

      {/* Maintenance View */}
      {view === 'maintenance' && (
        <div className="space-y-6">
          {/* LINE Integration Info */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-green-500" />
                    LINE Integration System
                </h3>
                <p className="text-slate-500 mb-6">
                เมื่อมีการแจ้งซ่อมใหม่ ระบบจะทำการส่งข้อความแจ้งเตือนไปยังกลุ่ม LINE ของแผนกช่างและผู้จัดการโดยอัตโนมัติ เพื่อความรวดเร็วในการแก้ไขปัญหา
                </p>
                <div className="flex gap-4">
                    <button className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 text-sm hover:bg-green-600 transition-colors">
                        ทดสอบการส่งข้อความ
                    </button>
                    <button className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                        ตั้งค่า Token
                    </button>
                </div>
            </div>
            
            <div className="w-full md:w-80 bg-slate-100 rounded-2xl p-4 border border-slate-200">
               <div className="text-xs font-bold text-slate-400 uppercase mb-2 text-center">Preview</div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-sm space-y-1">
                  <div className="text-green-600 font-bold text-xs mb-2">LINE Notify • Now</div>
                  <div className="font-bold text-slate-800">⚠️ แจ้งซ่อมด่วน</div>
                  <div className="text-slate-600">ห้อง: 101</div>
                  <div className="text-slate-600">ปัญหา: แอร์ไม่เย็น</div>
                  <div className="text-slate-600">ผู้แจ้ง: {currentUser.name}</div>
               </div>
            </div>
          </div>

          {/* Maintenance Reports Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ห้อง</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ความสำคัญ</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เวลาแจ้ง</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map(report => {
                    const room = rooms.find(r => r.id === report.roomId);
                    return (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                            <span className="font-black text-slate-800">#{room?.number}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{report.description}</td>
                        <td className="px-6 py-4">{getPriorityBadge(report.priority)}</td>
                        <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm font-medium">
                          {formatDateTime(report.reportedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {currentUser.role === 'management' && report.status !== 'resolved' && (
                            <div className="flex gap-2">
                              {report.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'in-progress')}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors text-xs font-bold"
                                >
                                  รับงาน
                                </button>
                              )}
                              {report.status === 'in-progress' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs font-bold"
                                >
                                  เสร็จสิ้น
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {reports.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                   <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                   <p className="font-medium">ไม่มีรายการแจ้งซ่อมในระบบ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 text-white px-8 py-6 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <Wrench className="w-5 h-5" />
                 แจ้งซ่อม ห้อง {selectedRoom.number}
              </h2>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors"
              >
                 <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-slate-700 font-bold mb-2">รายละเอียดปัญหา <span className="text-red-500">*</span></label>
                <textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50"
                  placeholder="ระบุอาการเสีย หรือสิ่งที่ต้องซ่อมแซม..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">ระดับความเร่งด่วน</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'low' })}
                    className={`p-3 border rounded-xl transition-all font-bold text-sm ${
                      newReport.priority === 'low'
                        ? 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-200'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    ปกติ
                  </button>
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'medium' })}
                    className={`p-3 border rounded-xl transition-all font-bold text-sm ${
                      newReport.priority === 'medium'
                        ? 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-100'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    ปานกลาง
                  </button>
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'high' })}
                    className={`p-3 border rounded-xl transition-all font-bold text-sm ${
                      newReport.priority === 'high'
                        ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-100'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    ด่วนที่สุด
                  </button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                 <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <MessageSquare className="w-4 h-4" />
                 </div>
                 <p className="text-green-800 text-xs font-medium">
                   ระบบจะส่งการแจ้งเตือนไปยัง LINE Official Account ทันทีที่กดส่งเรื่อง
                 </p>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleSubmitReport}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl transition-colors font-bold shadow-lg shadow-orange-200 active:scale-95"
                >
                  ส่งเรื่องแจ้งซ่อม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
