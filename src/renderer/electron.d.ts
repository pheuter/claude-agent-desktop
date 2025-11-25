import type {
  ChatModelPreference,
  GetChatModelPreferenceResponse,
  SendMessagePayload,
  SendMessageResponse,
  SetChatModelPreferenceResponse
} from '../shared/types/ipc';

export type ChatResponse = SendMessageResponse;

export interface WorkspaceResponse {
  workspaceDir: string;
}

export interface SetWorkspaceResponse {
  success: boolean;
  error?: string;
}

export interface PathInfoResponse {
  platform: string;
  pathSeparator: string;
  pathEntries: string[];
  pathCount: number;
  fullPath: string;
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface EnvVarsResponse {
  envVars: EnvVar[];
  count: number;
}

export interface DiagnosticMetadataResponse {
  appVersion: string;
  electronVersion: string;
  chromiumVersion: string;
  v8Version: string;
  nodeVersion: string;
  claudeAgentSdkVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
  osVersion: string;
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  streamIndex: number;
}

export interface ToolInputDelta {
  index: number;
  toolId: string;
  delta: string;
}

export interface ContentBlockStop {
  index: number;
  toolId?: string;
}

export interface ToolResultStart {
  toolUseId: string;
  content: string;
  isError: boolean;
}

export interface ToolResultDelta {
  toolUseId: string;
  delta: string;
}

export interface ToolResultComplete {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface UpdateStatus {
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  downloadProgress: number;
  readyToInstall: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
  lastCheckComplete: boolean;
}

export interface ThinkingStart {
  index: number;
}

export interface ThinkingChunk {
  index: number;
  delta: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: string; // JSON stringified Message[]
  createdAt: number;
  updatedAt: number;
  sessionId?: string | null;
}

export interface ConversationListResponse {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

export interface ConversationGetResponse {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

export interface ConversationCreateResponse {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

export interface ConversationUpdateResponse {
  success: boolean;
  error?: string;
}

export interface ConversationDeleteResponse {
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  onNavigate: (callback: (view: string) => void) => () => void;
  chat: {
    sendMessage: (payload: SendMessagePayload) => Promise<ChatResponse>;
    stopMessage: () => Promise<{ success: boolean; error?: string }>;
    resetSession: (
      resumeSessionId?: string | null
    ) => Promise<{ success: boolean; error?: string }>;
    getModelPreference: () => Promise<GetChatModelPreferenceResponse>;
    setModelPreference: (
      preference: ChatModelPreference
    ) => Promise<SetChatModelPreferenceResponse>;
    onMessageChunk: (callback: (chunk: string) => void) => () => void;
    onThinkingStart: (callback: (data: ThinkingStart) => void) => () => void;
    onThinkingChunk: (callback: (data: ThinkingChunk) => void) => () => void;
    onMessageComplete: (callback: () => void) => () => void;
    onMessageStopped: (callback: () => void) => () => void;
    onMessageError: (callback: (error: string) => void) => () => void;
    onDebugMessage: (callback: (message: string) => void) => () => void;
    onToolUseStart: (callback: (tool: ToolUse) => void) => () => void;
    onToolInputDelta: (callback: (data: ToolInputDelta) => void) => () => void;
    onContentBlockStop: (callback: (data: ContentBlockStop) => void) => () => void;
    onToolResultStart: (callback: (data: ToolResultStart) => void) => () => void;
    onToolResultDelta: (callback: (data: ToolResultDelta) => void) => () => void;
    onToolResultComplete: (callback: (data: ToolResultComplete) => void) => () => void;
    onSessionUpdated: (
      callback: (data: { sessionId: string; resumed: boolean }) => void
    ) => () => void;
  };
  config: {
    getWorkspaceDir: () => Promise<WorkspaceResponse>;
    setWorkspaceDir: (workspaceDir: string) => Promise<SetWorkspaceResponse>;
    getDebugMode: () => Promise<{ debugMode: boolean }>;
    setDebugMode: (debugMode: boolean) => Promise<{ success: boolean }>;
    getPathInfo: () => Promise<PathInfoResponse>;
    getEnvVars: () => Promise<EnvVarsResponse>;
    getDiagnosticMetadata: () => Promise<DiagnosticMetadataResponse>;
    getApiKeyStatus: () => Promise<{
      status: { configured: boolean; source: 'env' | 'local' | null; lastFour: string | null };
    }>;
    setApiKey: (apiKey?: string | null) => Promise<{
      success: boolean;
      status: { configured: boolean; source: 'env' | 'local' | null; lastFour: string | null };
    }>;
    getBaseUrlStatus: () => Promise<{
      status: { configured: boolean; source: 'env' | 'local' | null; url: string | null };
    }>;
    setBaseUrl: (baseUrl?: string | null) => Promise<{
      success: boolean;
      status: { configured: boolean; source: 'env' | 'local' | null; url: string | null };
    }>;
  };
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };
  oauth: {
    startLogin: (mode: AuthMode) => Promise<OAuthStartLoginResponse>;
    completeLogin: (code: string, createKey?: boolean) => Promise<OAuthCompleteLoginResponse>;
    cancel: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<OAuthStatusResponse>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    getAccessToken: () => Promise<OAuthAccessTokenResponse>;
  };
  conversation: {
    list: () => Promise<ConversationListResponse>;
    create: (messages: unknown[], sessionId?: string | null) => Promise<ConversationCreateResponse>;
    get: (id: string) => Promise<ConversationGetResponse>;
    update: (
      id: string,
      title?: string,
      messages?: unknown[],
      sessionId?: string | null
    ) => Promise<ConversationUpdateResponse>;
    delete: (id: string) => Promise<ConversationDeleteResponse>;
  };
  update: {
    getStatus: () => Promise<UpdateStatus>;
    check: () => Promise<{ success: boolean }>;
    download: () => Promise<{ success: boolean }>;
    install: () => Promise<{ success: boolean }>;
    onStatusChanged: (callback: (status: UpdateStatus) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
