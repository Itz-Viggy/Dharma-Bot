"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChatMessage } from "./message";
import { ChatInput } from "./input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface VerseMetadata {
  id: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  transliteration: string;
  word_meanings: string;
}

interface ChromaResponse {
  answer?: string;
  metadatas?: VerseMetadata[];
}

export const ChatArea = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "bot-welcome",
      role: "bot",
      text: "🙏 Namaste! I'm DharmaBot, here to share wisdom from the Bhagavad Gita and help you reflect on life's deeper questions. How can I guide you today?",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });
      const data: ChromaResponse = await res.json();

      if (data.answer) {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else if (data.metadatas) {
        const botVerses: Message[] = data.metadatas.map(
          (md: VerseMetadata, i: number): Message => ({
            id: `bot-${Date.now()}-${i}`,
            role: "bot",
            text: `📜 ${md.chapter}.${md.verse} — ${md.translation}\n\n_(${md.transliteration})_`,
            timestamp: new Date(),
          })
        );
        setMessages((prev) => [...prev, ...botVerses]);
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("DharmaBot query failed", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          role: "bot",
          text: "😔 Sorry, I couldn’t reach the wisdom archive just now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-b from-white to-sacred-50/30 border-sacred-200 shadow-sacred">
      <div className="p-6 border-b border-sacred-200">
        <h2 className="text-2xl font-bold text-gradient font-inter">DharmaBot</h2>
        <p className="text-sacred-600 text-sm mt-1">
          Wisdom from the Bhagavad Gita
        </p>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              text={m.text}
              timestamp={m.timestamp}
            />
          ))}

          {isTyping && (
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sacred-200 to-sacred-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-pulse" />
              </div>
              <div className="bg-white border border-sacred-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-sacred-200 bg-sacred-50/50">
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </div>
    </Card>
  );
};
