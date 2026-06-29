(function(){
  'use strict';
  const el = (id) => document.getElementById(id);
  const errorBox = el('error');
  const mapTitle = el('map-title');
  const mapStatus = el('map-status');
  const summary = el('space-summary');
  const floorMap = el('floor-map');
  const campusMap = el('campus-map');
  const floorCaption = el('floor-caption');
  const campusCaption = el('campus-caption');
  const feedbackForm = el('feedback-form');
  const feedbackStatus = el('feedback-status');
  let client;
  let currentSpace;

  function showError(message){ errorBox.hidden = false; errorBox.textContent = message; }
  function clearError(){ errorBox.hidden = true; errorBox.textContent = ''; }
  function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function setStatus(text){ mapStatus.textContent = text; }

  function renderSummary(row){
    summary.innerHTML = '';
    P102.mapRecordToSummary(row).forEach(([k,v]) => {
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`;
      summary.appendChild(item);
    });
  }

  async function logView(row){
    await P102.rpcSafe(client, 'P102AddSpaceViewEvent', {
      p_space_no: row.SpaceNo || null,
      p_space_name: row.SpaceName || null,
      p_campus_no: row.CampusNo == null ? null : String(row.CampusNo),
      p_floor_map_pic: row.FloorMapPic || row.PicNo || null,
      p_campus_map_pic: row.CampusMapPic || null
    });
  }

  async function init(){
    try{
      client = P102.createClient();
      const params = new URLSearchParams(location.search);
      const spaceNo = params.get('space');
      if(!spaceNo) throw new Error('URL 缺少 space 參數，例如 map.html?space=2C239');
      clearError();
      setStatus('Loading');
      const row = await P102.fetchSpaceBySpaceNo(client, spaceNo);
      if(!row) throw new Error(`找不到 SpaceNo：${spaceNo}`);
      currentSpace = row;
      mapTitle.textContent = `${row.SpaceNo || ''} ${row.SpaceName || ''}`.trim();
      setStatus('Ready');
      renderSummary(row);
      const floorPic = row.FloorMapPic || row.PicNo || row.MapFile;
      const campusPic = row.CampusMapPic || (row.CampusNo ? `${row.CampusNo}All` : '');
      floorCaption.textContent = floorPic ? `jpg/${floorPic}.jpg` : '尚未設定樓層平面圖';
      campusCaption.textContent = campusPic ? `jpg/${campusPic}.jpg` : '尚未設定校區總覽圖';
      P102.setImageWithFallback(floorMap, P102.imagePath(floorPic), '找不到樓層平面圖');
      P102.setImageWithFallback(campusMap, P102.imagePath(campusPic), '找不到校區總覽圖');
      await logView(row);
    }catch(err){
      console.error(err);
      showError(err.message || String(err));
      setStatus('Error');
      P102.setImageWithFallback(floorMap, P102.placeholderImage('無法載入'), '無法載入');
      P102.setImageWithFallback(campusMap, P102.placeholderImage('無法載入'), '無法載入');
    }
  }

  feedbackForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!currentSpace){ feedbackStatus.textContent = '尚未載入空間資料。'; return; }
    const type = el('feedback-type').value;
    const text = el('feedback-text').value.trim();
    if(!text){ feedbackStatus.textContent = '請先輸入回饋內容。'; return; }
    feedbackStatus.textContent = '送出中…';
    await P102.rpcSafe(client, 'P102AddFeedback', { p_space_no: currentSpace.SpaceNo || null, p_space_name: currentSpace.SpaceName || null, p_feedback_type: type, p_feedback_text: text });
    feedbackStatus.textContent = '已送出，感謝回饋。';
    el('feedback-text').value = '';
  });

  init();
})();
