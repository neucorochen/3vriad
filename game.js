(() => {
  const GRID_SIZE = 8;
  const GEM_TYPES = 6;

  // Палитра глянцевых шаров Frutiger Aero
  const GEM_PALETTE = [
    { name: 'blue',   light: '#b8f3ff', mid: '#2db5ff', dark: '#0b5eb8', glow: '#6de0ff' },
    { name: 'lime',   light: '#e0ff9e', mid: '#63e622', dark: '#1a8a10', glow: '#9dff57' },
    { name: 'orange', light: '#fff0a6', mid: '#ff9d1c', dark: '#c74c00', glow: '#ffc259' },
    { name: 'purple', light: '#f4c7ff', mid: '#b954ff', dark: '#6214ad', glow: '#db94ff' },
    { name: 'pink',   light: '#ffd1e3', mid: '#ff4d8d', dark: '#ad0c48', glow: '#ff8fb8' },
    { name: 'aqua',   light: '#c7fff4', mid: '#1ce0c3', dark: '#08827a', glow: '#6efff0' }
  ];

  const MASCOT_LINES = {
    idle: [
      'Собери 3 желейных шара!',
      'Свайпай шарики, они мягкие!',
      '4 в ряд дадут сияющий шар!'
    ],
    good: [
      'Классно лопаются! ✨',
      'Пузырьковая магия!',
      'Отличный ход!'
    ],
    combo: [
      'ОГО, какое комбо!! 🫧',
      'Невероятно! Продолжай!',
      'Фрутигер-рекорд близко!'
    ],
    shuffle: [
      'Ходов нет — перемешиваю поле!'
    ],
    hint: [
      'Попробуй вот эти шарики!'
    ]
  };

  // DOM элементы
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const floatingLayer = document.getElementById('floatingLayer');
  const scoreEl = document.getElementById('scoreVal');
  const bestEl = document.getElementById('bestVal');
  const comboEl = document.getElementById('comboVal');
  const comboBarEl = document.getElementById('comboBar');
  const hintBtn = document.getElementById('hintBtn');
  const musicBtn = document.getElementById('musicBtn');
  const restartBtn = document.getElementById('restartBtn');
  const mascotBubble = document.getElementById('mascotBubble');
  const mascotImg = document.getElementById('mascotImg');

  // Состояние игры
  let board = [];
  let particles = [];
  let sprites = [];
  let specialSprites = [];
  let rainbowSprite = null;

  let boardPx = 480;
  let cellPx = 60;
  let dpr = 1;

  let score = 0;
  let bestScore = Storage.getBestScore();
  let combo = 0;
  let state = 'IDLE'; // IDLE | SWAPPING | REVERTING | RESOLVING | FALLING
  let selected = null;
  let hintPair = null;
  let hintTimer = 0;
  let swapData = null;

  // Ввод (мышь и тач)
  let pointerDown = false;
  let dragStartCell = null;
  let dragStartPos = null;

  let lastTime = 0;
  let elapsedTime = 0;

  // ===== ПРЕДВАРИТЕЛЬНЫЙ РЕНДЕР СПРАЙТОВ (ДЛЯ 60 FPS БЕЗ ЛАГОВ) =====
  function createOrbSprite(palette, size, mode = 'normal') {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    const c = size / 2;
    const r = size * 0.42;

    // Мягкая тень под шаром
    octx.save();
    octx.beginPath();
    octx.ellipse(c, c + r * 0.82, r * 0.72, r * 0.22, 0, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(12, 86, 138, 0.22)';
    octx.fill();
    octx.restore();

    // Основное тело желейного шара
    const bodyGrad = octx.createRadialGradient(
      c - r * 0.28, c - r * 0.3, r * 0.08,
      c, c, r
    );

    if (mode === 'rainbow') {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.28, '#9bf6ff');
      bodyGrad.addColorStop(0.55, '#caffbf');
      bodyGrad.addColorStop(0.8, '#ffadad');
      bodyGrad.addColorStop(1, '#a0c4ff');
    } else {
      bodyGrad.addColorStop(0, palette.light);
      bodyGrad.addColorStop(0.52, palette.mid);
      bodyGrad.addColorStop(1, palette.dark);
    }

    octx.beginPath();
    octx.arc(c, c, r, 0, Math.PI * 2);
    octx.fillStyle = bodyGrad;
    octx.fill();

    // Внутреннее нижнее свечение (эффект стекла)
    const rimGrad = octx.createRadialGradient(c, c + r * 0.55, r * 0.05, c, c + r * 0.35, r * 0.78);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    octx.beginPath();
    octx.arc(c, c, r * 0.92, 0, Math.PI * 2);
    octx.fillStyle = rimGrad;
    octx.fill();

    // Главный верхний глянцевый блик Frutiger Aero
    octx.save();
    octx.beginPath();
    octx.ellipse(c - r * 0.16, c - r * 0.42, r * 0.52, r * 0.28, -0.25, 0, Math.PI * 2);
    const glossGrad = octx.createLinearGradient(0, c - r * 0.75, 0, c - r * 0.1);
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    octx.fillStyle = glossGrad;
    octx.fill();
    octx.restore();

    // Маленькая искорка справа
    octx.beginPath();
    octx.arc(c + r * 0.36, c - r * 0.26, r * 0.11, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    octx.fill();

    // Особое кольцо для шара 4-в-ряд (линейный взрыв)
    if (mode === 'line') {
      octx.beginPath();
      octx.arc(c, c, r * 0.82, 0, Math.PI * 2);
      octx.lineWidth = Math.max(2.5, size * 0.045);
      octx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      octx.stroke();

      // Звёздочка в центре
      octx.fillStyle = '#ffffff';
      octx.beginPath();
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        octx.lineTo(c + Math.cos(ang) * r * 0.42, c + Math.sin(ang) * r * 0.42);
        octx.lineTo(c + Math.cos(ang + Math.PI / 4) * r * 0.14, c + Math.sin(ang + Math.PI / 4) * r * 0.14);
      }
      octx.closePath();
      octx.fill();
    }

    // Ободок радужного шара (5-в-ряд)
    if (mode === 'rainbow') {
      octx.beginPath();
      octx.arc(c, c, r * 0.93, 0, Math.PI * 2);
      octx.lineWidth = Math.max(2.5, size * 0.04);
      octx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      octx.stroke();
    }

    return off;
  }

  function buildSprites() {
    const spriteSize = Math.max(64, Math.ceil(cellPx * dpr));
    sprites = GEM_PALETTE.map((p) => createOrbSprite(p, spriteSize, 'normal'));
    specialSprites = GEM_PALETTE.map((p) => createOrbSprite(p, spriteSize, 'line'));
    rainbowSprite = createOrbSprite(GEM_PALETTE[0], spriteSize, 'rainbow');
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    boardPx = Math.floor(rect.width);
    cellPx = boardPx / GRID_SIZE;

    canvas.width = Math.floor(boardPx * dpr);
    canvas.height = Math.floor(boardPx * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildSprites();

    // Синхронизируем экранные координаты всех шаров
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r]?.[c];
        if (gem) {
          gem.x = c * cellPx + cellPx / 2;
          gem.y = r * cellPx + cellPx / 2;
        }
      }
    }
  }

  // ===== СОЗДАНИЕ ШАРА С ЖЕЛЕЙНОЙ ФИЗИКОЙ =====
  function createGem(r, c, type, startYOffset = 0, special = null) {
    return {
      type,
      special, // null | 'line' | 'rainbow'
      r,
      c,
      x: c * cellPx + cellPx / 2,
      y: (r + startYOffset) * cellPx + cellPx / 2,
      vy: 0,
      scaleX: 1,
      scaleY: 1,
      velSX: 0,
      velSY: 0,
      alpha: 1,
      phase: Math.random() * Math.PI * 2,
      removing: false
    };
  }

  // Пружинный импульс (желейный отскок)
  function squishGem(gem, sx, sy) {
    if (!gem) return;
    gem.scaleX = sx;
    gem.scaleY = sy;
  }

  // ===== ИНИЦИАЛИЗАЦИЯ ПОЛЯ =====
  function initBoard() {
    board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    particles = [];
    score = 0;
    combo = 0;
    selected = null;
    hintPair = null;
    state = 'IDLE';

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let type;
        do {
          type = Math.floor(Math.random() * GEM_TYPES);
        } while (
          (c >= 2 && board[r][c - 1].type === type && board[r][c - 2].type === type) ||
          (r >= 2 && board[r - 1][c].type === type && board[r - 2][c].type === type)
        );
        const gem = createGem(r, c, type, -GRID_SIZE * 0.45 - Math.random() * 1.5);
        board[r][c] = gem;
      }
    }

    if (!findFirstValidMove()) {
      shuffleBoard(false);
    }

    state = 'FALLING';
    updateHUD();
    sayMascot('idle', false);
  }

  // ===== ПОИСК СОВПАДЕНИЙ =====
  function findMatches() {
    const matchedSet = new Set();
    const groups = [];

    // Горизонталь
    for (let r = 0; r < GRID_SIZE; r++) {
      let run = [board[r][0]];
      for (let c = 1; c < GRID_SIZE; c++) {
        const curr = board[r][c];
        const prev = run[0];
        if (curr && prev && curr.type === prev.type && curr.special !== 'rainbow' && prev.special !== 'rainbow') {
          run.push(curr);
        } else {
          if (run.length >= 3) {
            groups.push([...run]);
            run.forEach((g) => matchedSet.add(g));
          }
          run = [curr];
        }
      }
      if (run.length >= 3) {
        groups.push([...run]);
        run.forEach((g) => matchedSet.add(g));
      }
    }

    // Вертикаль
    for (let c = 0; c < GRID_SIZE; c++) {
      let run = [board[0][c]];
      for (let r = 1; r < GRID_SIZE; r++) {
        const curr = board[r][c];
        const prev = run[0];
        if (curr && prev && curr.type === prev.type && curr.special !== 'rainbow' && prev.special !== 'rainbow') {
          run.push(curr);
        } else {
          if (run.length >= 3) {
            groups.push([...run]);
            run.forEach((g) => matchedSet.add(g));
          }
          run = [curr];
        }
      }
      if (run.length >= 3) {
        groups.push([...run]);
        run.forEach((g) => matchedSet.add(g));
      }
    }

    return { matched: Array.from(matchedSet), groups };
  }

  function findFirstValidMove() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const g1 = board[r][c];
        if (!g1) continue;

        const neighbors = [
          [r, c + 1],
          [r + 1, c]
        ];

        for (const [nr, nc] of neighbors) {
          if (nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
          const g2 = board[nr][nc];
          if (!g2) continue;
          if (g1.special === 'rainbow' || g2.special === 'rainbow') {
            return [{ r, c }, { r: nr, c: nc }];
          }
          // Временный обмен
          board[r][c] = g2;
          board[nr][nc] = g1;
          const hasMatch = findMatches().matched.length > 0;
          board[r][c] = g1;
          board[nr][nc] = g2;
          if (hasMatch) {
            return [{ r, c }, { r: nr, c: nc }];
          }
        }
      }
    }
    return null;
  }

  function shuffleBoard(announce = true) {
    const types = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c]) types.push(board[r][c].type);
      }
    }

    for (let attempt = 0; attempt < 15; attempt++) {
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      let idx = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          board[r][c].type = types[idx++];
          board[r][c].special = null;
          squishGem(board[r][c], 1.24, 0.78);
        }
      }
      if (findMatches().matched.length === 0 && findFirstValidMove()) break;
    }

    if (announce) {
      sayMascot('shuffle', true);
      AeroAudio.playSquish(1.3);
    }
  }

  // ===== ОБМЕН И ОБРАБОТКА СОВПАДЕНИЙ =====
  function startSwap(c1, c2) {
    if (state !== 'IDLE') return;
    if (Math.abs(c1.r - c2.r) + Math.abs(c1.c - c2.c) !== 1) return;

    const g1 = board[c1.r][c1.c];
    const g2 = board[c2.r][c2.c];
    if (!g1 || !g2) return;

    hintPair = null;
    selected = null;
    combo = 0;
    AeroAudio.playSquish(1.05);
    squishGem(g1, 1.18, 0.84);
    squishGem(g2, 0.84, 1.18);

    swapData = {
      g1, g2,
      r1: c1.r, c1: c1.c,
      r2: c2.r, c2: c2.c,
      t: 0,
      duration: 0.17
    };
    state = 'SWAPPING';
  }

  function finishSwap() {
    const { g1, g2, r1, c1, r2, c2 } = swapData;
    board[r1][c1] = g2;
    board[r2][c2] = g1;
    g1.r = r2; g1.c = c2;
    g2.r = r1; g2.c = c1;

    // Если один из шаров — радужный (очищает все шары цвета второго)
    if (g1.special === 'rainbow' || g2.special === 'rainbow') {
      const targetType = g1.special === 'rainbow' ? g2.type : g1.type;
      const toClear = [g1, g2];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const item = board[r][c];
          if (item && item.type === targetType && !toClear.includes(item)) {
            toClear.push(item);
          }
        }
      }
      swapData = null;
      popGems(toClear, []);
      return;
    }

    const { matched, groups } = findMatches();
    if (matched.length > 0) {
      swapData = null;
      popGems(matched, groups, g1);
    } else {
      // Возвращаем обратно
      board[r1][c1] = g1;
      board[r2][c2] = g2;
      g1.r = r1; g1.c = c1;
      g2.r = r2; g2.c = c2;
      swapData.t = 0;
      state = 'REVERTING';
      AeroAudio.playInvalid();
    }
  }

  function popGems(matched, groups, pivotGem = null) {
    combo++;
    state = 'RESOLVING';

    // Расширяем взрыв, если попались линейные сферы
    const finalClear = new Set(matched);
    for (const gem of matched) {
      if (gem.special === 'line') {
        for (let i = 0; i < GRID_SIZE; i++) {
          if (board[gem.r][i]) finalClear.add(board[gem.r][i]);
          if (board[i][gem.c]) finalClear.add(board[i][gem.c]);
        }
      }
    }

    // Создаём бонусы за 4 или 5 в ряд
    const spawns = [];
    for (const group of groups) {
      if (group.length >= 5) {
        const target = group.includes(pivotGem) ? pivotGem : group[Math.floor(group.length / 2)];
        spawns.push({ r: target.r, c: target.c, type: target.type, special: 'rainbow' });
      } else if (group.length === 4) {
        const target = group.includes(pivotGem) ? pivotGem : group[1];
        spawns.push({ r: target.r, c: target.c, type: target.type, special: 'line' });
      }
    }

    const clearedArr = Array.from(finalClear);
    const gained = clearedArr.length * 25 * combo;
    score += gained;
    bestScore = Storage.saveBestScore(score);
    updateHUD();

    AeroAudio.playPop(combo);

    // Центр всплывающих очков
    let avgX = 0;
    let avgY = 0;
    for (const gem of clearedArr) {
      avgX += gem.x;
      avgY += gem.y;
      spawnSplash(gem.x, gem.y, GEM_PALETTE[gem.type].glow);
      board[gem.r][gem.c] = null;
    }
    avgX /= clearedArr.length;
    avgY /= clearedArr.length;
    spawnScoreText(avgX, avgY, `+${gained}${combo > 1 ? ` x${combo}` : ''}`);

    // Размещаем новые спец-шары
    for (const sp of spawns) {
      const bonus = createGem(sp.r, sp.c, sp.type, 0, sp.special);
      squishGem(bonus, 1.35, 0.72);
      board[sp.r][sp.c] = bonus;
    }

    // Реакция маскота
    if (combo >= 3 || clearedArr.length >= 5) {
      sayMascot('combo', true);
    } else if (clearedArr.length >= 4 || combo === 2) {
      sayMascot('good', true);
    }

    // Применяем гравитацию и заполняем пустоты сверху
    applyGravity();
  }

  function applyGravity() {
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (board[r][c]) {
          const gem = board[r][c];
          if (r !== writeRow) {
            board[writeRow][c] = gem;
            board[r][c] = null;
            gem.r = writeRow;
            gem.vy = Math.max(gem.vy, 120);
          }
          writeRow--;
        }
      }

      // Досыпаем новые шары сверху
      let spawnOffset = 1;
      for (let r = writeRow; r >= 0; r--) {
        const type = Math.floor(Math.random() * GEM_TYPES);
        const gem = createGem(r, c, type, -(writeRow - r + spawnOffset) * 1.05);
        gem.vy = 140;
        board[r][c] = gem;
        spawnOffset += 0.25;
      }
    }

    state = 'FALLING';
  }

  // ===== ЧАСТИЦЫ БРЫЗГ =====
  function spawnSplash(x, y, color) {
    const count = 6; // Умеренное число для 60 FPS на телефонах
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 70 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        r: 3 + Math.random() * 4.5,
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.65,
        color
      });
    }
  }

  function spawnScoreText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    floatingLayer.appendChild(el);
    setTimeout(() => el.remove(), 860);
  }

  // ===== ИНТЕРФЕЙС И МАСКОТ =====
  function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
    comboEl.textContent = `x${Math.max(1, combo)}`;
    const pct = Math.min(100, combo * 25);
    comboBarEl.style.width = `${pct}%`;
  }

  function sayMascot(category, animate = false) {
    const list = MASCOT_LINES[category] || MASCOT_LINES.idle;
    mascotBubble.textContent = list[Math.floor(Math.random() * list.length)];

    mascotBubble.classList.remove('pop');
    void mascotBubble.offsetWidth;
    mascotBubble.classList.add('pop');

    if (animate && mascotImg) {
      mascotImg.classList.remove('cheer');
      void mascotImg.offsetWidth;
      mascotImg.classList.add('cheer');
    }
  }

  // ===== ОБРАБОТКА ВВОДА (ТАЧ + МЫШЬ) =====
  function getCellFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / cellPx);
    const r = Math.floor(y / cellPx);
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    return { r, c, x, y };
  }

  canvas.addEventListener('pointerdown', (e) => {
    AeroAudio.ensureContext();
    if (state !== 'IDLE') return;

    const cell = getCellFromPointer(e);
    if (!cell) return;

    pointerDown = true;
    dragStartCell = { r: cell.r, c: cell.c };
    dragStartPos = { x: cell.x, y: cell.y };

    const gem = board[cell.r][cell.c];
    squishGem(gem, 1.2, 0.82);
    AeroAudio.playSquish(0.95);

    if (selected) {
      if (selected.r === cell.r && selected.c === cell.c) {
        selected = null;
      } else if (Math.abs(selected.r - cell.r) + Math.abs(selected.c - cell.c) === 1) {
        startSwap(selected, { r: cell.r, c: cell.c });
        pointerDown = false;
      } else {
        selected = { r: cell.r, c: cell.c };
      }
    } else {
      selected = { r: cell.r, c: cell.c };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown || state !== 'IDLE' || !dragStartCell) return;

    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) - dragStartPos.x;
    const dy = (e.clientY - rect.top) - dragStartPos.y;
    const threshold = cellPx * 0.34;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let nr = dragStartCell.r;
      let nc = dragStartCell.c;
      if (Math.abs(dx) > Math.abs(dy)) {
        nc += dx > 0 ? 1 : -1;
      } else {
        nr += dy > 0 ? 1 : -1;
      }

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        startSwap(dragStartCell, { r: nr, c: nc });
      }
      pointerDown = false;
      dragStartCell = null;
    }
  });

  window.addEventListener('pointerup', () => {
    pointerDown = false;
    dragStartCell = null;
  });

  // Кнопки управления
  hintBtn.addEventListener('click', () => {
    AeroAudio.ensureContext();
    AeroAudio.playSquish(1.2);
    if (state !== 'IDLE') return;
    const move = findFirstValidMove();
    if (move) {
      hintPair = move;
      hintTimer = 3.0;
      sayMascot('hint', true);
    } else {
      shuffleBoard(true);
    }
  });

  restartBtn.addEventListener('click', () => {
    AeroAudio.ensureContext();
    AeroAudio.playSquish(0.9);
    initBoard();
  });

  function updateMusicBtn() {
    musicBtn.textContent = AeroAudio.isMusicEnabled() ? '🎵 музыка: вкл' : '🎵 музыка: выкл';
  }

  musicBtn.addEventListener('click', () => {
    AeroAudio.ensureContext();
    AeroAudio.setMusic(!AeroAudio.isMusicEnabled());
    AeroAudio.playSquish(1.15);
    updateMusicBtn();
  });

  // ===== ИГРОВОЙ ЦИКЛ (ФИЗИКА + РЕНДЕР) =====
  function update(dt) {
    elapsedTime += dt;

    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) hintPair = null;
    }

    // Обновляем пружинную желейную физику каждого шара
    const stiffness = 240;
    const damping = 14;
    let anyMoving = false;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        // Пружина возврата к (1, 1)
        gem.velSX += (1 - gem.scaleX) * stiffness * dt;
        gem.velSY += (1 - gem.scaleY) * stiffness * dt;
        gem.velSX *= Math.max(0, 1 - damping * dt);
        gem.velSY *= Math.max(0, 1 - damping * dt);
        gem.scaleX += gem.velSX * dt;
        gem.scaleY += gem.velSY * dt;

        // Гравитация при падении
        if (state === 'FALLING') {
          const targetX = c * cellPx + cellPx / 2;
          const targetY = r * cellPx + cellPx / 2;
          gem.x = targetX;

          if (gem.y < targetY) {
            gem.vy += 2100 * dt;
            gem.y += gem.vy * dt;
            anyMoving = true;

            // Лёгкое вытягивание в полёте
            gem.scaleX = 0.92;
            gem.scaleY = 1.09;

            if (gem.y >= targetY) {
              gem.y = targetY;
              const impact = Math.min(0.28, gem.vy / 2600);
              gem.vy = 0;
              // Желейное сплющивание при ударе о дно
              squishGem(gem, 1 + impact, 1 - impact * 0.9);
            }
          }
        }
      }
    }

    // Анимация обмена
    if ((state === 'SWAPPING' || state === 'REVERTING') && swapData) {
      swapData.t += dt / swapData.duration;
      const p = Math.min(1, swapData.t);
      const ease = 1 - Math.pow(1 - p, 3);

      const x1 = swapData.c1 * cellPx + cellPx / 2;
      const y1 = swapData.r1 * cellPx + cellPx / 2;
      const x2 = swapData.c2 * cellPx + cellPx / 2;
      const y2 = swapData.r2 * cellPx + cellPx / 2;

      if (state === 'SWAPPING') {
        swapData.g1.x = x1 + (x2 - x1) * ease;
        swapData.g1.y = y1 + (y2 - y1) * ease;
        swapData.g2.x = x2 + (x1 - x2) * ease;
        swapData.g2.y = y2 + (y1 - y2) * ease;

        if (p >= 1) finishSwap();
      } else {
        swapData.g1.x = x2 + (x1 - x2) * ease;
        swapData.g1.y = y2 + (y1 - y2) * ease;
        swapData.g2.x = x1 + (x2 - x1) * ease;
        swapData.g2.y = y1 + (y2 - y1) * ease;

        if (p >= 1) {
          swapData = null;
          state = 'IDLE';
        }
      }
    }

    // Завершение падения -> проверка каскадных совпадений
    if (state === 'FALLING' && !anyMoving) {
      const { matched, groups } = findMatches();
      if (matched.length > 0) {
        popGems(matched, groups);
      } else {
        state = 'IDLE';
        if (!findFirstValidMove()) {
          shuffleBoard(true);
        }
      }
    }

    // Частицы
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      pt.vy += 420 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, boardPx, boardPx);

    // Лёгкая стеклянная шахматная сетка
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.fillStyle = (r + c) % 2 === 0
          ? 'rgba(255, 255, 255, 0.36)'
          : 'rgba(176, 232, 255, 0.24)';
        ctx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      }
    }

    // Подсветка подсказки
    if (hintPair) {
      const pulse = 0.45 + 0.35 * Math.sin(elapsedTime * 8);
      ctx.fillStyle = `rgba(140, 245, 45, ${pulse})`;
      for (const cell of hintPair) {
        ctx.beginPath();
        ctx.roundRect(cell.c * cellPx + 3, cell.r * cellPx + 3, cellPx - 6, cellPx - 6, 12);
        ctx.fill();
      }
    }

    // Подсветка выбранной клетки
    if (selected) {
      const pulse = 0.55 + 0.25 * Math.sin(elapsedTime * 7);
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse + 0.2})`;
      ctx.fillStyle = `rgba(80, 210, 255, ${pulse * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(selected.c * cellPx + 3, selected.r * cellPx + 3, cellPx - 6, cellPx - 6, 12);
      ctx.fill();
      ctx.stroke();
    }

    // Отрисовка желейных шаров из кешированных спрайтов
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        const isSel = selected && selected.r === r && selected.c === c;
        const idleWave = isSel
          ? Math.sin(elapsedTime * 9) * 0.07
          : Math.sin(elapsedTime * 2.2 + gem.phase) * 0.018;

        const sx = gem.scaleX + idleWave;
        const sy = gem.scaleY - idleWave;

        let sprite = sprites[gem.type];
        if (gem.special === 'line') sprite = specialSprites[gem.type];
        if (gem.special === 'rainbow') sprite = rainbowSprite;

        ctx.save();
        ctx.translate(gem.x, gem.y);
        ctx.scale(sx, sy);
        ctx.drawImage(sprite, -cellPx / 2, -cellPx / 2, cellPx, cellPx);
        ctx.restore();
      }
    }

    // Отрисовка пузырьковых брызг
    for (const pt of particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Старт
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  initBoard();
  updateMusicBtn();
  requestAnimationFrame(loop);
})();
