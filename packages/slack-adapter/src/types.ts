export interface SlackClientConfig {
  botToken: string;
  teamId: string;
  logger?: any;
}

export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SlackInstallation {
  teamId: string;
  teamName: string;
  teamDomain?: string;
  teamIcon?: string;
  accessToken: string;
  botUserId: string;
  scopes: string[];
  installedBy: string;
}

export interface PostMessageParams {
  channel: string;
  text: string;
  threadTs?: string;
  blocks?: any[];
  metadata?: {
    event_type: string;
    event_payload: Record<string, any>;
  };
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  topic?: string;
  purpose?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  realName?: string;
  email?: string;
  isBot: boolean;
}

export interface SlackMessageEvent {
  type: 'message';
  subtype?: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  threadTs?: string;
  files?: SlackFileInfo[];
  botId?: string;
  team: string;
}

export interface SlackFileInfo {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  urlPrivate: string;
  urlPrivateDownload: string;
}
