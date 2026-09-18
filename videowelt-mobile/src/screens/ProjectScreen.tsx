import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button } from '../components/Button';
import { useProject } from '../state/ProjectStore';
import { colors, spacing } from '../theme/theme';

export function ProjectScreen() {
  const { project, setProjectName, resetProject, saveToDisk, loadFromDisk } = useProject();
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      const fileUri = `${FileSystem.cacheDirectory}${project.projectName.replace(/\s+/g, '_')}.vwmproj`;
      await saveToDisk(fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Gespeichert', `Projekt gespeichert unter:\n${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Fehler beim Speichern', err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    setBusy(true);
    try {
      await loadFromDisk(result.assets[0].uri);
      Alert.alert('Projekt geladen', 'Das Projekt wurde erfolgreich geladen.');
    } catch (err: any) {
      Alert.alert('Fehler beim Laden', 'Diese Datei konnte nicht als VideoWelt-Projekt gelesen werden.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Neues Projekt', 'Aktuelles Projekt verwerfen und neu beginnen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Neu beginnen', style: 'destructive', onPress: resetProject },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text style={styles.title}>Projekt</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Projektname</Text>
        <TextInput
          value={project.projectName}
          onChangeText={setProjectName}
          style={styles.input}
          placeholderTextColor={colors.textDim}
        />
        <Text style={styles.meta}>
          {project.mediaLibrary.length} Medien · {project.clips.length} Clips ·{' '}
          {project.textOverlays.length} Text-Overlays
        </Text>
      </View>

      <Button label={busy ? 'Bitte warten…' : 'Projekt speichern (.vwmproj)'} variant="primary" onPress={handleSave} disabled={busy} />
      <Button label="Projekt öffnen" onPress={handleLoad} disabled={busy} />
      <Button label="Neues Projekt" variant="danger" onPress={handleReset} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  sectionLabel: { color: colors.gold, fontWeight: '600' },
  input: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  meta: { color: colors.textDim, fontSize: 12 },
});
