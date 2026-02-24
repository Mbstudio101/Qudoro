import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, Star, User, Tag, Eye, RefreshCw, UploadCloud } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import {
  marketplaceApi,
  readImportedLinks,
  saveImportedLink,
} from '../services/marketplace/marketplaceApi';
import type {
  DiscoverSort,
  ImportedSetLink,
  NursingSubject,
  PublishSetInput,
  SharedSetDetail,
  SharedSetSummary,
  SharedSetVisibility,
} from '../types/marketplace';
import { NURSING_SUBJECTS } from '../types/marketplace';
import { getSupabaseClient } from '../services/marketplace/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getAvatarUrl } from '../utils/avatar';

const PROFILE_LINKS_KEY = 'qudoro-marketplace-profile-links-v1';

type LinkedProfile = {
  displayName: string;
  avatarUrl?: string;
};

const readLinkedProfiles = (): Record<string, LinkedProfile> => {
  try {
    const raw = localStorage.getItem(PROFILE_LINKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LinkedProfile>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveLinkedProfile = (supabaseUserId: string, profile: LinkedProfile) => {
  const existing = readLinkedProfiles();
  existing[supabaseUserId] = profile;
  localStorage.setItem(PROFILE_LINKS_KEY, JSON.stringify(existing));
};

const Discover = () => {
  const {
    addQuestion,
    addQuestionToSet,
    addSet,
    sets: allSets,
    questions: allQuestions,
    activeProfileId,
    updateQuestion,
    updateSet,
    userProfile,
  } = useStore();

  const sets = useMemo(
    () => allSets.filter((s) => !s.profileId || s.profileId === activeProfileId),
    [allSets, activeProfileId],
  );
  const questions = useMemo(
    () => allQuestions.filter((q) => !q.profileId || q.profileId === activeProfileId),
    [allQuestions, activeProfileId],
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SharedSetSummary[]>([]);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<NursingSubject | ''>('');
  const [sort, setSort] = useState<DiscoverSort>('popular');
  const [selectedSet, setSelectedSet] = useState<SharedSetDetail | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importingSetId, setImportingSetId] = useState<string | null>(null);
  const [importLinksVersion, setImportLinksVersion] = useState(0);

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [profileLinksVersion, setProfileLinksVersion] = useState(0);
  const [isProfileLinkOpen, setIsProfileLinkOpen] = useState(false);
  const [profileLinkForm, setProfileLinkForm] = useState({ displayName: '', avatarUrl: '' });
  const [publishData, setPublishData] = useState({
    localSetId: '',
    subject: '' as NursingSubject | '',
    tags: '',
    visibility: 'public' as SharedSetVisibility,
    descriptionOverride: '',
  });

  const reloadDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const response = await marketplaceApi.discoverSets({
        query,
        subject,
        sort,
        page: 1,
        pageSize: 24,
      });
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }, [query, sort, subject]);

  useEffect(() => {
    void reloadDiscover();
  }, [reloadDiscover]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isMounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSupabaseSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSupabaseSession(session);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const importLinksByRemoteSet = useMemo(() => {
    const links = readImportedLinks();
    const map = new Map<string, ImportedSetLink>();
    for (const link of links) {
      map.set(link.remoteSetId, link);
    }
    return map;
  }, [importLinksVersion]);

  const linkedProfiles = useMemo(() => readLinkedProfiles(), [profileLinksVersion]);

  const getAuthorProfile = (authorId: string): LinkedProfile | null => linkedProfiles[authorId] || null;

  const openPreview = async (setId: string) => {
    const detail = await marketplaceApi.getSetById(setId);
    if (!detail) return;
    setSelectedSet(detail);
    setIsPreviewOpen(true);
  };

  const importSet = async (setSummary: SharedSetSummary) => {
    setImportingSetId(setSummary.id);
    try {
      const detail = await marketplaceApi.getSetById(setSummary.id);
      if (!detail) return;

      const importedLink = importLinksByRemoteSet.get(detail.id);
      const canMergeUpdate = importedLink && detail.version > importedLink.remoteVersion;

      if (canMergeUpdate) {
        const localSet = sets.find((set) => set.id === importedLink.localSetId);
        if (!localSet) {
          return;
        }

        const questionMap = new Map(
          (importedLink.questionLinks || []).map((link) => [link.remoteQuestionId, link.localQuestionId]),
        );
        const nextQuestionLinks: { remoteQuestionId: string; localQuestionId: string }[] = [];
        const orderedLinkedQuestionIds: string[] = [];

        for (const remoteQuestion of detail.questions) {
          const linkedLocalQuestionId = questionMap.get(remoteQuestion.remoteQuestionId);
          const linkedLocalQuestion = linkedLocalQuestionId
            ? questions.find((q) => q.id === linkedLocalQuestionId)
            : undefined;

          if (linkedLocalQuestion) {
            updateQuestion(linkedLocalQuestion.id, {
              content: remoteQuestion.content,
              rationale: remoteQuestion.rationale,
              answer: remoteQuestion.answers,
              options: remoteQuestion.options,
              tags: remoteQuestion.tags,
            });
            nextQuestionLinks.push({
              remoteQuestionId: remoteQuestion.remoteQuestionId,
              localQuestionId: linkedLocalQuestion.id,
            });
            orderedLinkedQuestionIds.push(linkedLocalQuestion.id);
            continue;
          }

          const localQuestionId = addQuestion({
            content: remoteQuestion.content,
            rationale: remoteQuestion.rationale,
            answer: remoteQuestion.answers,
            options: remoteQuestion.options,
            tags: remoteQuestion.tags,
          });
          addQuestionToSet(localSet.id, localQuestionId);
          nextQuestionLinks.push({
            remoteQuestionId: remoteQuestion.remoteQuestionId,
            localQuestionId,
          });
          orderedLinkedQuestionIds.push(localQuestionId);
        }

        const linkedIdsSet = new Set((importedLink.questionLinks || []).map((x) => x.localQuestionId));
        const localOnlyQuestionIds = localSet.questionIds.filter((id) => !linkedIdsSet.has(id));

        updateSet(localSet.id, {
          title: detail.title,
          description: `${detail.description} (Imported from Discover)`,
          questionIds: [...orderedLinkedQuestionIds, ...localOnlyQuestionIds],
        });

        saveImportedLink({
          remoteSetId: detail.id,
          remoteVersion: detail.version,
          localSetId: localSet.id,
          importedAt: Date.now(),
          questionLinks: nextQuestionLinks,
        });
        setImportLinksVersion((prev) => prev + 1);
        return;
      }

      const localSetId = addSet({
        title: detail.title,
        description: `${detail.description} (Imported from Discover)`,
        questionIds: [],
      });

      const questionLinks: { remoteQuestionId: string; localQuestionId: string }[] = [];
      for (const question of detail.questions) {
        const localQuestionId = addQuestion({
          content: question.content,
          rationale: question.rationale,
          answer: question.answers,
          options: question.options,
          tags: question.tags,
        });
        addQuestionToSet(localSetId, localQuestionId);
        questionLinks.push({ remoteQuestionId: question.remoteQuestionId, localQuestionId });
      }

      saveImportedLink({
        remoteSetId: detail.id,
        remoteVersion: detail.version,
        localSetId,
        importedAt: Date.now(),
        questionLinks,
      });

      setImportLinksVersion((prev) => prev + 1);
    } finally {
      setImportingSetId(null);
    }
  };

  const openPublishModal = () => {
    if (!supabaseSession?.user) {
      window.location.hash = '/login';
      return;
    }

    const linked = getAuthorProfile(supabaseSession.user.id);
    if (!linked) {
      const defaultDisplayName = userProfile?.name || supabaseSession.user.email?.split('@')[0] || 'Qudoro User';
      const defaultAvatar = userProfile?.avatar ? getAvatarUrl(userProfile.avatar) : '';
      setProfileLinkForm({ displayName: defaultDisplayName, avatarUrl: defaultAvatar });
      setIsProfileLinkOpen(true);
      return;
    }

    const firstSet = sets[0];
    setPublishData({
      localSetId: firstSet?.id || '',
      subject: '',
      tags: '',
      visibility: 'public',
      descriptionOverride: '',
    });
    setPublishError('');
    setIsPublishOpen(true);
  };

  const handleSaveProfileLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseSession?.user) return;
    if (!profileLinkForm.displayName.trim()) return;
    saveLinkedProfile(supabaseSession.user.id, {
      displayName: profileLinkForm.displayName.trim(),
      avatarUrl: profileLinkForm.avatarUrl.trim() || undefined,
    });
    setProfileLinksVersion((prev) => prev + 1);
    setIsProfileLinkOpen(false);
    openPublishModal();
  };

  const handleSupabaseSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError('');

    const localSet = sets.find((set) => set.id === publishData.localSetId);
    if (!localSet) {
      setPublishError('Choose a local set first.');
      return;
    }
    if (!publishData.subject) {
      setPublishError('Choose a subject.');
      return;
    }

    const localQuestions = localSet.questionIds
      .map((id) => questions.find((question) => question.id === id))
      .filter(Boolean);

    if (localQuestions.length === 0) {
      setPublishError('Selected set has no questions.');
      return;
    }

    const payload: PublishSetInput = {
      title: localSet.title,
      description: publishData.descriptionOverride.trim() || localSet.description || '',
      subject: publishData.subject,
      tags: publishData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      visibility: publishData.visibility,
      questions: localQuestions.map((question, index) => ({
        remoteQuestionId: question.id,
        content: question.content,
        rationale: question.rationale,
        options: question.options || [],
        answers: question.answer,
        tags: question.tags,
        orderIndex: index + 1,
      })),
    };

    setPublishing(true);
    try {
      await marketplaceApi.publishSet(payload);
      setIsPublishOpen(false);
      await reloadDiscover();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish set.';
      setPublishError(message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Discover
          </h2>
          <p className="text-muted-foreground">Search, import, and publish community question sets.</p>
        </div>
        <div className="flex items-center gap-2">
          {supabaseSession?.user ? (
            <>
              <span className="text-xs text-muted-foreground max-w-[220px] truncate">
                {supabaseSession.user.email}
              </span>
              <Button type="button" variant="outline" onClick={handleSupabaseSignOut}>
                Sign Out
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const linked = getAuthorProfile(supabaseSession.user.id);
                  setProfileLinkForm({
                    displayName: linked?.displayName || userProfile?.name || '',
                    avatarUrl: linked?.avatarUrl || (userProfile?.avatar ? getAvatarUrl(userProfile.avatar) : ''),
                  });
                  setIsProfileLinkOpen(true);
                }}
              >
                Author Profile
              </Button>
            </>
          ) : null}
          <Button type="button" onClick={openPublishModal} disabled={sets.length === 0}>
            <UploadCloud className="mr-2 h-4 w-4" /> Publish Local Set
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card/30 p-3 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, tag, subject, or author"
            className="pl-10"
          />
        </div>

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as NursingSubject | '')}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Subjects</option>
          {NURSING_SUBJECTS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as DiscoverSort)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="popular">Most Popular</option>
          <option value="new">Recently Updated</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading marketplace sets...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((set) => {
            const imported = importLinksByRemoteSet.get(set.id);
            const updateAvailable = !!imported && set.version > imported.remoteVersion;

            return (
              <div
                key={set.id}
                className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm flex flex-col gap-4"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-2">{set.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{set.description}</p>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    {getAuthorProfile(set.author.id)?.avatarUrl ? (
                      <img
                        src={getAuthorProfile(set.author.id)?.avatarUrl}
                        alt="Author avatar"
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    {getAuthorProfile(set.author.id)?.displayName || set.author.displayName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> {set.ratingAverage.toFixed(1)} ({set.ratingCount})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> {set.downloads}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">{set.subject}</div>
                <div className="flex flex-wrap gap-2">
                  {set.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
                      <Tag className="h-3 w-3" /> {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto space-y-2">
                  {imported && !updateAvailable && (
                    <div className="text-xs text-green-600">Imported (v{imported.remoteVersion})</div>
                  )}
                  {updateAvailable && <div className="text-xs text-amber-600">Update available (v{set.version})</div>}

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => void openPreview(set.id)}>
                      <Eye className="mr-2 h-4 w-4" /> Preview
                    </Button>
                    <Button type="button" onClick={() => void importSet(set)} disabled={importingSetId === set.id}>
                      {updateAvailable ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" /> Update
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" /> Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && <div className="text-sm text-muted-foreground">No sets found for your filters.</div>}
        </div>
      )}

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={selectedSet ? `${selectedSet.title} Preview` : 'Set Preview'}
        maxWidth="max-w-3xl"
      >
        {selectedSet ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selectedSet.description}</p>
            <div className="text-xs text-muted-foreground">
              {selectedSet.questionCount} questions · v{selectedSet.version} · {selectedSet.author.displayName}
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedSet.questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-border/50 p-4 bg-card/50">
                  <div className="font-medium text-sm mb-2">
                    {index + 1}. {question.content}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {question.options.map((option) => (
                      <div key={`${question.id}-${option}`}>• {option}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={isPublishOpen} onClose={() => setIsPublishOpen(false)} title="Publish Local Set" maxWidth="max-w-2xl">
        <form onSubmit={handlePublish} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Local Set</label>
            <select
              required
              value={publishData.localSetId}
              onChange={(e) => setPublishData((prev) => ({ ...prev, localSetId: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select set...</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.title} ({set.questionIds.length} questions)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <select
                required
                value={publishData.subject}
                onChange={(e) => setPublishData((prev) => ({ ...prev, subject: e.target.value as NursingSubject }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select subject...</option>
                {NURSING_SUBJECTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <select
                value={publishData.visibility}
                onChange={(e) => setPublishData((prev) => ({ ...prev, visibility: e.target.value as SharedSetVisibility }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={publishData.tags}
              onChange={(e) => setPublishData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="fundamentals, delegation, safety"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description Override (Optional)</label>
            <Input
              value={publishData.descriptionOverride}
              onChange={(e) => setPublishData((prev) => ({ ...prev, descriptionOverride: e.target.value }))}
              placeholder="If blank, local set description is used"
            />
          </div>

          {publishError && <p className="text-sm text-destructive">{publishError}</p>}

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish Set'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isProfileLinkOpen} onClose={() => setIsProfileLinkOpen(false)} title="Author Profile" maxWidth="max-w-md">
        <form onSubmit={handleSaveProfileLink} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set how your name appears when you publish sets.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <Input
              required
              value={profileLinkForm.displayName}
              onChange={(e) => setProfileLinkForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your public name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar URL (optional)</label>
            <Input
              value={profileLinkForm.avatarUrl}
              onChange={(e) => setProfileLinkForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="pt-1 flex justify-end">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Discover;
