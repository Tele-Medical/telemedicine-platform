import React from 'react';
import { Conflict } from '../../contexts/SyncContext';

interface Props {
  conflict: Conflict;
  onResolve: (conflictId: string, resolution: 'keep_local' | 'keep_server', mergedData?: any) => void;
}

export function ConflictResolutionModal({ conflict, onResolve }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-red-600">Data Conflict Detected</h2>
        <p className="text-gray-600 mb-6">
          Another user modified this {conflict.entity_type} while you were offline. Please choose which version to keep.
        </p>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-blue-200 rounded p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-800 mb-2">Your Local Changes</h3>
            <pre className="text-sm overflow-auto p-2 bg-white rounded border">
              {JSON.stringify(conflict.local_data, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(conflict.conflict_id, 'keep_local', conflict.local_data)}
              className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Keep Local
            </button>
          </div>

          <div className="border border-amber-200 rounded p-4 bg-amber-50">
            <h3 className="font-semibold text-amber-800 mb-2">Server Data</h3>
            <pre className="text-sm overflow-auto p-2 bg-white rounded border">
              {JSON.stringify(conflict.server_data, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(conflict.conflict_id, 'keep_server', conflict.server_data)}
              className="mt-4 w-full bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
            >
              Keep Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
