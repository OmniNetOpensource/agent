import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldCheck } from 'lucide-react';

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
        { id: 0, text: `Initializing connection to ${hostname}...`, type: 'info', delay: 0 },
        { id: 1, text: `Resolving DNS...`, type: 'info', delay: 0 },
        { id: 2, text: `Target IP found: [192.168.x.x]`, type: 'success', delay: 0 },
        { id: 3, text: "Handshake initiated [SYN]", type: 'info', delay: 0 },
        { id: 4, text: "TLSv1.3 connection established", type: 'success', delay: 0 },
        { id: 5, text: `GET ${url} HTTP/2`, type: 'info', delay: 0 },
        { id: 6, text: "Packet received: 200 OK", type: 'success', delay: 0 },
        { id: 7, text: "Decryption key negotiation...", type: 'info', delay: 0 },
        { id: 8, text: "Stream buffering...", type: 'info', delay: 0 },
        { id: 9, text: status === 'error' ? "Connection reset by peer." : "Payload downloaded successfully.", type: status === 'error' ? 'error' : 'success', delay: 0 },
      ];
      
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
        { text: `> SYSTEM_INIT: Target ${hostname}`, type: "info", delay: 100 },
        { text: "> DNS_RESOLVE: Querying root servers...", type: "info", delay: 400 },
        { text: "> NETWORK: Establish TCP connection", type: "warning", delay: 800 },
        { text: "> SECURITY: Verifying SSL certificate...", type: "info", delay: 1300 },
        { text: "> PROTOCOL: TLS Handshake success", type: "success", delay: 1600 },
        { text: "> DATA: Requesting packet stream...", type: "info", delay: 2000 },
        { text: "> WAIT: Awaiting server response...", type: "warning", delay: 2500 },
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
      case 'success': return 'text-(--color-success) font-bold';
      case 'warning': return 'text-(--color-warning) italic';
      case 'error': return 'text-(--color-destructive) font-bold';
      default: return 'text-(--color-info)';
    }
  };

  return (
    <div className="w-full font-mono text-xs sm:text-sm my-2 relative group">
      <div className="bg-(--surface-muted) rounded-lg overflow-hidden border border-(--border-subtle) shadow-soft relative z-10 transition-colors duration-300">
        {/* Header */}
        <div 
          onClick={onToggle}
          className="bg-(--surface-card) px-4 py-2 flex items-center justify-between border-b border-(--border-subtle) cursor-pointer hover:bg-(--surface-hover) transition-colors"
        >
          <div className="flex items-center gap-3 text-(--text-secondary)">
            <Terminal className="w-3 h-3 text-(--color-brand)" />
            <span className="opacity-80 font-medium tracking-tight text-(--text-tertiary)">fetch {tryGetHostname(url)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#d89e24]/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]/50"></div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div 
          ref={scrollRef}
          className={`
            relative p-4 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-(--border-hover) scrollbar-track-transparent
            transition-all duration-300 ease-in-out font-mono
            ${isExpanded ? 'h-56 opacity-100' : 'h-0 p-0 opacity-0 hidden'}
          `}
        >
          <div className="relative z-10 space-y-1">
            <AnimatePresence mode="popLayout">
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  className={`flex items-start gap-2 ${getColor(log.type)}`}
                >
                  <span className="text-(--text-tertiary) shrink-0 select-none font-bold">➜</span>
                  <span className="break-all font-medium tracking-tight">{log.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {status === 'pending' && (
               <motion.div 
                  className="flex items-center gap-2 text-(--text-tertiary) mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
               >
                  <span className="text-(--text-tertiary) shrink-0">➜</span>
                  <span className="animate-pulse">_</span>
               </motion.div>
            )}

            {status === 'complete' && result && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="mt-6 pt-4 border-t border-dashed border-(--border-subtle)"
               >
                 <div className="text-(--color-success) mb-2 flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                   <ShieldCheck className="w-3.5 h-3.5" />
                   <span>Secure Connection Verified</span>
                   <div className="h-px flex-1 bg-linear-to-r from-(--color-success) to-transparent opacity-30" />
                 </div>
                 <div className="bg-background rounded p-3 border-l-2 border-(--color-success) text-(--text-secondary) font-mono text-[11px] leading-relaxed break-all">
                   <div className="opacity-50 mb-1 text-[10px]">PREVIEW_DATA_STREAM:</div>
                   {result.slice(0, 300)}{result.length > 300 ? '...' : ''}
                 </div>
               </motion.div>
            )}
            
            {status === 'error' && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="mt-4 pt-2 text-(--color-destructive) text-xs uppercase tracking-wider font-bold flex items-center gap-2"
               >
                  <div className="w-2 h-2 bg-(--color-destructive) rounded-full animate-pulse" />
                  Connection Terminated
               </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
