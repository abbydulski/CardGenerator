"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// Check if Web Share API is available (primarily mobile browsers)
const canUseWebShare = () => {
  return typeof navigator !== "undefined" && !!navigator.share;
};

// Check if we can share files (more limited support)
const canShareFiles = () => {
  return typeof navigator !== "undefined" && !!navigator.canShare;
};

const CATEGORIES = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "thank-you", label: "Thank You" },
  { id: "get-well", label: "Get Well" },
  { id: "wedding", label: "Wedding" },
  { id: "graduation", label: "Graduation" },
  { id: "holiday", label: "Holiday" },
];

const ART_STYLES = [
  { id: "editorial-painterly", label: "Editorial/Painterly" },
  { id: "watercolor", label: "Watercolor" },
  { id: "ink-sketch", label: "Ink Sketch" },
  { id: "minimalist", label: "Minimalist" },
  { id: "vintage", label: "Vintage" },
];

const FONT_SIZES = [
  { id: "small", label: "Small", size: 10 },
  { id: "medium", label: "Medium", size: 14 },
  { id: "large", label: "Large", size: 18 },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("birthday");
  const [artStyle, setArtStyle] = useState("editorial-painterly");
  const [insideMessage, setInsideMessage] = useState("");
  const [messageFontSize, setMessageFontSize] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [webShareAvailable, setWebShareAvailable] = useState(false);

  // Check for Web Share API availability on mount (client-side only)
  useEffect(() => {
    setWebShareAvailable(canUseWebShare());
  }, []);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showShareMenu && !(e.target as Element).closest('.share-menu-container')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

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
        body: JSON.stringify({ description, category, artStyle }),
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

  const handleRegenerate = () => {
    if (isLoading || !description.trim()) return;

    // Trigger regeneration by simulating form submit
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  // Convert image URL to blob for sharing
  const getImageBlob = async (): Promise<Blob | null> => {
    if (!generatedImage) return null;
    try {
      const response = await fetch(generatedImage);
      return await response.blob();
    } catch {
      return null;
    }
  };

  // Native Web Share API (mobile/modern browsers)
  const handleNativeShare = async () => {
    if (!generatedImage) return;

    try {
      const blob = await getImageBlob();
      if (!blob) throw new Error("Could not load image");

      // Try sharing as a file first (better experience)
      if (canShareFiles()) {
        const file = new File([blob], "anycard.png", { type: "image/png" });
        const shareData = { files: [file] };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setShareStatus("Shared successfully!");
          setTimeout(() => setShareStatus(null), 2000);
          return;
        }
      }

      // Fallback: Share with URL (if the image is a URL we can share)
      await navigator.share({
        title: "Check out my AnyCard!",
        text: "I created this custom greeting card with AnyCard",
      });
      setShareStatus("Shared successfully!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      // User cancelled or share failed
      if (err instanceof Error && err.name !== "AbortError") {
        setShareStatus("Share failed. Try copying instead.");
        setTimeout(() => setShareStatus(null), 3000);
      }
    }
    setShowShareMenu(false);
  };

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (!generatedImage) return;

    try {
      const blob = await getImageBlob();
      if (!blob) throw new Error("Could not load image");

      // Try using Clipboard API with ClipboardItem
      if (typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([clipboardItem]);
        setShareStatus("Image copied to clipboard!");
      } else {
        // Fallback for browsers that don't support ClipboardItem
        throw new Error("Clipboard API not supported");
      }
    } catch {
      // Fallback: Copy the image URL instead
      try {
        await navigator.clipboard.writeText(generatedImage);
        setShareStatus("Image URL copied to clipboard!");
      } catch {
        setShareStatus("Copy failed. Try downloading instead.");
      }
    }
    setTimeout(() => setShareStatus(null), 2000);
    setShowShareMenu(false);
  };

  // Share to Twitter/X
  const handleShareTwitter = () => {
    const text = encodeURIComponent("Check out this custom greeting card I made with AnyCard! ✨");
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, "_blank", "width=550,height=420");
    setShowShareMenu(false);
  };

  // Share to Facebook
  const handleShareFacebook = () => {
    // Facebook requires a URL to share - we'll prompt user to share after downloading
    setShareStatus("Download the image first, then share on Facebook!");
    setTimeout(() => setShareStatus(null), 3000);
    handleDownloadPNG();
    setShowShareMenu(false);
  };

  const handleDownloadPDF = async () => {
    if (!generatedImage) return;

    try {
      // US Letter landscape (11" x 8.5"), folds to 5.5" x 8.5" card
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });

      const pageWidth = 11;
      const pageHeight = 8.5;
      const halfWidth = pageWidth / 2; // 5.5"

      // --- PAGE 1: OUTSIDE OF CARD ---
      // Dashed fold line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineDashPattern([0.1, 0.1], 0);
      pdf.line(halfWidth, 0, halfWidth, pageHeight);

      // Left half = Back of card (small branding)
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text("made with AnyCard", 0.3, pageHeight - 0.3);

      // Right half = Front cover (artwork fills entire panel)
      pdf.addImage(generatedImage, "PNG", halfWidth, 0, halfWidth, pageHeight);

      // --- PAGE 2: INSIDE OF CARD ---
      pdf.addPage("letter", "landscape");

      // Fold line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineDashPattern([0.1, 0.1], 0);
      pdf.line(halfWidth, 0, halfWidth, pageHeight);

      // Subtle corner flourishes on inside left
      pdf.setDrawColor(250, 220, 220);
      pdf.setLineWidth(0.01);
      pdf.setLineDashPattern([], 0);
      pdf.line(0.3, 0.6, 0.3, 0.3);
      pdf.line(0.3, 0.3, 0.6, 0.3);
      pdf.line(halfWidth - 0.6, pageHeight - 0.3, halfWidth - 0.3, pageHeight - 0.3);
      pdf.line(halfWidth - 0.3, pageHeight - 0.3, halfWidth - 0.3, pageHeight - 0.6);

      // Inside right panel - message or writing lines
      const messageMarginX = 0.75;
      const messageStartX = halfWidth + messageMarginX;
      const messageMaxWidth = halfWidth - (messageMarginX * 2);

      if (insideMessage.trim()) {
        // Render the custom message
        const fontSizeConfig = FONT_SIZES.find(f => f.id === messageFontSize) || FONT_SIZES[1];
        pdf.setFontSize(fontSizeConfig.size);
        pdf.setTextColor(60, 60, 60);

        // Calculate line height based on font size (roughly 1.4x font size in points, converted to inches)
        const lineHeightInches = (fontSizeConfig.size * 1.4) / 72;

        // Split text into lines that fit within the message area
        const lines = pdf.splitTextToSize(insideMessage, messageMaxWidth);

        // Calculate vertical centering
        const totalTextHeight = lines.length * lineHeightInches;
        const availableHeight = pageHeight - 2; // 1" margin top and bottom
        const startY = Math.max(1, (pageHeight - totalTextHeight) / 2);

        // Render each line, limiting to what fits in the available space
        const maxLines = Math.floor(availableHeight / lineHeightInches);
        const linesToRender = lines.slice(0, maxLines);

        linesToRender.forEach((line: string, index: number) => {
          pdf.text(line, messageStartX, startY + (index * lineHeightInches));
        });

        // If text was truncated, add ellipsis indicator
        if (lines.length > maxLines) {
          pdf.setFontSize(8);
          pdf.setTextColor(180, 180, 180);
          pdf.text("...", messageStartX, pageHeight - 0.5);
        }
      } else {
        // Default: writing lines for handwritten messages
        pdf.setDrawColor(245, 245, 245);
        pdf.setLineWidth(0.005);

        const lineStartX = messageStartX;
        const lineEndX = pageWidth - messageMarginX;
        const startY = 2;
        const lineSpacing = 0.5;

        for (let i = 0; i < 10; i++) {
          pdf.line(lineStartX, startY + (i * lineSpacing), lineEndX, startY + (i * lineSpacing));
        }
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
                Describe someone special, and watch as AI transforms your words into a unique, hand-sketched card design. Powered by <span className="text-rose-400">Reve</span> & <span className="text-amber-500">Claude Code</span>. Download the PDF for a printable, foldable card!
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

              {/* Art Style Selection */}
              <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
                <label className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-4">
                  Art Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {ART_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setArtStyle(style.id)}
                      className={`category-btn px-4 py-2 text-xs tracking-wide border transition-all ${
                        artStyle === style.id
                          ? "active"
                          : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                      }`}
                    >
                      {style.label}
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

              {/* Inside Message Input */}
              <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
                <div className="flex items-center justify-between mb-4">
                  <label
                    htmlFor="insideMessage"
                    className="block text-xs tracking-[0.2em] uppercase text-neutral-400"
                  >
                    Inside Message
                    <span className="ml-2 text-neutral-300 normal-case tracking-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Size:</span>
                    {FONT_SIZES.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setMessageFontSize(font.id)}
                        className={`px-2 py-1 text-xs border rounded transition-all ${
                          messageFontSize === font.id
                            ? "border-rose-300 text-rose-500 bg-rose-50"
                            : "border-neutral-200 text-neutral-400 hover:border-neutral-400"
                        }`}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="insideMessage"
                  value={insideMessage}
                  onChange={(e) => setInsideMessage(e.target.value)}
                  placeholder="Happy Birthday! Wishing you all the best on your special day..."
                  className="art-input w-full h-24 p-0 bg-transparent border-0 border-b border-neutral-200 focus:ring-0 outline-none resize-none text-neutral-800 placeholder:text-neutral-300 text-sm leading-relaxed"
                />
                <p className="mt-2 text-xs text-neutral-400">
                  This message will appear on the inside-right panel of your PDF card
                </p>
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
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </button>
                  {/* Mobile Share Button - uses native share on mobile */}
                  <button
                    onClick={webShareAvailable ? handleNativeShare : () => setShowShareMenu(!showShareMenu)}
                    className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                </div>
                {/* Share status message - mobile */}
                {shareStatus && (
                  <div className="mt-2 text-xs text-rose-500 animate-fade-in">
                    {shareStatus}
                  </div>
                )}
              </div>
            )}

            {/* Desktop: Download buttons when image exists */}
            {generatedImage && (
              <div className="hidden lg:block mt-8 animate-fade-in">
                <div className="flex gap-6">
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
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </button>
                  {/* Desktop Share Button with dropdown menu */}
                  <div className="relative share-menu-container">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="flex items-center gap-2 text-neutral-600 hover:text-rose-500 text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                      <svg className={`w-3 h-3 transition-transform ${showShareMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Share dropdown menu */}
                    {showShareMenu && (
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-100 py-2 z-10 animate-fade-in">
                        <button
                          onClick={handleCopyImage}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-rose-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy to Clipboard
                        </button>
                        {webShareAvailable && (
                          <button
                            onClick={handleNativeShare}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-rose-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Share...
                          </button>
                        )}
                        <div className="border-t border-neutral-100 my-1"></div>
                        <button
                          onClick={handleShareTwitter}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-rose-500 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          Share on X
                        </button>
                        <button
                          onClick={handleShareFacebook}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-rose-500 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          Share on Facebook
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Share status message - desktop */}
                {shareStatus && (
                  <div className="mt-3 text-xs text-rose-500 animate-fade-in">
                    {shareStatus}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
