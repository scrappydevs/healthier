# Voice Journaling Setup Guide

## Prerequisites

### 1. Add LiveKit Swift SDK

The LiveKit Swift SDK must be added via Swift Package Manager:

1. Open `nexhacks-ios.xcodeproj` in Xcode
2. Go to File → Add Package Dependencies
3. Enter URL: `https://github.com/livekit/client-sdk-swift`
4. Select the latest version
5. Add to target: `nexhacks-ios`

### 2. Configure LiveKit Credentials

The LiveKit credentials are currently hardcoded in `LiveKitService.swift`. For production:

- Move credentials to secure storage (Keychain or environment variables)
- Consider fetching tokens from your backend instead of storing API secret in the app
- Update `LiveKitService.swift` to use secure credential storage

### 3. Supabase Integration

The `SupabaseService` is currently a stub. To complete integration:

1. Add Supabase Swift SDK via SPM: `https://github.com/supabase/supabase-swift`
2. Add your Supabase project URL and API key to `SupabaseService.swift`
3. Create the `journal_entries` table in Supabase (see schema below)
4. Implement semantic search using pgvector for context-aware responses

### 4. Database Schema

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    transcript TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration FLOAT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX idx_journal_entries_transcript ON journal_entries USING gin(to_tsvector('english', transcript));
```

For semantic search (optional):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE journal_entries ADD COLUMN embedding vector(512);

CREATE INDEX idx_journal_entries_embedding ON journal_entries USING ivfflat (embedding vector_cosine_ops);
```

### 5. Permissions

The following permissions are already added to `Info.plist`:
- `NSMicrophoneUsageDescription` - For voice recording
- `NSSpeechRecognitionUsageDescription` - For transcription

Make sure to test permission requests on a physical device.

## Architecture

### Models
- `JournalEntry.swift` - Data model for journal entries

### Services
- `LiveKitService.swift` - Handles LiveKit connection and voice streaming
- `SupabaseService.swift` - Handles data persistence (stub implementation)

### Repository
- `JournalRepository.swift` - Manages local cache and syncs with Supabase

### ViewModel
- `JournalViewModel.swift` - Orchestrates recording lifecycle and UI state

### Views
- `JournalListView.swift` - List of all journal entries
- `VoiceJournalView.swift` - Full-screen recording interface
- `JournalDetailView.swift` - View/edit individual entries

## Usage Flow

1. User taps Journal tab → `JournalListView` displays
2. User taps floating action button → `VoiceJournalView` appears
3. LiveKit connects → Agent greets: "How was your day?"
4. User speaks → Real-time transcription appears
5. If user asks question → Agent searches journal history → Responds
6. User taps Stop → Entry saved to local storage and Supabase
7. Entry appears in `JournalListView`

## Testing

1. Test LiveKit connection on physical device (simulator may have audio limitations)
2. Verify microphone permissions are requested
3. Test transcription accuracy
4. Test question detection and context retrieval
5. Test offline mode (local storage should work without Supabase)

## Next Steps

- [ ] Add LiveKit SDK via SPM
- [ ] Implement actual Supabase API calls
- [ ] Add semantic search for context-aware responses
- [ ] Implement question detection logic
- [ ] Add waveform visualization using audio level callbacks
- [ ] Secure credential storage
- [ ] Add error handling and retry logic
- [ ] Implement offline sync queue
