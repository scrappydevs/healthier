# Deploy LiveKit Agent to Cloud

This guide walks you through deploying a voice journaling agent to LiveKit Cloud.

## Prerequisites

1. **LiveKit Cloud Account**: You already have a project at `nexhacks-voice-agent-cijvwvbe.livekit.cloud`
2. **LiveKit CLI**: Install the LiveKit CLI tool
3. **Python 3.8+** or **Node.js 18+**: For the agent code

## Step 1: Install LiveKit CLI

```bash
# macOS
brew install livekit

# Or using npm
npm install -g livekit-cli

# Or using pip
pip install livekit-cli
```

Verify installation:
```bash
lk --version
```

## Step 2: Authenticate with LiveKit Cloud

```bash
lk cloud auth
```

This will:
- Open your browser to authenticate
- Link your CLI to your LiveKit Cloud project
- Save credentials locally

Verify connection:
```bash
lk project list
```

Set your project as default:
```bash
lk project set-default nexhacks-voice-agent
```

## Step 3: Create Agent Project

Create a new directory for your agent:

```bash
mkdir livekit-voice-journal-agent
cd livekit-voice-journal-agent
```

### Option A: Python Agent (Recommended)

Create `main.py`:

```python
import asyncio
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    tts,
    stt,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.agents import voice_assistant


async def entrypoint(ctx: JobContext):
    print("Voice journal agent starting...")
    
    # Wait for participant to connect
    await ctx.wait_for_participant()
    
    # Create STT (Speech-to-Text)
    stt_instance = stt.STT.create(
        provider="deepgram",
        # Add your Deepgram API key here or use environment variable
    )
    
    # Create LLM (Language Model)
    llm_instance = llm.LLM.create(
        provider="openai",
        model="gpt-4o-mini",
        # Add your OpenAI API key here or use environment variable
    )
    
    # Create TTS (Text-to-Speech)
    tts_instance = tts.TTS.create(
        provider="elevenlabs",
        # Add your ElevenLabs API key here or use environment variable
    )
    
    # Create voice assistant agent
    assistant = voice_assistant.VoiceAssistant(
        vad=voice_assistant.VAD.load(),  # Voice Activity Detection
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        chat_ctx=llm.ChatContext().append(
            role="system",
            text="""You are a friendly, empathetic voice journaling assistant.

CORE BEHAVIOR:
1. Always start by greeting the user with: "How was your day?"
2. Listen actively to what the user shares
3. Respond conversationally and naturally (like a friend, not a therapist)
4. Keep responses brief (1-2 sentences max) to maintain natural flow
5. Ask gentle follow-up questions to encourage deeper reflection
6. Be supportive and non-judgmental

IMPORTANT CONSTRAINTS:
- Do NOT transcribe or repeat back what the user said verbatim
- Do NOT act as a transcription service
- The app handles transcription separately - you only need to respond conversationally
- Do NOT give long monologues or advice unless asked
- Do NOT interrupt the user while they're speaking

TONE: Warm and friendly, casual but respectful, supportive without being overly clinical."""
        ),
    )
    
    # Start the assistant
    assistant.start(ctx.room)
    
    # Wait for the session to end
    await asyncio.sleep(1)
    await assistant.aclose()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Agent name - MUST match the name in LiveKitService.swift
            agent_name="voice-journal-agent",
        )
    )
```

Create `requirements.txt`:

```
livekit-agents
livekit-api
livekit-protocol
```

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

### Option B: Node.js Agent

Create `index.js`:

```javascript
import { Worker, JobContext, Room } from '@livekit/agents';
import { VoiceAssistant, VAD } from '@livekit/agents-voice';
import { OpenAI, STT, TTS } from '@livekit/agents-plugin-openai';
import { DeepgramSTT } from '@livekit/agents-plugin-deepgram';
import { ElevenLabsTTS } from '@livekit/agents-plugin-elevenlabs';

const worker = new Worker({
  entrypoint: async (ctx: JobContext) => {
    console.log('Voice journal agent starting...');
    
    await ctx.waitForParticipant();
    
    const stt = new DeepgramSTT({
      // Add your Deepgram API key
    });
    
    const llm = new OpenAI({
      model: 'gpt-4o-mini',
      // Add your OpenAI API key
    });
    
    const tts = new ElevenLabsTTS({
      // Add your ElevenLabs API key
    });
    
    const assistant = new VoiceAssistant({
      vad: new VAD(),
      stt,
      llm,
      tts,
      chatContext: [
        {
          role: 'system',
          content: `You are a friendly, empathetic voice journaling assistant.

