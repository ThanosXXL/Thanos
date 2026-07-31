// ===== Geteilter Grundzustand & Hilfsfunktionen (Dozenten-Daten, DOM-Referenzen) =====
// Wird von allen anderen renderer/js/*.js-Dateien verwendet. Muss als Erstes geladen werden.

const MAX_DOZENTEN = 4;

let state = { dozenten: [] };
let activeDozentId = null;

const dozentTabs = document.getElementById('dozentTabs');
const content = document.getElementById('content');
const emptyState = document.getElementById('emptyState');

const addDozentModal = document.getElementById('addDozentModal');
const newDozentNameInput = document.getElementById('newDozentName');
const deleteDozentModal = document.getElementById('deleteDozentModal');
const deleteDozentText = document.getElementById('deleteDozentText');

let pendingDeleteId = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function persist() {
  window.dashboardAPI.saveData(state);
}

function findDozent(id) {
  return state.dozenten.find((d) => d.id === id);
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
