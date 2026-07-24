import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DEFAULT_SETTINGS, LIVE_CONFIRM_PHRASE, loadSettings, saveSettings, validateSettings } from './src/config';
import { startBackgroundAgent, stopBackgroundAgent, isBackgroundAgentRunning } from './src/backgroundTask';
import { readLog } from './src/logStore';
import { Portfolio } from './src/portfolio';

const FIELD_ROWS: Array<{ key: keyof typeof DEFAULT_SETTINGS; label: string; keyboard?: 'numeric' }> = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'interval', label: 'Intervall (z.B. 1m, 5m, 1h)' },
  { key: 'fastMaPeriod', label: 'Fast-MA-Periode', keyboard: 'numeric' },
  { key: 'slowMaPeriod', label: 'Slow-MA-Periode', keyboard: 'numeric' },
  { key: 'riskPerTradePct', label: 'Risiko pro Trade (z.B. 0.01 = 1%)', keyboard: 'numeric' },
  { key: 'stopLossPct', label: 'Stop-Loss (z.B. 0.006 = 0,6%)', keyboard: 'numeric' },
  { key: 'takeProfitPct', label: 'Take-Profit (z.B. 0.012 = 1,2%)', keyboard: 'numeric' },
  { key: 'maxDailyLossPct', label: 'Max. Tagesverlust (z.B. 0.03 = 3%)', keyboard: 'numeric' },
  { key: 'maxOpenPositions', label: 'Max. offene Positionen', keyboard: 'numeric' },
  { key: 'paperStartingBalance', label: 'Startkapital (Paper-Modus)', keyboard: 'numeric' },
];

const MODES: Array<{ value: 'paper' | 'testnet' | 'live'; label: string }> = [
  { value: 'paper', label: 'Paper' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'live', label: 'Live' },
];

