import React from 'react';
import { Message } from '../types';
import { AGENTS } from '../constants';
import * as Icons from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Resolve Agent Info if it's a model message
  const agent = message.agentId ? AGENTS[message.agentId] : null;
  const IconComponent = agent ? (Icons as any)[agent.iconName] : Icons.User;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Agent/User Label */}
        <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className={`p-1 rounded-full ${isUser ? 'bg-slate-200' : (agent?.color || 'bg-indigo-600')} text-white`}>
             <IconComponent size={12} className={isUser ? 'text-slate-600' : 'text-white'} />
          </div>
          {isUser ? 'You' : agent?.name || 'Hospital AI'}
        </div>

        {/* Bubble */}
        <div className={`relative p-4 rounded-2xl text-sm md:text-base shadow-sm leading-relaxed ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
        }`}>
          <ReactMarkdown 
            className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4"
            components={{
                a: ({node, ...props}) => <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Sources / Grounding */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-xs w-full bg-slate-100 p-2 rounded-lg border border-slate-200">
             <span className="font-bold text-slate-500 block mb-1">Sources found:</span>
             <div className="flex flex-wrap gap-2">
               {message.sources.map((src, idx) => (
                 <a 
                   key={idx} 
                   href={src.uri} 
                   target="_blank" 
                   rel="noreferrer"
                   className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 text-indigo-600 truncate max-w-[200px]"
                 >
                   <Icons.Link size={10} />
                   <span className="truncate">{src.title || new URL(src.uri).hostname}</span>
                 </a>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;