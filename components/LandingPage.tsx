import React from 'react';
import { Shield, Lock, Cpu, LayoutDashboard, Brain, FileSpreadsheet, ArrowRight, Database, Code2 } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="space-y-16 animate-fade-in pb-12">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12 md:py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight">
          Your Finances, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Privately Managed</span>.
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Finan$$as transforms your static Excel spreadsheets into a powerful, interactive dashboard. 
          Built with a focus on absolute data privacy and enhanced by local-first AI.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button 
            onClick={onGetStarted}
            className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 transform hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

      {/* Security Section (The "How it works" core) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12 bg-slate-50 flex flex-col justify-center">
            <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Local-First Architecture</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Unlike most finance apps, Finan$$as does <strong>not</strong> have a backend database server. 
              We use <strong>SQLite Wasm</strong> to create a fully functional SQL database running entirely inside your browser's memory.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-slate-700">
                <Lock className="w-4 h-4 mr-3 text-emerald-500" />
                Data never leaves your device (except for AI Analysis)
              </li>
              <li className="flex items-center text-slate-700">
                <Database className="w-4 h-4 mr-3 text-emerald-500" />
                Full SQL capabilities without the cloud
              </li>
              <li className="flex items-center text-slate-700">
                <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-500" />
                Works offline after initial load
              </li>
            </ul>
          </div>
          <div className="p-8 md:p-12 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Tech Stack & Build</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              This application showcases the power of modern client-side web technologies.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm mb-1 flex items-center">
                  <Code2 className="w-3 h-3 mr-2 text-blue-500" /> React 19
                </h4>
                <p className="text-xs text-slate-500">Component-based UI architecture</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm mb-1 flex items-center">
                  <Database className="w-3 h-3 mr-2 text-blue-500" /> SQLite Wasm
                </h4>
                <p className="text-xs text-slate-500">In-memory relational database</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm mb-1 flex items-center">
                  <Brain className="w-3 h-3 mr-2 text-blue-500" /> Google Gemini
                </h4>
                <p className="text-xs text-slate-500">AI-powered insights & chat</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm mb-1 flex items-center">
                  <LayoutDashboard className="w-3 h-3 mr-2 text-blue-500" /> Tailwind CSS
                </h4>
                <p className="text-xs text-slate-500">Responsive styling engine</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h3 className="text-2xl font-bold text-slate-800 text-center mb-10">Everything you need to manage wealth</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Excel Import</h4>
            <p className="text-slate-600 text-sm">
              Drag and drop your bank statements. Map columns intelligently regardless of the format.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">AI Insights</h4>
            <p className="text-slate-600 text-sm">
              Use Google Gemini to analyze your spending habits and chat with your financial data naturally.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Interactive Dashboard</h4>
            <p className="text-slate-600 text-sm">
              Visualize your cash flow, track savings goals, and categorize expenses with detailed charts.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};