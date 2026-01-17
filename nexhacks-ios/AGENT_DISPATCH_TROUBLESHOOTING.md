# Agent Dispatch Troubleshooting

## Current Status

Your JWT token is correctly formatted with agent dispatch:
```json
{
  "room_config": {
    "agents": [
      {
        "agent_name": "voice-journal-agent",
        "metadata": "{\"greeting\": \"How was your day?\"}"
      }
    ]
  }
}
```

However, the agent is not joining the room. Here are the most likely causes:

## Issue 1: Region Mismatch

**Problem:** Agent is deployed in `us-east`, but room connects to `US East B`

**Solution:** 
- These regions should be compatible, but verify:
  1. Check agent region in dashboard: `us-east`
  2. Check room region in logs: `US East B`
  3. If mismatch, either:
     - Redeploy agent to match room region, OR
     - Ensure agent is configured for multi-region dispatch

## Issue 2: Agent Not Listening for Dispatch

**Problem:** Agent code may not be configured to listen for dispatch requests

**Check Agent Code:**

### Python Agent
Your agent should have:
```python
from livekit.agents import cli, JobContext

async def entrypoint(ctx: JobContext):
    # This automatically handles dispatch
    await ctx.wait_for_participant()
    # ... rest of agent code
```

### Node.js Agent
Your agent should have:
```javascript
const worker = new Worker({
  entrypoint: async (ctx: JobContext) => {
    await ctx.waitForParticipant();
    // ... rest of agent code
  },
  agentName: 'voice-journal-agent', // MUST match iOS code
});
```

**Verify:**
- Agent code includes `waitForParticipant()` or equivalent
- Agent name matches exactly: `voice-journal-agent`
- Agent is deployed and running (`lk agent status`)

## Issue 3: Agent Name Mismatch

**Problem:** Agent name in code doesn't match deployment

**Check:**
1. In your agent code, verify `agent_name` or `agentName` is set to `"voice-journal-agent"`
2. In iOS code (`LiveKitService.swift` line 36), verify it's `"voice-journal-agent"`
3. In LiveKit Cloud dashboard, verify the agent name matches

**All three must match exactly (case-sensitive)**

## Issue 4: Agent Not Deployed/Running

**Check Status:**
```bash
lk agent status
```

Should show:
- Status: Running
- Replicas: 1 or more
- Region: us-east (or matching your room region)

## Issue 5: Agent Logs Show Errors

**Check Logs:**
```bash
lk agent logs
```

Look for:
- ✅ "Agent dispatched to room" - Good sign
- ✅ "Room joined successfully" - Good sign
- ❌ "Failed to dispatch agent" - Bad sign
- ❌ "Agent name not found" - Bad sign
- ❌ "Region mismatch" - Bad sign
- ❌ "Authentication error" - Bad sign

## Debugging Steps

1. **Verify Agent is Running**
   ```bash
   lk agent status
   ```

2. **Check Agent Logs**
   ```bash
   lk agent logs --follow
   ```
   Then connect from iOS app and watch for dispatch messages

3. **Verify Agent Name**
   - Dashboard: Check agent name
   - Agent code: Check `agent_name` or `agentName`
   - iOS code: Check `LiveKitService.swift` line 36
   - All should be: `voice-journal-agent`

4. **Check Region**
   - Agent region: `us-east`
   - Room region: `US East B`
   - If different, may need to redeploy agent or adjust room connection

5. **Verify JWT Token**
   - Already verified - token includes correct `room_config` with agent dispatch
   - Token is signed correctly
   - Token is not expired

## Next Steps

1. **Check agent logs** - Run `lk agent logs` and share any errors
2. **Verify agent code** - Ensure agent has `waitForParticipant()` and correct `agent_name`
3. **Check dashboard** - Verify agent is running and name matches
4. **Try explicit dispatch** - If JWT dispatch doesn't work, we can try HTTP API dispatch

## Alternative: Explicit HTTP API Dispatch

If JWT token dispatch doesn't work, we can try explicitly dispatching the agent via HTTP API after room connection. This requires:

1. Making HTTP POST request to LiveKit API
2. Using API key/secret for authentication
3. Calling dispatch endpoint with room name and agent name

Let me know if you want to try this approach.
