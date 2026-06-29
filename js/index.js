(function(){
  'use strict';
  const el = (id) => document.getElementById(id);
  const status = el('status');
  const errorBox = el('error');
  const resultList = el('result-list');
  const resultCount = el('result-count');
  const emptyMessage = el('empty-message');
  const form = el('search-form');
  const input = el('search-input');
  const resetBtn = el('reset-btn');
  let client;

  function setStatus(text){ status.textContent = `狀態：${text}`; }
  function showError(message){ errorBox.hidden = false; errorBox.textContent = message; }
  function clearError(){ errorBox.hidden = true; errorBox.textContent = ''; }

  function meta(row){
    const parts = [row.CampusName || (row.CampusNo ? `校區 ${row.CampusNo}` : ''), row.BuildingName || row.BuildingNo, row.FloorName || row.FloorNo].filter(Boolean);
    return parts.join('｜');
  }

  function renderRows(rows){
    resultList.innerHTML = '';
    resultCount.textContent = `${rows.length} results`;
    emptyMessage.hidden = rows.length !== 0;
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
      resultList.appendChild(a);
    });
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  async function logSearch(keyword, count){
    if(!keyword) return;
    await P102.rpcSafe(client, 'P102AddSearchEvent', { p_keyword: keyword, p_result_count: count, p_matched_by: count ? 'space_or_alias' : 'none' });
    if(count === 0) await P102.rpcSafe(client, 'P102AddSearchFailure', { p_keyword: keyword });
  }

  async function doSearch(keyword){
    clearError();
    setStatus(keyword ? '查詢中…' : '載入前 10 筆…');
    try{
      const rows = await P102.searchSpaces(client, keyword);
      renderRows(rows);
      await logSearch(String(keyword || '').trim(), rows.length);
      setStatus(rows.length ? `完成，共 ${rows.length} 筆` : '完成，沒有找到資料');
    }catch(err){
      console.error(err);
      showError(`查詢失敗：${err.message || err}`);
      setStatus('查詢失敗');
    }
  }

  async function init(){
    try{
      client = P102.createClient();
      setStatus('系統已載入');
      await doSearch('');
    }catch(err){
      console.error(err);
      showError(err.message || String(err));
      setStatus('初始化失敗');
    }
  }

  form.addEventListener('submit', (e)=>{ e.preventDefault(); doSearch(input.value); });
  resetBtn.addEventListener('click', ()=>{ input.value=''; doSearch(''); input.focus(); });
  init();
})();
