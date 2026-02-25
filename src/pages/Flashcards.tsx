import React, { useEffect, useState, useMemo } from 'react';
import { useStore, Question } from '../store/useStore';
import { calculateSM2 } from '../utils/sm2';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, CheckCircle, AlertCircle, Layers, Play, ArrowLeft, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import RichText from '../components/ui/RichText';
import { cleanMcqText, parseLabeledMcq } from '../utils/mcqParser';

const cleanOptionText = (value: string): string => cleanMcqText(value);

const parsePackedMcqContent = (content: string): { stem: string; options: string[] } | null => {
  const parsed = parseLabeledMcq(content);
  if (!parsed) return null;
  return {
    stem: cleanOptionText(parsed.stem) || 'Question',
    options: parsed.options.map(cleanOptionText).filter(Boolean),
  };
};

const Flashcards = () => {
  const { questions: allQuestions, sets: allSets, reviewQuestion, addSession, activeProfileId } = useStore();
  
  const questions = useMemo(() => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId), [allQuestions, activeProfileId]);
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const [dueQuestions, setDueQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [isDrillMode, setIsDrillMode] = useState(false);

  const getDueQuestionsForSet = (setId: string) => {
    const now = Date.now();
    const set = sets.find(s => s.id === setId);
    if (!set) return [];
    const relevantQuestions = questions.filter(q => set.questionIds.includes(q.id));

    return relevantQuestions.filter(
      (q) => !q.nextReviewDate || q.nextReviewDate <= now
    ).sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));
  };

  const startSession = (setId: string) => {
    const due = getDueQuestionsForSet(setId);
    setDueQuestions(due);
    setSelectedSetId(setId);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setCorrectCount(0);
    setIncorrectIds([]);
    setStartTime(Date.now());
    setIsDrillMode(false);
  };

  const currentQuestion = dueQuestions[currentIndex];
  const parsedPackedFront = useMemo(
    () => (currentQuestion ? parsePackedMcqContent(currentQuestion.content) : null),
    [currentQuestion],
  );
  const frontStem = parsedPackedFront?.stem || currentQuestion?.content || '';
  const frontOptions =
    currentQuestion?.options && currentQuestion.options.length >= 2
      ? currentQuestion.options
      : parsedPackedFront?.options || [];

  const getIntervalLabel = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentQuestion) return '-';
    const { interval } = calculateSM2({
        easeFactor: currentQuestion.easeFactor || 2.5,
        repetitions: currentQuestion.repetitions || 0,
        interval: currentQuestion.interval || 0
    }, rating);
    
    return interval === 1 ? '1 day' : `${interval} days`;
  };

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentQuestion) return;
    
    reviewQuestion(currentQuestion.id, rating);
    
    if (rating === 'good' || rating === 'easy') {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectIds(prev => [...prev, currentQuestion.id]);
    }

    setIsFlipped(false);
    
    if (currentIndex < dueQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 200);
    } else {
      const finalCorrectCount = (rating === 'good' || rating === 'easy') ? correctCount + 1 : correctCount;
      const finalIncorrectIds = (rating === 'again' || rating === 'hard') ? [...incorrectIds, currentQuestion.id] : incorrectIds;
      const duration = (Date.now() - startTime) / 1000;

      // Note: real-time stats (streak, XP, time) are handled by reviewQuestion per card.
      // addSession here just logs the historical session record and ensures consistency.
      addSession({
        setId: selectedSetId || '',
        date: startTime, // Use start time as session date
        score: finalCorrectCount,
        totalQuestions: dueQuestions.length,
        incorrectQuestionIds: finalIncorrectIds,
        duration: duration
      });
      setSessionComplete(true);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDrillMissed = () => {
    const missedQuestions = dueQuestions.filter((q) => incorrectIds.includes(q.id));
    if (missedQuestions.length === 0) return;
    setDueQuestions(missedQuestions);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setCorrectCount(0);
    setIncorrectIds([]);
    setStartTime(Date.now());
    setIsDrillMode(true);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!selectedSetId || sessionComplete || dueQuestions.length === 0) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (event.code === 'Space') {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (!isFlipped) return;
      if (event.key === '1') {
        event.preventDefault();
        handleRate('again');
      } else if (event.key === '2') {
        event.preventDefault();
        handleRate('hard');
      } else if (event.key === '3') {
        event.preventDefault();
        handleRate('good');
      } else if (event.key === '4') {
        event.preventDefault();
        handleRate('easy');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedSetId, sessionComplete, dueQuestions.length, isFlipped, currentQuestion, currentIndex, correctCount, incorrectIds]);

  // If no set selected, show set selection screen
  if (!selectedSetId) {
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Flashcards</h2>
                <p className="text-muted-foreground">Select a deck to start your review session.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Individual Sets */}
                {sets.map(set => {
                    const dueCount = getDueQuestionsForSet(set.id).length;
                    return (
                        <motion.div
                            key={set.id}
                            whileHover={{ y: -4 }}
                            className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl flex flex-col justify-between cursor-pointer"
                            onClick={() => startSession(set.id)}
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">{set.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{set.description || 'No description'}</p>
                                    </div>
                                    <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                                        <Layers className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <span className={`text-2xl font-bold ${dueCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {dueCount}
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-2">cards due</span>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <Button className="w-full min-w-[140px]" disabled={dueCount === 0}>
                                    <Play className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">Start Review</span>
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
             {sets.length === 0 && questions.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-4" />
                    <p>No questions found. Create a set in the Question Bank to get started.</p>
                 </div>
             )}
        </div>
    );
  }

  // Session Complete View
  if (sessionComplete || dueQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 bg-green-100 dark:bg-green-900/20 rounded-full"
        >
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold">All Caught Up!</h2>
          <p className="text-muted-foreground mt-2">
            You've reviewed all cards due for this deck. Great job!
          </p>
        </div>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm w-full mt-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Cards Reviewed</p>
            <p className="text-2xl font-bold">{dueQuestions.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Remaining Today</p>
            <p className="text-2xl font-bold">0</p>
          </div>
          </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {isDrillMode ? null : (
            <Button onClick={handleDrillMissed} disabled={incorrectIds.length === 0}>
              Drill Missed Cards
            </Button>
          )}
          <Button onClick={() => setSelectedSetId(null)} variant="outline">
              Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto pb-10">
	      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
           <Button variant="ghost" size="sm" onClick={() => setSelectedSetId(null)} className="-ml-2 text-muted-foreground hover:text-foreground">
             <ArrowLeft size={16} className="mr-1" /> Back
           </Button>
           
           <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-600 text-sm font-medium">
              <Zap size={14} className="fill-orange-500" />
              <span>Streak: {currentIndex}</span>
           </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-secondary/50 rounded-full h-2.5 overflow-hidden">
            <motion.div 
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex) / dueQuestions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
            />
        </div>
	        <div className="flex justify-between text-xs text-muted-foreground px-1">
	            <span>{currentIndex} reviewed</span>
	            <span>{dueQuestions.length - currentIndex} remaining</span>
	        </div>
          <div className="text-[11px] text-muted-foreground text-center">
            Space: flip card, 1-4: Again/Hard/Good/Easy
          </div>
          {isDrillMode && (
            <div className="inline-flex w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Drill Missed Cards
            </div>
          )}
	      </div>

      <div className="flex-1 flex flex-col items-center justify-center perspective-1000 min-h-[400px]">
        <div className="relative w-full max-w-xl aspect-3/2 group">
          <motion.div
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="w-full h-full relative preserve-3d cursor-pointer shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-2xl"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={handleFlip}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-card border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm overflow-y-auto">
              <span className="absolute top-6 left-6 text-xs font-semibold text-primary tracking-wider uppercase bg-primary/10 px-2 py-1 rounded">Question</span>
              
              {currentQuestion.imageUrl && (
                  <div className="mb-6 max-h-[180px] w-full flex justify-center shrink-0">
                      <img 
                        src={currentQuestion.imageUrl} 
                        alt="Question Reference" 
                        className="h-full max-w-full object-contain rounded-lg border border-border/50 shadow-sm"
                      />
                  </div>
              )}

              <div className="text-xl md:text-2xl font-medium leading-relaxed w-full text-left">
                <RichText content={frontStem} />
              </div>
              {frontOptions.length >= 2 && (
                <div className="mt-6 w-full text-left space-y-3">
                  {frontOptions.map((option, index) => (
                    <div key={`${currentQuestion.id}-opt-${index}`} className="flex gap-2 text-base md:text-lg">
                      <span className="font-semibold text-primary shrink-0">
                        {String.fromCharCode(65 + (index % 26))}.
                      </span>
                      <div className="min-w-0">
                        <RichText content={option} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="absolute bottom-6 text-sm text-muted-foreground flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <RotateCw size={14} /> Click to flip
              </p>
            </div>

            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden bg-card border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm overflow-y-auto"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <span className="absolute top-6 left-6 text-xs font-semibold text-primary tracking-wider uppercase bg-primary/10 px-2 py-1 rounded">Answer</span>
              <div className="prose dark:prose-invert max-w-none w-full flex flex-col items-center">
                <div className="text-xl font-bold mb-4 w-full">
                  {Array.isArray(currentQuestion.answer)
                    ? currentQuestion.answer.map((ans, i) => (
                        <div key={i} className="mb-1 last:mb-0">
                            <RichText content={ans} />
                        </div>
                    ))
                    : <RichText content={currentQuestion.answer} />
                  }
                </div>

                {currentQuestion.rationale && (
                  <div className="pt-4 border-t border-border/50 w-full mt-4">
                    <div className="text-sm text-muted-foreground italic">
                      <RichText content={currentQuestion.rationale} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-8 h-20">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="flip-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-center"
            >
              <Button size="lg" onClick={handleFlip} className="w-full max-w-xs">
                Show Answer
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="rating-controls"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-4 gap-3"
            >
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline" 
                  className="border-red-200 hover:bg-red-100 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('again'); }}
                >
                  Again
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">{getIntervalLabel('again')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-orange-200 hover:bg-orange-100 hover:text-orange-700 dark:border-orange-900/30 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                >
                  Hard
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">{getIntervalLabel('hard')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('good'); }}
                >
                  Good
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">{getIntervalLabel('good')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-green-200 hover:bg-green-100 hover:text-green-700 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                >
                  Easy
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">{getIntervalLabel('easy')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Flashcards;
