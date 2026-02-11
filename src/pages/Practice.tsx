import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, Question } from '../store/useStore';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, BookOpen, Target, Brain, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const Practice = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { sets, questions, addSession, userProfile } = useStore();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectQuestionIds, setIncorrectQuestionIds] = useState<string[]>([]);
  
  const currentSet = sets.find((s) => s.id === setId);
  
  const setQuestions = currentSet
    ? currentSet.questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is Question => !!q)
    : [];

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

  // Save session when results are shown
  useEffect(() => {
    if (showResults && currentSet) {
      addSession({
        setId: currentSet.id,
        date: Date.now(),
        score: score,
        totalQuestions: setQuestions.length,
        incorrectQuestionIds: incorrectQuestionIds
      });
    }
  }, [showResults]);

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
    
    // Check correctness
    const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
    
    // Exact match required
    const isCorrect = 
        selectedOptions.length === correctAnswers.length && 
        selectedOptions.every(opt => correctAnswers.includes(opt));
    
    // Update score
    if (isCorrect) {
        setScore(s => s + 1);
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

  // Calculate progress
  const progress = ((currentQuestionIndex) / setQuestions.length) * 100;

  if (showResults) {
    const percentage = Math.round((score / setQuestions.length) * 100);
    const incorrectQuestions = questions.filter(q => incorrectQuestionIds.includes(q.id));
    
    // Analyze tags for focus areas
    const missedTags = incorrectQuestions.flatMap(q => q.tags || []);
    const tagCounts = missedTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3); // Top 3 weak areas

    return (
        <div className="flex flex-col h-full overflow-y-auto pb-10">
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in zoom-in duration-300 p-4">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold">Session Complete!</h2>
                    <p className="text-muted-foreground">Here is your comprehensive performance analysis.</p>
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
                                            <h4 className="font-medium text-lg">{q.content}</h4>
                                            
                                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                                    <span className="text-green-600 font-semibold block mb-1">Correct Answer</span>
                                                    {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                                                </div>
                                            </div>

                                            {q.rationale && (
                                                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-sm">
                                                    <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                                                        <Brain size={16} />
                                                        <span>Rationale</span>
                                                    </div>
                                                    <p className="text-muted-foreground leading-relaxed">{q.rationale}</p>
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
                
                <div className="flex justify-center pt-8 pb-12">
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
    <div className="flex flex-col h-full max-w-4xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sets')} className="hover:bg-secondary/50 rounded-full h-10 w-10 p-0 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 mx-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Question {currentQuestionIndex + 1} of {setQuestions.length}</span>
                <span>{Math.round(progress)}% completed</span>
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

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
        >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm mb-6 min-h-[200px] flex flex-col items-center justify-center text-center">
                {currentQuestion.imageUrl && (
                    <div className="mb-6 w-full max-w-lg rounded-lg overflow-hidden shadow-lg">
                         <img 
                            src={currentQuestion.imageUrl} 
                            alt="Question Reference" 
                            className="w-full h-auto max-h-[400px] object-contain bg-black/5"
                        />
                    </div>
                )}
                <h2 className="text-2xl font-medium leading-relaxed">{currentQuestion.content}</h2>
            </div>

            {isMCQ ? (
                <div className="grid gap-4">
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
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between ${extraClasses}`}
                                disabled={isChecked}
                            >
                                <span className="font-medium text-lg">{option}</span>
                                {isChecked && isCorrectAnswer && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                                {isChecked && isSelected && !isCorrectAnswer && <XCircle className="h-6 w-6 text-red-500" />}
                            </motion.button>
                        );
                    })}
                </div>
            ) : (
                // Fallback for non-MCQ (Flashcard style but simplified)
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-2xl bg-secondary/10">
                    <p className="text-muted-foreground mb-4">This question has no options. Flip to see answer.</p>
                    {!isChecked ? (
                        <Button onClick={() => setIsChecked(true)}>Show Answer</Button>
                    ) : (
                        <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-xl font-bold mb-4">{Array.isArray(currentQuestion.answer) ? currentQuestion.answer.join(', ') : currentQuestion.answer}</p>
                            <div className="flex gap-4">
                                <Button variant="destructive" onClick={() => { setIncorrectQuestionIds(prev => [...prev, currentQuestion.id]); handleNext(); }}>I was wrong</Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setScore(s => s+1); handleNext(); }}>I was right</Button>
                            </div>
                        </div>
                    )}
                </div>
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
                                    {currentQuestion.rationale}
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