import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Text, TouchableOpacity, View, FlatList, Alert, RefreshControl } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import {
  useFolders,
  useRecordings,
  type RecordingWithDetails,
  type FolderWithRecordings,
} from '~/hooks/use-recordings';

export default function RecordingsScreen() {
  const { theme } = useUnistyles();
  const { folders, isLoading: foldersLoading, deleteFolder, refreshFolders } = useFolders();
  const {
    recordings,
    isLoading: recordingsLoading,
    deleteRecording,
    refreshRecordings,
  } = useRecordings();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshFolders();
      refreshRecordings();
    }, [])
  );

  const isLoading = foldersLoading || recordingsLoading;

  // Filter recordings based on selected folder
  const filteredRecordings = recordings.filter((recording) => {
    const matchesFolder = selectedFolderId === null || recording.folderId === selectedFolderId;
    return matchesFolder;
  });

  const handleDeleteRecording = (recording: RecordingWithDetails) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete "${recording.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRecording(recording.id),
        },
      ]
    );
  };

  const handleDeleteFolder = (folder: FolderWithRecordings) => {
    if (folder.recordings.length > 0) {
      Alert.alert(
        'Folder Not Empty',
        `The folder "${folder.name}" contains ${folder.recordings.length} recording(s). Move or delete the recordings first.`
      );
      return;
    }

    Alert.alert('Delete Folder', `Are you sure you want to delete the folder "${folder.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteFolder(folder.id),
      },
    ]);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const renderRecordingItem = ({ item }: { item: RecordingWithDetails }) => (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        style={styles.recordingItem}
        onPress={() => router.navigate(`/recording/${item.id}`)}>
        <View style={styles.recordingHeader}>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTitle} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.recordingMeta}>
              <Text style={styles.recordingDate}>{formatDate(item.updatedAt)}</Text>
              {item.folder && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <View style={styles.folderTag}>
                    <Icons.Feather name="folder" size={12} color={theme.colors.primary} />
                    <Text style={styles.folderTagText}>{item.folder.name}</Text>
                  </View>
                </>
              )}
              {item.audioFilePath && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <View style={styles.audioTag}>
                    <Icons.Feather name="volume-2" size={12} color={theme.colors.limedSpruce} />
                    <Text style={styles.audioTagText}>
                      {item.duration
                        ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`
                        : 'Audio'}
                      {item.fileSize && ` • ${(item.fileSize / 1024 / 1024).toFixed(1)}MB`}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteRecording(item)}>
            <Icons.Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Transcription Status */}
        {item.audioFilePath && item.transcripts.length === 0 && (
          <View style={styles.transcriptionNeeded}>
            <Icons.Feather name="file-text" size={14} color={theme.colors.limedSpruce} />
            <Text style={styles.transcriptionNeededText}>Tap to transcribe audio</Text>
          </View>
        )}

        {/* Preview transcript */}
        {item.transcripts.length > 0 && (
          <Text style={styles.transcriptPreview} numberOfLines={2}>
            {item.transcripts[0].text}
          </Text>
        )}

        {/* Summary preview */}
        {item.summaries.length > 0 && (
          <View style={styles.summaryPreview}>
            <Icons.Feather name="zap" size={12} color={theme.colors.primary} />
            <Text style={styles.summaryText} numberOfLines={1}>
              {item.summaries[0].text}
            </Text>
          </View>
        )}

        <View style={styles.recordingStats}>
          {item.audioFilePath && (
            <View style={styles.stat}>
              <Icons.Feather name="volume-2" size={14} color={theme.colors.primary} />
              <Text style={styles.statText}>Audio</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Icons.Feather
              name="file-text"
              size={14}
              color={item.transcripts.length > 0 ? theme.colors.primary : theme.colors.limedSpruce}
            />
            <Text style={styles.statText}>
              {item.transcripts.length > 0
                ? `${item.transcripts.length} transcript${item.transcripts.length !== 1 ? 's' : ''}`
                : 'No transcript'}
            </Text>
          </View>
          {item.summaries.length > 0 && (
            <View style={styles.stat}>
              <Icons.Feather name="zap" size={14} color={theme.colors.primary} />
              <Text style={styles.statText}>
                {item.summaries.length} summar{item.summaries.length !== 1 ? 'ies' : 'y'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderFolderChip = (folder: FolderWithRecordings | null) => {
    const isSelected = selectedFolderId === (folder?.id || null);
    const recordingCount = folder
      ? folder.recordings.length
      : recordings.filter((r) => !r.folderId).length;

    return (
      <TouchableOpacity
        key={folder?.id || 'no-folder'}
        style={[styles.folderChip, isSelected && styles.selectedFolderChip]}
        onPress={() => setSelectedFolderId(folder?.id || null)}>
        <Icons.Feather
          name={folder ? 'folder' : 'file'}
          size={16}
          color={isSelected ? theme.colors.white : theme.colors.primary}
        />
        <Text style={[styles.folderChipText, isSelected && styles.selectedFolderChipText]}>
          {folder ? folder.name : 'No Folder'} ({recordingCount})
        </Text>
        {folder && (
          <TouchableOpacity
            style={styles.folderDeleteButton}
            onPress={() => handleDeleteFolder(folder)}>
            <Icons.Feather
              name="x"
              size={14}
              color={isSelected ? theme.colors.white : theme.colors.limedSpruce}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recordings</Text>
        <TouchableOpacity style={styles.recordButton} onPress={() => router.navigate('/record')}>
          <Icons.Feather name="mic" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icons.Feather name="search" size={18} color={theme.colors.limedSpruce} />
          <Text style={styles.searchInput}>Search recordings...</Text>
        </View>
      </View>

      {/* Folder Filter */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filter by Folder:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...folders]}
          renderItem={({ item }) => renderFolderChip(item)}
          keyExtractor={(item) => item?.id?.toString() || 'no-folder'}
          contentContainerStyle={styles.foldersContainer}
        />
      </View>

      {/* Recordings List */}
      <FlatList
        data={filteredRecordings}
        renderItem={renderRecordingItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.recordingsList}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refreshFolders();
              refreshRecordings();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <Animated.View style={styles.emptyState} entering={FadeInUp.duration(600)}>
            <Icons.Feather name="mic-off" size={48} color={theme.colors.limedSpruce} />
            <Text style={styles.emptyTitle}>No Recordings Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFolderId !== null
                ? 'No recordings in this folder'
                : 'Start recording your first lecture!'}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.navigate('/record')}>
              <Text style={styles.emptyButtonText}>Start Recording</Text>
            </TouchableOpacity>
          </Animated.View>
        }
      />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  recordButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(3),
    borderRadius: theme.spacing(6),
  },
  searchContainer: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: theme.spacing(2),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  filtersContainer: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(2),
  },
  foldersContainer: {
    gap: theme.spacing(2),
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(5),
    gap: theme.spacing(1),
  },
  selectedFolderChip: {
    backgroundColor: theme.colors.primary,
  },
  folderChipText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectedFolderChipText: {
    color: theme.colors.white,
  },
  folderDeleteButton: {
    marginLeft: theme.spacing(1),
    padding: theme.spacing(1),
  },
  recordingsList: {
    padding: theme.spacing(4),
    paddingTop: 0,
  },
  recordingItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2),
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  recordingDate: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  metaSeparator: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  folderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  folderTagText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  audioTagText: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
  },
  transcriptionNeeded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(2),
  },
  transcriptionNeededText: {
    fontSize: 13,
    color: theme.colors.limedSpruce,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: theme.spacing(2),
    marginLeft: theme.spacing(2),
  },
  transcriptPreview: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
    marginBottom: theme.spacing(2),
  },
  summaryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 128, 237, 0.05)',
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  recordingStats: {
    flexDirection: 'row',
    gap: theme.spacing(4),
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  statText: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(12),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.typography,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
    marginBottom: theme.spacing(6),
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(6),
    paddingVertical: theme.spacing(3),
    borderRadius: theme.spacing(3),
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}));
