import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../components/Button';
import { useProject } from '../state/ProjectStore';
import { MediaItem, uid } from '../state/types';
import { probeMedia } from '../export/probeMedia';
import { colors, spacing } from '../theme/theme';

export function ImportScreen() {
  const { project, addMedia, addClipFromMedia } = useProject();
  const [importing, setImporting] = useState(false);

  const pickVideos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Zugriff verweigert', 'VideoWelt braucht Zugriff auf deine Mediathek.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) return;

    setImporting(true);
    try {
      const items: MediaItem[] = [];
      for (const asset of result.assets) {
        const probed = await probeMedia(asset.uri, {
          duration: asset.duration ? asset.duration / 1000 : 5,
          width: asset.width || 1920,
          height: asset.height || 1080,
        });
        items.push({
          id: uid('m'),
          uri: asset.uri,
          name: asset.fileName || 'Video',
          duration: probed.duration,
          width: probed.width,
          height: probed.height,
          hasAudio: probed.hasAudio,
        });
      }
      addMedia(items);
    } finally {
      setImporting(false);
    }
  }, [addMedia]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mediathek</Text>
        <Button label={importing ? 'Importiere…' : '+ Video importieren'} variant="primary" onPress={pickVideos} disabled={importing} />
      </View>
      {project.mediaLibrary.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Noch keine Videos importiert.</Text>
        </View>
      ) : (
        <FlatList
          data={project.mediaLibrary}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
          columnWrapperStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.mediaCard}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              <Text numberOfLines={1} style={styles.mediaName}>
                {item.name}
              </Text>
              <Text style={styles.mediaMeta}>
                {item.duration.toFixed(1)}s · {item.width}×{item.height}
              </Text>
              <Button label="Zur Timeline" onPress={() => addClipFromMedia(item.id)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim },
  mediaCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  thumbnail: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: '#000' },
  mediaName: { color: colors.text, fontWeight: '600' },
  mediaMeta: { color: colors.textDim, fontSize: 12 },
});
