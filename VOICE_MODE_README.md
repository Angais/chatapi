# Voice Mode Implementation

This document describes the voice mode feature implementation using OpenAI's Realtime API.

## Features Added

### 1. Voice Mode Selector
- Located next to the model selector in the header
- Only appears when a realtime model is selected
- Three modes available:
  - **Text Only**: Traditional text-based chat (default)
  - **Text to Voice**: Type text, get voice responses
  - **Voice to Voice**: Full voice conversation

### 2. Realtime Model Support
- Added `gpt-4o-realtime-preview` to the model selector
- Realtime models are displayed with a microphone icon
- Voice mode automatically switches when selecting/deselecting realtime models

### 3. Voice Chat Controls
- Appears at the bottom of the chat when voice mode is active
- **Voice to Voice mode**: 
  - Connect/disconnect button
  - Record button with visual feedback
  - Real-time transcript display
  - Connection status indicator
- **Text to Voice mode**: Uses existing text input with voice output

### 4. Audio Processing
- Real-time audio input capture from microphone
- Audio output playback for voice responses
- Proper cleanup of audio resources
- Microphone permission handling

## Technical Implementation

### Core Components

1. **VoiceModeSelector** (`src/components/voice-mode-selector.tsx`)
   - Mode selection interface
   - Automatic mode switching based on model

2. **VoiceChatControls** (`src/components/voice-chat-controls.tsx`)
   - Voice chat interface
   - Connection management
   - Recording controls

3. **RealtimeAPIService** (`src/services/realtime-api.ts`)
   - WebSocket connection to OpenAI Realtime API
   - Audio data streaming
   - Event handling

4. **AudioPlayer** (`src/services/audio-player.ts`)
   - Audio output management
   - PCM16 audio processing
   - Playback queue management

5. **useVoiceChat** (`src/hooks/use-voice-chat.ts`)
   - Voice chat state management
   - Connection lifecycle
   - Audio permissions

### Security Features

- **Ephemeral Tokens**: Uses server-side API route to create secure ephemeral tokens
- **No Direct API Key Exposure**: Client never receives the main API key
- **Token Expiration**: Ephemeral tokens auto-expire for security

### API Routes

1. **`/api/realtime-session`** - Creates ephemeral tokens for secure client connections

### State Management

- Voice mode state integrated into Zustand store
- Persistent voice mode preferences per chat
- Migration system for backward compatibility

## Usage Instructions

1. **Select a Realtime Model**: Choose "GPT-4o Realtime" from the model selector
2. **Choose Voice Mode**: Select your preferred voice interaction mode
3. **For Voice to Voice**:
   - Grant microphone permissions when prompted
   - Click "Start Voice Chat" to connect
   - Use the record button to speak
   - View real-time transcripts
4. **For Text to Voice**:
   - Type messages normally
   - Receive voice responses automatically

## Browser Requirements

- Modern browser with WebSocket support
- Microphone access for voice-to-voice mode
- Web Audio API support for audio playback

## Error Handling

- Graceful fallback when microphone is unavailable
- Connection error recovery
- API key validation
- Audio processing error handling

## Performance Considerations

- Efficient audio streaming with chunked processing
- Memory cleanup for audio resources
- Optimized WebSocket connection management
- Audio queue management for smooth playback