import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { type TranscribeRealtimeEvent, type TranscribeRealtimeOptions } from 'whisper.rn';

import { Icons } from '~/components/ui/icons';
import { useWhisperModel } from '~/lib/whisper-models';

const WAVEFORM_COUNT = 30;

// Define type for realtime transcribe controller
interface RealtimeTranscribe {
  stop: () => void;
  unsubscribe: (() => void) | null;
}

export default function RecordScreen() {
  const { theme } = useUnistyles();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const {
    whisperContext,
    isLoading: isModelLoading,
    error: modelError,
    modelInfo,
  } = useWhisperModel();
  const [realtimeTranscribe, setRealtimeTranscribe] = useState<RealtimeTranscribe | null>(null);

  // Animated values
  const buttonScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(0);
  const waveformValues = useSharedValue(Array(WAVEFORM_COUNT).fill(4));

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (realtimeTranscribe) {
        realtimeTranscribe.stop();
      }
    };
  }, [realtimeTranscribe]);

  // Check and request microphone permissions
  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'StudySync needs access to your microphone for lecture recording',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Failed to request microphone permission:', err);
        return false;
      }
    }
    return true; // iOS handles permissions through info.plist
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Animation for record button
  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Animation for recording indicator
  const animatedRecordingStyle = useAnimatedStyle(() => {
    return {
      opacity: recordingOpacity.value,
    };
  });

  // Create all the waveform animated styles
  const waveformBars = useMemo(() => {
    return Array(WAVEFORM_COUNT)
      .fill(0)
      .map((_, index) => {
        // Create a component for each bar
        function WaveformBar() {
          const animatedStyle = useAnimatedStyle(() => ({
            height: withSpring(waveformValues.value[index], {
              damping: 10,
              stiffness: 100,
            }),
            backgroundColor:
              isRecording && !isPaused ? theme.colors.primary : theme.colors.typography,
            opacity: isRecording && !isPaused ? 1 : 0.5,
          }));

          return <Animated.View key={index} style={[styles.waveformBar, animatedStyle]} />;
        }

        return <WaveformBar key={index} />;
      });
  }, [isRecording, isPaused, theme.colors.primary, theme.colors.typography, waveformValues]);

  // Handle record button tap
  const handleRecord = async () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (!whisperContext) {
      Alert.alert('Model not ready', 'Please wait for the speech recognition model to load.');
      return;
    }

    if (!isRecording) {
      // Start recording
      const hasPermission = await requestMicrophonePermission();

      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone permission is required to record lectures.');
        return;
      }

      try {
        // Pre-configured optimal settings for students
        // const options: TranscribeRealtimeOptions = {
        //   // Auto-detect language for multi-language support
        //   language: undefined,
        //   // 5 minutes max recording time - good for lecture segments
        //   realtimeAudioSec: 300,
        //   // 8-second chunks for good balance of speed and accuracy
        //   realtimeAudioSliceSec: 8,
        //   // 4 threads for good performance on most devices
        //   maxThreads: 4,
        //   // Voice Activity Detection to improve performance and reduce false positives
        //   useVad: true,
        //   // Moderate VAD threshold - not too sensitive
        //   vadThold: 0.6,
        //   // Low temperature for more consistent transcription
        //   temperature: 0.1,
        //   // Beam size 5 for good accuracy without being too slow
        //   beamSize: 5,
        //   // No translation by default - students usually record in their native language
        //   translate: false,
        //   // Enable timestamps for better note-taking
        //   tokenTimestamps: true,
        // };
        const { stop, subscribe } = await whisperContext.transcribeRealtime({
          realtimeAudioSec: 300,
          // tokenTimestamps: true,
        });

        // Subscribe to transcription events
        const unsubscribeCallback = subscribe((event: TranscribeRealtimeEvent) => {
          const { isCapturing, data } = event;

          // Update transcription text
          if (data && data.result) {
            setTranscription(data.result);
          }

          // Handle when transcription stops
          if (!isCapturing) {
            setIsRecording(false);
            setIsPaused(false);
            recordingOpacity.value = withTiming(0);
          }
        });

        // Store both stop and unsubscribe functions
        setRealtimeTranscribe({
          stop,
          unsubscribe: typeof unsubscribeCallback === 'function' ? unsubscribeCallback : null,
        });

        setIsRecording(true);
        setIsPaused(false);

        // Start the blinking recording indicator
        recordingOpacity.value = withRepeat(
          withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })),
          -1, // Infinite repeat
          true // Reverse
        );
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      }
    } else if (isPaused) {
      // Resume recording
      setIsPaused(false);

      // Resume the blinking recording indicator
      recordingOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })),
        -1,
        true
      );
    } else {
      // Pause recording
      setIsPaused(true);

      // Stop the blinking animation and set to 50% opacity
      recordingOpacity.value = withTiming(0.5);
    }
  };

  // Handle stop button tap
  const handleStop = () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (realtimeTranscribe) {
      realtimeTranscribe.stop();
      if (realtimeTranscribe.unsubscribe) {
        realtimeTranscribe.unsubscribe();
      }
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    // Reset recording indicator
    recordingOpacity.value = withTiming(0);

    // Reset waveform to minimal height
    waveformValues.value = Array(WAVEFORM_COUNT).fill(4);
  };

  // Handle save button tap
  const handleSave = () => {
    if (!transcription.trim()) {
      Alert.alert('No Content', 'There is no transcription to save.');
      return;
    }

    // Navigate to save recording screen with transcript
    router.navigate({
      pathname: '/save-recording',
      params: { transcript: transcription },
    });
  };

  // Timer and waveform animation effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        // Update timer
        setRecordingTime((prev) => prev + 1);

        // Animate waveform with random heights
        const newValues = Array(WAVEFORM_COUNT)
          .fill(0)
          .map(() => Math.max(4, Math.floor(Math.random() * 40)));
        waveformValues.value = newValues;
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, waveformValues]);

  const recordingStatus = useMemo(() => {
    if (isModelLoading) return 'Loading model...';
    if (modelError) return 'Error loading model';
    if (!whisperContext) return 'Model not ready';
    if (!modelInfo) return 'Model not ready';
    if (!isRecording) return 'Ready to record';
    if (isPaused) return 'Recording paused';
    return 'Recording...';
  }, [isModelLoading, isRecording, isPaused, modelError, modelInfo, whisperContext]);

  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(true);

  return (
    <View style={styles.container}>
      {/* Simple header for students */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Record Lecture</Text>
      </View>

      <View style={styles.content}>
        <Animated.View style={styles.timerContainer} entering={FadeIn.duration(600)}>
          <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.recordingIndicator, animatedRecordingStyle]} />
            <Text style={styles.recordingStatus}>{recordingStatus}</Text>
          </View>
          {modelError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.navigate('/download-resources')}>
              <Text style={styles.retryButtonText}>Download Resources</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.waveformContainer}>{waveformBars}</View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleStop}
            disabled={!isRecording}>
            <Icons.Feather
              name="square"
              size={28}
              color={!isRecording ? theme.colors.typography : theme.colors.accent}
            />
          </TouchableOpacity>

          <Animated.View style={animatedButtonStyle}>
            <TouchableOpacity
              style={[styles.controlButton, styles.primaryButton]}
              onPress={handleRecord}>
              <Icons.Feather
                name={!isRecording || isPaused ? 'mic' : 'pause'}
                size={32}
                color={theme.colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.secondaryButton,
              !transcription ? { opacity: 0.5 } : {},
            ]}
            disabled={!transcription}
            onPress={handleSave}>
            <Icons.Feather
              name="save"
              size={28}
              color={!transcription ? theme.colors.typography : theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {transcription.length > 0 && (
          <View style={styles.transcriptionContainer}>
            <View style={styles.transcriptionHeader}>
              <Text style={styles.transcriptionTitle}>Transcription</Text>
              <TouchableOpacity
                onPress={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}>
                <Ionicons
                  name={isTranscriptionExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.primary}
                  style={styles.transcriptionChevron}
                />
              </TouchableOpacity>
            </View>
            {isTranscriptionExpanded && (
              <ScrollView
                contentContainerStyle={styles.transcriptionContent}
                showsVerticalScrollIndicator={false}>
                <Text style={styles.transcriptionText}>{transcription}</Text>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  content: {
    flex: 1,
    padding: theme.spacing(5),
    // justifyContent: 'space-between',
    gap: theme.spacing(4),
  },
  timerContainer: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.typography,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing(2),
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: theme.spacing(2),
  },
  recordingStatus: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  waveformContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
    marginVertical: theme.spacing(2),
  },
  waveformBar: {
    width: 8,
    borderRadius: 2,
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: theme.spacing(3),
    padding: theme.spacing(3),
    marginVertical: theme.spacing(4),
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptionChevron: {
    transform: [{ rotate: '180deg' }],
  },
  transcriptionContent: {
    // flex: 1,
    paddingBottom: theme.spacing(10),
    paddingTop: theme.spacing(2),
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(2),
  },
  transcriptionText: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    width: theme.spacing(18),
    height: theme.spacing(18),
  },
  secondaryButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    width: theme.spacing(14),
    height: theme.spacing(14),
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
