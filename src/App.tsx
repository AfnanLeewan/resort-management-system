import { useState, useEffect } from 'react';
import * as api from './utils/api';
import { User } from './types';
import { getCurrentUser, setCurrentUser as saveCurrentUser } from './utils/storage';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FrontDesk } from './components/FrontDesk';
import { RoomGrid } from './components/RoomGrid';
import { Housekeeping } from './components/Housekeeping';
import { MaintenanceList } from './components/MaintenanceList';
import { LineSettings } from './components/LineSettings';
import { Reports } from './components/Reports';
import { Inventory } from './components/Inventory';
import { StaffDashboard } from './components/StaffDashboard';
import { RoomManagement } from './components/RoomManagement';
import { UserManagement } from './components/UserManagement';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    // Load current user from storage; revalidate against DB so a stale id
    // from a previous Supabase project doesn't poison FK columns on insert.
    const cached = getCurrentUser();
    if (!cached) return;

    let cancelled = false;
    (async () => {
      try {
        const fresh = await api.getUserByUsername(cached.username.toLowerCase());
        if (cancelled) return;
        if (!fresh) {
          // Username no longer exists in this DB — clear and force re-login
          saveCurrentUser(null);
          setCurrentUser(null);
          return;
        }
        if (fresh.id !== cached.id) {
          // Stale id from a previous backend — persist the fresh one
          saveCurrentUser(fresh);
        }
        setCurrentUser(fresh);
        if (fresh.role === 'housekeeping') setCurrentView('housekeeping');
        else if (fresh.role === 'board') setCurrentView('reports');
        else if (fresh.role === 'repair') setCurrentView('maintenance');
        else setCurrentView('dashboard');
      } catch {
        // Network/DB hiccup — fall back to cached so app remains usable
        setCurrentUser(cached);
        if (cached.role === 'housekeeping') setCurrentView('housekeeping');
        else if (cached.role === 'board') setCurrentView('reports');
        else if (cached.role === 'repair') setCurrentView('maintenance');
        else setCurrentView('dashboard');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Set default view based on role
    if (user.role === 'housekeeping') {
      setCurrentView('housekeeping');
    } else if (user.role === 'board') {
      setCurrentView('reports');
    } else if (user.role === 'repair') {
      setCurrentView('maintenance');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentView('dashboard'); // Reset view first
    saveCurrentUser(null);
    setCurrentUser(null); // This triggers re-render to Login
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  // Show login screen if no user
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout
      currentUser={currentUser}
      currentView={currentView}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'frontdesk' && <FrontDesk currentUser={currentUser} />}
      {currentView === 'rooms' && <RoomGrid currentUser={currentUser} />}
      {currentView === 'housekeeping' && <Housekeeping currentUser={currentUser} />}
      {currentView === 'maintenance' && <MaintenanceList currentUser={currentUser} />}
      {currentView === 'line-settings' && <LineSettings currentUser={currentUser} />}
      {currentView === 'staff' && <StaffDashboard />}
      {currentView === 'inventory' && <Inventory currentUser={currentUser} />}
      {currentView === 'reports' && <Reports currentUser={currentUser} />}
      {currentView === 'room-management' && <RoomManagement currentUser={currentUser} />}
      {currentView === 'user-management' && <UserManagement currentUser={currentUser} />}
    </Layout>
  );
}
