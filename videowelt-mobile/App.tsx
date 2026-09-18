import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ProjectProvider, loadAutosave, useProject } from './src/state/ProjectStore';
import { ImportScreen } from './src/screens/ImportScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { TextOverlayScreen } from './src/screens/TextOverlayScreen';
import { ExportScreen } from './src/screens/ExportScreen';
import { ProjectScreen } from './src/screens/ProjectScreen';
import { colors, spacing } from './src/theme/theme';

type TabKey = 'import' | 'timeline' | 'text' | 'export' | 'project';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'import', label: 'Medien' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'text', label: 'Text' },
  { key: 'export', label: 'Export' },
  { key: 'project', label: 'Projekt' },
];

function AppShell() {
  const [tab, setTab] = useState<TabKey>('import');
  const { loadProject } = useProject();

  useEffect(() => {
    loadAutosave().then((data) => {
      if (data) loadProject(data);
    });
    // Restoring the last autosave once on launch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.brandBar}>
        <Text style={styles.brandText}>
          Video<Text style={styles.brandAccent}>Welt</Text>
        </Text>
      </View>

      <View style={styles.content}>
        {tab === 'import' && <ImportScreen />}
        {tab === 'timeline' && <TimelineScreen />}
        {tab === 'text' && <TextOverlayScreen />}
        {tab === 'export' && <ExportScreen />}
        {tab === 'project' && <ProjectScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            {tab === t.key && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  brandBar: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandText: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  brandAccent: { color: colors.gold },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabLabel: { color: colors.textDim, fontSize: 12 },
  tabLabelActive: { color: colors.gold, fontWeight: '700' },
  tabIndicator: { marginTop: 4, width: 18, height: 2, backgroundColor: colors.gold, borderRadius: 1 },
});
