import { create } from "zustand";

const CHAT_OPEN_KEY = "healthier-chat-open";
const CHAT_SIZE_KEY = "healthier-chat-size";
const SESSION_ID_KEY = "healthier-chat-session-id";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatStore {
  // Panel state
  isChatOpen: boolean;
  shouldFocusInput: boolean;
  chatPanelSize: number;

  // Messages state
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;

  // Session state
  sessionId: string | null;
  sessionTitle: string | null;
  sessions: ChatSession[];
  isTitleAnimating: boolean;

  // Context state (what page/view the user is on)
  currentPage: string;
  currentContext: Record<string, unknown>;

  // Tool call indicators
  showToolIndicator: boolean;
  toolCallCount: number;

  // Panel actions
  openChat: (options?: { focus?: boolean }) => void;
  closeChat: () => void;
  toggleChat: () => void;
  acknowledgeFocus: () => void;
  setChatPanelSize: (size: number) => void;

  // Message actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateLastMessage: (content: string, isStreaming?: boolean) => void;
  clearMessages: () => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsLoading: (loading: boolean) => void;

  // Session actions
  setSessionId: (id: string | null) => void;
  setSessionTitle: (title: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  startNewSession: () => void;
  setIsTitleAnimating: (animating: boolean) => void;

  // Context actions
  setCurrentPage: (page: string) => void;
  setCurrentContext: (context: Record<string, unknown>) => void;

  // Tool indicator actions
  setShowToolIndicator: (show: boolean) => void;
  setToolCallCount: (count: number) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  isChatOpen: false,
  shouldFocusInput: false,
  chatPanelSize: 30,
  messages: [],
  isStreaming: false,
  isLoading: false,
  sessionId: null,
  sessionTitle: null,
  sessions: [],
  isTitleAnimating: false,
  currentPage: "/dashboard",
  currentContext: {},
  showToolIndicator: false,
  toolCallCount: 0,

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

  updateLastMessage: (content, isStreaming = false) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
          isStreaming,
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

  setIsLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Session actions
  setSessionId: (id) => {
    set({ sessionId: id });
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(SESSION_ID_KEY, id);
      } else {
        localStorage.removeItem(SESSION_ID_KEY);
      }
    }
  },

  setSessionTitle: (title) => {
    set({ sessionTitle: title });
  },

  setSessions: (sessions) => {
    set({ sessions });
  },

  startNewSession: () => {
    set({
      messages: [],
      sessionId: null,
      sessionTitle: null,
      isTitleAnimating: false,
      isStreaming: false,
      isLoading: false,
      showToolIndicator: false,
      toolCallCount: 0,
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_ID_KEY);
    }
  },

  setIsTitleAnimating: (animating) => {
    set({ isTitleAnimating: animating });
  },

  // Context actions
  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setCurrentContext: (context) => {
    set({ currentContext: context });
  },

  // Tool indicator actions
  setShowToolIndicator: (show) => {
    set({ showToolIndicator: show });
  },

  setToolCallCount: (count) => {
    set({ toolCallCount: count });
  },
}));

if (typeof window !== "undefined") {
  const savedState = localStorage.getItem(CHAT_OPEN_KEY);
  const savedSize = localStorage.getItem(CHAT_SIZE_KEY);
  const savedSessionId = localStorage.getItem(SESSION_ID_KEY);

  if (savedState === "true") {
    useChatStore.getState().openChat({ focus: false });
  }
  if (savedSize) {
    useChatStore.getState().setChatPanelSize(parseFloat(savedSize));
  }
  if (savedSessionId) {
    useChatStore.getState().setSessionId(savedSessionId);
  }
}
