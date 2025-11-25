import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Workspace {
  id: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  status: string;
  installedBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    aliases: number;
  };
}

export interface ChannelAlias {
  id: string;
  workspaceId: string;
  slackChannelId: string;
  slackChannelName?: string;
  emailAddress: string;
  isPrivate: boolean;
  isActive: boolean;
  recipients: string[];
  createdAt: string;
  updatedAt: string;
  workspace?: {
    teamName: string;
    teamId: string;
  };
}

export interface MessageLog {
  id: string;
  direction: 'EMAIL_TO_SLACK' | 'SLACK_TO_EMAIL';
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  emailMessageId?: string;
  slackMessageTs?: string;
  errorMessage?: string;
  createdAt: string;
  channelAlias?: {
    slackChannelName?: string;
    emailAddress: string;
  };
  workspace?: {
    teamName: string;
  };
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  hasAlias?: boolean;
}

export interface MessageStats {
  timeRange: string;
  startDate: string;
  stats: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: string;
  };
  byDirection: {
    emailToSlack: number;
    slackToEmail: number;
  };
}

// API functions
export const workspacesApi = {
  list: () => api.get<Workspace[]>('/api/workspaces'),
  get: (id: string) => api.get<Workspace>(`/api/workspaces/${id}`),
  getChannels: (id: string, includePrivate = true) =>
    api.get<SlackChannel[]>(`/api/workspaces/${id}/channels`, {
      params: { includePrivate },
    }),
  disconnect: (id: string) => api.delete(`/api/workspaces/${id}`),
};

export const aliasesApi = {
  list: (params?: { page?: number; limit?: number; workspaceId?: string }) =>
    api.get<{
      data: ChannelAlias[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/api/aliases', { params }),
  get: (id: string) => api.get<ChannelAlias>(`/api/aliases/${id}`),
  create: (data: {
    workspaceId: string;
    slackChannelId: string;
    slackChannelName?: string;
    emailAddress: string;
    isPrivate?: boolean;
    recipients: string[];
  }) => api.post<ChannelAlias>('/api/aliases', data),
  update: (
    id: string,
    data: {
      slackChannelName?: string;
      emailAddress?: string;
      recipients?: string[];
      isActive?: boolean;
    }
  ) => api.patch<ChannelAlias>(`/api/aliases/${id}`, data),
  delete: (id: string) => api.delete(`/api/aliases/${id}`),
};

export const messagesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    direction?: 'EMAIL_TO_SLACK' | 'SLACK_TO_EMAIL';
    status?: 'PENDING' | 'DELIVERED' | 'FAILED';
    workspaceId?: string;
  }) =>
    api.get<{
      data: MessageLog[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/api/messages', { params }),
  get: (id: string) => api.get<MessageLog>(`/api/messages/${id}`),
  retry: (id: string) => api.post(`/api/messages/${id}/retry`),
  stats: (timeRange?: '24h' | '7d' | '30d') =>
    api.get<MessageStats>('/api/messages/stats/summary', {
      params: { timeRange },
    }),
};
