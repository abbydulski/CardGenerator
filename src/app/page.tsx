"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

const CATEGORIES = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "thank-you", label: "Thank You" },
  { id: "get-well", label: "Get Well" },
  { id: "wedding", label: "Wedding" },
  { id: "graduation", label: "Graduation" },
  { id: "holiday", label: "Holiday" },
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

  const handleDownloadPNG = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "anycard.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImage, "_blank");
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedImage) return;

    try {
      // Create a new PDF (A5 folded card - 148mm x 210mm, folds to A6)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5",
      });

      const pageWidth = 210;
      const pageHeight = 148;
      const halfWidth = pageWidth / 2;

      // Load image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = generatedImage;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Calculate dimensions for the front cover (right half)
      const imgRatio = img.width / img.height;
      const panelRatio = halfWidth / pageHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > panelRatio) {
        drawWidth = halfWidth;
        drawHeight = halfWidth / imgRatio;
        offsetX = 0;
        offsetY = (pageHeight - drawHeight) / 2;
      } else {
        drawHeight = pageHeight;
        drawWidth = pageHeight * imgRatio;
        offsetX = (halfWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // --- PAGE 1: OUTSIDE OF CARD ---
      // Left half = Back of card (blank with small branding)
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(halfWidth, 0, halfWidth, pageHeight); // Fold line

      // Small branding on back
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text("made with AnyCard", 10, pageHeight - 8);

      // Right half = Front cover (the artwork)
      pdf.addImage(generatedImage, "PNG", halfWidth + offsetX, offsetY, drawWidth, drawHeight);

      // --- PAGE 2: INSIDE OF CARD ---
      pdf.addPage("a5", "landscape");

      // Left half = Inside left (subtle decorative element)
      pdf.setLineDashPattern([2, 2], 0);
      pdf.setDrawColor(230, 230, 230);
      pdf.line(halfWidth, 0, halfWidth, pageHeight); // Fold line

      // Subtle decorative corner flourish on inside left
      pdf.setDrawColor(245, 200, 200);
      pdf.setLineWidth(0.3);
      // Top left corner arc
      pdf.line(5, 20, 5, 5);
      pdf.line(5, 5, 20, 5);
      // Bottom right corner arc
      pdf.line(halfWidth - 20, pageHeight - 5, halfWidth - 5, pageHeight - 5);
      pdf.line(halfWidth - 5, pageHeight - 5, halfWidth - 5, pageHeight - 20);

      // Right half = Inside right (message area)
      // Add subtle lines for writing
      pdf.setDrawColor(240, 240, 240);
      pdf.setLineDashPattern([], 0);
      pdf.setLineWidth(0.2);

      const lineStartX = halfWidth + 20;
      const lineEndX = pageWidth - 20;
      const startY = 50;
      const lineSpacing = 12;

      for (let i = 0; i < 6; i++) {
        const y = startY + (i * lineSpacing);
        pdf.line(lineStartX, y, lineEndX, y);
      }

      pdf.save("anycard.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-light tracking-tight text-neutral-900">
          Any<span className="text-rose-400">Card</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-screen">
        {/* Left Side - Image */}
        <div className="hidden lg:block w-1/2 relative">
          {generatedImage ? (
            <div className="absolute inset-0 p-12 flex items-center justify-center animate-fade-in">
              <img
                src={generatedImage}
                alt="Generated card"
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-neutral-300 animate-fade-in">
                <div className="text-8xl mb-4">✎</div>
                <p className="text-sm tracking-widest uppercase">Your card will appear here</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-32 bg-white/50">
          <div className="max-w-md">
            {/* Intro */}
            <div className="mb-12 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-0 h-px bg-rose-300 animate-line"></div>
                <span className="text-xs tracking-[0.3em] uppercase text-rose-400">Create</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-light leading-tight text-neutral-900 mb-4">
                Art-Crafted<br />
                <span className="italic text-rose-400">Greeting Cards</span>
              </h1>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Describe someone special, and watch as AI transforms your words into a unique, hand-sketched card design. Powered by <span className="text-rose-400">Reve</span> & <span className="text-amber-500">Claude Code</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Category Selection */}
              <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <label className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-4">
                  Occasion
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`category-btn px-4 py-2 text-xs tracking-wide border transition-all ${
                        category === cat.id
                          ? "active"
                          : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <label
                  htmlFor="description"
                  className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-4"
                >
                  Describe the recipient
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="My girlfriend who loves coffee and golden retrievers..."
                  className="art-input w-full h-32 p-0 bg-transparent border-0 border-b border-neutral-200 focus:ring-0 outline-none resize-none text-neutral-800 placeholder:text-neutral-300 text-sm leading-relaxed"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !description.trim()}
                className="generate-btn group flex items-center gap-3 text-neutral-900 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all py-3 animate-fade-in"
                style={{ animationDelay: "0.3s" }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Creating artwork...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Card</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-8 text-red-500 text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Mobile: Show generated image */}
            {generatedImage && (
              <div className="lg:hidden mt-12 space-y-6 animate-fade-in">
                <img src={generatedImage} alt="Generated card" className="w-full shadow-xl" />
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleDownloadPNG}
                    className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PNG
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                </div>
              </div>
            )}

            {/* Desktop: Download buttons when image exists */}
            {generatedImage && (
              <div className="hidden lg:flex mt-8 gap-6 animate-fade-in">
                <button
                  onClick={handleDownloadPNG}
                  className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PNG
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
