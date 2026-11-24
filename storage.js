const Storage = (() => {
  const KEY_BEST = 'bubble_chan_match3_best_v1';
  const KEY_MUSIC = 'bubble_chan_match3_music_v1';

  function getBestScore() {
    try {
      return parseInt(localStorage.getItem(KEY_BEST), 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(score) {
    try {
      const current = getBestScore();
      if (score > current) {
        localStorage.setItem(KEY_BEST, String(score));
        return score;
      }
      return current;
    } catch {
      return score;
    }
  }

  function getMusicPref() {
    try {
      return localStorage.getItem(KEY_MUSIC) === '1';
    } catch {
      return false;
    }
  }

  function saveMusicPref(enabled) {
    try {
      localStorage.setItem(KEY_MUSIC, enabled ? '1' : '0');
    } catch {
      // Игнорируем ограничения приватного режима
    }
  }

  return {
    getBestScore,
    saveBestScore,
    getMusicPref,
    saveMusicPref
  };
})();
