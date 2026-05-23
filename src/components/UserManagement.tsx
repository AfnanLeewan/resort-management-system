import { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import * as api from '../utils/api';
import { Plus, Pencil, Trash2, X, Loader2, ShieldAlert, UserCog } from 'lucide-react';

interface Props {
  currentUser: User;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'management', label: 'ผู้จัดการ (Management)' },
  { value: 'front-desk', label: 'พนักงานต้อนรับ (Front Desk)' },
  { value: 'housekeeping', label: 'แม่บ้าน (Housekeeping)' },
  { value: 'repair', label: 'ช่างซ่อม (Repair)' },
  { value: 'board', label: 'กรรมการ (Board)' },
  { value: 'part-time', label: 'พาร์ทไทม์ (Part-time)' },
];

const roleLabel = (r: string) => ROLE_OPTIONS.find(o => o.value === r)?.label ?? r;

interface FormState {
  username: string;
  name: string;
  role: UserRole;
  phone: string;
  password: string;
}

const emptyForm: FormState = { username: '', name: '', role: 'front-desk', phone: '', password: '' };

export function UserManagement({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (currentUser.role !== 'management') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <ShieldAlert className="w-12 h-12 text-orange-400 mb-3" />
        <p className="font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</p>
        <p className="text-sm">เฉพาะผู้จัดการเท่านั้นที่จัดการผู้ใช้ได้</p>
      </div>
    );
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, name: u.name, role: u.role, phone: u.phone ?? '', password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('กรุณากรอกชื่อ-สกุล'); return; }
    if (!editing) {
      if (!form.username.trim()) { setError('กรุณากรอกชื่อผู้ใช้งาน'); return; }
      if (!form.password.trim()) { setError('กรุณากรอกรหัสผ่าน'); return; }
      if (users.some(u => u.username.toLowerCase() === form.username.toLowerCase().trim())) {
        setError('ชื่อผู้ใช้งานนี้มีอยู่แล้ว'); return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        const updates: Partial<User> = {
          name: form.name.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
        };
        if (form.password.trim()) updates.password = form.password.trim();
        await api.updateUser(editing.id, updates);
      } else {
        await api.addUser({
          id: '',
          username: form.username.toLowerCase().trim(),
          name: form.name.trim(),
          role: form.role,
          password: form.password.trim(),
          phone: form.phone.trim() || undefined,
          status: 'off-duty',
          isOnline: false,
          shifts: [],
        });
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser.id) { alert('ไม่สามารถลบบัญชีของตัวเองได้'); return; }
    if (!confirm(`ลบผู้ใช้ "${u.name}" (${u.username}) ?`)) return;
    try {
      await api.deleteUser(u.id);
      await load();
    } catch (err: any) {
      alert('ลบไม่สำเร็จ: ' + (err?.message || ''));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
            <UserCog className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">จัดการผู้ใช้งาน</h3>
            <p className="text-sm text-slate-500">เพิ่ม แก้ไข ลบ และตั้งรหัสผ่านผู้ใช้งาน</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> เพิ่มผู้ใช้
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 font-bold">ชื่อ-สกุล</th>
                <th className="px-5 py-3 font-bold">ชื่อผู้ใช้งาน</th>
                <th className="px-5 py-3 font-bold">บทบาท</th>
                <th className="px-5 py-3 font-bold">เบอร์โทร</th>
                <th className="px-5 py-3 font-bold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {u.name}
                    {u.id === currentUser.id && <span className="ml-2 text-xs text-orange-500">(คุณ)</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{roleLabel(u.role)}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.phone || '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" title="แก้ไข">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u)} disabled={u.id === currentUser.id} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="ลบ">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">ยังไม่มีผู้ใช้งาน</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">{editing ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h3>
              <button onClick={() => !saving && setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  disabled={!!editing}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="เช่น frontdesk2"
                />
                {editing && <p className="text-xs text-slate-400 mt-1">แก้ไขชื่อผู้ใช้งานไม่ได้</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">ชื่อ-สกุล</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">บทบาท</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">เบอร์โทร (ถ้ามี)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder="08x-xxx-xxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  {editing ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'}
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  placeholder={editing ? '••••••' : 'กรอกรหัสผ่าน'}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : (editing ? 'บันทึก' : 'เพิ่มผู้ใช้')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
