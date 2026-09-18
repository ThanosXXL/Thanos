import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { LabeledSlider } from '../components/LabeledSlider';
import { useProject } from '../state/ProjectStore';
import { colors, spacing } from '../theme/theme';

const PRESET_COLORS = ['#f5c451', '#ffffff', '#e05c5c', '#5ce0a0', '#5c9ee0'];

export function TextOverlayScreen() {
  const { project, addTextOverlay, updateTextOverlay, removeTextOverlay } = useProject();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.header}>
        <Text style={styles.title}>Text-Overlays</Text>
        <Button label="+ Text hinzufügen" variant="primary" onPress={addTextOverlay} />
      </View>

      {project.textOverlays.length === 0 && (
        <Text style={styles.emptyText}>Noch keine Text-Einblendungen.</Text>
      )}

      {project.textOverlays.map((overlay) => (
        <View key={overlay.id} style={styles.card}>
          <TextInput
            value={overlay.text}
            onChangeText={(text) => updateTextOverlay(overlay.id, { text })}
            style={styles.input}
            placeholder="Text"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.sectionLabel}>Farbe</Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((color) => (
              <View
                key={color}
                onTouchEnd={() => updateTextOverlay(overlay.id, { color })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  overlay.color === color && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>

          <LabeledSlider
            label="Schriftgröße"
            value={overlay.fontSize}
            minimumValue={12}
            maximumValue={72}
            step={1}
            onValueChange={(v) => updateTextOverlay(overlay.id, { fontSize: Math.round(v) })}
          />
          <LabeledSlider
            label="Position X"
            value={overlay.x}
            minimumValue={0}
            maximumValue={1}
            step={0.02}
            onValueChange={(v) => updateTextOverlay(overlay.id, { x: v })}
          />
          <LabeledSlider
            label="Position Y"
            value={overlay.y}
            minimumValue={0}
            maximumValue={1}
            step={0.02}
            onValueChange={(v) => updateTextOverlay(overlay.id, { y: v })}
          />
          <LabeledSlider
            label="Start (s)"
            value={overlay.startTime}
            minimumValue={0}
            maximumValue={Math.max(1, overlay.endTime)}
            step={0.1}
            onValueChange={(v) => updateTextOverlay(overlay.id, { startTime: v })}
          />
          <LabeledSlider
            label="Ende (s)"
            value={overlay.endTime}
            minimumValue={overlay.startTime + 0.1}
            maximumValue={overlay.startTime + 60}
            step={0.1}
            onValueChange={(v) => updateTextOverlay(overlay.id, { endTime: v })}
          />

          <Button label="Overlay entfernen" variant="danger" onPress={() => removeTextOverlay(overlay.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  emptyText: { color: colors.textDim },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  input: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: spacing.xs },
  colorRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: colors.text },
});
