import { DailyVerse } from "../components/Daily Verse";
import { ChatArea } from "../components/Chat";
import { Sparkles, Heart } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-sacred">
      {/* Header */}
      <header className="py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-sacred-200/50">
              <Sparkles className="h-8 w-8 text-sacred-700" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient font-inter">
              DharmaBot
            </h1>
          </div>
          <p className="text-sacred-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Discover ancient wisdom for modern life through the timeless teachings of the Bhagavad Gita.
            Find guidance, peace, and purpose in your spiritual journey.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Daily Verse - Left Column */}
            <div className="lg:col-span-1 space-y-6">
              <DailyVerse />
              
              {/* Additional Info Card */}
              <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-sacred-200 shadow-sacred">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-5 w-5 text-red-400" />
                  <h3 className="font-semibold text-sacred-800 font-inter">About DharmaBot</h3>
                </div>
                <p className="text-sacred-600 text-sm leading-relaxed">
                  DharmaBot shares wisdom from the Bhagavad Gita to help you navigate life's challenges
                  with ancient spiritual insights. Ask questions about duty, purpose, and the path to inner peace.
                </p>
              </div>
            </div>

            {/* Chat Area - Right Column */}
            <div className="lg:col-span-2">
              <ChatArea />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-sacred-200/50">
        <p className="text-sacred-500 text-sm">
          Built with reverence for the eternal teachings of the Bhagavad Gita
        </p>
      </footer>
    </div>
  );
};

export default Index;