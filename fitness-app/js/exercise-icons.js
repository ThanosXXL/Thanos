// Prozedurale Übungs-Piktogramme: für jede Übung 2 einfache Strichfiguren
// (Start-/Endposition einer Wiederholung), im 100x100-Koordinatensystem
// generiert statt als Fotos - lauffähig im Browser und in Node (für die
// Collage-Erzeugung).
(function (root) {
  'use strict';

  // Winkel-Konvention: 0° = Glied zeigt gerade nach unten, 90° = horizontal
  // nach vorn, 180° = gerade nach oben, negative Werte = nach hinten.
  function pt(origin, angleDeg, length) {
    const rad = (angleDeg * Math.PI) / 180;
    return [origin[0] + length * Math.sin(rad), origin[1] - length * Math.cos(rad)];
  }

  function buildFigure(pose) {
    const hip = pose.hip || [46, 62];
    const torsoLen = pose.torsoLen != null ? pose.torsoLen : 26;
    const upperLen = 15;
    const foreLen = 14;
    const thighLen = 18;
    const shinLen = 17;

    const neck = pt(hip, pose.torsoAngle, torsoLen);
    const head = pt(neck, pose.torsoAngle, 10);

    const shoulder = neck;
    const elbow = pt(shoulder, pose.upperArmAngle, upperLen);
    const hand = pt(elbow, pose.upperArmAngle + pose.foreArmBend, foreLen);

    const knee = pt(hip, pose.thighAngle, thighLen);
    const foot = pt(knee, pose.thighAngle + pose.shinBend, shinLen);

    return { head, neck, hip, shoulder, elbow, hand, knee, foot };
  }

  function renderIconSVG(pose, size) {
    size = size || 40;
    const f = buildFigure(pose);
    const seg = (a, b) =>
      '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) +
      '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>';
    return (
      '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" stroke="#161616" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      seg(f.hip, f.neck) +
      seg(f.shoulder, f.elbow) +
      seg(f.elbow, f.hand) +
      seg(f.hip, f.knee) +
      seg(f.knee, f.foot) +
      '</g>' +
      '<circle cx="' + f.head[0].toFixed(1) + '" cy="' + f.head[1].toFixed(1) + '" r="9" fill="#161616"/>' +
      '</svg>'
    );
  }

  // Je Bewegungsmuster eine Start- (a) und Endposition (b) einer Wiederholung.
  const POSES = {
    press_overhead: {
      a: { hip: [44, 68], torsoAngle: 0, upperArmAngle: 95, foreArmBend: 85, thighAngle: 0, shinBend: 0 },
      b: { hip: [44, 68], torsoAngle: 0, upperArmAngle: 172, foreArmBend: 8, thighAngle: 0, shinBend: 0 },
    },
    press_bench: {
      a: { hip: [38, 72], torsoAngle: 88, torsoLen: 24, upperArmAngle: 130, foreArmBend: -90, thighAngle: -60, shinBend: 95 },
      b: { hip: [38, 72], torsoAngle: 88, torsoLen: 24, upperArmAngle: 178, foreArmBend: -6, thighAngle: -60, shinBend: 95 },
    },
    push_dip: {
      a: { hip: [46, 74], torsoAngle: 8, upperArmAngle: 40, foreArmBend: 110, thighAngle: 4, shinBend: -6 },
      b: { hip: [46, 70], torsoAngle: 4, upperArmAngle: 25, foreArmBend: 15, thighAngle: 2, shinBend: -4 },
    },
    fly_chest: {
      a: { hip: [38, 72], torsoAngle: 88, torsoLen: 24, upperArmAngle: 40, foreArmBend: -4, thighAngle: -60, shinBend: 95 },
      b: { hip: [38, 72], torsoAngle: 88, torsoLen: 24, upperArmAngle: 178, foreArmBend: -4, thighAngle: -60, shinBend: 95 },
    },
    pull_row: {
      a: { hip: [48, 66], torsoAngle: 55, upperArmAngle: 130, foreArmBend: -6, thighAngle: -6, shinBend: 12 },
      b: { hip: [48, 66], torsoAngle: 55, upperArmAngle: 55, foreArmBend: 100, thighAngle: -6, shinBend: 12 },
    },
    pull_up: {
      a: { hip: [46, 58], torsoAngle: 0, torsoLen: 24, upperArmAngle: 178, foreArmBend: 4, thighAngle: 8, shinBend: 10 },
      b: { hip: [46, 50], torsoAngle: 0, torsoLen: 24, upperArmAngle: 172, foreArmBend: 90, thighAngle: 8, shinBend: 10 },
    },
    hinge_deadlift: {
      a: { hip: [46, 62], torsoAngle: 65, torsoLen: 26, upperArmAngle: 60, foreArmBend: 4, thighAngle: -4, shinBend: 8 },
      b: { hip: [46, 62], torsoAngle: 0, torsoLen: 26, upperArmAngle: 8, foreArmBend: 4, thighAngle: 0, shinBend: 0 },
    },
    extend_back: {
      a: { hip: [38, 62], torsoAngle: 90, torsoLen: 24, upperArmAngle: 60, foreArmBend: -4, thighAngle: -92, shinBend: 4 },
      b: { hip: [38, 66], torsoAngle: 60, torsoLen: 24, upperArmAngle: 30, foreArmBend: -4, thighAngle: -62, shinBend: 4 },
    },
    squat_knee: {
      a: { hip: [46, 58], torsoAngle: 6, upperArmAngle: 92, foreArmBend: 4, thighAngle: 4, shinBend: -6 },
      b: { hip: [46, 74], torsoAngle: 18, upperArmAngle: 92, foreArmBend: 4, thighAngle: 70, shinBend: -130 },
    },
    lunge_split: {
      a: { hip: [46, 62], torsoAngle: 4, upperArmAngle: 4, foreArmBend: 4, thighAngle: 4, shinBend: -6 },
      b: { hip: [46, 66], torsoAngle: 8, upperArmAngle: 4, foreArmBend: 4, thighAngle: 55, shinBend: -100 },
    },
    calf_raise: {
      a: { hip: [46, 60], torsoAngle: 0, upperArmAngle: 6, foreArmBend: 4, thighAngle: 0, shinBend: 0 },
      b: { hip: [46, 54], torsoAngle: 0, upperArmAngle: 6, foreArmBend: 4, thighAngle: 0, shinBend: 0 },
    },
    leg_curl: {
      a: { hip: [42, 62], torsoAngle: 85, torsoLen: 24, upperArmAngle: 40, foreArmBend: 6, thighAngle: -4, shinBend: 4 },
      b: { hip: [42, 62], torsoAngle: 85, torsoLen: 24, upperArmAngle: 40, foreArmBend: 6, thighAngle: -4, shinBend: -95 },
    },
    raise_arm: {
      a: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 6, foreArmBend: 4, thighAngle: 0, shinBend: 0 },
      b: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 88, foreArmBend: 4, thighAngle: 0, shinBend: 0 },
    },
    curl_arm: {
      a: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 15, foreArmBend: 6, thighAngle: 0, shinBend: 0 },
      b: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 15, foreArmBend: 130, thighAngle: 0, shinBend: 0 },
    },
    situp: {
      a: { hip: [38, 70], torsoAngle: 88, torsoLen: 24, upperArmAngle: 82, foreArmBend: 4, thighAngle: -60, shinBend: 95 },
      b: { hip: [38, 70], torsoAngle: 42, torsoLen: 24, upperArmAngle: 40, foreArmBend: 4, thighAngle: -60, shinBend: 95 },
    },
    leg_raise_core: {
      a: { hip: [40, 68], torsoAngle: 90, torsoLen: 24, upperArmAngle: -10, foreArmBend: 4, thighAngle: -6, shinBend: 4 },
      b: { hip: [40, 68], torsoAngle: 90, torsoLen: 24, upperArmAngle: -10, foreArmBend: 4, thighAngle: -85, shinBend: 4 },
    },
    twist_core: {
      a: { hip: [42, 68], torsoAngle: 50, torsoLen: 24, upperArmAngle: 100, foreArmBend: 4, thighAngle: -20, shinBend: 30 },
      b: { hip: [42, 68], torsoAngle: 50, torsoLen: 24, upperArmAngle: 30, foreArmBend: 4, thighAngle: -20, shinBend: 30 },
    },
    plank: {
      a: { hip: [40, 66], torsoAngle: 90, torsoLen: 26, upperArmAngle: -2, foreArmBend: 2, thighAngle: 90, shinBend: 2 },
      b: { hip: [40, 62], torsoAngle: 88, torsoLen: 26, upperArmAngle: -2, foreArmBend: 2, thighAngle: 30, shinBend: -95 },
    },
    generic: {
      a: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 10, foreArmBend: 6, thighAngle: 0, shinBend: 0 },
      b: { hip: [46, 66], torsoAngle: 0, upperArmAngle: 70, foreArmBend: 60, thighAngle: 0, shinBend: 0 },
    },
  };

  const EXERCISE_POSE = {
    // Brust
    'Bankdrücken': 'press_bench',
    'Schrägbankdrücken': 'press_bench',
    'Liegestütze': 'push_dip',
    'Butterfly': 'fly_chest',
    'Dips': 'push_dip',
    // Rücken
    'Klimmzüge': 'pull_up',
    'Rudern vorgebeugt': 'pull_row',
    'Latzug': 'pull_row',
    'Kreuzheben': 'hinge_deadlift',
    'Superman': 'extend_back',
    // Beine
    'Kniebeugen': 'squat_knee',
    'Ausfallschritte': 'lunge_split',
    'Beinpresse': 'squat_knee',
    'Wadenheben': 'calf_raise',
    'Beincurls': 'leg_curl',
    // Schultern
    'Schulterdrücken': 'press_overhead',
    'Seitheben': 'raise_arm',
    'Frontheben': 'raise_arm',
    'Face Pulls': 'pull_row',
    'Arnold Press': 'press_overhead',
    // Arme
    'Bizepscurls': 'curl_arm',
    'Trizepsdrücken': 'push_dip',
    'Hammercurls': 'curl_arm',
    'Trizeps-Dips': 'push_dip',
    'Konzentrationscurls': 'curl_arm',
    // Bauch
    'Crunches': 'situp',
    'Plank': 'plank',
    'Beinheben': 'leg_raise_core',
    'Russian Twists': 'twist_core',
    'Mountain Climbers': 'plank',
  };

  function poseForExercise(name) {
    return POSES[EXERCISE_POSE[name]] || POSES.generic;
  }

  function iconsForExercise(name, size) {
    const pose = poseForExercise(name);
    return [renderIconSVG(pose.a, size), renderIconSVG(pose.b, size)];
  }

  const api = { renderIconSVG, buildFigure, POSES, EXERCISE_POSE, poseForExercise, iconsForExercise };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MYWORKOUT_ICONS = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
