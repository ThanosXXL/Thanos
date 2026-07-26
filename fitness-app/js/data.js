// Statische Trainings- und Übungsdaten für MyWorkOut.
window.MYWORKOUT_DATA = (function () {

  const MUSCLE_GROUPS = [
    { id: 'brust', label: 'Brust' },
    { id: 'ruecken', label: 'Rücken' },
    { id: 'beine', label: 'Beine' },
    { id: 'schultern', label: 'Schultern' },
    { id: 'arme', label: 'Arme' },
    { id: 'bauch', label: 'Bauch' },
  ];

  // Rep-/Satz-Schemata je Trainingsziel, plus grobe Programmdauer in Wochen
  // (angezeigt in der Kopfzeile, sobald ein Training läuft).
  const GOAL_SCHEMES = {
    ausdauer: { label: 'Ausdauertraining', scheme: '3 x 20', pause: '30 Sek. Pause', durationWeeks: 8 },
    aufbau: { label: 'Muskelaufbau', scheme: '4 x 8-10', pause: '90 Sek. Pause', durationWeeks: 12 },
    definition: { label: 'Muskeln definieren', scheme: '3 x 15', pause: '45 Sek. Pause', durationWeeks: 10 },
  };

  // Übungen je Muskelpartie. Die Wochenpläne (siehe WEEKLY_SPLIT) wechseln die
  // Muskelpartien tageweise, damit sich das Training abwechselt.
  const EXERCISES = {
    brust: ['Bankdrücken', 'Schrägbankdrücken', 'Liegestütze', 'Butterfly', 'Dips'],
    ruecken: ['Klimmzüge', 'Rudern vorgebeugt', 'Latzug', 'Kreuzheben', 'Superman'],
    beine: ['Kniebeugen', 'Ausfallschritte', 'Beinpresse', 'Wadenheben', 'Beincurls'],
    schultern: ['Schulterdrücken', 'Seitheben', 'Frontheben', 'Face Pulls', 'Arnold Press'],
    arme: ['Bizepscurls', 'Trizepsdrücken', 'Hammercurls', 'Trizeps-Dips', 'Konzentrationscurls'],
    bauch: ['Crunches', 'Plank', 'Beinheben', 'Russian Twists', 'Mountain Climbers'],
  };

  // Wochenplan: zeigt, wie sich die Muskelpartien über die Woche abwechseln.
  const WEEKLY_SPLIT = [
    { day: 'Montag', groups: ['brust', 'arme'] },
    { day: 'Dienstag', groups: ['ruecken'] },
    { day: 'Mittwoch', groups: ['beine'] },
    { day: 'Donnerstag', groups: ['schultern'] },
    { day: 'Freitag', groups: ['bauch'] },
    { day: 'Samstag', groups: ['brust', 'ruecken'] },
    { day: 'Sonntag', groups: [] },
  ];

  const DEFAULT_TASKS = [
    '2 Liter Wasser trinken',
    '10 Minuten dehnen',
    'Proteinreiches Frühstück',
    '8.000 Schritte gehen',
  ];

  // Größerer Aufgabenpool für den "Alle 3 Tage mischen"-Modus: je Zyklus
  // werden 4 Aufgaben deterministisch daraus ausgewählt (siehe app.js).
  const TASK_POOL = [
    '2 Liter Wasser trinken',
    '10 Minuten dehnen',
    'Proteinreiches Frühstück',
    '8.000 Schritte gehen',
    '5 Minuten Meditation',
    'Vitamine einnehmen',
    'Treppe statt Aufzug nehmen',
    '7-8 Stunden schlafen',
    'Gemüse zu jeder Mahlzeit',
    'Handydisplay 1 Stunde vor dem Schlafen aus',
    'Nacken- und Schulterkreisen',
    'Foam Rolling / Faszienrolle',
  ];

  const MUSIC_GENRES = [
    { id: 'samba', label: 'Samba', src: 'assets/audio/samba.wav' },
    { id: 'lounge', label: 'Lounge', src: 'assets/audio/lounge.wav' },
    { id: 'house', label: 'House', src: 'assets/audio/house.wav' },
    { id: 'motivation', label: 'Motivation', src: 'assets/audio/motivation.wav' },
  ];

  return { MUSCLE_GROUPS, GOAL_SCHEMES, EXERCISES, WEEKLY_SPLIT, DEFAULT_TASKS, TASK_POOL, MUSIC_GENRES };
})();
