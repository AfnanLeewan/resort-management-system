import { useState } from 'react';
import { Room, User, MaintenanceReport } from '../types';
import { Wrench, X, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import * as api from '../utils/api';

interface MaintenanceReportModalProps {
  room: Room;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function MaintenanceReportModal({ 
  room, 
  currentUser, 
  onClose, 
  onSuccess 
}: MaintenanceReportModalProps) {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);

  // Get room label from room number
  const getRoomLabel = (roomNumber: number) => {
    if (roomNumber <= 10) return `RC${String(roomNumber).padStart(2, '0')}`;
    if (roomNumber <= 20) return `RB${String(roomNumber - 10).padStart(2, '0')}`;
    return `RA${String(roomNumber - 20).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    setSaving(true);
    try {
      const report: MaintenanceReport = {
        id: `MR${Date.now()}`,
        roomId: room.id,
        reportedBy: currentUser.id,
        description: description.trim(),
        priority,
        status: 'pending',
        reportedAt: new Date().toISOString(),
      };

      // Add the maintenance report
      await api.addMaintenanceReport(report);
      
      // Update room status to maintenance
      await api.updateRoomStatus(room.id, 'maintenance');

      // Show success notification
      alert(`📱 LINE Notification Sent!\n\n⚠️ แจ้งซ่อม ห้อง ${getRoomLabel(room.number)}\n${description}\nระดับความเร่งด่วน: ${priority === 'high' ? 'ด่วนที่สุด' : priority === 'medium' ? 'ปานกลาง' : 'ปกติ'}\n\nระบบจะส่งการแจ้งเตือนไปยัง LINE ของผู้จัดการ`);

      onSuccess();
    } catch (err) {
      console.error('Failed to submit maintenance report:', err);
      alert('❌ ไม่สามารถส่งเรื่องแจ้งซ่อมได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-6 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wrench className="w-5 h-5" />
            </div>
            แจ้งซ่อม ห้อง {getRoomLabel(room.number)}
          </h2>
          <button 
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-2 text-sm uppercase tracking-wider">
              รายละเอียดปัญหา <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={saving}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-slate-50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="ระบุอาการเสีย หรือสิ่งที่ต้องซ่อมแซม เช่น แอร์ไม่เย็น, น้ำไม่ไหล, ไฟเสีย..."
              autoFocus
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-slate-700 font-bold mb-3 text-sm uppercase tracking-wider">
              ระดับความเร่งด่วน
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPriority('low')}
                disabled={saving}
                className={`p-4 border rounded-xl transition-all font-bold text-sm flex flex-col items-center gap-2 ${
                  priority === 'low'
                    ? 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-200 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span className="text-2xl">🔵</span>
                ปกติ
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                disabled={saving}
                className={`p-4 border rounded-xl transition-all font-bold text-sm flex flex-col items-center gap-2 ${
                  priority === 'medium'
                    ? 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-100 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span className="text-2xl">🟠</span>
                ปานกลาง
              </button>
              <button
                type="button"
                onClick={() => setPriority('high')}
                disabled={saving}
                className={`p-4 border rounded-xl transition-all font-bold text-sm flex flex-col items-center gap-2 ${
                  priority === 'high'
                    ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-100 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span className="text-2xl">🔴</span>
                ด่วนที่สุด
              </button>
            </div>
          </div>

          {/* High Priority Warning */}
          {priority === 'high' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-200">
              <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-red-800 text-sm font-bold">งานด่วน!</p>
                <p className="text-red-600 text-xs mt-1">
                  ระบบจะส่งการแจ้งเตือนพิเศษไปยังผู้จัดการและฝ่ายซ่อมบำรุงทันที
                </p>
              </div>
            </div>
          )}

          {/* LINE Integration Info */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-green-800 text-xs font-medium">
              ระบบจะส่งการแจ้งเตือนไปยัง LINE Official Account ทันทีที่กดส่งเรื่อง
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl transition-colors font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !description.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl transition-colors font-bold shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" />
                  ส่งเรื่องแจ้งซ่อม
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
