import React, { useState } from 'react';
import { useStore, ExamSet } from '../store/useStore';
import { Trash2, Edit2, Play, Layers } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ExamSets = () => {
  const { sets, deleteSet, updateSet } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ExamSet | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questionIds: [] as string[],
  });

  const handleOpenModal = (set: ExamSet) => {
    setEditingSet(set);
    setFormData({
      title: set.title,
      description: set.description,
      questionIds: set.questionIds,
    });
    setIsModalOpen(true);
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
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Exams</h2>
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
            className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
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
              <div className="mt-4">
                <span className="text-sm font-medium">{set.questionIds.length} Questions</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
               <Link to={`/practice/${set.id}`} className="flex-1 mr-2">
                <Button size="sm" className="w-full">
                  <Play className="mr-2 h-4 w-4" /> Start Exam
                </Button>
              </Link>
               <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(set)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteSet(set.id)}
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
          
          <div className="flex justify-end pt-4">
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExamSets;
