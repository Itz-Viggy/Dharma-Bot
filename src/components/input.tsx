import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about dharma, wisdom, or life guidance..."
        disabled={disabled}
        className="flex-1 bg-white border-sacred-200 focus:border-sacred-400 focus:outline-none focus:ring-0 placeholder:text-sacred-400"



      />
      <Button 
        type="submit" 
        disabled={!message.trim() || disabled}
        className="bg-gradient-to-r from-[#b8864c] to-[#5a3e1b] hover:from-[#a6763f] hover:to-[#3f2a13] text-white font-semibold shadow-md hover:shadow-xl transition-all duration-300 ease-in-out rounded-xl px-6 py-2"

      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};