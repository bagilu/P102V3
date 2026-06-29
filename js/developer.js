(function(){
  'use strict';
  const el = (id) => document.getElementById(id);
  let client;
  function esc(v){return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function render(target, rows, labelKey, countKey){
    target.innerHTML = '';
    if(!rows || !rows.length){ target.innerHTML = '<p class="status-line">尚無資料或 View 尚未建立。</p>'; return; }
    rows.forEach(r=>{
      const div=document.createElement('div');
      div.className='analytics-row';
      div.innerHTML=`<span>${esc(r[labelKey])}</span><strong>${esc(r[countKey])}</strong>`;
      target.appendChild(div);
    });
  }
  async function loadView(view, target, label, count){
    try{
      const {data,error}=await client.from(view).select('*').limit(20);
      if(error) throw error;
      render(target,data,label,count);
    }catch(e){ target.innerHTML = `<p class="status-line">無法讀取 ${esc(view)}：${esc(e.message||e)}</p>`; }
  }
  async function init(){
    try{
      client=P102.createClient();
      await Promise.all([
        loadView('ViewP102PopularKeywords', el('popular-keywords'), 'Keyword', 'SearchCount'),
        loadView('ViewP102SearchFailures', el('failed-keywords'), 'Keyword', 'FailureCount'),
        loadView('ViewP102PopularSpaces', el('popular-spaces'), 'SpaceName', 'ViewCount')
      ]);
    }catch(e){ document.body.insertAdjacentHTML('afterbegin', `<div class="error-box">${esc(e.message||e)}</div>`); }
  }
  init();
})();
