import { useState, useEffect, useMemo } from 'react';
import { Room, RoomType, User } from '../types';
import * as api from '../utils/api';
import { PRICING } from '../utils/pricing';
import { formatCurrency } from '../utils/dateHelpers';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Bed,
  BedDouble,
  Save,
  X,
  Loader2,
  Settings,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Home
} from 'lucide-react';

interface RoomManagementProps {
  currentUser: User;
}

interface RoomFormData {
  number: number;
  type: RoomType;
}

interface PricingConfig {
  general: number;
  tour: number;
  vip: number;
}

export function RoomManagement({ currentUser }: RoomManagementProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<RoomFormData>({
    number: 1,
    type: 'single'
  });
  
  // Pricing config (loaded from PRICING constant - in future could be from DB)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    general: PRICING.general,
    tour: PRICING.tour,
    vip: PRICING.vip
  });

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const fetchedRooms = await api.getRooms();
      setRooms(fetchedRooms.sort((a, b) => a.number - b.number));
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter rooms based on search
  const filteredRooms = useMemo(() => {
    if (!searchTerm) return rooms;
    const term = searchTerm.toLowerCase();
    return rooms.filter(room =>
      room.number.toString().includes(term) ||
      room.type.toLowerCase().includes(term)
    );
  }, [rooms, searchTerm]);

  // Group rooms by type for statistics
  const roomStats = useMemo(() => {
    const singleRooms = rooms.filter(r => r.type === 'single');
    const doubleRooms = rooms.filter(r => r.type === 'double');
    return {
      total: rooms.length,
      single: singleRooms.length,
      double: doubleRooms.length
    };
  }, [rooms]);

  // Get next available room number
  const getNextRoomNumber = () => {
    if (rooms.length === 0) return 1;
    const maxNumber = Math.max(...rooms.map(r => r.number));
    return maxNumber + 1;
  };

  // Handle add room
  const handleAddRoom = async () => {
    // Check if room number already exists
    if (rooms.some(r => r.number === formData.number)) {
      alert('ห้องหมายเลขนี้มีอยู่แล้ว / Room number already exists');
      return;
    }

    setIsSaving(true);
    try {
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        number: formData.number,
        type: formData.type,
        status: 'available'
      };
      
      await api.addRoom(newRoom);
      await loadRooms();
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to add room:', err);
      alert('ไม่สามารถเพิ่มห้องได้ / Failed to add room');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit room
  const handleEditRoom = async () => {
    if (!selectedRoom) return;

    // Check if room number already exists (excluding current room)
    if (rooms.some(r => r.number === formData.number && r.id !== selectedRoom.id)) {
      alert('ห้องหมายเลขนี้มีอยู่แล้ว / Room number already exists');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateRoom(selectedRoom.id, {
        number: formData.number,
        type: formData.type
      });
      await loadRooms();
      setShowEditModal(false);
      setSelectedRoom(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update room:', err);
      alert('ไม่สามารถแก้ไขห้องได้ / Failed to update room');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (room: Room) => {
    if (room.status === 'occupied') {
      alert('ไม่สามารถลบห้องที่มีผู้เข้าพักได้ / Cannot delete occupied room');
      return;
    }

    if (!confirm(`ต้องการลบห้อง ${room.number} หรือไม่?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    setDeleting(room.id);
    try {
      await api.deleteRoom(room.id);
      await loadRooms();
    } catch (err) {
      console.error('Failed to delete room:', err);
      alert('ไม่สามารถลบห้องได้ / Failed to delete room');
    } finally {
      setDeleting(null);
    }
  };

  // Open edit modal
  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      number: room.number,
      type: room.type
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      number: getNextRoomNumber(),
      type: 'single'
    });
  };

  // Open add modal with next room number
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Status badge
  const getStatusBadge = (status: Room['status']) => {
    const config = {
      available: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'ว่าง' },
      occupied: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'มีผู้เข้าพัก' },
      cleaning: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'ทำความสะอาด' },
      maintenance: { bg: 'bg-red-100', text: 'text-red-700', label: 'ซ่อมบำรุง' },
    };
    const { bg, text, label } = config[status] || config.available;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Rooms */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Home className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">ห้องพักทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-800">{roomStats.total}</p>
            </div>
          </div>
        </div>

        {/* Single Rooms */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Bed className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">ห้องเตียงเดี่ยว</p>
              <p className="text-2xl font-bold text-slate-800">{roomStats.single}</p>
            </div>
          </div>
        </div>

        {/* Double Rooms */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-xl">
              <BedDouble className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">ห้องเตียงคู่</p>
              <p className="text-2xl font-bold text-slate-800">{roomStats.double}</p>
            </div>
          </div>
        </div>

        {/* Pricing Button */}
        <button
          onClick={() => setShowPricingModal(true)}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 border border-emerald-400 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-100 font-medium">ราคาห้องพัก</p>
              <p className="text-lg font-bold text-white group-hover:underline">ตั้งค่าราคา →</p>
            </div>
          </div>
        </button>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาหมายเลขห้อง หรือประเภท..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all"
            />
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          เพิ่มห้องใหม่
        </button>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเลขห้อง</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        room.type === 'single' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}>
                        {room.type === 'single' 
                          ? <Bed className="w-5 h-5 text-blue-500" />
                          : <BedDouble className="w-5 h-5 text-purple-500" />
                        }
                      </div>
                      <span className="text-lg font-bold text-slate-800">ห้อง {room.number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      room.type === 'single' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {room.type === 'single' ? 'เตียงเดี่ยว' : 'เตียงคู่'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(room.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(room)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        disabled={room.status === 'occupied' || deleting === room.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={room.status === 'occupied' ? 'ไม่สามารถลบห้องที่มีผู้เข้าพัก' : 'ลบ'}
                      >
                        {deleting === room.id 
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Bed className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">ไม่พบห้องพัก</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Room Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">
                  {showAddModal ? 'เพิ่มห้องใหม่' : 'แก้ไขห้อง'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedRoom(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Room Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  หมายเลขห้อง *
                </label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300"
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ประเภทห้อง *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'single' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.type === 'single'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Bed className="w-6 h-6" />
                    <span className="font-medium">เตียงเดี่ยว</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'double' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.type === 'double'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <BedDouble className="w-6 h-6" />
                    <span className="font-medium">เตียงคู่</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedRoom(null);
                }}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={showAddModal ? handleAddRoom : handleEditRoom}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {showAddModal ? 'เพิ่มห้อง' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">ตั้งค่าราคาห้องพัก</h3>
                  <p className="text-sm text-slate-500 mt-1">ราคารวม VAT 7% แล้ว</p>
                </div>
                <button
                  onClick={() => setShowPricingModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* General Rate */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-lg">
                      <DollarSign className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">ราคาทั่วไป (General)</p>
                      <p className="text-xs text-slate-500">สำหรับลูกค้าทั่วไป Walk-in</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricingConfig.general}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, general: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  <span className="text-slate-500 font-medium">฿/คืน</span>
                </div>
              </div>

              {/* Tour Rate */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-200 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">ราคาทัวร์ (Tour)</p>
                      <p className="text-xs text-slate-500">สำหรับกรุ๊ปทัวร์</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricingConfig.tour}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, tour: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-slate-500 font-medium">฿/คืน</span>
                </div>
              </div>

              {/* VIP Rate */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-200 rounded-lg">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">ราคา VIP</p>
                      <p className="text-xs text-slate-500">สำหรับลูกค้า VIP / ส่วนลดพิเศษ</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricingConfig.vip}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, vip: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                  <span className="text-slate-500 font-medium">฿/คืน</span>
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="text-sm text-orange-700">
                  <p className="font-medium mb-1">หมายเหตุ</p>
                  <p>การเปลี่ยนแปลงราคาจะมีผลกับการจองใหม่เท่านั้น การจองที่มีอยู่แล้วจะใช้ราคาเดิม ฟีเจอร์นี้ยังไม่เชื่อมต่อกับฐานข้อมูล</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowPricingModal(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  // In future: save to database
                  alert('บันทึกเรียบร้อย (Note: ฟีเจอร์นี้ยังไม่เชื่อมต่อกับฐานข้อมูล)');
                  setShowPricingModal(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
