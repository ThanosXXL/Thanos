import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Button } from '../components/Button';
import { useProject } from '../state/ProjectStore';
import { exportProject, isNativeExportAvailable } from '../export/ffmpegExport';
import { RESOLUTION_GROUPS, ResolutionPreset } from '../export/presets';
import { colors, spacing } from '../theme/theme';

export function ExportScreen() {
  const { project } = useProject();
  const [preset, setPreset] = useState<ResolutionPreset>(RESOLUTION_GROUPS[0].presets[0]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);
  const nativeAvailable = isNativeExportAvailable();

  const runExport = async () => {
    if (!project.clips.length) {
      Alert.alert('Timeline leer', 'Füge zuerst mindestens einen Clip zur Timeline hinzu.');
      return;
    }
    setExporting(true);
    setProgress(0);
    setLastExportPath(null);
    try {
      const outputPath = `${FileSystem.cacheDirectory}${project.projectName.replace(/\s+/g, '_')}_${Date.now()}.mp4`;
      await exportProject(project, outputPath, { width: preset.width, height: preset.height }, setProgress);
      setLastExportPath(outputPath);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.granted) {
        await MediaLibrary.saveToLibraryAsync(outputPath);
      }
      Alert.alert('Export fertig', 'Das Video wurde exportiert und in deiner Mediathek gespeichert.');
    } catch (err: any) {
      Alert.alert('Export fehlgeschlagen', err?.message || String(err));
    } finally {
      setExporting(false);
    }
  };

  const shareExport = async () => {
    if (!lastExportPath) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(lastExportPath);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text style={styles.title}>Export</Text>

      {!nativeAvailable && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Nativer Export ist in Expo Go nicht verfügbar (ffmpeg ist ein natives Modul). Baue einen
            Dev-Client oder Standalone-Build (siehe README) – Import, Timeline und Text-Overlays
            funktionieren aber bereits hier.
          </Text>
        </View>
      )}

      {RESOLUTION_GROUPS.map((group) => (
        <View key={group.label}>
          <Text style={styles.sectionLabel}>{group.label}</Text>
          <View style={styles.presetRow}>
            {group.presets.map((p) => (
              <Button
                key={p.key}
                label={p.label}
                variant={preset.key === p.key ? 'primary' : 'secondary'}
                onPress={() => setPreset(p)}
              />
            ))}
          </View>
        </View>
      ))}

      <Button
        label={exporting ? `Exportiere… ${(progress * 100).toFixed(0)}%` : 'Video exportieren'}
        variant="primary"
        onPress={runExport}
        disabled={exporting || !nativeAvailable}
      />

      {lastExportPath && (
        <Button label="Teilen" onPress={shareExport} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  warningBox: {
    backgroundColor: '#2a2410',
    borderColor: colors.goldDim,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
  },
  warningText: { color: colors.gold, fontSize: 13, lineHeight: 18 },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: spacing.xs },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
});
