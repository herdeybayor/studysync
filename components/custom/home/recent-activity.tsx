import { Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format } from 'date-fns';
import { router } from 'expo-router';

import { Icons } from '~/components/ui/icons';
import { useRecordings } from '~/hooks/use-recordings';

export function RecentActivity() {
  const { theme } = useUnistyles();
  const { recordings, isLoading } = useRecordings();

  const recentRecordings = recordings.slice(0, 3);

  const getStatusInfo = (recording: (typeof recordings)[0]) => {
    if (recording.transcripts.length === 0) {
      return { status: 'needs_transcription', color: '#F59E0B', icon: 'mic-outline' };
    } else if (recording.summaries.length === 0) {
      return { status: 'needs_summary', color: '#3B82F6', icon: 'document-text-outline' };
    }
    return { status: 'completed', color: '#10B981', icon: 'checkmark-circle-outline' };
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Recent Activity</Text>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading recordings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/recordings')}
          accessibilityRole="button"
          accessibilityLabel="View all recordings">
          <Text style={[styles.viewAll, { color: theme.colors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentRecordings.length > 0 ? (
        <View style={styles.activityList}>
          {recentRecordings.map((recording) => {
            const statusInfo = getStatusInfo(recording);
            return (
              <TouchableOpacity
                key={recording.id}
                onPress={() => router.push(`/recording/${recording.id}`)}
                style={styles.activityItem}
                accessibilityRole="button"
                accessibilityLabel={`Open recording: ${recording.name}`}>
                <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}20` }]}>
                  <Icons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {recording.name}
                  </Text>
                  <Text style={styles.activitySubtitle}>
                    {format(new Date(recording.createdAt), 'MMM d, h:mm a')}
                    {recording.folder && ` • ${recording.folder.name}`}
                  </Text>
                </View>
                <View style={styles.activityActions}>
                  {statusInfo.status === 'needs_transcription' && (
                    <Text
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusInfo.color, color: 'white' },
                      ]}>
                      Transcribe
                    </Text>
                  )}
                  {statusInfo.status === 'needs_summary' && (
                    <Text
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusInfo.color, color: 'white' },
                      ]}>
                      Summarize
                    </Text>
                  )}
                  {statusInfo.status === 'completed' && (
                    <Icons name="checkmark-circle" size={20} color={statusInfo.color} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/record')}
          style={styles.emptyState}
          accessibilityRole="button"
          accessibilityLabel="Start your first recording">
          <Icons name="mic-outline" size={32} color={theme.colors.primary} />
          <Text style={styles.emptyStateTitle}>No recordings yet</Text>
          <Text style={styles.emptyStateSubtitle}>Tap to start your first recording</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing(3),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingState: {
    padding: theme.spacing(6),
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.typography,
    opacity: 0.6,
  },
  activityList: {
    gap: theme.spacing(2),
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing(2),
    gap: theme.spacing(3),
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: theme.spacing(0.5),
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  activitySubtitle: {
    fontSize: 12,
    color: theme.colors.typography,
    opacity: 0.6,
  },
  activityActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(1),
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing(8),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing(3),
    gap: theme.spacing(2),
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.typography,
    opacity: 0.6,
    textAlign: 'center',
  },
}));
