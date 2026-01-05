import { ReactNode, useState } from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, 
  DoorOpen, 
  Bed, 
  Wrench, 
  BarChart3, 
  LogOut,
  Users,
  HelpCircle,
  Search,
  Bell,
  MessageSquare,
  Menu,
  ChevronRight,
  Package
} from 'lucide-react';
import { QuickGuide } from './QuickGuide';
import logo from "figma:asset/d3cf51ff-de67-4353-871d-03d571dccf4f.jfif";

interface LayoutProps {
  children: ReactNode;
  currentUser: User;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export function Layout({ children, currentUser, currentView, onViewChange, onLogout }: LayoutProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard, roles: ['front-desk', 'management', 'board'] },
    { id: 'frontdesk', label: 'เคาน์เตอร์', icon: DoorOpen, roles: ['front-desk', 'management'] },
    { id: 'rooms', label: 'สถานะห้องพัก', icon: Bed, roles: ['front-desk', 'housekeeping', 'management'] },
    { id: 'housekeeping', label: 'แม่บ้าน', icon: Wrench, roles: ['housekeeping', 'management'] },
    { id: 'inventory', label: 'คลังพัสดุ', icon: Package, roles: ['management', 'housekeeping', 'front-desk'] },
    { id: 'reports', label: 'รายงาน', icon: BarChart3, roles: ['management', 'board'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-600">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-xl transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-72' : 'w-20'} 
        flex flex-col
      `}>
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
              <img 
                src={logo}
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {sidebarOpen && (
              <div className="animate-in fade-in duration-200">
                <h1 className="text-xl font-bold text-slate-800 leading-none">Royyan</h1>
                <p className="text-xs text-orange-500 font-medium tracking-wide">RESORT MANAGER</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
                    : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-500'}`} />
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
                {!sidebarOpen && isActive && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              <Users className="w-5 h-5" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{currentUser.role}</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full w-96 focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-300 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="ค้นหาห้องพัก, ผู้เข้าพัก, หรือการจอง..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <button className="p-2 relative text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 relative text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
            
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100 transition-colors text-sm font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              <span>คู่มือการใช้งาน</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          {/* Breadcrumb / Title area could go here */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 capitalize mb-2">{menuItems.find(m => m.id === currentView)?.label || 'หน้าหลัก'}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>หน้าแรก</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-orange-500 font-medium capitalize">{menuItems.find(m => m.id === currentView)?.label || currentView}</span>
            </div>
          </div>
          
          {children}
        </main>
      </div>

      {/* Quick Guide Modal */}
      {showGuide && <QuickGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}