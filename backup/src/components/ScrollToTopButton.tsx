import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface ScrollToTopButtonProps {
  scrollViewRef?: React.RefObject<any>;
  visibleThreshold?: number;
  onScroll?: (event: any) => void;
}

const { height: screenHeight } = Dimensions.get('window');

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  scrollViewRef,
  visibleThreshold = 200,
  onScroll,
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Handle scroll events passed from parent
  useEffect(() => {
    if (onScroll) {
      // Parent component will handle scroll detection and call this callback
      return;
    }

    // Fallback: Show button after delay for simple cases
    const timer = setTimeout(() => {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onScroll, fadeAnim]);

  // Expose scroll handler for parent components
  const handleScroll = React.useCallback((event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 
                    event.nativeEvent?.layoutMeasurement?.y || 
                    event.target?.scrollTop || 0;
    
    if (yOffset > visibleThreshold) {
      if (!visible) {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (visible) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
        });
      }
    }

    // Call parent's onScroll if provided
    if (onScroll) {
      onScroll(event);
    }
  }, [visibleThreshold, visible, onScroll]);

  const scrollToTop = () => {
    if (scrollViewRef?.current) {
      const scrollView = scrollViewRef.current;
      if (scrollView.scrollToOffset) {
        // React Native
        scrollView.scrollToOffset({ offset: 0, animated: true });
      } else if (scrollView.scrollTo) {
        // React Native Web
        scrollView.scrollTo({ y: 0, animated: true });
      } else {
        // Fallback - try to scroll the DOM element
        const element = scrollView.getScrollableNode?.();
        if (element) {
          element.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 80,
        right: 20,
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={scrollToTop}
        style={{
          backgroundColor: 'rgba(220, 38, 38, 0.7)', // Muted red with 70% opacity
          width: 50,
          height: 50,
          borderRadius: 25,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 2.84,
        }}
      >
        <Ionicons name="chevron-up" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};
