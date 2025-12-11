export type AgentId = 
| 'orchestrator' 
| 'doctor_staff' 
| 'medical_info' 
| 'patient_mgmt' 
| 'appointment' 
| 'general';

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  iconName: string;
  color: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  agentId?: AgentId; // The agent that produced this message
  timestamp: number;
  sources?: Array<{ uri: string; title: string }>; // For grounding results
}

export interface RoutingResult {
  targetAgentId: AgentId;
  reasoning: string;
}