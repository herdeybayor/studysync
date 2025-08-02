import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Alert, Share, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Button } from '~/components/ui/button';
import { useRecording, useRecordings } from '~/hooks/use-recordings';
import { useLlamaModel } from '~/lib/llama-models';
import { useAINaming } from '~/lib/ai-naming';

export default function RecordingDetailScreen() {
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ id: string }>();
  const recordingId = parseInt(params.id);

  const { recording, isLoading, refreshRecording } = useRecording(recordingId);
  const { updateRecording, addSummary, deleteRecording } = useRecordings();
  const { llamaContext } = useLlamaModel();
  const aiNaming = useAINaming(llamaContext);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isGeneratingBetterTitle, setIsGeneratingBetterTitle] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (recording) {
      setEditedTitle(recording.name);
    }
  }, [recording]);

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
    if (!recording || !aiNaming || recording.transcripts.length === 0) return;

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
    if (!recording || !aiNaming || recording.transcripts.length === 0) return;

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

    const shareContent = `
${recording.name}
${formatDate(recording.createdAt)}

${summary ? `Summary:\n${summary}\n\n` : ''}${transcript ? `Transcript:\n${transcript}` : 'No transcript available'}
    `.trim();

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
      `Are you sure you want to delete "${recording.name}"? This action cannot be undone.`,
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
            {!isEditing && recording.transcripts.length > 0 && (
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
          </View>
        </Animated.View>

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
