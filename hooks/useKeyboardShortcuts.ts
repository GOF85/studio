'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onTab?: (tabIndex: number) => void;
  onHistorial?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options?: KeyboardShortcutsOptions) {
  const {
    onSave,
    onTab,
    onHistorial,
    enabled = true,
  } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Cmd/Ctrl + S: Manual save
      if (isCtrlOrCmd && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Cmd/Ctrl + 1-5: Switch tabs
      if (isCtrlOrCmd && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        onTab?.(tabIndex);
        return;
      }

      // Cmd/Ctrl + H: Open historial
      if (isCtrlOrCmd && e.key === 'h') {
        e.preventDefault();
        onHistorial?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onTab, onHistorial, enabled]);
}

/**
 * Show keyboard shortcut hint as toast
 */
export function showKeyboardShortcutHint(
  shortcut: string,
  action: string,
  toast: any
) {
  toast({
    title: `⌨️ ${shortcut}`,
    description: action,
    duration: 2000,
  });
}

/**
 * Get platform-specific shortcut display string
 */
export function getShortcutDisplay(isMac: boolean, key: string): string {
  const modifier = isMac ? '⌘' : 'Ctrl';
  return `${modifier}+${key}`;
}

/**
 * Check if keyboard event matches shortcut
 */
export function matchesShortcut(
  e: KeyboardEvent,
  key: string
): boolean {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  return isCtrlOrCmd && e.key.toLowerCase() === key.toLowerCase();
}
