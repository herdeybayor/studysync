import { Image as RNWImage, ImageProps } from 'expo-image';

export const Image = (props: ImageProps) => {
  return <RNWImage cachePolicy="memory-disk" {...props} />;
};
