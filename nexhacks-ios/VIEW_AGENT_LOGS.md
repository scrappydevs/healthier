# How to View LiveKit Agent Logs

## Dashboard Method

1. **Go to LiveKit Cloud Dashboard**
   - URL: https://cloud.livekit.io
   - Login to your account

2. **Navigate to Your Project**
   - Select project: `nexhacks-voice-agent`

3. **View Agent Logs**
   - Option A: Go to **Sessions → Agent Insights**
     - Shows logs, transcripts, traces for each session
     - Timeline view with all events
   - Option B: Go to **Agents → [Your Agent Name]**
     - Click on `voice-journal-agentEmery-2374`
     - Look for **Logs** or **Activity** section
     - Shows real-time agent activity

4. **Enable Observability (if not already enabled)**
   - Go to **Project Settings → Data & Privacy**
   - Enable **Agent Observability**
   - Required SDK versions:
     - Python: 1.3.0+
     - Node.js: 1.0.18+

## CLI Method (Recommended for Debugging)

### Install LiveKit CLI (if not installed)
```bash
# macOS
brew install livekit

# Or via npm
npm install -g livekit-cli

# Or via pip
pip install livekit-cli
```

### Authenticate
```bash
lk cloud auth
```

### View Logs

**Live runtime logs (streaming):**
```bash
lk agent logs
```

**Build logs (from deployment):**
```bash
lk agent logs --log-type=build
```

**Specific agent:**
```bash
lk agent logs --id CA_b9GNcpLKnJ4L
```

**Follow logs (like tail -f):**
```bash
lk agent logs --follow
```

## What to Look For

### Good Signs (Agent Working):
- ✅ "Agent dispatched to room"
- ✅ "Room joined successfully"
- ✅ "Waiting for participant"
- ✅ "Voice assistant started"

### Bad Signs (Issues):
- ❌ "Failed to dispatch agent"
- ❌ "Agent not found"
- ❌ "Connection error"
- ❌ "Room join failed"
- ❌ "Agent name mismatch"

## Debugging Agent Dispatch Issues

When checking logs for why agent isn't joining:

1. **Check for dispatch requests:**
   - Look for messages about room connections
   - Should see agent name being requested

2. **Check for errors:**
   - Any error messages about authentication
   - Region mismatches
   - Agent name not found

3. **Check agent startup:**
   - Agent should log when it starts
   - Should show it's listening for dispatch

4. **Check room connections:**
   - Should see when rooms are created
   - Should see when participants join

## Example Log Output

**Good (Agent Working):**
```
[INFO] Agent voice-journal-agentEmery-2374 started
[INFO] Listening for dispatch requests
[INFO] Agent dispatched to room: voice-journal
[INFO] Room joined successfully
[INFO] Waiting for participant...
[INFO] Participant connected: ios-user-xxx
[INFO] Voice assistant started
```

**Bad (Agent Not Joining):**
```
[ERROR] Failed to dispatch agent: agent name not found
[ERROR] Room join failed: authentication error
[WARN] Agent name mismatch: expected 'voice-journal-agent', got 'voice-journal-agentEmery-2374'
```

## Quick Troubleshooting

**No logs showing?**
1. Check agent is running: `lk agent status`
2. Enable observability in dashboard settings
3. Check SDK version meets requirements
4. Try CLI logs: `lk agent logs`

**Logs show errors?**
1. Check agent name matches exactly (case-sensitive)
2. Verify region matches (us-east vs US East B)
3. Check JWT token includes agent dispatch
4. Verify agent is deployed and running

## Next Steps

After viewing logs:
1. Share any errors you see
2. Check if agent receives dispatch requests
3. Verify agent name matches iOS app configuration
4. Check for region mismatches
