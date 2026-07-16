import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  segmentWrapper: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 1.2,
  },
  progressSegment: {
    width: '100%',
    height: 4.5,
    borderRadius: 2,
  },
  segmentLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
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
    if (segmentColors && segmentColors[i]) {
      bg = segmentColors[i];
    } else if (i < filled) {
      bg = color || '#0b665c';
    }
    segments.push(
      <View key={i} style={styles.segmentWrapper}>
        <View
          style={[
            styles.progressSegment,
            {
              backgroundColor: bg,
            },
          ]}
        />
        <Text style={styles.segmentLabel}>T{i + 1}</Text>
      </View>
    );
  }
  return <View style={styles.progressContainer}>{segments}</View>;
};