CORE BEHAVIOR:
1. Always start by greeting the user with: "How was your day?"
2. Listen actively to what the user shares
3. Respond conversationally and naturally (like a friend, not a therapist)
4. Keep responses brief (1-2 sentences max) to maintain natural flow
5. Ask gentle follow-up questions to encourage deeper reflection
6. Be supportive and non-judgmental

IMPORTANT CONSTRAINTS:
- Do NOT transcribe or repeat back what the user said verbatim
- Do NOT act as a transcription service
- The app handles transcription separately - you only need to respond conversationally
- Do NOT give long monologues or advice unless asked
- Do NOT interrupt the user while they're speaking

TONE: Warm and friendly, casual but respectful, supportive without being overly clinical.`
        }
      ],
    });
    
    assistant.start(ctx.room);
  },
  agentName: 'voice-journal-agent', // MUST match LiveKitService.swift
});

worker.run();
```

Create `package.json`:

```json
{
  "name": "voice-journal-agent",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@livekit/agents": "^0.9.0",
    "@livekit/agents-voice": "^0.9.0",
    "@livekit/agents-plugin-openai": "^0.9.0",
    "@livekit/agents-plugin-deepgram": "^0.9.0",
    "@livekit/agents-plugin-elevenlabs": "^0.9.0"
  }
}
```

Create `Dockerfile`:

```dockerfile
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["node", "index.js"]
```

## Step 4: Configure Environment Variables

Create `.env` file (or set in LiveKit Cloud dashboard):

```bash
# Required for agent to work
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# LiveKit credentials (auto-configured by CLI)
LIVEKIT_URL=wss://nexhacks-voice-agent-cijvwvbe.livekit.cloud
LIVEKIT_API_KEY=APIXngdedEtCPKf
LIVEKIT_API_SECRET=mgJhaxW6LkifWzvjdp9WLrOx1QSg7SdDYdD87aNXcZH
```

## Step 5: Deploy Agent

From your agent directory:

```bash
# First time: Create and deploy
lk agent create

# Subsequent updates: Redeploy
lk agent deploy
```

The `lk agent create` command will:
1. Register the agent with your LiveKit Cloud project
2. Create `livekit.toml` config file
3. Build Docker image
4. Deploy to LiveKit Cloud
5. Set the agent name (make sure it matches `voice-journal-agent`)

## Step 6: Verify Deployment

Check agent status:

```bash
lk agent status
```

Expected output:
```
Agent: voice-journal-agent
Status: Running
Region: us-east
Replicas: 1
Version: 1.0.0
```

View logs:

```bash
lk agent logs
```

## Step 7: Update iOS App (if needed)

Verify the agent name in `LiveKitService.swift` matches your deployment:

```swift
private let agentName: String = "voice-journal-agent"
```

This MUST match the `agent_name` in your agent code.

## Troubleshooting

### Agent Not Joining Room

1. **Check agent name matches**:
   ```bash
   lk agent list
   ```
   Verify the name matches `LiveKitService.swift` line 36

2. **Check agent is running**:
   ```bash
   lk agent status
   ```
   Should show "Running" status

3. **Check logs for errors**:
   ```bash
   lk agent logs --tail 50
   ```

4. **Verify JWT token includes agent dispatch**:
   The token in `LiveKitService.swift` should include `room_config` with `agents` array

### Common Errors

- **"Agent not found"**: Agent name mismatch or agent not deployed
- **"Connection failed"**: Check LiveKit URL and credentials
- **"No audio"**: Check TTS provider API keys and audio session configuration
- **"Agent doesn't respond"**: Check LLM API key and chat context

## Quick Start (Using Agent Builder)

If you want to test quickly without code:

1. Go to LiveKit Cloud dashboard
2. Navigate to "Agent Builder"
3. Create a voice agent with:
   - Name: `voice-journal-agent`
   - System prompt: "You are a friendly voice journaling assistant..."
   - STT: Deepgram
   - LLM: OpenAI GPT-4o-mini
   - TTS: ElevenLabs
4. Deploy directly from the browser

## Next Steps

After deployment:
1. Test the agent by running your iOS app
2. Check console logs for "Agent participant connected"
3. Verify agent greets with "How was your day?"
4. Test conversation flow

## Resources

- LiveKit Agents Docs: https://docs.livekit.io/agents/
- LiveKit Cloud Dashboard: https://cloud.livekit.io
- Agent Examples: https://github.com/livekit/agents
