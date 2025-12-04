# Finan$$as - Smart Personal Finance Manager

Finan$$as is a local-first, privacy-focused personal finance application that turns your Excel/CSV bank statements into interactive dashboards. It leverages SQLite Wasm for in-browser database management and Google Gemini AI for smart financial insights.

## Features

*   **Local-First Architecture:** No backend server. Data is stored entirely in your browser using SQLite Wasm and IndexedDB.
*   **Excel/CSV Import:** Advanced importer with support for column mapping, split income/expense columns, and manual overrides.
*   **Interactive Dashboard:** Visualize cash flow, detailed expense breakdowns, and account balances.
*   **AI Insights:** Analyze spending habits and chat with your data using Google Gemini.
*   **Savings Goals:** Track progress towards financial targets with multi-account support.
*   **SQL Console:** Run raw SQL queries directly against your financial data.

## Setup & Installation

### Prerequisites

*   Node.js (v18 or higher)
*   npm (Node Package Manager)

### 1. Installation

Navigate to the project directory and install the required dependencies:

```bash
npm install
```

### 2. API Key Configuration (Optional)

To use the AI features (Insights & Chat), you need a Google Gemini API Key. You have two options:

1.  **Runtime (Recommended):** You can enter your API Key directly in the application's **Admin** page. It will be stored securely in your local database.
2.  **Build Time:** You can create a `.env` file in the root directory to bake the key into the app:
    ```env
    # If using Vite (Standard)
    VITE_API_KEY=your_api_key_here
    
    # If using Webpack/CRA
    process.env.API_KEY=your_api_key_here
    ```

### 3. Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

## Building for Production

Since Finan$$as is a client-side Single Page Application (SPA), you can build it into static files:

```bash
npm run build
```

The output will be located in the `dist/` (or `build/`) folder. You can deploy this folder to any static hosting provider like Netlify, Vercel, GitHub Pages, or serve it via Nginx/Apache.

## Technologies Used

*   **Frontend:** React 19, TypeScript
*   **Styling:** Tailwind CSS
*   **Database:** sql.js (SQLite compiled to WebAssembly)
*   **Visualization:** Recharts
*   **AI Integration:** @google/genai SDK
*   **Data Processing:** SheetJS (xlsx)
