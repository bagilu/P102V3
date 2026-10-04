(function(){
  'use strict';

  const GAME_SECONDS = 30;
  const CATEGORY_LABELS = {
    STUDENT_SERVICE: '學生服務',
    CENTRAL_ADMIN: '校級行政',
    DEPARTMENT_OFFICE: '系所與辦公室'
  };

  const els = {};
  const state = {
    client: null,
    questions: [],
    board: [],
    roundQuestions: [],
    roundIndex: 0,
    scores: {red: 0, white: 0},
    currentTeam: 'red',
    placements: new Map(),
    selectedTokenId: null,
    openBuildings: new Set(),
    activeCampusNo: null,
    timerId: null,
    timeLeft: GAME_SECONDS,
    locked: false,
    correctCount: 0
  };

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    cacheElements();
    bindEvents();
    loadGameData();
  }

  function cacheElements(){
    [
      'start-screen','game-screen','result-screen','category-select','round-select','start-btn','loading-status','start-error',
      'red-score','white-score','red-score-card','white-score-card','round-label','timer','question-title','question-hint',
      'turn-badge','question-type','token-tray','campus-tabs','campus-board','reset-answer-btn','submit-answer-btn','game-message',
      'answer-dialog','answer-icon','answer-dialog-title','answer-points','answer-locations','next-question-btn','final-red-score',
      'final-white-score','winner-mark','result-summary','play-again-btn','confetti-layer'
    ].forEach(id => { els[toCamel(id)] = document.getElementById(id); });
  }

  function toCamel(value){ return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); }

  function bindEvents(){
    els.startBtn.addEventListener('click', startGame);
    els.playAgainBtn.addEventListener('click', showStartScreen);
    els.resetAnswerBtn.addEventListener('click', resetPlacements);
    els.submitAnswerBtn.addEventListener('click', () => submitAnswer(false));
    els.nextQuestionBtn.addEventListener('click', nextQuestion);
    els.answerDialog.addEventListener('click', event => {
      if(event.target === els.answerDialog) els.nextQuestionBtn.focus();
    });
  }

  async function loadGameData(){
    els.startBtn.disabled = true;
    els.loadingStatus.textContent = '正在準備題庫與校園樓層…';
    try{
      state.client = window.P102.createClient();
      const [questionResult, boardResult] = await Promise.all([
        state.client.rpc('P102_GetGameQuestions', {p_question_category: null, p_limit: 200}),
        state.client.rpc('P102_GetGameBoardOptions')
      ]);
      if(questionResult.error) throw questionResult.error;
      if(boardResult.error) throw boardResult.error;

      state.questions = normalizeQuestions(questionResult.data);
      state.board = normalizeBoard(boardResult.data);
      if(!state.questions.length) throw new Error('目前沒有已核准的遊戲題目。');
      if(!state.board.length) throw new Error('目前沒有可用的校區樓層選項。');

      els.loadingStatus.textContent = `已載入 ${state.questions.length} 題、${countFloorOptions()} 個樓層選項。`;
      els.startBtn.disabled = false;
    }catch(error){
      showStartError(error);
      els.loadingStatus.textContent = '資料載入失敗。';
    }
  }

  function normalizeQuestions(data){
    const rows = unwrapJson(data);
    return rows.map((row, index) => ({
      id: row.questionId || row.QuestionID || row.id || `question-${index}`,
      code: row.questionCode || row.QuestionCode || '',
      title: row.questionText || row.QuestionText || row.displayName || row.DisplayName || '未命名題目',
      category: row.questionCategory || row.QuestionCategory || '',
      type: String(row.questionType || row.QuestionType || 'SINGLE').toUpperCase(),
      multiplier: Number(row.scoreMultiplier || row.ScoreMultiplier || 1),
      targets: normalizeTargets(row.targets || row.Targets || [])
    })).filter(question => question.targets.length > 0);
  }

  function normalizeTargets(targets){
    const rows = typeof targets === 'string' ? safeParse(targets, []) : (targets || []);
    return rows.map((target, index) => ({
      code: target.targetCode || target.TargetCode || `target-${index}`,
      spaceNo: target.spaceNo || target.SpaceNo || '',
      campusNo: String(target.campusNo ?? target.CampusNo ?? ''),
      campusName: target.campusName || target.CampusName || '',
      buildingNo: String(target.buildingNo ?? target.BuildingNo ?? ''),
      buildingName: target.buildingName || target.BuildingName || '',
      floorNo: String(target.floorNo ?? target.FloorNo ?? ''),
      floorName: target.floorName || target.FloorName || ''
    })).filter(target => target.campusNo && target.buildingNo && target.floorNo);
  }

  function normalizeBoard(data){
    const rows = unwrapJson(data);
    return rows.map((campus, campusIndex) => ({
      campusNo: String(campus.campusNo ?? campus.CampusNo ?? campusIndex + 1),
      campusName: campus.campusName || campus.CampusName || `校區 ${campusIndex + 1}`,
      buildings: (campus.buildings || campus.Buildings || []).map(building => ({
        buildingNo: String(building.buildingNo ?? building.BuildingNo ?? ''),
        buildingName: building.buildingName || building.BuildingName || '',
        floors: (building.floors || building.Floors || []).map(floor => ({
          floorNo: String(floor.floorNo ?? floor.FloorNo ?? ''),
          label: floor.label || floor.floorName || floor.FloorName || `${floor.floorNo ?? floor.FloorNo} 樓`,
          targetKey: floor.targetKey || `${String(campus.campusNo ?? campus.CampusNo)}|${String(building.buildingNo ?? building.BuildingNo)}|${String(floor.floorNo ?? floor.FloorNo)}`
        }))
      })).filter(building => building.buildingNo && building.floors.length)
    })).filter(campus => campus.buildings.length);
  }

  function unwrapJson(data){
    let value = data;
    if(typeof value === 'string') value = safeParse(value, []);
    if(value && !Array.isArray(value) && Array.isArray(value.data)) value = value.data;
    if(value && !Array.isArray(value) && Array.isArray(value.questions)) value = value.questions;
    if(value && !Array.isArray(value) && Array.isArray(value.campuses)) value = value.campuses;
    return Array.isArray(value) ? value : [];
  }

  function safeParse(value, fallback){ try{return JSON.parse(value);}catch(error){return fallback;} }

  function startGame(){
    const category = els.categorySelect.value;
    const pool = state.questions.filter(question => !category || question.category === category);
    if(!pool.length){
      showStartError(new Error('這個類別目前沒有可用題目，請選擇其他類別。'));
      return;
    }
    const requested = els.roundSelect.value === 'all' ? pool.length : Number(els.roundSelect.value);
    state.roundQuestions = shuffle(pool).slice(0, Math.min(requested, pool.length));
    state.roundIndex = 0;
    state.scores = {red: 0, white: 0};
    state.currentTeam = 'red';
    state.correctCount = 0;
    els.startError.hidden = true;
    els.startScreen.hidden = true;
    els.resultScreen.hidden = true;
    els.gameScreen.hidden = false;
    renderQuestion();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function renderQuestion(){
    clearTimer();
    state.locked = false;
    state.placements.clear();
    state.selectedTokenId = null;
    state.openBuildings.clear();
    state.activeCampusNo = state.board[0] ? state.board[0].campusNo : null;
    state.timeLeft = GAME_SECONDS;

    const question = currentQuestion();
    els.roundLabel.textContent = `第 ${state.roundIndex + 1} / ${state.roundQuestions.length} 題`;
    els.questionTitle.textContent = question.title;
    els.questionType.textContent = question.type === 'MULTI' ? `多據點 · ${question.targets.length} 個圖示` : '單一地點';
    els.questionHint.textContent = question.type === 'MULTI'
      ? `這個單位有 ${question.targets.length} 個服務地點，全部放對才算完整答對。`
      : `${CATEGORY_LABELS[question.category] || '校園服務'}：請放到正確的校區、大樓與樓層。`;
    els.turnBadge.textContent = state.currentTeam === 'red' ? '紅隊作答' : '白隊作答';
    els.turnBadge.classList.toggle('is-white', state.currentTeam === 'white');
    els.redScoreCard.classList.toggle('is-active', state.currentTeam === 'red');
    els.whiteScoreCard.classList.toggle('is-active', state.currentTeam === 'white');
    els.gameMessage.textContent = '先展開大樓，再把圖示放到樓層。';
    updateScores();
    renderTokenTray();
    renderBoard();
    updateTimerDisplay();
    startTimer();
  }

  function currentQuestion(){ return state.roundQuestions[state.roundIndex]; }

  function tokenIds(){
    return currentQuestion().targets.map((_, index) => `token-${state.roundIndex}-${index}`);
  }

  function renderTokenTray(){
    els.tokenTray.innerHTML = '';
    tokenIds().forEach((tokenId, index) => {
      if(state.placements.has(tokenId)) return;
      els.tokenTray.appendChild(createToken(tokenId, index));
    });
    if(!els.tokenTray.children.length){
      const message = document.createElement('span');
      message.className = 'touch-instruction';
      message.textContent = '所有圖示都已放置；可以送出答案或重新調整。';
      els.tokenTray.appendChild(message);
    }
  }

  function createToken(tokenId, index){
    const token = document.createElement('button');
    token.type = 'button';
    token.className = 'location-token';
    token.draggable = true;
    token.dataset.tokenId = tokenId;
    token.textContent = currentQuestion().targets.length > 1 ? `${currentQuestion().title} ${index + 1}` : currentQuestion().title;
    token.classList.toggle('is-selected', state.selectedTokenId === tokenId);
    token.setAttribute('aria-pressed', String(state.selectedTokenId === tokenId));
    token.addEventListener('click', event => {
      event.stopPropagation();
      if(state.locked) return;
      state.selectedTokenId = state.selectedTokenId === tokenId ? null : tokenId;
      renderTokenTray();
      renderBoard();
      els.gameMessage.textContent = state.selectedTokenId ? '已選取圖示，請點一個樓層。' : '已取消選取。';
    });
    token.addEventListener('dragstart', event => {
      if(state.locked){ event.preventDefault(); return; }
      state.selectedTokenId = tokenId;
      token.classList.add('is-dragging');
      event.dataTransfer.setData('text/plain', tokenId);
      event.dataTransfer.effectAllowed = 'move';
    });
    token.addEventListener('dragend', () => token.classList.remove('is-dragging'));
    return token;
  }

  function renderBoard(){
    els.campusTabs.innerHTML = '';
    els.campusBoard.innerHTML = '';
    state.board.forEach(campus => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `campus-tab${campus.campusNo === state.activeCampusNo ? ' is-active' : ''}`;
      tab.textContent = campus.campusName;
      tab.addEventListener('click', () => {
        state.activeCampusNo = campus.campusNo;
        renderBoard();
      });
      els.campusTabs.appendChild(tab);

      const column = document.createElement('article');
      column.className = `campus-column${campus.campusNo === state.activeCampusNo ? ' is-mobile-active' : ''}`;
      const title = document.createElement('h3');
      title.className = 'campus-title';
      title.innerHTML = `<span>${escapeHtml(campus.campusName)}</span><small>${campus.buildings.length} 棟</small>`;
      column.appendChild(title);

      const list = document.createElement('div');
      list.className = 'building-list';
      campus.buildings.forEach(building => list.appendChild(createBuilding(campus, building)));
      column.appendChild(list);
      els.campusBoard.appendChild(column);
    });
  }

  function createBuilding(campus, building){
    const buildingKey = `${campus.campusNo}|${building.buildingNo}`;
    const wrap = document.createElement('div');
    wrap.className = `building${state.openBuildings.has(buildingKey) ? ' is-open' : ''}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'building-toggle';
    toggle.setAttribute('aria-expanded', String(state.openBuildings.has(buildingKey)));
    toggle.innerHTML = `<span class="building-code">${escapeHtml(building.buildingNo)}</span><span class="building-name">${escapeHtml(building.buildingName || building.buildingNo)}</span><span class="chevron">⌄</span>`;
    toggle.addEventListener('click', () => {
      if(state.openBuildings.has(buildingKey)){
        state.openBuildings.delete(buildingKey);
      }else{
        [...state.openBuildings].filter(key => key.startsWith(`${campus.campusNo}|`)).forEach(key => state.openBuildings.delete(key));
        state.openBuildings.add(buildingKey);
      }
      renderBoard();
    });
    wrap.appendChild(toggle);

    if(state.openBuildings.has(buildingKey)){
      const floors = document.createElement('div');
      floors.className = 'floor-list';
      building.floors.forEach(floor => floors.appendChild(createFloorTarget(floor)));
      wrap.appendChild(floors);
    }
    return wrap;
  }

  function createFloorTarget(floor){
    const target = document.createElement('div');
    const placedTokenId = [...state.placements.entries()].find(([, key]) => key === floor.targetKey)?.[0];
    target.className = `floor-target${placedTokenId ? ' has-token' : ''}`;
    target.dataset.targetKey = floor.targetKey;
    target.tabIndex = 0;
    target.setAttribute('role', 'button');
    target.setAttribute('aria-label', `${floor.label}，${placedTokenId ? '已有圖示' : '可放置圖示'}`);

    const label = document.createElement('span');
    label.textContent = floor.label;
    target.appendChild(label);
    if(placedTokenId){
      const index = tokenIds().indexOf(placedTokenId);
      target.appendChild(createToken(placedTokenId, index));
    }

    target.addEventListener('click', event => {
      if(event.target.closest('.location-token')) return;
      if(state.selectedTokenId) placeToken(state.selectedTokenId, floor.targetKey);
    });
    target.addEventListener('keydown', event => {
      if((event.key === 'Enter' || event.key === ' ') && state.selectedTokenId){
        event.preventDefault();
        placeToken(state.selectedTokenId, floor.targetKey);
      }
    });
    target.addEventListener('dragover', event => {
      event.preventDefault();
      target.classList.add('is-drop-ready');
      event.dataTransfer.dropEffect = 'move';
    });
    target.addEventListener('dragleave', () => target.classList.remove('is-drop-ready'));
    target.addEventListener('drop', event => {
      event.preventDefault();
      target.classList.remove('is-drop-ready');
      const tokenId = event.dataTransfer.getData('text/plain') || state.selectedTokenId;
      if(tokenId) placeToken(tokenId, floor.targetKey);
    });
    return target;
  }

  function placeToken(tokenId, targetKey){
    if(state.locked) return;
    const occupied = [...state.placements.entries()].find(([, key]) => key === targetKey && key !== state.placements.get(tokenId));
    if(occupied) state.placements.delete(occupied[0]);
    state.placements.set(tokenId, targetKey);
    state.selectedTokenId = null;
    renderTokenTray();
    renderBoard();
    els.gameMessage.textContent = state.placements.size === tokenIds().length ? '圖示都已放置，可以送出答案。' : '放置完成，請繼續放下一個圖示。';
  }

  function resetPlacements(){
    if(state.locked) return;
    state.placements.clear();
    state.selectedTokenId = null;
    renderTokenTray();
    renderBoard();
    els.gameMessage.textContent = '已重放所有圖示。';
  }

  function submitAnswer(isTimeout){
    if(state.locked) return;
    if(!isTimeout && state.placements.size < tokenIds().length){
      els.gameMessage.textContent = `還有 ${tokenIds().length - state.placements.size} 個圖示尚未放置。`;
      return;
    }
    state.locked = true;
    clearTimer();

    const correctKeys = new Set(currentQuestion().targets.map(targetKey));
    const placedKeys = new Set(state.placements.values());
    const matched = [...placedKeys].filter(key => correctKeys.has(key)).length;
    const isCorrect = matched === correctKeys.size && placedKeys.size === correctKeys.size;
    const points = isCorrect ? Math.max(1, currentQuestion().multiplier) * 100 : 0;
    state.scores[state.currentTeam] += points;
    if(isCorrect) state.correctCount += 1;
    updateScores();
    showAnswerResult(isCorrect, points, matched, isTimeout);
  }

  function targetKey(target){ return `${target.campusNo}|${target.buildingNo}|${target.floorNo}`; }

  function showAnswerResult(isCorrect, points, matched, isTimeout){
    els.answerIcon.textContent = isCorrect ? '✓' : '×';
    els.answerIcon.classList.toggle('is-wrong', !isCorrect);
    els.answerDialogTitle.textContent = isCorrect ? '答對了！' : (isTimeout ? '時間到！' : '再認識一次位置');
    els.answerPoints.textContent = isCorrect
      ? `${state.currentTeam === 'red' ? '紅隊' : '白隊'}獲得 ${points} 分。`
      : `本題答對 ${matched} / ${currentQuestion().targets.length} 個地點。正確位置如下：`;
    els.answerLocations.innerHTML = '';
    currentQuestion().targets.forEach(target => {
      const row = document.createElement('div');
      row.className = 'answer-location';
      row.textContent = `${target.campusName}｜${target.buildingNo} ${target.buildingName}｜${floorDisplay(target)}`;
      els.answerLocations.appendChild(row);
    });
    els.nextQuestionBtn.textContent = state.roundIndex + 1 >= state.roundQuestions.length ? '查看結果' : '下一題';
    els.answerDialog.hidden = false;
    if(isCorrect) launchConfetti();
    window.setTimeout(() => els.nextQuestionBtn.focus(), 60);
  }

  function floorDisplay(target){
    if(target.floorName) return target.floorName;
    const value = String(target.floorNo);
    return /^-/.test(value) ? `地下 ${value.replace('-', '')} 樓` : `${value} 樓`;
  }

  function nextQuestion(){
    els.answerDialog.hidden = true;
    if(state.roundIndex + 1 >= state.roundQuestions.length){
      finishGame();
      return;
    }
    state.roundIndex += 1;
    state.currentTeam = state.currentTeam === 'red' ? 'white' : 'red';
    renderQuestion();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function finishGame(){
    clearTimer();
    els.gameScreen.hidden = true;
    els.resultScreen.hidden = false;
    els.finalRedScore.textContent = state.scores.red;
    els.finalWhiteScore.textContent = state.scores.white;
    if(state.scores.red === state.scores.white){
      els.winnerMark.textContent = '平手';
      els.resultSummary.textContent = `雙方同分！共完整答對 ${state.correctCount} / ${state.roundQuestions.length} 題。`;
    }else{
      const winner = state.scores.red > state.scores.white ? '紅隊' : '白隊';
      els.winnerMark.textContent = '勝';
      els.resultSummary.textContent = `${winner}獲勝！本局共完整答對 ${state.correctCount} / ${state.roundQuestions.length} 題。`;
      launchConfetti();
    }
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function showStartScreen(){
    clearTimer();
    els.resultScreen.hidden = true;
    els.gameScreen.hidden = true;
    els.startScreen.hidden = false;
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function startTimer(){
    state.timerId = window.setInterval(() => {
      state.timeLeft -= 1;
      updateTimerDisplay();
      if(state.timeLeft <= 0) submitAnswer(true);
    }, 1000);
  }

  function clearTimer(){
    if(state.timerId) window.clearInterval(state.timerId);
    state.timerId = null;
  }

  function updateTimerDisplay(){
    els.timer.textContent = state.timeLeft;
    els.timer.parentElement.classList.toggle('is-urgent', state.timeLeft <= 8);
  }

  function updateScores(){
    els.redScore.textContent = state.scores.red;
    els.whiteScore.textContent = state.scores.white;
  }

  function showStartError(error){
    console.error(error);
    els.startError.textContent = `無法載入遊戲：${error.message || error}`;
    els.startError.hidden = false;
  }

  function countFloorOptions(){
    return state.board.reduce((campusTotal, campus) => campusTotal + campus.buildings.reduce((buildingTotal, building) => buildingTotal + building.floors.length, 0), 0);
  }

  function shuffle(items){
    const copy = items.slice();
    for(let i = copy.length - 1; i > 0; i -= 1){
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function launchConfetti(){
    const colors = ['#c9444c','#efb64f','#276d7c','#ffffff','#318a68'];
    els.confettiLayer.innerHTML = '';
    for(let i = 0; i < 70; i += 1){
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty('--drift', `${Math.round(Math.random() * 180 - 90)}px`);
      piece.style.animationDelay = `${Math.random() * .45}s`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      els.confettiLayer.appendChild(piece);
    }
    window.setTimeout(() => { els.confettiLayer.innerHTML = ''; }, 2600);
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  }
})();
