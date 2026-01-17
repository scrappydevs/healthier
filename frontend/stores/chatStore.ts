import { create } from "zustand";

const CHAT_OPEN_KEY = "healthier-chat-open";
const CHAT_SIZE_KEY = "healthier-chat-size";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatStore {
  // Panel state
  isChatOpen: boolean;
  shouldFocusInput: boolean;
  chatPanelSize: number;

  // Messages state
  messages: ChatMessage[];
  isStreaming: boolean;

  // Panel actions
  openChat: (options?: { focus?: boolean }) => void;
  closeChat: () => void;
  toggleChat: () => void;
  acknowledgeFocus: () => void;
  setChatPanelSize: (size: number) => void;

  // Message actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  setIsStreaming: (streaming: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  isChatOpen: false,
  shouldFocusInput: false,
  chatPanelSize: 30,
  messages: [],
  isStreaming: false,

  // Panel actions
  openChat: (options) => {
    const focus = options?.focus ?? true;
    set({ isChatOpen: true, shouldFocusInput: focus });
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_OPEN_KEY, "true");
    }
  },

  closeChat: () => {
    set({ isChatOpen: false, shouldFocusInput: false });
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_OPEN_KEY, "false");
    }
  },

  toggleChat: () => {
    const state = get();
    if (state.isChatOpen) {
      get().closeChat();
    } else {
      get().openChat();
    }
  },

  acknowledgeFocus: () => {
    if (get().shouldFocusInput) {
      set({ shouldFocusInput: false });
    }
  },

  setChatPanelSize: (size) => {
    set({ chatPanelSize: size });
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_SIZE_KEY, String(size));
    }
  },

  // Message actions
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },

  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    });
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setIsStreaming: (streaming) => {
    set({ isStreaming: streaming });
  },
}));

// Initialize from localStorage
if (typeof window !== "undefined") {
  const savedState = localStorage.getItem(CHAT_OPEN_KEY);
  const savedSize = localStorage.getItem(CHAT_SIZE_KEY);
  
  if (savedState === "true") {
    useChatStore.getState().openChat({ focus: false });
  }
  if (savedSize) {
    useChatStore.getState().setChatPanelSize(parseFloat(savedSize));
  }
}
