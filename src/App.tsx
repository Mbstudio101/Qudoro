import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import ExamSets from './pages/ExamSets';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Practice from './pages/Practice';
import Profile from './pages/Profile';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          } />
          <Route path="questions" element={
            <PageTransition>
              <Questions />
            </PageTransition>
          } />
          <Route path="sets" element={
            <PageTransition>
              <ExamSets />
            </PageTransition>
          } />
          <Route path="practice/:setId" element={
            <PageTransition>
              <Practice />
            </PageTransition>
          } />
          <Route path="flashcards" element={
            <PageTransition>
              <Flashcards />
            </PageTransition>
          } />
          <Route path="settings" element={
            <PageTransition>
              <Settings />
            </PageTransition>
          } />
          <Route path="profile" element={
            <PageTransition>
              <Profile />
            </PageTransition>
          } />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
};

const App = () => {
  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default App;
