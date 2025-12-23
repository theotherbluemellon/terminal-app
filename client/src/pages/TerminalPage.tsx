import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatHistory, useSendMessage, useClearHistory } from "@/hooks/use-chat";
import { useUpdateSetting, useSetting } from "@/hooks/use-settings";
import { TerminalMessage } from "@/components/TerminalMessage";
import { CrtOverlay } from "@/components/CrtOverlay";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

const COMMANDS = {
  CLEAR: "/clear",
  HELP: "/help",
  CONFIG: "/config",
} as const;

export default function TerminalPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [localHistory, setLocalHistory] = useState<string[]>([]); // For up/down arrow history
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(true);

  // Queries & Mutations
  const { data: messages = [], isLoading } = useChatHistory();
  const sendMessage = useSendMessage();
  const clearHistory = useClearHistory();
  const updateSetting = useUpdateSetting();
  
  // Settings for display
  const { data: llmUrl } = useSetting('llm_url');

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  // Keep focus on input
  useEffect(() => {
    const handleKeyDown = () => inputRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCommand = async (cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case COMMANDS.CLEAR:
        clearHistory.mutate();
        break;
      
      case COMMANDS.CONFIG:
        if (args.length > 0) {
           updateSetting.mutate({ key: 'llm_url', value: args[0] }, {
             onSuccess: () => {
               // Add a temporary system message to UI via local cache manipulation or refetch
               // For now, simpler to just let user know via alert or next message
             }
           });
        }
        break;

      case COMMANDS.HELP:
        // We can inject a local system message if we wanted, but for now strict API-only is safer.
        // Or we send to LLM: "User asked for help about commands"
        break;

      default:
        return false; // Not a local command
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sendMessage.isPending) return;

    const currentInput = inputValue;
    setInputValue("");
    setLocalHistory(prev => [...prev, currentInput]);
    setHistoryIndex(-1);

    // Check for local commands first
    handleCommand(currentInput).then((isCommand) => {
      if (!isCommand) {
        sendMessage.mutate(currentInput);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (localHistory.length > 0) {
        const newIndex = historyIndex === -1 ? localHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(localHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(localHistory.length - 1, historyIndex + 1);
        if (historyIndex === localHistory.length - 1) {
            setHistoryIndex(-1);
            setInputValue("");
        } else {
            setHistoryIndex(newIndex);
            setInputValue(localHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-primary font-mono overflow-hidden flex flex-col relative">
      <CrtOverlay />

      {/* Header / Status Bar */}
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 flex justify-between items-center z-10 select-none text-xs md:text-sm uppercase tracking-wider">
        <div className="flex gap-4">
          <span className="text-glow font-bold">TERMINAL v1.0.4</span>
          <span className="text-primary/50 hidden sm:inline">CONN: LOCAL_SOCKET</span>
          <span className="text-primary/50 hidden sm:inline">MEM: 64K OK</span>
        </div>
        <div className="flex gap-4">
           <span>TARGET: {llmUrl?.value || "UNSET"}</span>
           <span className={cn("animate-pulse", sendMessage.isPending ? "text-yellow-500" : "text-primary")}>
             {sendMessage.isPending ? "PROCESSING" : "IDLE"}
           </span>
        </div>
      </div>

      {/* Main Terminal Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-2 z-10 crt-flicker"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Welcome Message */}
        <div className="mb-8 text-primary/60">
          <p>Welcome to LLaMA Terminal Interface.</p>
          <p>Type <span className="text-primary text-glow font-bold">/help</span> for available commands.</p>
          <p className="text-xs mt-2 opacity-50">System initialized at {new Date().toLocaleTimeString()}</p>
          <div className="h-px w-full bg-primary/20 my-4" />
        </div>

        {/* History */}
        {messages.map((msg, i) => (
          <TerminalMessage 
            key={msg.id} 
            message={msg} 
            isLatest={i === messages.length - 1} 
          />
        ))}

        {/* Pending State */}
        {sendMessage.isPending && <LoadingSpinner />}

        {/* Input Line */}
        <div className="flex gap-3 items-center mt-4 group">
           <div className="shrink-0 font-bold select-none text-glow min-w-[100px]">
             user@llama:~$
           </div>
           
           <div className="relative flex-1">
             <form onSubmit={handleSubmit} className="flex">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent border-none outline-none text-primary font-mono p-0 m-0 focus:ring-0 placeholder:text-primary/20 caret-transparent uppercase"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                {/* Custom Block Cursor */}
                <motion.div 
                  className="absolute pointer-events-none bg-primary h-[1.2em] w-[0.6em] -mt-[0.1em]"
                  style={{ 
                    left: `${inputValue.length}ch`,
                  }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
             </form>
           </div>
        </div>
        
        {/* Spacer for bottom scroll */}
        <div className="h-12" />
      </div>
    </div>
  );
}
