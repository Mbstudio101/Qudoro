import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import ExamSets from './pages/ExamSets';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Practice from './pages/Practice';
import Profile from './pages/Profile';

const AnimatedRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
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
