import { View } from 'react-native';

export function Spacer({ size }: { size: number }) {
  return <View style={{ height: size }} />;
}
