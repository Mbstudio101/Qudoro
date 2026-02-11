import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Zap,
  Plus,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import Input from '../components/ui/Input';

const Dashboard = () => {
  const { questions: allQuestions, sets: allSets, userProfile, setUserProfile, updateLastVisit, activeProfileId } = useStore();
  
  const questions = useMemo(() => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId), [allQuestions, activeProfileId]);
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile.name);

  // Update last visit on mount and determine greeting
  useEffect(() => {
    const lastVisit = userProfile.lastVisit;
    const now = Date.now();
    
    // Only update last visit if it's been more than 1 hour or it's null
    if (!lastVisit || now - lastVisit > 3600000) {
      updateLastVisit();
    }

    const hour = new Date().getHours();
    let timeGreeting = 'Welcome';
    
    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    setGreeting(`${timeGreeting}, ${userProfile.name}!`);
  }, [userProfile.lastVisit, userProfile.name, updateLastVisit]); // Run when profile changes

  // Calculate Stats
  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const totalSets = sets.length;
    const now = Date.now();
    const cardsDue = questions.filter((q) => q.nextReviewDate <= now).length;
    
    // Mastery Levels
    const learning = questions.filter((q) => !q.box || q.box <= 1).length;
    const reviewing = questions.filter((q) => q.box > 1 && q.box < 5).length;
    const mastered = questions.filter((q) => q.box >= 5).length;
    
    const masteryRate = totalQuestions > 0 ? Math.round((mastered / totalQuestions) * 100) : 0;

    // Recent Activity (questions reviewed in last 24h)
    const recentActivity = questions.filter(
      (q) => q.lastReviewed && now - q.lastReviewed < 86400000
    ).length;

    return {
      totalQuestions,
      totalSets,
      cardsDue,
      learning,
      reviewing,
      mastered,
      masteryRate,
      recentActivity,
    };
  }, [questions, sets]);

  // Chart Data: Cards Due Next 7 Days
  const dueData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = days[date.getDay()];
      
      // End of day timestamp
      const startOfDay = new Date(date.setHours(0,0,0,0)).getTime();
      const endOfDay = new Date(date.setHours(23,59,59,999)).getTime();

      const count = questions.filter(
        (q) => q.nextReviewDate >= startOfDay && q.nextReviewDate <= endOfDay
      ).length;
      
      // Also include overdue in the first bar (Today)
      let finalCount = count;
      if (i === 0) {
        const overdue = questions.filter((q) => q.nextReviewDate < startOfDay).length;
        finalCount += overdue;
      }

      data.push({ day: i === 0 ? 'Today' : dayName, count: finalCount });
    }
    return data;
  }, [questions]);

  // Mastery Data for Pie Chart
  const masteryData = [
    { name: 'Learning', value: stats.learning, color: '#f59e0b' }, // Amber
    { name: 'Reviewing', value: stats.reviewing, color: '#3b82f6' }, // Blue
    { name: 'Mastered', value: stats.mastered, color: '#10b981' }, // Emerald
  ].filter(d => d.value > 0);

  // Actionable Insights
  const insights = useMemo(() => {
    const list = [];
    if (stats.cardsDue > 0) {
      list.push({
        type: 'urgent',
        text: `You have ${stats.cardsDue} cards due for review today.`,
        action: 'Review Now',
        onClick: () => navigate('/flashcards'),
        icon: <Zap className="text-amber-500" />,
      });
    } else if (stats.totalQuestions > 0) {
      list.push({
        type: 'success',
        text: "You're all caught up on reviews! Great job.",
        action: 'Practice Sets',
        onClick: () => navigate('/sets'),
        icon: <CheckCircle2 className="text-emerald-500" />,
      });
    }

    if (stats.totalQuestions === 0) {
      list.push({
        type: 'info',
        text: "Your question bank is empty. Start by adding some questions.",
        action: 'Add Question',
        onClick: () => navigate('/questions'),
        icon: <BookOpen className="text-blue-500" />,
      });
    } else if (stats.masteryRate < 10 && stats.totalQuestions > 10) {
       list.push({
        type: 'tip',
        text: "Your mastery rate is low. Try the 'Cram Mode' in sets to boost retention.",
        action: 'Go to Sets',
        onClick: () => navigate('/sets'),
        icon: <TrendingUp className="text-indigo-500" />,
      });
    }

    return list;
  }, [stats, navigate]);

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name: newName });
    setIsEditingName(false);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <form onSubmit={handleNameSave} className="flex items-center gap-2">
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="h-9 w-48"
                  autoFocus
                />
                <Button size="sm" type="submit">Save</Button>
              </form>
            ) : (
              <h1 
                className="text-4xl font-bold tracking-tight bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsEditingName(true)}
                title="Click to edit name"
              >
                {greeting}
              </h1>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/flashcards')} className="shadow-lg shadow-primary/20">
                <Zap className="mr-2 h-4 w-4" /> Start Review
            </Button>
            <Button variant="outline" onClick={() => navigate('/questions')}>
                <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            title="Total Questions" 
            value={stats.totalQuestions} 
            icon={<BookOpen className="h-5 w-5 text-blue-500" />} 
            trend={stats.totalQuestions > 0 ? "+ Added recently" : "Start building"}
        />
        <StatCard 
            title="Due for Review" 
            value={stats.cardsDue} 
            icon={<Clock className="h-5 w-5 text-amber-500" />} 
            highlight={stats.cardsDue > 0}
        />
        <StatCard 
            title="Mastery Rate" 
            value={`${stats.masteryRate}%`} 
            icon={<Award className="h-5 w-5 text-emerald-500" />} 
            trend={`${stats.mastered} mastered items`}
        />
        <StatCard 
            title="Study Sets" 
            value={stats.totalSets} 
            icon={<Layers className="h-5 w-5 text-indigo-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Upcoming Reviews
            </h3>
            <div className="h-[300px] w-full" style={{ minHeight: '300px', minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <BarChart data={dueData}>
                        <XAxis 
                            dataKey="day" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {dueData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>

        {/* Insights & Actions */}
        <div className="space-y-6">
            {/* Insights Panel */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[200px]"
            >
                <h3 className="text-lg font-semibold mb-4">Insights</h3>
                <div className="space-y-4">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors">
                            <div className="mt-1 p-2 rounded-full bg-background">
                                {insight.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium mb-2">{insight.text}</p>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={insight.onClick}
                                    className="h-auto p-0 text-primary hover:text-primary/80 hover:bg-transparent"
                                >
                                    {insight.action} →
                                </Button>
                            </div>
                        </div>
                    ))}
                    {insights.length === 0 && (
                        <p className="text-sm text-muted-foreground">No pending insights. Keep up the good work!</p>
                    )}
                </div>
            </motion.div>

            {/* Mastery Pie Chart (Mini) */}
            <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center"
            >
                 <h3 className="text-lg font-semibold mb-2 w-full text-left">Progress Distribution</h3>
                 <div className="h-[180px] w-full flex items-center justify-center" style={{ minWidth: 0, minHeight: 0 }}>
                    {stats.totalQuestions > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={masteryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {masteryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-muted-foreground text-sm">
                            Add questions to see your progress distribution.
                        </div>
                    )}
                 </div>
                 {stats.totalQuestions > 0 && (
                     <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
                        {masteryData.map((d) => (
                            <div key={d.name} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                {d.name}
                            </div>
                        ))}
                     </div>
                 )}
            </motion.div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, highlight }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, highlight?: boolean }) => (
    <motion.div 
        whileHover={{ y: -2 }}
        className={`p-6 rounded-2xl border ${highlight ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'} shadow-sm transition-all`}
    >
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className={`p-2 rounded-full ${highlight ? 'bg-primary/20' : 'bg-secondary'}`}>
                {icon}
            </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <div className="text-xs text-muted-foreground mt-1">{trend}</div>}
    </motion.div>
);

export default Dashboard;
