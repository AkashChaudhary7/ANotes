import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy-loaded Google GenAI agent helper
  let aiInstance: GoogleGenAI | null = null;
  function getAI() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it in your Secrets configurations.");
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: AI Quiz Generator
  app.post("/api/quiz/generate", async (req: express.Request, res: express.Response) => {
    try {
      const { noteTitle, noteContent, numQuestions, difficulty } = req.body;
      if (!noteContent || String(noteContent).trim().length === 0) {
        return res.status(400).json({ error: "Source note content is empty. Add more blocks or text to your study notes before generating a quiz." });
      }

      const ai = getAI();
      const prompt = `Generate a high-yield study quiz based on the following notes.
Note Title: "${noteTitle || 'Untitled Note'}"
Note Content:
${noteContent}

Provide exactly ${numQuestions || 5} multiple-choice questions at "${difficulty || 'medium'}" difficulty level.
For each question:
1. Formulate a precise, informative quiz question checking conceptual understanding of the note.
2. Provide exactly 4 concise options.
3. Identify the 0-indexed correct option (correctOptionIndex).
4. Provide a rich, helpful explanation detailing why the choice is correct, reinforcing the surrounding concept.

Return the result as a JSON array matching the required schema. Ensure the explanation is inspiring and educates on the core topic.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite academic study partner and SSC test architect. You generate high-performance multiple-choice assessment questions with precise answer explanations based on the supplied source notes text.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                correctOptionIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctOptionIndex", "explanation"]
            }
          }
        }
      });

      const parsedText = response.text;
      if (!parsedText) {
        throw new Error("AI generated an empty response string.");
      }
      res.json({ quiz: JSON.parse(parsedText) });
    } catch (error: any) {
      console.error("AI Quiz generation failed error details:", error);
      res.status(500).json({ error: error.message || "Failed to generate study quiz through Gemini." });
    }
  });

  // Vite development middleware vs. static client servings
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ANotes Server booted on http://localhost:${PORT}`);
  });
}

startServer();
