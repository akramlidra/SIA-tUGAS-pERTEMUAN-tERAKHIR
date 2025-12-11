import { GoogleGenAI, Type } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentId, RoutingResult, Message } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. ROUTING PHASE
// We use a lightweight model or a specific configuration to classify the intent.
export const routeRequest = async (userQuery: string): Promise<RoutingResult> => {
  try {
    const modelId = "gemini-2.5-flash"; // Fast and capable enough for routing
    
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
    // Fallback to general if routing fails
    return { targetAgentId: 'general', reasoning: "Routing failed, defaulting to general." };
  }
};

// 2. EXECUTION PHASE
// Execute the query using the selected agent's persona and tools.
export const generateAgentResponse = async (
  agentId: AgentId, 
  userQuery: string,
  history: Message[]
): Promise<{ text: string; sources: Array<{ uri: string; title: string }> }> => {
  
  const agentConfig = AGENTS[agentId];
  if (!agentConfig) throw new Error("Invalid agent ID");

  // Construct history for context, excluding the latest user message which we send in contents
  // Limiting history to last 5 turns to keep context clean
  const chatHistory = history.slice(-10).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  try {
    // Configure tools: Grounding for Medical, General, Staff (as per prompt requirements)
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
    
    // Extract grounding chunks if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    // De-duplicate sources
    const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values()) as Array<{ uri: string; title: string }>;

    return { text, sources: uniqueSources };

  } catch (error) {
    console.error(`Agent ${agentId} error:`, error);
    return { text: "I encountered an error while processing your request.", sources: [] };
  }
};