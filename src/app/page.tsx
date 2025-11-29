"use client";

import { useState } from "react";

const CATEGORIES = [
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "anniversary", label: "Anniversary", emoji: "💕" },
  { id: "thank-you", label: "Thank You", emoji: "🙏" },
  { id: "get-well", label: "Get Well Soon", emoji: "💐" },
  { id: "wedding", label: "Wedding", emoji: "💒" },
  { id: "graduation", label: "Graduation", emoji: "🎓" },
  { id: "holiday", label: "Holiday", emoji: "🎄" },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("birthday");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate card");
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "card-reve.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImage, "_blank");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Card Reve
          </h1>
          <p className="text-gray-400 text-lg md:text-xl tracking-wide">
            AI-powered cards for every occasion
          </p>
        </div>

        {/* Main Card */}
        <div className="glass rounded-3xl p-6 md:p-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Category Selection */}
            <div>
              <label className="block text-gray-300 font-medium mb-4 text-sm uppercase tracking-wider">
                Select Occasion
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`category-btn p-3 rounded-xl border border-white/10 text-center ${
                      category === cat.id
                        ? "active text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.emoji}</span>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label
                htmlFor="description"
                className="block text-gray-300 font-medium mb-4 text-sm uppercase tracking-wider"
              >
                Describe the recipient
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., My girlfriend who loves golden retrievers and sunflowers..."
                className="w-full h-32 p-5 bg-white/5 border border-white/10 rounded-2xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none text-white placeholder:text-gray-500 transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !description.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-lg rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-gradient relative overflow-hidden group"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating your card...
                </span>
              ) : (
                <>
                  <span className="relative z-10">Generate Card</span>
                  <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100" />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center">
              {error}
            </div>
          )}

          {generatedImage && (
            <div className="mt-10 space-y-6 animate-fade-in-up">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={generatedImage} alt="Generated card" className="w-full h-auto" />
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-4 px-6 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Card
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 mt-8 text-sm">
          Powered by Claude AI & Reve
        </p>
      </div>
    </main>
  );
}
