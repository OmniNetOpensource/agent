import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Check } from 'lucide-react';

interface LogLine {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  delay: number;
}

interface FetchTerminalProps {
  url: string;
  status: 'pending' | 'complete' | 'error';
  result?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const FetchTerminal: React.FC<FetchTerminalProps> = ({ 
  url, 
  status = 'pending', 
  result,
  isExpanded = true,
  onToggle
}) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tryGetHostname = (u: string) => {
    try {
      return new URL(u).hostname;
    } catch {
      return u;
    }
  };

  // Initialize sequence based on status
  useEffect(() => {
    const hostname = tryGetHostname(url);
    
    if (status === 'complete' || status === 'error') {
      // Show full history immediately for completed/error states
      const fullLogs: LogLine[] = [
        { id: 0, text: `Resolving host ${hostname}...`, type: 'info', delay: 0 },
        { id: 1, text: `Connected to ${hostname}`, type: 'success', delay: 0 },
        { id: 2, text: "TLS Handshake completed", type: 'success', delay: 0 },
        { id: 3, text: `Sending GET ${url}`, type: 'info', delay: 0 },
        { id: 4, text: "Response received: 200 OK", type: 'success', delay: 0 },
        { id: 5, text: "Parsing content...", type: 'info', delay: 0 },
        { id: 6, text: status === 'error' ? "Error fetching data." : "Data ready.", type: status === 'error' ? 'error' : 'success', delay: 0 },
      ];
      
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setLogs(fullLogs);
      }, 0);
      
      return () => clearTimeout(timer);
    }

    // Start animation for pending state
    const timeouts: NodeJS.Timeout[] = [];
    let mounted = true;

    const startSequence = () => {
      setLogs([]);
      let currentDelay = 0;

      const sequenceToRun = [
        { text: `Resolving host ${hostname}...`, type: "info", delay: 200 },
        { text: `Connecting to ${hostname}...`, type: "info", delay: 600 },
        { text: "TLS Handshake completed", type: "success", delay: 1100 },
        { text: "Sending GET request...", type: "info", delay: 1400 },
        { text: "Waiting for server response...", type: "warning", delay: 1800 },
      ];

      sequenceToRun.forEach((item, index) => {
        currentDelay = item.delay;
        const timeout = setTimeout(() => {
          if (mounted) {
            setLogs(prev => [...prev, { ...item, id: index, type: item.type as LogLine['type'] }]);
          }
        }, currentDelay);
        timeouts.push(timeout);
      });
    };

    startSequence();

    return () => {
      mounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [status, url]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="w-full font-mono text-xs sm:text-sm my-2">
      <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-sm">
        {/* Header */}
        <div 
          onClick={onToggle}
          className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-3.5 h-3.5" />
            <span className="opacity-80">fetch {tryGetHostname(url)}</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
          </div>
        </div>

        {/* Body */}
        <div 
          ref={scrollRef}
          className={`
            p-4 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
            transition-all duration-300 ease-in-out
            ${isExpanded ? 'h-48 opacity-100' : 'h-0 p-0 opacity-0'}
          `}
        >
          {logs.map((log) => (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-1.5 ${getColor(log.type)} flex items-start`}
            >
              <span className="text-slate-600 mr-2 mt-0.5 select-none">{`>`}</span>
              <span className="break-all">{log.text}</span>
            </motion.div>
          ))}
          
          {status === 'pending' && (
             <motion.div 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-1.5 h-4 bg-slate-400 align-middle ml-2"
             />
          )}

          {status === 'complete' && result && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="mt-4 pt-4 border-t border-slate-800/50"
             >
               <div className="text-slate-500 mb-1 flex items-center gap-2">
                 <Check className="w-3 h-3 text-emerald-400" />
                 <span>Content preview:</span>
               </div>
               <div className="text-slate-300 opacity-80 whitespace-pre-wrap break-all font-mono text-xs pl-4 border-l-2 border-slate-800">
                 {result.slice(0, 300)}{result.length > 300 ? '...' : ''}
               </div>
             </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
