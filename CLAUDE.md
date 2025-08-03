# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudySync is a React Native app built with Expo that provides AI-powered audio recording, transcription, and summarization for study sessions. The app integrates local AI models (Whisper for speech recognition and Llama for text generation) to create an offline-capable study companion.

## Development Commands

### Start Development Server
```bash
npx expo start --dev-client
```

### Build Commands
```bash
# Development build
eas build --profile development

# Preview build
eas build --profile preview

# Production build
eas build --profile production
```

### Native Development
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Code Quality
```bash
# Lint and format check
npm run lint

# Auto-fix linting and formatting
npm run format

# Prebuild (generate native code)
npm run prebuild
```

## Architecture

### Core Technologies
- **Framework**: React Native with Expo SDK 53
- **Navigation**: Expo Router (file-based routing)
- **Database**: SQLite with Drizzle ORM
- **State Management**: Zustand stores
- **Styling**: React Native Unistyles for theming
- **AI Models**: 
  - Whisper.rn for speech-to-text
  - Llama.rn for text generation and summarization

### Key Directory Structure
- `app/` - Expo Router screens and layouts
  - `app/(tabs)/` - Tab-based navigation screens (home, calendar, recordings, profile)
  - `app/recording/[id].tsx` - Dynamic route for individual recordings
- `components/` - Reusable UI components
- `db/` - Database schema and constants
- `lib/` - Core libraries and services
  - `lib/ai-naming.ts` - AI service for generating titles and summaries
  - `lib/llama-models.ts` - Llama model management
  - `lib/whisper-models.ts` - Whisper model management
- `store/` - Zustand state management
- `hooks/` - Custom React hooks
- `drizzle/` - Database migrations

### Database Schema
The app uses SQLite with the following main entities:
- `appSettings` - User preferences and settings
- `folders` - Organizational folders for recordings
- `recordings` - Audio recording metadata
- `transcripts` - Speech-to-text results
- `summaries` - AI-generated summaries

### AI Model Management
Both Whisper and Llama models are downloaded on-demand and managed locally:
- Models are stored in device file system
- Download progress is tracked with resumable downloads
- Multiple model sizes available (tiny, base, medium for Whisper; lightweight models for Llama)
- Network-aware downloading (WiFi warnings for large models)

## Development Guidelines

### Path Resolution
- Uses `~/*` alias for imports from project root (configured in tsconfig.json)
- Example: `import { Icons } from '~/components/ui/icons'`

### Database Operations
- Use Drizzle ORM for all database operations
- Database migrations are handled automatically in app layout
- Access via `useDrizzleStudio()` hook for development

### AI Features
- Whisper models handle speech-to-text transcription
- Llama models generate recording titles, folder names, and summaries
- All AI operations are designed to work offline
- Error handling includes fallback options for AI failures

### State Management
- Zustand stores for model downloads and app state
- Custom hooks for accessing AI contexts
- Persistent storage for model metadata

### Code Style
- ESLint with Expo config + Prettier
- 100 character line width
- Single quotes, trailing commas
- React display names disabled in ESLint

## Testing & Quality Assurance

Always run linting and formatting before committing:
```bash
npm run lint
```

The project uses TypeScript strict mode and includes comprehensive error handling for offline AI operations.