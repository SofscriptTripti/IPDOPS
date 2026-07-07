import React from 'react';
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressSegment: {
    flex: 1,
    height: 4.5,
    borderRadius: 2,
    marginHorizontal: 1.2,
  },
});

interface SegmentedProgressBarProps {
  filled: number;
  total: number;
  color?: string;
  segmentColors?: string[];
}

export const SegmentedProgressBar = ({
  filled,
  total,
  color,
  segmentColors,
}: SegmentedProgressBarProps) => {
  const segments = [];
  for (let i = 0; i < total; i++) {
    let bg = '#e2e8f0'; // empty segment color
    if (i < filled) {
      bg = (segmentColors && segmentColors[i]) || color || '#0b665c';
    }
    segments.push(
      <View
        key={i}
        style={[
          styles.progressSegment,
          {
            backgroundColor: bg,
          },
        ]}
      />
    );
  }
  return <View style={styles.progressContainer}>{segments}</View>;
};
