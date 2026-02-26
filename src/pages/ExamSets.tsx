import React, { useState, useMemo } from 'react';
import { useStore, ExamSet } from '../store/useStore';
import { Trash2, Edit2, Play, Layers, Zap, Brain, Clock3 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CARD_GRADIENT_OPTIONS, getCardGradientClasses } from '../utils/cardGradients';

const ExamSets = () => {
  const navigate = useNavigate();
  const { sets: allSets, questions: allQuestions, deleteSet, updateSet, activeProfileId } = useStore();
  
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExamSet | null>(null);
  
  // Study Mode Selection State
  const [selectedSetForExam, setSelectedSetForExam] = useState<ExamSet | null>(null);
  const [isStudyModeModalOpen, setIsStudyModeModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cardGradient: 'default',
    questionIds: [] as string[],
  });

  const handleOpenModal = (set: ExamSet) => {
    setEditingSet(set);
    setFormData({
      title: set.title,
      description: set.description,
      cardGradient: set.cardGradient || 'default',
      questionIds: set.questionIds,
    });
    setIsModalOpen(true);
  };

  const handleStartExamClick = (set: ExamSet) => {
    setSelectedSetForExam(set);
    setIsStudyModeModalOpen(true);
  };

  const handleStartExam = (mode: 'cram' | 'memorize') => {
    if (selectedSetForExam) {
      navigate(`/practice/${selectedSetForExam.id}?mode=${mode}`);
      setIsStudyModeModalOpen(false);
      setSelectedSetForExam(null);
    }
  };

  const handleStartTimedExam = (minutes: number) => {
    if (selectedSetForExam) {
      navigate(`/practice/${selectedSetForExam.id}?mode=timed&minutes=${minutes}`);
      setIsStudyModeModalOpen(false);
      setSelectedSetForExam(null);
    }
  };

  const handleDeleteSet = (set: ExamSet) => {
    const msg =
      `Are you sure you want to delete "${set.title}"?\n\n` +
      `This will permanently delete the set and all ${set.questionIds.length} question(s) inside it. This cannot be undone.`;
    if (window.confirm(msg)) {
      deleteSet(set.id);
    }
  };

  const handleQuickColorChange = (setId: string, cardGradient: string) => {
    updateSet(setId, { cardGradient });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSet) {
      updateSet(editingSet.id, formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Exams</h2>
          <p className="text-muted-foreground">Select an exam set to begin your practice session.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={set.id}
            className={`group relative rounded-2xl border backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${getCardGradientClasses(set.cardGradient)}`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{set.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {set.description || 'No description'}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium">{set.questionIds.length} Questions</span>
                {(() => {
                  const setQs = allQuestions.filter(q => set.questionIds.includes(q.id));
                  const mastered = setQs.filter(q => (q.box || 0) >= 5).length;
                  const pct = setQs.length > 0 ? Math.round((mastered / setQs.length) * 100) : 0;
                  return (
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Mastery</span>
                        <span className={pct === 100 ? 'text-green-500 font-semibold' : ''}>{mastered}/{setQs.length} {pct === 100 ? '✓' : `${pct}%`}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                             style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Card Color</label>
                <select
                  value={set.cardGradient || 'default'}
                  onChange={(e) => handleQuickColorChange(set.id, e.target.value)}
                  className="h-8 w-full rounded-md border border-input/70 bg-background/80 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CARD_GRADIENT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
               <Button 
                size="sm" 
                className="flex-1 mr-2"
                onClick={() => handleStartExamClick(set)}
               >
                  <Play className="mr-2 h-4 w-4" /> Start Exam
               </Button>
               <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(set)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteSet(set)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
        {sets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No exams found. Create one in the Question Bank.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Exam Set"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] flex flex-col">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Title</label>
            <Input
              required
              placeholder="Biology 101"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Description</label>
            <Textarea
              placeholder="Midterm review..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Card Color</label>
            <select
              value={formData.cardGradient}
              onChange={(e) => setFormData({ ...formData, cardGradient: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CARD_GRADIENT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Study Mode Selection Modal */}
      <Modal
        isOpen={isStudyModeModalOpen}
        onClose={() => setIsStudyModeModalOpen(false)}
        title="Choose a goal for this session"
      >
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => handleStartExam('cram')}
                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-center space-y-4"
                >
                    <div className="p-4 rounded-full bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                        <Zap className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Cram for a test</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Randomized rapid-fire questions to test your readiness.
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => handleStartExam('memorize')}
                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-center space-y-4"
                >
                    <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <Brain className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Memorize it all</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Systematic review of all questions to ensure mastery.
                        </p>
                    </div>
                </button>
            </div>
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Timed Exam</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[30, 60, 90].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => handleStartTimedExam(minutes)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium"
                  >
                    <Clock3 className="h-4 w-4 text-primary" />
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamSets;
