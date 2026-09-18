import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Button } from '../components/Button';
import { LabeledSlider } from '../components/LabeledSlider';
import { useProject } from '../state/ProjectStore';
import { clipDuration, timelineDuration } from '../state/types';
import { colors, spacing } from '../theme/theme';

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function ClipPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  return <VideoView style={styles.preview} player={player} contentFit="contain" nativeControls />;
}

export function TimelineScreen() {
  const {
    project,
    selectedClipId,
    setSelectedClipId,
    removeClip,
    moveClip,
    updateClip,
    duplicateClip,
  } = useProject();

  const selectedClip = project.clips.find((c) => c.id === selectedClipId) || null;
  const selectedMedia = selectedClip
    ? project.mediaLibrary.find((m) => m.id === selectedClip.mediaId)
    : null;

  const totalDuration = useMemo(() => timelineDuration(project.clips), [project.clips]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>{totalDuration.toFixed(1)}s gesamt · {project.clips.length} Clips</Text>
      </View>

      {project.clips.length === 0 ? (
        <Text style={styles.emptyText}>
          Noch keine Clips. Importiere ein Video und tippe „Zur Timeline“.
        </Text>
      ) : (
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          {project.clips.map((clip, index) => {
            const media = project.mediaLibrary.find((m) => m.id === clip.mediaId);
            const isSelected = clip.id === selectedClipId;
            return (
              <View
                key={clip.id}
                style={[styles.clipCard, isSelected && styles.clipCardSelected]}
              >
                <Text
                  style={styles.clipTitle}
                  onPress={() => setSelectedClipId(isSelected ? null : clip.id)}
                >
                  #{index + 1} {media?.name || 'Unbekannt'} · {clipDuration(clip).toFixed(1)}s
                  {clip.speed !== 1 ? ` · ${clip.speed}×` : ''}
                </Text>
                <View style={styles.clipActions}>
                  <Button label="↑" onPress={() => moveClip(clip.id, -1)} />
                  <Button label="↓" onPress={() => moveClip(clip.id, 1)} />
                  <Button label="⧉" onPress={() => duplicateClip(clip.id)} />
                  <Button label="✕" variant="danger" onPress={() => removeClip(clip.id)} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {selectedClip && selectedMedia && (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>Clip bearbeiten</Text>
          <ClipPreview uri={selectedMedia.uri} />

          <LabeledSlider
            label="Start (s)"
            value={selectedClip.inPoint}
            minimumValue={0}
            maximumValue={Math.max(0.1, selectedClip.outPoint - 0.1)}
            step={0.1}
            onValueChange={(v) => updateClip(selectedClip.id, { inPoint: v })}
          />
          <LabeledSlider
            label="Ende (s)"
            value={selectedClip.outPoint}
            minimumValue={selectedClip.inPoint + 0.1}
            maximumValue={selectedMedia.duration || selectedClip.outPoint}
            step={0.1}
            onValueChange={(v) => updateClip(selectedClip.id, { outPoint: v })}
          />

          <Text style={styles.sectionLabel}>Geschwindigkeit</Text>
          <View style={styles.speedRow}>
            {SPEED_PRESETS.map((speed) => (
              <Button
                key={speed}
                label={`${speed}×`}
                variant={selectedClip.speed === speed ? 'primary' : 'secondary'}
                onPress={() => updateClip(selectedClip.id, { speed })}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Effekte</Text>
          <LabeledSlider
            label="Helligkeit"
            value={selectedClip.effects.brightness}
            minimumValue={-0.5}
            maximumValue={0.5}
            step={0.02}
            onValueChange={(v) =>
              updateClip(selectedClip.id, { effects: { ...selectedClip.effects, brightness: v } })
            }
          />
          <LabeledSlider
            label="Kontrast"
            value={selectedClip.effects.contrast}
            minimumValue={-0.5}
            maximumValue={0.5}
            step={0.02}
            onValueChange={(v) =>
              updateClip(selectedClip.id, { effects: { ...selectedClip.effects, contrast: v } })
            }
          />
          <LabeledSlider
            label="Sättigung"
            value={selectedClip.effects.saturation}
            minimumValue={-1}
            maximumValue={1}
            step={0.02}
            onValueChange={(v) =>
              updateClip(selectedClip.id, { effects: { ...selectedClip.effects, saturation: v } })
            }
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Graustufen</Text>
            <Switch
              value={selectedClip.effects.grayscale}
              onValueChange={(v) =>
                updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, grayscale: v, sepia: v ? false : selectedClip.effects.sepia },
                })
              }
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sepia</Text>
            <Switch
              value={selectedClip.effects.sepia}
              onValueChange={(v) =>
                updateClip(selectedClip.id, {
                  effects: { ...selectedClip.effects, sepia: v, grayscale: v ? false : selectedClip.effects.grayscale },
                })
              }
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Stumm</Text>
            <Switch
              value={selectedClip.effects.mute}
              onValueChange={(v) =>
                updateClip(selectedClip.id, { effects: { ...selectedClip.effects, mute: v } })
              }
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 2 },
  emptyText: { color: colors.textDim, padding: spacing.md },
  clipCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clipCardSelected: { borderColor: colors.gold },
  clipTitle: { color: colors.text, marginBottom: spacing.xs },
  clipActions: { flexDirection: 'row', gap: spacing.xs },
  editor: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editorTitle: { color: colors.gold, fontWeight: '700', marginBottom: spacing.sm },
  preview: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', marginBottom: spacing.md, borderRadius: 8 },
  sectionLabel: { color: colors.gold, marginTop: spacing.sm, marginBottom: spacing.xs, fontWeight: '600' },
  speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  switchLabel: { color: colors.text },
});
