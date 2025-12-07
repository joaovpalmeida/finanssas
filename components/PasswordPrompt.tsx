
import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle, Loader2 } from 'lucide-react';

interface PasswordPromptProps {
  onUnlock: (password: string) => Promise<boolean>;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    // Give UI a moment to show loader before heavy crypto work
    setTimeout(async () => {
        try {
            const success = await onUnlock(password);
            if (!success) {
                setError("Incorrect password. Please try again.");
            }
        } catch (e) {
            setError("Failed to unlock database.");
        } finally {
            setLoading(false);
        }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8 animate-scale-in">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Database Locked</h2>
          <p className="text-slate-500 text-center mt-2">
            Your financial data is encrypted. Please enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Unlock className="w-5 h-5 mr-2" /> Unlock</>}
          </button>
        </form>
      </div>
    </div>
  );
};
