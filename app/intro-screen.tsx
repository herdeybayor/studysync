import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button } from '~/components/ui/button';

import { Icons } from '~/components/ui/icons';
import { Image } from '~/components/ui/image';
import { SafeAreaView } from '~/components/ui/safe-area-view';

export default function IntroScreen() {
  const { theme } = useUnistyles();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Icons name="flash" size={20} color={theme.colors.typography} />
        </View>

        <Image
          source={require('~/assets/images/onboarding-banner1.png')}
          style={styles.image}
          contentFit="contain"
        />

        <View style={styles.content}>
          <Text style={styles.title}>
            All your recordings in{' '}
            <View style={styles.highlight}>
              <Text style={styles.highlightText}>one place</Text>
            </View>
          </Text>

          <View style={styles.waveContainer}>
            <Image source={require('~/assets/images/wave-left.png')} style={styles.waveImage} />
            <Image
              source={require('~/assets/images/voice-button.png')}
              style={styles.voiceButton}
            />
            <Image source={require('~/assets/images/wave-right.png')} style={styles.waveImage} />
          </View>
        </View>

        <Button title="Get Started" style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme, { screen }) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: theme.margins.screen,
    paddingTop: theme.margins.screen,
  },
  header: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing(4.5),
    paddingVertical: theme.spacing(5),
    borderRadius: 999,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    marginTop: theme.spacing(3),
  },
  content: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(7),
    borderRadius: 30,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.typography,
  },
  highlight: {
    backgroundColor: '#D9F1FA',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: 100,
    transform: [{ translateY: 8 }, { rotate: '-1.2deg' }],
  },
  highlightText: {
    fontSize: 36,
    fontWeight: 700,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing(7),
  },
  waveImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  voiceButton: {
    width: 100,
    height: 100,
  },
  button: {
    marginTop: 'auto',
  },
}));
