import React from 'react';
import { Text, Linking, Alert, TextStyle } from 'react-native';
import { theme } from '../constants/theme';

interface LinkableTextProps {
  children: string;
  style?: TextStyle;
}

export const LinkableText: React.FC<LinkableTextProps> = ({ children, style }) => {
  // Regular expression to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const handlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  // Split text by URLs and create clickable links
  const parts = children.split(urlRegex);
  const matches = children.match(urlRegex);

  if (!matches) {
    // No URLs found, return plain text
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Check if this part is a URL
        const isUrl = matches.includes(part);
        
        if (isUrl) {
          return (
            <Text
              key={index}
              style={styles.link}
              onPress={() => handlePress(part)}
            >
              {part}
            </Text>
          );
        }
        
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const styles = {
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
    fontWeight: '600' as const,
  },
};
