import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { analyzeExerciseFrame } from './overshoot.js';
import { OvershootStreamSession } from "./overshoot_stream.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'overshoot-exercise-analysis' });
});

// HTTP endpoint for single frame analysis (fallback)
app.post('/api/analyze-frame', async (req, res) => {
  try {
    const { frame, exerciseType } = req.body;
    
    if (!frame) {
      return res.status(400).json({ error: 'No frame provided' });
    }

    const result = await analyzeExerciseFrame(frame, exerciseType);
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time streaming
const wss = new WebSocketServer({ server, path: '/ws/exercise' });

wss.on('connection', (ws) => {
  console.log('Client connected for exercise analysis');
  
  let exerciseType = null;
  let repCount = 0;
  let lastFeedback = '';
  let frameBuffer = [];
  let overshootSession = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'start':
          // Initialize session
          exerciseType = data.exerciseType || null;
          repCount = 0;
          lastFeedback = '';
          frameBuffer = [];
          console.log(`Started exercise session: ${exerciseType || 'auto-detect'}`);

          if (process.env.OVERSHOOT_API_KEY) {
            // Start Overshoot stream session (WebRTC) and forward results
            const outputSchema = {
              type: "object",
              properties: {
                exerciseType: { type: "string" },
                isRepComplete: { type: "boolean" },
                feedback: { type: "string" },
                formScore: { type: "number" },
                safetyAlert: { type: "string" },
              },
            };

            const prompt = `You are an expert fitness coach analyzing exercise video in real-time.\n\nAnalyze what you see and respond ONLY in JSON matching the schema.\n\nTask:\n- Identify the exercise type.\n- Determine if a rep has been completed in this window.\n- Provide 1 short form correction (or encouragement if form is good).\n- Flag any safety concerns.\n\n${exerciseType ? `Context: The user selected exercise type: ${exerciseType}.` : ""}`;

            overshootSession = new OvershootStreamSession({
              apiUrl: process.env.OVERSHOOT_API_URL || "https://cluster1.overshoot.ai/api/v0.2",
              apiKey: process.env.OVERSHOOT_API_KEY,
              prompt,
              outputSchemaJson: outputSchema,
              processing: {
                sampling_ratio: 0.1,
                fps: 30,
                clip_length_seconds: 1,
                delay_seconds: 1
              },
              onResult: (result) => {
                // Result payload is whatever Overshoot returns; try to pull the model output safely
                const payload = result?.result ?? result;
                if (!payload) return;

                // If the model returns JSON in a string field, try parsing it
                let parsed = payload;
                if (typeof payload === "string") {
                  try { parsed = JSON.parse(payload); } catch { return; }
                } else if (typeof payload?.result === "string") {
                  try { parsed = JSON.parse(payload.result); } catch { parsed = payload; }
                }

                const nextType = parsed.exerciseType || exerciseType;
                if (nextType && !exerciseType) exerciseType = nextType;

                const isRepComplete = !!parsed.isRepComplete;
                if (isRepComplete) repCount += 1;

                const feedback = (parsed.feedback || "").toString();
                const formScore = Number(parsed.formScore || 7);
                const safetyAlert = parsed.safetyAlert ? parsed.safetyAlert.toString() : null;

                const feedbackChanged = feedback && feedback !== lastFeedback;
                if (feedbackChanged) lastFeedback = feedback;

                ws.send(JSON.stringify({
                  type: "analysis",
                  exerciseType: nextType,
                  repCount,
                  feedback,
                  formScore,
                  safetyAlert,
                  shouldSpeak: !!feedbackChanged
                }));
              },
              onError: (err) => {
                console.error("Overshoot stream error:", err);
              }
            });

            try {
              await overshootSession.start();
              console.log("Overshoot stream started");
            } catch (err) {
              console.error("Failed to start Overshoot stream, falling back to mock:", err);
              overshootSession = null;
            }
          }

          ws.send(JSON.stringify({
            type: 'started',
            message: 'Exercise analysis started'
          }));
          break;
          
        case 'frame':
          // Receive frame for analysis
          if (data.frame) {
            if (overshootSession) {
              const jpegBuffer = Buffer.from(data.frame, "base64");
              overshootSession.pushJpegFrame(jpegBuffer);
              // lightweight debug
              if (!frameBuffer) frameBuffer = [];
              frameBuffer.push(1);
              if (frameBuffer.length % 10 === 0) {
                console.log(`Pushed ${frameBuffer.length} frames to Overshoot stream`);
              }
            } else {
              const result = await analyzeExerciseFrame(data.frame, exerciseType);
              
              // Update state based on analysis
              if (result.exerciseType && !exerciseType) {
                exerciseType = result.exerciseType;
              }
              
              if (result.repCount > repCount) {
                repCount = result.repCount;
              }
              
              // Only send feedback if it changed (avoid spam)
              const feedbackChanged = result.feedback !== lastFeedback;
              lastFeedback = result.feedback;
              
              ws.send(JSON.stringify({
                type: 'analysis',
                exerciseType: exerciseType || result.exerciseType,
                repCount: repCount,
                feedback: result.feedback,
                formScore: result.formScore,
                safetyAlert: result.safetyAlert,
                shouldSpeak: feedbackChanged && result.feedback
              }));
            }
          }
          break;
          
        case 'stop':
          // End session
          console.log(`Exercise session ended. Final rep count: ${repCount}`);
          if (overshootSession) {
            await overshootSession.stop();
            overshootSession = null;
          }
          ws.send(JSON.stringify({
            type: 'summary',
            exerciseType: exerciseType,
            totalReps: repCount,
            message: 'Exercise session completed'
          }));
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    if (overshootSession) {
      overshootSession.stop().catch(() => {});
      overshootSession = null;
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Overshoot Exercise Analysis Service running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws/exercise`);
  console.log(`HTTP endpoint: http://localhost:${PORT}/api/analyze-frame`);
});
