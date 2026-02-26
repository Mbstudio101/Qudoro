import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AuthTitleBar from '../../components/AuthTitleBar';
import { motion } from 'framer-motion';
import { User, Plus, GraduationCap } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatar';
import { signOutSupabase } from '../../services/auth/supabaseAuth';

const ProfileSelect = () => {
  const navigate = useNavigate();
  const { accounts, currentAccountId, selectProfile, createProfile } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileData, setNewProfileData] = useState({ name: '', field: '' });

  const currentAccount = accounts.find(a => a.id === currentAccountId);
  const profiles = currentAccount?.profiles || [];

  const handleSelect = (profileId: string) => {
    selectProfile(profileId);
    navigate('/');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileData.name && newProfileData.field) {
      createProfile(newProfileData.name, newProfileData.field);
      setIsCreating(false);
      setNewProfileData({ name: '', field: '' });
    }
  };

  const handleLogout = async () => {
    await signOutSupabase();
    const { logout } = useStore.getState();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <AuthTitleBar />
      <div className="absolute top-4 right-4 z-50 mt-10 mr-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          Sign Out
        </Button>
      </div>
      <div className="w-full max-w-4xl space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Who's Studying?</h1>
        </div>

        {profiles.length === 0 && !isCreating && (
          <p className="text-center text-muted-foreground text-sm">
            No profiles yet. Create your first one to get started.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-8">
          {profiles.map((profile) => (
            <motion.div
              key={profile.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(profile.id)}
              className="group flex flex-col items-center gap-4 cursor-pointer"
            >
              <div className="w-32 h-32 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border-2 border-transparent group-hover:border-primary flex items-center justify-center transition-all shadow-sm group-hover:shadow-xl overflow-hidden">
                {profile.avatar ? (
                  <img src={getAvatarUrl(profile.avatar)} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary/50 group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">{profile.name}</h3>
                <p className="text-sm text-muted-foreground">{profile.studyField}</p>
              </div>
            </motion.div>
          ))}

          {/* Add Profile Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(true)}
            className="group flex flex-col items-center gap-4 cursor-pointer"
          >
            <div className="w-32 h-32 rounded-xl bg-secondary/30 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 flex items-center justify-center transition-all">
              <Plus className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Profile</h3>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create Profile Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-6 rounded-xl shadow-xl w-full max-w-md"
          >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">New Profile</h2>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  autoFocus
                  placeholder="Profile Name"
                  value={newProfileData.name}
                  onChange={(e) => setNewProfileData({ ...newProfileData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Field of Study</label>
                <Input
                  placeholder="e.g. Law, Medicine"
                  value={newProfileData.field}
                  onChange={(e) => setNewProfileData({ ...newProfileData, field: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Profile
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelect;
