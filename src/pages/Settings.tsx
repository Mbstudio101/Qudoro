import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Check, AlertCircle, Package, User, Save, Upload, Trash2, Database, MessageSquare, Moon, Sun, Laptop, Shield, FileText, Lock, Users, ExternalLink, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';

const Settings = () => {
  const { userProfile, setUserProfile, questions, sets, importData, resetData, addQuestion, addSet, addQuestionToSet } = useStore();
  
  // Update State
  const [status, setStatus] = useState<string>('idle'); 
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
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
  
  // Quizlet Import State
  const [quizletUrl, setQuizletUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');

  type LooseRecord = Record<string, unknown>;
  type QuizletTermLike = LooseRecord & {
    word?: string;
    term?: string;
    definition?: string;
    def?: string;
    cardSides?: Array<LooseRecord>;
  };

  const asRecord = (value: unknown): LooseRecord | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as LooseRecord;
  };

  const asRecordArray = (value: unknown): LooseRecord[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => asRecord(item))
      .filter((item): item is LooseRecord => item !== null);
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    return 'Failed to import. Please check the URL.';
  };

  const normalizeText = (value: string): string =>
    value.toLowerCase().replace(/[\s\W_]+/g, '');

  const parseFrontAsMcq = (frontText: string): { stem: string; options: string[]; labels: string[] } | null => {
    const text = frontText.replace(/\r\n/g, '\n').trim();
    if (!text) return null;

    const optionLineRegex = /^\s*(?:[-*•]\s*)?(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-])\s*(.+)\s*$/;
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const lineMatches = lines
      .map((line, index) => ({ line, index, match: line.match(optionLineRegex) }))
      .filter((entry): entry is { line: string; index: number; match: RegExpMatchArray } => Boolean(entry.match));

    if (lineMatches.length >= 2) {
      const firstOptionLine = lineMatches[0].index;
      const stem = lines.slice(0, firstOptionLine).join(' ').trim();
      const options = lineMatches.map((entry) => entry.match[4].trim()).filter(Boolean);
      const labels = lineMatches.map((entry) =>
        String(entry.match[1] || entry.match[2] || entry.match[3] || '').toLowerCase()
      );
      if (options.length >= 2) {
        return { stem: stem || 'Question', options, labels };
      }
    }

    const inlineRegex = /(?:^|\s)(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-])\s+/g;
    const matches = [...text.matchAll(inlineRegex)];
    if (matches.length < 2) return null;

    const firstIndex = matches[0].index;
    if (firstIndex === undefined) return null;

    const stem = text.slice(0, firstIndex).trim() || 'Question';
    const labels = matches.map((m) => String(m[1] || m[2] || m[3] || '').toLowerCase());
    const options: string[] = [];

    matches.forEach((match, index) => {
      const currentIndex = match.index;
      if (currentIndex === undefined) return;
      const start = currentIndex + match[0].length;
      const nextIndex = matches[index + 1]?.index;
      const end = nextIndex === undefined ? text.length : nextIndex;
      const option = text.slice(start, end).trim();
      if (option) options.push(option);
    });

    if (options.length >= 2) {
      return { stem, options, labels };
    }

    return null;
  };

  const resolveMcqAnswer = (backText: string, options: string[], labels: string[]): string => {
    const trimmed = backText.trim();
    const labelByPrefix = trimmed.match(/^(?:answer|ans|correct answer|correct)\s*[:-]?\s*\(?([A-Za-z0-9]{1,2})\)?/i);
    const standaloneLabel = trimmed.match(/^\(?([A-Za-z])\)?[).:-]?\s*$/);
    const standaloneNumber = trimmed.match(/^([0-9]{1,2})$/);
    const labelToken = labelByPrefix?.[1] || standaloneLabel?.[1] || standaloneNumber?.[1] || '';

    if (labelToken) {
      const normalized = labelToken.toLowerCase();
      const labelIndex = labels.findIndex((label) => label === normalized);
      if (labelIndex >= 0 && options[labelIndex]) return options[labelIndex];

      if (/^\d+$/.test(normalized)) {
        const numericIndex = Number.parseInt(normalized, 10) - 1;
        if (numericIndex >= 0 && numericIndex < options.length) return options[numericIndex];
      }
    }

    const cleaned = trimmed
      .replace(/^(?:answer|ans|correct answer|correct)\s*[:-]?\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    const exactMatch = options.find((option) => normalizeText(option) === normalizeText(cleaned));
    if (exactMatch) return exactMatch;

    const partialMatch = options.find((option) =>
      normalizeText(option).includes(normalizeText(cleaned)) ||
      normalizeText(cleaned).includes(normalizeText(option))
    );
    if (partialMatch) return partialMatch;

    return cleaned || trimmed;
  };

  const handleQuizletImport = async () => {
    if (!quizletUrl) return;
    
    setIsImporting(true);
    setImportStatus('loading');
    setImportMsg('Fetching Quizlet data...');

    try {
        let htmlContent = '';
        
        // Strategy 0: Electron Native Fetch (Best for bypassing CORS/Bot checks)
        if (window.electron && window.electron.fetchUrl) {
             setImportMsg('Launching browser fetch...');
             try {
                 const result = await window.electron.fetchUrl(quizletUrl);
                 if (result.success && result.data) {
                     htmlContent = result.data;
                 } else {
                     console.warn('Electron fetch failed:', result.error);
                 }
             } catch (e) {
                 console.warn('Electron fetch threw error:', e);
             }
        }

        // Fallback Strategy 1: AllOrigins Proxy
        if (!htmlContent) {
            setImportMsg('Trying proxy server 1...');
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(quizletUrl)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();
                if (data.contents) htmlContent = data.contents;
            } catch (e) {
                console.warn('AllOrigins proxy failed, attempting fallback...', e);
            }
        }

        // Fallback Strategy 2: CorsProxy.io
        if (!htmlContent) {
             setImportMsg('Trying proxy server 2...');
             try {
                 const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(quizletUrl)}`;
                 const response = await fetch(proxyUrl);
                 if (response.ok) htmlContent = await response.text();
             } catch (e) {
                 console.warn('CorsProxy failed:', e);
             }
        }

        if (!htmlContent) throw new Error('Failed to fetch content. Please ensure the set is Public.');
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Extract Title
        const title = doc.querySelector('title')?.textContent?.split(' | ')[0] || 'Imported Quizlet Set';

        // Extract Terms
        const terms: { term: string, def: string }[] = [];
        
        // Strategy 0: JSON Extraction (Most Reliable)
        const nextDataScript = doc.getElementById('__NEXT_DATA__');
        if (nextDataScript && nextDataScript.textContent) {
            try {
                const json: unknown = JSON.parse(nextDataScript.textContent);
                
                // Recursive search for terms array
                const findTerms = (obj: unknown): LooseRecord[] => {
                    const rec = asRecord(obj);
                    if (!rec) return [];
                    
                    // Check direct match for standard "terms"
                    const directTerms = asRecordArray(rec.terms);
                    if (directTerms.length > 0) {
                         const item = directTerms[0] as QuizletTermLike;
                         if (item.word !== undefined || item.term !== undefined || item.definition !== undefined) {
                             return directTerms;
                         }
                    }

                    // Check for "studiableItems" (New Quizlet structure)
                    const studiableItems = asRecordArray(rec.studiableItems);
                    if (studiableItems.length > 0) {
                        return studiableItems;
                    }
                    const studiableItemsAlt = asRecordArray(rec.studiable_items);
                    if (studiableItemsAlt.length > 0) {
                        return studiableItemsAlt;
                    }
                    
                    // Check children
                    for (const key in rec) {
                        if (typeof rec[key] === 'object' && rec[key] !== null) {
                            const result = findTerms(rec[key]);
                            if (result.length > 0) return result;
                        }
                    }
                    return [];
                };
                
                const jsonTerms = findTerms(json);
                jsonTerms.forEach((rawTerm) => {
                    const t = rawTerm as QuizletTermLike;
                    let term = '';
                    let def = '';

                    // Handle standard structure
                    if (t.word || t.term) {
                        term = String(t.word || t.term || '');
                        def = String(t.definition || t.def || '');
                    } 
                    // Handle "studiableItems" structure (cardSides)
                    else if (Array.isArray(t.cardSides)) {
                        t.cardSides.forEach((sideRaw) => {
                            const side = asRecord(sideRaw);
                            if (!side) return;
                            const label = String(side.label || '');
                            const media = asRecordArray(side.media);
                            const firstMedia = media[0];
                            const plainText = firstMedia && typeof firstMedia.plainText === 'string' ? firstMedia.plainText : '';

                            if (label === 'word') {
                                term = plainText;
                            } else if (label === 'definition') {
                                def = plainText;
                            }
                        });
                    }

                    if (term || def) {
                        terms.push({ term, def });
                    }
                });
                
                if (terms.length > 0) console.log('Extracted terms via JSON');
            } catch (e) {
                console.warn('JSON parsing failed:', e);
            }
        }

        // Strategy 1: CSS Selectors (Modern Layout)
        if (terms.length === 0) {
            const termRows = doc.querySelectorAll('.SetPageTerms-term');
            termRows.forEach(row => {
                const term = row.querySelector('.SetPageTerm-wordText .TermText')?.textContent || '';
                const def = row.querySelector('.SetPageTerm-definitionText .TermText')?.textContent || '';
                if (term || def) terms.push({ term, def });
            });
        }

        // Strategy 2: Fallback to old structure or mobile view
        if (terms.length === 0) {
             const rows = doc.querySelectorAll('.TermText');
             for(let i=0; i<rows.length; i+=2) {
                 if(rows[i] && rows[i+1]) {
                     terms.push({ 
                         term: rows[i].textContent || '', 
                         def: rows[i+1].textContent || '' 
                     });
                 }
             }
        }

        if (terms.length === 0) throw new Error('No flashcards found. The set might be private or the structure has changed.');

        // Create Set first (empty) to ensure we have a container
        const newSetId = addSet({
            profileId: userProfile.id,
            title: title,
            description: `Imported from Quizlet (${terms.length} terms)`,
            questionIds: []
        });

        const questionIds: string[] = [];
        
        // Add Questions to Store
        terms.forEach(t => {
            let content = t.term;
            let options: string[] = [];
            let questionStyle = 'Flashcard';
            let answer = [t.def];

            const parsedMcq = parseFrontAsMcq(t.term);
            if (parsedMcq) {
                content = parsedMcq.stem;
                options = parsedMcq.options;
                questionStyle = 'Multiple Choice';
                answer = [resolveMcqAnswer(t.def, parsedMcq.options, parsedMcq.labels)];
            }

            const newQ = {
                profileId: userProfile.id,
                content: content,
                rationale: t.def, // Keep original definition as rationale
                answer: answer, // Store definition as the "answer" for flashcard mode
                options: options, 
                tags: ['quizlet-import'],
                domain: 'General',
                questionStyle: questionStyle,
                createdAt: Date.now(),
                box: 1,
                nextReviewDate: Date.now(),
                easeFactor: 2.5,
                repetitions: 0,
                interval: 0
            };
            // The store generates the ID and returns it
            const realId = addQuestion(newQ);
            questionIds.push(realId);
            addQuestionToSet(newSetId, realId);
        });
        
        console.log(`Imported Set ${newSetId} with questions:`, questionIds);

        setImportStatus('success');
        setImportMsg(`Successfully imported "${title}" with ${terms.length} cards!`);
        setQuizletUrl(''); // Reset input

    } catch (error: unknown) {
        console.error(error);
        setImportStatus('error');
        setImportMsg(getErrorMessage(error));
    } finally {
        setIsImporting(false);
    }
  };

  useEffect(() => {
    // Listeners
    if (window.electron?.updater) {
      window.electron.updater.onUpdateStatus((s) => setStatus(s));
      
      window.electron.updater.onUpdateAvailable((info) => {
        setStatus('available');
        setUpdateInfo(info);
      });

      window.electron.updater.onUpdateNotAvailable(() => {
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

  const handleOpenExternal = async (url: string) => {
    try {
      await window.electron.openExternal(url);
    } catch (err) {
      console.error(err);
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

                {/* Quizlet Import Section */}
                <div className="border-t pt-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                            <ExternalLink className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Import from Quizlet</h2>
                            <p className="text-sm text-muted-foreground">Reverse-Engineer Quizlet's API to fetch flashcards from a public URL.</p>
                        </div>
                    </div>
                    
                    <div className="bg-secondary/20 p-6 rounded-xl border border-border/50 space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Paste Quizlet URL (e.g., https://quizlet.com/123456/set-name)"
                                value={quizletUrl}
                                onChange={(e) => setQuizletUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button 
                                onClick={handleQuizletImport} 
                                disabled={isImporting || !quizletUrl}
                                className="min-w-[120px]"
                            >
                                {isImporting ? (
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {isImporting ? 'Fetching...' : 'Import'}
                            </Button>
                        </div>
                        
                        {importStatus === 'success' && (
                            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg text-sm">
                                <Check className="h-4 w-4" />
                                {importMsg}
                            </div>
                        )}
                        
                        {importStatus === 'error' && (
                            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {importMsg}
                            </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                            Note: This uses a public proxy to access Quizlet. It only works for <strong>public</strong> sets. Private or password-protected sets cannot be imported.
                        </p>
                    </div>
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
                            onClick={() => void handleOpenExternal('https://github.com/Mbstudio101/Qudoro/discussions')}
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
                            onClick={() => void handleOpenExternal('mailto:feedback@qudoro.com?subject=Qudoro Feedback')}
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
