import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { THEME } from '../constants/theme';

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    borderColor: THEME.colors.secondary,
    backgroundColor: THEME.colors.secondary,
  },
  checkmark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  checkboxLabel: {
    color: THEME.colors.textMedium,
    fontSize: 14,
    fontWeight: '500',
  },
});

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export const Checkbox = ({ checked, onChange, label }: CheckboxProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onChange(!checked)}
      style={styles.checkboxContainer}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <View style={styles.checkmark} />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};
