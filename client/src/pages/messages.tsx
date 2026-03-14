import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPost, fetchWithAuth } from "@/lib/api";
import AvatarGenerator from "@/components/ai-staff/AvatarGenerator";
import type { AvatarColorTheme } from "@/components/ai-staff/AvatarGenerator";

/** Deterministic color theme for staff based on name hash */
function staffColorTheme(name: string): AvatarColorTheme {
  const themes: AvatarColorTheme[] = ["purple", "blue", "green", "orange", "pink", "cyan"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return themes[Math.abs(h) % themes.length];
}

/** Typing indicator with three bouncing dots */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <div className="h-6 w-6 flex-shrink-0" />
        <div className="bg-secondary rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-muted-foreground"
              style={{
                animation: "bounce-dot 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface MessageThread {
  id: string;
  title: string;
  aiStaffId: string | null;
  createdBy: { id: string; name: string; email: string };
  aiStaff: { id: string; name: string; roleType: string } | null;
  _count?: { messages: number };
  createdAt: string;
}

interface Message {
  id: string;
  threadId: string;
  senderType: "USER" | "AI_STAFF";
  content: string;
  createdAt: string;
}

interface AIStaff {
  id: string;
  name: string;
  roleType: string;
}

export default function MessagesPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadStaffId, setNewThreadStaffId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads
  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["threads", wsId],
    queryFn: () =>
      apiGet<{ threads: MessageThread[] }>(`/api/workspaces/${wsId}/messages/threads`),
    enabled: !!wsId,
  });

  // Fetch single thread with messages
  const { data: threadData, isLoading: messagesLoading } = useQuery({
    queryKey: ["thread-detail", wsId, selectedThreadId],
    queryFn: () =>
      apiGet<{ thread: MessageThread & { messages: Message[] } }>(
        `/api/workspaces/${wsId}/messages/threads/${selectedThreadId}`
      ),
    enabled: !!wsId && !!selectedThreadId,
    refetchInterval: isStreaming ? false : 5000,
  });

  // Fetch AI staff for workspace
  const { data: staffData } = useQuery({
    queryKey: ["ai-staff", wsId],
    queryFn: () => apiGet<{ staff: AIStaff[] }>(`/api/workspaces/${wsId}/ai-staff`),
    enabled: !!wsId,
  });

  const threadList = threadsData?.threads || [];
  const messageList = threadData?.thread?.messages || [];
  const staffList = staffData?.staff || [];

  const selectedThread = threadList.find((t) => t.id === selectedThreadId);

  // Create thread
  const createThreadMutation = useMutation({
    mutationFn: () =>
      apiPost<{ thread: MessageThread }>(`/api/workspaces/${wsId}/messages/threads`, {
        title: newThreadTitle,
        aiStaffId: newThreadStaffId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["threads", wsId] });
      setSelectedThreadId(data.thread.id);
      setCreateOpen(false);
      setNewThreadTitle("");
      setNewThreadStaffId("");
    },
  });

  // Send message with streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!wsId || !selectedThreadId) return;

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetchWithAuth(
        `/api/workspaces/${wsId}/messages/threads/${selectedThreadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, stream: true }),
        }
      );

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("text/event-stream")) {
        // SSE streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "chunk" && parsed.content) {
                accumulatedContent += parsed.content;
                setStreamingContent(accumulatedContent);
              }
              if (parsed.type === "done" || parsed.type === "error") {
                // AI response complete, refresh messages
                queryClient.invalidateQueries({
                  queryKey: ["thread-detail", wsId, selectedThreadId],
                });
                queryClient.invalidateQueries({ queryKey: ["threads", wsId] });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } else {
        // Non-streaming JSON response (fallback)
        const data = await response.json();
        if (data.aiReply) {
          queryClient.invalidateQueries({
            queryKey: ["thread-detail", wsId, selectedThreadId],
          });
          queryClient.invalidateQueries({ queryKey: ["threads", wsId] });
        }
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [wsId, selectedThreadId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList.length, streamingContent]);

  const handleSend = () => {
    const content = newMessage.trim();
    if (!content) return;
    setNewMessage("");
    sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStaffName = (thread: MessageThread) =>
    thread.aiStaff?.name || "AI Staff";
  const getStaffRole = (thread: MessageThread) =>
    thread.aiStaff?.roleType || "assistant";

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left panel: Thread list */}
      <div className="w-80 flex-shrink-0 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Threads</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Thread</DialogTitle>
                <DialogDescription>
                  Start a new conversation with an AI staff member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>AI Staff</Label>
                  <Select onValueChange={setNewThreadStaffId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thread-title">Title</Label>
                  <Input
                    id="thread-title"
                    placeholder="Conversation topic..."
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                </div>
              </div>
              {createThreadMutation.isError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {createThreadMutation.error instanceof Error
                    ? createThreadMutation.error.message
                    : "Failed to create thread"}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createThreadMutation.mutate()}
                  disabled={
                    !newThreadTitle.trim() ||
                    !newThreadStaffId ||
                    createThreadMutation.isPending
                  }
                >
                  {createThreadMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : threadList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                No threads yet
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {threadList.map((thread) => (
                <button
                  key={thread.id}
                  className={cn(
                    "flex flex-col w-full rounded-md px-3 py-3 text-left transition-colors",
                    selectedThreadId === thread.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <p className="text-sm font-medium truncate">
                    {thread.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {getStaffName(thread)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {thread._count?.messages || 0} msgs
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Chat */}
      <div className="flex-1 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
        {!selectedThread ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Select a Thread
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation thread from the left panel
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="relative flex items-center gap-3 border-b border-border px-4 py-3 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
              <AvatarGenerator
                name={getStaffName(selectedThread)}
                role={getStaffRole(selectedThread)}
                size={32}
                colorTheme={staffColorTheme(getStaffName(selectedThread))}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedThread.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getStaffName(selectedThread)} &middot; {getStaffRole(selectedThread)}
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        i % 2 === 0 ? "justify-end" : "justify-start"
                      )}
                    >
                      <Skeleton className="h-16 w-64 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : messageList.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <>
                  {messageList.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-end gap-2 animate-fade-in",
                        msg.senderType === "USER"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {msg.senderType === "AI_STAFF" && selectedThread && (
                        <div className="flex-shrink-0">
                          <AvatarGenerator
                            name={getStaffName(selectedThread)}
                            role={getStaffRole(selectedThread)}
                            size={28}
                            colorTheme={staffColorTheme(getStaffName(selectedThread))}
                          />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-xl px-4 py-2.5",
                          msg.senderType === "USER"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            msg.senderType === "USER"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {msg.senderType === "USER" && (
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-white">U</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming AI response */}
                  {isStreaming && streamingContent && (
                    <div className="flex items-end gap-2 justify-start animate-fade-in">
                      <div className="flex-shrink-0">
                        <AvatarGenerator
                          name={getStaffName(selectedThread)}
                          role={getStaffRole(selectedThread)}
                          size={28}
                          colorTheme={staffColorTheme(getStaffName(selectedThread))}
                        />
                      </div>
                      <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-secondary text-foreground px-4 py-2.5">
                        <p className="text-sm whitespace-pre-wrap">
                          {streamingContent}
                          <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
                        </p>
                      </div>
                    </div>
                  )}

                  {isStreaming && !streamingContent && <TypingIndicator />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 group/input">
                  <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-focus-within/input:from-primary/40 group-focus-within/input:via-purple-500/30 group-focus-within/input:to-primary/40 transition-all duration-300 blur-[1px]" />
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    className="relative bg-card"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
