import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Button } from '~/components/ui/button';
import { useFolders, useRecordings } from '~/hooks/use-recordings';
import { useLlamaModel } from '~/lib/llama-models';
import { AINameSuggestions, useAINaming } from '~/lib/ai-naming';

export default function SaveRecordingScreen() {
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ transcript?: string }>();
  const transcript = params.transcript || '';

  const { folders, createFolder } = useFolders();
  const { createRecording, addTranscript, addSummary } = useRecordings();
  const { llamaContext, isLoading: isLlamaLoading } = useLlamaModel();
  const aiNaming = useAINaming(llamaContext);

  const [recordingTitle, setRecordingTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiLoadingText, setAiLoadingText] = useState('');

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<Partial<AINameSuggestions>>({});

  // Generate AI suggestions when component mounts
  useEffect(() => {
    if (transcript && aiNaming && !isGeneratingAI) {
      generateAISuggestions();
    }
  }, [transcript, aiNaming]);

  const generateAISuggestions = async () => {
    if (!aiNaming || !transcript) return;

    setIsGeneratingAI(true);
    try {
      setAiLoadingText('Generating smart titles...');
      const recordingTitles = await aiNaming.generateRecordingTitles(transcript);
      setAiSuggestions((prev) => ({ ...prev, recordingTitles }));

      if (recordingTitles.length > 0 && !recordingTitle) {
        setRecordingTitle(recordingTitles[0]);
      }

      setAiLoadingText('Categorizing into folders...');
      const folderNames = await aiNaming.generateFolderNames([transcript]);
      setAiSuggestions((prev) => ({ ...prev, folderNames }));

      setAiLoadingText('Creating a summary...');
      const summary = await aiNaming.generateSummary(transcript);
      setAiSuggestions((prev) => ({ ...prev, summary }));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      Alert.alert('AI Error', 'Could not generate all suggestions.');
    } finally {
      setIsGeneratingAI(false);
      setAiLoadingText('');
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      const newFolder = await createFolder(newFolderName.trim());
      setSelectedFolderId(newFolder.id);
      setNewFolderName('');
      setIsCreatingNewFolder(false);
      Alert.alert('Success', 'Folder created successfully!');
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const handleSaveRecording = async () => {
    if (!recordingTitle.trim()) {
      Alert.alert('Error', 'Please enter a recording title');
      return;
    }

    setIsSaving(true);
    try {
      // Create the recording
      const recording = await createRecording(recordingTitle.trim(), selectedFolderId ?? undefined);

      // Add transcript if available
      if (transcript) {
        await addTranscript(recording.id, transcript);
      }

      // Add AI-generated summary if available
      if (aiSuggestions.summary) {
        await addSummary(recording.id, aiSuggestions.summary);
      }

      Alert.alert('Recording Saved!', 'Your recording has been saved successfully.', [
        {
          text: 'View Recording',
          onPress: () => router.replace(`/recording/${recording.id}`),
        },
        {
          text: 'Record Another',
          onPress: () => router.replace('/record'),
        },
      ]);
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.Feather name="arrow-left" size={24} color={theme.colors.typography} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Save Recording</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Suggestions Loading */}
        {isGeneratingAI && (
          <Animated.View style={styles.aiLoadingContainer} entering={FadeIn.duration(300)}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.aiLoadingText}>{aiLoadingText}</Text>
          </Animated.View>
        )}

        {/* Recording Title Section */}
        <Animated.View style={styles.section} entering={FadeInUp.duration(600)}>
          <Text style={styles.sectionTitle}>Recording Title</Text>
          <TextInput
            value={recordingTitle}
            onChangeText={setRecordingTitle}
            placeholder="Enter recording title..."
            style={styles.textInput}
          />

          {/* AI Title Suggestions */}
          {aiSuggestions.recordingTitles && aiSuggestions.recordingTitles.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>AI Suggestions:</Text>
              {aiSuggestions.recordingTitles.map((title, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip,
                    recordingTitle === title && styles.selectedSuggestion,
                  ]}
                  onPress={() => setRecordingTitle(title)}>
                  <Icons.Feather name="zap" size={14} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.suggestionText,
                      recordingTitle === title && styles.selectedSuggestionText,
                    ]}>
                    {title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Folder Selection Section */}
        <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(200)}>
          <Text style={styles.sectionTitle}>Organization</Text>

          {/* Existing Folders */}
          <Text style={styles.subsectionTitle}>Select Folder (Optional)</Text>
          <View style={styles.foldersContainer}>
            <TouchableOpacity
              style={[styles.folderChip, selectedFolderId === null && styles.selectedFolder]}
              onPress={() => setSelectedFolderId(null)}>
              <Icons.Feather name="file" size={16} color={theme.colors.limedSpruce} />
              <Text style={styles.folderText}>No Folder</Text>
            </TouchableOpacity>

            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[styles.folderChip, selectedFolderId === folder.id && styles.selectedFolder]}
                onPress={() => setSelectedFolderId(folder.id)}>
                <Icons.Feather name="folder" size={16} color={theme.colors.primary} />
                <Text style={styles.folderText}>{folder.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Create New Folder */}
          <View style={styles.newFolderSection}>
            <TouchableOpacity
              style={styles.newFolderButton}
              onPress={() => setIsCreatingNewFolder(!isCreatingNewFolder)}>
              <Icons.Feather name="plus" size={16} color={theme.colors.primary} />
              <Text style={styles.newFolderButtonText}>Create New Folder</Text>
            </TouchableOpacity>

            {isCreatingNewFolder && (
              <Animated.View style={styles.newFolderInput} entering={FadeIn.duration(300)}>
                <TextInput
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="Enter folder name..."
                  style={styles.textInput}
                />

                {/* AI Folder Suggestions */}
                {aiSuggestions.folderNames && aiSuggestions.folderNames.length > 0 && (
                  <View style={styles.folderSuggestionsContainer}>
                    <Text style={styles.suggestionsLabel}>AI Suggestions:</Text>
                    <View style={styles.folderSuggestions}>
                      {aiSuggestions.folderNames.map((name, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionChip}
                          onPress={() => setNewFolderName(name)}>
                          <Icons.Feather name="zap" size={12} color={theme.colors.primary} />
                          <Text style={styles.suggestionText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.newFolderActions}>
                  <Button
                    title="Create Folder"
                    onPress={handleCreateNewFolder}
                    style={styles.createFolderButton}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setIsCreatingNewFolder(false);
                      setNewFolderName('');
                    }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* AI Summary Preview */}
        {aiSuggestions.summary && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(400)}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>{aiSuggestions.summary}</Text>
            </View>
          </Animated.View>
        )}

        {/* Save Button */}
        <Animated.View style={styles.saveSection} entering={FadeInUp.duration(600).delay(600)}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Recording'}
            onPress={handleSaveRecording}
            disabled={isSaving || !recordingTitle.trim()}
            style={[
              styles.saveButton,
              (!recordingTitle.trim() || isSaving) && styles.disabledButton,
            ]}
          />

          {selectedFolder && (
            <Text style={styles.saveInfo}>Will be saved to: {selectedFolder.name}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(4),
    gap: theme.spacing(2),
  },
  aiLoadingText: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  section: {
    marginTop: theme.spacing(6),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(3),
  },
  titleInput: {
    marginBottom: theme.spacing(4),
  },
  textInput: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: theme.spacing(4),
  },
  suggestionsContainer: {
    marginTop: theme.spacing(2),
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(2),
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
  },
  selectedSuggestion: {
    backgroundColor: theme.colors.primary,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectedSuggestionText: {
    color: theme.colors.white,
  },
  foldersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    gap: theme.spacing(1),
  },
  selectedFolder: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  folderText: {
    fontSize: 14,
    color: theme.colors.typography,
  },
  newFolderSection: {
    marginTop: theme.spacing(4),
  },
  newFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    paddingVertical: theme.spacing(2),
  },
  newFolderButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  newFolderInput: {
    marginTop: theme.spacing(3),
  },
  folderSuggestionsContainer: {
    marginTop: theme.spacing(3),
  },
  folderSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  newFolderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(4),
  },
  createFolderButton: {
    flex: 1,
    marginRight: theme.spacing(3),
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  summaryContainer: {
    backgroundColor: 'rgba(47, 128, 237, 0.05)',
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
  },
  saveSection: {
    marginTop: theme.spacing(8),
    marginBottom: theme.spacing(8),
  },
  saveButton: {
    marginBottom: theme.spacing(2),
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveInfo: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
  },
}));
