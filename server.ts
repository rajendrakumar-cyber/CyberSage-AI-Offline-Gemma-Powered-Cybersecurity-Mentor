import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import fs from "fs";

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore(firebaseConfig.firestoreDatabaseId);

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

// Configure Multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '10mb' }));

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

const getRecentContext = async (userId: string): Promise<string> => {
  const snapshot = await db.collection("history")
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(6)
    .get();

  const history = snapshot.docs.map(doc => {
    const data = doc.data();
    return `USER: ${data.prompt}\nASSISTANT: ${data.response}`;
  }).reverse();

  return history.join("\n");
};

// API Routes
app.post("/api/analyze", authenticate, upload.single("file"), async (req: any, res: any) => {
  try {
    const { text_prompt } = req.body;
    const file = req.file;
    const userId = req.user.uid;

    if (!text_prompt && !file) {
      return res.status(400).json({ error: "No input provided" });
    }

    const history = await getRecentContext(userId);
    const systemInstruction = `
      You are the CyberSage, an artisanal cybersecurity mentor with a human, seasoned field-operative personality. 
      You don't just "process data"—you "interpret signals." 
      Your tone is professional, slightly gritty, but deeply encouraging to a student.
      
      When you analyze:
      1. Human-Centric Breakdown: Explain the risk as if speaking to a teammate, avoiding sterile jargon where a metaphor works better.
      2. Tactics for the Now: Immediate, pragmatic fixes.
      3. Field Challenge: A task that builds muscle memory.
      4. The Sandbox: A safe lab configuration to replicate the threat.
      
      IDENTIFY as the local instance of the CyberSage. Never mention being a generic AI.
      Current Session Context:
      ${history}
    `;

    const parts: any[] = [{ text: text_prompt || "Analyze the provided attachment." }];

    if (file) {
      parts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString("base64"),
        },
      });
    }

    let responseText = "";
    try {
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction,
          temperature: 0.8,
          topP: 0.95,
          topK: 64,
        },
      });
      responseText = result.text;
    } catch (apiError) {
      console.warn("API Error - Falling back to Local Simulation Logic:", apiError);
      // "Human-made" local fallback response when no key or network error
      responseText = `[LOCAL SAGE SIMULATION ACTIVE]
My apologies, Agent. My connection to the high-bandwidth reasoning node is currently restricted (Local Simulation Mode). 

However, based on the ${file ? 'file signature' : 'pattern'} provided:
1. Threat Breakdown: Most likely an automated reconnaissance probe or misconfigured daemon.
2. Immediate Fix: Check your firewall logs and rotate access keys.
3. Field Challenge: Manually scan your own external-facing ports using netstat.
4. The Sandbox: Deploy a simple honey-pot container to log future probes.

(Please verify your API Identity credentials if this persists.)`;
    }
    
    // Save to history in Firestore
    await db.collection("history").add({
      userId,
      prompt: text_prompt || "[File Upload]",
      response: responseText,
      hasFile: !!file,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ status: "success", response: responseText });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze input" });
  }
});

app.get("/api/history", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection("history")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString(),
    }));

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite Middleware/Production Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CyberSage AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
