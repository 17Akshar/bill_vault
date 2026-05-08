import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showWarning?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color,
  backgroundColor = COLORS.border,
  showWarning = false,
  animated = true,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.spring(animatedWidth, {
        toValue: clampedProgress,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  const getColor = () => {
    if (color) return color;
    if (showWarning && clampedProgress > 100) return COLORS.error;
    if (clampedProgress >= 100) return COLORS.success;
    if (clampedProgress > 80) return COLORS.warning;
    return COLORS.primary;
  };

  const borderRadiusValue = Math.max(height / 2, BORDER_RADIUS.sm);

  return (
    <View style={[styles.container, { height, backgroundColor, borderRadius: borderRadiusValue }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: getColor(),
            borderRadius: borderRadiusValue,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
