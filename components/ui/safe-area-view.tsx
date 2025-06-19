import { SafeAreaView as RNWSafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

export const SafeAreaView = (props: SafeAreaViewProps) => {
  return <RNWSafeAreaView {...props} />;
};
