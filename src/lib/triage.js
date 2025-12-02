export const runTriage = (deviceType, symptoms) => {
  const hasSymptom = (symptom) => symptoms.includes(symptom);

  if (hasSymptom('przegrzewa się') || hasSymptom('hałas')) {
    return {
      priceMin: 150,
      priceMax: 350,
      etaHours: 48,
      hypotheses: [
        { desc: 'Czyszczenie układu chłodzenia i wymiana past termoprzewodzących', prob: 0.8 },
        { desc: 'Wymiana wentylatora', prob: 0.2 },
      ],
      risk: 'low',
    };
  }

  if (hasSymptom('nie wstaje')) {
    return {
      priceMin: 120,
      priceMax: 600,
      etaHours: 72,
      hypotheses: [
        { desc: 'Problem z zasilaczem, modułem zasilania (VRM) lub dyskiem systemowym', prob: 0.7 },
        { desc: 'Uszkodzenie płyty głównej', prob: 0.3 },
      ],
      risk: 'med',
    };
  }

  if (hasSymptom('brak Wi-Fi')) {
    return {
      priceMin: 90,
      priceMax: 250,
      etaHours: 24,
      hypotheses: [
        { desc: 'Problem ze sterownikiem lub konfiguracją systemu', prob: 0.7 },
        { desc: 'Fizyczne uszkodzenie modułu Wi-Fi', prob: 0.3 },
      ],
      risk: 'low',
    };
  }
  
  if (hasSymptom('BSOD/kernel panic')) {
    return {
      priceMin: 150,
      priceMax: 450,
      etaHours: 48,
      hypotheses: [
        { desc: 'Problem z pamięcią RAM lub sterownikami', prob: 0.6 },
        { desc: 'Problem z dyskiem twardym lub systemem plików', prob: 0.4 },
      ],
      risk: 'med',
    };
  }
  
  if (hasSymptom('zalanie')) {
    return {
      priceMin: 300,
      priceMax: 1500,
      etaHours: 120,
      hypotheses: [
        { desc: 'Czyszczenie po zalaniu i diagnostyka komponentów', prob: 0.9 },
        { desc: 'Konieczność wymiany klawiatury, płyty głównej lub innych komponentów', prob: 0.5 },
      ],
      risk: 'high',
    };
  }

  // Default case
  return {
    priceMin: 90,
    priceMax: 300,
    etaHours: 48,
    hypotheses: [
      { desc: 'Wymagana szczegółowa diagnoza ogólna', prob: 1.0 },
    ],
    risk: 'low',
  };
};