(() => {
  // =========================
  // CONFIG (FAST)
  // =========================
  const GRID_SIZE = 9;          // 3x3
  const ROUND_SECONDS = 30;

  // ✅ fast like before
  const POP_MIN = 260;
  const POP_MAX = 600;

  const STAY_MIN = 360;
  const STAY_MAX = 720;

  const DIFFICULTY_EVERY_SEC = 6;
  const DIFFICULTY_STEP = 0.92;

  // =========================
  // SKINS (match your folder)
  // =========================
  const SKINS = [
    { id: "adeniyi", file: "adeniyi.png" },
    { id: "angelo",  file: "angelo.png" },
    { id: "axol",    file: "axol.png" },
    { id: "bard",    file: "bard.png" },
    { id: "beeg",    file: "beeg.png" },
    { id: "blub",    file: "blub.png" },
    { id: "brat",    file: "brat.png" },
    { id: "clean",   file: "clean.png" },
    { id: "dan",     file: "dan.png" },
    { id: "dave",    file: "dave.png" },
    { id: "david",   file: "david.png" },
    { id: "death",   file: "death.png" },
    { id: "doby",    file: "doby.png" },
    { id: "eyezen",  file: "eyezen.png" },
    { id: "gawb",    file: "gawb.png" },
    { id: "iroh",    file: "iroh.png" },
    { id: "kazuto",  file: "kazuto.png" },
    { id: "kriss",   file: "kriss.png" },
    { id: "legend",  file: "legend.png" },
    { id: "lofi",    file: "lofi.png" },
    { id: "matteo",  file: "matteo.png" },
    { id: "mike",    file: "mike.png" },
    { id: "mrbread", file: "mrbread.png" },
    { id: "nefarii", file: "nefarii.png" },
    { id: "ninja",   file: "ninja.png" },
    { id: "sca",     file: "sca.png" },
    { id: "van",     file: "van.png" },
    { id: "wara",    file: "wara.png" },
    { id: "xp",      file: "xp.png" },
    { id: "yuppi",   file: "yuppi.png" },
  ];

  // =========================
  // STORAGE
  // =========================
  const HIGH_KEY = "whack_beeg_high";
  const SKIN_KEY = "whack_beeg_skin";
  const getHigh = () => Number(localStorage.getItem(HIGH_KEY) || "0");
  const setHigh = (v) => localStorage.setItem(HIGH_KEY, String(v));
  const getSavedSkinId = () => localStorage.getItem(SKIN_KEY) || "";
  const saveSkinId = (id) => localStorage.setItem(SKIN_KEY, id);

  // =========================
  // DOM
  // =========================
  const grid = document.getElementById("grid");
  const scoreEl = document.getElementById("score");
  const timeEl  = document.getElementById("time");
  const highEl  = document.getElementById("high");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const newBtn   = document.getElementById("newBtn");
  const skinsBtn = document.getElementById("skinsBtn");

  // Result overlay
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const resultSkinImg = document.getElementById("resultSkinImg");
  const resultScore = document.getElementById("resultScore");
  const resultHigh  = document.getElementById("resultHigh");
  const restartBtnOverlay = document.getElementById("restartBtnOverlay");
  const skinsBtnOverlay = document.getElementById("skinsBtnOverlay");
  const closeBtn = document.getElementById("closeBtn");

  // Skins overlay
  const skinsOverlay = document.getElementById("skinsOverlay");
  const skinsGrid = document.getElementById("skinsGrid");
  const skinsDoneBtn = document.getElementById("skinsDoneBtn");

  // =========================
  // STATE
  // =========================
  let holes = [];
  let score = 0;
  let timeLeft = ROUND_SECONDS;

  let running = false;
  let paused = false;

  let activeHole = -1;
  let token = 0;
  let timer = null;

  let popMin = POP_MIN, popMax = POP_MAX;
  let stayMin = STAY_MIN, stayMax = STAY_MAX;

  // ✅ FIX: per-hole hide timers + per-hole hit lock
  let hideTimers = Array(GRID_SIZE).fill(null);
  let hitLock = Array(GRID_SIZE).fill(false);

  let currentSkin = null;

  // =========================
  // HELPERS
  // =========================
  const rand = (a,b)=>Math.floor(a+Math.random()*(b-a+1));

  const pickHole = ()=>{
    let i = rand(0, GRID_SIZE-1);
    if (i === activeHole) i = (i + 1) % GRID_SIZE;
    return i;
  };

  function clearHoleTimers(){
    for (let i=0;i<hideTimers.length;i++){
      if (hideTimers[i]) clearTimeout(hideTimers[i]);
      hideTimers[i] = null;
      hitLock[i] = false;
    }
  }

  function hideAllMoles(){
    holes.forEach(h => {
      h.dataset.state = "down";
      h.classList.remove("hit-stick");
    });
    activeHole = -1;
  }

  function setUI(){
    scoreEl.textContent = String(score);
    timeEl.textContent  = String(timeLeft);
    highEl.textContent  = String(getHigh());

    startBtn.disabled = running;
    pauseBtn.disabled = !running;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
  }

  function setAllMoleImages(){
    holes.forEach(h => {
      const img = h.querySelector(".moleImg");
      if (img) img.src = currentSkin.file;
    });
  }

  // =========================
  // OVERLAYS
  // =========================
  function showOverlayTimeUp(){
    overlayTitle.textContent = "Time’s up!";
    resultSkinImg.src = currentSkin.file;
    resultScore.textContent = String(score);
    resultHigh.textContent = String(getHigh());
    overlay.classList.remove("hidden");
  }
  function hideOverlay(){
    overlay.classList.add("hidden");
  }

  function showSkins(){
    renderSkins();
    skinsOverlay.classList.remove("hidden");
  }
  function hideSkins(){
    skinsOverlay.classList.add("hidden");
  }

  // =========================
  // BUILD GRID
  // =========================
  function makeHole(i){
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.dataset.state = "down";

    hole.innerHTML = `
      <div class="holeBack"></div>
      <div class="moleWrap">
        <div class="moleShadow"></div>
        <div class="mole">
          <img class="moleImg" draggable="false">
        </div>
      </div>
      <div class="holeFront"></div>
      <div class="pop">+1</div>
      <div class="stick"></div>
    `;

    const mole = hole.querySelector(".mole");
    const img  = hole.querySelector(".moleImg");
    img.src = currentSkin.file;

    mole.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      if(!running || paused) return;
      if(activeHole !== i) return;
      if(hole.dataset.state !== "up") return;
      hit(i);
    });

    return hole;
  }

  function buildGrid(){
    grid.innerHTML = "";
    holes = [];
    for (let i=0;i<GRID_SIZE;i++){
      const h = makeHole(i);
      holes.push(h);
      grid.appendChild(h);
    }
  }

  // =========================
  // GAME FLOW
  // =========================
  function startGame(){
    if (running) return;

    running = true;
    paused = false;

    score = 0;
    timeLeft = ROUND_SECONDS;

    popMin = POP_MIN; popMax = POP_MAX;
    stayMin = STAY_MIN; stayMax = STAY_MAX;

    clearHoleTimers();
    hideAllMoles();
    hideOverlay();
    hideSkins();
    setUI();

    clearInterval(timer);
    timer = setInterval(()=>{
      if (!running || paused) return;

      timeLeft--;
      timeEl.textContent = String(Math.max(0, timeLeft));

      if (timeLeft > 0 && timeLeft % DIFFICULTY_EVERY_SEC === 0) {
        popMin = Math.max(160, Math.floor(popMin * DIFFICULTY_STEP));
        popMax = Math.max(260, Math.floor(popMax * DIFFICULTY_STEP));
        stayMin = Math.max(240, Math.floor(stayMin * DIFFICULTY_STEP));
        stayMax = Math.max(360, Math.floor(stayMax * DIFFICULTY_STEP));
      }

      if (timeLeft <= 0) endTimeUp();
    }, 1000);

    schedulePop();
  }

  function endTimeUp(){
    // stop game
    running = false;
    paused = false;

    token++; // cancel pending pop timers
    clearInterval(timer);
    timer = null;

    clearHoleTimers();
    hideAllMoles();

    // update high score
    const high = getHigh();
    if (score > high) setHigh(score);
    setUI();

    // show "Time's up" overlay with skin + last score
    showOverlayTimeUp();
  }

  function togglePause(){
    if (!running) return;
    paused = !paused;

    if (paused) {
      token++;
      clearHoleTimers();
      hideAllMoles();
    } else {
      schedulePop();
    }
    setUI();
  }

  function newGame(){
    // stop everything then start fresh
    token++;
    clearInterval(timer);
    timer = null;
    clearHoleTimers();
    hideAllMoles();
    hideOverlay();
    hideSkins();

    running = false;
    paused = false;
    setUI();

    startGame();
  }

  // =========================
  // POP / HIT (FIXED)
  // =========================
  function schedulePop(){
    const t = ++token;
    setTimeout(()=>{
      if(!running || paused) return;
      if(t !== token) return;
      popUp();
    }, rand(popMin, popMax));
  }

  function popUp(){
    if(!running || paused) return;

    // close previous active hole safely
    if (activeHole !== -1){
      holes[activeHole].dataset.state = "down";
      if (hideTimers[activeHole]) {
        clearTimeout(hideTimers[activeHole]);
        hideTimers[activeHole] = null;
      }
      hitLock[activeHole] = false;
    }

    const i = pickHole();
    activeHole = i;

    // reset lock + cancel old timer for this hole
    hitLock[i] = false;
    if (hideTimers[i]) {
      clearTimeout(hideTimers[i]);
      hideTimers[i] = null;
    }

    const h = holes[i];
    h.dataset.state = "up";

    const t = token;
    hideTimers[i] = setTimeout(()=>{
      if(!running || paused) return;
      if(t !== token) return;

      if(activeHole === i && h.dataset.state === "up"){
        h.dataset.state = "down";
        activeHole = -1;
      }
      hideTimers[i] = null;
      schedulePop();
    }, rand(stayMin, stayMax));
  }

  function hit(i){
    if (hitLock[i]) return;
    hitLock[i] = true;

    // cancel hide timer immediately (fix miss hits)
    if (hideTimers[i]) {
      clearTimeout(hideTimers[i]);
      hideTimers[i] = null;
    }

    const h = holes[i];
    h.dataset.state = "hit";
    h.classList.add("hit-stick");
    setTimeout(()=>h.classList.remove("hit-stick"), 120);

    score++;
    scoreEl.textContent = String(score);

    const pop = h.querySelector(".pop");
    pop.classList.remove("show");
    void pop.offsetWidth;
    pop.classList.add("show");

    setTimeout(()=>{
      if(!running || paused) return; // if paused mid-animation
      h.dataset.state = "down";
      activeHole = -1;
      schedulePop();
    }, 140);
  }

  // =========================
  // SKINS
  // =========================
  function renderSkins(){
    skinsGrid.innerHTML = "";
    SKINS.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skinBtn" + (currentSkin.id === s.id ? " active" : "");

      const img = document.createElement("img");
      img.className = "skinPreview";
      img.src = s.file;
      img.alt = s.id;

      const name = document.createElement("div");
      name.className = "skinName";
      name.textContent = s.id;

      btn.appendChild(img);
      btn.appendChild(name);

      btn.addEventListener("click", ()=>{
        currentSkin = s;
        saveSkinId(s.id);
        setAllMoleImages();
        renderSkins();
      });

      skinsGrid.appendChild(btn);
    });
  }

  // =========================
  // EVENTS
  // =========================
  startBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", togglePause);
  newBtn.addEventListener("click", newGame);

  skinsBtn.addEventListener("click", ()=>{
    // allow skins when NOT running OR paused OR after time up
    if (running && !paused) return;
    showSkins();
  });

  skinsDoneBtn.addEventListener("click", hideSkins);

  // Overlay buttons
  restartBtnOverlay.addEventListener("click", newGame);
  skinsBtnOverlay.addEventListener("click", ()=>{
    hideOverlay();
    showSkins();
  });
  closeBtn.addEventListener("click", hideOverlay);

  // click outside modals
  skinsOverlay.addEventListener("click", (e)=>{
    if (e.target === skinsOverlay) hideSkins();
  });
  overlay.addEventListener("click", (e)=>{
    if (e.target === overlay) hideOverlay();
  });

  // ESC closes
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") {
      hideOverlay();
      hideSkins();
    }
  });

  // =========================
  // INIT
  // =========================
  const saved = getSavedSkinId();
  currentSkin = SKINS.find(s => s.id === saved) || SKINS[0];

  buildGrid();
  setAllMoleImages();
  setUI();
})();

