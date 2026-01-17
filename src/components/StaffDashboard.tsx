import { useState, useEffect, useRef } from 'react';
import { User, UserRole, AttendanceRecord } from '../types';
import * as api from '../utils/api';
import { 
  Users, 
  UserPlus, 
  Clock, 
  Phone, 
  Briefcase, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle,
  CalendarDays,
  Camera,
  LogOut,
  LogIn,
  Pencil,
  Trash2,
  Upload,
  History,
  FileText,
  Search,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";

export function StaffDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        setCurrentTime(new Date());
        loadData(); // Poll for updates
    }, 10000); 
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const loadedUsers = await api.getUsers();
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string) => {
    await api.toggleUserOnlineStatus(userId);
    loadData();
  };

  const handleAttendance = async (userId: string, type: 'check-in' | 'check-out') => {
    await api.toggleUserAttendance(userId, type);
    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        await api.deleteUser(userId);
        loadData();
    }
  };

  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setIsModalOpen(true);
  };

  const handleAddUser = () => {
      setEditingUser(null);
      setIsModalOpen(true);
  };

  const stats = {
    total: users.length,
    working: users.filter(u => u.status === 'on-duty').length,
    online: users.filter(u => u.isOnline).length,
    leave: users.filter(u => u.status === 'on-leave').length,
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                <Users className="w-6 h-6" />
            </div>
            <div>
                <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                <div className="text-slate-500 text-sm">พนักงานทั้งหมด</div>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
                <Briefcase className="w-6 h-6" />
            </div>
            <div>
                <div className="text-3xl font-bold text-green-600">{stats.working}</div>
                <div className="text-slate-500 text-sm">เข้างานอยู่ (On Duty)</div>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
                <div className="text-3xl font-bold text-blue-600">{stats.online}</div>
                <div className="text-slate-500 text-sm">ออนไลน์ (Online)</div>
            </div>
         </div>
         
         {activeTab === 'overview' ? (
             <button 
                onClick={handleAddUser}
                className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
             >
                <UserPlus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="font-bold">เพิ่มพนักงานใหม่</span>
             </button>
         ) : (
             <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
             >
                <FileText className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="font-bold">บันทึกการลางาน</span>
             </button>
         )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6 shrink-0">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Users className="w-4 h-4 mr-2" />
                    จัดการพนักงาน
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <History className="w-4 h-4 mr-2" />
                    ประวัติการทำงาน
                  </TabsTrigger>
              </TabsList>
              
              <div className="text-sm text-slate-500 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-4 h-4" />
                    {format(currentTime, "d MMM yyyy HH:mm", { locale: th })}
              </div>
          </div>

          <TabsContent value="overview" className="flex-1 min-h-0 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-y-auto outline-none">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map(user => (
                    <StaffCard 
                        key={user.id} 
                        user={user} 
                        onStatusToggle={() => handleStatusToggle(user.id)}
                        onAttendance={handleAttendance}
                        onEdit={() => handleEditUser(user)}
                        onDelete={() => handleDeleteUser(user.id)}
                    />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col outline-none">
             <AttendanceHistory users={users} />
          </TabsContent>
      </Tabs>

      {isModalOpen && (
        <StaffModal 
            user={editingUser}
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
                setIsModalOpen(false);
                loadData();
            }} 
        />
      )}

      {isLeaveModalOpen && (
        <LeaveModal 
            users={users}
            onClose={() => setIsLeaveModalOpen(false)}
            onSuccess={() => {
                setIsLeaveModalOpen(false);
                loadData();
            }}
        />
      )}
    </div>
  );
}

