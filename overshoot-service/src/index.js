import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { analyzeExerciseFrame } from './overshoot.js';

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
          ws.send(JSON.stringify({
            type: 'started',
            message: 'Exercise analysis started'
          }));
          break;
          
        case 'frame':
          // Receive frame for analysis
          if (data.frame) {
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
          break;
          
        case 'stop':
          // End session
          console.log(`Exercise session ended. Final rep count: ${repCount}`);
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
