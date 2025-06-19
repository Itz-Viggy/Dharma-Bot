import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: 'user' | 'bot';
  text: string;
  timestamp?: Date;
}

export const ChatMessage = ({ role, text, timestamp }: ChatMessageProps) => {
  const isBot = role === 'bot';
  
  return (
    <div className={cn(
      "flex gap-3 mb-4 animate-slide-up",
      isBot ? "justify-start" : "justify-end"
    )}>
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sacred-200 to-sacred-300 flex items-center justify-center">
          <Bot className="h-4 w-4 text-sacred-700" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
        isBot 
          ? "bg-white border border-sacred-200 text-sacred-800" 
          : "bg-gradient-to-br from-sacred-400 to-sacred-500 text-[#b8864c]"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        {timestamp && (
          <p className={cn(
            "text-xs mt-1 opacity-70",
            isBot ? "text-sacred-500" : "text-sacred-100"
          )}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sacred-400 to-sacred-500 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
};