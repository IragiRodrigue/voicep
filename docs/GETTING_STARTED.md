# VocalForge - Setup Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Expo CLI: `npm install -g expo-cli`
- A Supabase account (free tier works)

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd vocalforge

# Install dependencies
npm install

# Install Expo CLI globally if not already installed
npm install -g expo-cli
```

### 2. Environment Setup

Create a `.env` file in the project root with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy the "URL" and "anon/public" key

### 3. Database Setup

Run the migrations in order:

```bash
# The migrations are in supabase/migrations/
# Run them in the Supabase SQL Editor or via CLI:

# 1. Voice app schema (tables: voice_models, voice_samples, consent_records, training_jobs, usage_logs)
# 2. VoIP schema (tables: contacts, call_sessions, call_participants, call_logs)
# 3. Storage and profiles (table: user_profiles, storage bucket: voice-samples)
```

Alternatively, you can use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

### 4. Edge Functions (Optional)

Deploy the Edge Functions for full functionality:

```bash
# Deploy voice conversion function
supabase functions deploy voice-convert

# Deploy voice training function
supabase functions deploy voice-training

# Deploy call signaling function
supabase functions deploy call-signaling
```

## Running the App

### Development Server

```bash
# Start the Expo development server
npm start

# Or for web specifically
npm run web

# For iOS simulator
npm run ios

# For Android emulator
npm run android
```

### Production Build

```bash
# Build for web
npm run build:web

# Build for mobile (requires EAS)
eas build --platform all
```

## Project Structure

```
vocalforge/
├── app/                      # Expo Router pages
│   ├── (auth)/              # Authentication screens
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/              # Main tab navigation
│   │   ├── index.tsx        # Home
│   │   ├── record.tsx       # Voice recording
│   │   ├── voices.tsx       # Voice models
│   │   ├── effects.tsx      # Voice effects
│   │   ├── calls.tsx        # Contacts & calls
│   │   └── settings.tsx     # Settings
│   ├── call/                # Call screens
│   │   ├── outgoing.tsx
│   │   ├── incoming.tsx
│   │   └── active.tsx
│   ├── model/              # Model management
│   │   ├── create.tsx
│   │   └── [id].tsx
│   └── _layout.tsx         # Root layout
├── components/             # Reusable components
├── constants/              # App constants
│   ├── audioConfig.ts
│   └── voiceEffects.ts
├── hooks/                   # Custom hooks
│   ├── useAudioRecorder.ts
│   └── useFrameworkReady.ts
├── services/               # API services
│   ├── supabase.ts
│   └── callService.ts
├── stores/                 # Zustand stores
│   ├── useAuthStore.ts
│   ├── useVoiceStore.ts
│   ├── useCallStore.ts
│   └── useEffectsStore.ts
├── types/                   # TypeScript types
└── supabase/               # Supabase config
    ├── migrations/
    └── functions/
```

## Features

### Authentication
- Email/password signup and login
- Automatic profile creation
- Session persistence

### Voice Recording
- High-quality audio recording (48kHz, mono, WAV)
- Minimum 5 seconds per sample
- Upload to Supabase storage
- Progress tracking

### Voice Models
- Create models from voice samples
- Track training status
- Active model selection
- Model revocation

### VoIP Calls
- Contact management by email
- Real-time call signaling
- Voice effects during calls:
  - Pitch shifting
  - Formant adjustment
  - Reverb
  - Noise gate

### Voice Effects
- Real-time audio processing
- Preset effects (Deep, High, Normal, Ethereal)
- Custom parameter adjustment

## Troubleshooting

### Common Issues

1. **Audio not recording**
   - Ensure microphone permissions are granted
   - On web, use HTTPS or localhost
   - Check browser audio permissions

2. **"Sign up failed" errors**
   - Check Supabase credentials in `.env`
   - Ensure email confirmation is disabled in Supabase for testing
   - Check Supabase logs for details

3. **Upload failures**
   - Check storage bucket exists: `voice-samples`
   - Verify RLS policies are set correctly
   - Ensure user is authenticated

4. **Real-time not working**
   - Enable realtime for tables in Supabase dashboard
   - Check that realtime is enabled for `call_sessions` and `contacts`

5. **Build errors**
   - Clear cache: `npx expo start -c`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Expo SDK version compatibility

### Reset Development Environment

```bash
# Clear all caches
npx expo start -c

# Reset everything
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install
```

## Dependencies (Locked Versions)

The app uses these exact versions for stability:

```json
{
  "expo": "~52.0.30",
  "expo-router": "~4.0.17",
  "react": "18.3.1",
  "react-native": "0.76.5",
  "@supabase/supabase-js": "^2.45.0",
  "@react-native-async-storage/async-storage": "2.1.0",
  "expo-av": "~15.0.0",
  "expo-file-system": "~18.0.0",
  "lucide-react-native": "^0.460.0",
  "react-native-reanimated": "~3.16.0",
  "react-native-gesture-handler": "~2.20.0",
  "zustand": "^5.0.0",
  "expo-sqlite": "~15.0.0",
  "react-native-safe-area-context": "4.12.0",
  "@react-navigation/native": "^7.0.0"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |

## Database Tables

### Core Tables
- `user_profiles` - User display names and metadata
- `voice_models` - Voice clone models
- `voice_samples` - Training audio samples
- `consent_records` - Voice consent management
- `training_jobs` - Model training status

### VoIP Tables
- `contacts` - User contacts
- `call_sessions` - Call records
- `call_participants` - Call member tracking
- `call_logs` - Call history

### Storage
- `voice-samples` bucket - Audio file storage

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only access their own data
- Contacts require mutual acceptance
- Call logs are private per user

### Consent Management
- All voice models require explicit consent
- Consent can be revoked at any time
- Revoked models are disabled

## Support

For issues or questions:
- Email: support@vocalforge.app
- GitHub Issues: [repository-url]/issues

## License

This project is for personal use only. Commercial use requires a license.
