import { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser as saveCurrentUser } from './utils/storage';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FrontDesk } from './components/FrontDesk';
import { RoomGrid } from './components/RoomGrid';
import { Housekeeping } from './components/Housekeeping';
import { Reports } from './components/Reports';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    // Load current user from storage
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      // Set default view based on role
      if (user.role === 'housekeeping') {
        setCurrentView('housekeeping');
      } else if (user.role === 'board') {
        setCurrentView('reports');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Set default view based on role
    if (user.role === 'housekeeping') {
      setCurrentView('housekeeping');
    } else if (user.role === 'board') {
      setCurrentView('reports');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    saveCurrentUser(null);
    setCurrentUser(null);
    setCurrentView('dashboard');
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
      {currentView === 'reports' && <Reports currentUser={currentUser} />}
    </Layout>
  );
}
