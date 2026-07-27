import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DEFAULT_SETTINGS, LIVE_CONFIRM_PHRASE, WITHDRAWAL_CONFIRM_PHRASE, loadSettings, saveSettings, validateSettings } from './src/config';
import { startBackgroundAgent, stopBackgroundAgent, isBackgroundAgentRunning } from './src/backgroundTask';
import { requestWithdrawal, readWithdrawalHistory } from './src/withdrawal';
import { getExchangeInfo } from './src/binanceClient';
import { getUsdEurRate } from './src/fxRate';
import { readLog } from './src/logStore';
import { Portfolio } from './src/portfolio';
import { IS_DEMO } from './src/buildFlavor';

function isToday(isoString: string) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const WITHDRAW_RANGES = [
  { label: 'Letzte 5 Tage', days: 5 },
  { label: 'Letzte 30 Tage', days: 30 },
  { label: 'Letzte 3 Monate', days: 90 },
];

const FIELD_ROWS: Array<{ key: keyof typeof DEFAULT_SETTINGS; label: string; keyboard?: 'numeric' }> = [
  { key: 'symbols', label: 'Symbole (kommagetrennt für gleichzeitigen Handel, z.B. BTCEUR,ETHEUR — gleiche Quote-Währung, EUR-Paare empfohlen)' },
  { key: 'interval', label: 'Intervall (z.B. 1m, 5m, 1h)' },
  { key: 'fastMaPeriod', label: 'Fast-MA-Periode', keyboard: 'numeric' },
  { key: 'slowMaPeriod', label: 'Slow-MA-Periode', keyboard: 'numeric' },
  { key: 'riskPerTradePct', label: 'Risiko pro Trade (z.B. 0.03 = 3%)', keyboard: 'numeric' },
  { key: 'stopLossPct', label: 'Stop-Loss (z.B. 0.006 = 0,6%)', keyboard: 'numeric' },
  { key: 'takeProfitPct', label: 'Take-Profit (z.B. 0.012 = 1,2%)', keyboard: 'numeric' },
  { key: 'maxDailyLossPct', label: 'Max. Tagesverlust (z.B. 0.09 = 9%)', keyboard: 'numeric' },
  { key: 'maxOpenPositions', label: 'Max. offene Positionen', keyboard: 'numeric' },
  { key: 'paperStartingBalance', label: 'Startkapital Paper-Modus (€)', keyboard: 'numeric' },
  { key: 'minLiveBalance', label: 'Mindestguthaben für Live-Modus (€)', keyboard: 'numeric' },
  { key: 'maxTradableCapital', label: 'Maximales Handelskapital (€, Risiko-Obergrenze, keine Einzahlungsgrenze)', keyboard: 'numeric' },
];

