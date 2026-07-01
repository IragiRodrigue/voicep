# VocalForge

**Ethical Voice Cloning Platform** - Transform your voice in real-time during calls.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run the app**
   ```bash
   npm start
   # or
   npm run web
   ```

## Features

### Voice Cloning
- Record voice samples (minimum 5 minutes recommended)
- Train AI voice models with explicit consent
- Revoke consent at any time

### Real-time Voice Transformation
- Pitch shifting
- Formant adjustment
- Reverb effects
- Noise gate
- Preset effects (Deep, High, Ethereal)

### VoIP Calls
- Add contacts by email
- Make voice calls with real-time effects
- Call history and logs

### Privacy First
- All voice models require explicit consent
- Data stored securely in Supabase
- Export or delete your data anytime

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Storage + Realtime)
- **State**: Zustand
- **Navigation**: Expo Router
- **Audio**: expo-av

## Project Structure

```
app/
├── (auth)/          # Sign in, Sign up
├── (tabs)/          # Home, Record, Voices, Effects, Calls, Settings
├── call/            # Outgoing, Incoming, Active call screens
└── model/           # Create, View model

stores/              # Zustand state management
services/            # Supabase, call service
hooks/               # Audio recording hook
constants/           # Audio config, voice effects
```

## Database Setup

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed setup instructions.

## Locked Dependencies (for reproducibility)

```json
{
  "expo": "^54.0.10",
  "expo-router": "~6.0.8",
  "react": "19.1.0",
  "react-native": "0.81.4",
  "@supabase/supabase-js": "^2.58.0",
  "zustand": "^5.0.14"
}
```

## Troubleshooting

### App won't start
```bash
# Clear cache
npx expo start -c

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Audio recording issues
- Grant microphone permissions
- Use HTTPS or localhost on web

### Login/Signup errors
- Check `.env` credentials
- Verify Supabase project is running

## Documentation

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## License

Personal use only. Commercial use requires license.

## Support

support@vocalforge.app
