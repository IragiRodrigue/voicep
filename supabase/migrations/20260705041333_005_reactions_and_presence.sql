-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL CHECK (LENGTH(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reactions_in_conversation" ON message_reactions FOR SELECT
  TO authenticated USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_reactions" ON message_reactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_reactions" ON message_reactions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- User presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_any_presence" ON user_presence FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "upsert_own_presence" ON user_presence FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_presence" ON user_presence FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
