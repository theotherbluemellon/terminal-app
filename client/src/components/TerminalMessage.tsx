import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import type { MessageResponse } from "@shared/routes";

interface TerminalMessageProps {
  message: MessageResponse;
  isLatest?: boolean;
}

export function TerminalMessage({ message, isLatest }: TerminalMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div className={cn(
      "mb-4 font-mono leading-relaxed",
      isUser ? "text-primary text-glow" : "text-primary/90",
      isSystem ? "text-yellow-500 text-glow-amber" : ""
    )}>
      <div className="flex gap-3">
        {/* Prompt / Author */}
        <div className="shrink-0 select-none opacity-80 font-bold min-w-[100px]">
          {isUser ? (
            <span className="text-primary">{`user@llama:~$`}</span>
          ) : isSystem ? (
            <span className="text-yellow-500">{`[SYSTEM]`}</span>
          ) : (
            <span className="text-primary/70">{`llama_v2 >>`}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-hidden">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <motion.div
              initial={isLatest ? { opacity: 0 } : { opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="markdown-content prose prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-primary/20 prose-code:text-primary prose-code:font-normal max-w-none"
            >
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <div className="my-2 rounded border border-primary/20 overflow-hidden">
                        <div className="bg-[#1a1a1a] px-3 py-1 text-xs text-primary/50 border-b border-primary/20">
                          {match[1]}
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, background: '#0e0e0e' }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={cn("bg-primary/10 px-1 py-0.5 rounded text-primary text-sm", className)}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </motion.div>
          )}
        </div>
      </div>
      
      <div className="text-[10px] text-primary/30 mt-1 ml-[112px]">
        {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
      </div>
    </div>
  );
}