function AttendanceHistory({ users }: { users: User[] }) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filterUser, setFilterUser] = useState<string>('all');
    
    useEffect(() => {
        // Load records
        const loadRecords = async () => {
            const allRecords = await api.getAttendanceRecords();
            setRecords(allRecords.sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        };
        loadRecords();
    }, [users]); // Reload if users change (e.g. status update)

    const filteredRecords = records.filter(record => {
        if (filterUser !== 'all' && record.userId !== filterUser) return false;
        return true;
    });

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-slate-800">รายการประวัติการทำงาน</h3>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                    >
                        <option value="all">พนักงานทั้งหมด</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-xl">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[180px]">วันเวลา</TableHead>
                            <TableHead>พนักงาน</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead>รายละเอียด / หมายเหตุ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-mono text-slate-600">
                                        {format(parseISO(record.timestamp), "d MMM yyyy HH:mm", { locale: th })}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-800">
                                        {getUserName(record.userId)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            record.type === 'check-in' ? 'default' : 
                                            record.type === 'check-out' ? 'secondary' : 
                                            'destructive' // Leave
                                        } className={
                                            record.type === 'check-in' ? 'bg-green-500 hover:bg-green-600' : 
                                            record.type === 'check-out' ? 'bg-slate-500 hover:bg-slate-600' : 
                                            'bg-orange-500 hover:bg-orange-600'
                                        }>
                                            {record.type === 'check-in' && 'เข้างาน'}
                                            {record.type === 'check-out' && 'ออกงาน'}
                                            {record.type === 'leave' && 'ลางาน'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {record.type === 'leave' ? (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-orange-600">วันที่ลา: {record.leaveDate}</span>
                                                <span className="text-slate-500">{record.leaveReason}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">{record.note || '-'}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-slate-400">
                                    ไม่พบข้อมูลประวัติ
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function LeaveModal({ users, onClose, onSuccess }: { users: User[], onClose: () => void, onSuccess: () => void }) {
    const [userId, setUserId] = useState(users[0]?.id || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await api.recordLeave(userId, date, reason);
        onSuccess();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">บันทึกการลางาน</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">พนักงาน</label>
                        <select
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">วันที่ลา</label>
                        <input 
                            type="date"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เหตุผลการลา</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="ระบุเหตุผล เช่น ลาป่วย, ลากิจ"
                        />
                    </div>

                    <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                        <FileText className="w-5 h-5" />
                        บันทึกข้อมูล
                    </button>
                </form>
            </div>
        </div>
    );
}

function StaffCard({ 
    user, 
    onStatusToggle, 
    onAttendance,
    onEdit,
    onDelete
}: { 
    user: User, 
    onStatusToggle: () => void, 
    onAttendance: (id: string, type: 'check-in' | 'check-out') => void,
    onEdit: () => void,
    onDelete: () => void
}) {
    const isOnDuty = user.status === 'on-duty';
    
    // Determine shift for today
    const todayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    const todayShift = user.shifts?.find(s => s.day === todayStr);

    return (
        <div className={`
            relative p-6 rounded-3xl border-2 transition-all duration-300 group/card
            ${isOnDuty ? 'bg-white border-green-400 shadow-lg shadow-green-100' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}
        `}>
             {/* Edit/Delete Menu */}
             <div className="absolute top-4 left-4 z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                            <Pencil className="w-4 h-4 mr-2" />
                            แก้ไขข้อมูล
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" />
                            ลบพนักงาน
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Status Indicator (Online/Offline) */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button 
                    onClick={onStatusToggle}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                        ${user.isOnline 
                            ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' 
                            : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'}
                    `}
                    title="Toggle Online Status"
                >
                    <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
                    {user.isOnline ? 'Online' : 'Offline'}
                </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center text-center mb-6 mt-6">
                <div className="relative mb-4 group">
                    <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${isOnDuty ? 'border-green-500' : 'border-white shadow-md'} bg-slate-100`}>
                        <ImageWithFallback 
                            src={user.photoUrl || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60"} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {isOnDuty && (
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Working Now">
                            <Briefcase className="w-4 h-4" />
                        </div>
                    )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">{user.name}</h3>
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    {user.role}
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    {user.phone || '-'}
                </div>
            </div>

            {/* Shift Info */}
            <div className="bg-slate-100/50 rounded-xl p-3 mb-6">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> กะวันนี้ ({todayStr})</span>
                    {todayShift ? <span className="text-slate-700 font-bold">{todayShift.start} - {todayShift.end}</span> : <span className="text-slate-400">-</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                   <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ล่าสุด</span>
                   {isOnDuty 
                        ? <span className="text-green-600 font-bold">เข้า {user.lastCheckIn ? format(new Date(user.lastCheckIn), 'HH:mm') : '-'}</span>
                        : <span className="text-slate-400">ออก {user.lastCheckOut ? format(new Date(user.lastCheckOut), 'HH:mm') : '-'}</span>
                   }
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => onAttendance(user.id, 'check-in')}
                    disabled={isOnDuty}
                    className={`
                        py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${isOnDuty 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200 hover:-translate-y-0.5'}
                    `}
                >
                    <LogIn className="w-4 h-4" />
                    เข้างาน
                </button>
                <button
                    onClick={() => onAttendance(user.id, 'check-out')}
                    disabled={!isOnDuty}
                    className={`
                        py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${!isOnDuty 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 hover:-translate-y-0.5'}
                    `}
                >
                    <LogOut className="w-4 h-4" />
                    ออกงาน
                </button>
            </div>
        </div>
    );
}

function StaffModal({ user, onClose, onSuccess }: { user: User | null, onClose: () => void, onSuccess: () => void }) {
    const isEditMode = !!user;
    const [formData, setFormData] = useState({
        name: user?.name || '',
        role: user?.role || 'part-time' as UserRole,
        phone: user?.phone || '',
        photoUrl: user?.photoUrl || '',
        username: user?.username || '',
        shiftStart: user?.shifts?.[0]?.start || '08:00',
        shiftEnd: user?.shifts?.[0]?.end || '17:00'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Resize image to avoid storage quota limits
                const resizedImage = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_SIZE = 300; // Limit max dimension to 300px

                            if (width > height) {
                                if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                }
                            } else {
                                if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            // Compress to JPEG with 0.7 quality
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                });

                setFormData(prev => ({ ...prev, photoUrl: resizedImage }));
            } catch (error) {
                console.error("Error processing image:", error);
                alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const defaultShifts: Array<{day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun', start: string, end: string}> = [
            { day: 'Mon', start: formData.shiftStart, end: formData.shiftEnd },
            { day: 'Tue', start: formData.shiftStart, end: formData.shiftEnd },
            { day: 'Wed', start: formData.shiftStart, end: formData.shiftEnd },
            { day: 'Thu', start: formData.shiftStart, end: formData.shiftEnd },
            { day: 'Fri', start: formData.shiftStart, end: formData.shiftEnd },
        ];

        try {
            if (isEditMode && user) {
                await api.updateUser(user.id, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone,
                    photoUrl: formData.photoUrl,
                    shifts: defaultShifts 
                });
            } else {
                const newUser: User = {
                    id: `U-${Date.now()}`,
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone,
                    photoUrl: formData.photoUrl,
                    username: formData.username || formData.name.toLowerCase().replace(/\s/g, ''),
                    status: 'off-duty',
                    shifts: defaultShifts
                };
                await api.addUser(newUser);
            }
            onSuccess();
        } catch (error) {
            console.error("Storage error:", error);
            alert("พื้นที่จัดเก็บข้อมูลเต็ม! กรุณาลบข้อมูลเก่าหรือใช้รูปภาพขนาดเล็กลง");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">
                        {isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50">
                                {formData.photoUrl ? (
                                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ชื่อ-นามสกุล</label>
                        <input 
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="ระบุชื่อพนักงาน"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ตำแหน่ง (Role)</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                            >
                                <option value="part-time">Part-time</option>
                                <option value="housekeeping">แม่บ้าน (Housekeeping)</option>
                                <option value="front-desk">ต้อนรับ (Front Desk)</option>
                                <option value="management">ผู้จัดการ (Management)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">เบอร์โทรศัพท์</label>
                            <input 
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                placeholder="08x-xxx-xxxx"
                            />
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">กะการทำงานปกติ (จันทร์ - ศุกร์)</label>
                         <div className="flex items-center gap-4">
                            <input 
                                type="time"
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.shiftStart}
                                onChange={e => setFormData({...formData, shiftStart: e.target.value})}
                            />
                            <span className="text-slate-400">ถึง</span>
                            <input 
                                type="time"
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.shiftEnd}
                                onChange={e => setFormData({...formData, shiftEnd: e.target.value})}
                            />
                         </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                        <UserPlus className="w-5 h-5" />
                        {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกพนักงานใหม่'}
                    </button>
                </form>
            </div>
        </div>
    );
}