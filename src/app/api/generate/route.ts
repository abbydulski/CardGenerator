import { NextRequest, NextResponse } from "next/server";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const REVE_API_URL = "https://api.reve.com/v1/image/create";

async function generateImagePrompt(description: string): Promise<string> {
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
          content: `You are a creative artist designing a beautiful greeting card that will be printed. Based on this description of who the card is for, create a detailed image generation prompt.

Description: "${description}"

Create a prompt for an AI image generator to create a PRINTABLE greeting card design. The prompt MUST specify:
- A clean white or light solid background suitable for printing
- The card should be a complete, self-contained card design with clear borders/edges
- Include decorative elements, illustrations, and/or patterns related to the person's interests
- Leave space for a personal message (either blank area or subtle lined area)
- Include artistic style directions (e.g., watercolor illustration, hand-drawn, elegant minimalist, whimsical)
- Portrait orientation, like a real greeting card
- The design should look like an actual card you'd find in a store, ready to print and fold

Do NOT describe: busy backgrounds, photorealistic scenes, or complex environments. Focus on the card itself as a printable product.

Only respond with the image generation prompt, nothing else.`,
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
    const { description } = await request.json();

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
    const imagePrompt = await generateImagePrompt(description);
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

