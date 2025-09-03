import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

export interface UseSpeechRecognitionProps {
  enabled?: boolean;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  requiresOnDeviceRecognition?: boolean;
}

export function useSpeechRecognition({
  enabled = false,
  language = 'en-US',
  continuous = true,
  interimResults = true,
  maxAlternatives = 1,
  requiresOnDeviceRecognition = true,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check if speech recognition is supported and request permissions
  useEffect(() => {
    const checkSupportAndPermissions = async () => {
      try {
        const supported = await ExpoSpeechRecognitionModule.getSpeechRecognitionAvailableAsync();
        console.log('[SpeechRecognition] Supported:', supported);
        setIsSupported(supported);

        if (supported) {
          const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          console.log('[SpeechRecognition] Permission granted:', granted);
          setHasPermission(granted);

          if (!granted) {
            setError('Microphone permission is required for real-time transcription');
          }

          // Download offline models for Android if needed
          if (Platform.OS === 'android' && requiresOnDeviceRecognition) {
            try {
              console.log('[SpeechRecognition] Triggering offline model download for:', language);
              await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: language });
            } catch (downloadError) {
              console.warn('[SpeechRecognition] Failed to trigger offline model download:', downloadError);
              // Don't set this as an error since it might still work online
            }
          }
        }
      } catch (err) {
        console.error('[SpeechRecognition] Failed to check support/permissions:', err);
        setError('Failed to initialize speech recognition');
        setIsSupported(false);
      }
    };

    checkSupportAndPermissions();
  }, [language, requiresOnDeviceRecognition]);

  // Handle speech recognition events
  useSpeechRecognitionEvent('start', () => {
    console.log('[SpeechRecognition] Started listening');
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[SpeechRecognition] Stopped listening');
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    console.log('[SpeechRecognition] Result:', {
      isFinal: event.isFinal,
      transcript: event.results[0]?.transcript,
    });
    
    const result = event.results[0];
    if (result) {
      if (event.isFinal) {
        setFinalTranscript(prev => prev + ' ' + result.transcript);
        setTranscript(''); // Clear interim results
      } else if (interimResults) {
        setTranscript(result.transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('[SpeechRecognition] Error:', event.error);
    setError(event.error);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('nomatch', () => {
    console.log('[SpeechRecognition] No speech match');
    // Don't treat this as an error, just log it
  });

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported on this device');
      return;
    }

    if (!hasPermission) {
      setError('Microphone permission is required');
      return;
    }

    try {
      const options: ExpoSpeechRecognitionOptions = {
        lang: language,
        interimResults,
        maxAlternatives,
        continuous,
        requiresOnDeviceRecognition,
      };

      console.log('[SpeechRecognition] Starting with options:', options);
      ExpoSpeechRecognitionModule.start(options);
    } catch (err) {
      console.error('[SpeechRecognition] Failed to start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
    }
  }, [isSupported, hasPermission, language, interimResults, maxAlternatives, continuous, requiresOnDeviceRecognition]);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      console.log('[SpeechRecognition] Stopping...');
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error('[SpeechRecognition] Failed to stop:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop speech recognition');
    }
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isListening && hasPermission && isSupported) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, isListening, hasPermission, isSupported, startListening, stopListening]);

  return {
    isListening,
    hasPermission,
    transcript,
    finalTranscript,
    fullTranscript: (finalTranscript + ' ' + transcript).trim(),
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}