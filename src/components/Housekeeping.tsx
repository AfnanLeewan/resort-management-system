import { useState, useMemo, useEffect } from 'react';
import { User, MaintenanceReport, Room, LineCleaningTask } from '../types';
import * as api from '../utils/api';
import * as lineService from '../utils/lineService';
import { formatDateTime } from '../utils/dateHelpers';
import { Sparkles, Wrench, AlertTriangle, CheckCircle, MessageSquare, Check, X, Loader2, ClipboardCheck, Clock } from 'lucide-react';
interface HousekeepingProps {
  currentUser: User;
}
export function Housekeeping({ currentUser }: HousekeepingProps) {
  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<LineCleaningTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'rooms' | 'maintenance'>('rooms');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedTask, setSelectedTask] = useState<LineCleaningTask | null>(null);
  const [newReport, setNewReport] = useState({
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  // Load data on mount
  useEffect(() => {
    loadData();
    // Poll for updates every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);
  const loadData = async () => {
    try {
      const [loadedRooms, loadedReports, loadedTasks, loadedUsers] = await Promise.all([
        api.getRooms(),
        api.getMaintenanceReports(),
        lineService.getActiveCleaningTasks(), // Get all active (non-inspected) tasks
        api.getUsers(), // Load users to get housekeeper names
      ]);
      setRooms(loadedRooms.sort((a, b) => a.number - b.number));
      setReports(loadedReports);
      setCleaningTasks(loadedTasks);
      setUsers(loadedUsers);
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
  
  // Cleaning tasks by status
  const pendingTasks = useMemo(() => 
    cleaningTasks.filter(t => t.status === 'pending'),
  [cleaningTasks]);
  
  const acceptedTasks = useMemo(() => 
    cleaningTasks.filter(t => t.status === 'accepted' || t.status === 'pending_repair_details'),
  [cleaningTasks]);
  
  // Rooms that housekeepers have marked as cleaned via LINE (pending admin approval)
  const pendingInspectionTasks = useMemo(() => 
    cleaningTasks.filter(t => t.status === 'completed' && !t.inspectedAt),
  [cleaningTasks]);
  
  // Rooms that housekeepers reported need repair
  const needsRepairTasks = useMemo(() => 
    cleaningTasks.filter(t => t.status === 'needs_repair'),
  [cleaningTasks]);
  
  // Helper to get user name by ID
  const getUserName = (userId: string | undefined) => {
    if (!userId) return 'ไม่ระบุ';
    const user = users.find(u => u.id === userId);
    return user?.name || 'ไม่ระบุ';
  };
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
  // Handle approving a cleaning task (from LINE housekeeper completion)
  const handleApproveInspection = async (task: LineCleaningTask) => {
    const room = rooms.find(r => r.id === task.roomId);
    if (!room) return;
    
    setSaving(true);
    try {
      // Update room status to available
      await api.updateRoomStatus(task.roomId, 'available');
      
      // Update task status to inspected in database
      await lineService.updateCleaningTaskStatus(task.id, 'inspected', currentUser.id);
      
      // Update local room state
      setRooms(prevRooms => 
        prevRooms.map(r => 
          r.id === task.roomId ? { ...r, status: 'available' } : r
        )
      );
      
      // Remove task from local state
      setCleaningTasks(prev => prev.filter(t => t.id !== task.id));
      
    } catch (err) {
      console.error('Failed to approve inspection:', err);
      alert('❌ ไม่สามารถอนุมัติได้');
    } finally {
      setSaving(false);
    }
  };
  // Open repair modal with pre-filled data from housekeeper report
  const handleReportFromTask = (task: LineCleaningTask) => {
    const room = rooms.find(r => r.id === task.roomId);
    if (!room) return;
    
    setSelectedRoom(room);
    setSelectedTask(task);
    setNewReport({
      description: task.notes || '',
      priority: 'medium',
    });
    setShowReportModal(true);
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
      // If this report is from a housekeeper task, mark it as inspected
      if (selectedTask) {
        await lineService.updateCleaningTaskStatus(selectedTask.id, 'inspected', currentUser.id);
        setCleaningTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      }
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
      setSelectedTask(null);
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Waiting Housekeeper Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${pendingTasks.length > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors relative ${pendingTasks.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                 <Clock className="w-6 h-6" />
                 {pendingTasks.length > 0 && (
                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                 )}
              </div>
              <div>
                 <div className={`text-sm font-bold ${pendingTasks.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>รอแม่บ้าน</div>
                 <div className={`text-lg font-black ${pendingTasks.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pendingTasks.length}</div>
              </div>
            </div>

            {/* Cleaning in Progress Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${acceptedTasks.length > 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors ${acceptedTasks.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                 <Sparkles className="w-6 h-6" />
              </div>
              <div>
                 <div className={`text-sm font-bold ${acceptedTasks.length > 0 ? 'text-blue-700' : 'text-slate-700'}`}>กำลังทำ</div>
                 <div className={`text-lg font-black ${acceptedTasks.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{acceptedTasks.length}</div>
              </div>
            </div>
            {/* Pending Inspection Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${pendingInspectionTasks.length > 0 ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors relative ${pendingInspectionTasks.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                 <ClipboardCheck className="w-6 h-6" />
                 {pendingInspectionTasks.length > 0 && (
                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                 )}
              </div>
              <div>
                 <div className={`text-sm font-bold ${pendingInspectionTasks.length > 0 ? 'text-green-700' : 'text-slate-700'}`}>รอตรวจสอบ</div>
                 <div className={`text-lg font-black ${pendingInspectionTasks.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>{pendingInspectionTasks.length}</div>
              </div>
            </div>
            {/* Needs Repair Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${needsRepairTasks.length > 0 ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors relative ${needsRepairTasks.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                 <Wrench className="w-6 h-6" />
                 {needsRepairTasks.length > 0 && (
                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                 )}
              </div>
              <div>
                 <div className={`text-sm font-bold ${needsRepairTasks.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>แจ้งซ่อม</div>
                 <div className={`text-lg font-black ${needsRepairTasks.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{needsRepairTasks.length}</div>
              </div>
            </div>
            {/* Maintenance Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${maintenanceRooms.length > 0 ? 'border-purple-300' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors ${maintenanceRooms.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                 <Wrench className="w-6 h-6" />
              </div>
              <div>
                 <div className={`text-sm font-bold ${maintenanceRooms.length > 0 ? 'text-purple-700' : 'text-slate-700'}`}>ซ่อมบำรุง</div>
                 <div className={`text-lg font-black ${maintenanceRooms.length > 0 ? 'text-purple-600' : 'text-slate-400'}`}>{maintenanceRooms.length}</div>
              </div>
            </div>
            {/* Pending Reports Card */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 group hover:-translate-y-1 transition-transform ${pendingReports.length > 0 ? 'border-orange-300' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-xl transition-colors ${pendingReports.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                 <div className={`text-sm font-bold ${pendingReports.length > 0 ? 'text-orange-700' : 'text-slate-700'}`}>รอดำเนินการ</div>
                 <div className={`text-lg font-black ${pendingReports.length > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{pendingReports.length}</div>
              </div>
            </div>
          </div>

          {/* Waiting Housekeeper (pending tasks) - Just after checkout */}
          {pendingTasks.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-3xl shadow-sm p-8 border-2 border-amber-200">
              <h3 className="text-amber-800 font-bold mb-6 flex items-center text-xl">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3 relative">
                    <Clock className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                </div>
                รอแม่บ้านรับงาน
                <span className="ml-3 px-3 py-1 bg-amber-600 text-white rounded-full text-sm font-bold">
                  {pendingTasks.length} ห้อง
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {pendingTasks.map(task => {
                  const room = rooms.find(r => r.id === task.roomId);
                  if (!room) return null;
                  return (
                    <div key={task.id} className="bg-white border-2 border-amber-200 rounded-2xl p-4 text-center shadow-md">
                      <div className="text-amber-700 font-black text-2xl mb-2">#{room.number}</div>
                      <div className="text-xs text-amber-600 mb-2 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.createdAt ? formatDateTime(task.createdAt) : '-'}
                      </div>
                      <div className="text-xs text-white bg-amber-500 font-bold py-1.5 px-2 rounded-full">
                        ⏳ รอรับงาน
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Cleaning in Progress (accepted tasks) - With housekeeper name */}
          {acceptedTasks.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl shadow-sm p-8 border-2 border-blue-200">
              <h3 className="text-blue-800 font-bold mb-6 flex items-center text-xl">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                    <Sparkles className="w-6 h-6" />
                </div>
                กำลังทำความสะอาด
                <span className="ml-3 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                  {acceptedTasks.length} ห้อง
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {acceptedTasks.map(task => {
                  const room = rooms.find(r => r.id === task.roomId);
                  if (!room) return null;
                  return (
                    <div key={task.id} className="bg-white border-2 border-blue-200 rounded-2xl p-4 text-center shadow-md">
                      <div className="text-blue-700 font-black text-2xl mb-2">#{room.number}</div>
                      <div className="text-xs text-blue-600 mb-2 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.acceptedAt ? formatDateTime(task.acceptedAt) : '-'}
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                        <div className="text-xs text-blue-400 uppercase tracking-wide">แม่บ้าน</div>
                        <div className="text-sm text-blue-800 font-bold truncate">
                          {getUserName(task.assignedTo)}
                        </div>
                      </div>
                      <div className="text-xs text-white bg-blue-500 font-bold py-1.5 px-2 rounded-full inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        กำลังทำ
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pending Inspection (from LINE) - Rooms cleaned by housekeepers waiting admin approval */}
          {pendingInspectionTasks.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl shadow-sm p-8 border-2 border-green-200 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-green-800 font-bold flex items-center text-xl">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600 mr-3 relative">
                    <ClipboardCheck className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  รอตรวจสอบจาก LINE
                  <span className="ml-3 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                    {pendingInspectionTasks.length} ห้อง
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-green-600 text-sm bg-white px-3 py-1.5 rounded-lg border border-green-200">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">แม่บ้านแจ้งทำความสะอาดเสร็จแล้ว</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {pendingInspectionTasks.map(task => {
                  const room = rooms.find(r => r.id === task.roomId);
                  if (!room) return null;
                  return (
                    <div key={task.id} className="bg-white border-2 border-green-300 rounded-2xl p-4 text-center shadow-lg shadow-green-100">
                      <div className="text-green-700 font-black text-2xl mb-2">#{room.number}</div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                        <div className="text-xs text-green-400 uppercase tracking-wide">แม่บ้าน</div>
                        <div className="text-sm text-green-800 font-bold truncate">
                          {getUserName(task.assignedTo)}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 mb-3 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.completedAt ? formatDateTime(task.completedAt) : '-'}
                      </div>
                      <button
                        onClick={() => handleApproveInspection(task)}
                        disabled={saving}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-3 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            อนุมัติ → พร้อม
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Needs Repair (reported by housekeeper via LINE) */}
          {needsRepairTasks.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-3xl shadow-sm p-8 border-2 border-red-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-red-800 font-bold flex items-center text-xl">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600 mr-3 relative">
                    <Wrench className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  แจ้งซ่อมจากแม่บ้าน
                  <span className="ml-3 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                    {needsRepairTasks.length} ห้อง
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-red-600 text-sm bg-white px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">แม่บ้านพบสิ่งที่ต้องซ่อม</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {needsRepairTasks.map(task => {
                  const room = rooms.find(r => r.id === task.roomId);
                  if (!room) return null;
                  return (
                    <div key={task.id} className="bg-white border-2 border-red-300 rounded-2xl p-4 text-center shadow-lg shadow-red-100">
                      <div className="text-red-700 font-black text-2xl mb-2">#{room.number}</div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                        <div className="text-xs text-red-400 uppercase tracking-wide">แจ้งโดย</div>
                        <div className="text-sm text-red-800 font-bold truncate">
                          {getUserName(task.assignedTo)}
                        </div>
                      </div>
                      {task.notes && (
                        <div className="text-left mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs text-red-500 font-semibold mb-1">รายละเอียด:</div>
                          <div className="text-sm text-red-800 break-words">
                            {task.notes}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleReportFromTask(task)}
                        disabled={saving}
                        className="w-full bg-red-30 hover:bg-red-50 text-red-500 py-3 px-3 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Wrench className="w-4 h-4" />
                            แจ้งซ่อม
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {cleaningRooms.length > 0 && pendingTasks.length === 0 && acceptedTasks.length === 0 && pendingInspectionTasks.length === 0 && (
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