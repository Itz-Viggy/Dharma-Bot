import { DailyVerse } from "../components/Daily Verse";
import { ChatArea } from "../components/Chat";
import { Sparkles, Heart } from "lucide-react";

const Index = () => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #fefcf3 0%, #f7f1e3 50%, #f0e9d2 100%)",
      }}
    >
      {/* Header */}
      <header className="py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: "rgba(250,240,196,0.5)" }}
            >
              <Sparkles
                className="h-8 w-8"
                style={{ color: "#b8864c" }}
              />
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold font-inter"
              style={{
                background: "linear-gradient(to right, #d97706, #facc15, #fbbf24)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              DharmaBot
            </h1>
          </div>
          <p
            className="text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "#d4a55a" }}
          >
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
            <div className="lg:col-span-1 space-y-6 text-[#b8864c]">
              <DailyVerse />

              {/* Additional Info Card */}
              <div
                className="p-6 rounded-2xl border shadow-sacred"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  borderColor: "#faf0c4",
                  boxShadow: "0 10px 40px -10px rgba(184, 134, 11, 0.1), 0 4px 20px -5px rgba(184, 134, 11, 0.05)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-5 w-5" style={{ color: "#ef4444" }} />
                  <h3 className="font-semibold font-inter" style={{ color: "#976a45" }}>
                    About DharmaBot
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#d4a55a" }}>
                  DharmaBot shares wisdom from the Bhagavad Gita to help you navigate life's challenges
                  with ancient spiritual insights. Ask questions about duty, purpose, and the path to inner peace.
                </p>
              </div>
            </div>

            {/* Chat Area - Right Column */}
            <div className="lg:col-span-2 text-[#b8864c]">
              <ChatArea />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-8 px-6 text-center"
        style={{
          borderTopWidth: "1px",
          borderTopStyle: "solid",
          borderTopColor: "rgba(250,240,196,0.5)",
        }}
      >
        <p className="text-sm" style={{ color: "#faf0c4" }}>
          Built with reverence for the eternal teachings of the Bhagavad Gita
        </p>
      </footer>
    </div>
  );
};

export default Index;
