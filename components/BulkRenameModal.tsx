import React from 'react';
import { Copy } from 'lucide-react';

interface BulkRenameModalProps {
  oldName: string;
  newName: string;
  count: number;
  onConfirmAll: () => void;
  onConfirmSingle: () => void;
  onCancel: () => void;
}

export const BulkRenameModal: React.FC<BulkRenameModalProps> = ({
  oldName,
  newName,
  count,
  onConfirmAll,
  onConfirmSingle,
  onCancel
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 rounded-xl backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm animate-scale-in">
        <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
          <Copy className="w-5 h-5 mr-2 text-blue-600" />
          Apply to all?
        </h4>
        <p className="text-sm text-slate-600 mb-4">
          You renamed <strong>&ldquo;{oldName}&rdquo;</strong> to <strong>&ldquo;{newName}&rdquo;</strong>.
          <br /><br />
          There are <strong>{count}</strong> other transactions with this category.
          Do you want to update them all?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirmAll}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Yes, Update All ({count + 1})
          </button>
          <button
            onClick={onConfirmSingle}
            className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
          >
            No, Only This One
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
