import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  secureTextEntry,
  style,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = () => {
    const baseStyle = { ...styles.inputContainer };
    if (isFocused) {
      baseStyle.borderColor = theme.colors.primary;
      baseStyle.borderWidth = 2;
    }
    if (error) {
      baseStyle.borderColor = theme.colors.error;
    }
    return baseStyle;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={getContainerStyle()}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input, 
            style,
            !icon && styles.inputWithoutIcon
          ]}
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
    maxWidth: screenWidth - theme.spacing.lg * 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    maxWidth: screenWidth - theme.spacing.lg * 2,
    width: '100%',
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    minWidth: 0,
    maxWidth: screenWidth - theme.spacing.lg * 2 - (theme.spacing.md * 2) - 80,
  },
  inputWithoutIcon: {
    paddingLeft: theme.spacing.md,
  },
  icon: {
    marginRight: theme.spacing.lg,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    height: 32,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
