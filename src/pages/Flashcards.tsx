import React, { useState, useEffect } from 'react';
import { useStore, Question } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, CheckCircle, AlertCircle, Layers, Play } from 'lucide-react';
import Button from '../components/ui/Button';

const Flashcards = () => {
  const { questions, sets, reviewQuestion } = useStore();
  const [dueQuestions, setDueQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // Calculate due questions for all sets initially to show counts
  const getDueQuestionsForSet = (setId: string | 'all') => {
    const now = Date.now();
    let relevantQuestions = questions;
    
    if (setId !== 'all') {
      const set = sets.find(s => s.id === setId);
      if (!set) return [];
      relevantQuestions = questions.filter(q => set.questionIds.includes(q.id));
    }

    return relevantQuestions.filter(
      (q) => !q.nextReviewDate || q.nextReviewDate <= now
    ).sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));
  };

  const startSession = (setId: string | 'all') => {
    const due = getDueQuestionsForSet(setId);
    setDueQuestions(due);
    setSelectedSetId(setId);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
  };

  const currentQuestion = dueQuestions[currentIndex];

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentQuestion) return;
    
    reviewQuestion(currentQuestion.id, rating);
    setIsFlipped(false);
    
    if (currentIndex < dueQuestions.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 200);
    } else {
      setSessionComplete(true);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // If no set selected, show set selection screen
  if (!selectedSetId) {
    const allDueCount = getDueQuestionsForSet('all').length;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Flashcards</h2>
                <p className="text-muted-foreground">Select a deck to start your review session.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* All Questions Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl flex flex-col justify-between cursor-pointer"
                    onClick={() => startSession('all')}
                >
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">All Decks</h3>
                                <p className="text-sm text-muted-foreground">Review all due cards across all sets</p>
                            </div>
                            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                                <Layers className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className={`text-2xl font-bold ${allDueCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                {allDueCount}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">cards due</span>
                        </div>
                    </div>
                    <div className="mt-6">
                         <Button className="w-full" disabled={allDueCount === 0}>
                            <Play className="mr-2 h-4 w-4" /> Start Review
                         </Button>
                    </div>
                </motion.div>

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
                            <div className="mt-6">
                                <Button className="w-full" disabled={dueCount === 0}>
                                    <Play className="mr-2 h-4 w-4" /> Start Review
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
        <Button onClick={() => setSelectedSetId(null)} variant="outline" className="mt-4">
            Back to Decks
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <Button variant="ghost" size="sm" onClick={() => setSelectedSetId(null)} className="mb-2 -ml-2 text-muted-foreground">
             ← Back to Decks
           </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
             {selectedSetId === 'all' ? 'All Decks' : sets.find(s => s.id === selectedSetId)?.title || 'Flashcards'}
          </h2>
          <p className="text-muted-foreground">
            {dueQuestions.length - currentIndex} cards due for review
          </p>
        </div>
        <div className="text-sm font-medium px-4 py-1.5 bg-secondary/50 backdrop-blur-md border border-border/50 rounded-full shadow-sm">
          Streak: {currentIndex} / {dueQuestions.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center perspective-1000 min-h-[400px]">
        <div className="relative w-full max-w-xl aspect-[3/2] group">
          <motion.div
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="w-full h-full relative preserve-3d cursor-pointer shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-2xl"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={handleFlip}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-card border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="absolute top-6 left-6 text-xs font-semibold text-primary tracking-wider uppercase bg-primary/10 px-2 py-1 rounded">Question</span>
              <h3 className="text-2xl font-medium leading-relaxed">
                {currentQuestion.content}
              </h3>
              <p className="absolute bottom-6 text-sm text-muted-foreground flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <RotateCw size={14} /> Click to flip
              </p>
            </div>

            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden bg-card border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <span className="absolute top-6 left-6 text-xs font-semibold text-primary tracking-wider uppercase bg-primary/10 px-2 py-1 rounded">Answer</span>
              <div className="prose dark:prose-invert max-w-none w-full flex flex-col items-center">
                <p className="text-xl font-bold mb-4">
                  {Array.isArray(currentQuestion.answer) ? currentQuestion.answer.join(', ') : currentQuestion.answer}
                </p>
                
                {/* Options rendering removed as requested */}

                {currentQuestion.rationale && (
                  <div className="pt-4 border-t border-border/50 w-full mt-4">
                    <p className="text-sm text-muted-foreground italic">
                      {currentQuestion.rationale}
                    </p>
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
                <span className="text-[10px] text-center text-muted-foreground">1 min</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-orange-200 hover:bg-orange-100 hover:text-orange-700 dark:border-orange-900/30 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('hard'); }}
                >
                  Hard
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">2 days</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('good'); }}
                >
                  Good
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">4 days</span>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="outline"
                  className="border-green-200 hover:bg-green-100 hover:text-green-700 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                  onClick={(e) => { e.stopPropagation(); handleRate('easy'); }}
                >
                  Easy
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">7 days</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Flashcards;
