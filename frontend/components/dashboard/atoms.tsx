// Reusable atomic components used by Dashboard screen.
// Extracted from /app/frontend/app/(tabs)/dashboard.tsx to keep that file lean.

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { T, FONT, tap } from './tokens';

// Press-scale wrapper — shrinks to 0.96 on press-in, bounces back on release.
export const PressScale = ({
  children,
  onPress,
  testID,
  style,
  hapticStyle = 'light' as 'light' | 'medium',
}: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 6 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start()
      }
      onPress={() => {
        tap(hapticStyle);
        onPress?.();
      }}
      testID={testID}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

// Sparkline (white upward trend) for Net Worth card.
export const MiniChart = ({ data, color = '#FFF', h = 44, w = 110 }: any) => {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data
    .map((v: number, i: number) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h * 0.78) - h * 0.11;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Path d={pts} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle
        cx={w}
        cy={h - ((data[data.length - 1] - mn) / range) * (h * 0.78) - h * 0.11}
        r={3}
        fill="#FFF"
      />
    </Svg>
  );
};

export const SectionHeader = ({ title, onViewAll, viewAllLabel = 'View All' }: any) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity
        onPress={onViewAll}
        testID={`section-${title.toLowerCase().replace(/\s/g, '-')}-view-all`}
      >
        <Text style={s.viewAll}>{viewAllLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const FilterPill = ({ icon, label, onPress, testID }: any) => (
  <PressScale onPress={onPress} testID={testID} style={s.filterPill}>
    <Text style={s.filterPillIcon}>{icon}</Text>
    <Text style={s.filterPillText}>{label}</Text>
    <Ionicons name="chevron-down" size={14} color={T.textDim} />
  </PressScale>
);

export const StatPill = ({ color, value, delta, arrow = '▲', deltaColor }: any) => (
  <View style={s.statPill}>
    <View style={[s.statDot, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={[s.statDelta, { color: deltaColor || T.success }]}>
        {arrow} {delta}
      </Text>
    </View>
  </View>
);

export const QuickActionBtn = ({ icon, label, color, onPress, testID }: any) => (
  <TouchableOpacity style={s.qaBtn} onPress={onPress} activeOpacity={0.7} testID={testID}>
    <View style={[s.qaIcon, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={26} color="#FFF" />
    </View>
    <Text style={s.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

export const ListRow = ({
  leftIcon,
  leftIconBg,
  leftIconColor,
  title,
  subtitle,
  rightTop,
  rightBottom,
  rightColor,
  rightBottomColor,
  showChevron,
  onPress,
  testID,
}: any) => (
  <TouchableOpacity style={s.listRow} onPress={onPress} activeOpacity={0.7} testID={testID}>
    <View style={[s.listIcon, { backgroundColor: leftIconBg }]}>
      <MaterialCommunityIcons name={leftIcon} size={22} color={leftIconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.listTitle} numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={s.listSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    <View style={s.listRight}>
      {!!rightTop && <Text style={[s.listAmount, { color: rightColor || T.text }]}>{rightTop}</Text>}
      {!!rightBottom && (
        <Text style={[s.listDate, rightBottomColor && { color: rightBottomColor }]}>
          {rightBottom}
        </Text>
      )}
    </View>
    {showChevron && <Ionicons name="chevron-forward" size={18} color={T.textDim} style={{ marginLeft: 6 }} />}
  </TouchableOpacity>
);

const s = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { color: T.text, fontSize: 17, fontWeight: '700', fontFamily: FONT },
  viewAll: { color: T.primary, fontSize: 13, fontWeight: '600', fontFamily: FONT },

  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 50,
  },
  filterPillIcon: { fontSize: 14 },
  filterPillText: { color: T.text, fontSize: 13, fontWeight: '600', fontFamily: FONT },

  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statValue: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: FONT },
  statDelta: { fontSize: 10, fontWeight: '600', marginTop: 1, fontFamily: FONT },

  qaBtn: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  qaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  qaLabel: { color: T.text, fontSize: 12, fontWeight: '600', fontFamily: FONT },

  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listTitle: { color: T.text, fontSize: 14, fontWeight: '600', fontFamily: FONT },
  listSubtitle: { color: T.textDim, fontSize: 12, marginTop: 2, fontFamily: FONT },
  listRight: { alignItems: 'flex-end' },
  listAmount: { fontSize: 14, fontWeight: '700', fontFamily: FONT },
  listDate: { color: T.textDim, fontSize: 11, marginTop: 2, fontFamily: FONT },
});
