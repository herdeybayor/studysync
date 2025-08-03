import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
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
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';

import { Icons } from '~/components/ui/icons';
import { useCalendarEvent } from '~/hooks/use-calendar-events';

const WAVEFORM_COUNT = 30;

export default function RecordScreen() {
  const { theme } = useUnistyles();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { event } = useCalendarEvent(eventId ? parseInt(eventId) : 0);

  // Audio recording setup
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<string>('Ready to record');
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Animated values
  const buttonScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(0);
  const waveformValues = useSharedValue(Array(WAVEFORM_COUNT).fill(4));

  // Initialize audio and request permissions
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request recording permissions
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Permission Denied', 'Microphone permission is required to record lectures.');
          return;
        }

        setHasPermissions(true);

        // Configure audio session
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (error) {
        console.error('Failed to setup audio:', error);
        Alert.alert('Setup Error', 'Failed to setup audio recording.');
      }
    };

    setupAudio();
  }, []);

  // Update recording status based on recorder state
  useEffect(() => {
    if (recorderState.isRecording && !isPaused) {
      setRecordingStatus('Recording...');
    } else if (isPaused) {
      setRecordingStatus('Recording paused');
    } else {
      setRecordingStatus('Ready to record');
    }
  }, [recorderState.isRecording, isPaused]);

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
            backgroundColor: recorderState.isRecording
              ? theme.colors.primary
              : theme.colors.typography,
            opacity: recorderState.isRecording ? 1 : 0.5,
          }));

          return <Animated.View key={index} style={[styles.waveformBar, animatedStyle]} />;
        }

        return <WaveformBar key={index} />;
      });
  }, [recorderState.isRecording, theme.colors.primary, theme.colors.typography, waveformValues]);

  // Handle record button tap
  const handleRecord = async () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Please grant microphone permissions to record.');
      return;
    }

    try {
      if (!recorderState.isRecording && !isPaused) {
        // Start recording
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsPaused(false);

        // Start the blinking recording indicator
        recordingOpacity.value = withRepeat(
          withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })),
          -1, // Infinite repeat
          true // Reverse
        );
      } else if (isPaused) {
        // Resume recording
        audioRecorder.record();
        setIsPaused(false);

        // Resume the blinking recording indicator
        recordingOpacity.value = withRepeat(
          withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })),
          -1,
          true
        );
      } else {
        // Pause recording
        audioRecorder.pause();
        setIsPaused(true);

        // Stop the blinking animation and set to 50% opacity
        recordingOpacity.value = withTiming(0.5);
      }
    } catch (error) {
      console.error('Failed to handle recording action:', error);
      Alert.alert('Recording Error', 'Failed to control recording. Please try again.');
    }
  };

  // Handle stop button tap
  const handleStop = async () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    try {
      if (recorderState.isRecording || isPaused) {
        await audioRecorder.stop();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }

    setRecordingTime(0);
    setIsPaused(false);

    // Reset recording indicator
    recordingOpacity.value = withTiming(0);

    // Reset waveform to minimal height
    waveformValues.value = Array(WAVEFORM_COUNT).fill(4);
  };

  // Handle save button tap
  const handleSave = async () => {
    if (!audioRecorder.uri) {
      Alert.alert('No Recording', 'Please record audio before saving.');
      return;
    }

    try {
      // Stop recording if still active
      if (recorderState.isRecording || isPaused) {
        await handleStop();
      }

      // Get the URI of the recorded audio
      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert('Error', 'Failed to get recording file.');
        return;
      }

      // Navigate to save recording screen with audio file URI and optional event info
      router.navigate({
        pathname: '/save-recording',
        params: {
          audioUri: uri,
          eventId: eventId || undefined,
          eventTitle: event?.title || undefined,
        },
      });
    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  // Timer and waveform animation effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (recorderState.isRecording) {
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
  }, [recorderState.isRecording, waveformValues]);

  // Recording status is now managed by state
  // No need for complex status logic since we removed model dependencies

  return (
    <View style={styles.container}>
      {/* Header with optional event context */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{event ? event.title : 'Record Lecture'}</Text>
          {event && event.location && <Text style={styles.headerSubtitle}>{event.location}</Text>}
        </View>
        {event && (
          <View style={styles.eventBadge}>
            <Icons.Feather name="calendar" size={14} color={theme.colors.white} />
            <Text style={styles.eventBadgeText}>Scheduled</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Animated.View style={styles.timerContainer} entering={FadeIn.duration(600)}>
          <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.recordingIndicator, animatedRecordingStyle]} />
            <Text style={styles.recordingStatus}>{recordingStatus}</Text>
          </View>
        </Animated.View>

        <View style={styles.waveformContainer}>{waveformBars}</View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleStop}
            disabled={!recorderState.isRecording && !isPaused}>
            <Icons.Feather
              name="square"
              size={28}
              color={
                !recorderState.isRecording && !isPaused
                  ? theme.colors.typography
                  : theme.colors.accent
              }
            />
          </TouchableOpacity>

          <Animated.View style={animatedButtonStyle}>
            <TouchableOpacity
              style={[styles.controlButton, styles.primaryButton]}
              onPress={handleRecord}>
              <Icons.Feather
                name={!recorderState.isRecording || isPaused ? 'mic' : 'pause'}
                size={32}
                color={theme.colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.secondaryButton,
              !audioRecorder.uri ? { opacity: 0.5 } : {},
            ]}
            disabled={!audioRecorder.uri}
            onPress={handleSave}>
            <Icons.Feather
              name="save"
              size={28}
              color={!audioRecorder.uri ? theme.colors.typography : theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginTop: 2,
    textAlign: 'center',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(3),
    gap: theme.spacing(1),
  },
  eventBadgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
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
    fontVariant: ['tabular-nums'] as const,
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
