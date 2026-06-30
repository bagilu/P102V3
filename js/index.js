(function(){
  'use strict';

  const STORAGE_KEY = 'P102_LAST_SEARCH_STATE_V1';
  const el = (id) => document.getElementById(id);

  const status = el('status');
  const errorBox = el('error');
  const resultList = el('result-list');
  const resultCount = el('result-count');
  const emptyMessage = el('empty-message');
  const form = el('search-form');
  const input = el('search-input');
  const resetBtn = el('reset-btn');

  const campusSelect = el('campus-select');
  const buildingSelect = el('building-select');
  const floorSelect = el('floor-select');
  const browseStatus = el('browse-status');
  const browseCount = el('browse-count');
  const browseList = el('browse-list');

  let client;
  let browseRows = [];

  function setStatus(text){ status.textContent = `狀態：${text}`; }
  function setBrowseStatus(text){ browseStatus.textContent = text; }
  function showError(message){ errorBox.hidden = false; errorBox.textContent = message; }
  function clearError(){ errorBox.hidden = true; errorBox.textContent = ''; }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function meta(row){
    const parts = [
      row.CampusName || (row.CampusNo ? `校區 ${row.CampusNo}` : ''),
      row.BuildingName || row.BuildingNo,
      row.FloorName || row.FloorNo
    ].filter(Boolean);
    return parts.join('｜');
  }

  function renderRows(rows, targetList, options={}){
    const list = targetList || resultList;
    list.innerHTML = '';
    rows.forEach(row => {
      const a = document.createElement('a');
      a.className = 'result-row';
      a.href = `./map.html?space=${encodeURIComponent(row.SpaceNo || '')}`;
      a.innerHTML = `
        <div class="result-code">${escapeHtml(row.SpaceNo || '未編號')}</div>
        <div class="result-main">
          <strong>${escapeHtml(row.SpaceName || '未命名空間')}</strong>
          <div class="result-meta">${escapeHtml(meta(row) || '尚無校區/建築/樓層資訊')}</div>
          <div class="result-tags">
            ${row._matchedAlias ? `<span class="tag">別名：${escapeHtml(row._matchedAlias)}</span>` : ''}
            ${row.FloorMapPic ? `<span class="tag">樓層圖 ${escapeHtml(row.FloorMapPic)}</span>` : ''}
            ${row.CampusMapPic ? `<span class="tag">校區圖 ${escapeHtml(row.CampusMapPic)}</span>` : ''}
          </div>
        </div>
        <div class="btn btn-secondary">看地圖</div>
      `;
      list.appendChild(a);
    });

    if(!options.skipSearchState && list === resultList){
      saveSearchState(input.value.trim(), rows);
    }
  }

  function saveSearchState(keyword, rows){
    try{
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        keyword,
        rows,
        savedAt: new Date().toISOString()
      }));
    }catch(e){
      console.warn('Unable to save search state', e);
    }
  }

  function restoreSearchState(){
    try{
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if(!raw) return false;
      const state = JSON.parse(raw);
      if(!state || !Array.isArray(state.rows)) return false;
      input.value = state.keyword || '';
      renderRows(state.rows, resultList, {skipSearchState:true});
      resultCount.textContent = `${state.rows.length} results`;
      emptyMessage.hidden = state.rows.length !== 0;
      setStatus(`已還原上次查詢結果，共 ${state.rows.length} 筆`);
      return true;
    }catch(e){
      console.warn('Unable to restore search state', e);
      return false;
    }
  }

  function clearSearchState(){
    try{ sessionStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  async function logSearch(keyword, count){
    if(!keyword) return;
    await P102.rpcSafe(client, 'P102AddSearchEvent', {
      p_keyword: keyword,
      p_result_count: count,
      p_matched_by: count ? 'space_or_alias' : 'none'
    });
    if(count === 0){
      await P102.rpcSafe(client, 'P102AddSearchFailure', { p_keyword: keyword });
    }
  }

  async function doSearch(keyword){
    const q = String(keyword || '').trim();
    clearError();
    if(!q){
      resultList.innerHTML = '';
      resultCount.textContent = '等待查詢';
      emptyMessage.hidden = true;
      clearSearchState();
      setStatus('請輸入關鍵字，或使用下方校區瀏覽。');
      return;
    }

    setStatus('正在搜尋校園空間…');
    try{
      const rows = await P102.searchSpaces(client, q);
      renderRows(rows, resultList);
      resultCount.textContent = `${rows.length} results`;
      emptyMessage.hidden = rows.length !== 0;
      await logSearch(q, rows.length);
      setStatus(rows.length ? `完成，共 ${rows.length} 筆` : '完成，沒有找到資料');
    }catch(err){
      console.error(err);
      showError(`查詢失敗：${err.message || err}`);
      setStatus('查詢失敗');
    }
  }

  function optionLabel(row, type){
    if(type === 'campus') return row.CampusName || `校區 ${row.CampusNo}`;
    if(type === 'building') return row.BuildingName || row.BuildingNo || '未標示棟別';
    if(type === 'floor') return row.FloorName || row.FloorNo || '未標示樓層';
    return '';
  }

  function uniqueOptions(rows, keyFn, labelFn){
    const map = new Map();
    rows.forEach(row => {
      const key = keyFn(row);
      if(key === null || key === undefined || String(key).trim() === '') return;
      if(!map.has(String(key))){
        map.set(String(key), labelFn(row));
      }
    });
    return [...map.entries()].map(([value,label]) => ({value, label})).sort((a,b)=>String(a.value).localeCompare(String(b.value), 'zh-Hant', {numeric:true}));
  }

  function setOptions(select, placeholder, options){
    select.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label ? `${opt.value}｜${opt.label}` : opt.value;
      select.appendChild(o);
    });
  }

  function updateCampusOptions(){
    const options = uniqueOptions(
      browseRows,
      row => row.CampusNo,
      row => row.CampusName || `校區 ${row.CampusNo}`
    );
    setOptions(campusSelect, '請選擇校區', options);
  }

  function updateBuildingOptions(){
    const campus = campusSelect.value;
    const filtered = browseRows.filter(row => String(row.CampusNo) === campus);
    const options = uniqueOptions(
      filtered,
      row => row.BuildingNo || row.BuildingName,
      row => row.BuildingName || row.BuildingNo
    );
    setOptions(buildingSelect, campus ? '請選擇棟別' : '請先選校區', options);
    buildingSelect.disabled = !campus || options.length === 0;
    setOptions(floorSelect, '請先選棟別', []);
    floorSelect.disabled = true;
    browseList.innerHTML = '';
    browseCount.textContent = campus ? `${options.length} buildings` : 'Browse';
    setBrowseStatus(campus ? '請繼續選擇棟別。' : '瀏覽模式會依「校區 → 各棟 → 樓層」列出空間。');
  }

  function updateFloorOptions(){
    const campus = campusSelect.value;
    const building = buildingSelect.value;
    const filtered = browseRows.filter(row =>
      String(row.CampusNo) === campus &&
      String(row.BuildingNo || row.BuildingName) === building
    );
    const options = uniqueOptions(
      filtered,
      row => row.FloorNo || row.FloorName,
      row => row.FloorName || row.FloorNo
    );
    setOptions(floorSelect, building ? '請選擇樓層' : '請先選棟別', options);
    floorSelect.disabled = !building || options.length === 0;
    browseList.innerHTML = '';
    browseCount.textContent = building ? `${options.length} floors` : 'Browse';
    setBrowseStatus(building ? '請選擇樓層以列出空間。' : '請繼續選擇棟別。');
  }

  function updateBrowseList(){
    const campus = campusSelect.value;
    const building = buildingSelect.value;
    const floor = floorSelect.value;
    if(!campus || !building || !floor){
      browseList.innerHTML = '';
      return;
    }
    const rows = browseRows
      .filter(row =>
        String(row.CampusNo) === campus &&
        String(row.BuildingNo || row.BuildingName) === building &&
        String(row.FloorNo || row.FloorName) === floor
      )
      .sort((a,b)=>String(a.SpaceNo || '').localeCompare(String(b.SpaceNo || ''), 'zh-Hant', {numeric:true}));

    renderRows(rows, browseList, {skipSearchState:true});
    browseCount.textContent = `${rows.length} spaces`;
    setBrowseStatus(rows.length ? `已列出 ${rows.length} 個空間。` : '此樓層目前沒有可瀏覽空間。');
  }

  async function initBrowse(){
    try{
      setBrowseStatus('正在載入校區瀏覽資料…');
      browseRows = await P102.fetchAllSpacesForBrowse(client);
      updateCampusOptions();
      setBrowseStatus('請依序選擇校區、棟別與樓層。');
    }catch(err){
      console.error(err);
      setBrowseStatus(`瀏覽資料載入失敗：${err.message || err}`);
    }
  }

  async function init(){
    try{
      client = P102.createClient();
      setStatus('系統已載入。請輸入關鍵字，或使用校區瀏覽。');
      const restored = restoreSearchState();
      if(!restored){
        resultList.innerHTML = '';
        resultCount.textContent = '等待查詢';
        emptyMessage.hidden = true;
      }
      await initBrowse();
    }catch(err){
      console.error(err);
      showError(err.message || String(err));
      setStatus('初始化失敗');
    }
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    doSearch(input.value);
  });

  resetBtn.addEventListener('click', ()=>{
    input.value = '';
    resultList.innerHTML = '';
    resultCount.textContent = '等待查詢';
    emptyMessage.hidden = true;
    clearSearchState();
    setStatus('已清除查詢。請輸入關鍵字，或使用下方校區瀏覽。');
    input.focus();
  });

  campusSelect.addEventListener('change', updateBuildingOptions);
  buildingSelect.addEventListener('change', updateFloorOptions);
  floorSelect.addEventListener('change', updateBrowseList);

  init();
})();
