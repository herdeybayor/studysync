import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Alert, Share, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Button } from '~/components/ui/button';
import { useRecording, useRecordings } from '~/hooks/use-recordings';
import { useLlamaModel } from '~/lib/llama-models';
import { useAINaming } from '~/lib/ai-naming';
import {
  useWhisperModel,
  useModelStore,
  WHISPER_MODELS,
  type ModelKey,
} from '~/lib/whisper-models';

export default function RecordingDetailScreen() {
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ id: string }>();
  const recordingId = parseInt(params.id);

  const { recording, isLoading, refreshRecording } = useRecording(recordingId);
  const { updateRecording, addSummary, deleteRecording, addTranscript } = useRecordings();
  const { llamaContext } = useLlamaModel();
  const aiNaming = useAINaming(llamaContext);
  const {
    whisperContext,
    isLoading: isWhisperLoading,
    modelKey: currentModelKey,
  } = useWhisperModel();
  const { installedModels, setCurrentModel, downloadModel } = useModelStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isGeneratingBetterTitle, setIsGeneratingBetterTitle] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showModelDebugger, setShowModelDebugger] = useState(false);

  // Audio player state
  const audioPlayer = useAudioPlayer(recording?.audioFilePath || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);

  const loadAudioFile = useCallback(async () => {
    if (!recording?.audioFilePath) return;

    try {
      // The useAudioPlayer hook handles loading automatically
      // We can get duration from the player once it's loaded
      if (audioPlayer) {
        setDuration(audioPlayer.duration || null);
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, [recording?.audioFilePath, audioPlayer]);

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded) {
          setPosition(status.currentTime || 0);
        }
      });
    }
  }, [audioPlayer]);

  useEffect(() => {
    if (recording) {
      setEditedTitle(recording.name);
      if (recording.audioFilePath) {
        loadAudioFile();
      }
    }
  }, [recording, audioPlayer, loadAudioFile]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!audioPlayer || !recording?.audioFilePath) return;

    try {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
    }
  };

  const detectAudioDuration = async (filePath: string) => {
    console.log('\n=== AUDIO DURATION DETECTION ===');
    console.log('File path:', filePath);

    try {
      // Try to get duration from audio player first
      if (audioPlayer && audioPlayer.duration) {
        const duration = audioPlayer.duration;
        console.log('✓ Audio duration from player:', duration, 'seconds');
        console.log(
          'Player status - loaded:',
          audioPlayer.isLoaded,
          'duration available:',
          !!audioPlayer.duration
        );
        return duration;
      } else {
        console.log('⚠ Audio player not available or duration not loaded');
        console.log('Player exists:', !!audioPlayer);
        console.log('Player duration:', audioPlayer?.duration);
        console.log('Player loaded:', audioPlayer?.isLoaded);
      }

      // Estimate duration from file size for WAV files
      console.log('Attempting file-based duration estimation...');
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists && !fileInfo.isDirectory) {
        const size = (fileInfo as any).size;
        const fileName = filePath.split('/').pop() || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase();

        console.log('File details:');
        console.log('- Name:', fileName);
        console.log('- Extension:', fileExtension);
        console.log('- Size (bytes):', size);
        console.log('- Size (MB):', (size / 1024 / 1024).toFixed(2));

        if (fileExtension === 'wav') {
          // WAV format calculation based on recording settings
          // From record.tsx: 44.1kHz, 16-bit, mono (LINEARPCM)
          // Bytes per second = sample_rate * bits_per_sample / 8 * channels
          const sampleRate = 44100;
          const bitsPerSample = 16;
          const channels = 1; // mono
          const bytesPerSecond = sampleRate * (bitsPerSample / 8) * channels;

          console.log('WAV format analysis:');
          console.log('- Sample rate:', sampleRate, 'Hz');
          console.log('- Bits per sample:', bitsPerSample);
          console.log('- Channels:', channels, '(mono)');
          console.log('- Calculated bytes per second:', bytesPerSecond);

          // Account for WAV header (typically 44 bytes)
          const wavHeaderSize = 44;
          const audioDataSize = size - wavHeaderSize;
          const estimatedDuration = audioDataSize / bytesPerSecond;

          console.log('- WAV header size:', wavHeaderSize, 'bytes');
          console.log('- Audio data size:', audioDataSize, 'bytes');
          console.log('✓ Estimated WAV duration:', estimatedDuration.toFixed(2), 'seconds');

          return estimatedDuration;
        } else {
          console.log('⚠ Non-WAV file detected, cannot estimate duration');
        }
      } else {
        console.log('⚠ File does not exist or is a directory');
      }

      console.log('⚠ Could not determine audio duration');
      return null;
    } catch (error) {
      console.error('❌ Error detecting audio duration:', error);
      return null;
    }
  };

  const validateAudioFile = async (filePath: string) => {
    try {
      console.log('Validating audio file:', filePath);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      console.log('File info:', {
        exists: fileInfo.exists,
        isDirectory: fileInfo.isDirectory,
        uri: fileInfo.uri,
      });

      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      if (fileInfo.exists && !fileInfo.isDirectory) {
        const size = (fileInfo as any).size;
        console.log('File size:', size);

        if (size === 0) {
          throw new Error('Audio file is empty');
        }
      }

      // Log file extension and path details
      const fileName = filePath.split('/').pop() || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const size = fileInfo.exists && !fileInfo.isDirectory ? (fileInfo as any).size : 0;

      // Detect audio duration
      const estimatedDuration = await detectAudioDuration(filePath);

      console.log('File details:', {
        fileName,
        fileExtension,
        fileSize: size,
        fileSizeMB: (size / (1024 * 1024)).toFixed(2),
        estimatedDurationSeconds: estimatedDuration,
        estimatedDurationMinutes: estimatedDuration ? (estimatedDuration / 60).toFixed(2) : null,
      });

      return {
        valid: true,
        fileInfo,
        fileName,
        fileExtension,
        estimatedDuration,
      };
    } catch (error) {
      console.error('Audio file validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  };

  const detectHallucination = (text: string): boolean => {
    // Check for repetitive patterns that indicate hallucination
    const words = text.trim().split(/\s+/);
    if (words.length < 5) return false;

    // Check for phrase repetition
    const phrases = text
      .split('.')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (phrases.length >= 3) {
      const firstPhrase = phrases[0];
      let repetitions = 0;
      for (const phrase of phrases) {
        if (phrase.includes(firstPhrase) || firstPhrase.includes(phrase)) {
          repetitions++;
        }
      }
      if (repetitions >= phrases.length * 0.7) {
        console.warn('Detected phrase hallucination:', {
          firstPhrase,
          repetitions,
          totalPhrases: phrases.length,
        });
        return true;
      }
    }

    // Check for word repetition patterns
    const wordCounts = new Map<string, number>();
    words.forEach((word) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
      wordCounts.set(cleanWord, (wordCounts.get(cleanWord) || 0) + 1);
    });

    // If any word appears more than 30% of the total words, it's likely hallucination
    for (const [word, count] of wordCounts) {
      if (count > words.length * 0.3 && words.length > 10) {
        console.warn('Detected word hallucination:', { word, count, totalWords: words.length });
        return true;
      }
    }

    return false;
  };

  const attemptTranscription = async (
    filePath: string,
    audioDuration: number | null,
    isRetry = false
  ) => {
    console.log(`\n=== TRANSCRIPTION ATTEMPT ${isRetry ? '(RETRY)' : '(INITIAL)'} ===`);
    console.log(
      'Current model:',
      currentModelKey,
      WHISPER_MODELS[currentModelKey as ModelKey]?.name
    );
    console.log('Model type:', WHISPER_MODELS[currentModelKey as ModelKey]?.languages);
    console.log('Estimated audio duration:', audioDuration, 'seconds');
    console.log('Audio file path:', filePath);

    // Enhanced file info logging
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const size = (fileInfo as any).size || 0;
      console.log('=== AUDIO FILE DIAGNOSTICS ===');
      console.log('File exists:', fileInfo.exists);
      console.log('File size (bytes):', size);
      console.log('File size (MB):', (size / 1024 / 1024).toFixed(2));
      console.log('File URI:', fileInfo.uri);

      // Calculate expected duration for WAV files
      if (size > 0) {
        // WAV format: 44.1kHz, 16-bit, mono = 88,200 bytes per second
        const expectedDurationWAV = size / 88200;
        console.log(
          'Expected WAV duration (calculated):',
          expectedDurationWAV.toFixed(2),
          'seconds'
        );
        console.log(
          'Duration mismatch:',
          audioDuration ? Math.abs(audioDuration - expectedDurationWAV).toFixed(2) : 'N/A',
          'seconds'
        );
      }
    } catch (error) {
      console.error('Could not get file info:', error);
    }

    // Determine correct language setting based on model
    const modelInfo = WHISPER_MODELS[currentModelKey as ModelKey];
    const isEnglishOnlyModel =
      modelInfo?.name.includes('.en') || modelInfo?.languages.includes('English');

    console.log('=== MODEL CONFIGURATION ===');
    console.log('Is English-only model:', isEnglishOnlyModel);
    console.log('Model languages:', modelInfo?.languages);

    // Base transcription options with corrected language setting
    const baseOptions = {
      language: isEnglishOnlyModel ? 'en' : 'auto', // Fix language detection issue
      maxThreads: 4,
      tokenTimestamps: true,
      wordThold: 0.01,
      temperature: 0.0,
      beamSize: 5,
      bestOf: 5,
    };

    console.log('=== TRANSCRIPTION STRATEGY ===');

    // Fix duration parameter - Whisper.rn expects seconds, not milliseconds
    let transcriptionOptions;

    if (audioDuration && audioDuration > 30) {
      console.log('Audio longer than 30 seconds detected. Processing first 30 seconds.');
      transcriptionOptions = {
        ...baseOptions,
        offset: 0,
        // duration: 30, // Let Whisper handle the duration
      };
      console.log('Using chunked approach with 30-second limit');
    } else {
      console.log('Audio is 30 seconds or shorter. Processing entire file.');
      transcriptionOptions = {
        ...baseOptions,
        offset: 0,
        // No duration limit for short audio
      };
    }

    console.log('=== FINAL TRANSCRIPTION OPTIONS ===');
    console.log(JSON.stringify(transcriptionOptions, null, 2));

    console.log('=== STARTING WHISPER TRANSCRIPTION ===');
    console.log('Creating transcription job...');

    const transcribeJob = whisperContext!.transcribe(filePath, transcriptionOptions);
    console.log('Transcription job created, awaiting result...');
    const result = await transcribeJob.promise;

    console.log('\n=== TRANSCRIPTION COMPLETE ===');
    console.log('Model used:', currentModelKey, WHISPER_MODELS[currentModelKey as ModelKey]?.name);
    console.log('Transcription status:', result.isAborted ? 'ABORTED' : 'COMPLETED');

    console.log('\n=== RESULT ANALYSIS ===');
    console.log('Result text:', `"${result.result}"`);
    console.log('Result text length:', result.result.length);
    console.log('Result text trimmed length:', result.result.trim().length);
    console.log('Segments count:', result.segments?.length || 0);

    // Analyze result quality
    const trimmedResult = result.result.trim();
    const isEmptyResult = trimmedResult.length === 0;
    const isNonSpeechResult =
      /^\s*[\[\*\(].*[\]\*\)]\s*$/i.test(trimmedResult) ||
      trimmedResult.includes('*snoring*') ||
      trimmedResult.includes('[music]') ||
      trimmedResult.includes('[sound') ||
      trimmedResult.includes('[BLANK_AUDIO]');

    console.log('\n=== QUALITY ANALYSIS ===');
    console.log('Is empty result:', isEmptyResult);
    console.log('Is non-speech result:', isNonSpeechResult);
    console.log('Contains brackets/asterisks:', /[\[\*\(\)]/.test(trimmedResult));

    if (result.segments) {
      let totalProcessedDuration = 0;
      console.log('\n=== SEGMENT ANALYSIS ===');

      result.segments.forEach((segment, index) => {
        const segmentDuration = (segment.t1 - segment.t0) / 1000; // Convert to seconds
        totalProcessedDuration += segmentDuration;

        console.log(`Segment ${index + 1}:`, {
          startTime: `${(segment.t0 / 1000).toFixed(1)}s`,
          endTime: `${(segment.t1 / 1000).toFixed(1)}s`,
          duration: `${segmentDuration.toFixed(1)}s`,
          text: `"${segment.text}"`,
          textLength: segment.text.length,
        });
      });

      console.log('\n=== DURATION ANALYSIS ===');
      console.log(`Total processed audio duration: ${totalProcessedDuration.toFixed(1)}s`);

      if (audioDuration) {
        const processingPercentage = (totalProcessedDuration / audioDuration) * 100;
        console.log(`Original audio duration: ${audioDuration.toFixed(1)}s`);
        console.log(`Processed ${processingPercentage.toFixed(1)}% of audio`);

        if (processingPercentage < 50) {
          console.warn('⚠ WARNING: Less than 50% of audio was processed!');
        }
        if (processingPercentage < 10) {
          console.error('❌ CRITICAL: Less than 10% of audio was processed!');
        }
      }
    } else {
      console.warn('⚠ No segments found in transcription result');
    }

    console.log('\n=== FULL RESULT OBJECT ===');
    console.log(JSON.stringify(result, null, 2));

    // Check for hallucination
    if (detectHallucination(result.result)) {
      console.warn('Hallucination detected in transcription result');
      throw new Error('HALLUCINATION_DETECTED');
    }

    // If we processed only a chunk of longer audio, indicate this
    if (audioDuration && audioDuration > 30 && 'duration' in transcriptionOptions) {
      console.log(
        `Note: Processed first 30 seconds of ${audioDuration.toFixed(1)}-second audio due to Whisper model limitations`
      );
      result.result =
        result.result +
        `\n\n[Note: This transcription covers the first 30 seconds of a ${Math.round(audioDuration)}-second recording due to Whisper model limitations]`;
    }

    return result;
  };

  const handleTranscribe = useCallback(async () => {
    if (!recording?.audioFilePath || !whisperContext) return;

    setIsTranscribing(true);
    try {
      console.log('=== STARTING TRANSCRIPTION ===');
      console.log('Audio file path:', recording.audioFilePath);
      console.log(
        'Current Whisper model:',
        currentModelKey,
        WHISPER_MODELS[currentModelKey as ModelKey]?.name
      );

      // Validate audio file first
      const validation = await validateAudioFile(recording.audioFilePath);
      if (!validation.valid) {
        throw new Error(`Audio file validation failed: ${validation.error}`);
      }

      console.log('Audio file validation passed:', validation);

      // Attempt transcription with duration info
      const result = await attemptTranscription(
        recording.audioFilePath,
        validation.estimatedDuration || null
      );

      // Check if we got a valid transcription
      if (
        result.result.trim().length === 0 ||
        result.result.includes('[sound of') ||
        result.result.includes('[BLANK_AUDIO]')
      ) {
        console.warn('Transcription returned non-speech result:', result.result);
        Alert.alert(
          'Transcription Issue',
          'The transcription returned non-speech content using the ' +
            (WHISPER_MODELS[currentModelKey as ModelKey]?.name || currentModelKey) +
            ' model.\n\nResult: "' +
            result.result +
            '"\n\nThis might indicate:\n1. Poor audio quality or background noise\n2. Very quiet speech\n3. Model-specific processing limitations\n4. File encoding issues\n\nTry switching to a different Whisper model using the debugger above, or check that the audio contains clear, audible speech.'
        );
        return;
      }

      await addTranscript(recording.id, result.result);
      refreshRecording();
      Alert.alert('Success', 'Audio transcribed successfully!');
    } catch (error) {
      console.error('=== TRANSCRIPTION ERROR ===');
      console.error('Error transcribing audio:', error);

      if (error instanceof Error && error.message === 'HALLUCINATION_DETECTED') {
        Alert.alert(
          'Transcription Quality Issue',
          'The transcription produced repetitive or unclear results, which typically indicates:\n\n1. Audio quality issues (background noise, low volume)\n2. Unclear or muffled speech\n3. Audio format compatibility problems\n\nPlease try:\n• Re-recording with clearer speech\n• Ensuring good audio quality\n• Speaking closer to the microphone',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Try Again',
              style: 'default',
              onPress: () => handleTranscribe(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to transcribe audio: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    } finally {
      setIsTranscribing(false);
    }
  }, [recording?.audioFilePath, whisperContext, addTranscript, refreshRecording, recording?.id]);

  const handleSaveTitle = async () => {
    if (!recording || !editedTitle.trim()) return;

    try {
      await updateRecording(recording.id, { name: editedTitle.trim() });
      setIsEditing(false);
      refreshRecording();
      Alert.alert('Success', 'Recording title updated successfully!');
    } catch (error) {
      console.error('Error updating title:', error);
      Alert.alert('Error', 'Failed to update title');
    }
  };

  const handleGenerateBetterTitle = async () => {
    if (!recording || !aiNaming || recording.transcripts.length === 0 || !llamaContext) return;

    setIsGeneratingBetterTitle(true);
    try {
      const suggestions = await aiNaming.suggestBetterTitle(
        recording.name,
        recording.transcripts[0].text
      );
      setTitleSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating better title:', error);
      Alert.alert('Error', 'Failed to generate title suggestions');
    } finally {
      setIsGeneratingBetterTitle(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!recording || !aiNaming || recording.transcripts.length === 0 || !llamaContext) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await aiNaming.generateSummary(recording.transcripts[0].text);
      await addSummary(recording.id, summary);
      refreshRecording();
      Alert.alert('Success', 'AI summary generated successfully!');
    } catch (error) {
      console.error('Error generating summary:', error);
      Alert.alert('Error', 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleShareRecording = async () => {
    if (!recording) return;

    const transcript = recording.transcripts.length > 0 ? recording.transcripts[0].text : '';
    const summary = recording.summaries.length > 0 ? recording.summaries[0].text : '';

    const shareContent = (
      recording.name +
      '\n' +
      formatDate(recording.createdAt) +
      '\n\n' +
      (summary ? 'Summary:\n' + summary + '\n\n' : '') +
      (transcript ? 'Transcript:\n' + transcript : 'No transcript available')
    ).trim();

    try {
      await Share.share({
        message: shareContent,
        title: recording.name,
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
    }
  };

  const handleDeleteRecording = () => {
    if (!recording) return;

    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete "' + recording.name + '"? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecording(recording.id);
              router.back();
              Alert.alert('Success', 'Recording deleted successfully');
            } catch (error) {
              console.error('Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !recording) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading recording...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.Feather name="arrow-left" size={24} color={theme.colors.typography} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareRecording} style={styles.headerButton}>
            <Icons.Feather name="share" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteRecording} style={styles.headerButton}>
            <Icons.Feather name="trash-2" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recording Info */}
        <Animated.View style={styles.section} entering={FadeInUp.duration(600)}>
          <View style={styles.titleSection}>
            {isEditing ? (
              <View style={styles.editTitleContainer}>
                <TextInput
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter recording title..."
                  style={styles.titleInput}
                />
                <View style={styles.editActions}>
                  <Button title="Save" onPress={handleSaveTitle} style={styles.saveButton} />
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(false);
                      setEditedTitle(recording.name);
                    }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.titleContainer}>
                <Text style={styles.recordingTitle}>{recording.name}</Text>
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                  <Icons.Feather name="edit-2" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* AI Title Suggestions */}
            {!isEditing && recording.transcripts.length > 0 && llamaContext && (
              <View style={styles.aiTitleSection}>
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleGenerateBetterTitle}
                  disabled={isGeneratingBetterTitle}>
                  <Icons.Feather name="zap" size={16} color={theme.colors.primary} />
                  <Text style={styles.aiButtonText}>
                    {isGeneratingBetterTitle ? 'Generating...' : 'Suggest Better Title'}
                  </Text>
                </TouchableOpacity>

                {titleSuggestions.length > 0 && (
                  <View style={styles.titleSuggestions}>
                    <Text style={styles.suggestionsLabel}>AI Suggestions:</Text>
                    {titleSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionChip}
                        onPress={() => {
                          setEditedTitle(suggestion);
                          setIsEditing(true);
                        }}>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.metaInfo}>
            <Text style={styles.dateText}>{formatDate(recording.createdAt)}</Text>
            {recording.folder && (
              <View style={styles.folderInfo}>
                <Icons.Feather name="folder" size={16} color={theme.colors.primary} />
                <Text style={styles.folderText}>{recording.folder.name}</Text>
              </View>
            )}
            {recording.audioFilePath && (
              <View style={styles.audioInfo}>
                <Icons.Feather name="volume-2" size={16} color={theme.colors.limedSpruce} />
                <Text style={styles.audioInfoText}>
                  {duration ? formatTime(duration) : 'Loading...'}
                  {recording.fileSize &&
                    ' • ' + (recording.fileSize / 1024 / 1024).toFixed(2) + ' MB'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Audio Player */}
        {recording.audioFilePath && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(100)}>
            <Text style={styles.sectionTitle}>Audio Playback</Text>
            <View style={styles.audioPlayerContainer}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                disabled={!audioPlayer}>
                <Icons.Feather
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color={audioPlayer ? theme.colors.white : theme.colors.limedSpruce}
                />
              </TouchableOpacity>

              <View style={styles.audioProgressContainer}>
                <View style={styles.audioProgress}>
                  <View
                    style={[
                      styles.audioProgressBar,
                      { width: `${(position / (duration || 1)) * 100}%` },
                    ]}
                  />
                </View>
                <View style={styles.audioTimeContainer}>
                  <Text style={styles.audioTimeText}>{formatTime(position)}</Text>
                  <Text style={styles.audioTimeText}>
                    {duration ? formatTime(duration) : '--:--'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Model Debugger - Temporary for testing */}
        {recording.audioFilePath && recording.transcripts.length === 0 && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(150)}>
            <View style={styles.debugSection}>
              <TouchableOpacity
                style={styles.debugToggle}
                onPress={() => setShowModelDebugger(!showModelDebugger)}>
                <Icons.Feather name="settings" size={16} color={theme.colors.primary} />
                <Text style={styles.debugToggleText}>
                  Model Debugger (Current: {currentModelKey || 'none'})
                </Text>
                <Icons.Feather
                  name={showModelDebugger ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.limedSpruce}
                />
              </TouchableOpacity>

              {showModelDebugger && (
                <View style={styles.debugContent}>
                  <Text style={styles.debugDescription}>
                    Test different Whisper models to diagnose audio processing issues:
                  </Text>
                  {Object.entries(WHISPER_MODELS).map(([key, model]) => {
                    const isInstalled = !!installedModels[key];
                    const isCurrent = currentModelKey === key;
                    return (
                      <View key={key} style={styles.modelRow}>
                        <View style={styles.modelInfo}>
                          <Text style={[styles.modelName, isCurrent && styles.currentModel]}>
                            {model.name} ({model.size}MB)
                          </Text>
                          <Text style={styles.modelDescription}>{model.description}</Text>
                        </View>
                        {isInstalled ? (
                          <TouchableOpacity
                            style={[styles.modelButton, isCurrent && styles.currentModelButton]}
                            onPress={() => setCurrentModel(key as ModelKey)}
                            disabled={isCurrent || isWhisperLoading}>
                            <Text
                              style={[
                                styles.modelButtonText,
                                isCurrent && styles.currentModelButtonText,
                              ]}>
                              {isCurrent ? 'Active' : 'Use'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={() => downloadModel(key as ModelKey)}>
                            <Text style={styles.downloadButtonText}>Download</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Transcription Actions */}
        {recording.audioFilePath && recording.transcripts.length === 0 && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(200)}>
            <View style={styles.transcribeSection}>
              <View style={styles.transcribeInfo}>
                <Icons.Feather name="file-text" size={20} color={theme.colors.primary} />
                <View style={styles.transcribeTextContainer}>
                  <Text style={styles.transcribeTitle}>Generate Transcript</Text>
                  <Text style={styles.transcribeSubtitle}>
                    Transcribe this audio to unlock AI features like smart titles and summaries
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.transcribeButton}
                onPress={handleTranscribe}
                disabled={isTranscribing || isWhisperLoading || !whisperContext}>
                <Icons.Feather name="zap" size={16} color={theme.colors.white} />
                <Text style={styles.transcribeButtonText}>
                  {isTranscribing
                    ? 'Transcribing...'
                    : isWhisperLoading
                      ? 'Loading Model...'
                      : !whisperContext
                        ? 'Model Not Ready'
                        : 'Transcribe'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* AI Summaries */}
        {recording.summaries.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(200)}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            {recording.summaries.map((summary, index) => (
              <View key={summary.id} style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Icons.Feather name="zap" size={16} color={theme.colors.primary} />
                  <Text style={styles.summaryDate}>{formatDate(summary.createdAt)}</Text>
                </View>
                <Text style={styles.summaryText}>{summary.text}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Generate Summary Button */}
        {recording.transcripts.length > 0 && recording.summaries.length === 0 && llamaContext && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(300)}>
            <TouchableOpacity
              style={styles.generateSummaryButton}
              onPress={handleGenerateSummary}
              disabled={isGeneratingSummary}>
              <Icons.Feather name="zap" size={20} color={theme.colors.white} />
              <Text style={styles.generateSummaryText}>
                {isGeneratingSummary ? 'Generating AI Summary...' : 'Generate AI Summary'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Transcripts */}
        <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(400)}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          {recording.transcripts.length > 0 ? (
            recording.transcripts.map((transcript) => (
              <View key={transcript.id} style={styles.transcriptCard}>
                <View style={styles.transcriptHeader}>
                  <Icons.Feather name="file-text" size={16} color={theme.colors.limedSpruce} />
                  <Text style={styles.transcriptDate}>{formatDate(transcript.createdAt)}</Text>
                </View>
                <Text style={styles.transcriptText}>{transcript.text}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyTranscript}>
              <Icons.Feather name="file-text" size={32} color={theme.colors.limedSpruce} />
              <Text style={styles.emptyText}>No transcript available</Text>
              <Text style={styles.emptySubtext}>
                Transcripts are generated automatically during recording
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: theme.spacing(2),
    marginLeft: -theme.spacing(2),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  headerButton: {
    padding: theme.spacing(2),
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
  },
  section: {
    marginTop: theme.spacing(6),
  },
  titleSection: {
    marginBottom: theme.spacing(4),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  recordingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
    flex: 1,
    marginRight: theme.spacing(2),
  },
  editButton: {
    padding: theme.spacing(2),
  },
  editTitleContainer: {
    marginBottom: theme.spacing(2),
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    fontSize: 16,
    color: theme.colors.typography,
    backgroundColor: theme.colors.white,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
  },
  saveButton: {
    flex: 1,
    marginRight: theme.spacing(3),
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  aiTitleSection: {
    marginTop: theme.spacing(3),
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    gap: theme.spacing(1),
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  titleSuggestions: {
    marginTop: theme.spacing(3),
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(2),
  },
  suggestionChip: {
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  metaInfo: {
    gap: theme.spacing(2),
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  folderText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  audioInfoText: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: theme.spacing(3),
  },
  playButton: {
    width: theme.spacing(12),
    height: theme.spacing(12),
    borderRadius: theme.spacing(6),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioProgressContainer: {
    flex: 1,
  },
  audioProgress: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: theme.spacing(2),
  },
  audioProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  audioTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioTimeText: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
  },
  transcribeSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  transcribeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(4),
    gap: theme.spacing(3),
  },
  transcribeTextContainer: {
    flex: 1,
  },
  transcribeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  transcribeSubtitle: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    lineHeight: 20,
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.spacing(3),
    gap: theme.spacing(2),
  },
  transcribeButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  debugSection: {
    backgroundColor: '#fff7e6',
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#ffd700',
    marginBottom: theme.spacing(3),
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(3),
    gap: theme.spacing(2),
  },
  debugToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  debugContent: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: '#ffe0b3',
  },
  debugDescription: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(3),
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: '#ffe0b3',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  currentModel: {
    color: theme.colors.primary,
  },
  modelDescription: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
    marginTop: 2,
  },
  modelButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(2),
  },
  currentModelButton: {
    backgroundColor: theme.colors.primary,
  },
  modelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  currentModelButtonText: {
    color: theme.colors.white,
  },
  downloadButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(2),
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  summaryCard: {
    backgroundColor: 'rgba(47, 128, 237, 0.05)',
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing(3),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  summaryDate: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
  },
  generateSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(3),
    borderRadius: theme.spacing(3),
    gap: theme.spacing(2),
  },
  generateSummaryText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  transcriptDate: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
  },
  transcriptText: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 22,
  },
  emptyTranscript: {
    alignItems: 'center',
    padding: theme.spacing(8),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
  },
}));
