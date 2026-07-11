'use client';

/**
 * ConflictResolutionModal
 *
 * Shown when the sync engine detects a conflict between the local
 * offline change and the server's version. The user can choose to
 * keep their local version or accept the server's version.
 */

import React from 'react';

export interface ConflictItem {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
}

interface Props {
  conflicts: ConflictItem[];
  onResolve: (
    conflictId: string,
    resolution: 'keep_local' | 'keep_remote',
  ) => void;
  onDismissAll: () => void;
}

export function ConflictResolutionModal({
  conflicts,
  onResolve,
  onDismissAll,
}: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2
          id="conflict-dialog-title"
          className="mb-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          Sync Conflicts Detected
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {conflicts.length} change{conflicts.length > 1 ? 's' : ''} could not
          be applied automatically. Choose which version to keep.
        </p>

        <ul className="max-h-72 divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
          {conflicts.map((c) => (
            <li key={c.id} className="py-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                {c.entityType} — {c.entityId.slice(0, 8)}…
              </p>
              <div className="mb-2 flex gap-3 text-xs">
                <div className="flex-1 rounded bg-amber-50 p-2 dark:bg-amber-900/20">
                  <p className="mb-1 font-semibold text-amber-700 dark:text-amber-400">
                    Your change
                  </p>
                  <pre className="overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {JSON.stringify(c.localData, null, 2)}
                  </pre>
                </div>
                <div className="flex-1 rounded bg-blue-50 p-2 dark:bg-blue-900/20">
                  <p className="mb-1 font-semibold text-blue-700 dark:text-blue-400">
                    Server version
                  </p>
                  <pre className="overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {JSON.stringify(c.serverData, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(c.id, 'keep_local')}
                  className="flex-1 rounded border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  Keep mine
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(c.id, 'keep_remote')}
                  className="flex-1 rounded border border-blue-400 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Use server version
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onDismissAll}
            className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Dismiss all
          </button>
        </div>
      </div>
    </div>
  );
}
