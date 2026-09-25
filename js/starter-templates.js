// Startvorlagen "Push" und "Pull" – übernommen aus Lukas' bisheriger App (Pfund → kg umgerechnet).
// w = Aufwärmsatz. Gewichte in kg, Wiederholungen als Zielwerte.

const S = (weight_kg, reps, warmup = false) => ({ warmup, weight_kg, reps });

export const STARTER_TEMPLATES = [
  {
    name: 'Push',
    exercises: [
      { name: 'Brustdrücken', muscles: ['brust'], sets: [S(20, 5, true), S(35, 7), S(35, 6), S(35, 5)] },
      { name: 'Maschinen-Brustfly', muscles: ['brust'], sets: [S(26, 5, true), S(33, 6), S(33, 5), S(33, 6)] },
      { name: 'Schulterdrücken mit Maschine', muscles: ['schultern'], sets: [S(15, 5, true), S(20, 5), S(17.5, 8)] },
      { name: 'Einarmiges Trizepsdrücken', muscles: ['trizeps'], sets: [S(4, 5, true), S(7, 5), S(7, 6), S(7, 6)] },
      { name: 'Kabel-Seitheben', muscles: ['schultern'], sets: [S(2.5, 6, true), S(2.5, 8), S(2.5, 6), S(2.5, 5)] },
    ],
  },
  {
    name: 'Pull',
    exercises: [
      { name: 'Maschinen-Rückenstrecker', muscles: ['unterer_ruecken'], sets: [S(15, 5, true), S(20, 15), S(27.5, 12), S(27.5, 15)] },
      { name: 'Latziehen', muscles: ['lat'], sets: [S(25, 5, true), S(45, 7), S(45, 6), S(45, 5)] },
      { name: 'Sitzendes Kabelrudern', muscles: ['oberer_ruecken', 'lat'], sets: [S(25, 5, true), S(35, 10), S(37.5, 7), S(37.5, 7)] },
      { name: 'Maschinen-Bizeps-Curl', muscles: ['bizeps'], sets: [S(7.5, 5, true), S(10, 10), S(11.1, 7), S(11.1, 5)] },
      { name: 'Schrägbank-Kurzhantelcurl', muscles: ['bizeps'], sets: [S(7, 12, true), S(7, 8), S(7, 9), S(7, 7)] },
    ],
  },
];
