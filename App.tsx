import React, { useState, useRef, useEffect } from 'react';
import { Send, Activity, Info, Menu, X, BrainCircuit, Loader2 } from 'lucide-react';
import { Message, AgentId } from './types';
import { AGENTS } from './constants';
import { routeRequest, generateAgentResponse } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import AgentBadge from './components/AgentBadge';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Welcome to Hospital Nexus AI. I can assist you with appointments, medical information, staff management, or patient records. How can I help you today?',
      agentId: 'orchestrator',
      timestamp: Date.now()
    }
  ]);
  const [processingState, setProcessingState] = useState<'idle' | 'routing' | 'generating'>('idle');
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('orchestrator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processingState]);

  const handleSend = async () => {
    if (!input.trim() || processingState !== 'idle') return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setProcessingState('routing');
    setActiveAgentId('orchestrator'); // Reset to orchestrator for routing

    try {
      // Step 1: Route Request
      const routeResult = await routeRequest(userMsg.content);
      const targetAgent = routeResult.targetAgentId;
      
      setActiveAgentId(targetAgent);
      setProcessingState('generating');

      // Step 2: Generate Response with Specialized Agent
      const response = await generateAgentResponse(targetAgent, userMsg.content, messages);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        agentId: targetAgent,
        sources: response.sources,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: "I'm having trouble connecting to the hospital network. Please try again.",
        agentId: 'orchestrator',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setProcessingState('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full bg-slate-50 relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Agents Dashboard */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">Hospital Nexus</h1>
              <span className="text-xs text-slate-500 font-medium">AI Operations Center</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Active Agents</h2>
          
          {Object.values(AGENTS).filter(a => a.id !== 'orchestrator' && a.id !== 'general').map((agent) => (
             <div 
               key={agent.id}
               className={`p-3 rounded-xl border transition-all duration-300 ${
                 activeAgentId === agent.id 
                 ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-102' 
                 : 'bg-white border-transparent hover:bg-slate-50'
               }`}
             >
               <div className="flex items-center gap-3 mb-1">
                 <AgentBadge agentId={agent.id as AgentId} size="sm" isActive={activeAgentId === agent.id} />
               </div>
               <p className="text-xs text-slate-500 line-clamp-2 px-1">
                 {agent.description}
               </p>
             </div>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-100">
             <div className={`p-3 rounded-xl border transition-all ${activeAgentId === 'orchestrator' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent'}`}>
                <div className="flex items-center gap-2 mb-1 text-slate-700 font-semibold text-sm">
                   <BrainCircuit size={16} />
                   <span>Operations Orchestrator</span>
                </div>
                <p className="text-xs text-slate-500">Monitoring all requests...</p>
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between md:justify-center relative shadow-sm z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            {processingState === 'routing' ? (
              <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full animate-pulse">
                <BrainCircuit size={16} />
                <span className="text-sm font-semibold">Routing Request...</span>
              </div>
            ) : processingState === 'generating' ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-semibold">{AGENTS[activeAgentId].name} is typing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                <Info size={16} />
                <span className="text-sm font-medium">System Ready</span>
              </div>
            )}
          </div>
          <div className="w-8 md:hidden"></div> {/* Spacer */}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-slate-50 scrollbar-hide">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto relative flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about schedules, patient records, or medical info..."
                className="w-full pl-5 pr-12 py-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm text-slate-700 placeholder-slate-400"
                disabled={processingState !== 'idle'}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || processingState !== 'idle'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
              >
                {processingState !== 'idle' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
            Hospital Nexus can make mistakes. Verify important medical data.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;