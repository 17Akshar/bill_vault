import React from 'react';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 24,
  color = COLORS.primary,
}) => {
  const iconMap: Record<string, any> = {
    home: 'home',
    restaurant: 'coffee',
    car: 'truck',
    'shopping-bag': 'shopping-bag',
    film: 'film',
    airplane: 'send',
    'trending-up': 'trending-up',
    heart: 'heart',
    book: 'book',
    'more-horizontal': 'more-horizontal',
  };

  const iconName = iconMap[name] || 'circle';

  return <Feather name={iconName as any} size={size} color={color} />;
};
