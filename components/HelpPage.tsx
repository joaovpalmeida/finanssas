import React from 'react';
import { 
  Shield, LayoutDashboard, CreditCard, UploadCloud, 
  Sparkles, Target, Settings, HelpCircle, Lock 
} from 'lucide-react';

const HelpSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    </div>
    <div className="text-slate-600 space-y-3 leading-relaxed text-sm sm:text-base">
      {children}
    </div>
  </div>
);

export const HelpPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 flex items-center justify-center">
          <HelpCircle className="w-8 h-8 mr-3 text-blue-600" />
          How can we help?
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          A complete guide to managing your finances locally and privately with Finan$$as.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Philosophy */}
        <div className="md:col-span-2">
            <HelpSection title="Privacy & Security" icon={Shield}>
            <p>
                Finan$$as works on a <strong>Local-First</strong> architecture. This means there is no central server storing your financial data.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Your data is stored inside your browser's database (IndexedDB/SQLite).</li>
                <li><strong>Encryption:</strong> You can enable password protection in the Admin tab. This encrypts your database file so it cannot be read without your password.</li>
                <li className="text-amber-600 font-medium">Warning: Because there is no server, there is no "Forgot Password" feature. If you enable encryption and lose your password, your data is lost forever.</li>
                <li><strong>Backups:</strong> Use the <em>Backup</em> button in the Admin tab regularly to download a <code>.sqlite</code> file of your data.</li>
            </ul>
            </HelpSection>
        </div>

        {/* Dashboard */}
        <HelpSection title="Dashboard & Analytics" icon={LayoutDashboard}>
          <p>The Dashboard provides a real-time overview of your financial health.</p>
          <ul className="space-y-2 mt-2">
            <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-700 whitespace-nowrap">Privacy Mode:</span>
                <span>Toggle the eye icon to mask precise amounts when viewing in public.</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-700 whitespace-nowrap">Fiscal Period:</span>
                <span>Use the date dropdown to switch between monthly views or see 'All Time' stats.</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-700 whitespace-nowrap">Charts:</span>
                <span>Toggle between Group view (General vs Recurring expenses) or detailed Category allocation.</span>
            </li>
          </ul>
        </HelpSection>

        {/* Transactions */}
        <HelpSection title="Managing Transactions" icon={CreditCard}>
          <p>You can add transactions manually or import them. There are four types:</p>
          <div className="mt-3 space-y-2">
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                <strong>Income & Expense:</strong> Standard money in/out flow.
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                <strong>Transfer:</strong> Moving money between two accounts (e.g., Checking to Savings). Creates two records automatically.
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                <strong>Balance Adjustment:</strong> Sets the balance of an account without affecting your Income/Expense reports. Useful for initial setup or correcting reconciliation errors.
            </div>
          </div>
        </HelpSection>

        {/* Import */}
        <HelpSection title="Importing Data" icon={UploadCloud}>
          <p>
            Bulk import Excel or CSV files in the <strong>Admin</strong> tab.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Smart Mapping:</strong> Map columns like Date, Description, and Amount. Supports both single-column amounts and split Income/Expense columns.</li>
            <li><strong>Auto-Categorization:</strong> The system remembers your past edits. If you upload a description it recognizes, it will suggest the category automatically (indicated by a sparkles icon).</li>
            <li><strong>Duplicate Detection:</strong> Prevents re-importing the same transaction twice based on date, amount, and description.</li>
          </ul>
        </HelpSection>

        {/* AI & Search */}
        <HelpSection title="AI & Search" icon={Sparkles}>
          <p>
            <strong>Transaction Search:</strong> Filter by keyword, date range, amount, or category to find specific records.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="mb-1"><strong>AI Insights (Requires API Key):</strong></p>
            <p className="text-sm">
                Connects to Google Gemini to analyze your spending patterns. 
                You can chat with your data using natural language, like <em>"How much did I spend on coffee last month?"</em>.
                Configure your key in the Admin tab.
            </p>
          </div>
        </HelpSection>

        {/* Savings Goals */}
        <HelpSection title="Savings Goals" icon={Target}>
          <p>Create goals to track progress for specific targets (e.g., "Vacation Fund").</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Link one or multiple accounts to a goal.</li>
            <li>Balances in linked accounts count towards the goal progress.</li>
            <li>The app calculates how much you need to save monthly to hit your deadline based on the current gap.</li>
          </ul>
        </HelpSection>

        {/* Admin */}
        <HelpSection title="Configuration" icon={Settings}>
          <p>Customize the app to fit your lifestyle in the Admin tab.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Security:</strong> Set a password to encrypt your database.</li>
            <li><strong>Categories:</strong> Create custom categories. Group them as "Recurring" (Rent, Bills) or "General" (Food, Fun) for structured reporting.</li>
            <li><strong>Fiscal Settings:</strong> Change how months are calculated (e.g., calendar month, or starting on the 25th).</li>
            <li><strong>Demo Mode:</strong> If the database is empty, you can generate dummy data to test the features.</li>
          </ul>
        </HelpSection>

      </div>
    </div>
  );
};
