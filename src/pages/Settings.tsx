import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Check, AlertCircle, Package, User, Save, Upload, Trash2, Database, MessageSquare, Moon, Sun, Laptop, Shield, FileText, Lock, Users, ExternalLink, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
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
  const [activeTab, setActiveTab] = useState('general');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const currentTheme = userProfile.theme || 'system';

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
        className="space-y-6"
      >
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage application preferences, data, and updates.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-secondary/20 p-1 rounded-lg w-full max-w-md">
            {['general', 'data', 'about'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        activeTab === tab 
                        ? 'bg-background shadow text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
      </motion.div>

      <div className="grid gap-6">
      {/* General Tab */}
      {activeTab === 'general' && (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
            {/* Appearance Section */}
            <div className="bg-card border rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Sun className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Appearance</h2>
                        <p className="text-sm text-muted-foreground">Customize how Qudoro looks on your device.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 max-w-lg">
                    <button
                        onClick={() => setUserProfile({ theme: 'light' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                            currentTheme === 'light' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground'
                        }`}
                    >
                        <Sun className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                        onClick={() => setUserProfile({ theme: 'dark' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                            currentTheme === 'dark' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground'
                        }`}
                    >
                        <Moon className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                        onClick={() => setUserProfile({ theme: 'system' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                            currentTheme === 'system' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-transparent bg-secondary/50 hover:bg-secondary text-muted-foreground'
                        }`}
                    >
                        <Laptop className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">System</span>
                    </button>
                </div>
            </div>

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
        </motion.div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
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
        </motion.div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
            {/* Community & Feedback Section */}
            <div className="bg-card border rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Community & Feedback</h2>
                        <p className="text-sm text-muted-foreground">Join the conversation and help shape Qudoro.</p>
                    </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 p-4 rounded-lg bg-secondary/20 border border-secondary">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Feature Requests & Voting
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Have an idea? Post it on our community board. Other users can vote on features they want to see next.
                        </p>
                        <Button 
                            onClick={() => window.open('https://github.com/Mbstudio101/Qudoro/discussions', '_blank')}
                            className="w-full"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Join the Discussion
                        </Button>
                    </div>

                    <div className="space-y-4 p-4 rounded-lg bg-secondary/20 border border-secondary">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Private Feedback
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Found a critical bug or have a private concern? Email our support team directly.
                        </p>
                        <Button 
                            onClick={() => window.open('mailto:feedback@qudoro.com?subject=Qudoro Feedback')}
                            className="w-full"
                            variant="outline"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send Email
                        </Button>
                    </div>
                </div>
            </div>

            {/* Legal Section */}
            <div className="bg-card border rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Shield className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Legal & Compliance</h2>
                        <p className="text-sm text-muted-foreground">Review our terms of service and privacy policies.</p>
                    </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 max-w-lg">
                    <Button variant="outline" onClick={() => setShowTerms(true)} className="justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        Terms of Service
                    </Button>
                    <Button variant="outline" onClick={() => setShowPrivacy(true)} className="justify-start">
                        <Lock className="mr-2 h-4 w-4" />
                        Privacy Policy
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
        </motion.div>
      )}
      </div>

      <Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Service" className="max-w-2xl">
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Acceptance of Terms</h3>
                <p>By accessing or using Qudoro ("the Application"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Application.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. Educational Purposes Only</h3>
                <p>Qudoro is a study aid intended solely for educational and informational purposes. It is not a substitute for professional training, official certification exams, or accredited educational programs. We do not guarantee that using this Application will result in passing any specific examination or obtaining any certification.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Medical Disclaimer</h3>
                <p>Content related to nursing, medicine, or health is for practice purposes only and does not constitute medical advice, diagnosis, or treatment. Always follow official protocols and consult qualified healthcare professionals for medical decisions.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. "As Is" Disclaimer</h3>
                <p className="uppercase">THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Limitation of Liability</h3>
                <p className="uppercase">TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUDORO AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE APPLICATION.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">6. Intellectual Property</h3>
                <p>All content, features, and functionality of the Application (excluding user-generated content) are owned by the developers of Qudoro and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            </section>
        </div>
      </Modal>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy" className="max-w-2xl">
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Data Collection & Storage</h3>
                <p>Qudoro operates on a "local-first" basis. We do not collect, transmit, or store your personal study data, flashcards, or exam results on our servers. All such data is stored locally on your device.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">2. User Profile Information</h3>
                <p>Information you enter into your profile (such as your name, field of study, and avatar preferences) remains on your local device. We do not have access to this information.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Third-Party Services</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>DiceBear:</strong> We use the DiceBear API to generate avatar images. When you create an avatar, your configuration choices are sent to DiceBear's servers to generate the image. Please review <a href="https://dicebear.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DiceBear's Privacy Policy</a>.</li>
                    <li><strong>Cash App:</strong> If you choose to donate, you will be directed to Cash App. We do not process payments directly and do not have access to your financial information.</li>
                </ul>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">4. Data Security</h3>
                <p>Since your data is stored locally, you are responsible for securing your device. We recommend using device-level security features (passwords, encryption) to protect your study data.</p>
            </section>

            <section className="space-y-2">
                <h3 className="font-semibold text-foreground">5. Changes to This Policy</h3>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
            </section>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
