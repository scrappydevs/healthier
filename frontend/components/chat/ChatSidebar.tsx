"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";
import { cn } from "@/lib/cn";

interface ChatSidebarProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

export function ChatSidebar({ isCollapsed, onClose }: ChatSidebarProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isStreaming,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    shouldFocusInput,
    acknowledgeFocus,
  } = useChatStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!isCollapsed && inputRef.current && shouldFocusInput) {
      inputRef.current.focus();
      acknowledgeFocus();
    }
  }, [isCollapsed, shouldFocusInput, acknowledgeFocus]);

  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isStreaming) return;

    addMessage({ role: "user", content: trimmedInput });
    setInputValue("");

    setIsStreaming(true);
    addMessage({ role: "assistant", content: "", isStreaming: true });

    const response = getAIResponse(trimmedInput);
    let currentContent = "";

    for (let i = 0; i < response.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      currentContent += response[i];
      updateLastMessage(currentContent);
    }

    setIsStreaming(false);
  }, [inputValue, isStreaming, addMessage, updateLastMessage, setIsStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white relative",
        "transition-opacity duration-200 ease-in-out",
        isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b shrink-0">
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isAnimating={index === messages.length - 1 && message.role === "user"}
              />
            ))}
            {isStreaming && messages[messages.length - 1]?.role === "assistant" && 
              messages[messages.length - 1]?.content === "" && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a patient..."
            disabled={isStreaming}
            rows={1}
            className={cn(
              "w-full min-h-[40px] max-h-32 px-3 py-2.5 pr-10 text-sm",
              "bg-muted/40 border rounded-md resize-none",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            size="icon"
            className="absolute right-1.5 bottom-1.5 h-7 w-7"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <p className="text-sm text-muted-foreground mb-4 max-w-[220px]">
        Ask questions about patients, medication adherence, or get insights from the data.
      </p>
      <div className="space-y-2 w-full max-w-[240px]">
        <SuggestionChip text="Who missed medications today?" />
        <SuggestionChip text="Show patients with low adherence" />
        <SuggestionChip text="Summarize Robert Williams" />
      </div>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  const { addMessage, setIsStreaming, updateLastMessage } = useChatStore();

  const handleClick = async () => {
    addMessage({ role: "user", content: text });
    setIsStreaming(true);
    addMessage({ role: "assistant", content: "", isStreaming: true });

    const response = getAIResponse(text);
    let currentContent = "";

    for (let i = 0; i < response.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      currentContent += response[i];
      updateLastMessage(currentContent);
    }

    setIsStreaming(false);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-3 py-2 text-xs text-left text-muted-foreground bg-muted/40 hover:bg-muted rounded-md transition-colors"
    >
      {text}
    </button>
  );
}

interface MessageBubbleProps {
  message: { role: "user" | "assistant"; content: string };
  isAnimating?: boolean;
}

function MessageBubble({ message, isAnimating }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row", isAnimating && "animate-message-appear")}>
      <div className={cn(
        "max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
      )}>
        {message.content || <span className="opacity-0">.</span>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/60 rounded-lg">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.4s" }}
          />
        ))}
      </div>
    </div>
  );
}

function getAIResponse(question: string): string {
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes("missed") && lowerQ.includes("medication")) {
    return "Based on today's data, 2 patients missed medications:\n\n• Robert Williams - Missed 2 consecutive doses of Lisinopril (last at 8:00 AM)\n• Margaret Chen - Missed morning Metformin (scheduled 8:00 AM)\n\nWould you like me to create alerts for their caregivers?";
  }

  if (lowerQ.includes("low adherence") || lowerQ.includes("at risk")) {
    return "3 patients currently have low adherence rates:\n\n1. Michael Anderson - 58% (Critical)\n   - 5 medications, last active 2 days ago\n\n2. Dorothy Smith - 65% (Warning)\n   - Dropped from 78% last week\n\n3. Robert Williams - 68% (Warning)\n   - Pattern: misses evening doses\n\nShall I pull up detailed profiles?";
  }

  if (lowerQ.includes("robert williams") || lowerQ.includes("summarize")) {
    return "Robert Williams (82 years old)\n\nAdherence: 68% (At Risk)\nMedications: 6 active prescriptions\nLast Active: 2 hours ago\n\nRecent Issues:\n- Missed 2 consecutive Lisinopril doses\n- Pattern of missing evening medications\n\nRecommendations:\n- Consider simplified evening regimen\n- Schedule caregiver check-in call";
  }

  return "I can help you with patient information, medication adherence data, and alerts. Try asking about:\n\n• Specific patients\n• Missed medications\n• Adherence trends\n• Alert summaries";
}
