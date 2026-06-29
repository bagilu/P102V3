(function(){
  'use strict';
  const TABLE_SPACE = 'TblP102Space';
  const TABLE_ALIAS = 'TblP102SpaceAlias';
  const IMAGE_DIR = 'jpg';
  const IMAGE_EXT = 'jpg';
  const SELECT_FIELDS = 'sID,SpaceID,SpaceNo,SpaceName,CampusNo,CampusName,BuildingNo,BuildingName,FloorNo,FloorName,SpaceCode,PicNo,FloorMapPic,CampusMapPic,MapFile,MapX,MapY,Description,IsActive,SortOrder';

  function getConfig(){
    const cfg = window.P102_CONFIG || {};
    let url = cfg.SUPABASE_URL || cfg.url || window.SUPABASE_URL;
    let key = cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_KEY || cfg.key || window.SUPABASE_ANON_KEY || window.SUPABASE_KEY;
    try{ if(!url && typeof SUPABASE_URL !== 'undefined') url = SUPABASE_URL; }catch(e){}
    try{ if(!key && typeof SUPABASE_ANON_KEY !== 'undefined') key = SUPABASE_ANON_KEY; }catch(e){}
    try{ if(!key && typeof SUPABASE_KEY !== 'undefined') key = SUPABASE_KEY; }catch(e){}
    return {url, key};
  }

  function createClient(){
    const {url, key} = getConfig();
    if(!url || !key) throw new Error('找不到 Supabase 設定。請確認根目錄 config.js 已設定 SUPABASE_URL 與 SUPABASE_ANON_KEY。');
    if(!window.supabase || !window.supabase.createClient) throw new Error('Supabase SDK 尚未載入。請檢查網路或 CDN。');
    return window.supabase.createClient(url, key);
  }

  function escapeLike(value){ return String(value || '').replace(/[%_]/g, '\\$&'); }
  function normalizeText(value){ return String(value || '').trim().toLowerCase().replace(/\s+/g,''); }
  function uniqueBySpaceNo(rows){
    const seen = new Set();
    const out = [];
    (rows || []).forEach(row => {
      const key = row && row.SpaceNo ? row.SpaceNo : `sid:${row && row.sID}`;
      if(!seen.has(key)){ seen.add(key); out.push(row); }
    });
    return out;
  }
  function imagePath(pic){
    const clean = String(pic || '').trim();
    if(!clean) return placeholderImage('尚未設定圖檔');
    return `./${IMAGE_DIR}/${clean}.${IMAGE_EXT}`;
  }
  function placeholderImage(label){
    const safe = encodeURIComponent(label || '找不到圖片');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f6f1e8"/><rect x="80" y="80" width="1040" height="640" rx="28" fill="#fffaf2" stroke="#d9e1df" stroke-width="4"/><text x="600" y="380" text-anchor="middle" fill="#2f6f88" font-size="42" font-family="Arial, sans-serif">P102</text><text x="600" y="450" text-anchor="middle" fill="#6d7b82" font-size="30" font-family="Arial, sans-serif">${safe}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }
  function setImageWithFallback(img, src, label){
    img.onerror = function(){ img.onerror = null; img.src = placeholderImage(label || '找不到圖片'); };
    img.src = src;
  }
  async function rpcSafe(client, name, params){
    try{ await client.rpc(name, params); }catch(e){ console.warn(`RPC ${name} failed`, e); }
  }
  function spaceLabel(row){ return row.SpaceName || row.SpaceNo || '未命名空間'; }
  function mapRecordToSummary(row){
    return [
      ['全校編號', row.SpaceNo], ['空間名稱', row.SpaceName], ['校區', row.CampusName || row.CampusNo],
      ['建築', row.BuildingName || row.BuildingNo], ['樓層', row.FloorName || row.FloorNo], ['說明', row.Description]
    ].filter(x => x[1] !== null && x[1] !== undefined && String(x[1]).trim() !== '');
  }

  async function fetchSpaceBySpaceNo(client, spaceNo){
    const {data, error} = await client.from(TABLE_SPACE).select(SELECT_FIELDS).eq('SpaceNo', spaceNo).maybeSingle();
    if(error) throw error;
    return data;
  }

  async function fetchRecentSpaces(client, limit=10){
    const {data, error} = await client.from(TABLE_SPACE).select(SELECT_FIELDS).eq('IsActive', true).order('SortOrder', {ascending:true}).order('sID', {ascending:true}).limit(limit);
    if(error) throw error;
    return data || [];
  }

  async function searchSpaces(client, keyword){
    const q = String(keyword || '').trim();
    if(!q) return fetchRecentSpaces(client, 10);
    const like = `%${escapeLike(q)}%`;
    const fields = ['SpaceNo','SpaceName','Description','BuildingName','CampusName','FloorName','SpaceCode'];
    const orText = fields.map(f => `${f}.ilike.${like}`).join(',');
    const mainReq = client.from(TABLE_SPACE).select(SELECT_FIELDS).eq('IsActive', true).or(orText).limit(60);
    const aliasReq = client.from(TABLE_ALIAS).select('SpaceNo,AliasName,LanguageCode,AliasType').eq('IsActive', true).ilike('AliasName', like).limit(60);
    const [mainRes, aliasRes] = await Promise.all([mainReq, aliasReq]);
    if(mainRes.error) throw mainRes.error;
    if(aliasRes.error) console.warn('Alias search failed', aliasRes.error);
    let rows = mainRes.data || [];
    const aliasRows = aliasRes.data || [];
    const aliasSpaceNos = [...new Set(aliasRows.map(a => a.SpaceNo).filter(Boolean))];
    if(aliasSpaceNos.length){
      const {data, error} = await client.from(TABLE_SPACE).select(SELECT_FIELDS).eq('IsActive', true).in('SpaceNo', aliasSpaceNos).limit(80);
      if(error) console.warn('Alias space fetch failed', error);
      rows = rows.concat(data || []);
      const aliasMap = new Map(aliasRows.map(a => [a.SpaceNo, a.AliasName]));
      rows.forEach(r => { if(aliasMap.has(r.SpaceNo)) r._matchedAlias = aliasMap.get(r.SpaceNo); });
    }
    rows = uniqueBySpaceNo(rows);
    rows.forEach(r => {
      const hay = normalizeText([r.SpaceNo,r.SpaceName,r.Description,r.BuildingName,r.CampusName,r.FloorName,r.SpaceCode,r._matchedAlias].join(' '));
      const needle = normalizeText(q);
      r._score = hay.includes(needle) ? 100 : similarity(needle, hay);
    });
    return rows.sort((a,b)=>(b._score||0)-(a._score||0)).slice(0,80);
  }

  function similarity(a,b){
    if(!a || !b) return 0;
    let hit=0;
    for(const ch of new Set(a.split(''))){ if(b.includes(ch)) hit++; }
    return Math.round((hit / Math.max(1, new Set(a.split('')).size))*70);
  }

  window.P102 = { TABLE_SPACE, TABLE_ALIAS, IMAGE_DIR, IMAGE_EXT, SELECT_FIELDS, getConfig, createClient, imagePath, placeholderImage, setImageWithFallback, rpcSafe, spaceLabel, mapRecordToSummary, fetchSpaceBySpaceNo, fetchRecentSpaces, searchSpaces };
})();
