import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant' or 'system'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., 'llm_url', 'model_name'
  value: text("value").notNull(),
});

// === BASE SCHEMAS ===
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Request types
export type CreateMessageRequest = InsertMessage;
export type UpdateSettingRequest = { value: string };

// Response types
export type MessageResponse = Message;
export type MessagesListResponse = Message[];
export type SettingResponse = Setting;

// Chat completion request to the proxy
export type ChatRequest = {
  message: string;
};
