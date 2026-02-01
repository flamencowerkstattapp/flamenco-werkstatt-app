import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 'medium',
  style 
}) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();
  
  const sizeStyles = {
    small: styles.badgeSmall,
    medium: styles.badgeMedium,
    large: styles.badgeLarge,
  };

  const textSizeStyles = {
    small: styles.badgeTextSmall,
    medium: styles.badgeTextMedium,
    large: styles.badgeTextLarge,
  };

  return (
    <View style={[styles.badge, sizeStyles[size], style]}>
      <Text style={[styles.badgeText, textSizeStyles[size]]}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
  },
  badgeMedium: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
  },
  badgeLarge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  badgeTextSmall: {
    fontSize: 10,
  },
  badgeTextMedium: {
    fontSize: 11,
  },
  badgeTextLarge: {
    fontSize: 12,
  },
});