const WITHDRAWAL_FIELD_ROWS: Array<{ key: keyof typeof DEFAULT_SETTINGS; label: string }> = [
  { key: 'withdrawalAsset', label: 'Krypto-Asset für Auszahlung (z.B. USDT — NICHT "EUR")' },
  { key: 'withdrawalAddress', label: 'Zieladresse (gehört dir selbst)' },
  { key: 'notifyEmail', label: 'E-Mail für Auszahlungsbeleg' },
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
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawConfirm, setWithdrawConfirm] = useState('');
  const [fx, setFx] = useState<any>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [withdrawRangeDays, setWithdrawRangeDays] = useState(5);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsSearch, setMarketsSearch] = useState('');
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      // Belt-and-suspenders: even if AsyncStorage somehow held a non-paper
      // value (e.g. restored from a non-demo backup), the demo build never
      // trades anything but paper mode and never touches real credentials.
      if (IS_DEMO) {
        loaded.tradingMode = 'paper';
        loaded.binanceApiKey = '';
        loaded.binanceApiSecret = '';
        loaded.liveConfirm = '';
      }
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
      setWithdrawHistory(await readWithdrawalHistory());
    }, 3000);
    return () => clearInterval(interval);
  }, [settings.paperStartingBalance]);

  useEffect(() => {
    const fetchFx = () => getUsdEurRate().then(setFx);
    fetchFx();
    const interval = setInterval(fetchFx, 5 * 60000);
    return () => clearInterval(interval);
  }, []);

  const onLoadMarkets = useCallback(async () => {
    setMarketsLoading(true);
    try {
      setMarkets(await getExchangeInfo(settings));
    } catch (err: any) {
      Alert.alert('Märkte konnten nicht geladen werden', err.message);
    } finally {
      setMarketsLoading(false);
    }
  }, [settings]);

  const filteredMarkets = markets
    .filter((m) => !marketsSearch || m.symbol.includes(marketsSearch.toUpperCase()))
    .slice(0, 100);

  const todaysTrades = (summary?.closedTrades || []).filter((t: any) => isToday(t.exitTime));
  const todaysPnl = todaysTrades.reduce((sum: number, t: any) => sum + t.pnl, 0);

  const withdrawCutoff = Date.now() - withdrawRangeDays * 24 * 60 * 60 * 1000;
  const filteredWithdrawals = withdrawHistory
    .filter((w) => new Date(w.time).getTime() >= withdrawCutoff)
    .slice()
    .reverse();

  const update = useCallback((key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const onSave = useCallback(async () => {
    await saveSettings(settings);
    Alert.alert('Gespeichert', 'Einstellungen wurden gespeichert.');
  }, [settings]);

  const onStart = useCallback(async () => {
    const effectiveSettings = IS_DEMO ? { ...settings, tradingMode: 'paper' } : settings;
    const errors = validateSettings(effectiveSettings);
    if (errors.length > 0) {
      Alert.alert('Ungültige Einstellungen', errors.join('\n'));
      return;
    }
    if (IS_DEMO) {
      await saveSettings(effectiveSettings);
      await startBackgroundAgent(effectiveSettings);
      setRunning(true);
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

  const onWithdraw = useCallback(() => {
    if (IS_DEMO) {
      Alert.alert('Nicht möglich', 'Auszahlungen sind in der Demo-Version nicht verfügbar.');
      return;
    }
    if (settings.tradingMode !== 'live') {
      Alert.alert('Nicht möglich', 'Auszahlungen sind nur im Live-Modus möglich.');
      return;
    }
    Alert.alert(
      'Auszahlung bestätigen',
      `Wirklich ${withdrawAmount} ${settings.withdrawalAsset} an ${settings.withdrawalAddress || '(keine Adresse gesetzt)'} auszahlen? Das ist unwiderruflich.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, auszahlen',
          style: 'destructive',
          onPress: async () => {
            try {
              const record = await requestWithdrawal(settings, { amount: withdrawAmount, confirmPhrase: withdrawConfirm });
              if (settings.notifyEmail) {
                const body = encodeURIComponent(
                  `Auszahlung ausgeführt\n\nZeitpunkt: ${record.time}\nAsset: ${record.asset}\nBetrag: ${record.amount}\nZieladresse: ${record.address}\nBinance Withdraw ID: ${record.binanceWithdrawId}\n\nDies ist eine automatische Aufzeichnung für deine eigenen Unterlagen. Diese App garantiert keinen Gewinn.`
                );
                await Linking.openURL(
                  `mailto:${settings.notifyEmail}?subject=${encodeURIComponent(
                    `FreshTrades – Auszahlung ${record.amount} ${record.asset}`
                  )}&body=${body}`
                );
              }
              Alert.alert('Auszahlung ausgelöst', 'Die Auszahlung wurde an Binance übermittelt.');
              setWithdrawAmount('');
              setWithdrawConfirm('');
            } catch (err: any) {
              Alert.alert('Auszahlung fehlgeschlagen', err.message);
            }
          },
        },
      ]
    );
  }, [settings, withdrawAmount, withdrawConfirm]);

  const modeColor =
    settings.tradingMode === 'live' ? '#8a1f1f' : settings.tradingMode === 'testnet' ? '#7a4a00' : '#0a5c33';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#a7d8f0" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>FreshTrades</Text>
        {IS_DEMO && (
          <View style={[styles.badge, styles.demoBadge]}>
            <Text style={styles.badgeTextLight}>DEMO-VERSION</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: modeColor }]}>
          <Text style={styles.badgeTextLight}>
            {running ? `LÄUFT · ${settings.tradingMode.toUpperCase()}` : 'GESTOPPT'}
          </Text>
        </View>
        <Text style={styles.statusHint}>
          {running ? 'Läuft normal. Details unten in den Karten.' : 'Bereit. Tippe auf „Starten", um zu beginnen.'}
        </Text>

        {IS_DEMO && (
          <Text style={styles.demoNotice}>
            Dies ist die Demo-Version: nur simulierter Paper-Modus, keine Binance-Zugangsdaten nötig, keine
            Auszahlung möglich. Es wird zu keinem Zeitpunkt echtes Geld bewegt.
          </Text>
        )}

        <Text style={styles.disclaimer}>
          Keine Gewinngarantie. Live-Modus handelt mit echtem Geld auf eigenes Risiko. Diese App sammelt keine
          Einzahlungen und initiiert keine Bank-/Echtzeitüberweisungen selbst — Ein- und Auszahlungen in Euro laufen
          direkt über Binance. Läuft als Vordergrunddienst; siehe README für Einschränkungen (Akku-Optimierung,
          Prozess-Kills durch Android).
        </Text>

        {summary && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Kontostand (EUR)</Text>
            <Text style={styles.cardValue}>{summary.balance !== undefined ? `${summary.balance.toFixed(2)} €` : '–'}</Text>
            <Text style={styles.cardLabel}>Realisierter Gewinn/Verlust (EUR)</Text>
            <Text style={styles.cardValue}>{summary.realizedPnl !== undefined ? `${summary.realizedPnl.toFixed(2)} €` : '–'}</Text>
            <Text style={styles.cardLabel}>Offene Positionen: {summary.openPositions?.length ?? 0}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>USD → EUR (live)</Text>
          <Text style={styles.cardValue}>{fx?.rate ? `1 USD = ${fx.rate.toFixed(4)} EUR` : fx?.error ? 'n/a' : '…'}</Text>
          <Text style={styles.hint}>{fx?.error ? `Fehler: ${fx.error}` : fx?.asOf ? `Stand: ${fx.asOf} (ECB-Referenzkurs)` : ''}</Text>
        </View>

        <Text style={styles.sectionTitle}>Trades heute</Text>
        {todaysTrades.length === 0 ? (
          <Text style={styles.hint}>Heute noch keine abgeschlossenen Trades.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {todaysTrades.length} Trades, {todaysTrades.filter((t: any) => t.pnl > 0).length} Gewinner
            </Text>
            <Text style={styles.cardValue}>{todaysPnl.toFixed(2)} €</Text>
          </View>
        )}

        {!IS_DEMO && (
          <>
            <Text style={styles.sectionTitle}>Binance-Zugang</Text>
            <TextInput
              style={styles.input}
              placeholder="API Key"
              placeholderTextColor="#333333"
              secureTextEntry
              value={settings.binanceApiKey}
              onChangeText={(v) => update('binanceApiKey', v)}
              editable={!running}
            />
            <TextInput
              style={styles.input}
              placeholder="API Secret"
              placeholderTextColor="#333333"
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
                placeholderTextColor="#333333"
                value={settings.liveConfirm}
                onChangeText={(v) => update('liveConfirm', v)}
                editable={!running}
              />
            )}
          </>
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
            <Text style={styles.buttonTextLight}>Speichern</Text>
          </TouchableOpacity>
          {!running ? (
            <TouchableOpacity style={styles.startButton} onPress={onStart}>
              <Text style={styles.buttonTextLight}>Starten</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={onStop}>
              <Text style={styles.buttonTextLight}>Stoppen</Text>
            </TouchableOpacity>
          )}
        </View>

        {!IS_DEMO && (
          <>
            <Text style={styles.sectionTitle}>Krypto-Auszahlung (KEIN Euro, manuell)</Text>
            <Text style={styles.hint}>
              Wichtig: zahlt eine Kryptowährung aus (z.B. USDT, BTC), nicht Euro — Euro hat keine
              Blockchain-Adresse und kann hier nicht eingetragen werden. Echte Euro-Ein-/Auszahlungen
              (SEPA) laufen ausschließlich direkt über Binance selbst. Nur im Live-Modus verfügbar.
            </Text>
            {WITHDRAWAL_FIELD_ROWS.map((row) => (
              <View key={row.key as string} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{row.label}</Text>
                <TextInput style={styles.input} value={String(settings[row.key] ?? '')} onChangeText={(v) => update(row.key as string, v)} />
              </View>
            ))}
            <TextInput
              style={styles.input}
              placeholder="Betrag (in der Kryptowährung oben)"
              placeholderTextColor="#333333"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <TextInput
              style={styles.input}
              placeholder={`Bestätigung: ${WITHDRAWAL_CONFIRM_PHRASE}`}
              placeholderTextColor="#333333"
              value={withdrawConfirm}
              onChangeText={setWithdrawConfirm}
            />
            <TouchableOpacity style={styles.withdrawButton} onPress={onWithdraw}>
              <Text style={styles.buttonTextLight}>Krypto auszahlen</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Krypto-Auszahlungen (Verlauf)</Text>
            <View style={styles.modeRow}>
          {WITHDRAW_RANGES.map((r) => (
            <TouchableOpacity
              key={r.days}
              style={[styles.rangeButton, withdrawRangeDays === r.days && styles.modeButtonActive]}
              onPress={() => setWithdrawRangeDays(r.days)}
            >
              <Text style={styles.modeButtonText}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {filteredWithdrawals.length === 0 ? (
          <Text style={styles.hint}>Keine Auszahlungen in diesem Zeitraum.</Text>
        ) : (
          filteredWithdrawals.map((w, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardLabel}>{w.time}</Text>
              <Text style={styles.cardValue}>{w.amount} {w.asset}</Text>
              <Text style={styles.hint}>an {w.address}</Text>
            </View>
          ))
        )}
          </>
        )}

        <Text style={styles.sectionTitle}>Alle Binance-Märkte (nur Krypto, zur Ansicht)</Text>
        <Text style={styles.hint}>
          Reine Binance-Marktdaten zum Nachschlagen. Symbol zum Handeln wird oben in den Einstellungen gesetzt.
        </Text>
        <View style={styles.actions}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Suche, z.B. BTC oder EUR..."
            placeholderTextColor="#333333"
            value={marketsSearch}
            onChangeText={setMarketsSearch}
          />
          <TouchableOpacity style={styles.saveButton} onPress={onLoadMarkets} disabled={marketsLoading}>
            <Text style={styles.buttonTextLight}>{marketsLoading ? 'Lädt…' : 'Märkte laden'}</Text>
          </TouchableOpacity>
        </View>
        {filteredMarkets.length > 0 && (
          <View style={styles.logBox}>
            {filteredMarkets.map((m) => (
              <Text key={m.symbol} style={styles.logLine}>
                {m.symbol} ({m.baseAsset}/{m.quoteAsset})
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={() => setShowTechDetails((v) => !v)}>
          <Text style={styles.sectionTitle}>
            {showTechDetails ? '▾' : '▸'} Technische Details (nur bei Problemen nötig)
          </Text>
        </TouchableOpacity>
        {showTechDetails && (
          <View style={styles.logBox}>
            {log.slice(-40).map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#547ea6' },
  scroll: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#000000', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 12 },
  badgeTextLight: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  demoBadge: { backgroundColor: '#ffb020', marginRight: 8 },
  demoNotice: {
    color: '#000000',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#2563eb',
    fontWeight: '600',
    fontSize: 12,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusHint: { color: '#000000', fontSize: 12, marginBottom: 12 },
  disclaimer: {
    color: '#000000',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#001f5c',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  cardLabel: { color: '#000000', fontSize: 11, marginTop: 8, textTransform: 'uppercase' },
  cardValue: { color: '#000000', fontSize: 20, fontWeight: '700' },
  sectionTitle: { color: '#000000', fontSize: 13, marginTop: 16, marginBottom: 8, fontWeight: '700' },
  hint: { color: '#000000', fontSize: 11, marginBottom: 8 },
  fieldRow: { marginBottom: 8 },
  fieldLabel: { color: '#000000', fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#001f5c',
    borderWidth: 1,
    borderRadius: 6,
    color: '#000000',
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
    borderColor: '#001f5c',
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
  },
  modeButtonActive: { backgroundColor: '#a7d8f0', borderColor: '#001f5c' },
  modeButtonText: { color: '#000000', fontWeight: '600', fontSize: 13 },
  rangeButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#001f5c',
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveButton: { flex: 1, backgroundColor: '#39507a', padding: 12, borderRadius: 8, alignItems: 'center' },
  startButton: { flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  stopButton: { flex: 1, backgroundColor: '#b3241c', padding: 12, borderRadius: 8, alignItems: 'center' },
  withdrawButton: { backgroundColor: '#b3241c', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonTextLight: { color: '#ffffff', fontWeight: '700' },
  logBox: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: '#001f5c',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 120,
  },
  logLine: { color: '#000000', fontSize: 10, fontFamily: 'monospace' },
});
