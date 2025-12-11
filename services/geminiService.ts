import { GoogleGenAI, Type } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentId, RoutingResult, Message } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. ROUTING PHASE
export const routeRequest = async (userQuery: string): Promise<RoutingResult> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `User Query: "${userQuery}"
      
      Analyze the query and assign it to one of the following agents:
      - 'appointment' (Booking, cancelling, rescheduling visits)
      - 'patient_mgmt' (Patient records, admission status, discharge, history)
      - 'doctor_staff' (Staff schedules, doctor availability, HR queries)
      - 'medical_info' (Symptoms, diseases, treatments, medical definitions)
      - 'general' (Anything else)

      Provide a short reasoning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetAgentId: { 
              type: Type.STRING, 
              enum: ["appointment", "patient_mgmt", "doctor_staff", "medical_info", "general"] 
            },
            reasoning: { type: Type.STRING }
          },
          required: ["targetAgentId", "reasoning"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from router");
    
    const result = JSON.parse(text) as RoutingResult;
    return result;

  } catch (error) {
    console.error("Routing error:", error);
    return { targetAgentId: 'general', reasoning: "Routing failed, defaulting to general." };
  }
};

// 2. EXECUTION PHASE
export const generateAgentResponse = async (
  agentId: AgentId, 
  userQuery: string,
  history: Message[]
): Promise<{ text: string; sources: Array<{ uri: string; title: string }> }> => {
  
  try {
    const agentConfig = AGENTS[agentId];
    if (!agentConfig) {
      throw new Error(`CONFIGURATION_ERROR: Invalid agent ID '${agentId}'`);
    }

    // Construct history for context
    const chatHistory = history.slice(-10).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Configure tools
    const tools = [];
    if (['medical_info', 'general', 'doctor_staff', 'patient_mgmt'].includes(agentId)) {
        tools.push({ googleSearch: {} });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: userQuery }] }
      ],
      config: {
        systemInstruction: agentConfig.systemInstruction,
        tools: tools, 
      }
    });

    const text = response.text || "I apologize, but I could not generate a response.";
    
    // Extract grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values()) as Array<{ uri: string; title: string }>;

    return { text, sources: uniqueSources };

  } catch (error: any) {
    console.error(`Agent ${agentId} error details:`, error);

    let errorMessage = "An unexpected error occurred while processing your request.";
    
    // Error Handling Logic
    const errorStr = error.toString().toLowerCase();
    
    if (errorStr.includes("api key") || errorStr.includes("403")) {
      errorMessage = "System Configuration Error: The API Key is invalid or missing. Please contact the administrator.";
    } else if (errorStr.includes("429") || errorStr.includes("quota")) {
      errorMessage = "System Overload: We are receiving too many requests right now. Please try again in a few moments.";
    } else if (errorStr.includes("503") || errorStr.includes("overloaded")) {
      errorMessage = "The AI service is currently unavailable due to high traffic. Please try again later.";
    } else if (errorStr.includes("fetch failed") || errorStr.includes("network")) {
      errorMessage = "Network Error: Please check your internet connection and try again.";
    } else if (errorStr.includes("configuration_error")) {
      errorMessage = "Internal Error: The requested agent could not be found.";
    } else if (errorStr.includes("candidate")) {
        errorMessage = "The system filtered the response due to safety settings. Please rephrase your query.";
    }

    return { text: errorMessage, sources: [] };
  }
};