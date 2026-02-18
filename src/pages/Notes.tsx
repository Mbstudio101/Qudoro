import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, Question } from '../store/useStore';
import {
  Plus,
  Trash2,
  Search,
  FileText,
  Brain,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Eraser,
  Link as LinkIcon,
} from 'lucide-react';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const loadedNoteIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('3');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [timeTick, setTimeTick] = useState(0);

  const selectedNote = notes.find(n => n.id === selectedNoteId);
  const stripHtml = (content: string) => content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const isLikelyHtml = (content: string) => /<\/?[a-z][\s\S]*>/i.test(content);
  const escapeHtml = (content: string) =>
    content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const toEditableHtml = (content: string) => {
    if (!content) return '';
    if (isLikelyHtml(content)) return content;
    return escapeHtml(content).replace(/\n/g, '<br>');
  };

  const markAutosaved = () => {
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
    }, 300);
  };

  const saveNoteUpdate = (noteId: string, update: { title?: string; content?: string }) => {
    updateNote(noteId, update);
    markAutosaved();
  };

  const getSaveLabel = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (!lastSavedAt) return 'Saved';
    const seconds = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
    if (seconds < 10) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saved ${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `Saved ${days}d ago`;

    return `Saved ${new Date(lastSavedAt).toLocaleDateString()}`;
  };

  const applyCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    const html = editorRef.current.innerHTML;
    const plain = editorRef.current.innerText || '';
    if (selectedNote) {
      saveNoteUpdate(selectedNote.id, { content: html });
      setCharacterCount(plain.length);
    }
  };

  const handleEditorInput = () => {
    if (!selectedNote || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const plain = editorRef.current.innerText || '';
    saveNoteUpdate(selectedNote.id, { content: html });
    setCharacterCount(plain.length);
  };

  useEffect(() => {
    if (!selectedNote || !editorRef.current) return;
    if (loadedNoteIdRef.current === selectedNote.id) return;

    editorRef.current.innerHTML = toEditableHtml(selectedNote.content);
    setCharacterCount((editorRef.current.innerText || '').length);
    loadedNoteIdRef.current = selectedNote.id;
  }, [selectedNote]);

  useEffect(() => {
    if (!selectedNote) {
      loadedNoteIdRef.current = null;
      setCharacterCount(0);
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [selectedNote]);

  useEffect(() => {
    if (!selectedNote) return;
    setSaveStatus('saved');
    setLastSavedAt(selectedNote.updatedAt);
  }, [selectedNote?.id, selectedNote?.updatedAt]);

  useEffect(() => {
    const interval = window.setInterval(() => setTimeTick((prev) => prev + 1), 15000);
    return () => {
      window.clearInterval(interval);
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const filteredNotes = notes
    .filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      stripHtml(note.content).toLowerCase().includes(searchQuery.toLowerCase())
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
        answer: selection || stripHtml(selectedNote.content)
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
                            {stripHtml(note.content) || 'No content...'}
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
                <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10 gap-4">
                    <div className="flex-1 mr-4">
                        <input
                            type="text"
                            value={selectedNote.title}
                            onChange={(e) => saveNoteUpdate(selectedNote.id, { title: e.target.value })}
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

                <div className="px-4 py-3 border-b border-border bg-background flex items-center gap-2 flex-wrap">
                    <select
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value);
                          applyCommand('fontName', e.target.value);
                        }}
                        className="h-8 rounded-md border bg-card px-2 text-xs"
                    >
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                    </select>
                    <select
                        value={fontSize}
                        onChange={(e) => {
                          setFontSize(e.target.value);
                          applyCommand('fontSize', e.target.value);
                        }}
                        className="h-8 rounded-md border bg-card px-2 text-xs w-20"
                    >
                        <option value="2">10</option>
                        <option value="3">12</option>
                        <option value="4">14</option>
                        <option value="5">18</option>
                        <option value="6">24</option>
                        <option value="7">32</option>
                    </select>
                    <div className="h-5 w-px bg-border mx-1" />
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('strikeThrough')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
                    <div className="h-5 w-px bg-border mx-1" />
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('formatBlock', 'H1')} title="Heading 1">H1</Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('formatBlock', 'H2')} title="Heading 2">H2</Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('formatBlock', 'BLOCKQUOTE')} title="Quote"><Quote className="h-4 w-4" /></Button>
                    <div className="h-5 w-px bg-border mx-1" />
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('insertUnorderedList')} title="Bulleted List"><List className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('insertOrderedList')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
                    <div className="h-5 w-px bg-border mx-1" />
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
                    <div className="h-5 w-px bg-border mx-1" />
                    <input
                        type="color"
                        title="Text Color"
                        className="h-8 w-8 rounded border bg-card p-0.5"
                        onChange={(e) => applyCommand('foreColor', e.target.value)}
                    />
                    <input
                        type="color"
                        title="Highlight"
                        className="h-8 w-8 rounded border bg-card p-0.5"
                        onChange={(e) => applyCommand('hiliteColor', e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = window.prompt('Enter URL');
                          if (url) applyCommand('createLink', url);
                        }}
                        title="Insert Link"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('removeFormat')} title="Clear Formatting"><Eraser className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('undo')} title="Undo"><Undo2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => applyCommand('redo')} title="Redo"><Redo2 className="h-4 w-4" /></Button>
                </div>

                <div className="flex-1 overflow-y-auto bg-secondary/5 p-8">
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleEditorInput}
                        className="mx-auto min-h-[700px] w-full max-w-[860px] rounded-md border bg-white p-10 text-[17px] leading-8 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        style={{ fontFamily }}
                        data-placeholder="Start typing your note here..."
                    />
                </div>
                
                <div className="p-2 border-t text-xs text-muted-foreground px-4 flex items-center justify-between">
                    <span key={timeTick}>{getSaveLabel()}</span>
                    <span>{characterCount} characters</span>
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
