import React from 'react';
import { AgentId } from '../types';
import { AGENTS } from '../constants';
import * as Icons from 'lucide-react';

interface AgentBadgeProps {
  agentId: AgentId;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agentId, size = 'md', isActive = false }) => {
  const agent = AGENTS[agentId];
  const IconComponent = (Icons as any)[agent.iconName] || Icons.HelpCircle;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full font-medium transition-all duration-300 ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-90'} ${agent.color} text-white ${sizeClasses[size]}`}>
      <IconComponent size={iconSizes[size]} />
      <span>{agent.name}</span>
    </div>
  );
};

export default AgentBadge;