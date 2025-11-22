import { ipcMain, shell } from 'electron';

import {
  clearOAuthTokens,
  createApiKey,
  exchangeCodeForTokens,
  generatePKCEChallenge,
  getAuthorizationUrl,
  getOAuthTokens,
  getValidAccessToken,
  saveOAuthTokens,
  type AuthMode,
  type PKCEChallenge
} from '../lib/oauth';

// Store PKCE verifier temporarily during OAuth flow
let currentPKCEVerifier: string | null = null;

export function registerOAuthHandlers(): void {
  // Start OAuth login flow
  ipcMain.handle('oauth:start-login', async (_event, mode: AuthMode) => {
    try {
      // Generate PKCE challenge
      const pkce: PKCEChallenge = await generatePKCEChallenge();
      currentPKCEVerifier = pkce.verifier;

      // Get authorization URL
      const authUrl = getAuthorizationUrl(mode, pkce);

      // Open the authorization URL in the default browser
      await shell.openExternal(authUrl);

      return {
        success: true,
        authUrl
      };
    } catch (error) {
      console.error('Error starting OAuth login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Complete OAuth login by exchanging code for tokens
  ipcMain.handle('oauth:complete-login', async (_event, code: string, createKey = false) => {
    try {
      if (!currentPKCEVerifier) {
        return {
          success: false,
          error: 'No active OAuth flow. Please start the login process again.'
        };
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code, currentPKCEVerifier);

      if (!tokens) {
        return {
          success: false,
          error: 'Failed to exchange authorization code for tokens'
        };
      }

      // If creating an API key instead of using OAuth directly
      if (createKey) {
        const apiKey = await createApiKey(tokens.access);
        if (!apiKey) {
          return {
            success: false,
            error: 'Failed to create API key'
          };
        }

        // Clear the temporary verifier
        currentPKCEVerifier = null;

        return {
          success: true,
          apiKey,
          mode: 'api-key' as const
        };
      }

      // Save OAuth tokens
      saveOAuthTokens(tokens);

      // Clear the temporary verifier
      currentPKCEVerifier = null;

      return {
        success: true,
        mode: 'oauth' as const
      };
    } catch (error) {
      console.error('Error completing OAuth login:', error);
      currentPKCEVerifier = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Cancel OAuth flow
  ipcMain.handle('oauth:cancel', () => {
    currentPKCEVerifier = null;
    return { success: true };
  });

  // Get OAuth status
  ipcMain.handle('oauth:get-status', () => {
    const tokens = getOAuthTokens();
    return {
      authenticated: !!tokens,
      expiresAt: tokens?.expires || null
    };
  });

  // Logout (clear OAuth tokens)
  ipcMain.handle('oauth:logout', () => {
    try {
      clearOAuthTokens();
      return { success: true };
    } catch (error) {
      console.error('Error during OAuth logout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get valid access token (handles refresh if needed)
  ipcMain.handle('oauth:get-access-token', async () => {
    try {
      const accessToken = await getValidAccessToken();
      return {
        success: !!accessToken,
        accessToken
      };
    } catch (error) {
      console.error('Error getting access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
