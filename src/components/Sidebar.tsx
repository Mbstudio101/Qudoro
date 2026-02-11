import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Layers, Settings, Brain, LayoutDashboard, User } from 'lucide-react';
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
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/questions', icon: BookOpen, label: 'Questions' },
    { to: '/sets', icon: Layers, label: 'Exams' },
    { to: '/flashcards', icon: Brain, label: 'Flashcards' },
  ];

  return (
    <div className="w-64 bg-card/50 backdrop-blur-xl border-r border-border h-full flex flex-col p-4">
      <div className="mb-8 px-4 pt-4 flex items-center gap-3">
        <Logo className="w-8 h-8" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent tracking-tight">Qudoro</h1>
      </div>
      
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 pt-4 mt-4 border-t border-border/40">
        <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
        >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 overflow-hidden">
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
            <span className="font-medium">Profile</span>
        </NavLink>

        <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:translate-x-1'
              }`
            }
        >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
