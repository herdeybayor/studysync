import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';

import { Icons } from '~/components/ui/icons';
import { Image } from '~/components/ui/image';

export function QuickActions() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      {[
        {
          title: 'Start Recording',
          icon: require('~/assets/images/voice-button.png'),
          backgroundColor: theme.colors.primary,
          onPress: () => router.navigate('/record'),
        },
        {
          title: 'Get Transcript',
          icon: require('~/assets/images/transcript-button.png'),
          backgroundColor: theme.colors.accent,
          onPress: () => {},
        },
      ].map((item) => (
        <TouchableOpacity
          key={item.title}
          onPress={item.onPress}
          style={[styles.card, { backgroundColor: item.backgroundColor }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>{item.title}</Text>
            <View style={styles.cardArrow}>
              <Icons.Feather name="arrow-up-right" size={16} color={theme.colors.white} />
            </View>
          </View>
          <Image source={item.icon} style={styles.icon} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flexDirection: 'row',
    gap: theme.spacing(3),
  },
  card: {
    flex: 1,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(7),
    borderRadius: theme.spacing(8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
  },
  cardHeaderText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: 700,
  },
  cardArrow: {
    width: theme.spacing(6),
    height: theme.spacing(6),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF4A',
    borderRadius: theme.spacing(6),
  },
  icon: {
    width: rt.screen.width * 0.2,
    height: rt.screen.width * 0.2,
    alignSelf: 'center',
    marginTop: theme.spacing(10),
  },
}));
