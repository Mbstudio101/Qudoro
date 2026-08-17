import React, { useState, useMemo, useEffect } from 'react';
import { useStore, Question } from '../store/useStore';
import { Plus, Trash2, Edit2, Search, Save, Check, ChevronLeft, Folder, List, CheckSquare, Square, Layers, ImagePlus, X, GripVertical, Eye, Stethoscope } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import RichText from '../components/ui/RichText';
import { motion } from 'framer-motion';
import { classifyQuestion } from '../utils/nursingConstants';
import { validateItem } from '../utils/itemValidation';
import { isAnswerMatch, alignAnswersToOptions, normalizeAnswerText } from '../utils/answerMatch';
import { CARD_GRADIENT_OPTIONS, getCardGradientClasses } from '../utils/cardGradients';
import { cleanMcqText, parseLabeledMcq } from '../utils/mcqParser';
import { draftKey as makeDraftKey } from '../utils/storageKeys';
import NgnStylePicker, { StyleChoice } from '../components/ngn/NgnStylePicker';
import NgnEditor from '../components/ngn/NgnEditor';
import NgnPlayer from '../components/ngn/NgnPlayer';
import EhrChartEditor from '../components/ngn/EhrChartEditor';
import EhrChartViewer from '../components/ngn/EhrChartViewer';
import {
  NgnItem,
  NgnResponse,
  EhrChart,
  createNgnItem,
  createEhrChart,
  createEmptyResponse,
  ngnKindMeta,
} from '../types/ngn';
import { validateNgnItem, summarizeNgnAnswer } from '../utils/ngnGrading';

/** Small format tag shown on a question card for NGN items / attached charts. */
const QuestionFormatBadge = ({ question }: { question: Question }) => {
  if (!question.ngn && !question.ehr) return null;
  const meta = question.ngn ? ngnKindMeta(question.ngn.kind) : null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {meta && (
        <span
          className={`inline-flex items-center rounded-full bg-linear-to-r ${meta.gradient} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white`}
        >
          {meta.name}
        </span>
      )}
      {question.ehr && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Stethoscope className="h-3 w-3" /> EHR
        </span>
      )}
    </div>
  );
};

