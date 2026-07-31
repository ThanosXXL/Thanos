// ===== Geteilter Grundzustand & Hilfsfunktionen (Dozenten-Daten, DOM-Referenzen) =====
// Wird von allen anderen renderer/js/*.js-Dateien verwendet. Muss als Erstes geladen werden.

const MAX_DOZENTEN = 4;

let state = { dozenten: [] };
let activeDozentId = null;

// In Node (Tests) existiert kein DOM – dann bleiben die Referenzen null.
const hasDom = typeof document !== 'undefined';

const dozentTabs = hasDom ? document.getElementById('dozentTabs') : null;
const content = hasDom ? document.getElementById('content') : null;
const emptyState = hasDom ? document.getElementById('emptyState') : null;

const addDozentModal = hasDom ? document.getElementById('addDozentModal') : null;
const newDozentNameInput = hasDom ? document.getElementById('newDozentName') : null;
const deleteDozentModal = hasDom ? document.getElementById('deleteDozentModal') : null;
const deleteDozentText = hasDom ? document.getElementById('deleteDozentText') : null;

let pendingDeleteId = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function persist() {
  window.dashboardAPI.saveData(state);
  // Geräteübergreifende Synchronisation: bei bestehender Server-Verbindung (siehe
  // room-client.js/video-chat.js) den vollständigen Stand an alle anderen Geräte senden.
  if (typeof roomClient !== 'undefined' && roomClient.connected) {
    roomClient.pushData(state);
  }
}

function findDozent(id) {
  return state.dozenten.find((d) => d.id === id);
}

// Stellt sicher, dass ältere/fremde Datensätze alle erwarteten Felder besitzen.
// Wird sowohl beim App-Start als auch beim Empfang synchronisierter Daten verwendet.
function normalizeState(loaded) {
  const next = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [] };
  next.dozenten.forEach((d) => {
    if (!Array.isArray(d.chat)) d.chat = [];
    if (!Array.isArray(d.homework)) d.homework = [];
    if (!Array.isArray(d.exams)) d.exams = [];
    if (d.presentation === undefined) d.presentation = null;
  });
  return next;
}

function nowStr() {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Nur für automatisierte Tests (node:test) per require() nutzbar; im Browser als
// klassisches <script> ist "module" nicht definiert und dieser Block wird übersprungen.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uid,
    nowStr,
    normalizeState,
    findDozent,
    getState: () => state,
    setState: (s) => {
      state = s;
    }
  };
}
