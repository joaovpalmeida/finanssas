import React, { useState } from 'react';
import { Play, Database, AlertCircle, Terminal } from 'lucide-react';
import { runQuery } from '../services/db';

export const SqlConsole: React.FC = () => {
  const [query, setQuery] = useState('SELECT * FROM transactions LIMIT 10');
  const [results, setResults] = useState<{ columns: string[], values: any[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    setError(null);
    try {
      const res = runQuery(query);
      setResults(res);
    } catch (e: any) {
      setError(e.message);
      setResults(null);
    }
  };

  const predefinedQueries = [
    { label: 'Show top expenses', sql: "SELECT category, SUM(amount) as total FROM transactions WHERE type='Expense' GROUP BY category ORDER BY total DESC" },
    { label: 'Monthly Income', sql: "SELECT strftime('%Y-%m', date) as month, SUM(amount) as income FROM transactions WHERE type='Income' GROUP BY month ORDER BY month" },
    { label: 'Transactions > $100', sql: "SELECT date, description, amount FROM transactions WHERE amount > 100 ORDER BY amount DESC" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <Terminal className="w-5 h-5 mr-2 text-blue-600" />
            SQL Console
          </h3>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center">
            <Database className="w-3 h-3 mr-1" /> SQLite In-Memory
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {predefinedQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuery(q.sql)}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-100"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-32 bg-slate-900 text-green-400 font-mono text-base sm:text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SELECT * FROM transactions..."
            />
            <button
              onClick={handleRun}
              className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-lg"
              title="Run Query"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          {results && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    {results.columns.map((col, i) => (
                      <th key={i} className="px-4 py-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.values.length > 0 ? (
                    results.values.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 font-mono text-slate-700">
                        {row.map((val: any, j: number) => (
                          <td key={j} className="px-4 py-2 whitespace-nowrap">
                            {val === null ? <span className="text-slate-400">NULL</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={results.columns.length} className="px-4 py-8 text-center text-slate-500">
                        No results returned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};