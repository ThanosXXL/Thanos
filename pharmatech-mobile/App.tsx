import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Pharma-Tech ist ein eigenständiger, vollständig clientseitiger Prototyp
// (Demo-Daten, keine echten API-Aufrufe) — die Mobile-App bettet die exakt
// gleiche Oberfläche wie die Desktop-App über eine WebView ein, statt die
// neun Ansichten nativ nachzubauen.
const prototypeHtml = require('./assets/www/index.html');

export default function App() {
  const [source, setSource] = useState<{ uri: string } | null>(null);

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(prototypeHtml);
      await asset.downloadAsync();
      setSource({ uri: asset.localUri ?? asset.uri });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {source ? (
        <WebView
          source={source}
          originWhitelist={['file://*']}
          onShouldStartLoadWithRequest={(request) => {
            // Die Oberfläche ist eine reine Offline-Demo ohne echte Links —
            // nur das Laden der mitgelieferten Datei selbst ist erlaubt,
            // jede Navigation zu einer anderen Adresse wird blockiert.
            return request.url === source.uri || request.url.startsWith('file://');
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0EA37D" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAFBF3',
  },
  webview: {
    flex: 1,
    backgroundColor: '#EAFBF3',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
