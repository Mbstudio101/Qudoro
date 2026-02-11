
import { BlackboardCourse, BlackboardGrade, BlackboardContent } from '../types/blackboard';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  user_id: string;
}

interface RawCourse {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  created: string;
  termId?: string;
  organization?: boolean;
  enrollment?: unknown;
}

interface RawContent {
  id: string;
  title: string;
  body?: string;
  description?: string;
  created: string;
  modified: string;
  position: number;
  hasChildren: boolean;
  parentId?: string;
  link?: { url: string; target: string };
  contentHandler?: { id: string };
}

interface RawColumn {
  id: string;
  name: string;
  score?: { possible: number };
}

interface RawGrade {
  score: number;
  status: string;
  feedback?: string;
}

export class BlackboardClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  static async exchangeAuthCode(baseUrl: string, clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<TokenResponse> {
    const url = `${baseUrl.replace(/\/$/, '')}/learn/api/public/v1/oauth2/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    // Basic Auth
    const auth = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: params
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Token exchange failed: ${text}`);
    }

    return response.json();
  }

  private async request<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
    // Determine API version based on endpoint if needed, but usually v1 or v3
    // We'll default to v1 unless specified in the endpoint path passed
    const url = `${this.baseUrl}/learn/api/public/v1${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Blackboard API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // --- Courses ---
  async getCourses(): Promise<BlackboardCourse[]> {
    // V3 is often used for courses
    const url = `${this.baseUrl}/learn/api/public/v3/courses?limit=100&sort=created(desc)`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    
    if (!response.ok) throw new Error('Failed to fetch courses');
    
    const data = await response.json();
    return data.results.map((c: RawCourse) => ({
      id: c.id,
      courseId: c.courseId,
      name: c.name,
      description: c.description,
      created: c.created,
      termId: c.termId,
      organization: c.organization,
      enrollment: c.enrollment
    }));
  }

  // --- Contents (Syllabus, Assignments) ---
  async getCourseContents(courseId: string): Promise<BlackboardContent[]> {
    const data = await this.request<{ results: RawContent[] }>(`/courses/${courseId}/contents?recursive=true`);
    return data.results.map((c: RawContent) => ({
      id: c.id,
      courseId: courseId,
      title: c.title,
      body: c.body,
      description: c.description,
      created: c.created,
      modified: c.modified,
      position: c.position,
      hasChildren: c.hasChildren,
      parentId: c.parentId,
      link: c.link,
      mimeType: c.contentHandler?.id // e.g., 'resource/x-bb-assignment'
    }));
  }

  // --- Grades ---
  async getCourseGrades(courseId: string, userId = 'me'): Promise<BlackboardGrade[]> {
    // 1. Get Gradebook Columns
    // 2. Get Grades for user
    
    // Simplification: We might need to iterate columns. 
    // Or use the Gradebook View endpoint if available.
    
    // fetching columns
    const columnsData = await this.request<{ results: RawColumn[] }>(`/courses/${courseId}/gradebook/columns`);
    
    const grades: BlackboardGrade[] = [];
    
    // This is N+1, be careful. But for a single user 'me', it might be optimized?
    // Actually, getting grades for a specific user usually requires iterating columns or a specific endpoint.
    // Try: /learn/api/public/v2/courses/{courseId}/gradebook/users/{userId} ? No.
    
    // Correct way: /learn/api/public/v1/courses/{courseId}/gradebook/users/{userId} doesn't exist.
    // We must list grades for a course: /learn/api/public/v1/courses/{courseId}/gradebook/grades?userId={userId} (Only for instructors usually?)
    
    // For students: 
    // We iterate columns.
    
    // Filter for meaningful columns (not calculated, maybe?)
    const validColumns = columnsData.results; // .filter(c => !c.calculated);

    for (const col of validColumns) {
        try {
            const gradeData = await this.request<RawGrade>(`/courses/${courseId}/gradebook/columns/${col.id}/users/${userId}`);
            
            // If grade exists
            if (gradeData) {
                grades.push({
                    id: col.id,
                    courseId: courseId,
                    name: col.name,
                    score: gradeData.score,
                    possible: col.score?.possible || 100, // API structure varies
                    status: gradeData.status, // 'Graded', 'NeedsGrading'
                    feedback: gradeData.feedback
                });
            }
        } catch (e) {
            // Ignore if no grade found for this column
        }
    }

    return grades;
  }
}
