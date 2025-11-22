import { generatePKCE } from '@openauthjs/openauth/pkce';

import type { AppConfig } from './config';
import { loadConfig, saveConfig } from './config';

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTHORIZATION_ENDPOINT_MAX = 'https://claude.ai/oauth/authorize';
const AUTHORIZATION_ENDPOINT_CONSOLE = 'https://console.anthropic.com/oauth/authorize';
const TOKEN_ENDPOINT = 'https://console.anthropic.com/v1/oauth/token';
const REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
const CREATE_API_KEY_ENDPOINT = 'https://api.anthropic.com/api/oauth/claude_cli/create_api_key';
const SCOPES = 'org:create_api_key user:profile user:inference';

export interface OAuthTokens {
  type: 'oauth';
  refresh: string;
  access: string;
  expires: number;
}

export interface PKCEChallenge {
  challenge: string;
  verifier: string;
}

export type AuthMode = 'max' | 'console';

/**
 * Generate PKCE challenge and verifier for secure OAuth flow
 */
export async function generatePKCEChallenge(): Promise<PKCEChallenge> {
  const pkce = await generatePKCE();
  return {
    challenge: pkce.challenge,
    verifier: pkce.verifier
  };
}

/**
 * Generate the OAuth authorization URL
 */
export function getAuthorizationUrl(mode: AuthMode, pkce: PKCEChallenge): string {
  const baseUrl = mode === 'max' ? AUTHORIZATION_ENDPOINT_MAX : AUTHORIZATION_ENDPOINT_CONSOLE;
  const url = new URL(baseUrl);

  url.searchParams.set('code', 'true');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', pkce.verifier);

  return url.toString();
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<OAuthTokens | null> {
  try {
    // The code might contain the state appended with #
    const splits = code.split('#');
    const authCode = splits[0];
    const state = splits[1];

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: authCode,
        state: state,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    });

    if (!response.ok) {
      console.error('Failed to exchange code for tokens:', response.statusText);
      return null;
    }

    const json = await response.json();

    return {
      type: 'oauth',
      refresh: json.refresh_token,
      access: json.access_token,
      expires: Date.now() + json.expires_in * 1000
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID
      })
    });

    if (!response.ok) {
      console.error('Failed to refresh access token:', response.statusText);
      return null;
    }

    const json = await response.json();

    return {
      type: 'oauth',
      refresh: json.refresh_token,
      access: json.access_token,
      expires: Date.now() + json.expires_in * 1000
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Create an API key using OAuth credentials
 */
export async function createApiKey(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(CREATE_API_KEY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to create API key:', response.statusText);
      return null;
    }

    const json = await response.json();
    return json.raw_key;
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

/**
 * Save OAuth tokens to config
 */
export function saveOAuthTokens(tokens: OAuthTokens): void {
  const config: AppConfig = loadConfig();
  config.oauthTokens = tokens;
  saveConfig(config);
}

/**
 * Get OAuth tokens from config
 */
export function getOAuthTokens(): OAuthTokens | null {
  const config = loadConfig();
  return config.oauthTokens || null;
}

/**
 * Remove OAuth tokens from config
 */
export function clearOAuthTokens(): void {
  const config = loadConfig();
  delete config.oauthTokens;
  saveConfig(config);
}

/**
 * Check if access token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(tokens: OAuthTokens): boolean {
  const fiveMinutes = 5 * 60 * 1000;
  return tokens.expires < Date.now() + fiveMinutes;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getOAuthTokens();
  if (!tokens) {
    return null;
  }

  if (isTokenExpired(tokens)) {
    console.log('Access token expired, refreshing...');
    const newTokens = await refreshAccessToken(tokens.refresh);
    if (!newTokens) {
      console.error('Failed to refresh token');
      return null;
    }
    saveOAuthTokens(newTokens);
    return newTokens.access;
  }

  return tokens.access;
}
