
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { BlackboardClient } from '../services/blackboard';
import { BlackboardToken } from '../types/blackboard';
import { Book, GraduationCap, FileText, Link as LinkIcon, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { BlackboardContent } from '../types/blackboard';
import { BLACKBOARD_CONFIG } from '../config/blackboard';

const School = () => {
  const { userProfile, connectBlackboard, updateBlackboardData, disconnectBlackboard, setBlackboardConfig } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Connection Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [schoolUrl, setSchoolUrl] = useState(userProfile.blackboard?.schoolUrl || '');
  const [accessToken, setAccessToken] = useState(''); 
  const [useManualToken, setUseManualToken] = useState(false);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
  
  // Developer Settings
  const [clientId, setClientId] = useState(userProfile.blackboard?.clientId || BLACKBOARD_CONFIG.CLIENT_ID);
  const [clientSecret, setClientSecret] = useState(userProfile.blackboard?.clientSecret || BLACKBOARD_CONFIG.CLIENT_SECRET);
  const [showDevSettings, setShowDevSettings] = useState(false);

  // View State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'grades' | 'syllabus'>('overview');

  // Derived Data
  const courses = userProfile.blackboard?.courses || [];
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  
  const grades = userProfile.blackboard?.grades.filter(g => g.courseId === selectedCourseId) || [];
  // We'll store contents in a flat list for now, ideally filtered by course
  // Since the store structure I defined has a flat list of assignments, I might need to fetch content on demand or store it better.
  // For this demo, let's fetch content on demand when a course is selected if not present.
  const [courseContents, setCourseContents] = useState<BlackboardContent[]>([]);

  const handleBrowserLogin = async () => {
    let cleanUrl = schoolUrl.trim();
    
    // Remove query parameters if present (e.g. ?new_loc=...)
    if (cleanUrl.includes('?')) {
        cleanUrl = cleanUrl.split('?')[0];
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');

    if (!cleanUrl) {
        setError('Please enter your school URL');
        return;
    }
    
    // Update state with clean URL if it changed
    if (cleanUrl !== schoolUrl) {
        setSchoolUrl(cleanUrl);
    }
    
    setIsWaitingForAuth(true);
    setError(null);
    
    try {
        // Use the new "Browser Login" method (Session Interception)
        // This bypasses the need for the school admin to register our app ID
        const result = await window.electron.auth.startBrowserLogin(cleanUrl);
        
        if (!result.success || !result.token) {
            throw new Error(result.error || 'Login failed or window closed');
        }
        
        // We have a token! (It's a Bearer token from the web session)
        // This token is valid for the API
        const tokenData: BlackboardToken = {
            access_token: result.token,
            token_type: result.authType || 'Bearer',
            expires_in: 3600, // Approximate
            scope: 'read',
            user_id: 'me'
        };

        // Connect
        connectBlackboard(tokenData, cleanUrl);
        
        // Fetch initial data
        const client = new BlackboardClient(cleanUrl, result.token, result.authType || 'Bearer');
        const fetchedCourses = await client.getCourses();
        updateBlackboardData({
            courses: fetchedCourses,
            assignments: [],
            grades: []
        });
        
        setShowConnectModal(false);

    } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
    } finally {
        setIsWaitingForAuth(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const client = new BlackboardClient(schoolUrl, accessToken);
        const fetchedCourses = await client.getCourses();
        
        connectBlackboard({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'read',
            user_id: 'me'
        }, schoolUrl);
        
        updateBlackboardData({
            courses: fetchedCourses,
            assignments: [],
            grades: []
        });
        
        setShowConnectModal(false);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRefreshCourse = async (courseId: string) => {
      const activeUrl = schoolUrl || userProfile.blackboard?.schoolUrl;
      if (!userProfile.blackboard?.token || !activeUrl) return; 
      
      setIsLoading(true);
      try {
          const client = new BlackboardClient(
              activeUrl, 
              userProfile.blackboard.token.access_token,
              (userProfile.blackboard.token.token_type as 'Bearer' | 'Cookie') || 'Bearer'
          );
          
          const [contents, courseGrades] = await Promise.all([
              client.getCourseContents(courseId),
              client.getCourseGrades(courseId)
          ]);

          setCourseContents(contents);
          
          updateBlackboardData({
              courses,
              assignments: [],
              grades: courseGrades
          });

      } catch (err) {
          console.error(err);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      if (selectedCourseId) {
          handleRefreshCourse(selectedCourseId);
      }
  }, [selectedCourseId]);

  if (!userProfile.blackboard?.isConnected) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="p-6 bg-primary/10 rounded-full">
                <GraduationCap size={64} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Connect Your School</h1>
            <p className="text-muted-foreground max-w-md">
                Integrate with Blackboard to see your courses, assignments, and grades directly in Qudoro.
            </p>
            <Button onClick={() => setShowConnectModal(true)} size="lg">
                Connect Blackboard
            </Button>

            <Modal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                title="Connect to Blackboard"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Enter your school's Blackboard URL to connect your account.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Blackboard URL</label>
                        <Input 
                            placeholder="https://blackboard.myschool.edu"
                            value={schoolUrl}
                            onChange={(e) => setSchoolUrl(e.target.value)}
                        />
                    </div>
                    
                    {!useManualToken ? (
                        <div className="pt-2">
                             <Button 
                                onClick={handleBrowserLogin} 
                                disabled={isWaitingForAuth || !schoolUrl}
                                className="w-full"
                            >
                                {isWaitingForAuth ? 'Check your browser...' : 'Login with Blackboard'}
                            </Button>
                            <div className="text-center mt-4">
                                <button 
                                    className="text-xs text-muted-foreground hover:text-primary underline"
                                    onClick={() => setUseManualToken(true)}
                                >
                                    I have a manual access token
                                </button>
                            </div>

                            <div className="mt-6 border-t pt-4">
                                <button 
                                    className="flex items-center text-xs text-muted-foreground hover:text-primary mb-2 w-full justify-center"
                                    onClick={() => setShowDevSettings(!showDevSettings)}
                                >
                                    {showDevSettings ? 'Hide' : 'Show'} Developer Settings
                                </button>
                                
                                {showDevSettings && (
                                    <div className="space-y-3 bg-secondary/10 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Application Key (Client ID)</label>
                                            <Input 
                                                value={clientId}
                                                onChange={(e) => setClientId(e.target.value)}
                                                placeholder="Enter Client ID"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Secret</label>
                                            <Input 
                                                value={clientSecret}
                                                onChange={(e) => setClientSecret(e.target.value)}
                                                type="password"
                                                placeholder="Enter Client Secret"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Register your app at <a href="https://developer.blackboard.com" target="_blank" rel="noreferrer" className="underline">developer.blackboard.com</a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Access Token</label>
                                <Input 
                                    placeholder="Paste your access token here"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    type="password"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <button 
                                    className="text-xs text-muted-foreground hover:text-primary underline"
                                    onClick={() => setUseManualToken(false)}
                                >
                                    Back to Browser Login
                                </button>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => setShowConnectModal(false)}>Cancel</Button>
                                    <Button onClick={handleConnect} disabled={isLoading}>
                                        {isLoading ? 'Connecting...' : 'Connect'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            </Modal>
        </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col gap-6">
        <div className="flex justify-end items-center">
            <Button variant="outline" onClick={disconnectBlackboard} className="text-red-500 hover:text-red-600">
                Disconnect
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-0">
            {/* Course List */}
            <div className="md:col-span-1 border rounded-xl bg-card overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-secondary/10 font-medium">
                    Courses
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {courses.length === 0 && (
                        <div className="text-center p-4 text-sm text-muted-foreground">
                            No courses found.
                        </div>
                    )}
                    {courses.map(course => (
                        <div 
                            key={course.id}
                            onClick={() => {
                                setSelectedCourseId(course.id);
                                handleRefreshCourse(course.id);
                            }}
                            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                selectedCourseId === course.id 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'hover:bg-secondary/50 border-transparent'
                            }`}
                        >
                            <div className="font-semibold truncate">{course.courseId}</div>
                            <div className="text-sm opacity-80 truncate">{course.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Course Detail */}
            <div className="md:col-span-2 border rounded-xl bg-card overflow-hidden flex flex-col">
                {selectedCourse ? (
                    <>
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{selectedCourse.name}</h2>
                            <p className="text-muted-foreground text-sm">{selectedCourse.courseId}</p>
                            
                            <div className="flex gap-4 mt-6 border-b -mb-6">
                                {(['overview', 'syllabus', 'assignments', 'grades'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === tab 
                                            ? 'border-primary text-primary' 
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-secondary/5">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-background rounded-xl border shadow-sm">
                                            <div className="text-sm text-muted-foreground mb-1">Current Grade</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {grades.length > 0 ? '88%' : 'N/A'} 
                                            </div>
                                        </div>
                                        <div className="p-4 bg-background rounded-xl border shadow-sm">
                                            <div className="text-sm text-muted-foreground mb-1">Pending Assignments</div>
                                            <div className="text-2xl font-bold text-amber-600">2</div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-semibold mb-3">Recent Announcements</h3>
                                        <div className="p-4 bg-background rounded-xl border text-sm text-muted-foreground text-center">
                                            No recent announcements
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'grades' && (
                                <div className="space-y-3">
                                    {grades.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">No grades available</div>
                                    ) : (
                                        grades.map(grade => (
                                            <div key={grade.id} className="flex justify-between items-center p-4 bg-background rounded-xl border">
                                                <div>
                                                    <div className="font-medium">{grade.name}</div>
                                                    <div className="text-xs text-muted-foreground">{grade.status}</div>
                                                </div>
                                                <div className="font-bold">
                                                    {grade.score !== undefined ? `${grade.score}/${grade.possible}` : '-'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'syllabus' && (
                                <div className="space-y-3">
                                    {courseContents.filter(c => !c.mimeType?.includes('assignment')).map(content => (
                                         <div key={content.id} className="flex items-start gap-3 p-4 bg-background rounded-xl border">
                                            <FileText className="mt-1 text-blue-500 shrink-0" size={20} />
                                            <div>
                                                <div className="font-medium">{content.title}</div>
                                                {content.body && (
                                                    <div className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: content.body }} />
                                                )}
                                                {content.link && (
                                                    <a 
                                                        href={typeof content.link === 'string' ? content.link : content.link.url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-xs text-primary mt-2 flex items-center gap-1"
                                                    >
                                                        <LinkIcon size={12} /> Open Link
                                                    </a>
                                                )}
                                            </div>
                                         </div>
                                    ))}
                                    {courseContents.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground">
                                            No content loaded. Click refresh or select course again.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Book size={48} className="mb-4 opacity-20" />
                        <p>Select a course to view details</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default School;
