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
    return window.supabase.createClient(url, key, {auth: {storageKey: 'P102-auth', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
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

  async function readSpaces(client, params){
    const {data, error} = await client.rpc('P102_ReadSpaces', params);
    if(error) throw error;
    return data || [];
  }
  async function fetchSpaceBySpaceNo(client, spaceNo){
    const rows = await readSpaces(client, {p_space_no: spaceNo, p_limit: 1});
    return rows[0] || null;
  }
  async function fetchRecentSpaces(client, limit=10){
    return readSpaces(client, {p_limit: limit});
  }
  async function searchSpaces(client, keyword){
    return readSpaces(client, {p_keyword: String(keyword || '').trim(), p_limit: 80});
  }
  async function fetchAllSpacesForBrowse(client){
    const all = [];
    const pageSize = 500;
    for(let offset=0; ; offset += pageSize){
      const rows = await readSpaces(client, {p_offset: offset, p_limit: pageSize});
      all.push(...rows);
      if(rows.length < pageSize) return all;
    }
  }

  window.P102 = { TABLE_SPACE, TABLE_ALIAS, IMAGE_DIR, IMAGE_EXT, SELECT_FIELDS, getConfig, createClient, imagePath, placeholderImage, setImageWithFallback, rpcSafe, spaceLabel, mapRecordToSummary, fetchSpaceBySpaceNo, fetchRecentSpaces, fetchAllSpacesForBrowse, searchSpaces };
})();
