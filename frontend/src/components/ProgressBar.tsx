import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showWarning?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color,
  backgroundColor = COLORS.border,
  showWarning = false,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  const getColor = () => {
    if (color) return color;
    if (showWarning && clampedProgress > 100) return COLORS.error;
    if (clampedProgress > 80) return COLORS.warning;
    return COLORS.primary;
  };

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(clampedProgress, 100)}%`,
            backgroundColor: getColor(),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
