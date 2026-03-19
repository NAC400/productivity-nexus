import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import ProjectSetup from './components/ProjectSetup';
import TaskView from './components/TaskView';
import Results from './components/Results';
import Leaderboard from './components/Leaderboard';
import Social from './components/Social';
import Settings from './components/Settings';
import Profile from './components/Profile';
import AIChat from './components/AIChat';

export const API_BASE = 'http://localhost:3001/api';

export const UserContext = createContext(null);

export function useUser() {
  return useContext(UserContext);
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first (remember me), then sessionStorage (session only)
    const storedUserId =
      localStorage.getItem('nexus_user_id') ||
      sessionStorage.getItem('nexus_session_user_id');

    if (storedUserId) {
      fetch(`${API_BASE}/users/${storedUserId}`)
        .then((r) => {
          if (!r.ok) throw new Error('User not found');
          return r.json();
        })
        .then((data) => {
          setUser(data);
        })
        .catch(() => {
          localStorage.removeItem('nexus_user_id');
          sessionStorage.removeItem('nexus_session_user_id');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function loginUser(userData, rememberMe = true) {
    if (rememberMe) {
      localStorage.setItem('nexus_user_id', userData.id);
      sessionStorage.removeItem('nexus_session_user_id');
    } else {
      sessionStorage.setItem('nexus_session_user_id', userData.id);
      localStorage.removeItem('nexus_user_id');
    }
    setUser(userData);
  }

  function updateUser(updates) {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  function logoutUser() {
    localStorage.removeItem('nexus_user_id');
    sessionStorage.removeItem('nexus_session_user_id');
    setUser(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-nexus-bg">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-nexus-accent font-game tracking-widest mb-4">
              PRODUCTIVITY NEXUS
            </div>
            <div className="text-nexus-muted font-game tracking-widest text-sm">
              INITIALIZING SYSTEMS...
            </div>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-nexus-accent rounded-full pulse-glow"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, loginUser, updateUser, logoutUser }}>
      <div className="flex flex-col h-screen bg-nexus-bg overflow-hidden">
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route
              path="/"
              element={user ? <Dashboard /> : <Onboarding />}
            />
            <Route
              path="/project/new"
              element={user ? <ProjectSetup /> : <Navigate to="/" replace />}
            />
            <Route
              path="/task/:taskId"
              element={user ? <TaskView /> : <Navigate to="/" replace />}
            />
            <Route
              path="/results/:taskId"
              element={user ? <Results /> : <Navigate to="/" replace />}
            />
            <Route
              path="/leaderboard"
              element={user ? <Leaderboard /> : <Navigate to="/" replace />}
            />
            <Route
              path="/social"
              element={user ? <Social /> : <Navigate to="/" replace />}
            />
            <Route
              path="/settings"
              element={user ? <Settings /> : <Navigate to="/" replace />}
            />
            <Route
              path="/profile"
              element={user ? <Profile /> : <Navigate to="/" replace />}
            />
            <Route
              path="/profile/:userId"
              element={user ? <Profile /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        {/* AIChat floats on all pages when logged in */}
        {user && <AIChat />}
      </div>
    </UserContext.Provider>
  );
}

export default App;
