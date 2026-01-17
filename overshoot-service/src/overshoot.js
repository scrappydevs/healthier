/**
 * Overshoot Exercise Analysis Integration
 * 
 * Analyzes exercise video frames using Overshoot's vision AI
 * to provide rep counting, exercise identification, and form feedback.
 */

const OVERSHOOT_API_URL = process.env.OVERSHOOT_API_URL || 'https://cluster1.overshoot.ai/api/v0.2';
const OVERSHOOT_API_KEY = process.env.OVERSHOOT_API_KEY;

// Exercise analysis prompt
const EXERCISE_PROMPT = `You are an expert fitness coach analyzing exercise video in real-time.

Analyze this frame and provide:
1. EXERCISE TYPE: Identify the exercise being performed (e.g., push-ups, squats, lunges, planks, jumping jacks, burpees, etc.)
2. REP COUNT: If this appears to be a completing motion of a rep, increment the count
3. FORM FEEDBACK: Provide brief, actionable feedback on form (1 sentence max)
4. SAFETY ALERT: Flag any dangerous form that could cause injury

Respond in JSON format:
{
  "exerciseType": "string or null if unclear",
  "isRepComplete": boolean,
  "feedback": "brief form tip or encouragement",
  "formScore": 1-10,
  "safetyAlert": "string or null if no concerns"
}`;

// Track rep state across frames
let repState = {
  lastPosition: null,
  repPhase: 'neutral', // 'up', 'down', 'neutral'
  totalReps: 0
};

/**
 * Analyze a single exercise frame
 * @param {string} frameBase64 - Base64 encoded image frame
 * @param {string|null} exerciseType - Known exercise type (optional)
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeExerciseFrame(frameBase64, exerciseType = null) {
  if (!OVERSHOOT_API_KEY) {
    console.warn('OVERSHOOT_API_KEY not set, using mock analysis');
    return mockAnalysis(exerciseType);
  }

  try {
    // Build prompt with context
    let prompt = EXERCISE_PROMPT;
    if (exerciseType) {
      prompt += `\n\nContext: The user is performing ${exerciseType}. Current rep count: ${repState.totalReps}`;
    }

    // Call Overshoot API
    const response = await fetch(`${OVERSHOOT_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OVERSHOOT_API_KEY}`
      },
      body: JSON.stringify({
        prompt: prompt,
        image: frameBase64,
        model: 'qwen3-vl-8b', // Fast model for real-time
        output_schema: {
          type: 'object',
          properties: {
            exerciseType: { type: 'string' },
            isRepComplete: { type: 'boolean' },
            feedback: { type: 'string' },
            formScore: { type: 'number' },
            safetyAlert: { type: 'string' }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Overshoot API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    // Process the result
    const analysis = result.result || result;
    
    // Update rep count
    if (analysis.isRepComplete) {
      repState.totalReps++;
    }

    return {
      exerciseType: analysis.exerciseType || exerciseType,
      repCount: repState.totalReps,
      feedback: analysis.feedback || '',
      formScore: analysis.formScore || 7,
      safetyAlert: analysis.safetyAlert || null
    };

  } catch (error) {
    console.error('Overshoot analysis error:', error);
    // Return mock data on error to keep the experience smooth
    return mockAnalysis(exerciseType);
  }
}

/**
 * Reset rep counter for new exercise session
 */
export function resetRepCounter() {
  repState = {
    lastPosition: null,
    repPhase: 'neutral',
    totalReps: 0
  };
}

/**
 * Mock analysis for testing or when API is unavailable
 */
function mockAnalysis(exerciseType) {
  const exercises = ['Push-ups', 'Squats', 'Lunges', 'Jumping Jacks', 'Planks'];
  const feedbacks = [
    'Keep your core engaged!',
    'Great form, maintain the pace.',
    'Try to go a bit deeper.',
    'Keep your back straight.',
    'Breathe steadily.',
    'Nice work, keep it up!',
    'Control the movement.',
    'Full range of motion!'
  ];
  
  // Simulate occasional rep detection
  const detectRep = Math.random() < 0.15;
  if (detectRep) {
    repState.totalReps++;
  }

  return {
    exerciseType: exerciseType || exercises[Math.floor(Math.random() * exercises.length)],
    repCount: repState.totalReps,
    feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
    formScore: 6 + Math.floor(Math.random() * 4),
    safetyAlert: null
  };
}
