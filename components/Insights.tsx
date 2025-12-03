import React, { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle, Send, Loader } from 'lucide-react';
import { Transaction, AiInsight } from '../types';
import { getFinancialInsights, chatWithFinanceData } from '../services/geminiService';

interface InsightsProps {
  transactions: Transaction[];
}

export const Insights: React.FC<InsightsProps> = ({ transactions }) => {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchInsights = async () => {
      setLoading(true);
      const data = await getFinancialInsights(transactions);
      if (isMounted) {
        setInsights(data);
        setLoading(false);
      }
    };

    if (transactions.length > 0) {
      fetchInsights();
    }
    
    return () => { isMounted = false; };
  }, [transactions]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    
    setChatLoading(true);
    const response = await chatWithFinanceData(chatQuery, transactions);
    setChatResponse(response);
    setChatLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'negative': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'action': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      default: return <Sparkles className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Automated Insights Section */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
          AI Financial Analysis
        </h3>
        
        {loading ? (
          <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-24 bg-white rounded-xl animate-pulse shadow-sm" />
             ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex gap-4 transition-all hover:shadow-md">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(insight.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">{insight.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{insight.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full min-h-[400px]">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Ask about your finances</h3>
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {chatResponse ? (
            <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm">
              {chatResponse}
            </div>
          ) : (
            <div className="text-center text-slate-400 mt-10">
              <p>Ask questions like:</p>
              <ul className="text-sm mt-2 space-y-2">
                <li>"How much did I spend on food?"</li>
                <li>"What was my highest expense?"</li>
                <li>"Am I saving enough?"</li>
              </ul>
            </div>
          )}
        </div>

        <form onSubmit={handleChat} className="relative">
          <input
            type="text"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Ask a question..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button 
            type="submit" 
            disabled={chatLoading || !chatQuery}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {chatLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
