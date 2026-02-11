import React, { useState, useMemo } from 'react';
import { useStore, Question } from '../store/useStore';
import { Plus, Trash2, Search, FileText, Brain } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const Notes = () => {
  const { notes: allNotes, addNote, updateNote, deleteNote, addQuestion, sets: allSets, addQuestionToSet, addSet, activeProfileId } = useStore();
  
  const notes = useMemo(() => allNotes.filter(n => !n.profileId || n.profileId === activeProfileId), [allNotes, activeProfileId]);
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Flashcard Modal State
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [flashcardContent, setFlashcardContent] = useState({ question: '', answer: '' });
  const [targetSetId, setTargetSetId] = useState<string>('');
  const [newSetTitle, setNewSetTitle] = useState('');
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const filteredNotes = notes
    .filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreateNote = () => {
    const newNote = {
      title: 'Untitled Note',
      content: '',
    };
    const newId = addNote(newNote);
    setSelectedNoteId(newId);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNote(id);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
    }
  };

  const handleOpenFlashcardModal = () => {
    if (!selectedNote) return;
    
    // Simple heuristic: if there is a selection, use it as answer, else use whole content
    const selection = window.getSelection()?.toString();
    
    setFlashcardContent({
        question: selectedNote.title,
        answer: selection || selectedNote.content
    });
    setShowFlashcardModal(true);
  };

  const handleCreateFlashcard = () => {
    if (!flashcardContent.question || !flashcardContent.answer) return;

    const newQuestion: Omit<Question, 'id' | 'createdAt' | 'box' | 'nextReviewDate' | 'lastReviewed'> = {
        content: flashcardContent.question,
        answer: [flashcardContent.answer],
        rationale: `Created from note: ${selectedNote?.title}`,
        options: [],
        tags: ['from-notes'],
        imageUrl: undefined
    };

    const questionId = addQuestion(newQuestion);

    const finalSetId = targetSetId;

    if (isCreatingNewSet && newSetTitle) {
        // Create new set
        const newSet = {
            title: newSetTitle,
            description: 'Created from Notes',
            questionIds: [questionId]
        };
        addSet(newSet);
        alert('Flashcard created and added to new set!');
    } else if (finalSetId) {
        addQuestionToSet(finalSetId, questionId);
        alert('Flashcard created and added to set!');
    } else {
        alert('Flashcard created!');
    }

    setShowFlashcardModal(false);
    setFlashcardContent({ question: '', answer: '' });
  };

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar / Note List */}
      <div className="w-1/3 min-w-[250px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Notes</h2>
            <Button size="sm" onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-1" />
                New
            </Button>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
            />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredNotes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No notes found</p>
                </div>
            ) : (
                filteredNotes.map(note => (
                    <div
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/50 group ${
                            selectedNoteId === note.id 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'bg-card border-border hover:bg-secondary/30'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold truncate pr-2">{note.title}</h3>
                            <button 
                                onClick={(e) => handleDeleteNote(note.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                            {note.content || 'No content...'}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(note.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-card rounded-2xl border border-border flex flex-col overflow-hidden shadow-sm">
        {selectedNote ? (
            <>
                {/* Editor Toolbar */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10">
                    <div className="flex-1 mr-4">
                        <input
                            type="text"
                            value={selectedNote.title}
                            onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                            className="w-full bg-transparent text-xl font-bold focus:outline-none placeholder:text-muted-foreground/50"
                            placeholder="Note Title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleOpenFlashcardModal}>
                            <Brain className="h-4 w-4 mr-2" />
                            Make Flashcard
                        </Button>
                    </div>
                </div>

                {/* Editor Content */}
                <textarea
                    value={selectedNote.content}
                    onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
                    className="flex-1 p-6 bg-transparent resize-none focus:outline-none leading-relaxed text-lg"
                    placeholder="Start typing your note here..."
                />
                
                <div className="p-2 border-t text-xs text-muted-foreground text-right px-4">
                    {selectedNote.content.length} characters
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg">Select a note or create a new one</p>
            </div>
        )}
      </div>

      {/* Flashcard Creation Modal */}
      <Modal 
        isOpen={showFlashcardModal} 
        onClose={() => setShowFlashcardModal(false)}
        title="Create Flashcard from Note"
      >
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Question (Front)</label>
                <textarea
                    value={flashcardContent.question}
                    onChange={(e) => setFlashcardContent(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px]"
                    placeholder="Enter question..."
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Answer (Back)</label>
                <textarea
                    value={flashcardContent.answer}
                    onChange={(e) => setFlashcardContent(prev => ({ ...prev, answer: e.target.value }))}
                    className="w-full p-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[120px]"
                    placeholder="Enter answer..."
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Add to Set</label>
                <select 
                    value={targetSetId}
                    onChange={(e) => setTargetSetId(e.target.value)}
                    className="w-full p-2 rounded-lg border bg-background"
                    disabled={isCreatingNewSet}
                >
                    <option value="">Select a set...</option>
                    {sets.map(set => (
                        <option key={set.id} value={set.id}>{set.title}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        id="create-new-set"
                        checked={isCreatingNewSet} 
                        onChange={(e) => setIsCreatingNewSet(e.target.checked)}
                    />
                    <label htmlFor="create-new-set" className="text-sm">Create new set</label>
                </div>
                {isCreatingNewSet && (
                    <Input
                        placeholder="New Set Title"
                        value={newSetTitle}
                        onChange={(e) => setNewSetTitle(e.target.value)}
                    />
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowFlashcardModal(false)}>Cancel</Button>
                <Button onClick={handleCreateFlashcard}>Create Flashcard</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Notes;
