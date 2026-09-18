import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, spacing } from '../theme/theme';

type Props = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (v: number) => void;
  formatValue?: (v: number) => string;
};

export function LabeledSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  formatValue,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue ? formatValue(value) : value.toFixed(2)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.gold}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.gold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textDim, fontSize: 12 },
  value: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
