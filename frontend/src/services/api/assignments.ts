import { apiClient } from './apiClient';
import axios from 'axios';

export interface TeacherAssignment {
  id: number;
  title: string;
  course_id: number | null;
  course_title?: string | null;
  due_date: string | null;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  total_submissions: number;
  graded_submissions: number;
  average_score: number | null;
}

export interface StudentAssignment {
  id: number;
  title: string;
  course_id: number | null;
  course_title?: string | null;
  due_date: string | null;
  max_points: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  submission_id?: number | null;
  submission_status?: string | null;
  score?: number | null;
  graded_at?: string | null;
}

export const assignmentsApi = {
  // Teacher/admin: list assignments
  listForTeacher: async () => {
    const response = await apiClient.get('/assignments');
    return response.data as {
      success: boolean;
      data: { assignments: TeacherAssignment[] };
    };
  },

  // Teacher/admin: create assignment
  create: async (payload: {
    courseId: number;
    title: string;
    description?: string;
    dueDate?: string;
    maxPoints?: number;
  }) => {
    const response = await apiClient.post('/assignments', payload);
    return response.data;
  },

  // Teacher/admin: get assignment with submissions
  getById: async (assignmentId: number | string) => {
    const response = await apiClient.get(`/assignments/${assignmentId}`);
    return response.data;
  },

  // Teacher/admin: update assignment
  update: async (
    assignmentId: number | string,
    payload: {
      title?: string;
      description?: string;
      dueDate?: string | null;
      maxPoints?: number;
      status?: 'draft' | 'published' | 'closed';
    }
  ) => {
    const response = await apiClient.put(`/assignments/${assignmentId}`, payload);
    return response.data;
  },

  // Teacher/admin: publish assignment
  publish: async (assignmentId: number | string) => {
    const response = await apiClient.post(`/assignments/${assignmentId}/publish`);
    return response.data;
  },

  // Teacher/admin: grade submission
  gradeSubmission: async (
    assignmentId: number | string,
    submissionId: number | string,
    payload: { score?: number; feedback?: string }
  ) => {
    const response = await apiClient.post(
      `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      payload
    );
    return response.data;
  },

  // Student: list assignments for current user
  listForStudent: async () => {
    const response = await apiClient.get('/assignments/student/list');
    return response.data as {
      success: boolean;
      data: { assignments: StudentAssignment[] };
    };
  },

  // Student: submit assignment
  presignAttachment: async (assignmentId: number | string, fileName: string, contentType?: string) => {
    const response = await apiClient.post(`/assignments/${assignmentId}/presign-attachment`, { fileName, contentType });
    return response.data as { success: boolean; data: { presignedUrl: string; key: string; storageUrl: string; cdnUrl: string } };
  },

  submit: async (assignmentId: number | string, payload: { content?: string; file?: File }) => {
    // If payload includes a File, try presigned upload first, fallback to multipart
    if (payload.file) {
      try {
        const presign = await (assignmentsApi as any).presignAttachment(assignmentId, payload.file.name, payload.file.type || 'application/octet-stream');
        const { presignedUrl, key, cdnUrl, storageUrl } = presign.data;

        // Upload file directly to S3 using the presigned URL (use axios to avoid apiClient interceptors)
        await axios.put(presignedUrl, payload.file, {
          headers: {
            'Content-Type': payload.file.type || 'application/octet-stream'
          }
        });

        // After successful upload, submit the assignment referencing the S3 key / URL
        const attachmentMeta = {
          filename: payload.file.name,
          key,
          url: cdnUrl || storageUrl
        };

        const contentObj = { text: payload.content || null, attachment: attachmentMeta };
        const response = await apiClient.post(`/assignments/${assignmentId}/submit`, { content: JSON.stringify(contentObj) });
        return response.data;
      } catch (err) {
        // Fallback to multipart upload if presign or PUT fails (CORS, network, etc.)
        const form = new FormData();
        if (payload.content) form.append('content', payload.content);
        form.append('attachment', payload.file);
        const response = await apiClient.post(`/assignments/${assignmentId}/submit`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
      }
    }

    const response = await apiClient.post(`/assignments/${assignmentId}/submit`, { content: payload.content });
    return response.data;
  },
};

export default assignmentsApi;


