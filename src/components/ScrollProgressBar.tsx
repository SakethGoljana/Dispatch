import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ScrollProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  progress,
  color = '#10B981',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
