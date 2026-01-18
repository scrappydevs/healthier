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

// WebSocket servers (explicit upgrade routing for reliability)
const wss = new WebSocketServer({ noServer: true });
const wssMedication = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = req?.url || '';
  const ua = req?.headers?.['user-agent'] || '';
  console.log('[WS UPGRADE]', url, '| UA:', ua);

  const pathname = url.split('?')[0];

  if (pathname === '/ws/exercise') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
    return;
  }

  if (pathname === '/ws/medication') {
    wssMedication.handleUpgrade(req, socket, head, (ws) => {
      wssMedication.emit('connection', ws, req);
    });
    return;
  }

  socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
  socket.destroy();
});

// Medication vision WebSocket handler
wssMedication.on('connection', (ws) => {
  console.log('Client connected for medication vision analysis');
  
  let overshootSession = null;
  let frameCount = 0;
  let lastDescription = '';
  let medicationContext = '';
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'start':
          // Store medication context if provided
          medicationContext = data.medicationContext || '';
          frameCount = 0;
          lastDescription = '';
          console.log('Started medication vision session');
          console.log('Medication context length:', medicationContext.length);

          if (process.env.OVERSHOOT_API_KEY) {
            const outputSchema = {
              type: "object",
              properties: {
                description: { type: "string" }
              },
              required: ["description"]
            };

            const prompt = `You are a medication assistant with vision capabilities helping elderly patients.

Describe what you see in the camera. Focus on:
- Pills (color, shape, size, markings/imprints)
- Medication bottles or packaging
- Prescription labels
- Pill organizers or dispensers

${medicationContext ? `\nUser's Medications:\n${medicationContext}\n\nIf you can match what you see to the user's medications, identify which one it is.` : ''}

Respond ONLY with valid JSON matching this schema:
{
  "description": "brief description"
}

Make it brief, clear, and specific about colors and shapes.`;

            overshootSession = new OvershootStreamSession({
              apiUrl: process.env.OVERSHOOT_API_URL || "https://cluster1.overshoot.ai/api/v0.2",
              apiKey: process.env.OVERSHOOT_API_KEY,
              prompt,
              outputSchemaJson: outputSchema,
              processing: {
                sampling_ratio: 0.2,
                fps: 15,
                clip_length_seconds: 2,
                delay_seconds: 1
              },
              onResult: (result) => {
                const payload = result?.result ?? result;
                if (!payload) return;

                let parsed = payload;
                if (typeof payload === "string") {
                  try { parsed = JSON.parse(payload); } catch { parsed = { description: payload }; }
                } else if (typeof payload?.result === "string") {
                  try { parsed = JSON.parse(payload.result); } catch { parsed = payload; }
                }

                const description = (parsed?.description || "").toString().trim();

                // Only send if description changed meaningfully
                if (description && description !== lastDescription) {
                  lastDescription = description;
                  ws.send(JSON.stringify({
                    type: 'vision',
                    description: description,
                    timestamp: Date.now()
                  }));
                }
              },
              onError: (err) => {
                console.error("Medication vision Overshoot error:", err);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: err.message || 'Vision analysis error'
                }));
              }
            });

            try {
              await overshootSession.start();
              console.log("Medication vision Overshoot stream started");
            } catch (err) {
              console.error("Failed to start medication vision stream:", err);
              overshootSession = null;
            }
          }

          ws.send(JSON.stringify({
            type: 'started',
            message: 'Medication vision started'
          }));

          // Send an immediate hint so the client UI updates even before the first model result
          ws.send(JSON.stringify({
            type: 'vision',
            description: overshootSession
              ? 'Analyzing what the camera sees...'
              : (process.env.OVERSHOOT_API_KEY
                ? 'Vision stream failed to start. Check server logs.'
                : 'Overshoot API not configured. Showing basic prompts only.'),
            timestamp: Date.now()
          }));
          break;
          
        case 'frame':
          if (data.frame) {
            frameCount++;
            if (overshootSession) {
              const jpegBuffer = Buffer.from(data.frame, "base64");
              overshootSession.pushJpegFrame(jpegBuffer);
              if (frameCount % 15 === 0) {
                console.log(`Medication vision: pushed ${frameCount} frames`);
              }
            } else {
              // Fallback: mock response when no Overshoot API
              if (frameCount % 30 === 0) {
                ws.send(JSON.stringify({
                  type: 'vision',
                  description: 'Point your camera at your medication to identify it.',
                  timestamp: Date.now()
                }));
              }
            }
          }
          break;
          
        case 'stop':
          console.log(`Medication vision session ended. Frames processed: ${frameCount}`);
          if (overshootSession) {
            await overshootSession.stop();
            overshootSession = null;
          }
          ws.send(JSON.stringify({
            type: 'stopped',
            message: 'Medication vision stopped'
          }));
          break;
          
        default:
          console.log('Unknown medication message type:', data.type);
      }
    } catch (error) {
      console.error('Medication WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Medication vision client disconnected');
    if (overshootSession) {
      overshootSession.stop().catch(() => {});
      overshootSession = null;
    }
  });
  
  ws.on('error', (error) => {
    console.error('Medication WebSocket error:', error);
  });
});

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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Overshoot Analysis Service running on port ${PORT}`);
  console.log(`Exercise WebSocket: ws://localhost:${PORT}/ws/exercise`);
  console.log(`Medication WebSocket: ws://localhost:${PORT}/ws/medication`);
  console.log(`HTTP endpoint: http://localhost:${PORT}/api/analyze-frame`);
});
