import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, Question } from '../store/useStore';
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, Target, Brain, ArrowRight, AlertCircle, Clock3, Zap, Star, Trophy } from 'lucide-react';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import RichText from '../components/ui/RichText';
import { motion, AnimatePresence } from 'framer-motion';

const Practice = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isChallenge = searchParams.get('challenge') === '1';
  const { sets: allSets, questions, addSession, completeDailyChallenge, userProfile, activeProfileId } = useStore();
  
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectQuestionIds, setIncorrectQuestionIds] = useState<string[]>([]);
  const [userSelections, setUserSelections] = useState<Record<string, string[]>>({});
  const [startTime, setStartTime] = useState(Date.now());
  const [isDrillMode, setIsDrillMode] = useState(false);
  const timedMinutesParam = Number.parseInt(searchParams.get('minutes') || '', 10);
  const isTimedMode = mode === 'timed';
  const timedDurationSeconds = isTimedMode ? ((Number.isFinite(timedMinutesParam) && timedMinutesParam > 0 ? timedMinutesParam : 60) * 60) : null;
  const [timeRemainingSec, setTimeRemainingSec] = useState<number | null>(timedDurationSeconds);
  const sessionSaved = useRef(false);

  // Engagement state
  const [xpFloat, setXpFloat] = useState<{ id: number; amount: number } | null>(null);
  const preLevelRef = useRef(userProfile.stats?.level || 1);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [showFiveMore, setShowFiveMore] = useState(false);
  const [fiveMoreDismissed, setFiveMoreDismissed] = useState(false);
  const [fiveMoreActive, setFiveMoreActive] = useState(false);
  const [bonusXpEarned, setBonusXpEarned] = useState(0);
  
  const currentSet = sets.find((s) => s.id === setId);
  
  const [setQuestions, setSetQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (currentSet) {
        const qs = currentSet.questionIds
            .map((id) => questions.find((q) => q.id === id))
            .filter((q): q is Question => !!q);
        
        if (mode === 'cram') {
            // Fisher-Yates shuffle
            for (let i = qs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qs[i], qs[j]] = [qs[j], qs[i]];
            }
        }
        
        setSetQuestions(qs);
        setCurrentQuestionIndex(0);
        setSelectedOptions([]);
        setIsChecked(false);
        setShowResults(false);
        setScore(0);
        setIncorrectQuestionIds([]);
        setUserSelections({});
        setStartTime(Date.now());
        setIsDrillMode(false);
        setTimeRemainingSec(timedDurationSeconds);
        sessionSaved.current = false;
    }
  }, [currentSet, questions, mode, timedDurationSeconds]);

  const currentQuestion = setQuestions[currentQuestionIndex];

  useEffect(() => {
    if (sets.length > 0 && !currentSet) {
       navigate('/sets');
    }
  }, [currentSet, sets, navigate]);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOptions([]);
    setIsChecked(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!isTimedMode || showResults || !setQuestions.length) return;
    setTimeRemainingSec((prev) => (prev === null ? timedDurationSeconds : prev));
    const timer = window.setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(timer);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTimedMode, showResults, setQuestions.length, timedDurationSeconds]);

  // Save session when results are shown
  useEffect(() => {
    if (showResults && currentSet && !sessionSaved.current) {
      try {
        preLevelRef.current = userProfile.stats?.level || 1;
        const duration = (Date.now() - startTime) / 1000;
        addSession({
          setId: currentSet.id,
          date: startTime,
          score: score,
          totalQuestions: setQuestions.length,
          incorrectQuestionIds: incorrectQuestionIds,
          duration: duration
        });
        sessionSaved.current = true;

        // Check for daily challenge completion
        if (isChallenge && score > 0) {
          const bonus = score * 20;
          completeDailyChallenge(bonus);
          setBonusXpEarned(bonus);
        }
      } catch (err) {
        console.error('Failed to save practice session:', err);
      }
    }
  }, [showResults, currentSet, score, setQuestions.length, incorrectQuestionIds, addSession, startTime, isChallenge, completeDailyChallenge]);

  // Level-up detection — runs after addSession updates the store
  useEffect(() => {
    if (!sessionSaved.current) return;
    const newLevel = userProfile.stats?.level || 1;
    if (newLevel > preLevelRef.current) {
      setLevelUp(newLevel);
      preLevelRef.current = newLevel;
    }
  }, [userProfile.stats?.level]);

  if (!currentSet || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-muted-foreground">No questions in this set.</p>
        <Button onClick={() => navigate('/sets')}>Back to Sets</Button>
      </div>
    );
  }

  const handleOptionSelect = (option: string) => {
    if (isChecked) return; // Prevent changing after checking
    
    // Normalize correct answers to array
    const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
    const isMultiSelect = correctAnswers.length > 1;

    if (isMultiSelect) {
        // Toggle behavior for SATA
        if (selectedOptions.includes(option)) {
            setSelectedOptions(prev => prev.filter(o => o !== option));
        } else {
            setSelectedOptions(prev => [...prev, option]);
        }
    } else {
        // Radio behavior for Single Answer
        if (selectedOptions.includes(option)) {
            setSelectedOptions([]);
        } else {
            setSelectedOptions([option]);
        }
    }
  };

  const handleCheck = () => {
    if (selectedOptions.length === 0) return;
    
    setIsChecked(true);
    setUserSelections((prev) => ({ ...prev, [currentQuestion.id]: [...selectedOptions] }));
    
    // Check correctness
    const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
    
    // Exact match required
    const isCorrect = 
        selectedOptions.length === correctAnswers.length && 
        selectedOptions.every(opt => correctAnswers.includes(opt));
    
    // Update score
    if (isCorrect) {
        setScore(s => s + 1);
        // Trigger XP float animation
        setXpFloat({ id: Date.now(), amount: 20 });
        setTimeout(() => setXpFloat(null), 900);
    } else {
        setIncorrectQuestionIds(prev => [...prev, currentQuestion.id]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < setQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleDrillMissed = () => {
    const missedQuestions = setQuestions.filter((q) => incorrectQuestionIds.includes(q.id));
    if (missedQuestions.length === 0) return;
    setSetQuestions(missedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedOptions([]);
    setIsChecked(false);
    setShowResults(false);
    setScore(0);
    setIncorrectQuestionIds([]);
    setUserSelections({});
    setStartTime(Date.now());
    setIsDrillMode(true);
    setShowFiveMore(false);
    setTimeRemainingSec(isTimedMode ? timedDurationSeconds : null);
    sessionSaved.current = false;
  };

  const handleFiveMore = () => {
    // Pick 5 random questions from the full set not already answered in this session
    const answeredIds = new Set(setQuestions.map(q => q.id));
    const fullSetQs = (currentSet?.questionIds || [])
      .map(id => questions.find(q => q.id === id))
      .filter((q): q is Question => !!q && !answeredIds.has(q.id));
    // Shuffle and take up to 5
    const shuffled = [...fullSetQs].sort(() => Math.random() - 0.5).slice(0, 5);
    if (shuffled.length === 0) return;
    setSetQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedOptions([]);
    setIsChecked(false);
    setShowResults(false);
    setScore(0);
    setIncorrectQuestionIds([]);
    setUserSelections({});
    setStartTime(Date.now());
    setFiveMoreActive(true);
    setShowFiveMore(false);
    setTimeRemainingSec(null);
    sessionSaved.current = false;
  };

  const formatRemaining = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = ((currentQuestionIndex + 1) / setQuestions.length) * 100;

  if (showResults) {
    const percentage = Math.round((score / setQuestions.length) * 100);
    const incorrectQuestions = questions.filter(q => incorrectQuestionIds.includes(q.id));
    
    const getFeedback = (pct: number) => {
        if (pct === 100) return { title: "Outstanding!", message: "Perfect score! You've completely mastered this material.", color: "text-green-500" };
        if (pct >= 90) return { title: "Excellent Work!", message: "You're doing amazing! Just a few minor details to polish.", color: "text-emerald-500" };
        if (pct >= 80) return { title: "Great Job!", message: "Solid performance. You're well on your way to mastery.", color: "text-blue-500" };
        if (pct >= 70) return { title: "Good Effort", message: "You're getting there! Review your mistakes to strengthen your understanding.", color: "text-indigo-500" };
        if (pct >= 60) return { title: "Keep Going", message: "You passed, but there's room for improvement. Don't give up!", color: "text-yellow-500" };
        return { title: "Don't Give Up!", message: "Learning takes time. Review the material and try again—you've got this!", color: "text-orange-500" };
    };

    const feedback = getFeedback(percentage);

    // Analyze tags for focus areas
    const missedTags = incorrectQuestions.flatMap(q => q.tags || []);
    const tagCounts = missedTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3); // Top 3 weak areas

    // Check whether we should offer "5 more" (only once, not in drill/5more mode)
    const fullSetQs = (currentSet?.questionIds || []).map(id => questions.find(q => q.id === id)).filter(Boolean);
    const canFiveMore = !isDrillMode && !fiveMoreActive && !fiveMoreDismissed && score >= 3
      && fullSetQs.length > setQuestions.length;

    return (
        <div className="flex flex-col h-full overflow-y-auto pb-10">
          {/* Level-up celebration modal */}
          <Modal isOpen={levelUp !== null} onClose={() => setLevelUp(null)} title="">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-24 h-24 rounded-full bg-yellow-500/20 border-4 border-yellow-400 flex items-center justify-center"
              >
                <Trophy className="h-12 w-12 text-yellow-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-yellow-400">Level Up!</h2>
                <p className="text-4xl font-black mt-1">Level {levelUp}</p>
                <p className="text-muted-foreground mt-2">You reached a new level. Keep it up!</p>
              </div>
              <Button onClick={() => setLevelUp(null)} className="mt-2 w-full">
                <Star className="mr-2 h-4 w-4" /> Awesome!
              </Button>
            </div>
          </Modal>

            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in zoom-in duration-300 p-4">

                {/* Daily challenge completion banner */}
                {isChallenge && bonusXpEarned > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3">
                    <Zap className="h-5 w-5 text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-300">Daily Challenge Complete!</p>
                      <p className="text-sm text-muted-foreground">+{bonusXpEarned} bonus XP earned</p>
                    </div>
                  </div>
                )}

                {/* "Just 5 more" prompt */}
                {canFiveMore && !showFiveMore && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">You're on a roll!</p>
                        <p className="text-xs text-muted-foreground">5 more questions = +50 bonus XP</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={handleFiveMore}>Keep going</Button>
                      <Button size="sm" variant="ghost" onClick={() => setFiveMoreDismissed(true)}>Skip</Button>
                    </div>
                  </div>
                )}

                {/* "5 more" bonus complete banner */}
                {fiveMoreActive && (
                  <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    <p className="font-semibold text-green-300 text-sm">+50 bonus XP earned — great work!</p>
                  </div>
                )}

                <div className="text-center space-y-2">
                    <h2 className={`text-3xl font-bold ${feedback.color}`}>{feedback.title}</h2>
                    <p className="text-muted-foreground">{feedback.message}</p>
                </div>
                
                {/* Score Overview */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl shadow-sm">
                    <div className="w-48 h-48 rounded-full border-8 border-secondary flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-8 border-primary transition-all duration-1000" 
                             style={{ clipPath: `polygon(0 0, 100% 0, 100% ${percentage}%, 0 ${percentage}%)`, transform: 'rotate(-90deg)' }}></div>
                        <div className="text-center">
                            <span className="text-4xl font-bold block">{percentage}%</span>
                            <span className="text-sm text-muted-foreground">Accuracy</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center gap-4">
                                <div className="p-2 bg-green-500/20 rounded-full text-green-500"><CheckCircle2 size={24} /></div>
                                <div>
                                    <p className="text-2xl font-bold text-green-500">{score}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Correct</p>
                                </div>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-4">
                                <div className="p-2 bg-red-500/20 rounded-full text-red-500"><XCircle size={24} /></div>
                                <div>
                                    <p className="text-2xl font-bold text-red-500">{setQuestions.length - score}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Incorrect</p>
                                </div>
                            </div>
                        </div>

                        {/* Deep Feedback / Focus Areas */}
                        <div className="p-5 bg-secondary/10 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="text-primary" size={20} />
                                <h3 className="font-semibold text-lg">Analysis & Recommendations</h3>
                            </div>
                            
                            {sortedTags.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Based on your performance, you should focus on these topics:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {sortedTags.map(([tag, count]) => (
                                            <div key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                                                <Target size={14} />
                                                {tag}
                                                <span className="bg-background/50 px-1.5 rounded text-xs ml-1">{count} missed</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {userProfile.studyField ? `Keep pushing! Mastering these ${userProfile.studyField} concepts is key.` : "Reviewing these areas will significantly improve your score next time."}
                                    </p>
                                </div>
                            ) : score === setQuestions.length ? (
                                <div className="text-green-500 flex items-center gap-2">
                                    <Target size={20} />
                                    <span>Perfect score! You have mastered this material. Challenge yourself with a harder set next!</span>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    You missed a few questions, but they didn't have specific tags. Review the rationales below to understand the concepts better.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Review Incorrect Questions */}
                {incorrectQuestions.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 px-2">
                            <BookOpen className="text-primary" size={24} />
                            <h3 className="text-2xl font-bold">Review Missed Questions</h3>
                        </div>
                        
                        <div className="grid gap-6">
                            {incorrectQuestions.map((q, idx) => (
                                <div key={q.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:border-red-500/30 transition-colors">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="font-medium text-lg">
                                                <RichText content={q.content} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                            </div>
                                            
                                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                                    <span className="text-red-600 font-semibold block mb-1">Your Answer</span>
                                                    {(userSelections[q.id] && userSelections[q.id].length > 0) ? (
                                                      userSelections[q.id].map((a, i) => (
                                                        <div key={`${q.id}-ua-${i}`}>
                                                          <RichText content={a} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                                        </div>
                                                      ))
                                                    ) : (
                                                      <span className="text-muted-foreground">No answer selected</span>
                                                    )}
                                                </div>
                                                <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                                    <span className="text-green-600 font-semibold block mb-1">Correct Answer</span>
                                                    {Array.isArray(q.answer) 
                                                        ? q.answer.map((a, i) => <div key={i}><RichText content={a} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" /></div>) 
                                                        : <RichText content={q.answer} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                                    }
                                                </div>
                                            </div>

                                            {q.rationale && (
                                                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-sm">
                                                    <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                                                        <Brain size={16} />
                                                        <span>Rationale</span>
                                                    </div>
                                                    <div className="text-muted-foreground leading-relaxed">
                                                        <RichText content={q.rationale} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {q.tags && q.tags.length > 0 && (
                                                <div className="flex gap-2">
                                                    {q.tags.map(t => (
                                                        <span key={t} className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">#{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-8 pb-12">
                    {incorrectQuestions.length > 0 && (
                      <Button onClick={handleDrillMissed} size="lg" className="min-w-[220px]">
                        Drill Missed Cards
                      </Button>
                    )}
                    <Button onClick={() => navigate('/sets')} size="lg" className="min-w-[200px] gap-2">
                        Back to Sets <ArrowRight size={18} />
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  // Determine if it's MCQ or Flashcard style (fallback)
  const isMCQ = currentQuestion.options && currentQuestion.options.length > 0;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto pb-10 px-4 overflow-y-auto min-h-0 relative">
      {/* XP Float Animation */}
      <AnimatePresence>
        {xpFloat && (
          <motion.div
            key={xpFloat.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute top-20 right-8 text-yellow-400 font-bold text-xl pointer-events-none z-20 drop-shadow-lg"
          >
            +{xpFloat.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sets')} className="hover:bg-secondary/50 rounded-full h-10 w-10 p-0 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 mx-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Question {currentQuestionIndex + 1} of {setQuestions.length}</span>
                <div className="flex items-center gap-3">
                  {isTimedMode && timeRemainingSec !== null && (
                    <span className={`${timeRemainingSec <= 30 ? 'text-red-500 font-semibold' : ''}`}>
                      <Clock3 className="inline h-3.5 w-3.5 mr-1" />
                      {formatRemaining(timeRemainingSec)}
                    </span>
                  )}
                  <span>{Math.round(progress)}% completed</span>
                </div>
            </div>
            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / setQuestions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>
      {isDrillMode && (
        <div className="mb-3 inline-flex items-center w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Drill Missed Cards
        </div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
        >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
                {/* Scrollable content area */}
                <div className="overflow-y-auto max-h-[42vh] p-8 flex flex-col items-center justify-center text-center">
                    {currentQuestion.imageUrl && (
                        <div className="mb-6 w-full max-w-lg rounded-lg overflow-hidden shadow-lg">
                             <img
                                src={currentQuestion.imageUrl}
                                alt="Question Reference"
                                className="w-full h-auto max-h-[300px] object-contain bg-black/5"
                            />
                        </div>
                    )}
                    <div className="text-lg font-medium leading-relaxed w-full">
                        <RichText content={currentQuestion.content} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                    </div>
                </div>
                {/* Sticky footer inside card */}
                {!isMCQ && (
                    <div className="shrink-0 border-t border-border/40 px-8 py-3 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground tracking-wide select-none">
                            Click below to flip
                        </span>
                    </div>
                )}
            </div>

            {isMCQ ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options?.map((option, idx) => {
                        const isSelected = selectedOptions.includes(option);
                        const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                        const isCorrectAnswer = correctAnswers.includes(option);
                        
                        let extraClasses = "hover:border-primary/50 hover:bg-secondary/30";
                        
                        if (isChecked) {
                            if (isCorrectAnswer) {
                                extraClasses = "border-green-500 bg-green-500/10 text-green-500";
                            } else if (isSelected && !isCorrectAnswer) {
                                extraClasses = "border-red-500 bg-red-500/10 text-red-500";
                            } else {
                                extraClasses = "opacity-50";
                            }
                        } else if (isSelected) {
                            extraClasses = "border-primary bg-primary/10 text-primary ring-1 ring-primary";
                        }

                        return (
                            <motion.button
                                key={idx}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleOptionSelect(option)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start justify-between ${extraClasses}`}
                                disabled={isChecked}
                            >
                                <span className="font-medium text-lg flex-1 pr-4 text-left whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                    <RichText content={option} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                </span>
                                {isChecked && isCorrectAnswer && <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-1" />}
                                {isChecked && isSelected && !isCorrectAnswer && <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />}
                            </motion.button>
                        );
                    })}
                </div>
            ) : (
                // Flashcard flip view
                !isChecked ? (
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => setIsChecked(true)}
                    >
                        Flip — Show Answer
                    </Button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden"
                    >
                        <div className="overflow-y-auto max-h-[30vh] px-8 py-6 text-center">
                            <div className="text-lg font-semibold leading-relaxed">
                                {Array.isArray(currentQuestion.answer)
                                    ? currentQuestion.answer.map((a, i) => <div key={i}><RichText content={a} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" /></div>)
                                    : <RichText content={currentQuestion.answer} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                }
                            </div>
                            {currentQuestion.rationale && (
                                <div className="mt-4 pt-4 border-t border-border/40 text-sm text-muted-foreground leading-relaxed text-left">
                                    <span className="font-semibold text-foreground block mb-1">Rationale</span>
                                    <RichText content={currentQuestion.rationale} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                </div>
                            )}
                        </div>
                        <div className="shrink-0 border-t border-border/40 px-8 py-4 flex gap-3 justify-center">
                            <Button variant="destructive" onClick={() => { setIncorrectQuestionIds(prev => [...prev, currentQuestion.id]); handleNext(); }}>
                                <XCircle className="mr-2 h-4 w-4" /> Got it wrong
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setScore(s => s + 1); handleNext(); }}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Got it right
                            </Button>
                        </div>
                    </motion.div>
                )
            )}

            {/* Actions / Feedback */}
            {isChecked && isMCQ && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-6 rounded-2xl border ${
                        (() => {
                            const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                            const isUserCorrect = selectedOptions.length === correctAnswers.length && selectedOptions.every(o => correctAnswers.includes(o));
                            return isUserCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
                        })()
                    }`}
                >
                    <div className="flex items-start gap-3">
                        {(() => {
                            const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                            const isUserCorrect = selectedOptions.length === correctAnswers.length && selectedOptions.every(o => correctAnswers.includes(o));
                            return isUserCorrect ? (
                                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-1" />
                            ) : (
                                <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                            );
                        })()}
                        <div>
                            <h3 className={`text-lg font-bold mb-2 ${
                                (() => {
                                    const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                                    const isUserCorrect = selectedOptions.length === correctAnswers.length && selectedOptions.every(o => correctAnswers.includes(o));
                                    return isUserCorrect ? 'text-green-500' : 'text-red-500';
                                })()
                            }`}>
                                {(() => {
                                    const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                                    const isUserCorrect = selectedOptions.length === correctAnswers.length && selectedOptions.every(o => correctAnswers.includes(o));
                                    return isUserCorrect ? 'Correct!' : 'Incorrect';
                                })()}
                            </h3>
                            {currentQuestion.rationale && (
                                <div className="text-foreground/90">
                                    <span className="font-semibold block mb-1">Rationale:</span>
                                    <RichText content={currentQuestion.rationale} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleNext} size="lg" className={
                             (() => {
                                const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                                const isUserCorrect = selectedOptions.length === correctAnswers.length && selectedOptions.every(o => correctAnswers.includes(o));
                                return isUserCorrect ? 'bg-green-600 hover:bg-green-700' : '';
                            })()
                        }>
                            {currentQuestionIndex < setQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                        </Button>
                    </div>
                </motion.div>
            )}

            {!isChecked && isMCQ && (
                <div className="mt-8 flex justify-end">
                    <Button 
                        size="lg" 
                        onClick={handleCheck} 
                        disabled={selectedOptions.length === 0}
                        className="w-full md:w-auto min-w-[150px]"
                    >
                        Check Answer
                    </Button>
                </div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Practice;
