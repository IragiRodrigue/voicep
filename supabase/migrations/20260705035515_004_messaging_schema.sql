-- Messaging schema for real-time chat

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "select_own_conversations" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_conversations" ON conversations FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_own_conversations" ON conversations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

-- Conversation participants policies
CREATE POLICY "select_own_participants" ON conversation_participants FOR SELECT
  TO authenticated USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "insert_own_participants" ON conversation_participants FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_participants" ON conversation_participants FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "select_conversation_messages" ON messages FOR SELECT
  TO authenticated USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (sender_id = auth.uid());

CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (sender_id = auth.uid());

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.content, 100),
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
