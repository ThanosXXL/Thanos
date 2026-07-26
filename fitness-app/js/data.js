// Statische Trainings- und Übungsdaten für FitSpark.
window.FITSPARK_DATA = (function () {

  const MUSCLE_GROUPS = [
    { id: 'brust', label: 'Brust' },
    { id: 'ruecken', label: 'Rücken' },
    { id: 'beine', label: 'Beine' },
    { id: 'schultern', label: 'Schultern' },
    { id: 'arme', label: 'Arme' },
    { id: 'bauch', label: 'Bauch' },
  ];

  // Rep-/Satz-Schemata je Trainingsziel.
  const GOAL_SCHEMES = {
    ausdauer: { label: 'Ausdauertraining', scheme: '3 x 20', pause: '30 Sek. Pause' },
    aufbau: { label: 'Muskelaufbau', scheme: '4 x 8-10', pause: '90 Sek. Pause' },
    definition: { label: 'Muskeln definieren', scheme: '3 x 15', pause: '45 Sek. Pause' },
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

  const MUSIC_GENRES = [
    { id: 'samba', label: 'Samba', src: 'assets/audio/samba.wav' },
    { id: 'lounge', label: 'Lounge', src: 'assets/audio/lounge.wav' },
    { id: 'house', label: 'House', src: 'assets/audio/house.wav' },
    { id: 'motivation', label: 'Motivation', src: 'assets/audio/motivation.wav' },
  ];

  return { MUSCLE_GROUPS, GOAL_SCHEMES, EXERCISES, WEEKLY_SPLIT, DEFAULT_TASKS, MUSIC_GENRES };
})();
