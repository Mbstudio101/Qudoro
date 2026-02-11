import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import ExamSets from './pages/ExamSets';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ProfileSelect from './pages/Auth/ProfileSelect';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, activeProfileId } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!activeProfileId) return <Navigate to="/profiles" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const { isAuthenticated } = useStore();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profiles" element={isAuthenticated ? <ProfileSelect /> : <Navigate to="/login" />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="notes" element={<Notes />} />
        <Route path="questions" element={<Questions />} />
        <Route path="sets" element={<ExamSets />} />
        <Route path="practice/:setId" element={<Practice />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  const { userProfile } = useStore();
  
  // Initialize notification scheduler
  useNotificationScheduler();

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const theme = userProfile.theme || 'system';

      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (userProfile.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [userProfile.theme]);

  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default App;
