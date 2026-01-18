-- ============================================
-- JOURNAL_LOGS (Journal entries for mental health analysis)
-- ============================================
CREATE TABLE journal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    voice_transcription TEXT,
    duration_seconds DECIMAL(10,2),
    tags TEXT[],
    mood TEXT CHECK (mood IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    ai_analysis JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_journal_logs_patient ON journal_logs(patient_id);
CREATE INDEX idx_journal_logs_logged_at ON journal_logs(logged_at DESC);
CREATE INDEX idx_journal_logs_mood ON journal_logs(mood);
CREATE INDEX idx_journal_logs_tags ON journal_logs USING gin(tags);
CREATE INDEX idx_journal_logs_transcript_search ON journal_logs USING gin(to_tsvector('english', transcript));

-- ============================================
-- ACCESS
-- ============================================
ALTER TABLE journal_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_journal_logs_updated_at BEFORE UPDATE ON journal_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

