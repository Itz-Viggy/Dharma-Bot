"use client";
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChatMessage } from "./message";
import { ChatInput } from "./input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const botResponses = [
  "In the Bhagavad Gita, Krishna teaches us that true wisdom comes from understanding our dharma - our righteous duty in life.",
  "Remember, the path of dharma is not always easy, but it leads to inner peace and spiritual growth.",
  "As Lord Krishna says, 'You have the right to perform your actions, but never to the fruits of actions.'",
  "Dharma is like a river - it flows naturally when we align ourselves with righteousness and truth.",
  "The Gita teaches us that in times of confusion, we must look within and connect with our higher purpose.",
  "True strength comes not from the body, but from cultivating wisdom, compassion, and devotion.",
  "When we act without attachment to results, we find freedom in every action we perform.",
];

export const ChatArea = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      text: "🙏 Namaste! I'm DharmaBot, here to share wisdom from the Bhagavad Gita and help you reflect on life's deeper questions. How can I guide you today?",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate bot thinking time
    setTimeout(() => {
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: randomResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-b from-white to-sacred-50/30 border-sacred-200 shadow-sacred">
      <div className="p-6 border-b border-sacred-200">
        <h2 className="text-2xl font-bold text-gradient font-inter">DharmaBot</h2>
        <p className="text-sacred-600 text-sm mt-1">Wisdom from the Bhagavad Gita</p>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              text={message.text}
              timestamp={message.timestamp}
            />
          ))}
          
          {isTyping && (
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sacred-200 to-sacred-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-pulse" />
              </div>
              <div className="bg-white border border-sacred-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1  ">
                  <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-[#b8864c] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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