export default function App() {
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
      setRunning(isBackgroundAgentRunning());
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      setRunning(isBackgroundAgentRunning());
      setLog(await readLog());
      const portfolio = await new Portfolio(Number(settings.paperStartingBalance)).load();
      setSummary(portfolio.summary());
    }, 3000);
    return () => clearInterval(interval);
  }, [settings.paperStartingBalance]);

  const update = useCallback((key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const onSave = useCallback(async () => {
    await saveSettings(settings);
    Alert.alert('Gespeichert', 'Einstellungen wurden gespeichert.');
  }, [settings]);

  const onStart = useCallback(async () => {
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      Alert.alert('Ungültige Einstellungen', errors.join('\n'));
      return;
    }
    if (settings.tradingMode === 'live') {
      Alert.alert(
        'Live-Modus bestätigen',
        'Es werden echte Orders mit echtem Geld ausgeführt. Verluste sind jederzeit möglich. Fortfahren?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Ja, verstanden',
            style: 'destructive',
            onPress: async () => {
              await saveSettings(settings);
              await startBackgroundAgent(settings);
              setRunning(true);
            },
          },
        ]
      );
      return;
    }
    await saveSettings(settings);
    await startBackgroundAgent(settings);
    setRunning(true);
  }, [settings]);

  const onStop = useCallback(async () => {
    await stopBackgroundAgent();
    setRunning(false);
  }, []);

  const modeColor =
    settings.tradingMode === 'live' ? '#ef5a5a' : settings.tradingMode === 'testnet' ? '#f5a623' : '#35c98c';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1420" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Trading Agent</Text>
        <View style={[styles.badge, { backgroundColor: modeColor }]}>
          <Text style={styles.badgeText}>
            {running ? `LÄUFT · ${settings.tradingMode.toUpperCase()}` : 'GESTOPPT'}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Keine Gewinngarantie. Live-Modus handelt mit echtem Geld auf eigenes Risiko. Diese Version läuft als
          Vordergrunddienst auf dem Gerät — siehe README für Einschränkungen (Akku-Optimierung, Prozess-Kills durch
          Android).
        </Text>

        {summary && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Kontostand</Text>
            <Text style={styles.cardValue}>{summary.balance?.toFixed?.(2) ?? '–'}</Text>
            <Text style={styles.cardLabel}>Realisierter Gewinn/Verlust</Text>
            <Text style={[styles.cardValue, { color: summary.realizedPnl >= 0 ? '#35c98c' : '#ef5a5a' }]}>
              {summary.realizedPnl?.toFixed?.(2) ?? '–'}
            </Text>
            <Text style={styles.cardLabel}>Offene Positionen: {summary.openPositions?.length ?? 0}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Binance-Zugang</Text>
        <TextInput
          style={styles.input}
          placeholder="API Key"
          placeholderTextColor="#8891a7"
          secureTextEntry
          value={settings.binanceApiKey}
          onChangeText={(v) => update('binanceApiKey', v)}
          editable={!running}
        />
        <TextInput
          style={styles.input}
          placeholder="API Secret"
          placeholderTextColor="#8891a7"
          secureTextEntry
          value={settings.binanceApiSecret}
          onChangeText={(v) => update('binanceApiSecret', v)}
          editable={!running}
        />

        <Text style={styles.sectionTitle}>Modus</Text>
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.modeButton, settings.tradingMode === m.value && styles.modeButtonActive]}
              onPress={() => !running && update('tradingMode', m.value)}
              disabled={running}
            >
              <Text style={styles.modeButtonText}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {settings.tradingMode === 'live' && (
          <TextInput
            style={styles.input}
            placeholder={`Bestätigung: ${LIVE_CONFIRM_PHRASE}`}
            placeholderTextColor="#8891a7"
            value={settings.liveConfirm}
            onChangeText={(v) => update('liveConfirm', v)}
            editable={!running}
          />
        )}

        <Text style={styles.sectionTitle}>Markt, Strategie &amp; Risiko</Text>
        {FIELD_ROWS.map((row) => (
          <View key={row.key as string} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{row.label}</Text>
            <TextInput
              style={styles.input}
              keyboardType={row.keyboard}
              value={String(settings[row.key] ?? '')}
              onChangeText={(v) => update(row.key as string, v)}
              editable={!running}
            />
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={running}>
            <Text style={styles.buttonText}>Speichern</Text>
          </TouchableOpacity>
          {!running ? (
            <TouchableOpacity style={styles.startButton} onPress={onStart}>
              <Text style={styles.buttonText}>Starten</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={onStop}>
              <Text style={styles.buttonText}>Stoppen</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Log</Text>
        <View style={styles.logBox}>
          {log.slice(-40).map((line, i) => (
            <Text key={i} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1420' },
  scroll: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#e6e9f0', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 12 },
  badgeText: { color: '#0f1420', fontWeight: '700', fontSize: 12 },
  disclaimer: {
    color: '#ffd48a',
    backgroundColor: '#3a2a10',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#171d2b',
    borderColor: '#2a3245',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  cardLabel: { color: '#8891a7', fontSize: 11, marginTop: 8, textTransform: 'uppercase' },
  cardValue: { color: '#e6e9f0', fontSize: 20, fontWeight: '700' },
  sectionTitle: { color: '#8891a7', fontSize: 13, marginTop: 16, marginBottom: 8, fontWeight: '600' },
  fieldRow: { marginBottom: 8 },
  fieldLabel: { color: '#8891a7', fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: '#171d2b',
    borderColor: '#2a3245',
    borderWidth: 1,
    borderRadius: 6,
    color: '#e6e9f0',
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a3245',
    backgroundColor: '#171d2b',
    alignItems: 'center',
  },
  modeButtonActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  modeButtonText: { color: '#e6e9f0', fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveButton: { flex: 1, backgroundColor: '#232b3d', padding: 12, borderRadius: 8, alignItems: 'center' },
  startButton: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  stopButton: { flex: 1, backgroundColor: '#ef5a5a', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  logBox: {
    backgroundColor: '#0a0e17',
    borderColor: '#2a3245',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 120,
  },
  logLine: { color: '#8891a7', fontSize: 10, fontFamily: 'monospace' },
});
