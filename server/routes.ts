import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === Chat History ===
  app.get(api.chat.history.path, async (req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.delete(api.chat.clear.path, async (req, res) => {
    await storage.clearMessages();
    res.status(204).end();
  });

  // === Chat Send ===
  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message } = api.chat.send.input.parse(req.body);

      // 1. Save user message
      await storage.createMessage({ role: "user", content: message });

      // 2. Get LLM URL
      const urlSetting = await storage.getSetting("llm_url");
      const llmUrl = urlSetting?.value;

      let assistantContent = "";

      if (!llmUrl) {
        assistantContent = "Error: Local Llama URL not configured. Use `/config <url>` to set it. Example: `/config http://localhost:8080/v1/chat/completions`";
      } else {
        try {
            // Fetch history for context
            const history = await storage.getMessages();
            const messagesPayload = history.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Attempt to fetch from LLM
            // Assuming OpenAI compatible format as it's standard for wrappers (LocalAI, Ollama, llama-cpp-python)
            const response = await fetch(llmUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messagesPayload,
                    mode: "chat", // Some servers need this
                    // Add other standard params if needed, but keep it minimal
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server returned ${response.status}: ${text}`);
            }

            const data = await response.json();
            // Try to parse standard OpenAI format or simple format
            if (data.choices && data.choices[0] && data.choices[0].message) {
                assistantContent = data.choices[0].message.content;
            } else if (data.content) {
                assistantContent = data.content;
            } else {
                assistantContent = "Error: Could not parse LLM response. Raw: " + JSON.stringify(data).substring(0, 100) + "...";
            }

        } catch (error: any) {
            assistantContent = `Error connecting to LLM at ${llmUrl}: ${error.message}`;
        }
      }

      // 3. Save assistant message
      const responseMessage = await storage.createMessage({
        role: "assistant",
        content: assistantContent,
      });

      res.json(responseMessage);

    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // === Settings ===
  app.get(api.settings.get.path, async (req, res) => {
    const key = req.params.key;
    const setting = await storage.getSetting(key);
    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json(setting);
  });

  app.put(api.settings.update.path, async (req, res) => {
    const key = req.params.key;
    const { value } = api.settings.update.input.parse(req.body);
    const setting = await storage.updateSetting(key, value);
    res.json(setting);
  });

  // Seed initial welcome message if empty
  const existing = await storage.getMessages();
  if (existing.length === 0) {
      await storage.createMessage({
          role: "assistant",
          content: "Welcome to LlamaTerm v1.0.\nType `/config <url>` to connect to your local Llama server.\nType `/help` for commands."
      });
  }

  return httpServer;
}
