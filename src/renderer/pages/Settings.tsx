import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SettingsProps {
  onBack: () => void;
}

type ApiKeyStatus = {
  configured: boolean;
  source: 'env' | 'local' | null;
  lastFour: string | null;
};

type BaseUrlStatus = {
  configured: boolean;
  source: 'env' | 'local' | null;
  url: string | null;
};

function Settings({ onBack }: SettingsProps) {
  const [workspaceDir, setWorkspaceDir] = useState('');
  const [currentWorkspaceDir, setCurrentWorkspaceDir] = useState('');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [workspaceSaveStatus, setWorkspaceSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const [debugMode, setDebugMode] = useState(false);
  const [isLoadingDebugMode, setIsLoadingDebugMode] = useState(true);
  const [isSavingDebugMode, setIsSavingDebugMode] = useState(false);

  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [isBaseUrlExpanded, setIsBaseUrlExpanded] = useState(false);
  const [pathInfo, setPathInfo] = useState<{
    platform: string;
    pathSeparator: string;
    pathEntries: string[];
    pathCount: number;
    fullPath: string;
  } | null>(null);
  const [isLoadingPathInfo, setIsLoadingPathInfo] = useState(false);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }> | null>(null);
  const [isLoadingEnvVars, setIsLoadingEnvVars] = useState(false);
  const [diagnosticMetadata, setDiagnosticMetadata] = useState<{
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
  } | null>(null);
  const [isLoadingDiagnosticMetadata, setIsLoadingDiagnosticMetadata] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    configured: false,
    source: null,
    lastFour: null
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeySaveState, setApiKeySaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [baseUrlStatus, setBaseUrlStatus] = useState<BaseUrlStatus>({
    configured: false,
    source: null,
    url: null
  });
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [isSavingBaseUrl, setIsSavingBaseUrl] = useState(false);
  const [baseUrlSaveState, setBaseUrlSaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [oauthStatus, setOAuthStatus] = useState<{
    authenticated: boolean;
    expiresAt: number | null;
  } | null>(null);
  const [oauthCode, setOAuthCode] = useState('');
  const [isOAuthLoginInProgress, setIsOAuthLoginInProgress] = useState(false);
  const [oauthLoginState, setOAuthLoginState] = useState<'idle' | 'success' | 'error'>('idle');
  const [oauthErrorMessage, setOAuthErrorMessage] = useState('');

  useEffect(() => {
    // Load current workspace directory
    window.electron.config
      .getWorkspaceDir()
      .then((response) => {
        setCurrentWorkspaceDir(response.workspaceDir);
        setIsLoadingWorkspace(false);
      })
      .catch(() => {
        setIsLoadingWorkspace(false);
      });

    // Load current debug mode
    window.electron.config
      .getDebugMode()
      .then((response) => {
        setDebugMode(response.debugMode);
        setIsLoadingDebugMode(false);
      })
      .catch(() => {
        setIsLoadingDebugMode(false);
      });

    // Load API key status
    window.electron.config
      .getApiKeyStatus()
      .then((response) => {
        setApiKeyStatus(response.status);
      })
      .catch(() => {
        // ignore - will show as not configured
      });

    // Load base URL status
    window.electron.config
      .getBaseUrlStatus()
      .then((response) => {
        setBaseUrlStatus(response.status);
      })
      .catch(() => {
        // ignore - will show as not configured
      });

    // Load OAuth status
    window.electron.oauth
      .getStatus()
      .then((response) => {
        setOAuthStatus(response);
      })
      .catch(() => {
        // ignore - will show as not authenticated
      });
  }, []);

  const loadPathInfo = async () => {
    setIsLoadingPathInfo(true);
    try {
      const info = await window.electron.config.getPathInfo();
      setPathInfo(info);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingPathInfo(false);
    }
  };

  const loadEnvVars = async () => {
    setIsLoadingEnvVars(true);
    try {
      const response = await window.electron.config.getEnvVars();
      setEnvVars(response.envVars);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingEnvVars(false);
    }
  };

  const loadDiagnosticMetadata = async () => {
    setIsLoadingDiagnosticMetadata(true);
    try {
      const metadata = await window.electron.config.getDiagnosticMetadata();
      setDiagnosticMetadata(metadata);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingDiagnosticMetadata(false);
    }
  };

  useEffect(() => {
    // Load path info, env vars, and diagnostic metadata when debug section is expanded
    if (isDebugExpanded) {
      if (!pathInfo) {
        loadPathInfo();
      }
      if (!envVars) {
        loadEnvVars();
      }
      if (!diagnosticMetadata) {
        loadDiagnosticMetadata();
      }
    }
  }, [isDebugExpanded, pathInfo, envVars, diagnosticMetadata]);

  useEffect(() => {
    // Handle Escape key to go back to main view
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack]);

  const handleSaveWorkspace = async () => {
    setIsSavingWorkspace(true);
    setWorkspaceSaveStatus('idle');

    try {
      const response = await window.electron.config.setWorkspaceDir(workspaceDir);
      if (response.success) {
        setWorkspaceSaveStatus('success');
        setWorkspaceDir('');
        // Reload workspace directory
        const workspaceResponse = await window.electron.config.getWorkspaceDir();
        setCurrentWorkspaceDir(workspaceResponse.workspaceDir);
        setTimeout(() => setWorkspaceSaveStatus('idle'), 2000);
      } else {
        setWorkspaceSaveStatus('error');
        setTimeout(() => setWorkspaceSaveStatus('idle'), 3000);
      }
    } catch (_error) {
      setWorkspaceSaveStatus('error');
      setTimeout(() => setWorkspaceSaveStatus('idle'), 3000);
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleToggleDebugMode = async () => {
    setIsSavingDebugMode(true);
    const newValue = !debugMode;
    const previousValue = debugMode;

    try {
      await window.electron.config.setDebugMode(newValue);
      setDebugMode(newValue);
    } catch (_error) {
      // Revert on error
      setDebugMode(previousValue);
    } finally {
      setIsSavingDebugMode(false);
    }
  };

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true);
    setApiKeySaveState('idle');

    try {
      const response = await window.electron.config.setApiKey(apiKeyInput);
      setApiKeyStatus(response.status);
      setApiKeyInput('');
      setApiKeySaveState('success');
      setTimeout(() => setApiKeySaveState('idle'), 2000);
    } catch (_error) {
      setApiKeySaveState('error');
      setTimeout(() => setApiKeySaveState('idle'), 2500);
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleClearStoredApiKey = async () => {
    setIsSavingApiKey(true);
    setApiKeySaveState('idle');
    try {
      const response = await window.electron.config.setApiKey(null);
      setApiKeyStatus(response.status);
      setApiKeyInput('');
      setApiKeySaveState('success');
      setTimeout(() => setApiKeySaveState('idle'), 2000);
    } catch (_error) {
      setApiKeySaveState('error');
      setTimeout(() => setApiKeySaveState('idle'), 2500);
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleSaveBaseUrl = async () => {
    setIsSavingBaseUrl(true);
    setBaseUrlSaveState('idle');

    try {
      const response = await window.electron.config.setBaseUrl(baseUrlInput);
      setBaseUrlStatus(response.status);
      setBaseUrlInput('');
      setBaseUrlSaveState('success');
      setTimeout(() => setBaseUrlSaveState('idle'), 2000);
    } catch (_error) {
      setBaseUrlSaveState('error');
      setTimeout(() => setBaseUrlSaveState('idle'), 2500);
    } finally {
      setIsSavingBaseUrl(false);
    }
  };

  const handleClearStoredBaseUrl = async () => {
    setIsSavingBaseUrl(true);
    setBaseUrlSaveState('idle');
    try {
      const response = await window.electron.config.setBaseUrl(null);
      setBaseUrlStatus(response.status);
      setBaseUrlInput('');
      setBaseUrlSaveState('success');
      setTimeout(() => setBaseUrlSaveState('idle'), 2000);
    } catch (_error) {
      setBaseUrlSaveState('error');
      setTimeout(() => setBaseUrlSaveState('idle'), 2500);
    } finally {
      setIsSavingBaseUrl(false);
    }
  };

  const handleOAuthLogin = async (mode: 'max' | 'console', createKey = false) => {
    setIsOAuthLoginInProgress(true);
    setOAuthLoginState('idle');
    setOAuthErrorMessage('');

    try {
      const response = await window.electron.oauth.startLogin(mode);
      if (!response.success) {
        setOAuthErrorMessage(response.error || 'Failed to start OAuth login');
        setOAuthLoginState('error');
        setTimeout(() => setOAuthLoginState('idle'), 3000);
        setIsOAuthLoginInProgress(false);
        return;
      }

      // User needs to paste the code in the input field
      // The login will be completed when they submit the code
    } catch (error) {
      setOAuthErrorMessage('Failed to start OAuth login');
      setOAuthLoginState('error');
      setTimeout(() => setOAuthLoginState('idle'), 3000);
      setIsOAuthLoginInProgress(false);
    }
  };

  const handleCompleteOAuthLogin = async (createKey = false) => {
    if (!oauthCode.trim()) {
      return;
    }

    setOAuthLoginState('idle');
    setOAuthErrorMessage('');

    try {
      const response = await window.electron.oauth.completeLogin(oauthCode.trim(), createKey);
      if (!response.success) {
        setOAuthErrorMessage(response.error || 'Failed to complete OAuth login');
        setOAuthLoginState('error');
        setTimeout(() => setOAuthLoginState('idle'), 3000);
        return;
      }

      if (response.mode === 'api-key' && response.apiKey) {
        // API key was created via OAuth
        const apiKeyResponse = await window.electron.config.setApiKey(response.apiKey);
        setApiKeyStatus(apiKeyResponse.status);
      }

      setOAuthLoginState('success');
      setOAuthCode('');
      setIsOAuthLoginInProgress(false);

      // Reload OAuth status
      const statusResponse = await window.electron.oauth.getStatus();
      setOAuthStatus(statusResponse);

      setTimeout(() => setOAuthLoginState('idle'), 2000);
    } catch (error) {
      setOAuthErrorMessage('Failed to complete OAuth login');
      setOAuthLoginState('error');
      setTimeout(() => setOAuthLoginState('idle'), 3000);
    }
  };

  const handleOAuthLogout = async () => {
    try {
      await window.electron.oauth.logout();
      setOAuthStatus({ authenticated: false, expiresAt: null });
    } catch (error) {
      // ignore
    }
  };

  const handleCancelOAuth = () => {
    window.electron.oauth.cancel();
    setIsOAuthLoginInProgress(false);
    setOAuthCode('');
    setOAuthLoginState('idle');
    setOAuthErrorMessage('');
  };

  const isFormLoading = isLoadingWorkspace || isLoadingDebugMode;
  const apiKeyPlaceholder = apiKeyStatus.lastFour ? `...${apiKeyStatus.lastFour}` : 'sk-ant-...';

  return (
    <div className="flex h-screen flex-col bg-linear-to-b from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="fixed top-0 right-0 left-0 z-50 h-12 [-webkit-app-region:drag]" />

      <div className="flex flex-1 flex-col overflow-hidden pt-12">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-16">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                  Settings
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Configure API access and workspace directory for Claude Agent Desktop.
                </p>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors [-webkit-app-region:no-drag] hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:text-neutral-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <div className="rounded-3xl border border-neutral-200/80 bg-white/95 p-6 shadow-2xl shadow-neutral-200/60 [-webkit-app-region:no-drag] dark:border-neutral-800 dark:bg-neutral-900/70 dark:shadow-black/40">
              {isFormLoading ?
                <div className="flex items-center justify-center py-12 text-sm text-neutral-500 dark:text-neutral-400">
                  Loading settings...
                </div>
              : <div className="space-y-8">
                  {/* Anthropic API Key */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Anthropic API Key
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Set an API key locally or use the <code>ANTHROPIC_API_KEY</code> environment
                        variable.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            apiKeyStatus.configured ?
                              'text-neutral-800 dark:text-neutral-100'
                            : 'text-neutral-500 dark:text-neutral-500'
                          }`}
                        >
                          {apiKeyStatus.configured ?
                            apiKeyStatus.source === 'env' ?
                              'Using environment key'
                            : 'Stored locally'
                          : 'No key configured'}
                        </span>
                        {apiKeyStatus.lastFour && apiKeyStatus.configured && (
                          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
                            ...{apiKeyStatus.lastFour}
                          </span>
                        )}
                      </div>
                      {apiKeyStatus.source === 'env' && (
                        <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase dark:bg-neutral-50 dark:text-neutral-900">
                          Env override
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <input
                        id="api-key-input"
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={apiKeyPlaceholder}
                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-3 text-right">
                        {apiKeyStatus.source === 'local' && (
                          <button
                            onClick={handleClearStoredApiKey}
                            disabled={isSavingApiKey}
                            className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/70 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-50"
                          >
                            Clear stored key
                          </button>
                        )}
                        <button
                          onClick={handleSaveApiKey}
                          disabled={!apiKeyInput.trim() || isSavingApiKey}
                          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                          {isSavingApiKey ? 'Saving...' : 'Save API Key'}
                        </button>
                        {apiKeySaveState === 'success' && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            API key saved
                          </span>
                        )}
                        {apiKeySaveState === 'error' && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            Failed to save key
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Base URL Accordion */}
                    <button
                      onClick={() => setIsBaseUrlExpanded(!isBaseUrlExpanded)}
                      className="flex w-full items-center justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50/50 px-4 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100/50 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300 dark:hover:border-neutral-700/60 dark:hover:bg-neutral-800/40"
                    >
                      <span>Specify base url</span>
                      {isBaseUrlExpanded ?
                        <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isBaseUrlExpanded && (
                      <div className="space-y-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/30 p-4 dark:border-neutral-800 dark:bg-neutral-900/20">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Custom base URL for API requests. Use <code>ANTHROPIC_BASE_URL</code>{' '}
                          environment variable or set locally (e.g., for proxies).
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${
                                baseUrlStatus.configured ?
                                  'text-neutral-700 dark:text-neutral-200'
                                : 'text-neutral-500 dark:text-neutral-500'
                              }`}
                            >
                              {baseUrlStatus.configured ?
                                baseUrlStatus.source === 'env' ?
                                  'Using environment URL'
                                : 'Stored locally'
                              : 'Using default (api.anthropic.com)'}
                            </span>
                            {baseUrlStatus.url && baseUrlStatus.configured && (
                              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
                                {baseUrlStatus.url}
                              </span>
                            )}
                          </div>
                          {baseUrlStatus.source === 'env' && (
                            <span className="rounded-full bg-neutral-900/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase dark:bg-neutral-50 dark:text-neutral-900">
                              Env
                            </span>
                          )}
                        </div>
                        <input
                          id="base-url-input"
                          type="text"
                          value={baseUrlInput}
                          onChange={(e) => setBaseUrlInput(e.target.value)}
                          placeholder={baseUrlStatus.url || 'https://api.anthropic.com'}
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
                        />
                        <div className="flex flex-wrap items-center justify-end gap-3 text-right">
                          {baseUrlStatus.source === 'local' && (
                            <button
                              onClick={handleClearStoredBaseUrl}
                              disabled={isSavingBaseUrl}
                              className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/70 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-50"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={handleSaveBaseUrl}
                            disabled={!baseUrlInput.trim() || isSavingBaseUrl}
                            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                          >
                            {isSavingBaseUrl ? 'Saving...' : 'Save'}
                          </button>
                          {baseUrlSaveState === 'success' && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              Saved
                            </span>
                          )}
                          {baseUrlSaveState === 'error' && (
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                  {/* OAuth Login */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                        OAuth Login
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Log in with your Claude Pro/Max account or create an API key via OAuth.
                      </p>
                    </div>

                    {oauthStatus?.authenticated ?
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-500/30 dark:bg-green-500/10">
                          <div>
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                              Logged in via OAuth
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Using Claude Pro/Max credentials
                            </p>
                          </div>
                          <button
                            onClick={handleOAuthLogout}
                            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-red-500/70 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-500/10"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    : <div className="space-y-3">
                        {!isOAuthLoginInProgress ?
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => handleOAuthLogin('max', false)}
                              className="flex-1 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                              Login with Claude Pro/Max
                            </button>
                            <button
                              onClick={() => handleOAuthLogin('console', true)}
                              className="flex-1 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                            >
                              Create API Key via OAuth
                            </button>
                          </div>
                        : <div className="space-y-3">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                              A browser window has been opened. Please authorize the application and paste
                              the authorization code below.
                            </div>
                            <input
                              type="text"
                              value={oauthCode}
                              onChange={(e) => setOAuthCode(e.target.value)}
                              placeholder="Paste authorization code here"
                              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
                            />
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <button
                                onClick={handleCancelOAuth}
                                className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleCompleteOAuthLogin(false)}
                                disabled={!oauthCode.trim()}
                                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                              >
                                Complete Login
                              </button>
                            </div>
                          </div>
                        }
                        {oauthLoginState === 'success' && (
                          <p className="text-xs font-medium text-green-600 dark:text-green-400">
                            OAuth login successful
                          </p>
                        )}
                        {oauthLoginState === 'error' && (
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            {oauthErrorMessage || 'OAuth login failed'}
                          </p>
                        )}
                      </div>
                    }
                  </section>

                  <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                  {/* Workspace Directory */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Workspace Directory
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Directory where files are read and written. Default: Desktop/claude-agent.
                      </p>
                    </div>
                    {currentWorkspaceDir && (
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                        {currentWorkspaceDir}
                      </div>
                    )}
                    <input
                      id="workspace-input"
                      type="text"
                      value={workspaceDir}
                      onChange={(e) => setWorkspaceDir(e.target.value)}
                      placeholder={currentWorkspaceDir || '/path/to/workspace'}
                      className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveWorkspace}
                        disabled={!workspaceDir.trim() || isSavingWorkspace}
                        className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        {isSavingWorkspace ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {workspaceSaveStatus === 'success' && (
                      <p className="text-xs font-medium text-green-600 dark:text-green-400">
                        Workspace directory updated successfully
                      </p>
                    )}
                    {workspaceSaveStatus === 'error' && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        Failed to update workspace directory
                      </p>
                    )}
                  </section>

                  <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                  {/* Diagnostics */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Diagnostics
                      </h2>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Enable debug output from Claude Code process. Messages appear inline with
                        chat responses.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {debugMode ? 'Enabled' : 'Disabled'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {debugMode ?
                            'Verbose tool output will stream with responses.'
                          : 'Keep chat replies cleaner by hiding debug events.'}
                        </p>
                      </div>
                      <button
                        id="debug-mode-toggle"
                        type="button"
                        onClick={handleToggleDebugMode}
                        disabled={isSavingDebugMode}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-transparent px-0.5 transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-neutral-900/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                          debugMode ?
                            'bg-neutral-900 dark:bg-neutral-100'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                        role="switch"
                        aria-checked={debugMode}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            debugMode ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </section>

                  <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                  {/* Developer / Debug Info Section */}
                  <section className="space-y-4">
                    <button
                      onClick={() => {
                        setIsDebugExpanded(!isDebugExpanded);
                        if (!isDebugExpanded) {
                          loadPathInfo();
                          loadEnvVars();
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-100 dark:hover:border-neutral-700/60"
                    >
                      <span>Developer / Debug Info</span>
                      {isDebugExpanded ?
                        <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isDebugExpanded && (
                      <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                        {/* App Information */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
                            App Information
                          </p>
                          {isLoadingDiagnosticMetadata ?
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Loading...
                            </p>
                          : diagnosticMetadata ?
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  App Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.appVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  Electron Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.electronVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  Chromium Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.chromiumVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  V8 Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.v8Version}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  Node.js Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.nodeVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  Claude Agent SDK Version
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.claudeAgentSdkVersion}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  Platform
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.platform} ({diagnosticMetadata.arch})
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  OS Type
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.osType}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                  OS Release
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                                  {diagnosticMetadata.osRelease}
                                </p>
                              </div>
                            </div>
                          : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Failed to load diagnostic information
                            </p>
                          }
                        </div>

                        <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
                            PATH Environment Variable
                          </p>
                          {isLoadingPathInfo ?
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Loading...
                            </p>
                          : pathInfo ?
                            <div className="space-y-2">
                              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                <span className="font-medium">Platform:</span> {pathInfo.platform}
                                {' • '}
                                <span className="font-medium">Entries:</span> {pathInfo.pathCount}
                                {' • '}
                                <span className="font-medium">Separator:</span>{' '}
                                {pathInfo.pathSeparator === ';' ? '; (Windows)' : ': (Unix)'}
                              </div>
                              <div className="max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/40">
                                <div className="space-y-1">
                                  {pathInfo.pathEntries.map((entry, index) => (
                                    <div
                                      key={index}
                                      className="font-mono text-xs text-neutral-700 dark:text-neutral-300"
                                    >
                                      <span className="text-neutral-400 dark:text-neutral-500">
                                        {String(index + 1).padStart(3, ' ')}.
                                      </span>{' '}
                                      {entry}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Failed to load PATH info
                            </p>
                          }
                        </div>

                        <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
                            All Environment Variables
                          </p>
                          {isLoadingEnvVars ?
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Loading...
                            </p>
                          : envVars ?
                            <div className="space-y-2">
                              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                <span className="font-medium">Total:</span> {envVars.length}{' '}
                                variables
                              </div>
                              <div className="max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/40">
                                <div className="space-y-1">
                                  {envVars.map((envVar, index) => (
                                    <div
                                      key={index}
                                      className="font-mono text-xs text-neutral-700 dark:text-neutral-300"
                                    >
                                      <span className="text-neutral-400 dark:text-neutral-500">
                                        {String(index + 1).padStart(3, ' ')}.
                                      </span>{' '}
                                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                        {envVar.key}
                                      </span>
                                      {' = '}
                                      <span className="text-neutral-600 dark:text-neutral-400">
                                        {envVar.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              Failed to load environment variables
                            </p>
                          }
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
