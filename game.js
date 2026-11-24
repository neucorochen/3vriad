(() => {
  const GRID_SIZE = 8;
  const GEM_TYPES = 6;

  // Цвета брызг-глазури для каждого из 6 десертов
  const DESSERT_COLORS = [
    '#ff75b5', // 0: Клубничный кекс
    '#45f0cf', // 1: Мятный пончик
    '#ff6b6b', // 2: Кусочек торта
    '#c77dff', // 3: Лавандовый макарун
    '#ffb84d', // 4: Карамельный пудинг
    '#52c7ff'  // 5: Черничное пирожное
  ];

  const MASCOT_LINES = {
    idle: [
      'Собери 3 вкусняшки в ряд!',
      'Кексики и тортики такие мягкие!',
      '4 в ряд дадут сияющий десерт!'
    ],
    good: [
      'Вкуснотища! ✨',
      'Сладкое совпадение!',
      'Отличный кусочек!'
    ],
    combo: [
      'ОГО, сладкое комбо!! 🍰',
      'Вот это пир!! Продолжай!',
      'Кондитерский рекорд близко!'
    ],
    shuffle: [
      'Ходов нет — перемешиваю десерты!'
    ],
    hint: [
      'Попробуй вот эти вкусняшки!'
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
  let state = 'IDLE';
  let selected = null;
  let hintPair = null;
  let hintTimer = 0;
  let swapData = null;

  let pointerDown = false;
  let dragStartCell = null;
  let dragStartPos = null;

  let lastTime = 0;
  let elapsedTime = 0;

  // ===== ПРОЦЕДУРНЫЙ РЕНДЕР ГЛЯНЦЕВЫХ ДЕСЕРТОВ В КЕШ =====
  function createDessertSprite(type, size, mode = 'normal') {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    const c = size / 2;
    const u = size / 100; // Единица масштаба (1% от размера спрайта)

    // Мягкая тень под десертом
    g.fillStyle = 'rgba(18, 86, 132, 0.2)';
    g.beginPath();
    g.ellipse(c, 84 * u, 30 * u, 8 * u, 0, 0, Math.PI * 2);
    g.fill();

    // Сияющий ореол для 4-в-ряд и радужного торта
    if (mode === 'line' || mode === 'rainbow') {
      const aura = g.createRadialGradient(c, c, 12 * u, c, c, 48 * u);
      aura.addColorStop(0, mode === 'rainbow' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 210, 0.85)');
      aura.addColorStop(0.7, mode === 'rainbow' ? 'rgba(140, 240, 255, 0.55)' : 'rgba(130, 235, 255, 0.45)');
      aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = aura;
      g.beginPath();
      g.arc(c, c, 48 * u, 0, Math.PI * 2);
      g.fill();
    }

    if (mode === 'rainbow') {
      drawRainbowCake(g, u);
      return off;
    }

    switch (type) {
      case 0: drawCupcake(g, u); break;
      case 1: drawMintDonut(g, u); break;
      case 2: drawCakeSlice(g, u); break;
      case 3: drawMacaron(g, u); break;
      case 4: drawPudding(g, u); break;
      case 5: drawBerryTart(g, u); break;
    }

    // Звёздочка-значок для сияющего десерта (4 в ряд)
    if (mode === 'line') {
      g.save();
      g.translate(76 * u, 24 * u);
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#1ca6f2';
      g.lineWidth = 2.5 * u;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.lineTo(Math.cos(a) * 13 * u, Math.sin(a) * 13 * u);
        g.lineTo(Math.cos(a + Math.PI / 4) * 4.5 * u, Math.sin(a + Math.PI / 4) * 4.5 * u);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }

    return off;
  }

  // 0. Клубничный кекс
  function drawCupcake(g, u) {
    // Стаканчик
    const cupGrad = g.createLinearGradient(25 * u, 50 * u, 75 * u, 82 * u);
    cupGrad.addColorStop(0, '#ff85be');
    cupGrad.addColorStop(0.5, '#ff4d9e');
    cupGrad.addColorStop(1, '#c71f6e');
    g.fillStyle = cupGrad;
    g.beginPath();
    g.moveTo(26 * u, 52 * u);
    g.lineTo(74 * u, 52 * u);
    g.lineTo(66 * u, 82 * u);
    g.lineTo(34 * u, 82 * u);
    g.closePath();
    g.fill();

    // Полоски на стаканчике
    g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    g.lineWidth = 2.2 * u;
    [38, 50, 62].forEach((x) => {
      g.beginPath();
      g.moveTo(x * u, 54 * u);
      g.lineTo((x + (50 - x) * 0.25) * u, 80 * u);
      g.stroke();
    });

    // Воздушный розовый крем
    const creamGrad = g.createRadialGradient(42 * u, 34 * u, 5 * u, 50 * u, 44 * u, 32 * u);
    creamGrad.addColorStop(0, '#ffffff');
    creamGrad.addColorStop(0.55, '#ffc2e0');
    creamGrad.addColorStop(1, '#ff73b9');
    g.fillStyle = creamGrad;
    g.beginPath();
    g.arc(34 * u, 47 * u, 15 * u, 0, Math.PI * 2);
    g.arc(66 * u, 47 * u, 15 * u, 0, Math.PI * 2);
    g.arc(50 * u, 39 * u, 20 * u, 0, Math.PI * 2);
    g.fill();

    // Глянцевая вишенка
    const cherryGrad = g.createRadialGradient(47 * u, 19 * u, 2 * u, 50 * u, 22 * u, 10 * u);
    cherryGrad.addColorStop(0, '#ff9eb5');
    cherryGrad.addColorStop(0.5, '#ff1e56');
    cherryGrad.addColorStop(1, '#9e0028');
    g.fillStyle = cherryGrad;
    g.beginPath();
    g.arc(50 * u, 22 * u, 9.5 * u, 0, Math.PI * 2);
    g.fill();

    // Блик на вишенке
    g.fillStyle = 'rgba(255, 255, 255, 0.92)';
    g.beginPath();
    g.ellipse(46 * u, 18 * u, 3.5 * u, 2 * u, -0.5, 0, Math.PI * 2);
    g.fill();
  }

  // 1. Мятный глянцевый пончик
  function drawMintDonut(g, u) {
    // Тесто
    g.fillStyle = '#f2b872';
    g.beginPath();
    g.arc(50 * u, 52 * u, 34 * u, 0, Math.PI * 2);
    g.fill();

    // Мятная глазурь Frutiger Aero
    const glaze = g.createRadialGradient(38 * u, 34 * u, 6 * u, 50 * u, 50 * u, 35 * u);
    glaze.addColorStop(0, '#d9fff6');
    glaze.addColorStop(0.45, '#3ef0cb');
    glaze.addColorStop(1, '#0d9e89');
    g.fillStyle = glaze;
    g.beginPath();
    g.arc(50 * u, 49 * u, 32 * u, 0, Math.PI * 2);
    g.fill();

    // Дырка в центре (вырезаем)
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(50 * u, 50 * u, 11 * u, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Внутренний ободок теста
    g.strokeStyle = 'rgba(214, 146, 72, 0.7)';
    g.lineWidth = 2.5 * u;
    g.beginPath();
    g.arc(50 * u, 50 * u, 11.5 * u, 0, Math.PI * 2);
    g.stroke();

    // Верхний стеклянный блик
    g.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    g.lineWidth = 5 * u;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(50 * u, 49 * u, 23 * u, -Math.PI * 0.82, -Math.PI * 0.25);
    g.stroke();

    // Цветная посыпка
    const sprinkles = [
      [34, 34, '#ff5ca8'], [66, 36, '#ffe047'], [71, 56, '#ffffff'],
      [32, 62, '#ffe047'], [54, 71, '#ff5ca8']
    ];
    sprinkles.forEach(([x, y, col]) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x * u, y * u, 3.2 * u, 0, Math.PI * 2);
      g.fill();
    });
  }

  // 2. Кусочек ягодного торта
  function drawCakeSlice(g, u) {
    // Бисквит
    const sponge = g.createLinearGradient(20 * u, 40 * u, 80 * u, 80 * u);
    sponge.addColorStop(0, '#fff2c2');
    sponge.addColorStop(1, '#f2c16d');
    g.fillStyle = sponge;
    g.beginPath();
    g.roundRect(18 * u, 42 * u, 64 * u, 38 * u, 7 * u);
    g.fill();

    // Слой крема и джема внутри
    g.fillStyle = '#ffffff';
    g.fillRect(18 * u, 56 * u, 64 * u, 8 * u);
    g.fillStyle = '#ff4d6d';
    g.fillRect(18 * u, 62 * u, 64 * u, 4 * u);

    // Верхняя треугольная крышка с глянцевой глазурью
    const topGrad = g.createLinearGradient(20 * u, 20 * u, 80 * u, 48 * u);
    topGrad.addColorStop(0, '#ffb3c6');
    topGrad.addColorStop(0.5, '#ff477e');
    topGrad.addColorStop(1, '#c9184a');
    g.fillStyle = topGrad;
    g.beginPath();
    g.moveTo(18 * u, 44 * u);
    g.lineTo(52 * u, 22 * u);
    g.lineTo(82 * u, 44 * u);
    g.closePath();
    g.fill();

    // Подтёки глазури
    g.beginPath();
    g.arc(28 * u, 45 * u, 6 * u, 0, Math.PI);
    g.arc(44 * u, 46 * u, 7 * u, 0, Math.PI);
    g.arc(62 * u, 45 * u, 6 * u, 0, Math.PI);
    g.arc(75 * u, 44 * u, 5 * u, 0, Math.PI);
    g.fill();

    // Клубничка сверху
    g.fillStyle = '#ff1e56';
    g.beginPath();
    g.arc(51 * u, 23 * u, 9 * u, 0, Math.PI * 2);
    g.fill();

    // Листик и блик
    g.fillStyle = '#4be03d';
    g.beginPath();
    g.ellipse(57 * u, 16 * u, 5 * u, 2.5 * u, -0.4, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.beginPath();
    g.ellipse(47 * u, 20 * u, 3 * u, 1.8 * u, -0.5, 0, Math.PI * 2);
    g.fill();
  }

  // 3. Лавандовый макарун
  function drawMacaron(g, u) {
    const shellGrad = g.createLinearGradient(20 * u, 24 * u, 80 * u, 76 * u);
    shellGrad.addColorStop(0, '#f3d1ff');
    shellGrad.addColorStop(0.5, '#b85eff');
    shellGrad.addColorStop(1, '#701ec2');

    // Нижняя половинка
    g.fillStyle = shellGrad;
    g.beginPath();
    g.roundRect(16 * u, 56 * u, 68 * u, 22 * u, [4 * u, 4 * u, 18 * u, 18 * u]);
    g.fill();

    // Кремовая начинка
    g.fillStyle = '#fff9ff';
    g.beginPath();
    g.roundRect(14 * u, 45 * u, 72 * u, 14 * u, 7 * u);
    g.fill();

    // Верхняя половинка
    g.fillStyle = shellGrad;
    g.beginPath();
    g.roundRect(16 * u, 24 * u, 68 * u, 24 * u, [20 * u, 20 * u, 5 * u, 5 * u]);
    g.fill();

    // Глянцевый блик Frutiger Aero
    g.fillStyle = 'rgba(255, 255, 255, 0.78)';
    g.beginPath();
    g.ellipse(44 * u, 32 * u, 20 * u, 5.5 * u, -0.1, 0, Math.PI * 2);
    g.fill();
  }

  // 4. Карамельный пудинг (желе)
  function drawPudding(g, u) {
    // Тарелочка
    g.fillStyle = 'rgba(255, 255, 255, 0.92)';
    g.beginPath();
    g.ellipse(50 * u, 79 * u, 36 * u, 9 * u, 0, 0, Math.PI * 2);
    g.fill();

    // Основа пудинга
    const bodyGrad = g.createRadialGradient(42 * u, 44 * u, 6 * u, 50 * u, 58 * u, 36 * u);
    bodyGrad.addColorStop(0, '#fff7b2');
    bodyGrad.addColorStop(0.55, '#ffc83d');
    bodyGrad.addColorStop(1, '#e67e00');
    g.fillStyle = bodyGrad;
    g.beginPath();
    g.moveTo(22 * u, 76 * u);
    g.quadraticCurveTo(26 * u, 30 * u, 50 * u, 28 * u);
    g.quadraticCurveTo(74 * u, 30 * u, 78 * u, 76 * u);
    g.closePath();
    g.fill();

    // Карамельная шапочка
    const carGrad = g.createLinearGradient(30 * u, 24 * u, 70 * u, 48 * u);
    carGrad.addColorStop(0, '#c95f18');
    carGrad.addColorStop(1, '#7a2b00');
    g.fillStyle = carGrad;
    g.beginPath();
    g.moveTo(31 * u, 43 * u);
    g.quadraticCurveTo(36 * u, 24 * u, 50 * u, 24 * u);
    g.quadraticCurveTo(64 * u, 24 * u, 69 * u, 43 * u);
    g.quadraticCurveTo(60 * u, 50 * u, 50 * u, 44 * u);
    g.quadraticCurveTo(40 * u, 50 * u, 31 * u, 43 * u);
    g.fill();

    // Глянцевый блик
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    g.beginPath();
    g.ellipse(42 * u, 34 * u, 9 * u, 4 * u, -0.45, 0, Math.PI * 2);
    g.fill();
  }

  // 5. Черничное аква-пирожное
  function drawBerryTart(g, u) {
    // Песочная корзиночка
    const tartGrad = g.createLinearGradient(20 * u, 52 * u, 80 * u, 80 * u);
    tartGrad.addColorStop(0, '#ffe0a3');
    tartGrad.addColorStop(1, '#d48b3b');
    g.fillStyle = tartGrad;
    g.beginPath();
    g.moveTo(20 * u, 52 * u);
    g.lineTo(80 * u, 52 * u);
    g.lineTo(71 * u, 80 * u);
    g.lineTo(29 * u, 80 * u);
    g.closePath();
    g.fill();

    // Голубой желейный купол
    const domeGrad = g.createRadialGradient(40 * u, 34 * u, 5 * u, 50 * u, 48 * u, 32 * u);
    domeGrad.addColorStop(0, '#dcf8ff');
    domeGrad.addColorStop(0.5, '#33bfff');
    domeGrad.addColorStop(1, '#0965c7');
    g.fillStyle = domeGrad;
    g.beginPath();
    g.arc(50 * u, 52 * u, 28 * u, Math.PI, 0);
    g.closePath();
    g.fill();

    // Ягодка сверху
    g.fillStyle = '#183a9e';
    g.beginPath();
    g.arc(50 * u, 24 * u, 8 * u, 0, Math.PI * 2);
    g.fill();

    // Глянцевые блики
    g.fillStyle = 'rgba(255, 255, 255, 0.88)';
    g.beginPath();
    g.ellipse(39 * u, 37 * u, 11 * u, 4.5 * u, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(47 * u, 21 * u, 2.5 * u, 0, Math.PI * 2);
    g.fill();
  }

  // Радужный тортик (за 5 в ряд)
  function drawRainbowCake(g, u) {
    const layers = [
      { y: 64, h: 14, col: '#ff5ca8' },
      { y: 50, h: 14, col: '#ffbe3b' },
      { y: 36, h: 14, col: '#52e67c' },
      { y: 24, h: 12, col: '#45caff' }
    ];
    layers.forEach((l) => {
      g.fillStyle = l.col;
      g.beginPath();
      g.roundRect(18 * u, l.y * u, 64 * u, l.h * u, 5 * u);
      g.fill();
    });

    // Белый крем сверху
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(16 * u, 20 * u, 68 * u, 10 * u, 5 * u);
    g.fill();

    // Звёздочка-топпер
    g.fillStyle = '#fff59d';
    g.beginPath();
    g.arc(50 * u, 15 * u, 7 * u, 0, Math.PI * 2);
    g.fill();

    // Стеклянный блик по всему тортику
    const gloss = g.createLinearGradient(18 * u, 20 * u, 82 * u, 78 * u);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
    g.fillStyle = gloss;
    g.beginPath();
    g.roundRect(18 * u, 20 * u, 64 * u, 58 * u, 8 * u);
    g.fill();
  }

  function buildSprites() {
    const spriteSize = Math.max(72, Math.ceil(cellPx * dpr));
    sprites = Array.from({ length: GEM_TYPES }, (_, i) => createDessertSprite(i, spriteSize, 'normal'));
    specialSprites = Array.from({ length: GEM_TYPES }, (_, i) => createDessertSprite(i, spriteSize, 'line'));
    rainbowSprite = createDessertSprite(0, spriteSize, 'rainbow');
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

  // ===== СОЗДАНИЕ ДЕСЕРТА С ЖЕЛЕЙНОЙ ФИЗИКОЙ =====
  function createGem(r, c, type, startYOffset = 0, special = null) {
    return {
      type,
      special,
      r,
      c,
      x: c * cellPx + cellPx / 2,
      y: (r + startYOffset) * cellPx + cellPx / 2,
      vy: 0,
      scaleX: 1,
      scaleY: 1,
      velSX: 0,
      velSY: 0,
      phase: Math.random() * Math.PI * 2
    };
  }

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
        board[r][c] = createGem(r, c, type, -GRID_SIZE * 0.45 - Math.random() * 1.5);
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

        for (const [nr, nc] of [[r, c + 1], [r + 1, c]]) {
          if (nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
          const g2 = board[nr][nc];
          if (!g2) continue;
          if (g1.special === 'rainbow' || g2.special === 'rainbow') {
            return [{ r, c }, { r: nr, c: nc }];
          }
          board[r][c] = g2;
          board[nr][nc] = g1;
          const hasMatch = findMatches().matched.length > 0;
          board[r][c] = g1;
          board[nr][nc] = g2;
          if (hasMatch) return [{ r, c }, { r: nr, c: nc }];
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

  // ===== ОБМЕН И ОБРАБОТКА =====
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

    swapData = { g1, g2, r1: c1.r, c1: c1.c, r2: c2.r, c2: c2.c, t: 0, duration: 0.17 };
    state = 'SWAPPING';
  }

  function finishSwap() {
    const { g1, g2, r1, c1, r2, c2 } = swapData;
    board[r1][c1] = g2;
    board[r2][c2] = g1;
    g1.r = r2; g1.c = c2;
    g2.r = r1; g2.c = c1;

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

    const finalClear = new Set(matched);
    for (const gem of matched) {
      if (gem.special === 'line') {
        for (let i = 0; i < GRID_SIZE; i++) {
          if (board[gem.r][i]) finalClear.add(board[gem.r][i]);
          if (board[i][gem.c]) finalClear.add(board[i][gem.c]);
        }
      }
    }

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

    let avgX = 0;
    let avgY = 0;
    for (const gem of clearedArr) {
      avgX += gem.x;
      avgY += gem.y;
      spawnSplash(gem.x, gem.y, DESSERT_COLORS[gem.type]);
      board[gem.r][gem.c] = null;
    }
    avgX /= clearedArr.length;
    avgY /= clearedArr.length;
    spawnScoreText(avgX, avgY, `+${gained}${combo > 1 ? ` x${combo}` : ''}`);

    for (const sp of spawns) {
      const bonus = createGem(sp.r, sp.c, sp.type, 0, sp.special);
      squishGem(bonus, 1.35, 0.72);
      board[sp.r][sp.c] = bonus;
    }

    if (combo >= 3 || clearedArr.length >= 5) {
      sayMascot('combo', true);
    } else if (clearedArr.length >= 4 || combo === 2) {
      sayMascot('good', true);
    }

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

  function spawnSplash(x, y, color) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 70 + Math.random() * 140;
      particles.push({
        x, y,
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

  function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
    comboEl.textContent = `x${Math.max(1, combo)}`;
    comboBarEl.style.width = `${Math.min(100, combo * 25)}%`;
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

  // ===== ВВОД =====
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
      if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
      else nr += dy > 0 ? 1 : -1;

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

  // ===== ИГРОВОЙ ЦИКЛ =====
  function update(dt) {
    elapsedTime += dt;

    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) hintPair = null;
    }

    const stiffness = 240;
    const damping = 14;
    let anyMoving = false;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        gem.velSX += (1 - gem.scaleX) * stiffness * dt;
        gem.velSY += (1 - gem.scaleY) * stiffness * dt;
        gem.velSX *= Math.max(0, 1 - damping * dt);
        gem.velSY *= Math.max(0, 1 - damping * dt);
        gem.scaleX += gem.velSX * dt;
        gem.scaleY += gem.velSY * dt;

        if (state === 'FALLING') {
          const targetX = c * cellPx + cellPx / 2;
          const targetY = r * cellPx + cellPx / 2;
          gem.x = targetX;

          if (gem.y < targetY) {
            gem.vy += 2100 * dt;
            gem.y += gem.vy * dt;
            anyMoving = true;

            gem.scaleX = 0.92;
            gem.scaleY = 1.09;

            if (gem.y >= targetY) {
              gem.y = targetY;
              const impact = Math.min(0.28, gem.vy / 2600);
              gem.vy = 0;
              squishGem(gem, 1 + impact, 1 - impact * 0.9);
            }
          }
        }
      }
    }

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

    if (state === 'FALLING' && !anyMoving) {
      const { matched, groups } = findMatches();
      if (matched.length > 0) {
        popGems(matched, groups);
      } else {
        state = 'IDLE';
        if (!findFirstValidMove()) shuffleBoard(true);
      }
    }

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

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.fillStyle = (r + c) % 2 === 0
          ? 'rgba(255, 255, 255, 0.42)'
          : 'rgba(195, 236, 255, 0.25)';
        ctx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      }
    }

    if (hintPair) {
      const pulse = 0.45 + 0.35 * Math.sin(elapsedTime * 8);
      ctx.fillStyle = `rgba(140, 245, 45, ${pulse})`;
      for (const cell of hintPair) {
        ctx.beginPath();
        ctx.roundRect(cell.c * cellPx + 3, cell.r * cellPx + 3, cellPx - 6, cellPx - 6, 12);
        ctx.fill();
      }
    }

    if (selected) {
      const pulse = 0.55 + 0.25 * Math.sin(elapsedTime * 7);
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse + 0.2})`;
      ctx.fillStyle = `rgba(255, 138, 200, ${pulse * 0.42})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(selected.c * cellPx + 3, selected.r * cellPx + 3, cellPx - 6, cellPx - 6, 12);
      ctx.fill();
      ctx.stroke();
    }

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

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  initBoard();
  updateMusicBtn();
  requestAnimationFrame(loop);
})();
