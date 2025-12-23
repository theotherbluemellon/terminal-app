import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

// GET /api/settings/:key
export function useSetting(key: string) {
  return useQuery({
    queryKey: [api.settings.get.path, key],
    queryFn: async () => {
      const url = buildUrl(api.settings.get.path, { key });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch setting");
      const data = await res.json();
      return parseWithLogging(api.settings.get.responses[200], data, `settings.get.${key}`);
    },
    retry: false,
  });
}

// PUT /api/settings/:key
export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const url = buildUrl(api.settings.update.path, { key });
      const validatedInput = api.settings.update.input.parse({ value });
      
      const res = await fetch(url, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
      });

      if (!res.ok) {
         if (res.status === 400) {
          const error = api.settings.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update setting");
      }
      
      const data = await res.json();
      return parseWithLogging(api.settings.update.responses[200], data, "settings.update");
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path, key] });
    },
  });
}
