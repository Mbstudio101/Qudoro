import React, { useState, useMemo } from 'react';
import { useStore, Question } from '../store/useStore';
import { Plus, Trash2, Edit2, Search, Save, Check, ChevronDown, ChevronRight, Folder, List, CheckSquare, Square } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { motion } from 'framer-motion';

const Questions = () => {
  const { questions: allQuestions, sets: allSets, addQuestion, deleteQuestion, updateQuestion, addQuestionToSet, addSet, activeProfileId } = useStore();

  const questions = useMemo(() => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId), [allQuestions, activeProfileId]);
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isSetBuilderMode, setIsSetBuilderMode] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]); // Using any for simplicity in draft shape, but ideally typed
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [collapsedSets, setCollapsedSets] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    content: '',
    rationale: '',
    answer: [] as string[],
    options: [] as string[],
    tags: '',
  });

  const [setCreationData, setSetCreationData] = useState({
    title: '',
    description: '',
  });

  const filteredQuestions = questions.filter(
    (q) =>
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSetCollapse = (setId: string) => {
    setCollapsedSets(prev => ({ ...prev, [setId]: !prev[setId] }));
  };

  // Group questions by set
  const questionsBySet = sets.map(set => ({
    ...set,
    questions: questions.filter(q => set.questionIds.includes(q.id))
      .filter(q => 
        !searchQuery || 
        q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  })).filter(group => group.questions.length > 0 || !searchQuery); // Show empty sets only when not searching

  // Find unassigned questions (or questions not in any of the displayed sets)
  // Actually, unassigned means questions that are NOT in any set at all.
  const assignedQuestionIds = new Set(sets.flatMap(s => s.questionIds));
  const unassignedQuestions = filteredQuestions.filter(q => !assignedQuestionIds.has(q.id));

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) 
        ? prev.filter(qId => qId !== id)
        : [...prev, id]
    );
  };

  const handleSaveSetClick = () => {
    setIsSetModalOpen(true);
  };

  const handleConfirmSaveSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0) return;

    addSet({
        title: setCreationData.title,
        description: setCreationData.description,
        questionIds: selectedQuestionIds
    });

    // Reset selection and close modal
    setSelectedQuestionIds([]);
    setSetCreationData({ title: '', description: '' });
    setIsSetModalOpen(false);
  };


  const handleOpenSetBuilder = () => {
    setIsSetBuilderMode(true);
    setEditingQuestion(null);
    setFormData({ content: '', rationale: '', answer: [], options: [], tags: '' });
    setSetCreationData({ title: '', description: '' });
    setDraftQuestions([]);
    setIsModalOpen(true);
  };

  const handleOpenModal = (question?: Question) => {
    setIsSetBuilderMode(false);
    if (question) {
      setEditingQuestion(question);
      setFormData({
        content: question.content,
        rationale: question.rationale,
        answer: Array.isArray(question.answer) ? question.answer : [question.answer],
        options: question.options || [],
        tags: question.tags.join(', '),
      });
      setSelectedSetId('');
    } else {
      setEditingQuestion(null);
      setFormData({ content: '', rationale: '', answer: [], options: [], tags: '' });
      // Keep selectedSetId if it was set previously
    }
    setIsModalOpen(true);
  };

  const handleSetBuilderFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setCreationData.title) {
        alert("Please enter a set title");
        return;
    }

    const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanOptions = formData.options.map(o => o.trim()).filter(Boolean);
    
    // Prepare the final list of questions
    // Include the one currently in the form if it has content
    const finalQuestions = [...draftQuestions];
    if (formData.content) {
        finalQuestions.push({
            ...formData,
            options: cleanOptions,
            tags: tagsArray
        });
    }

    if (finalQuestions.length === 0) {
        alert("Please add at least one question to the set.");
        return;
    }

    // 1. Create all questions
    const newQuestionIds = finalQuestions.map(q => addQuestion(q));

    // 2. Create the set
    addSet({
        title: setCreationData.title,
        description: setCreationData.description,
        questionIds: newQuestionIds
    });

    setIsModalOpen(false);
    setIsSetBuilderMode(false);
    setDraftQuestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isSetBuilderMode) {
        handleSetBuilderFinish(e);
        return;
    }
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanOptions = formData.options.map(o => o.trim()).filter(Boolean);

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, {
        ...formData,
        options: cleanOptions,
        tags: tagsArray,
      });
      setIsModalOpen(false);
    } else {
      const newId = addQuestion({
        ...formData,
        options: cleanOptions,
        tags: tagsArray,
      });
      
      if (selectedSetId) {
        addQuestionToSet(selectedSetId, newId);
      }

      setIsModalOpen(false);
    }
  };

  const handleSaveAndAddAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanOptions = formData.options.map(o => o.trim()).filter(Boolean);

    if (isSetBuilderMode) {
        if (!formData.content) {
            alert("Question content is required");
            return;
        }
        
        setDraftQuestions(prev => [...prev, {
            ...formData,
            options: cleanOptions,
            tags: tagsArray
        }]);

        // Reset form
        setFormData({
            content: '',
            rationale: '',
            answer: [],
            options: [],
            tags: formData.tags
        });
        
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
        return;
    }

    const newId = addQuestion({
        ...formData,
        options: cleanOptions,
        tags: tagsArray,
    });

    if (selectedSetId) {
        addQuestionToSet(selectedSetId, newId);
    }
    
    // Reset form
    setFormData({
        content: '',
        rationale: '',
        answer: [],
        options: [],
        tags: formData.tags // Keep tags for convenience
    });
    // Keep selectedSetId for the next question
    
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const optionPatterns = [
        /^[A-E]\.\s+/,       // A. Option
        /^[a-e]\)\s+/,       // a) Option
        /^[0-9]+\.\s+/,      // 1. Option
        /^[•\-*]\s+/,      // Bullet points
        /^\[\s*\]\s+/        // [ ] Checkbox
    ];

    const questionLines: string[] = [];
    const options: string[] = [];
    let foundOptions = false;

    for (const line of lines) {
        const pattern = optionPatterns.find(p => p.test(line));
        if (pattern) {
            foundOptions = true;
            const cleanLine = line.replace(pattern, '').trim();
            options.push(cleanLine);
        } else if (foundOptions) {
             // If we already found options, assume subsequent lines are options
             // unless they are empty (filtered out)
             options.push(line);
        } else {
            questionLines.push(line);
        }
    }

    if (options.length === 0) {
        // Fallback: Check if the last few lines are short, might be options without prefixes?
        // For now, just paste as content
        const startPos = e.currentTarget.selectionStart;
        const endPos = e.currentTarget.selectionEnd;
        const currentVal = formData.content;
        const newVal = currentVal.substring(0, startPos) + text + currentVal.substring(endPos);
        setFormData(prev => ({ ...prev, content: newVal }));
        return;
    }

    setFormData(prev => ({
        ...prev,
        content: questionLines.join('\n'),
        options: options
    }));
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    const optionToRemove = formData.options[index];
    setFormData(prev => ({ 
        ...prev, 
        options: prev.options.filter((_, i) => i !== index),
        answer: prev.answer.filter(a => a !== optionToRemove)
    }));
  };

  const updateOption = (index: number, value: string) => {
    const oldOption = formData.options[index];
    const newOptions = [...formData.options];
    newOptions[index] = value;
    
    // Update answer if the option was selected as correct
    let newAnswers = [...formData.answer];
    if (newAnswers.includes(oldOption)) {
        newAnswers = newAnswers.map(a => a === oldOption ? value : a);
    }
    
    setFormData(prev => ({ ...prev, options: newOptions, answer: newAnswers }));
  };

  const toggleCorrectAnswer = (option: string) => {
    if (!option) return;
    setFormData(prev => {
        const isSelected = prev.answer.includes(option);
        if (isSelected) {
            return { ...prev, answer: prev.answer.filter(a => a !== option) };
        } else {
            return { ...prev, answer: [...prev.answer, option] };
        }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Question Bank
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your study materials and organize them into sets.
          </p>
        </div>
        <div className="flex gap-3">
            {selectedQuestionIds.length > 0 && (
                <Button onClick={handleSaveSetClick} variant="secondary" className="animate-in fade-in slide-in-from-right-4">
                    <Save className="mr-2 h-4 w-4" /> Save Set ({selectedQuestionIds.length})
                </Button>
            )}
            <Button onClick={handleOpenSetBuilder} variant="outline" className="hidden sm:flex">
                <Plus className="mr-2 h-4 w-4" /> Create Set
            </Button>
            <Button onClick={() => handleOpenModal()} className="shadow-lg hover:shadow-primary/25 transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-card/30 p-1 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            className="pl-10 border-none bg-transparent focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {questionsBySet.map((set) => {
            const isCollapsed = collapsedSets[set.id];
            return (
                <div key={set.id} className="space-y-4">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group select-none"
                        onClick={() => toggleSetCollapse(set.id)}
                    >
                        <div className="p-1 rounded-md hover:bg-muted transition-colors">
                            {isCollapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <Folder className="h-5 w-5 text-primary" />
                            <h3 className="text-xl font-semibold">{set.title}</h3>
                            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {set.questions.length}
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-border/50 ml-4" />
                    </div>

                    {!isCollapsed && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-0 md:pl-4">
                            {set.questions.map((question) => {
                                const isSelected = selectedQuestionIds.includes(question.id);
                                return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={`${set.id}-${question.id}`} // Use composite key to avoid duplicates issues if in multiple sets
                                    className={`group relative rounded-2xl border ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/50 bg-card/50'} backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between cursor-pointer`}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        toggleQuestionSelection(question.id);
                                    }}
                                >
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50 bg-background/50'}`}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>
                                    <div>
                                    <div className="mb-4 pr-6">
                                        <h3 className="font-semibold line-clamp-3 mb-2">{question.content}</h3>
                                        {question.imageUrl && (
                                            <div className="mb-2 relative rounded-md overflow-hidden bg-muted/20 h-32 w-full">
                                                <img 
                                                    src={question.imageUrl} 
                                                    alt="Question Reference" 
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                        <span className="font-medium text-foreground">Answer: </span>
                                        {Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
                                    </div>
                                    </div>
                                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(question)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteQuestion(question.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </motion.div>
                                )
                            })}
                            {set.questions.length === 0 && (
                                <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                                    No questions in this set match your search.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        })}

        {/* Unassigned Questions Section */}
        {unassignedQuestions.length > 0 && (
            <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="p-1">
                        <List className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-muted-foreground">Unassigned Questions</h3>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {unassignedQuestions.length}
                    </span>
                    <div className="flex-1 h-px bg-border/50 ml-4" />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-0 md:pl-4">
                    {unassignedQuestions.map((question) => {
                        const isSelected = selectedQuestionIds.includes(question.id);
                        return (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={question.id}
                            className={`group relative rounded-2xl border ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/50 bg-card/50'} backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between cursor-pointer`}
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                toggleQuestionSelection(question.id);
                            }}
                        >
                            <div className="absolute top-4 right-4 z-10">
                                <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50 bg-background/50'}`}>
                                    {isSelected && <Check className="h-3 w-3" />}
                                </div>
                            </div>
                            <div>
                            <div className="mb-4 pr-6">
                                <h3 className="font-semibold line-clamp-3 mb-2">{question.content}</h3>
                                {question.imageUrl && (
                                    <div className="mb-2 relative rounded-md overflow-hidden bg-muted/20 h-32 w-full">
                                        <img 
                                            src={question.imageUrl} 
                                            alt="Question Reference" 
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                <span className="font-medium text-foreground">Answer: </span>
                                {Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
                            </div>
                            </div>
                            <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(question)}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteQuestion(question.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                        </motion.div>
                        )
                    })}
                </div>
            </div>
        )}

        {questionsBySet.length === 0 && unassignedQuestions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No questions found.</p>
          </div>
        )}
      </div>

      {/* Set Creation Modal */}
      <Modal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        title="Save Selected Questions as Set"
      >
        <form onSubmit={handleConfirmSaveSet} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Set Title</label>
                <Input
                    required
                    placeholder="e.g., Biology Chapter 1 Review"
                    value={setCreationData.title}
                    onChange={(e) => setSetCreationData({ ...setCreationData, title: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Description (Optional)</label>
                <Textarea
                    placeholder="Brief description of this question set..."
                    value={setCreationData.description}
                    onChange={(e) => setSetCreationData({ ...setCreationData, description: e.target.value })}
                />
            </div>
            <div className="pt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                    {selectedQuestionIds.length} questions selected
                </span>
                <Button type="submit">
                    Save Set
                </Button>
            </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isSetBuilderMode ? 'Create New Exam Set' : (editingQuestion ? 'Edit Question' : 'New Question')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSetBuilderMode && (
            <div className="bg-secondary/20 p-4 rounded-lg border border-border/50 space-y-4 mb-6">
                <div className="flex justify-between items-center">
                     <h3 className="font-semibold text-primary">Set Details</h3>
                     <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                        {draftQuestions.length} Added
                     </span>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Set Title</label>
                    <Input
                        required={isSetBuilderMode}
                        placeholder="e.g. Biology Final Review"
                        value={setCreationData.title}
                        onChange={(e) => setSetCreationData({ ...setCreationData, title: e.target.value })}
                    />
                </div>
                <div className="h-px bg-border/50 my-2" />
                <h3 className="font-semibold text-sm">Add Question {draftQuestions.length + 1}</h3>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Question
            </label>
            <Textarea
              required
              placeholder="What is the capital of France? (Paste formatted question here to auto-fill)"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              onPaste={handlePaste}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">
                Distractors / Options
                </label>
                <span className="text-xs text-muted-foreground">Check the correct answer(s)</span>
            </div>
            <div className="space-y-2">
                {formData.options.map((option, index) => {
                    const isCorrect = formData.answer.includes(option);
                    return (
                        <div key={index} className="flex gap-2 items-center">
                            <button
                                type="button"
                                onClick={() => toggleCorrectAnswer(option)}
                                className={`p-1 rounded-md transition-colors ${isCorrect ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                                title={isCorrect ? "Marked as correct" : "Mark as correct"}
                            >
                                {isCorrect ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                            </button>
                            <Input
                                value={option}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className={isCorrect ? "border-green-500/50 bg-green-500/5 focus-visible:ring-green-500" : ""}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(index)} className="text-destructive px-2">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                })}
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Leaving options empty will create a standard flashcard.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Rationale / Explanation
            </label>
            <Textarea
              placeholder="Explain why this answer is correct..."
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
            />
          </div>
          {!isSetBuilderMode && (
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Add to Set (Optional)
            </label>
            <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
            >
                <option value="">None (Question Bank only)</option>
                {sets.map((set) => (
                    <option key={set.id} value={set.id}>
                        {set.title}
                    </option>
                ))}
            </select>
          </div>
          )}
          <div className="flex justify-end pt-4 gap-2">
            {!editingQuestion && (
                <Button type="button" variant="outline" onClick={handleSaveAndAddAnother}>
                    {isSetBuilderMode ? 'Save & Add More' : 'Save & Add Another'}
                </Button>
            )}
            <Button type="submit">
              {isSetBuilderMode ? 'Save Set' : (editingQuestion ? 'Save Changes' : 'Create Question')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Questions;
