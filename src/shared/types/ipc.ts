// Shared IPC response types used by both main and renderer processes

export interface WorkspaceDirResponse {
  workspaceDir: string;
}

export interface SuccessResponse {
  success: boolean;
  error?: string;
}

export type ChatModelPreference = 'fast' | 'smart-sonnet' | 'smart-opus';
export type SmartModelVariant = 'sonnet' | 'opus';

export interface SerializedAttachmentPayload {
  name: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer | Uint8Array;
}

export interface SendMessagePayload {
  text: string;
  attachments?: SerializedAttachmentPayload[];
}

export interface GetChatModelPreferenceResponse {
  preference: ChatModelPreference;
}

export interface SetChatModelPreferenceResponse extends SuccessResponse {
  preference: ChatModelPreference;
}

export interface SavedAttachmentInfo {
  name: string;
  mimeType: string;
  size: number;
  savedPath: string;
  relativePath: string;
}

export interface SendMessageResponse {
  success: boolean;
  error?: string;
  attachments?: SavedAttachmentInfo[];
}

export interface ShellResponse {
  success: boolean;
  error?: string;
}

// OAuth types
export type AuthMode = 'max' | 'console';

export interface OAuthStartLoginResponse {
  success: boolean;
  authUrl?: string;
  error?: string;
}

export interface OAuthCompleteLoginResponse {
  success: boolean;
  mode?: 'oauth' | 'api-key';
  apiKey?: string;
  error?: string;
}

export interface OAuthStatusResponse {
  authenticated: boolean;
  expiresAt: number | null;
}

export interface OAuthAccessTokenResponse {
  success: boolean;
  accessToken?: string | null;
  error?: string;
}
