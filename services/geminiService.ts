import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AiInsight } from "../types";

const apiKey = process.env.API_KEY;

// Initialize the client only if the key exists, otherwise we handle it gracefully in the app
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getFinancialInsights = async (transactions: Transaction[]): Promise<AiInsight[]> => {
  if (!ai) {
    return [{
      title: "API Key Missing",
      content: "Please provide a valid API_KEY in the environment to generate AI insights.",
      type: "neutral"
    }];
  }

  // Summarize data for the prompt to avoid token limits with huge CSVs
  // We take the last 50 transactions + summary stats
  const recentTransactions = transactions.slice(0, 50).map(t => 
    `${t.date}: ${t.description} - ${t.amount} (${t.category})`
  ).join('\n');

  const prompt = `
    Analyze the following financial transaction data. 
    Provide 3 distinct, short, and actionable insights or observations.
    Focus on spending habits, potential savings, or unusual patterns.
    
    Data Snippet:
    ${recentTransactions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["positive", "negative", "neutral", "action"] }
            },
            required: ["title", "content", "type"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    return JSON.parse(jsonText) as AiInsight[];
  } catch (error) {
    console.error("Error generating insights:", error);
    return [{
      title: "Analysis Failed",
      content: "Could not generate insights at this time. Please try again later.",
      type: "negative"
    }];
  }
};

export const chatWithFinanceData = async (
  query: string, 
  transactions: Transaction[]
): Promise<string> => {
  if (!ai) return "API Key not configured.";

  // Providing a simplified context
  const summary = transactions.slice(0, 100).map(t => 
    `${t.date}: ${t.description} ($${t.amount}) [${t.category}]`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a helpful financial assistant. 
        User Question: "${query}"
        
        Here is a sample of their recent transaction data:
        ${summary}
        
        Answer the question based on this data. Be concise and friendly.
      `
    });
    return response.text || "I couldn't generate an answer.";
  } catch (e) {
    console.error(e);
    return "Sorry, I had trouble analyzing that request.";
  }
};
