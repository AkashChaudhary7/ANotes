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

  // API Route: AI Writing Assistant, Explainer, and Custom Diagram Maker
  app.post("/api/ai/assist", async (req: express.Request, res: express.Response) => {
    try {
      const { text, action, contextNoteTitle } = req.body;
      if (!text || String(text).trim().length === 0) {
        return res.status(400).json({ error: "Source text context is empty. Please enter or select some text." });
      }

      const ai = getAI();
      let systemInstruction = "";
      let userPrompt = "";

      switch (action) {
        case "summarize":
          systemInstruction = "You are a professional executive editor. You write elegant, concise summaries capturing key definitions and takeaways.";
          userPrompt = `Please synthesize and summarize the following notes. Organize it into scannable key bullet points and high-level summaries using HTML tags like <p>, <ul>, <li>, and <strong>.
Notes Title: "${contextNoteTitle || 'Untitled Note'}"
Content to summarize:
${text}`;
          break;

        case "enhance":
          systemInstruction = "You are an elite, Nobel-class editor. You polish writing, improve vocabulary, fix grammar, and make sentences flow with rhythmic majesty, while preserving the original facts and meaning.";
          userPrompt = `Please enhance and polish this paragraph. Make it highly professional and premium, while retaining exactly the original core meaning. Use HTML formatting if appropriate (like inside <strong> or <em> tags).
Paragraph:
${text}`;
          break;

        case "expand":
          systemInstruction = "You are an award-winning research author and educational scholar. You expand on user ideas, write coherent next paragraphs with deep explanations, facts, and engaging tone.";
          userPrompt = `Based on this text, write the next logical paragraph to expand deeply on the topic, continuing the style and tone seamlessly. Return only the newly generated continuation paragraph with clean HTML line spacing or tag styling.
Context text:
${text}`;
          break;

        case "simplify":
          systemInstruction = "You are an expert communicator who explains complex scientific, mathematical, and technical concepts to a 10-year-old using memorable analogies and simple, vivid descriptions.";
          userPrompt = `Please rewrite the following scientific/technical block to make it extremely clean and readable. Use an intuitive analogy to make the core mechanism immediately memorable:
Concept details:
${text}`;
          break;

        case "translate_academic":
          systemInstruction = "You are an elite multilingual academic translator fluent in English, Hindi, and classical Sanskrit (with precise grammar and academic depth).";
          userPrompt = `Please translate the following text into polished academic Hindi with correct vocabulary and structure. Also provide transliterated English pronunciation and the Sanskrit root/shloka translation if applicable. Format elegantly with HTML.
Source English Text:
${text}`;
          break;

        case "concept-diagram":
          systemInstruction = "You are a senior technical illustrator and professional UI system engineer who creates high-performance, pristine, fully responsive SVG visual diagrams and charts.";
          userPrompt = `Create a gorgeous, clean, modern vector SVG graphic that represents and illustrates the following academic topic or concept: "${text}".

SVG design specifications:
1. Return ONLY a single fully self-contained valid root <svg viewBox="0 0 500 280" ...> block. Don't frame it in any markdown backticks.
2. The graphic must fit a premium modern minimal aesthetic: use soft modern colors (like Indigo, Violet, Teal, Emerald) paired with white and deep dark gray. Ensure excellent color contrast for dark mode!
3. Include real structural elements representing the concept, such as circles, nodes, connected flow arrows, and readable text labels.
4. Feel free to use subtle gradients and rounded rect bounds.
5. Must have perfect responsiveness, meaning no absolute width/height inside the style that overrides viewBox.
6. Absolutely do not include any explanatory text outside the SVG. ONLY return the valid "<svg>" tag string.`;
          break;

        default:
          return res.status(400).json({ error: `Unsupported AI assist action: ${action}` });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      let responseText = response.text || "";
      
      // Clean up markdown block wraps if model used them accidentally
      if (responseText.includes("```xml")) {
        responseText = responseText.split("```xml")[1].split("```")[0];
      } else if (responseText.includes("```html")) {
        responseText = responseText.split("```html")[1].split("```")[0];
      } else if (responseText.includes("```svg")) {
        responseText = responseText.split("```svg")[1].split("```")[0];
      } else if (responseText.includes("```")) {
        // If there's general backticks, extract the content
        const matches = responseText.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
        if (matches && matches[1]) {
          responseText = matches[1];
        }
      }

      res.json({ output: responseText.trim() });
    } catch (error: any) {
      console.error("AI Assist endpoint failed with error:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve AI insights through Gemini API." });
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
