import type {
  DiscoverQuery,
  DiscoverResponse,
  ImportedSetLink,
  MarketplaceApi,
  PublishSetInput,
  SharedSetDetail,
  SharedSetSummary,
} from '../../types/marketplace';
import { MOCK_SHARED_SETS } from './mockData';
import { getSupabaseClient } from './supabaseClient';

const IMPORT_LINKS_KEY = 'qudoro-import-links-v1';

const sortByPopular = (items: SharedSetSummary[]): SharedSetSummary[] =>
  [...items].sort((a, b) => {
    if (b.downloads !== a.downloads) return b.downloads - a.downloads;
    return b.ratingAverage - a.ratingAverage;
  });

const sortByNewest = (items: SharedSetSummary[]): SharedSetSummary[] =>
  [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

const sortByRating = (items: SharedSetSummary[]): SharedSetSummary[] =>
  [...items].sort((a, b) => {
    if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
    return b.ratingCount - a.ratingCount;
  });

const toSummary = (detail: SharedSetDetail): SharedSetSummary => ({
  id: detail.id,
  slug: detail.slug,
  title: detail.title,
  description: detail.description,
  tags: detail.tags,
  subject: detail.subject,
  visibility: detail.visibility,
  version: detail.version,
  downloads: detail.downloads,
  ratingAverage: detail.ratingAverage,
  ratingCount: detail.ratingCount,
  questionCount: detail.questionCount,
  createdAt: detail.createdAt,
  updatedAt: detail.updatedAt,
  author: detail.author,
});

class MockMarketplaceApi implements MarketplaceApi {
  async discoverSets(input: DiscoverQuery): Promise<DiscoverResponse> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 12;
    const query = (input.query || '').trim().toLowerCase();

    let filtered = MOCK_SHARED_SETS.filter((set) => set.visibility === 'public').map(toSummary);

    if (query) {
      filtered = filtered.filter((set) => {
        const haystack = `${set.title} ${set.description} ${set.tags.join(' ')} ${set.subject} ${set.author.displayName}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    if (input.subject) {
      filtered = filtered.filter((set) => set.subject === input.subject);
    }

    if (input.tag) {
      const tagQuery = input.tag.trim().toLowerCase();
      filtered = filtered.filter((set) => set.tags.some((tag) => tag.toLowerCase().includes(tagQuery)));
    }

    const sort = input.sort ?? 'popular';
    if (sort === 'new') filtered = sortByNewest(filtered);
    if (sort === 'rating') filtered = sortByRating(filtered);
    if (sort === 'popular') filtered = sortByPopular(filtered);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      total,
      page,
      pageSize,
    };
  }

  async getSetById(setId: string): Promise<SharedSetDetail | null> {
    const found = MOCK_SHARED_SETS.find((set) => set.id === setId && set.visibility === 'public');
    return found ?? null;
  }

  async publishSet(input: PublishSetInput): Promise<SharedSetSummary> {
    const now = new Date().toISOString();
    const id = `mock_${Math.random().toString(36).slice(2, 10)}`;
    const detail: SharedSetDetail = {
      id,
      slug: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now()}`,
      title: input.title,
      description: input.description,
      tags: input.tags,
      subject: input.subject,
      visibility: input.visibility,
      version: 1,
      downloads: 0,
      ratingAverage: 0,
      ratingCount: 0,
      questionCount: input.questions.length,
      createdAt: now,
      updatedAt: now,
      author: { id: 'mock_author', displayName: 'You' },
      questions: input.questions.map((q, idx) => ({
        id: `mock_q_${idx + 1}_${Date.now()}`,
        remoteQuestionId: q.remoteQuestionId,
        content: q.content,
        rationale: q.rationale,
        options: q.options,
        answers: q.answers,
        tags: q.tags,
        orderIndex: q.orderIndex,
        createdAt: now,
        updatedAt: now,
      })),
    };

    MOCK_SHARED_SETS.unshift(detail);
    return toSummary(detail);
  }
}

class SupabaseMarketplaceApi implements MarketplaceApi {
  private mockApi = new MockMarketplaceApi();

  async discoverSets(input: DiscoverQuery): Promise<DiscoverResponse> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.mockApi.discoverSets(input);

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 12;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('shared_sets')
      .select(
        'id, slug, title, description, subject, tags, visibility, version, downloads_count, rating_avg, rating_count, author_id, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('visibility', 'public');

    if (input.query) {
      const search = input.query.trim();
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (input.subject) {
      query = query.eq('subject', input.subject);
    }

    if (input.tag) {
      query = query.contains('tags', [input.tag]);
    }

    const sort = input.sort ?? 'popular';
    if (sort === 'new') query = query.order('updated_at', { ascending: false });
    if (sort === 'rating') query = query.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false });
    if (sort === 'popular') query = query.order('downloads_count', { ascending: false }).order('rating_avg', { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) {
      return this.mockApi.discoverSets(input);
    }

    const rows = data ?? [];
    const setIds = rows.map((row) => row.id as string);

    let questionCountBySet = new Map<string, number>();
    if (setIds.length > 0) {
      const { data: questionsData } = await supabase
        .from('shared_questions')
        .select('set_id')
        .in('set_id', setIds);
      questionCountBySet = new Map<string, number>();
      for (const item of questionsData ?? []) {
        const key = item.set_id as string;
        questionCountBySet.set(key, (questionCountBySet.get(key) ?? 0) + 1);
      }
    }

    const items: SharedSetSummary[] = rows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: (row.description as string) || '',
      subject: row.subject,
      tags: (row.tags as string[]) || [],
      visibility: row.visibility,
      version: Number(row.version ?? 1),
      downloads: Number(row.downloads_count ?? 0),
      ratingAverage: Number(row.rating_avg ?? 0),
      ratingCount: Number(row.rating_count ?? 0),
      questionCount: questionCountBySet.get(row.id as string) ?? 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      author: {
        id: row.author_id as string,
        displayName: `Nurse ${String(row.author_id).slice(0, 6)}`,
      },
    }));

    return {
      items,
      total: count ?? items.length,
      page,
      pageSize,
    };
  }

  async getSetById(setId: string): Promise<SharedSetDetail | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.mockApi.getSetById(setId);

    const { data: setData, error: setError } = await supabase
      .from('shared_sets')
      .select(
        'id, slug, title, description, subject, tags, visibility, version, downloads_count, rating_avg, rating_count, author_id, created_at, updated_at',
      )
      .eq('id', setId)
      .eq('visibility', 'public')
      .maybeSingle();

    if (setError || !setData) {
      return null;
    }

    const { data: questionRows, error: qError } = await supabase
      .from('shared_questions')
      .select(
        'id, remote_question_id, content, rationale, options, answers, tags, order_index, created_at, updated_at',
      )
      .eq('set_id', setId)
      .order('order_index', { ascending: true });

    if (qError) {
      return null;
    }

    const questions = (questionRows ?? []).map((row) => ({
      id: row.id as string,
      remoteQuestionId: row.remote_question_id as string,
      content: row.content as string,
      rationale: (row.rationale as string) || '',
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
      answers: Array.isArray(row.answers) ? (row.answers as string[]) : [],
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      orderIndex: Number(row.order_index ?? 0),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return {
      id: setData.id as string,
      slug: setData.slug as string,
      title: setData.title as string,
      description: (setData.description as string) || '',
      subject: setData.subject,
      tags: (setData.tags as string[]) || [],
      visibility: setData.visibility,
      version: Number(setData.version ?? 1),
      downloads: Number(setData.downloads_count ?? 0),
      ratingAverage: Number(setData.rating_avg ?? 0),
      ratingCount: Number(setData.rating_count ?? 0),
      questionCount: questions.length,
      createdAt: setData.created_at as string,
      updatedAt: setData.updated_at as string,
      author: {
        id: setData.author_id as string,
        displayName: `Nurse ${String(setData.author_id).slice(0, 6)}`,
      },
      questions,
    };
  }

  async publishSet(input: PublishSetInput): Promise<SharedSetSummary> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.mockApi.publishSet(input);

    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      throw new Error('Please sign in before publishing a set.');
    }

    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const slug = `${slugBase}-${Date.now()}`;

    const { data: insertedSet, error: setError } = await supabase
      .from('shared_sets')
      .insert({
        author_id: user.id,
        slug,
        title: input.title,
        description: input.description,
        subject: input.subject,
        tags: input.tags,
        visibility: input.visibility,
        version: 1,
      })
      .select('id, slug, title, description, subject, tags, visibility, version, downloads_count, rating_avg, rating_count, author_id, created_at, updated_at')
      .single();

    if (setError || !insertedSet) {
      throw new Error(setError?.message || 'Failed to publish set.');
    }

    if (input.questions.length > 0) {
      const rows = input.questions.map((question) => ({
        set_id: insertedSet.id,
        remote_question_id: question.remoteQuestionId,
        content: question.content,
        rationale: question.rationale,
        options: question.options,
        answers: question.answers,
        tags: question.tags,
        order_index: question.orderIndex,
      }));

      const { error: questionInsertError } = await supabase.from('shared_questions').insert(rows);
      if (questionInsertError) {
        throw new Error(questionInsertError.message || 'Failed to publish questions.');
      }
    }

    return {
      id: insertedSet.id as string,
      slug: insertedSet.slug as string,
      title: insertedSet.title as string,
      description: (insertedSet.description as string) || '',
      subject: insertedSet.subject,
      tags: (insertedSet.tags as string[]) || [],
      visibility: insertedSet.visibility,
      version: Number(insertedSet.version ?? 1),
      downloads: Number(insertedSet.downloads_count ?? 0),
      ratingAverage: Number(insertedSet.rating_avg ?? 0),
      ratingCount: Number(insertedSet.rating_count ?? 0),
      questionCount: input.questions.length,
      createdAt: insertedSet.created_at as string,
      updatedAt: insertedSet.updated_at as string,
      author: {
        id: insertedSet.author_id as string,
        displayName: `Nurse ${String(insertedSet.author_id).slice(0, 6)}`,
      },
    };
  }
}

