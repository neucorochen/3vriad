(() => {
  const GRID_SIZE = 8;
  const GEM_TYPES = 6;

  // Цвета брызг-глазури для каждого десерта
  const DESSERT_COLORS = [
    '#ff6bb5', // 0: Клубничный кекс
    '#34f0c8', // 1: Мятный пончик
    '#ff5c77', // 2: Кусочек торта
    '#c06bff', // 3: Лавандовый макарун
    '#ffba3b', // 4: Карамельный пудинг
    '#3dc2ff'  // 5: Черничное пирожное
  ];

  const MASCOT_LINES = {
    idle: [
      'Собери 3 вкусняшки в ряд!',
      'Кексики и тортики такие желейные!',
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
  let floatingTexts = [];
  let sprites = [];
  let specialSprites = [];
  let rainbowSprite = null;

  let boardPx = 480;
  let cellPx = 60;
  let dpr = 1;

  let score = 0;
  let bestScore = Storage.getBestScore();
  let combo = 0;
  let state = 'IDLE'; // IDLE | SWAPPING | REVERTING | POPPING | FALLING
  let selected = null;
  let hintPair = null;
  let hintTimer = 0;
  let swapData = null;
  let popData = null;

  let pointerDown = false;
  let dragStartCell = null;
  let dragStartPos = null;

  let lastTime = 0;
  let elapsedTime = 0;

  // ===== ДЕТАЛИЗИРОВАННЫЕ ЖЕЛЕЙНЫЕ ДЕСЕРТЫ (КЕШИРУЮТСЯ В СПРАЙТЫ) =====
  function createDessertSprite(type, size, mode = 'normal') {
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    const c = size / 2;
    const u = size / 100;

    // Мягкая тень под десертом
    g.fillStyle = 'rgba(16, 78, 122, 0.22)';
    g.beginPath();
    g.ellipse(c, 85 * u, 31 * u, 8.5 * u, 0, 0, Math.PI * 2);
    g.fill();

    // Сияющий ореол для спец-десертов
    if (mode === 'line' || mode === 'rainbow') {
      const aura = g.createRadialGradient(c, c, 10 * u, c, c, 48 * u);
      aura.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
      aura.addColorStop(0.65, mode === 'rainbow' ? 'rgba(255, 160, 230, 0.55)' : 'rgba(120, 235, 255, 0.5)');
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

    // Искорка-значок для 4-в-ряд
    if (mode === 'line') {
      g.save();
      g.translate(77 * u, 23 * u);
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#18a8f5';
      g.lineWidth = 2.6 * u;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        g.lineTo(Math.cos(a) * 14 * u, Math.sin(a) * 14 * u);
        g.lineTo(Math.cos(a + Math.PI / 4) * 5 * u, Math.sin(a + Math.PI / 4) * 5 * u);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }

    return off;
  }

  // 0. Клубничный желейный кекс
  function drawCupcake(g, u) {
    // Рифлёный стаканчик
    const cupGrad = g.createLinearGradient(24 * u, 50 * u, 76 * u, 83 * u);
    cupGrad.addColorStop(0, '#ffa3d1');
    cupGrad.addColorStop(0.5, '#ff4d9e');
    cupGrad.addColorStop(1, '#b81462');
    g.fillStyle = cupGrad;
    g.beginPath();
    g.moveTo(25 * u, 52 * u);
    g.lineTo(75 * u, 52 * u);
    g.lineTo(67 * u, 82 * u);
    g.quadraticCurveTo(50 * u, 86 * u, 33 * u, 82 * u);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    g.lineWidth = 2 * u;
    g.stroke();

    // Полоски на стаканчике
    g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    g.lineWidth = 2.4 * u;
    [36, 45, 55, 64].forEach((x) => {
      g.beginPath();
      g.moveTo(x * u, 54 * u);
      g.lineTo((x + (50 - x) * 0.24) * u, 81 * u);
      g.stroke();
    });

    // Желейная кремовая шапочка (2 яруса)
    const creamGrad = g.createRadialGradient(40 * u, 30 * u, 5 * u, 50 * u, 44 * u, 34 * u);
    creamGrad.addColorStop(0, '#ffffff');
    creamGrad.addColorStop(0.42, '#ffd1ea');
    creamGrad.addColorStop(0.82, '#ff73b9');
    creamGrad.addColorStop(1, '#e03e90');
    g.fillStyle = creamGrad;

    g.beginPath();
    g.arc(32 * u, 48 * u, 14 * u, 0, Math.PI * 2);
    g.arc(68 * u, 48 * u, 14 * u, 0, Math.PI * 2);
    g.arc(50 * u, 46 * u, 17 * u, 0, Math.PI * 2);
    g.arc(50 * u, 35 * u, 16 * u, 0, Math.PI * 2);
    g.fill();

    // Глянцевый блик на креме
    g.fillStyle = 'rgba(255, 255, 255, 0.72)';
    g.beginPath();
    g.ellipse(41 * u, 36 * u, 11 * u, 5 * u, -0.35, 0, Math.PI * 2);
    g.fill();

    // Посыпка на креме
    [[34, 47, '#fff275'], [64, 46, '#75f5ff'], [56, 39, '#ffffff']].forEach(([x, y, col]) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x * u, y * u, 2.6 * u, 0, Math.PI * 2);
      g.fill();
    });

    // Глянцевая вишенка
    const cherryGrad = g.createRadialGradient(47 * u, 18 * u, 2 * u, 50 * u, 22 * u, 11 * u);
    cherryGrad.addColorStop(0, '#ffb8c9');
    cherryGrad.addColorStop(0.45, '#ff1752');
    cherryGrad.addColorStop(1, '#8f0024');
    g.fillStyle = cherryGrad;
    g.beginPath();
    g.arc(50 * u, 22 * u, 10 * u, 0, Math.PI * 2);
    g.fill();

    // Блик на вишенке
    g.fillStyle = 'rgba(255, 255, 255, 0.95)';
    g.beginPath();
    g.ellipse(46 * u, 18 * u, 3.8 * u, 2.2 * u, -0.5, 0, Math.PI * 2);
    g.fill();
  }

  // 1. Мятный глянцевый пончик
  function drawMintDonut(g, u) {
    // Румяное тесто
    const dough = g.createRadialGradient(44 * u, 46 * u, 12 * u, 50 * u, 52 * u, 36 * u);
    dough.addColorStop(0, '#ffe0a8');
    dough.addColorStop(0.75, '#eba85b');
    dough.addColorStop(1, '#c77c30');
    g.fillStyle = dough;
    g.beginPath();
    g.arc(50 * u, 52 * u, 35 * u, 0, Math.PI * 2);
    g.fill();

    // Желейная мятная глазурь
    const glaze = g.createRadialGradient(36 * u, 32 * u, 5 * u, 50 * u, 49 * u, 35 * u);
    glaze.addColorStop(0, '#e3fff8');
    glaze.addColorStop(0.42, '#40f5cf');
    glaze.addColorStop(0.85, '#0fb89d');
    glaze.addColorStop(1, '#078577');
    g.fillStyle = glaze;
    g.beginPath();
    g.arc(50 * u, 49 * u, 32.5 * u, 0, Math.PI * 2);
    g.fill();

    // Вырез в центре
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(50 * u, 50 * u, 11 * u, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Внутренний глянцевый ободок
    g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    g.lineWidth = 2.2 * u;
    g.beginPath();
    g.arc(50 * u, 50 * u, 11.5 * u, 0, Math.PI * 2);
    g.stroke();

    // Яркий стеклянный блик дугой
    g.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    g.lineWidth = 5.5 * u;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(50 * u, 49 * u, 23 * u, -Math.PI * 0.84, -Math.PI * 0.24);
    g.stroke();

    // Цветная глянцевая посыпка
    const sprinkles = [
      [32, 36, '#ff5ca8', 0.4], [67, 36, '#ffe552', -0.5], [72, 57, '#ffffff', 0.8],
      [31, 61, '#ffe552', -0.3], [52, 72, '#ff5ca8', 0.2], [44, 27, '#ffffff', -0.2]
    ];
    sprinkles.forEach(([x, y, col, rot]) => {
      g.save();
      g.translate(x * u, y * u);
      g.rotate(rot);
      g.fillStyle = col;
      g.beginPath();
      g.roundRect(-4 * u, -2 * u, 8 * u, 4 * u, 2 * u);
      g.fill();
      g.restore();
    });
  }

  // 2. Кусочек клубничного торта
  function drawCakeSlice(g, u) {
    // Бисквит
    const sponge = g.createLinearGradient(18 * u, 42 * u, 82 * u, 82 * u);
    sponge.addColorStop(0, '#fff7cc');
    sponge.addColorStop(0.6, '#ffd885');
    sponge.addColorStop(1, '#e6a345');
    g.fillStyle = sponge;
    g.beginPath();
    g.roundRect(17 * u, 43 * u, 66 * u, 38 * u, 8 * u);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    g.lineWidth = 2 * u;
    g.stroke();

    // Прослойка взбитых сливок и ягодного желе
    g.fillStyle = '#ffffff';
    g.fillRect(18 * u, 56 * u, 64 * u, 7.5 * u);
    g.fillStyle = '#ff3b6b';
    g.fillRect(18 * u, 62.5 * u, 64 * u, 4.5 * u);

    // Верхняя глянцевая крышка с глазурью
    const topGrad = g.createLinearGradient(18 * u, 20 * u, 82 * u, 48 * u);
    topGrad.addColorStop(0, '#ffc2d4');
    topGrad.addColorStop(0.48, '#ff477e');
    topGrad.addColorStop(1, '#b81144');
    g.fillStyle = topGrad;
    g.beginPath();
    g.moveTo(16 * u, 45 * u);
    g.lineTo(50 * u, 20 * u);
    g.lineTo(84 * u, 45 * u);
    g.closePath();
    g.fill();

    // Желейные подтёки глазури
    g.beginPath();
    g.arc(27 * u, 46 * u, 6.5 * u, 0, Math.PI);
    g.arc(43 * u, 47 * u, 7.5 * u, 0, Math.PI);
    g.arc(61 * u, 46 * u, 6.5 * u, 0, Math.PI);
    g.arc(75 * u, 45 * u, 5.5 * u, 0, Math.PI);
    g.fill();

    // Блик на глазури
    g.fillStyle = 'rgba(255, 255, 255, 0.55)';
    g.beginPath();
    g.ellipse(42 * u, 35 * u, 13 * u, 4 * u, -0.35, 0, Math.PI * 2);
    g.fill();

    // Глянцевая клубничка сверху
    const berryGrad = g.createRadialGradient(47 * u, 19 * u, 2 * u, 51 * u, 23 * u, 11 * u);
    berryGrad.addColorStop(0, '#ff9eb5');
    berryGrad.addColorStop(0.5, '#ff174e');
    berryGrad.addColorStop(1, '#990026');
    g.fillStyle = berryGrad;
    g.beginPath();
    g.arc(51 * u, 23 * u, 9.5 * u, 0, Math.PI * 2);
    g.fill();

    // Листик и блик
    g.fillStyle = '#4be03d';
    g.beginPath();
    g.ellipse(58 * u, 16 * u, 5.5 * u, 2.8 * u, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.92)';
    g.beginPath();
    g.ellipse(47 * u, 19 * u, 3.2 * u, 2 * u, -0.5, 0, Math.PI * 2);
    g.fill();
  }

  // 3. Лавандовый желейный макарун
  function drawMacaron(g, u) {
    const shellGrad = g.createLinearGradient(16 * u, 22 * u, 84 * u, 78 * u);
    shellGrad.addColorStop(0, '#f7dbff');
    shellGrad.addColorStop(0.45, '#be63ff');
    shellGrad.addColorStop(1, '#6c18bf');

    // Нижняя половинка
    g.fillStyle = shellGrad;
    g.beginPath();
    g.roundRect(15 * u, 56 * u, 70 * u, 23 * u, [5 * u, 5 * u, 20 * u, 20 * u]);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    g.lineWidth = 2 * u;
    g.stroke();

    // Кремовая начинка с волнистым краем
    const cream = g.createLinearGradient(14 * u, 44 * u, 14 * u, 60 * u);
    cream.addColorStop(0, '#ffffff');
    cream.addColorStop(1, '#f2d9ff');
    g.fillStyle = cream;
    g.beginPath();
    g.roundRect(13 * u, 44 * u, 74 * u, 15 * u, 7.5 * u);
    g.fill();

    // Верхняя половинка
    g.fillStyle = shellGrad;
    g.beginPath();
    g.roundRect(15 * u, 22 * u, 70 * u, 25 * u, [22 * u, 22 * u, 5 * u, 5 * u]);
    g.fill();
    g.stroke();

    // Яркий стеклянный блик Frutiger Aero
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    g.beginPath();
    g.ellipse(43 * u, 31 * u, 21 * u, 5.8 * u, -0.08, 0, Math.PI * 2);
    g.fill();
  }

  // 4. Карамельный пудинг-желе
  function drawPudding(g, u) {
    // Стеклянная тарелочка
    g.fillStyle = 'rgba(255, 255, 255, 0.94)';
    g.beginPath();
    g.ellipse(50 * u, 79 * u, 37 * u, 9.5 * u, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(130, 210, 255, 0.65)';
    g.lineWidth = 2 * u;
    g.stroke();

    // Полупрозрачное тело пудинга
    const bodyGrad = g.createRadialGradient(40 * u, 42 * u, 5 * u, 50 * u, 58 * u, 38 * u);
    bodyGrad.addColorStop(0, '#fffbd1');
    bodyGrad.addColorStop(0.5, '#ffcf40');
    bodyGrad.addColorStop(1, '#e67800');
    g.fillStyle = bodyGrad;
    g.beginPath();
    g.moveTo(21 * u, 76 * u);
    g.quadraticCurveTo(25 * u, 28 * u, 50 * u, 26 * u);
    g.quadraticCurveTo(75 * u, 28 * u, 79 * u, 76 * u);
    g.closePath();
    g.fill();

    // Глянцевая карамельная шапочка
    const carGrad = g.createLinearGradient(28 * u, 22 * u, 72 * u, 50 * u);
    carGrad.addColorStop(0, '#d9691a');
    carGrad.addColorStop(0.55, '#9e3b00');
    carGrad.addColorStop(1, '#662000');
    g.fillStyle = carGrad;
    g.beginPath();
    g.moveTo(30 * u, 43 * u);
    g.quadraticCurveTo(35 * u, 22 * u, 50 * u, 22 * u);
    g.quadraticCurveTo(65 * u, 22 * u, 70 * u, 43 * u);
    g.quadraticCurveTo(60 * u, 52 * u, 50 * u, 45 * u);
    g.quadraticCurveTo(40 * u, 52 * u, 30 * u, 43 * u);
    g.fill();

    // Два стеклянных блика
    g.fillStyle = 'rgba(255, 255, 255, 0.88)';
    g.beginPath();
    g.ellipse(41 * u, 32 * u, 10 * u, 4.2 * u, -0.42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.55)';
    g.beginPath();
    g.ellipse(33 * u, 60 * u, 5 * u, 10 * u, 0.15, 0, Math.PI * 2);
    g.fill();
  }

  // 5. Черничное аква-пирожное
  function drawBerryTart(g, u) {
    // Песочная корзиночка
    const tartGrad = g.createLinearGradient(19 * u, 52 * u, 81 * u, 81 * u);
    tartGrad.addColorStop(0, '#ffe6b3');
    tartGrad.addColorStop(0.6, '#e39e4b');
    tartGrad.addColorStop(1, '#b56c24');
    g.fillStyle = tartGrad;
    g.beginPath();
    g.moveTo(19 * u, 52 * u);
    g.lineTo(81 * u, 52 * u);
    g.lineTo(72 * u, 81 * u);
    g.lineTo(28 * u, 81 * u);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    g.lineWidth = 2 * u;
    g.stroke();

    // Желейный аква-купол
    const domeGrad = g.createRadialGradient(38 * u, 32 * u, 4 * u, 50 * u, 48 * u, 33 * u);
    domeGrad.addColorStop(0, '#e3fbff');
    domeGrad.addColorStop(0.45, '#38c7ff');
    domeGrad.addColorStop(0.85, '#0b7be0');
    domeGrad.addColorStop(1, '#054a9e');
    g.fillStyle = domeGrad;
    g.beginPath();
    g.arc(50 * u, 52 * u, 29 * u, Math.PI, 0);
    g.closePath();
    g.fill();

    // Черничка сверху
    const blueGrad = g.createRadialGradient(47 * u, 21 * u, 2 * u, 50 * u, 24 * u, 9 * u);
    blueGrad.addColorStop(0, '#9eb8ff');
    blueGrad.addColorStop(0.5, '#2b50cc');
    blueGrad.addColorStop(1, '#102270');
    g.fillStyle = blueGrad;
    g.beginPath();
    g.arc(50 * u, 24 * u, 8.5 * u, 0, Math.PI * 2);
    g.fill();

    // Глянцевые блики
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.beginPath();
    g.ellipse(38 * u, 37 * u, 12 * u, 4.8 * u, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(47 * u, 21 * u, 2.8 * u, 0, Math.PI * 2);
    g.fill();
  }

  // Радужный тортик (за 5 в ряд)
  function drawRainbowCake(g, u) {
    const layers = [
      { y: 65, h: 14, col: '#ff5ca8' },
      { y: 51, h: 14, col: '#ffbe3b' },
      { y: 37, h: 14, col: '#4be674' },
      { y: 24, h: 13, col: '#3bc4ff' }
    ];
    layers.forEach((l) => {
      g.fillStyle = l.col;
      g.beginPath();
      g.roundRect(17 * u, l.y * u, 66 * u, l.h * u, 5 * u);
      g.fill();
    });

    // Белый крем сверху
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(15 * u, 19 * u, 70 * u, 11 * u, 5.5 * u);
    g.fill();

    // Сияющая звёздочка-топпер
    g.fillStyle = '#fff176';
    g.beginPath();
    g.arc(50 * u, 14 * u, 7.5 * u, 0, Math.PI * 2);
    g.fill();

    // Стеклянный блик
    const gloss = g.createLinearGradient(17 * u, 19 * u, 83 * u, 79 * u);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
    g.fillStyle = gloss;
    g.beginPath();
    g.roundRect(17 * u, 19 * u, 66 * u, 60 * u, 8 * u);
    g.fill();
  }

  function buildSprites() {
    const spriteSize = Math.max(84, Math.ceil(cellPx * dpr));
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
      rot: 0,
      velRot: 0,
      alpha: 1,
      popping: false,
      phase: Math.random() * Math.PI * 2
    };
  }

  function squishGem(gem, sx, sy, rotImpulse = 0) {
    if (!gem) return;
    gem.scaleX = sx;
    gem.scaleY = sy;
    if (rotImpulse) gem.velRot += rotImpulse;
  }

  // Желейная волна по соседям
  function jiggleNeighbors(r, c, strength = 0.14) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const nb = board[nr][nc];
        if (nb && !nb.popping) {
          squishGem(nb, 1 + strength, 1 - strength * 0.85, (Math.random() - 0.5) * 4);
        }
      }
    }
  }

  // ===== ИНИЦИАЛИЗАЦИЯ И ЗАЩИТА ОТ ПУСТЫХ КЛЕТОК =====
  function initBoard() {
    board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    particles = [];
    floatingTexts = [];
    score = 0;
    combo = 0;
    selected = null;
    hintPair = null;
    swapData = null;
    popData = null;
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
        board[r][c] = createGem(r, c, type, -GRID_SIZE * 0.4 - Math.random() * 1.4);
      }
    }

    if (!findFirstValidMove()) shuffleBoard(false);
    state = 'FALLING';
    updateHUD();
    sayMascot('idle', false);
  }

  // Гарантирует отсутствие «дыр» и сбитых координат
  function ensureBoardIntegrity() {
    let hadNull = false;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) {
          hadNull = true;
        } else {
          gem.r = r;
          gem.c = c;
          gem.x = c * cellPx + cellPx / 2;
          gem.y = r * cellPx + cellPx / 2;
          gem.vy = 0;
        }
      }
    }
    if (hadNull) applyGravity();
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
          squishGem(board[r][c], 1.28, 0.75, (Math.random() - 0.5) * 6);
        }
      }
      if (findMatches().matched.length === 0 && findFirstValidMove()) break;
    }

    if (announce) {
      sayMascot('shuffle', true);
      AeroAudio.playSquish(1.3);
    }
  }

  // ===== ОБМЕН И ПЛАВНОЕ ЖЕЛЕЙНОЕ ЛОПАНИЕ =====
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
    squishGem(g1, 1.24, 0.78, 3.5);
    squishGem(g2, 0.78, 1.24, -3.5);

    swapData = { g1, g2, r1: c1.r, c1: c1.c, r2: c2.r, c2: c2.c, t: 0, duration: 0.16 };
    state = 'SWAPPING';
  }

  function finishSwap() {
    const { g1, g2, r1, c1, r2, c2 } = swapData;
    board[r1][c1] = g2;
    board[r2][c2] = g1;
    g1.r = r2; g1.c = c2;
    g2.r = r1; g2.c = c1;
    g1.x = c2 * cellPx + cellPx / 2;
    g1.y = r2 * cellPx + cellPx / 2;
    g2.x = c1 * cellPx + cellPx / 2;
    g2.y = r1 * cellPx + cellPx / 2;

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
      beginPopGems(toClear, []);
      return;
    }

    const { matched, groups } = findMatches();
    if (matched.length > 0) {
      swapData = null;
      beginPopGems(matched, groups, g1);
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

  function beginPopGems(matched, groups, pivotGem = null) {
    combo++;
    state = 'POPPING';

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
      gem.popping = true;
      avgX += gem.x;
      avgY += gem.y;
      jiggleNeighbors(gem.r, gem.c, 0.12);
    }
    avgX /= clearedArr.length;
    avgY /= clearedArr.length;

    floatingTexts.push({
      x: avgX,
      y: avgY,
      text: `+${gained}${combo > 1 ? ` x${combo}` : ''}`,
      life: 0.85,
      maxLife: 0.85
    });

    if (combo >= 3 || clearedArr.length >= 5) {
      sayMascot('combo', true);
    } else if (clearedArr.length >= 4 || combo === 2) {
      sayMascot('good', true);
    }

    popData = {
      gems: clearedArr,
      spawns,
      t: 0,
      duration: 0.16
    };
  }

  function finishPopGems() {
    const { gems, spawns } = popData;
    for (const gem of gems) {
      spawnSplash(gem.x, gem.y, DESSERT_COLORS[gem.type]);
      if (board[gem.r]?.[gem.c] === gem) {
        board[gem.r][gem.c] = null;
      }
    }

    for (const sp of spawns) {
      const bonus = createGem(sp.r, sp.c, sp.type, 0, sp.special);
      squishGem(bonus, 1.38, 0.68, 4);
      board[sp.r][sp.c] = bonus;
    }

    popData = null;
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
            gem.vy = Math.max(gem.vy, 160);
          }
          writeRow--;
        }
      }

      let spawnStep = 1;
      for (let r = writeRow; r >= 0; r--) {
        const type = Math.floor(Math.random() * GEM_TYPES);
        const gem = createGem(r, c, type, -(writeRow - r + spawnStep) * 1.08);
        gem.vy = 180;
        board[r][c] = gem;
        spawnStep += 0.22;
      }
    }

    state = 'FALLING';
  }

  function spawnSplash(x, y, color) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 75 + Math.random() * 145;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        r: 3 + Math.random() * 4.5,
        life: 0.42 + Math.random() * 0.2,
        maxLife: 0.62,
        color
      });
    }
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
    squishGem(gem, 1.24, 0.78, (Math.random() - 0.5) * 4);
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
    const threshold = cellPx * 0.32;

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

    // Упругая желейная пружина (масштаб + лёгкий наклон)
    const stiffness = 260;
    const damping = 12;
    let anyMoving = false;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        if (!gem.popping) {
          gem.velSX += (1 - gem.scaleX) * stiffness * dt;
          gem.velSY += (1 - gem.scaleY) * stiffness * dt;
          gem.velSX *= Math.max(0, 1 - damping * dt);
          gem.velSY *= Math.max(0, 1 - damping * dt);
          gem.scaleX += gem.velSX * dt;
          gem.scaleY += gem.velSY * dt;

          gem.velRot += (0 - gem.rot) * 180 * dt;
          gem.velRot *= Math.max(0, 1 - 10 * dt);
          gem.rot += gem.velRot * dt;
        }

        if (state === 'FALLING') {
          const targetX = c * cellPx + cellPx / 2;
          const targetY = r * cellPx + cellPx / 2;
          gem.x = targetX;

          if (gem.y < targetY) {
            gem.vy += 2400 * dt;
            gem.y += gem.vy * dt;

            gem.scaleX = 0.89;
            gem.scaleY = 1.13;

            if (gem.y >= targetY) {
              gem.y = targetY;
              const impact = Math.min(0.32, gem.vy / 2300);
              gem.vy = 0;
              squishGem(gem, 1 + impact, 1 - impact * 0.88, (Math.random() - 0.5) * 3.5);
            } else {
              anyMoving = true;
            }
          }
        }
      }
    }

    // Анимация надувания и лопания
    if (state === 'POPPING' && popData) {
      popData.t += dt / popData.duration;
      const p = Math.min(1, popData.t);
      for (const gem of popData.gems) {
        if (p < 0.45) {
          const k = p / 0.45;
          gem.scaleX = 1 + 0.28 * k;
          gem.scaleY = 1 + 0.28 * k;
          gem.alpha = 1;
        } else {
          const k = (p - 0.45) / 0.55;
          gem.scaleX = 1.28 * (1 - k);
          gem.scaleY = 1.28 * (1 - k);
          gem.alpha = 1 - k;
        }
      }
      if (p >= 1) finishPopGems();
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

    // Завершение падения -> проверка каскадов и целостности
    if (state === 'FALLING' && !anyMoving) {
      ensureBoardIntegrity();
      if (state === 'FALLING') {
        const { matched, groups } = findMatches();
        if (matched.length > 0) {
          beginPopGems(matched, groups);
        } else {
          state = 'IDLE';
          if (!findFirstValidMove()) shuffleBoard(true);
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
      pt.vy += 450 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }

    // Всплывающие очки на Canvas
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      ft.y -= 48 * dt;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, boardPx, boardPx);

    // Стеклянная сетка
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.fillStyle = (r + c) % 2 === 0
          ? 'rgba(255, 255, 255, 0.44)'
          : 'rgba(195, 236, 255, 0.26)';
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
      ctx.fillStyle = `rgba(255, 138, 200, ${pulse * 0.42})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(selected.c * cellPx + 3, selected.r * cellPx + 3, cellPx - 6, cellPx - 6, 12);
      ctx.fill();
      ctx.stroke();
    }

    // Отрисовка десертов
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        const isSel = selected && selected.r === r && selected.c === c;
        const idleWave = gem.popping
          ? 0
          : isSel
            ? Math.sin(elapsedTime * 10) * 0.08
            : Math.sin(elapsedTime * 2.4 + gem.phase) * 0.022;

        const sx = gem.scaleX + idleWave;
        const sy = gem.scaleY - idleWave;

        let sprite = sprites[gem.type];
        if (gem.special === 'line') sprite = specialSprites[gem.type];
        if (gem.special === 'rainbow') sprite = rainbowSprite;

        ctx.save();
        ctx.globalAlpha = gem.alpha;
        ctx.translate(gem.x, gem.y);
        ctx.rotate(gem.rot * 0.08);
        ctx.scale(sx, sy);
        ctx.drawImage(sprite, -cellPx / 2, -cellPx / 2, cellPx, cellPx);
        ctx.restore();
      }
    }

    // Брызги глазури
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

    // Всплывающие очки
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(16, Math.round(cellPx * 0.34))}px Nunito, sans-serif`;
    for (const ft of floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(150, 32, 95, 0.8)';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ft.text, ft.x, ft.y);
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
