import { useState } from 'react';
import { User } from '../types';
import { getUsers, setCurrentUser } from '../utils/storage';
import { seedDemoData, hasDemoData } from '../utils/seedData';
import { LogIn, User as UserIcon, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const users = getUsers();
  const hasDemo = hasDemoData();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username.toLowerCase());
    
    if (user) {
      setCurrentUser(user);
      onLogin(user);
    } else {
      setError('ไม่พบผู้ใช้งาน / User not found');
    }
  };

  const handleLoadDemoData = () => {
    if (confirm('โหลดข้อมูลทดสอบ? (Load demo data for testing?)')) {
      seedDemoData();
      alert('✅ โหลดข้อมูลทดสอบเรียบร้อย!\n\nDemo data loaded:\n- 2 bookings\n- 1 maintenance report');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8 md:p-12 w-full max-w-lg relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600" />
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-orange-200 rotate-3 transition-transform hover:rotate-0">
             <img 
                src="https://cdn.discordapp.com/attachments/906608190219755631/1452947801762955306/303410614_407072674865676_8245980228075636848_n.png?ex=694baa96&is=694a5916&hm=f008c35a0e68c5186426577fe1bcf24b986e3dc54bd74a450f1e4f1f3583905d&" 
                alt="Logo" 
                className="w-14 h-14 object-contain invert mix-blend-multiply opacity-80"
              />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">ยินดีต้อนรับกลับ</h1>
          <p className="text-slate-500">เข้าสู่ระบบเพื่อจัดการ Royyan Resort</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none text-slate-800 placeholder:text-slate-400 bg-slate-50 transition-all"
                placeholder="กรอกชื่อผู้ใช้งาน"
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            เข้าสู่ระบบ
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100">
          <p className="text-slate-400 mb-4 text-center text-xs font-bold uppercase tracking-wider">เข้าสู่ระบบด่วน (ทดสอบ)</p>
          <div className="grid grid-cols-2 gap-3">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setUsername(user.username)}
                className="group bg-slate-50 hover:bg-orange-50 px-4 py-3 rounded-xl text-left border border-slate-200 hover:border-orange-200 transition-all"
              >
                <div className="text-xs text-slate-400 group-hover:text-orange-400 font-medium mb-0.5 capitalize">{user.role}</div>
                <div className="text-slate-700 group-hover:text-orange-700 font-bold">{user.username}</div>
              </button>
            ))}
          </div>
        </div>

        {!hasDemo && (
          <div className="mt-6">
            <button
              onClick={handleLoadDemoData}
              className="w-full bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 py-3 rounded-xl transition-colors text-sm font-bold"
            >
              โหลดข้อมูลตัวอย่าง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}