export const marketplaceApi: MarketplaceApi = new SupabaseMarketplaceApi();

export const readImportedLinks = (): ImportedSetLink[] => {
  try {
    const raw = localStorage.getItem(IMPORT_LINKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImportedSetLink[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      remoteSetId: item.remoteSetId,
      remoteVersion: Number(item.remoteVersion ?? 1),
      localSetId: item.localSetId,
      importedAt: Number(item.importedAt ?? Date.now()),
      questionLinks: Array.isArray(item.questionLinks)
        ? item.questionLinks
            .filter((ql) => ql && typeof ql.remoteQuestionId === 'string' && typeof ql.localQuestionId === 'string')
            .map((ql) => ({ remoteQuestionId: ql.remoteQuestionId, localQuestionId: ql.localQuestionId }))
        : [],
    }));
  } catch {
    return [];
  }
};

export const saveImportedLink = (link: ImportedSetLink): void => {
  const existing = readImportedLinks();
  const next = existing.filter((item) => item.remoteSetId !== link.remoteSetId);
  next.push({
    remoteSetId: link.remoteSetId,
    remoteVersion: link.remoteVersion,
    localSetId: link.localSetId,
    importedAt: link.importedAt,
    questionLinks: link.questionLinks ?? [],
  });
  localStorage.setItem(IMPORT_LINKS_KEY, JSON.stringify(next));
};

export const getImportedLinkByRemoteSet = (remoteSetId: string): ImportedSetLink | null => {
  const existing = readImportedLinks();
  return existing.find((item) => item.remoteSetId === remoteSetId) ?? null;
};