const Questions = () => {
  const {
    questions: allQuestions,
    sets: allSets,
    addQuestion,
    findDuplicateQuestion,
    deleteQuestion,
    updateQuestion,
    addQuestionToSet,
    addSet,
    updateSet,
    deleteSet,
    activeProfileId,
  } = useStore();

  const questions = useMemo(() => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId), [allQuestions, activeProfileId]);
  const sets = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isEditSetModalOpen, setIsEditSetModalOpen] = useState(false);
  const [isSetBuilderMode, setIsSetBuilderMode] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string>('');
  
  // Type for draft questions in Set Builder Mode
  type DraftQuestion = {
      content: string;
      rationale: string;
      answer: string[];
      options: string[];
      tags: string[];
      domain?: string;
      questionStyle?: string;
      ngn?: NgnItem;
      ehr?: EhrChart;
  };

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [activeSetViewId, setActiveSetViewId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    content: '',
    rationale: '',
    answer: [] as string[],
    options: [] as string[],
    tags: '',
    imageUrl: '', // New field for image
  });

  const [setCreationData, setSetCreationData] = useState({
    title: '',
    description: '',
    cardGradient: 'default',
  });

  // ── NGN authoring state ───────────────────────────────────────────────────
  // `ngnItem === null` means the question is a classic flashcard/MCQ, which is
  // the default and leaves every existing code path untouched.
  const [ngnItem, setNgnItem] = useState<NgnItem | null>(null);
  const [ehrChart, setEhrChart] = useState<EhrChart>(() => createEhrChart());
  const [showNgnPreview, setShowNgnPreview] = useState(false);
  const [previewResponse, setPreviewResponse] = useState<NgnResponse | null>(null);

  const resetNgnState = () => {
    setNgnItem(null);
    setEhrChart(createEhrChart());
    setShowNgnPreview(false);
    setPreviewResponse(null);
  };

  const handleStyleChange = (choice: StyleChoice) => {
    setShowNgnPreview(false);
    setPreviewResponse(null);
    if (choice === null) {
      setNgnItem(null);
      return;
    }
    if (ngnItem?.kind === choice) return;
    setNgnItem(createNgnItem(choice));
  };

  const togglePreview = () => {
    if (!ngnItem) return;
    if (showNgnPreview) {
      setShowNgnPreview(false);
      return;
    }
    setPreviewResponse(createEmptyResponse(ngnItem));
    setShowNgnPreview(true);
  };

  /**
   * Blocks saving an NGN item that isn't answerable yet. Classic questions skip
   * this entirely, so nothing about the old flow changes.
   */
  const ngnBlocksSave = (): boolean => {
    if (!ngnItem) return false;
    const problems = validateNgnItem(ngnItem);
    if (problems.length === 0) return false;
    alert(`This ${ngnKindMeta(ngnItem.kind).name} question isn't ready yet:\n\n• ${problems.join('\n• ')}`);
    return true;
  };

  // Drag-to-reorder state for the answer options list. `dragHandleActive` is a
  // ref so the mousedown on the grip enables dragging synchronously, before the
  // browser decides whether the row's dragstart is allowed.
  const dragHandleActive = React.useRef(false);
  const [dragOptionIndex, setDragOptionIndex] = useState<number | null>(null);
  const [dragOverOptionIndex, setDragOverOptionIndex] = useState<number | null>(null);

  // ── Draft auto-save ───────────────────────────────────────────────────────
  // Key is profile-scoped so switching profiles never shows the wrong draft.
  const draftKey = makeDraftKey(activeProfileId || 'default');

  type SetBuilderDraft = {
    draftQuestions: DraftQuestion[];
    formData: { content: string; rationale: string; answer: string[]; options: string[]; tags: string; imageUrl: string };
    setCreationData: { title: string; description: string; cardGradient: string };
    ngnItem?: NgnItem | null;
    ehrChart?: EhrChart;
    savedAt: number;
  };

  const [savedDraft, setSavedDraft] = useState<SetBuilderDraft | null>(null);

  // Load any existing draft when the page (or active profile) loads
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed: SetBuilderDraft = JSON.parse(raw);
      const count =
        (parsed.draftQuestions?.length || 0) + (parsed.formData?.content ? 1 : 0);
      if (count > 0) {
        setSavedDraft(parsed);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Auto-save the set builder state whenever something changes
  useEffect(() => {
    if (!isSetBuilderMode || !isModalOpen) return;
    const totalCount = draftQuestions.length + (formData.content.trim() ? 1 : 0);
    if (totalCount === 0 && !setCreationData.title) return; // nothing worth saving yet
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ draftQuestions, formData, setCreationData, ngnItem, ehrChart, savedAt: Date.now() }),
      );
    } catch {
      // Storage quota — silent fail
    }
  }, [draftQuestions, formData, setCreationData, ngnItem, ehrChart, isSetBuilderMode, isModalOpen, draftKey]);
  const [setEditData, setSetEditData] = useState({
    title: '',
    description: '',
    cardGradient: 'default',
  });

  const filteredQuestions = questions.filter(
    (q) =>
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
  const activeSet = activeSetViewId ? sets.find((set) => set.id === activeSetViewId) || null : null;
  const activeSetQuestions = useMemo(() => {
    if (!activeSet) return [];
    return questions
      .filter((q) => activeSet.questionIds.includes(q.id))
      .filter(
        (q) =>
          !searchQuery ||
          q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
      );
  }, [activeSet, questions, searchQuery]);

  const cleanOptionText = (value: string): string => cleanMcqText(value);

  const parseInlinePackedOptions = (text: string): { stem: string; options: string[] } | null => {
    const parsed = parseLabeledMcq(text, { allowMissingStem: true });
    if (!parsed) return null;
    return { stem: parsed.stem || '', options: parsed.options };
  };

  const extractOptionsFromBlock = (text: string): string[] => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const optionPrefixRegex =
      /^(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-]|[•\-*])\s*(.+)$/;
    const prefixed = lines
      .map((line) => line.match(optionPrefixRegex))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => cleanOptionText(m[4]));

    if (prefixed.length >= 2) {
      return prefixed.filter(Boolean);
    }

    const packed = parseInlinePackedOptions(text);
    if (packed && packed.options.length >= 2) {
      return packed.options;
    }

    if (lines.length >= 2) {
      return lines.map(cleanOptionText).filter(Boolean);
    }

    return [];
  };

  const parseQuestionAndOptions = (text: string): { content: string; options: string[] } | null => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const optionPrefixRegex =
      /^(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-]|[•\-*])\s*(.+)$/;

    const questionLines: string[] = [];
    const optionLines: string[] = [];
    let foundOptions = false;

    for (const line of lines) {
      const match = line.match(optionPrefixRegex);
      if (match) {
        foundOptions = true;
        optionLines.push(cleanOptionText(match[4]));
      } else if (foundOptions) {
        optionLines.push(cleanOptionText(line));
      } else {
        questionLines.push(line);
      }
    }

    const optionCandidates = optionLines.filter(Boolean);
    if (optionCandidates.length >= 2 && questionLines.length > 0) {
      return { content: questionLines.join('\n'), options: optionCandidates };
    }

    const packed = parseInlinePackedOptions(text);
    if (packed && packed.options.length >= 2) {
      return { content: packed.stem, options: packed.options };
    }

    return null;
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) 
        ? prev.filter(qId => qId !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSet = (setId: string, title: string) => {
    const set = sets.find((s) => s.id === setId);
    const count = set?.questionIds.length ?? 0;
    const msg =
      `Are you sure you want to delete "${title}"?\n\n` +
      `This will permanently delete the set and all ${count} question(s) inside it. This cannot be undone.`;
    if (window.confirm(msg)) {
      deleteSet(setId);
    }
  };

  const handleAddQuestionToSet = (setId: string) => {
    setSelectedSetId(setId);
    handleOpenModal();
  };

  const handleOpenEditSet = (setId: string) => {
    const setToEdit = sets.find((s) => s.id === setId);
    if (!setToEdit) return;
    setEditingSetId(setId);
    setSetEditData({
      title: setToEdit.title,
      description: setToEdit.description || '',
      cardGradient: setToEdit.cardGradient || 'default',
    });
    setIsEditSetModalOpen(true);
  };

  const handleUpdateSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetId || !setEditData.title.trim()) return;
    updateSet(editingSetId, {
      title: setEditData.title.trim(),
      description: setEditData.description.trim(),
      cardGradient: setEditData.cardGradient || 'default',
    });
    setIsEditSetModalOpen(false);
    setEditingSetId('');
  };

  const handleDeleteAllUnassigned = () => {
    if (window.confirm(`Are you sure you want to delete ALL ${unassignedQuestions.length} unassigned questions? This action cannot be undone.`)) {
        unassignedQuestions.forEach(q => deleteQuestion(q.id));
    }
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
        cardGradient: setCreationData.cardGradient || 'default',
        questionIds: selectedQuestionIds
    });

    // Reset selection and close modal
    setSelectedQuestionIds([]);
    setSetCreationData({ title: '', description: '', cardGradient: 'default' });
    setIsSetModalOpen(false);
  };


  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setSavedDraft(null);
  };

  const handleRestoreDraft = () => {
    if (!savedDraft) return;
    setIsSetBuilderMode(true);
    setEditingQuestion(null);
    setDraftQuestions(savedDraft.draftQuestions);
    setFormData(savedDraft.formData);
    setSetCreationData(savedDraft.setCreationData);
    setNgnItem(savedDraft.ngnItem || null);
    setEhrChart(savedDraft.ehrChart || createEhrChart());
    setShowNgnPreview(false);
    setPreviewResponse(null);
    setIsModalOpen(true);
    setSavedDraft(null); // hide banner — draft is now active in the form
  };

  const handleDismissDraft = () => {
    if (window.confirm('Discard the saved draft? This cannot be undone.')) {
      clearDraft();
    }
  };

  const handleOpenSetBuilder = () => {
    setIsSetBuilderMode(true);
    setEditingQuestion(null);
    setFormData({ content: '', rationale: '', answer: [], options: [], tags: '', imageUrl: '' });
    setSetCreationData({ title: '', description: '', cardGradient: 'default' });
    setDraftQuestions([]);
    resetNgnState();
    setIsModalOpen(true);
  };

  const handleOpenModal = (question?: Question) => {
    setIsSetBuilderMode(false);
    setShowNgnPreview(false);
    setPreviewResponse(null);
    if (question) {
      // NGN questions store their choices in the payload, so the auto-parse
      // that rescues legacy pasted MCQs must not run for them.
      const parsed = (!question.ngn && (!question.options || question.options.length === 0))
        ? parseQuestionAndOptions(question.content)
        : null;
      setEditingQuestion(question);
      setFormData({
        content: parsed?.content || question.content,
        rationale: question.rationale,
        answer: Array.isArray(question.answer) ? question.answer : [question.answer],
        options: parsed?.options || question.options || [],
        tags: question.tags.join(', '),
        imageUrl: question.imageUrl || '',
      });
      setNgnItem(question.ngn || null);
      setEhrChart(question.ehr || createEhrChart());
      setSelectedSetId('');
    } else {
      setEditingQuestion(null);
      setFormData({ content: '', rationale: '', answer: [], options: [], tags: '', imageUrl: '' });
      resetNgnState();
      // Keep selectedSetId if it was set previously
    }
    setIsModalOpen(true);
  };

  // Keep the stored correct answers in sync with the cleaned options. Options
  // are trimmed on save, so each answer is re-mapped to the exact option text it
  // matches (whitespace/markup/case-insensitively). This guarantees the stored
  // answer is an exact member of options, which the exam grader relies on.
  const normalizeAnswers = (cleanOptions: string[], answers: string[]): string[] =>
    alignAnswersToOptions(cleanOptions, answers);

  // Warn when a question with the same text already exists, letting the user add
  // it anyway or cancel. Returns true if it's safe to proceed. Checks the saved
  // bank plus any `pendingContents` (e.g. drafts not yet committed). `excludeId`
  // skips a saved question (used when editing).
  const confirmIfDuplicate = (
    content: string,
    pendingContents: string[] = [],
    excludeId?: string
  ): boolean => {
    const existing = findDuplicateQuestion(content, excludeId);
    const target = normalizeAnswerText(content);
    const inPending = target.length > 0 && pendingContents.some((c) => normalizeAnswerText(c) === target);
    const matchSource = existing ? existing.content : inPending ? content : null;
    if (!matchSource) return true;
    const preview = matchSource.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const shown = preview.length > 140 ? `${preview.slice(0, 140)}…` : preview;
    const where = existing ? 'already in your Question Bank' : 'already in this set';
    return window.confirm(
      `This looks like a duplicate — a question with the same text is ${where}:\n\n"${shown}"\n\nAdd it anyway?`
    );
  };

  /**
   * Single source of truth for turning the form into a saveable question.
   *
   * NGN items carry their payload in `ngn` but still write a readable answer
   * key into `answer`, so flashcard views, session reviews, search, and exports
   * keep working without knowing anything about NGN. `ngn`/`ehr` are always
   * present as keys (possibly `undefined`) so switching a question back to
   * Classic clears the old payload on update.
   */
  /**
   * Whole-question checks for the panel above the save buttons.
   *
   * `ngn` is deliberately left out — NgnEditor already renders those findings
   * inline, and repeating them here would double-report the same problem. What
   * this adds is everything outside the NGN payload: the stem, the rationale,
   * and the EHR chart (whose lab flags nothing else validates).
   */
  const itemFindings = useMemo(
    () =>
      validateItem({
        content: formData.content,
        rationale: formData.rationale,
        answer: formData.answer,
        ehr: ehrChart.enabled ? ehrChart : undefined,
      }),
    [formData.content, formData.rationale, formData.answer, ehrChart],
  );

  const composeQuestionData = () => {
    const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanOptions = ngnItem ? [] : formData.options.map((o) => o.trim()).filter(Boolean);
    const { domain, style } = classifyQuestion(formData.content, cleanOptions);

    return {
      content: formData.content,
      rationale: formData.rationale,
      imageUrl: formData.imageUrl,
      options: cleanOptions,
      answer: ngnItem ? summarizeNgnAnswer(ngnItem) : normalizeAnswers(cleanOptions, formData.answer),
      tags: tagsArray,
      domain: domain || undefined,
      questionStyle: style || undefined,
      ngn: ngnItem || undefined,
      ehr: ehrChart.enabled ? ehrChart : undefined,
    };
  };

  const handleSetBuilderFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setCreationData.title) {
        alert("Please enter a set title");
        return;
    }

    // Prepare the final list of questions
    // Include the one currently in the form if it has content
    const finalQuestions = [...draftQuestions];
    if (formData.content) {
        if (ngnBlocksSave()) return;
        finalQuestions.push(composeQuestionData());
    }

    if (finalQuestions.length === 0) {
        alert("Please add at least one question to the set.");
        return;
    }

    // Warn once if any of these questions already exist in the bank (same text).
    const dupCount = finalQuestions.filter(q => findDuplicateQuestion(q.content)).length;
    if (dupCount > 0) {
        const proceed = window.confirm(
            `${dupCount} of these question${dupCount > 1 ? 's' : ''} already ` +
            `${dupCount > 1 ? 'exist' : 'exists'} in your Question Bank (same text). ` +
            `Create the set anyway?`
        );
        if (!proceed) return;
    }

    // 1. Create all questions
    const newQuestionIds = finalQuestions.map(q => addQuestion(q));

    // 2. Create the set
    addSet({
        title: setCreationData.title,
        description: setCreationData.description,
        cardGradient: setCreationData.cardGradient || 'default',
        questionIds: newQuestionIds
    });

    clearDraft(); // set successfully saved — remove draft
    setIsModalOpen(false);
    setIsSetBuilderMode(false);
    setDraftQuestions([]);
    resetNgnState();
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isSetBuilderMode) {
        handleSetBuilderFinish(e);
        return;
    }
    e.preventDefault();
    if (ngnBlocksSave()) return;
    const payload = composeQuestionData();

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, payload);
      setIsModalOpen(false);
      resetNgnState();
    } else {
      if (!confirmIfDuplicate(formData.content)) return;
      const newId = addQuestion(payload);

      if (selectedSetId) {
        addQuestionToSet(selectedSetId, newId);
      }

      setIsModalOpen(false);
      resetNgnState();
    }
  };

  const handleSaveAndAddAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    if (ngnBlocksSave()) return;
    const payload = composeQuestionData();

    if (isSetBuilderMode) {
        if (!formData.content) {
            alert("Question content is required");
            return;
        }

        if (!confirmIfDuplicate(formData.content, draftQuestions.map(d => d.content))) return;

        setDraftQuestions(prev => [...prev, payload]);
        resetFormForNextQuestion();
        return;
    }

    if (!confirmIfDuplicate(formData.content)) return;

    const newId = addQuestion(payload);

    if (selectedSetId) {
        addQuestionToSet(selectedSetId, newId);
    }

    // Keep selectedSetId for the next question
    resetFormForNextQuestion();
  };

  /**
   * Clears the stem/answers but deliberately keeps the tags, the chosen NGN
   * format, and the EHR chart — an unfolding case study is several questions
   * hanging off the same client record.
   */
  const resetFormForNextQuestion = () => {
    setFormData({
        content: '',
        rationale: '',
        answer: [],
        options: [],
        tags: formData.tags,
        imageUrl: '',
    });
    if (ngnItem) setNgnItem(createNgnItem(ngnItem.kind));
    setShowNgnPreview(false);
    setPreviewResponse(null);

    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');

    // NGN items keep their choices in the payload — never split a pasted stem
    // into the (unused) classic options list.
    const parsed = ngnItem ? null : parseQuestionAndOptions(text);
    if (!parsed || parsed.options.length === 0) {
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
        content: parsed.content,
        options: parsed.options
    }));
  };

  const handleOptionPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsedOptions = extractOptionsFromBlock(text);
    if (parsedOptions.length < 2) return;
    e.preventDefault();

    setFormData((prev) => {
      const oldOption = prev.options[index] || '';
      const nextOptions = [...prev.options];
      nextOptions.splice(index, 1, ...parsedOptions);

      let nextAnswers = [...prev.answer];
      if (oldOption && nextAnswers.includes(oldOption)) {
        nextAnswers = nextAnswers.filter((a) => a !== oldOption);
        if (parsedOptions[0]) {
          nextAnswers.push(parsedOptions[0]);
        }
      }

      return {
        ...prev,
        options: nextOptions,
        answer: Array.from(new Set(nextAnswers)),
      };
    });
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

  const moveOption = (from: number, to: number) => {
    if (from === to) return;
    setFormData(prev => {
      if (from < 0 || from >= prev.options.length || to < 0 || to >= prev.options.length) return prev;
      const nextOptions = [...prev.options];
      const [moved] = nextOptions.splice(from, 1);
      nextOptions.splice(to, 0, moved);
      return { ...prev, options: nextOptions };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
            <Button 
                onClick={handleOpenSetBuilder} 
                className="hidden sm:flex bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-primary-foreground font-semibold"
            >
                <Plus className="mr-2 h-4 w-4" /> Create Set
            </Button>
            {/* <Button onClick={() => handleOpenModal()} variant="secondary" className="shadow-lg hover:shadow-primary/25 transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button> */}
        </div>
      </div>

      {/* Draft restore banner */}
      {savedDraft && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="text-amber-700 dark:text-amber-300 font-medium flex-1">
            You have an unsaved set draft
            {savedDraft.setCreationData.title ? ` — "${savedDraft.setCreationData.title}"` : ''} with{' '}
            {savedDraft.draftQuestions.length + (savedDraft.formData.content ? 1 : 0)} question(s)
            {' '}saved {new Date(savedDraft.savedAt).toLocaleString()}.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleRestoreDraft}>
              Restore Draft
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismissDraft}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

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

      {!activeSet && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {questionsBySet.map((set) => (
            <motion.div
              key={set.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`group relative rounded-2xl border backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${getCardGradientClasses(set.cardGradient)}`}
              onClick={() => setActiveSetViewId(set.id)}
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
                  <span className="text-sm font-medium">{set.questions.length} Questions</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm">
                  View Questions
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddQuestionToSet(set.id);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Question
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditSet(set.id);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSet(set.id, set.title);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeSet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button type="button" variant="outline" onClick={() => setActiveSetViewId(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Sets
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => handleAddQuestionToSet(activeSet.id)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenEditSet(activeSet.id)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteSet(activeSet.id, activeSet.title)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${getCardGradientClasses(activeSet.cardGradient)}`}>
            <h3 className="text-xl font-semibold">{activeSet.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{activeSet.description || 'No description'}</p>
            <p className="text-sm font-medium mt-3">{activeSetQuestions.length} Questions</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeSetQuestions.map((question) => {
              const isSelected = selectedQuestionIds.includes(question.id);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={`${activeSet.id}-${question.id}`}
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
                      <QuestionFormatBadge question={question} />
                      <div className="font-semibold mb-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        <RichText content={question.content} />
                      </div>
                      {question.imageUrl && (
                        <div className="mb-2 relative rounded-md overflow-hidden bg-muted/20 w-full">
                          <img
                            src={question.imageUrl}
                            alt="Question Reference"
                            className="w-full max-h-48 object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      <span className="font-medium text-foreground">Answer: </span>
                      {Array.isArray(question.answer)
                        ? question.answer.map((a, i) => <span key={i}><RichText content={a} />{i < question.answer.length - 1 ? ', ' : ''}</span>)
                        : <RichText content={question.answer} />}
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
              );
            })}
            {activeSetQuestions.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                No questions in this set match your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unassigned Questions Section */}
      {unassignedQuestions.length > 0 && (
            <div className="space-y-4 mt-8">
                <div className="flex items-center gap-2">
                <div className="p-1">
                    <List className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-muted-foreground">Unassigned Questions</h3>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {unassignedQuestions.length}
                </span>
                <Button variant="destructive" size="sm" onClick={handleDeleteAllUnassigned} className="ml-4 h-7 text-xs">
                    Delete All ({unassignedQuestions.length})
                </Button>
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
                                <QuestionFormatBadge question={question} />
                                <div className="font-semibold mb-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                    <RichText content={question.content} />
                                </div>
                                {question.imageUrl && (
                                    <div className="mb-2 relative rounded-md overflow-hidden bg-muted/20 w-full">
                                        <img
                                            src={question.imageUrl}
                                            alt="Question Reference"
                                            className="w-full max-h-48 object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                <span className="font-medium text-foreground">Answer: </span>
                                {Array.isArray(question.answer) 
                                    ? question.answer.map((a, i) => <span key={i}><RichText content={a} />{i < question.answer.length - 1 ? ', ' : ''}</span>)
                                    : <RichText content={question.answer} />
                                }
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

      {/* Set Creation Modal */}
      <Modal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        title="Save Selected Questions as Set"
        maxWidth="max-w-2xl"
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
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Card Color</label>
                <select
                    value={setCreationData.cardGradient}
                    onChange={(e) => setSetCreationData({ ...setCreationData, cardGradient: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    {CARD_GRADIENT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Selected Questions ({selectedQuestionIds.length})</label>
                <div className="max-h-[300px] overflow-y-auto border rounded-md bg-muted/20 divide-y divide-border/50">
                    {questions
                        .filter(q => selectedQuestionIds.includes(q.id))
                        .map((q, idx) => (
                        <div key={q.id} className="p-3 text-sm flex gap-3 bg-card/50">
                            <span className="text-muted-foreground font-mono text-xs mt-0.5">{idx + 1}.</span>
                            <div className="line-clamp-2 flex-1">
                                <RichText content={q.content} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 flex justify-end items-center">
                <Button type="submit">
                    Save Set
                </Button>
            </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditSetModalOpen}
        onClose={() => setIsEditSetModalOpen(false)}
        title="Edit Set"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpdateSet} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Set Title</label>
                <Input
                    required
                    placeholder="Set title"
                    value={setEditData.title}
                    onChange={(e) => setSetEditData({ ...setEditData, title: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Description (Optional)</label>
                <Textarea
                    placeholder="Brief description of this question set..."
                    value={setEditData.description}
                    onChange={(e) => setSetEditData({ ...setEditData, description: e.target.value })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Card Color</label>
                <select
                    value={setEditData.cardGradient}
                    onChange={(e) => setSetEditData({ ...setEditData, cardGradient: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    {CARD_GRADIENT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="pt-4 flex justify-end items-center">
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isSetBuilderMode ? 'Create New Exam Set' : (editingQuestion ? 'Edit Question' : 'New Question')}
        maxWidth={ngnItem ? 'max-w-6xl' : 'max-w-5xl'}
        // NGN editors make this form much taller than a classic question —
        // cap it to the viewport so the action buttons stay reachable.
        className="max-h-[92vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSetBuilderMode && (
            <div className="bg-secondary/20 p-6 rounded-xl border border-border/50 space-y-4 mb-8">
                <div className="flex justify-between items-center">
                     <h3 className="font-semibold text-primary text-lg">Set Details</h3>
                     <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                        {draftQuestions.length} Questions Added
                     </span>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Set Title</label>
                        <Input
                            required={isSetBuilderMode}
                            placeholder="e.g. Biology Final Review"
                            value={setCreationData.title}
                            onChange={(e) => setSetCreationData({ ...setCreationData, title: e.target.value })}
                        />
                    </div>
                </div>
                <div className="h-px bg-border/50 my-2" />
                <h3 className="font-semibold text-base">Add Question {draftQuestions.length + 1}</h3>
            </div>
          )}

          <NgnStylePicker value={ngnItem ? ngnItem.kind : null} onChange={handleStyleChange} />

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Content & Image */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                    Question Content
                    </label>
                    <Textarea
                    required
                    placeholder="What is the capital of France? (Paste formatted question here to auto-fill)"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    onPaste={handlePaste}
                    className="min-h-[150px] font-medium"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">
                    Reference Image (Optional)
                    </label>
                    <div className="rounded-2xl border border-border/60 bg-linear-to-r from-secondary/20 via-secondary/10 to-transparent px-3 py-2">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                        />
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="image-upload"
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-primary hover:bg-primary/25 transition-colors"
                                    title="Attach image"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    <span className="text-sm font-medium">Media</span>
                                </label>
                                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP</span>
                            </div>
                            {formData.imageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                    {formData.imageUrl && (
                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 shadow-sm">
                            <img
                                src={formData.imageUrl}
                                alt="Reference preview"
                                className="w-full max-h-64 object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Options & Metadata */}
            <div className="space-y-6">
                {!ngnItem && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium leading-none">
                        Distractors / Options
                        </label>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">Check the correct answer(s)</span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.options.map((option, index) => {
                            const isCorrect = isAnswerMatch(option, formData.answer);
                            const isDragging = dragOptionIndex === index;
                            const isDragOver = dragOverOptionIndex === index && dragOptionIndex !== index;
                            return (
                                <div
                                    key={index}
                                    draggable
                                    onDragStart={(e) => {
                                        // Only allow drags that began on the grip handle.
                                        if (!dragHandleActive.current) {
                                            e.preventDefault();
                                            return;
                                        }
                                        setDragOptionIndex(index);
                                    }}
                                    onDragOver={(e) => {
                                        if (dragOptionIndex === null) return;
                                        e.preventDefault();
                                        setDragOverOptionIndex(index);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragOptionIndex !== null) moveOption(dragOptionIndex, index);
                                        setDragOptionIndex(null);
                                        setDragOverOptionIndex(null);
                                        dragHandleActive.current = false;
                                    }}
                                    onDragEnd={() => {
                                        setDragOptionIndex(null);
                                        setDragOverOptionIndex(null);
                                        dragHandleActive.current = false;
                                    }}
                                    className={`flex gap-2 items-center group rounded-lg transition-all ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-primary/50' : ''}`}
                                >
                                    <button
                                        type="button"
                                        onMouseDown={() => { dragHandleActive.current = true; }}
                                        onMouseUp={() => { dragHandleActive.current = false; }}
                                        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground touch-none"
                                        title="Drag to reorder"
                                        aria-label="Drag to reorder option"
                                    >
                                        <GripVertical className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleCorrectAnswer(option)}
                                        className={`p-2 rounded-lg transition-all ${isCorrect ? 'bg-green-500 text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                        title={isCorrect ? "Marked as correct" : "Mark as correct"}
                                    >
                                        {isCorrect ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                    </button>
                                    <Input
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        onPaste={(e) => handleOptionPaste(index, e)}
                                        placeholder={`Option ${index + 1}`}
                                        className={`flex-1 ${isCorrect ? "border-green-500 ring-1 ring-green-500/20" : ""}`}
                                    />
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                        <Button type="button" variant="outline" onClick={addOption} className="w-full border-dashed py-6 hover:bg-muted/30 hover:border-primary/50 hover:text-primary transition-all">
                            <Plus className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                    </div>
                </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                    Rationale
                    </label>
                    <Textarea
                    placeholder="Explain why the correct answer is right..."
                    value={formData.rationale}
                    onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                    className={ngnItem ? 'min-h-[220px]' : 'min-h-[100px]'}
                    />
                </div>

            </div>
          </div>

          {/* NGN item builder — replaces the classic options list */}
          {ngnItem && (
            showNgnPreview && previewResponse ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Student preview</span>
                    <span className="text-xs text-muted-foreground">
                      Exactly how this appears during practice
                    </span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={togglePreview}>
                    Back to editing
                  </Button>
                </div>

                {ehrChart.enabled && <EhrChartViewer chart={ehrChart} compact />}

                {formData.content && (
                  <div className="rounded-2xl border border-border/60 bg-card/50 p-5 text-lg font-medium leading-relaxed">
                    <RichText content={formData.content} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" />
                  </div>
                )}

                <NgnPlayer item={ngnItem} response={previewResponse} onChange={setPreviewResponse} />
              </div>
            ) : (
              <NgnEditor
                item={ngnItem}
                onChange={setNgnItem}
                onPreview={togglePreview}
                previewing={showNgnPreview}
              />
            )
          )}

          {/* Optional 5-tab EHR chart */}
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setEhrChart({ ...ehrChart, enabled: !ehrChart.enabled })}
              className="flex w-full items-center justify-between gap-3 bg-secondary/20 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <Stethoscope className={`h-5 w-5 ${ehrChart.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <span className="text-sm font-medium">Attach a client record (EHR)</span>
                  <p className="text-xs text-muted-foreground">
                    Five tabs — H&amp;P, Orders, Notes, Flowsheets, Labs — shown beside the question.
                  </p>
                </div>
              </div>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${ehrChart.enabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${ehrChart.enabled ? 'left-[22px]' : 'left-0.5'}`}
                />
              </span>
            </button>
            {ehrChart.enabled && (
              <div className="border-t border-border/60 p-4">
                <EhrChartEditor chart={ehrChart} onChange={setEhrChart} />
              </div>
            )}
          </div>

          {!isSetBuilderMode && (
          <div className="bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-4">
                <Folder className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                    <label className="text-sm font-medium leading-none block mb-1">
                    Add to Set (Optional)
                    </label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            </div>
          </div>
          )}

          {itemFindings.length > 0 && (
            <div
              className={`rounded-xl border p-4 ${
                itemFindings.some((f) => f.severity === 'error')
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-border/60 bg-secondary/20'
              }`}
            >
              <p className="text-sm font-medium mb-2">Review before saving</p>
              <ul className="space-y-1 text-xs">
                {itemFindings.map((f, i) => (
                  <li key={`${f.code}-${i}`} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        f.severity === 'error' ? 'bg-amber-500' : 'bg-muted-foreground/50'
                      }`}
                    />
                    <span className="text-muted-foreground">{f.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-6 gap-3 border-t border-border/50">
            {!editingQuestion && (
                <Button type="button" variant="outline" onClick={handleSaveAndAddAnother} className="h-11 px-6">
                    {isSetBuilderMode ? 'Save Question & Add Another' : 'Save & Add Another'}
                </Button>
            )}
            <Button type="submit" className="h-11 px-8 shadow-lg shadow-primary/20">
              {isSetBuilderMode ? 'Complete Set' : (editingQuestion ? 'Save Changes' : 'Create Question')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Questions;
