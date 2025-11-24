import { History, Plus } from 'lucide-react';

interface TitleBarProps {
  onOpenHistory?: () => void;
  onNewChat?: () => void;
}

export default function TitleBar({ onOpenHistory, onNewChat }: TitleBarProps) {
  // Detect Windows platform
  const isWindows = navigator.platform.toLowerCase().includes('win');

  const hasActions = onOpenHistory || onNewChat;

  return (
    <div className="pointer-events-none fixed top-0 right-0 left-0 z-40 h-12 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md [-webkit-app-region:drag] dark:border-neutral-800 dark:bg-neutral-900/80">
      <div
        className={`pointer-events-auto flex h-full items-center pr-3 sm:pr-4 ${
          isWindows ? 'pl-3 sm:pl-4' : 'pl-16 sm:pl-20'
        }`}
      >
        {hasActions && (
          <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-2 rounded-full border border-neutral-200/60 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm shadow-black/5 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-black/20 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                title="Open chat history"
                aria-label="Open chat history"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Chats</span>
              </button>
            )}

            {onNewChat && (
              <button
                onClick={onNewChat}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/60 bg-white text-neutral-700 shadow-sm shadow-black/5 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:shadow-black/20 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                title="Start new chat"
                aria-label="Start new chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
