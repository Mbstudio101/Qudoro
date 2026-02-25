export type SharedSetVisibility = 'public' | 'private';
export type DiscoverTab = 'all' | 'trending' | 'new' | 'saved' | 'following';

export const NURSING_SUBJECTS = [
  'Fundamentals of Nursing',
  'Health Assessment',
  'Pharmacology',
  'Pathophysiology',
  'Medical-Surgical Nursing',
  'Mental Health/Psychiatric Nursing',
  'Obstetrics & Gynecology (Maternity) Nursing',
  'Pediatric Nursing',
  'Community/Public Health Nursing',
  'Nursing Research & Evidence-Based Practice',
  'Nursing Management/Leadership',
] as const;

export type NursingSubject = typeof NURSING_SUBJECTS[number];

export interface MarketplaceAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string;
  country?: string;
  bio?: string;
  studyField?: string;
}

export interface SharedQuestion {
  id: string;
  remoteQuestionId: string;
  content: string;
  rationale: string;
  options: string[];
  answers: string[];
  tags: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedSetSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  subject: NursingSubject;
  visibility: SharedSetVisibility;
  version: number;
  downloads: number;
  ratingAverage: number;
  ratingCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  author: MarketplaceAuthor;
}

export interface SharedSetDetail extends SharedSetSummary {
  questions: SharedQuestion[];
}

export type DiscoverSort = 'popular' | 'new' | 'rating';

export interface DiscoverQuery {
  query?: string;
  subject?: NursingSubject | '';
  tag?: string;
  sort?: DiscoverSort;
  page?: number;
  pageSize?: number;
}

export interface DiscoverResponse {
  items: SharedSetSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarketplaceApi {
  discoverSets(input: DiscoverQuery): Promise<DiscoverResponse>;
  getSetById(setId: string): Promise<SharedSetDetail | null>;
  publishSet(input: PublishSetInput): Promise<SharedSetSummary>;
}

export interface ImportedSetLink {
  remoteSetId: string;
  remoteVersion: number;
  localSetId: string;
  importedAt: number;
  questionLinks?: ImportedQuestionLink[];
}

export interface ImportedQuestionLink {
  remoteQuestionId: string;
  localQuestionId: string;
}

export interface PublishQuestionInput {
  remoteQuestionId: string;
  content: string;
  rationale: string;
  options: string[];
  answers: string[];
  tags: string[];
  orderIndex: number;
}

export interface PublishSetInput {
  title: string;
  description: string;
  subject: NursingSubject;
  tags: string[];
  visibility: SharedSetVisibility;
  questions: PublishQuestionInput[];
}
