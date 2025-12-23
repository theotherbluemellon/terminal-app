import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MessageResponse } from "@shared/routes";
import { z } from "zod";

// Helper to log validation errors
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // In production we might want to throw, but for dev resilience we might return partial or throw
    throw result.error;
  }
  return result.data;
}

// GET /api/chat/history
export function useChatHistory() {
  return useQuery({
    queryKey: [api.chat.history.path],
    queryFn: async () => {
      const res = await fetch(api.chat.history.path);
      if (!res.ok) throw new Error("Failed to fetch chat history");
      const data = await res.json();
      return parseWithLogging(api.chat.history.responses[200], data, "chat.history");
    },
  });
}

// POST /api/chat
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      // Validate input
      const validatedInput = api.chat.send.input.parse({ message });
      
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.chat.send.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 500) {
           const error = api.chat.send.responses[500].parse(await res.json());
           throw new Error(error.message);
        }
        throw new Error("Failed to send message");
      }

      const data = await res.json();
      return parseWithLogging(api.chat.send.responses[200], data, "chat.send");
    },
    onSuccess: (newMessage) => {
      // Optimistically update or invalidate
      queryClient.setQueryData(
        [api.chat.history.path], 
        (old: MessageResponse[] | undefined) => old ? [...old, newMessage] : [newMessage]
      );
      queryClient.invalidateQueries({ queryKey: [api.chat.history.path] });
    },
  });
}

// DELETE /api/chat/history
export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.chat.clear.path, {
        method: api.chat.clear.method,
      });
      if (!res.ok) throw new Error("Failed to clear history");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.chat.history.path], []);
    },
  });
}
