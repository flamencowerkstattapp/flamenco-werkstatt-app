import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../constants/theme';
import { t } from '../locales';

interface FlamencoLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const FlamencoLoading: React.FC<FlamencoLoadingProps> = ({ 
  message, 
  size = 'medium' 
}) => {
  // Animation values for the dancing effect
  const danceAnimation = React.useRef(new Animated.Value(0)).current;
  const swayAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Create smooth, continuous dancing animation without hard resets
    const danceLoop = Animated.loop(
      Animated.sequence([
        // Gentle sway to the right
        Animated.timing(danceAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        // Flow through center to left
        Animated.timing(danceAnimation, {
          toValue: -1,
          duration: 3000,
          useNativeDriver: true,
        }),
        // Flow back through center to right
        Animated.timing(danceAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle hip movement
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnimation, {
          toValue: -1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    danceLoop.start();
    swayLoop.start();

    return () => {
      danceLoop.stop();
      swayLoop.stop();
    };
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          emojiSize: 40,
          fontSize: 14,
          padding: theme.spacing.sm,
        };
      case 'large':
        return {
          emojiSize: 80,
          fontSize: 18,
          padding: theme.spacing.lg,
        };
      default:
        return {
          emojiSize: 60,
          fontSize: 16,
          padding: theme.spacing.md,
        };
    }
  };

  const { emojiSize, fontSize, padding } = getSizeStyles();

  return (
    <View style={[styles.container, { padding }]}>
      <Animated.View
        style={[
          styles.dancerContainer,
          {
            transform: [
              {
                translateX: swayAnimation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-8, 8], // Reduced movement range
                }),
              },
              {
                rotate: danceAnimation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-3deg', '3deg'], // More subtle rotation
                }),
              },
              {
                scale: danceAnimation.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [0.95, 1, 0.95], // Subtle breathing effect
                }),
              },
            ],
          },
        ]}
      >
        <Text 
          style={[styles.dancerEmoji, { fontSize: emojiSize }]}
          role="img"
          aria-label="Flamenco dancer loading"
        >
          💃🏻
        </Text>
      </Animated.View>
      
      {message && (
        <Text style={[styles.message, { fontSize }]}>
          {message}
        </Text>
      )}
      
      <View style={styles.dotsContainer}>
        <Animated.Text
          style={[
            styles.dot,
            {
              opacity: danceAnimation.interpolate({
                inputRange: [-1, -0.5, 0, 0.5, 1],
                outputRange: [0.3, 0.8, 1, 0.8, 0.3],
              }),
              transform: [
                {
                  scale: danceAnimation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0.8, 1.2, 0.8],
                  }),
                },
              ],
            },
          ]}
        >
          •
        </Animated.Text>
        <Animated.Text
          style={[
            styles.dot,
            {
              opacity: swayAnimation.interpolate({
                inputRange: [-1, -0.5, 0, 0.5, 1],
                outputRange: [0.3, 0.8, 1, 0.8, 0.3],
              }),
              transform: [
                {
                  scale: swayAnimation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0.8, 1.2, 0.8],
                  }),
                },
              ],
            },
          ]}
        >
          •
        </Animated.Text>
        <Animated.Text
          style={[
            styles.dot,
            {
              opacity: danceAnimation.interpolate({
                inputRange: [-1, -0.5, 0, 0.5, 1],
                outputRange: [0.3, 0.8, 1, 0.8, 0.3],
              }),
              transform: [
                {
                  scale: danceAnimation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0.8, 1.2, 0.8],
                  }),
                },
              ],
            },
          ]}
        >
          •
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  dancerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dancerEmoji: {
    lineHeight: 60,
  },
  message: {
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  dot: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
