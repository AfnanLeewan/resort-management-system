import { useState, useMemo } from 'react';
import { User, MaintenanceReport, Room } from '../types';
import { 
  getRooms, 
  updateRoomStatus, 
  getMaintenanceReports, 
  addMaintenanceReport,
  updateMaintenanceReport 
} from '../utils/storage';
import { formatDateTime } from '../utils/dateHelpers';
import { Sparkles, Wrench, AlertTriangle, CheckCircle, Plus, MessageSquare } from 'lucide-react';

interface HousekeepingProps {
  currentUser: User;
}

export function Housekeeping({ currentUser }: HousekeepingProps) {
  const [rooms] = useState<Room[]>(getRooms());
  const [reports, setReports] = useState<MaintenanceReport[]>(getMaintenanceReports());
  const [view, setView] = useState<'rooms' | 'maintenance'>('rooms');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newReport, setNewReport] = useState({
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const cleaningRooms = useMemo(() => rooms.filter(r => r.status === 'cleaning'), [rooms]);
  const maintenanceRooms = useMemo(() => rooms.filter(r => r.status === 'maintenance'), [rooms]);
  const pendingReports = useMemo(() => reports.filter(r => r.status !== 'resolved'), [reports]);

  const handleMarkClean = (room: Room) => {
    if (confirm(`ยืนยันว่าห้อง ${room.number} สะอาดแล้ว?`)) {
      updateRoomStatus(room.id, 'available');
      alert('✅ อัพเดทสถานะห้องเรียบร้อย');
      window.location.reload();
    }
  };

  const handleReportMaintenance = (room: Room) => {
    setSelectedRoom(room);
    setShowReportModal(true);
  };

  const handleSubmitReport = () => {
    if (!selectedRoom || !newReport.description) {
      alert('กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    const report: MaintenanceReport = {
      id: `MR${Date.now()}`,
      roomId: selectedRoom.id,
      reportedBy: currentUser.id,
      description: newReport.description,
      priority: newReport.priority,
      status: 'pending',
      reportedAt: new Date().toISOString(),
    };

    addMaintenanceReport(report);
    updateRoomStatus(selectedRoom.id, 'maintenance');

    // Simulate LINE notification
    alert(`📱 LINE Notification Sent!\n\n⚠️ แจ้งซ่อม ห้อง ${selectedRoom.number}\n${newReport.description}\n\nระบบจะส่งการแจ้งเตือนไปยัง LINE ของผู้จัดการ`);

    setReports(getMaintenanceReports());
    setShowReportModal(false);
    setSelectedRoom(null);
    setNewReport({ description: '', priority: 'medium' });
  };

  const handleUpdateReportStatus = (reportId: string, status: MaintenanceReport['status']) => {
    updateMaintenanceReport(reportId, { 
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined 
    });

    if (status === 'resolved') {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        updateRoomStatus(report.roomId, 'cleaning');
      }
    }

    setReports(getMaintenanceReports());
  };

  const getPriorityBadge = (priority: MaintenanceReport['priority']) => {
    const styles = {
      'low': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      'medium': 'bg-orange-100 text-orange-800 border-orange-300',
      'high': 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      'low': '🔵 ต่ำ',
      'medium': '🟡 ปานกลาง',
      'high': '🔴 สูง',
    };
    return (
      <span className={`px-3 py-1 rounded-lg border-2 text-sm ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getStatusBadge = (status: MaintenanceReport['status']) => {
    const styles = {
      'pending': 'bg-orange-100 text-orange-800 border-orange-300',
      'in-progress': 'bg-neutral-100 text-neutral-800 border-neutral-300',
      'resolved': 'bg-green-100 text-green-800 border-green-300',
    };
    const labels = {
      'pending': 'รอดำเนินการ',
      'in-progress': 'กำลังซ่อม',
      'resolved': 'เสร็จสิ้น',
    };
    return (
      <span className={`px-3 py-1 rounded-lg border-2 text-sm ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900 font-bold mb-2">แม่บ้านและซ่อมบำรุง / Housekeeping & Maintenance</h2>
          <p className="text-neutral-500">จัดการความสะอาดและการซ่อมบำรุง</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setView('rooms')}
            className={`px-6 py-3 rounded-xl transition-colors ${
              view === 'rooms'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-neutral-400'
            }`}
          >
            <Sparkles className="w-5 h-5 inline mr-2" />
            ห้องพัก
          </button>
          <button
            onClick={() => setView('maintenance')}
            className={`px-6 py-3 rounded-xl transition-colors relative ${
              view === 'maintenance'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-neutral-400'
            }`}
          >
            <Wrench className="w-5 h-5 inline mr-2" />
            ซ่อมบำรุง
            {pendingReports.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold border-2 border-white">
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
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-neutral-100 rounded-xl">
                  <Sparkles className="w-8 h-8 text-neutral-600" />
                </div>
                <div>
                  <div className="text-neutral-900 font-bold">รอทำความสะอาด</div>
                  <div className="text-neutral-500">{cleaningRooms.length} ห้อง</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-neutral-100 rounded-xl">
                  <Wrench className="w-8 h-8 text-neutral-600" />
                </div>
                <div>
                  <div className="text-neutral-900 font-bold">ซ่อมบำรุง</div>
                  <div className="text-neutral-500">{maintenanceRooms.length} ห้อง</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <div className="text-neutral-900 font-bold">รอดำเนินการ</div>
                  <div className="text-neutral-500">{pendingReports.length} รายการ</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cleaning Rooms */}
          {cleaningRooms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-neutral-200">
              <h3 className="text-neutral-900 font-bold mb-4 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-neutral-600" />
                ห้องที่ต้องทำความสะอาด / Rooms to Clean
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {cleaningRooms.map(room => (
                  <div key={room.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center">
                    <div className="text-neutral-900 font-bold mb-3">ห้อง {room.number}</div>
                    <button
                      onClick={() => handleMarkClean(room)}
                      className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2 px-3 rounded-lg transition-colors text-sm font-medium mb-2"
                    >
                      ✓ สะอาดแล้ว
                    </button>
                    <button
                      onClick={() => handleReportMaintenance(room)}
                      className="w-full bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 py-2 px-3 rounded-lg transition-colors text-sm font-medium"
                    >
                      🔧 แจ้งซ่อม
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Rooms */}
          {maintenanceRooms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-neutral-200">
              <h3 className="text-neutral-900 font-bold mb-4 flex items-center">
                <Wrench className="w-6 h-6 mr-2 text-orange-600" />
                ห้องที่อยู่ระหว่างซ่อมบำรุง / Under Maintenance
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {maintenanceRooms.map(room => {
                  const report = reports.find(r => r.roomId === room.id && r.status !== 'resolved');
                  return (
                    <div key={room.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <div className="text-orange-900 font-bold mb-2">ห้อง {room.number}</div>
                      {report && (
                        <div className="text-xs text-orange-700 mb-2">{report.description}</div>
                      )}
                      <div className="text-xs text-orange-600 font-medium">🔧 กำลังซ่อม</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cleaningRooms.length === 0 && maintenanceRooms.length === 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-neutral-900 font-bold mb-2">✨ เยี่ยมมาก! ไม่มีห้องที่ต้องดูแล</h3>
              <p className="text-neutral-500">ห้องพักทั้งหมดพร้อมให้บริการ</p>
            </div>
          )}
        </>
      )}

      {/* Maintenance View */}
      {view === 'maintenance' && (
        <div className="space-y-6">
          {/* LINE Integration Info */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-neutral-900 font-bold mb-3">
              📱 LINE Integration
            </h3>
            <p className="text-neutral-600 mb-3">
              เมื่อมีการแจ้งซ่อม ระบบจะส่งการแจ้งเตือนไปยัง LINE ของผู้จัดการโดยอัตโนมัติ
            </p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <div className="text-sm text-neutral-500 mb-2">ตัวอย่างข้อความ LINE:</div>
              <div className="bg-white p-3 rounded-lg text-sm border border-neutral-200">
                <div className="text-orange-600 font-bold">⚠️ แจ้งซ่อม - Royyan Resort</div>
                <div className="text-neutral-700 mt-1">ห้อง: 101</div>
                <div className="text-neutral-700">ปัญหา: แอร์ไม่เย็น</div>
                <div className="text-neutral-700">ผู้แจ้ง: {currentUser.name}</div>
                <div className="text-neutral-700">เวลา: {formatDateTime(new Date().toISOString())}</div>
              </div>
            </div>
          </div>

          {/* Maintenance Reports */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">ห้อง</th>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">รายละเอียด</th>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">ความสำคัญ</th>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">สถานะ</th>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">เวลาแจ้ง</th>
                    <th className="px-6 py-4 text-left text-neutral-700 font-bold">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {reports.map(report => {
                    const room = rooms.find(r => r.id === report.roomId);
                    return (
                      <tr key={report.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 text-neutral-900 font-medium">
                          ห้อง {room?.number}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{report.description}</td>
                        <td className="px-6 py-4">{getPriorityBadge(report.priority)}</td>
                        <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                        <td className="px-6 py-4 text-neutral-500 text-sm">
                          {formatDateTime(report.reportedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {currentUser.role === 'management' && report.status !== 'resolved' && (
                            <div className="flex gap-2">
                              {report.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'in-progress')}
                                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm"
                                >
                                  เริ่มซ่อม
                                </button>
                              )}
                              {report.status === 'in-progress' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                                >
                                  ✓ เสร็จสิ้น
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
                <div className="text-center py-12 text-neutral-400">
                  ไม่มีรายการแจ้งซ่อม / No maintenance reports
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-neutral-900 text-white px-8 py-6">
              <h2 className="text-xl font-bold">🔧 แจ้งซ่อมห้อง {selectedRoom.number}</h2>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-neutral-700 font-bold mb-2">รายละเอียดปัญหา / Description *</label>
                <textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  placeholder="ระบุรายละเอียดปัญหา เช่น แอร์ไม่เย็น, ก๊อกน้ำรั่ว, โคมไฟเสีย"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-2">ความสำคัญ / Priority</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'low' })}
                    className={`p-4 border rounded-xl transition-all ${
                      newReport.priority === 'low'
                        ? 'border-neutral-500 bg-neutral-100 text-neutral-900 font-bold'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    🔵 ต่ำ
                  </button>
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'medium' })}
                    className={`p-4 border rounded-xl transition-all ${
                      newReport.priority === 'medium'
                        ? 'border-orange-500 bg-orange-50 text-orange-800 font-bold'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    🟡 ปานกลาง
                  </button>
                  <button
                    onClick={() => setNewReport({ ...newReport, priority: 'high' })}
                    className={`p-4 border rounded-xl transition-all ${
                      newReport.priority === 'high'
                        ? 'border-red-500 bg-red-50 text-red-800 font-bold'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    🔴 สูง
                  </button>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                <p className="text-neutral-600 text-sm">
                  📱 ระบบจะส่งการแจ้งเตือนไปยัง LINE ของผู้จัดการทันที
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmitReport}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl transition-colors font-bold"
                >
                  📨 ส่งการแจ้งซ่อม / Submit Report
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedRoom(null);
                    setNewReport({ description: '', priority: 'medium' });
                  }}
                  className="px-8 py-4 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-xl transition-colors font-medium"
                >
                  ยกเลิก / Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
