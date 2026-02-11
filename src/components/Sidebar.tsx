import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Layers, Settings, Brain, LayoutDashboard, User, ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from './ui/Logo';
import { useStore } from '../store/useStore';

const getAvatarUrl = (avatarString?: string) => {
  if (!avatarString) return '';
  
  // Check for new format with options (style:seed|options)
  if (avatarString.includes('|')) {
      const [base, options] = avatarString.split('|');
      if (base.includes(':')) {
          const [style, seed] = base.split(':');
          return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&${options}`;
      }
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(base)}&${options}`;
  }

  if (avatarString.includes(':')) {
    const [style, seed] = avatarString.split(':');
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarString)}`;
};

const Sidebar = () => {
  const { userProfile } = useStore();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/practice') || location.pathname === '/flashcards') {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [location.pathname]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/notes', icon: FileText, label: 'Notes' },
    { to: '/questions', icon: BookOpen, label: 'Questions' },
    { to: '/sets', icon: Layers, label: 'Exams' },
    { to: '/flashcards', icon: Brain, label: 'Flashcards' },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-card/50 backdrop-blur-xl border-r border-border h-full flex flex-col p-4 transition-all duration-300 relative group`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-background border border-border rounded-full p-1.5 shadow-sm hover:bg-accent transition-colors z-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`mb-8 pt-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'}`}>
        <Logo className="w-8 h-8 shrink-0" />
        {!isCollapsed && (
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-2xl font-bold bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap overflow-hidden"
          >
            Qudoro
          </motion.h1>
        )}
      </div>
      
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : ''}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 pt-4 mt-4 border-t border-border/40">
        <NavLink
            to="/profile"
            title={isCollapsed ? 'Profile' : ''}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
        >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 overflow-hidden shrink-0">
                {userProfile.avatar ? (
                    <img 
                        src={getAvatarUrl(userProfile.avatar)} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <User size={14} className="text-primary" />
                )}
            </div>
            {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">Profile</span>}
        </NavLink>

        <NavLink
            to="/settings"
            title={isCollapsed ? 'Settings' : ''}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
        >
            <Settings size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">Settings</span>}
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
