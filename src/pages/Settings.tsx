import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Check, AlertCircle, Package, User, Save, Upload, Trash2, Database, MessageSquare, BookOpen } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useStore } from '../store/useStore';

const Settings = () => {
  const { userProfile, setUserProfile, questions, sets, importData, resetData } = useStore();
  
  // Update State
  const [status, setStatus] = useState<string>('idle'); 
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Profile State
  const [name, setName] = useState(userProfile.name);
  const [studyField, setStudyField] = useState(userProfile.studyField || '');
  const [isSaved, setIsSaved] = useState(false);

  // Data State
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listeners
    if (window.electron?.updater) {
      window.electron.updater.onUpdateStatus((s) => setStatus(s));
      
      window.electron.updater.onUpdateAvailable((info) => {
        setStatus('available');
        setUpdateInfo(info);
      });

      window.electron.updater.onUpdateNotAvailable((info) => {
        setStatus('not-available');
        setUpdateInfo(null);
      });

      window.electron.updater.onDownloadProgress((p) => {
        setStatus('downloading');
        setProgress(p.percent);
      });

      window.electron.updater.onUpdateDownloaded((info) => {
        setStatus('downloaded');
        setUpdateInfo(info);
      });

      window.electron.updater.onUpdateError((err) => {
        setStatus('error');
        setError(err);
      });
    }

    return () => {
      if (window.electron?.updater) {
        window.electron.updater.removeAllListeners();
      }
    };
  }, []);

  const checkForUpdates = async () => {
    setStatus('checking');
    setError(null);
    try {
      await window.electron.updater.checkForUpdates();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Failed to check for updates');
    }
  };

  const downloadUpdate = async () => {
    await window.electron.updater.downloadUpdate();
  };

  const installUpdate = () => {
    window.electron.updater.quitAndInstall();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name, studyField });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExport = () => {
    const data = JSON.stringify({ questions, sets }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qudoro-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.questions && data.sets) {
            importData(data);
            alert('Data imported successfully!');
        } else {
            alert('Invalid file format');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
        resetData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage application preferences, data, and updates.</p>
      </motion.div>

      {/* User Profile Section */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
                <User className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-xl font-semibold">User Profile</h2>
                <p className="text-sm text-muted-foreground">Customize your personal details and study preferences.</p>
            </div>
        </div>
        
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Field of Study</label>
                <Input 
                    value={studyField} 
                    onChange={(e) => setStudyField(e.target.value)} 
                    placeholder="e.g. Nursing, Law, Computer Science"
                />
                <p className="text-xs text-muted-foreground">This helps us provide more relevant feedback.</p>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
                {isSaved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaved ? 'Saved' : 'Save Changes'}
            </Button>
        </form>
      </div>

      {/* Feedback Section */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
                <MessageSquare className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-xl font-semibold">Feedback & Recommendations</h2>
                <p className="text-sm text-muted-foreground">Help us improve Qudoro.</p>
            </div>
        </div>
        
        <div className="max-w-lg space-y-4">
            <p className="text-sm text-muted-foreground">
                Have a feature request, found a bug, or want to suggest study material? We'd love to hear from you.
            </p>
            
            <Button 
                onClick={() => window.open('mailto:feedback@qudoro.com?subject=Qudoro Feedback')}
                className="w-full sm:w-auto"
                variant="outline"
            >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Feedback
            </Button>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Database className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-xl font-semibold">Data Management</h2>
                <p className="text-sm text-muted-foreground">Import, export, or reset your study data.</p>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" onClick={handleExport} className="h-auto py-4 flex flex-col gap-2 items-center justify-center">
                <Download className="h-6 w-6" />
                <span>Export Data</span>
            </Button>
            
            <Button variant="outline" onClick={handleImportClick} className="h-auto py-4 flex flex-col gap-2 items-center justify-center">
                <Upload className="h-6 w-6" />
                <span>Import Data</span>
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />

            <Button variant="outline" onClick={handleReset} className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                <Trash2 className="h-6 w-6" />
                <span>Reset All Data</span>
            </Button>
        </div>
      </div>

      {/* Update Section */}
      <div className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Package className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Application Updates</h2>
                    <p className="text-sm text-muted-foreground">Current Version: 1.0.0</p>
                </div>
            </div>
            <div>
                {status === 'idle' || status === 'not-available' || status === 'error' ? (
                    <Button onClick={checkForUpdates}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check for Updates
                    </Button>
                ) : null}
            </div>
        </div>

        <div className="border-t pt-6">
            {status === 'checking' && (
                <div className="text-center py-4 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Checking for updates...</p>
                </div>
            )}

            {status === 'not-available' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-4 rounded-lg">
                    <Check className="h-5 w-5" />
                    <p>You are using the latest version.</p>
                </div>
            )}

            {status === 'available' && updateInfo && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <div>
                            <h3 className="font-semibold text-lg">New Update Available: {updateInfo.version}</h3>
                            <p className="text-sm text-muted-foreground">Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}</p>
                        </div>
                        <Button onClick={downloadUpdate}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Update
                        </Button>
                    </div>
                    {updateInfo.releaseNotes && (
                        <div className="bg-secondary/30 p-4 rounded-lg text-sm max-h-60 overflow-y-auto">
                            <h4 className="font-medium mb-2">Release Notes:</h4>
                            <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}></div>
                        </div>
                    )}
                </div>
            )}

            {status === 'downloading' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Downloading update...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {status === 'downloaded' && (
                <div className="flex items-center justify-between bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <div>
                            <h3 className="font-semibold text-green-700 dark:text-green-400">Update Ready to Install</h3>
                            <p className="text-sm text-green-600/80 dark:text-green-400/80">Restart the application to apply changes.</p>
                        </div>
                    </div>
                    <Button onClick={installUpdate} className="bg-green-600 hover:bg-green-700 text-white">
                        Restart & Install
                    </Button>
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <p>Error: {error}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
