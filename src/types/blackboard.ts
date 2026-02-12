
export interface BlackboardCourse {
  id: string;
  courseId: string; // The display ID, e.g., "CS101"
  name: string;
  description?: string;
  organization?: boolean;
  created: string;
  termId?: string;
  enrollment?: {
    type: 'Student';
    role: string;
  };
}

export interface BlackboardAssignment {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  dueDate?: string;
  pointsPossible: number;
  position?: number;
}

export interface BlackboardGrade {
  id: string; // Grade column ID
  courseId: string;
  name: string;
  score?: number;
  possible?: number;
  status: 'Graded' | 'NeedsGrading' | 'Exempt' | 'Incomplete';
  feedback?: string;
}

export interface BlackboardContent {
  id: string;
  courseId: string;
  title: string;
  body?: string;
  description?: string;
  created: string;
  modified: string;
  position: number;
  hasChildren: boolean;
  parentId?: string;
  link?: string | { url: string; target?: string }; // If it's a link to a file or external resource
  mimeType?: string; // To distinguish between folder, file, assignment, etc.
}

export interface BlackboardToken {
  access_token: string;
  token_type: string; // 'Bearer' or 'Cookie'
  expires_in: number;
  refresh_token?: string;
  scope: string;
  user_id: string;
}
