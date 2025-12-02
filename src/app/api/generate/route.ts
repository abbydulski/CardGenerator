import { NextRequest, NextResponse } from "next/server";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const REVE_API_URL = "https://api.reve.com/v1/image/create";

const CATEGORY_THEMES: Record<string, string> = {
  birthday: "birthday celebration with festive elements like balloons, confetti, cake, or candles",
  anniversary: "romantic anniversary with elegant hearts, flowers, or intertwined elements",
  "thank-you": "gratitude and appreciation with warm, heartfelt imagery like flowers or gentle patterns",
  "get-well": "healing and comfort with soothing colors, flowers, sunshine, or peaceful imagery",
  wedding: "wedding celebration with elegant romance, rings, flowers, doves, or delicate lace patterns",
  graduation: "graduation achievement with caps, diplomas, stars, or celebratory academic elements",
  holiday: "winter holiday celebration with festive elements like snowflakes, Christmas trees, ornaments, holly, stars, or cozy seasonal imagery",
};

async function generateImagePrompt(description: string, category: string): Promise<string> {
  const categoryTheme = CATEGORY_THEMES[category] || CATEGORY_THEMES.birthday;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are designing a greeting card for print. Generate an image prompt based on:

Card Type: ${category.toUpperCase()}
Theme: ${categoryTheme}
For: "${description}"

CRITICAL REQUIREMENTS:
1. FULL BLEED: The design must extend to ALL edges of the image. NO margins. NO borders. NO frame. The image IS the card - every pixel is part of the card design.
2. WHITE/CREAM BACKGROUND: Use a clean white or soft cream background
3. ARTISTIC STYLE: Hand-drawn sketch aesthetic, watercolor touches, delicate line art, warm and whimsical illustration style
4. Include ${category}-themed elements personalized for the recipient
5. Leave an area for a handwritten message
6. Portrait orientation - this is the FRONT of a greeting card

DO NOT include:
- Any border or frame around the design
- The card shown as an object on a table/surface
- Any mockup-style presentation
- Margins or empty space at edges

The generated image will be printed directly as the card. Design must go edge-to-edge.

Respond with ONLY the image generation prompt.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Claude API error:", error);
    throw new Error("Failed to generate prompt with Claude");
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateImage(prompt: string): Promise<string> {
  const response = await fetch(REVE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.REVE_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Reve API error:", error);
    throw new Error("Failed to generate image with Reve");
  }

  const data = await response.json();
  
  // Reve returns base64 image in JSON format
  if (data.image) {
    // Return as data URL for direct display
    return `data:image/png;base64,${data.image}`;
  }
  
  // If there's a URL directly
  if (data.url) {
    return data.url;
  }

  throw new Error("No image in Reve response");
}

export async function POST(request: NextRequest) {
  try {
    const { description, category = "birthday" } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: "Claude API key not configured" },
        { status: 500 }
      );
    }

    if (!process.env.REVE_API_KEY) {
      return NextResponse.json(
        { error: "Reve API key not configured" },
        { status: 500 }
      );
    }

    // Step 1: Generate creative prompt with Claude
    console.log("Generating prompt with Claude...");
    const imagePrompt = await generateImagePrompt(description, category);
    console.log("Generated prompt:", imagePrompt);

    // Step 2: Generate image with Reve
    console.log("Generating image with Reve...");
    const imageUrl = await generateImage(imagePrompt);
    console.log("Image generated successfully");

    return NextResponse.json({ 
      imageUrl,
      prompt: imagePrompt 
    });
  } catch (error) {
    console.error("Error generating card:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate card" },
      { status: 500 }
    );
  }
}

