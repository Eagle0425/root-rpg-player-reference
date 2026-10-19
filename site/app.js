/* Buildless, dependency-free client. Everything except PDFs stays on this origin. */
(() => {
  'use strict';
  const D = window.ROOT_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu, '');
  const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const types = {basic:'基本動作',weapons:'武器動作',travel:'旅行動作',reputation:'名聲動作',feats:'遊俠專長',risks:'風險',tags:'裝備標籤',premade:'範例裝備',connections:'關係',glossary:'名詞',gm:'GM 參考',character:'角色',creation:'建立角色',session:'成長與聚會',characterMove:'角色動作'};
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem('root-rpg-favorites-v1') || '[]')); } catch (_) { /* Storage is optional. */ }
  const entries = [];
  function add(type, item, extra = {}) {
    const entry = {...item, ...extra, explanation:D.explanations?.[item.en], type, id: `${type}-${slug(item.en || extra.key || entries.length)}`};
    entry.search = normalize(`${entry.title} ${entry.en || ''} ${entry.body} ${JSON.stringify(entry.explanation?.sections || [])} ${types[type]}`);
    entries.push(entry); return entry;
  }
  ['basic','weapons','reputation','risks','tags','premade','connections'].forEach(type => D[type].forEach(item => add(type,item)));
  D.feats.forEach(([title,en,use,risks]) => add('feats',{title,en,body:`用途：${use}。\n可能的風險：${risks}。` }));
  D.glossary.forEach(([title,en,body]) => add('glossary',{title,en,body}));
  const forest = add('travel',{title:'穿越森林',en:'Travel Through the Forest',body:D.forest_result});
  const path = add('travel',{title:'沿道路旅行',en:'Travel Along the Path',body:D.path_result});
  D.creation.forEach(([title,body],i) => add('creation',{title:title.replace(/^\d+\s*/,''),en:`Character Creation ${i+1}`,body},{step:i+1}));
  D.sessions.forEach((item,i) => add('session',item,{key:`session-${i}`}));
  const growth = add('session',{title:'取得成長',en:'Advancement',body:D.growth_intro});
  ['agendas','principles','moves'].forEach(group => D.gm[group].forEach(([title,body],i) => add('gm',{title,en:`GM ${group} ${i+1}`,body},{group})));
  const featOrder = ['雜技','暗算','偽造','拆除裝置','隱藏','扒竊','潛行','開鎖','巧手'];
  const skillOrder = ['劈開護甲','迷惑感官','解除武裝','擾亂團體','製作武器','招架','快速射擊','突襲團體','技巧射擊','兇惡打擊'];
  D.books.forEach(book => {
    add('character',{title:book.zh,en:book.en,body:book.description},{book});
    book.moves.forEach((move,i) => add('characterMove',{title:move.title,en:`${book.en} Move ${i+1}`,body:move.body},{role:book.zh,roleEn:book.en,required:book.required.includes(i)}));
  });
  const byId = new Map(entries.map(entry => [entry.id,entry]));
  const byTitle = new Map(entries.filter(e => ['basic','weapons','glossary','connections'].includes(e.type)).map(e => [e.title,e]));
  const view = $('#view'); let currentFilter = ''; let currentQuery = ''; let lastRoute = ''; let toastTimer;
  function toast(message) { const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
  function saveFavorites() {
    try { localStorage.setItem('root-rpg-favorites-v1',JSON.stringify([...favorites])); } catch (_) { toast('瀏覽器未允許儲存，收藏僅保留於本次開啟。'); }
    $('#favorite-count').textContent=favorites.size;
  }
  function rich(body) {
    return String(body).split(/\n\s*\n/).map(block => {
      const lines=block.split('\n'); let out='';let inList=false;
      for (const raw of lines) {
        let text=esc(raw).replace(/^(10\+|7-9|失敗|成功)([：，])/,'<span class="result-label">$1$2</span>');
        text=text.replace(/【特殊】/g,'<span class="badge">特殊</span>');
        if (/^•\s*/.test(raw)) { if(!inList){out+='<ul>';inList=true;}out+=`<li>${text.replace(/^•\s*/,'')}</li>`; }
        else {if(inList){out+='</ul>';inList=false;}out+=`<p>${text}</p>`;}
      }
      return out+(inList?'</ul>':'');
    }).join('');
  }
  function star(entry) { return `<button class="favorite-button ${favorites.has(entry.id)?'saved':''}" data-favorite="${entry.id}" aria-pressed="${favorites.has(entry.id)}" aria-label="${favorites.has(entry.id)?'取消收藏':'收藏'}${esc(entry.title)}">${favorites.has(entry.id)?'★':'☆'}</button>`; }
  function explanation(entry, open=false) {
    const note=entry.explanation;if(!note)return '';
    return `<details class="entry-explanation" ${open?'open':''}><summary>詳細說明與判定提示</summary><div class="explanation-content">${note.sections.map(s=>`<section><h4>${esc(s.title)}</h4>${rich(s.body)}</section>`).join('')}<p class="explanation-source">參考：核心規則書，書內第 ${esc(note.pages)} 頁（PDF 頁次多 1 頁）。${entry.type==='basic'?'另核對 <a href="https://ps-cheng.github.io/root-rpg-zh/move/the-basic-moves/" target="_blank" rel="noopener noreferrer">中文基本動作 ↗</a>。':''}</p></div></details>`;
  }
  function card(entry, standalone=false) {
    const negative=entry.type==='tags'&&entry.title.includes('〔負面〕');const title=entry.title.replace('〔負面〕','');
    const special=entry.type==='weapons'&&entry.body.startsWith('【特殊】');
    return `<article class="reference-card ${negative?'negative':''}" id="${entry.id}"><div class="card-top"><div><span class="card-category">${esc(entry.role || types[entry.type])}</span><h3>${esc(title)}${special?'<span class="badge">特殊</span>':''}${negative?'<span class="badge negative">負面</span>':''}</h3><span class="card-en">${esc(entry.en || '')}</span></div><div class="card-actions">${star(entry)}</div></div><div class="card-body">${rich(special?entry.body.slice(4):entry.body)}</div>${explanation(entry,standalone)}<div class="card-bottom"><span>${entry.required?'起始已取得':negative?'建立成本返還 1 價值':entry.type==='tags'?'建立成本增加 1 價值':entry.type==='characterMove'?'角色專屬動作':'依故事情境觸發'}</span><button class="copy-button" data-copy="${entry.id}" aria-label="複製${esc(title)}連結">↗</button>${standalone?'':`<button class="text-link icon-button" style="font-size:11px" data-detail="${entry.id}">放大閱讀</button>`}</div></article>`;
  }
  function heading(title, en, description='') { return `<header class="page-heading"><span class="eyebrow">${esc(en)}</span><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</header>`; }
  function empty(title,body) {return `<div class="empty-state"><b>${esc(title)}</b>${esc(body)}</div>`;}
  function tabs(items,active) {return `<div class="tabs" role="group" aria-label="分類篩選">${items.map(([key,label])=>`<button class="tab ${active===key?'active':''}" data-filter="${key}" aria-pressed="${active===key}">${label}</button>`).join('')}</div>`;}
  function controls(items, placeholder) {return `<div class="section-tools">${tabs(items,currentFilter)}<label><span class="sr-only">${esc(placeholder)}</span><input class="filter-input" id="local-filter" type="search" placeholder="${esc(placeholder)}" value="${esc(currentQuery)}"></label></div>`;}
  function entryList(list) {return `<p class="result-count">${list.length} 個條目</p><div class="cards-grid">${list.length?list.map(e=>card(e)).join(''):empty('暫時找不到','試試較短的關鍵字，或切換分類。')}</div>`;}
  function filtered(list) {const q=normalize(currentQuery);return q?list.filter(e=>e.search.includes(q)):list;}
  function table(headers,rows) {return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function renderHome() {
    const frequent=['attempt-a-roguish-feat','engage-in-melee','trust-fate','read-a-tense-situation'].map(s=>entries.find(e=>e.id.endsWith(s))).filter(Boolean);
    return `<section class="hero"><div class="hero-copy"><span class="eyebrow">A FIELD GUIDE TO THE WOODLAND</span><h1>你的茂林，<br>隨手可查。</h1><p>從一次大膽的行動，到下一段冒險。<br>動作、裝備與角色，陪你穿行茂林的隨身手冊。</p><button class="hero-search" data-action="search"><span class="search-icon"></span><span>今天，你想查什麼？</span><kbd>/</kbd></button></div><img class="hero-art" src="assets/portraits/adventurer.webp" alt="背著裝備、準備出發的冒險者" fetchpriority="high"></section>
      <div class="quick-grid">${[['↗','動作速查','基本・武器・旅行・名聲','moves'],['◇','裝備標籤','35 正面 ＋ 10 負面','equipment'],['♧','認識你的角色','19 種扮演書','characters'],['↓','列印與填寫','參考資料・中文角色卡','downloads']].map(([icon,title,sub,route])=>`<a class="quick-tile" href="#${route}"><span class="tile-icon">${icon}</span><span class="arrow">↗</span><strong>${title}</strong><small>${sub}</small></a>`).join('')}</div>
      <div class="home-columns"><section><div class="heading-row"><h2>桌上常用動作</h2><a href="#moves">查看全部 ↗</a></div><div class="frequent-list">${frequent.map((e,i)=>`<a class="frequent-item" href="#entry/${e.id}"><span>0${i+1}</span><div><strong>${e.title}</strong><small>${e.en}</small></div><span>↗</span></a>`).join('')}</div></section><aside class="dice-panel"><h3>擲骰之前，先說故事。</h3><div class="dice-row"><b>10+</b><span>依動作取得較佳結果。</span></div><div class="dice-row"><b>7–9</b><span>依動作面對代價、限制或選擇。</span></div><div class="dice-row"><b>6−</b><span>失敗，GM 推進局勢；另有規定時依動作處理。</span></div><p class="micro">擲 2d6 ＋ 指定能力值。不同動作的結果各有差異，請閱讀完整效果。</p></aside></div>
      <div class="heading-row"><h2>讓你的旅人有個故事</h2><a href="#characters">查看 19 種角色 ↗</a></div><div class="character-grid">${D.books.slice(0,3).map(characterCard).join('')}</div>`;
  }
  function renderMoves() {
    let list=entries.filter(e=>['basic','weapons','reputation','travel','feats','risks'].includes(e.type));
    if(currentFilter==='travel')return heading('旅行與名聲','TRAVEL & REPUTATION','全體玩家共同決定旅行方式，並推派其中一人擲骰。')+controls([['all','全部'],['basic','基本動作'],['weapons','武器動作'],['feats','專長與風險'],['travel','旅行'],['reputation','名聲']], '搜尋旅行與名聲…')+renderTravel();
    if(currentFilter!=='all')list=list.filter(e=>currentFilter==='feats'?['feats','risks'].includes(e.type):e.type===currentFilter);
    const note=currentFilter==='weapons'?'<div class="notice">特殊動作須掌握對應武器技能，或由裝備等效果允許。貼身 intimate ／ 近距 close ／ 遠距 far。武裝攻擊預設 1 點創傷，空手通常 1 點疲勞，依動作及情境調整。</div>':currentFilter==='feats'?'<div class="notice">使用已掌握的專長時，擲骰＋靈巧；未掌握時改用「相信命運」。每項專長的風險列於卡片中，下方「風險」條目說明後果。</div>':'';
    return heading('動作速查','MOVES','先說明你的角色要做什麼；符合觸發條件時，再使用對應動作。')+controls([['all','全部'],['basic','基本動作'],['weapons','武器動作'],['feats','專長與風險'],['travel','旅行'],['reputation','名聲']], '搜尋動作或效果…')+note+entryList(filtered(list));
  }
  function renderTravel() {
    const q=normalize(currentQuery);
    const travelCard=(e,rows)=>`<section><h2>${e.title}</h2>${table(['旅行方式','個人效果','全隊共同負擔','擲骰修正'],rows)}${card(e)}</section>`;
    return '<div class="notice">「全隊共同負擔」可由玩家協商如何分攤，或由一位角色承受全部；「每人」則各自處理。</div><div class="travel-grid">'+[[forest,D.travel_forest],[path,D.travel_path]].filter(([e,rows])=>!q||normalize(e.search+JSON.stringify(rows)).includes(q)).map(([e,rows])=>travelCard(e,rows)).join('')+'</div>';
  }
  function renderEquipment() {
    let list=entries.filter(e=>e.type==='tags');
    if(currentFilter==='positive')list=list.filter(e=>!e.title.includes('〔負面〕'));
    if(currentFilter==='negative')list=list.filter(e=>e.title.includes('〔負面〕'));
    return heading('裝備與標籤','EQUIPMENT','先建立裝備，再依需求查閱正面與負面標籤。')+
      `<section class="equipment-guide"><h2>建立裝備</h2><div class="notice">${esc(D.equipment_intro)}</div><div class="equipment-guide-grid"><div>${table(['建立裝備的項目','價值計算'],D.equipment_cost)}</div><div class="card-body">${rich(D.equipment_notes)}</div></div>${explanation({explanation:D.explanations?.Equipment})}</section>
      <details class="embedded-reference equipment-examples" id="equipment-examples" ${currentFilter==='premade'?'open':''}><summary>參考範例裝備 · 6 件</summary><p class="section-note">不確定怎麼組合時，先看看成品的價值、標籤與磨損。</p><div class="cards-grid">${entries.filter(e=>e.type==='premade').map(e=>card(e)).join('')}</div></details>
      <section class="equipment-tags"><div class="heading-row"><h2>查閱裝備標籤</h2></div>${controls([['all','全部 45'],['positive','正面 35'],['negative','負面 10']], '搜尋標籤或效果…')}${entryList(filtered(list))}</section>`;
  }
  function characterCard(book) {return `<a class="character-card" href="#character/${book.en.toLowerCase()}"><span class="portrait-stage"><img src="${book.portrait}" alt="${esc(book.zh)}的角色示意圖" loading="lazy" width="210" height="180"></span><span class="character-info"><strong>${esc(book.zh)}</strong><small>THE ${book.en.toUpperCase()}</small><p>${esc(book.description.slice(0,47))}…</p><span class="role-stats">${D.stats.map(([zh],i)=>`${zh[0]} ${book.stats[i]>=0?'+':''}${book.stats[i]}`).join('　')}</span></span></a>`;}
  function renderCharacters() {
    const books=D.books.filter(b=>(currentFilter==='all'||b.set===currentFilter)&&(!currentQuery||normalize(b.zh+b.en+b.description).includes(normalize(currentQuery))));
    return heading('認識你的角色','PLAYBOOKS','每一位旅人，都有不同的本事、願望，以及留下的故事。')+controls([['all','全部 19'],['基礎扮演書','基礎扮演書'],['旅人與外來者','旅人與外來者']], '搜尋角色名稱…')+`<p class="result-count">${books.length} 種角色</p><div class="character-grid">${books.map(characterCard).join('')}</div>`;
  }
  function renderCharacter(book) {
    const moves=entries.filter(e=>e.type==='characterMove'&&e.roleEn===book.en);
    const skillLinks=skillOrder.map((title,i)=>`<span class="pill ${book.skills.includes(i)?'starting':''}">${book.skills.includes(i)?'★ ':''}<a href="#entry/${entries.find(e=>e.type==='weapons'&&e.title===title)?.id}">${title}</a></span>`).join('');
    return `<p><a class="text-link" href="#characters">← 所有角色</a></p><div class="character-detail-head"><div><span class="eyebrow">${book.set}</span><h1>${book.zh}</h1><span class="card-en">THE ${book.en.toUpperCase()}</span><p>${esc(book.description)}</p></div><img src="${book.portrait}" alt="${book.zh}示意圖"></div><div class="stat-grid">${D.stats.map(([zh,en],i)=>`<div class="stat-item"><b>${book.stats[i]>=0?'+':''}${book.stats[i]}</b>${zh}<span class="card-en">${en}</span></div>`).join('')}</div><p class="section-note">以上為起始數值；任選一項 ＋1，創角此步上限 ＋2。起始裝備價值：${book.value}。</p><div class="detail-columns"><section class="detail-section"><h3>選擇一項天性</h3>${[0,2].map(i=>`<div class="mini-card"><h4>${esc(book.nature[i])}</h4>${rich(book.nature[i+1])}</div>`).join('')}</section><section class="detail-section"><h3>選擇兩項動機</h3>${book.drives_full.map(([title,body])=>`<div class="mini-card"><h4>${esc(title)}</h4>${rich(body)}</div>`).join('')}</section></div><section class="detail-section"><h3>遊俠專長</h3><p class="section-note">${esc(book.feat_instruction)}</p><div class="pill-list">${book.feats.map(i=>`<span class="pill starting">${featOrder[i]}</span>`).join('')}</div></section><section class="detail-section"><h3>起始武器技能</h3><p class="section-note">起始從 ★ 標示項目選擇 1 項；依此扮演書的特殊指示。</p><div class="pill-list">${skillLinks}</div></section><section class="detail-section"><h3>你的動作</h3><p class="section-note">${book.required.length?'標示「起始已取得」者為必選，其餘依角色卡指示選擇。':'起始選擇 3 項動作。'}</p><div class="cards-grid">${moves.map(e=>card(e)).join('')}</div></section><section class="detail-section"><h3>你的關係</h3><div class="cards-grid">${book.connections.map(([title,prompt],i)=>`<article class="reference-card"><h3>${esc(title)}</h3><div class="card-body">${rich(prompt)}${rich(book.connection_effects[i])}</div></article>`).join('')}</div></section><a href="#downloads" class="button">下載可填寫角色卡 ↓</a>`;
  }
  function nameList(query='') {
    const names=D.names.filter(pair=>normalize(pair.join(' ')).includes(normalize(query)));
    return `<p class="result-count">${names.length} 個名字</p><div class="name-grid">${names.map(([en,zh])=>`<div class="name-pair"><span>${esc(en)}</span><span>${esc(zh)}</span></div>`).join('')}</div>`;
  }
  function creationReference(kind) {
    if(kind==='names')return `<details class="embedded-reference" id="creation-names"><summary>展開名字靈感與中文音譯 · 104 個</summary><div class="heading-row"><p class="section-note">中文為參考音譯，可依桌上共識調整讀法。</p><button class="button secondary" data-action="random-name">隨機挑一個 ↝</button></div><label class="name-search"><span class="sr-only">搜尋中英名字</span><input id="name-filter" type="search" class="filter-input" placeholder="搜尋中英名字…"></label><div id="name-results">${nameList()}</div></details>`;
    return `<details class="embedded-reference" id="creation-connections"><summary>展開六種關係效果</summary><p class="section-note">先依扮演書填寫關係，再於此查閱相應效果。</p><div class="cards-grid">${entries.filter(e=>e.type==='connections').map(e=>card(e)).join('')}</div></details>`;
  }
  function renderCreation() {return heading('建立你的旅人','CHARACTER CREATION','依序完成 12 步；個別扮演書的特殊指示優先。')+`<div class="step-list">${D.creation.map(([title,body],i)=>`<section class="step-card" id="creation-step-${i+1}"><span class="step-number">${i+1}</span><div><h2>${esc(title.replace(/^\d+\s*/,''))}</h2><div class="card-body">${rich(body)}</div>${i===0?'<a class="text-link" href="#characters">選擇扮演書 ↗</a>':i===1?creationReference('names'):i===11?creationReference('connections'):i===9?'<a class="text-link" href="#equipment">建立與挑選裝備 ↗</a>':''}</div></section>`).join('')}</div>`;}
  function renderSession() {return heading('成長與聚會動作','ADVANCEMENT & SESSION MOVES','讓角色追逐自己的願望，也隨故事改變。')+`<div class="notice">${esc(D.growth_intro)}</div>${table(['每次選一項成長','上限與計算方式'],D.advances)}<div class="heading-row"><h2>聚會結束</h2></div><div class="cards-grid">${entries.filter(e=>e.type==='session'&&e.id!==growth.id).map(e=>card(e)).join('')}</div>`;}
  function renderGm() {const groups=[['agendas','你的目標'],['principles','你的原則'],['moves','你的動作']];return heading('GM 參考附錄','GM REFERENCE','以目標決定方向，以原則帶領，以動作推進局勢。')+`<div class="notice">玩家擲出失敗、行動或忽略危險造成明顯機會，或場面停滯時，可使用 GM 動作。軟動作預告危險、留下反應機會；硬動作直接落實後果。</div>`+groups.map(([key,title])=>`<div class="heading-row"><h2>${title}</h2></div><div class="cards-grid">${entries.filter(e=>e.type==='gm'&&e.group===key).map(e=>card(e)).join('')}</div>`).join('')+`<div class="heading-row"><h2>卡住時</h2></div><div class="cards-grid">${D.gm_stuck.map(v=>`<section class="reference-card"><h3>${v.title}</h3><span class="card-en">${v.en}</span><div class="card-body">${rich(v.body)}</div></section>`).join('')}</div><div class="heading-row"><h2>NPC 與傷害</h2></div><div class="notice">建立 NPC 時，給予名字、含種族的描述、工作與動機。真正交戰或須標記傷害時，再設定傷害軌與攻擊。單一 NPC 各軌 1–5 格。</div>${table(['NPC 範例','創傷','疲勞','磨損','士氣'],D.npc_tracks)}${table(['群體','人數','各傷害軌','傷害'],D.mobs)}${table(['攻擊／武器','傷害'],D.npc_attacks)}<p class="section-note">動機靈感：${D.npc_drives}</p>`;}
  function renderDownloads() {return heading('帶上你的手冊','PDF DOWNLOADS','離線查閱、列印上桌，或直接在電腦填寫中文角色卡。')+`<div class="download-grid">${D.downloads.map(d=>`<article class="download-card"><div class="file-icon">PDF</div><h2>${d.label}</h2><p>${d.description}</p><small>A4 · 繁體中文 · ${d.size} MB</small><a class="button" href="downloads/${d.file}" download>下載 PDF ↓</a></article>`).join('')}</div><div class="notice" style="margin-top:25px">可填寫版請使用支援 PDF 表單的閱讀器開啟，輸入或勾選後另存。網站內的收藏儲存在這台裝置的瀏覽器中。</div>`;}
  function renderAbout() {return heading('關於這份手冊','ABOUT THIS FIELD GUIDE')+`<article class="about-content"><p>這是一份供桌上遊戲查閱的非官方繁體中文整理，以目前校訂的玩家參考資料與 19 種中文角色卡為基礎。網站提供分類、搜尋及收藏；完整規則仍以正式出版品為準。</p><h2>整理與翻譯參考</h2><p>Root-Playbooks-PrintFriendly-20220228.pdf、Root-TO-Playbooks-Jan2022-PrintFriendly.pdf、RootTTPRG_Corebook_100721.pdf，以及既有中文 Root Move、Root Playbook、試算表與全文資料庫。既有翻譯參考 Mori、空空、阿羊。</p><p>亦參考 <a href="https://ps-cheng.github.io/root-rpg-zh/" target="_blank" rel="noopener noreferrer">茂林源記：中文網站 ↗</a>；與英文規則衝突的條目已按本次校訂文字整理。</p><h2>權利與圖片</h2><p>Root 與角色原繪 © Leder Games；遊戲文字與設計 © Magpie Games；角色原繪 Kyle Ferrin。上述權利屬原權利人所有。網站整理與中文音譯不代表官方版本。</p><h2>字體</h2><p>使用先前角色卡採用的清松手寫體：大標為 1 SemiBold、區塊標題為 1 Medium、重點為 2 SemiBold、內文與輔助資訊為 2 Regular。網站使用縮減字元並重新命名的網頁字體子集，來源為 max32002 / JasonHandWritingFonts；依 <a href="assets/fonts/OFL.txt">SIL Open Font License 1.1</a> 提供。</p><h2>收藏與閱讀</h2><p>不需帳號即可查閱。收藏僅儲存在你目前的瀏覽器，不會上傳到伺服器；清除瀏覽資料後會一併移除。頁面未使用追蹤或外部字體服務。</p><p>內容版本：${D.version}。PDF 下載與網站內容分別保留適合列印及手機閱讀的版面。</p></article>`;}
  function updateLocalResults() {
    const expanded=[...view.querySelectorAll('details[open][id]')].map(e=>e.id);
    const input=$('#local-filter');const start=input?.selectionStart;const end=input?.selectionEnd;
    const route=(location.hash.slice(1)||'home').split('/')[0];
    const renderers={moves:renderMoves,equipment:renderEquipment,characters:renderCharacters};
    if(renderers[route])view.innerHTML=renderers[route]();
    expanded.forEach(id=>{const section=document.getElementById(id);if(section)section.open=true;});
    annotateTerms(view);
    const next=$('#local-filter');if(next){next.focus({preventScroll:true});if(next.type==='search'&&start!==null){try{next.setSelectionRange(start,end);}catch(_){}}}
  }
  function render() {
    const [route='home',sub='']=(location.hash.replace(/^#/,'')||'home').split('/');
    if(route==='connections'){location.replace('#creation/connections');return;}
    if(route==='glossary'){location.replace('#moves/basic');return;}
    if(lastRoute!==route || (['moves','equipment'].includes(route)&&sub!==currentFilter)) {currentQuery='';currentFilter=sub||'all';}
    lastRoute=route;
    $('#search-dialog').close();$('#detail-dialog').close();$('#nav-dialog').close();
    let active=route;
    if(route==='home')view.innerHTML=renderHome();
    else if(route==='moves')view.innerHTML=renderMoves();
    else if(route==='equipment')view.innerHTML=renderEquipment();
    else if(route==='characters')view.innerHTML=renderCharacters();
    else if(route==='character') {const book=D.books.find(b=>b.en.toLowerCase()===sub);active='characters';view.innerHTML=book?renderCharacter(book):empty('找不到這位旅人','請回到角色列表。');}
    else if(route==='creation')view.innerHTML=renderCreation();
    else if(route==='session')view.innerHTML=renderSession();
    else if(route==='favorites')view.innerHTML=heading('我的收藏','YOUR FIELD NOTES','常用的動作與標籤，收在同一處。收藏僅儲存在這台裝置。')+(favorites.size?entryList(entries.filter(e=>favorites.has(e.id))):empty('手冊裡留個記號','點選條目旁的 ☆，把常用的規則收在這裡。'));
    else if(route==='gm')view.innerHTML=renderGm();
    else if(route==='downloads')view.innerHTML=renderDownloads();
    else if(route==='about')view.innerHTML=renderAbout();
    else if(route==='entry') {const e=byId.get(sub);active=e?.type==='tags'||e?.type==='premade'?'equipment':'moves';view.innerHTML=e?`<p><a class="text-link" href="#${active}">← 返回${active==='moves'?'動作':'裝備'}列表</a></p>`+heading(e.title.replace('〔負面〕',''),e.en||'REFERENCE')+(e.type==='character'?renderCharacter(e.book):e.type==='travel'?renderTravel():card(e,true)):empty('找不到這個條目','請用搜尋找找其他關鍵字。');}
    else view.innerHTML=empty('這條小徑還沒有路標','從首頁或搜尋重新出發吧。');
    document.querySelectorAll('[data-nav]').forEach(a=>{const on=a.dataset.nav===active;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('#favorite-count').textContent=favorites.size;
    view.dataset.route=location.hash.slice(1)||'home';
    const pageTitle=$('h1',view)?.textContent||'玩家手冊';document.title=`${pageTitle} · 茂林旅人 Root RPG`;
    annotateTerms(view);
    window.scrollTo({top:0,behavior:'instant'});
    if(route==='creation'&&['names','connections'].includes(sub)){
      const section=$('#creation-'+sub);section.open=true;document.fonts.ready.then(()=>{if(location.hash==='#creation/'+sub)requestAnimationFrame(()=>section.scrollIntoView({block:'start'}));});
    }
    if(route==='equipment'&&sub==='premade')$('#equipment-examples').scrollIntoView({block:'start'});
  }
  const termPattern=/下次\s*[＋+]1|創傷|疲勞|消耗|磨損|士氣|扣住|傷害/g;
  function annotateTerms(root) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      if(!node.parentElement||node.parentElement.closest('a,button,summary,h1,h2,h3,h4,input,textarea,script,style,.card-en,.explanation-source,.sr-only'))return NodeFilter.FILTER_REJECT;
      termPattern.lastIndex=0;return termPattern.test(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const fragment=document.createDocumentFragment();let previous=0;termPattern.lastIndex=0;
      for(const match of node.nodeValue.matchAll(termPattern)){
        fragment.append(document.createTextNode(node.nodeValue.slice(previous,match.index)));
        const title=match[0].startsWith('下次')?'下次 +1':match[0];const entry=entries.find(e=>e.type==='glossary'&&e.title===title);
        const link=document.createElement('a');link.href='#entry/'+entry.id;link.dataset.term=entry.id;link.className='term-link';link.textContent=match[0];link.setAttribute('aria-haspopup','dialog');link.setAttribute('aria-label',match[0]+'：查看說明');fragment.append(link);previous=match.index+match[0].length;
      }
      fragment.append(document.createTextNode(node.nodeValue.slice(previous)));node.replaceWith(fragment);
    }
  }
  function openTerm(id) {
    const entry=byId.get(id);if(!entry||entry.type!=='glossary')return;
    $('#term-content').innerHTML=`<span class="eyebrow">規則名詞</span><h2 id="term-title">${esc(entry.title)}</h2><p class="card-en">${esc(entry.en)}</p><div class="card-body">${rich(entry.body)}</div>${explanation(entry,true)}`;
    const dialog=$('#term-dialog');if(!dialog.open)dialog.showModal();
  }
  function openSearch() {const dialog=$('#search-dialog');if(!dialog.open)dialog.showModal();$('#global-search').focus();search($('#global-search').value);}
  function search(query) {
    const q=normalize(query);let list=q?entries.filter(e=>e.search.includes(q)):entries.filter(e=>['basic','tags'].includes(e.type)).slice(0,6);
    list.sort((a,b)=>Number(normalize(b.title)===q)-Number(normalize(a.title)===q));
    const exact=q&&list.length;const visible=list.slice(0,40);
    $('#search-results').innerHTML=(q?`<p class="result-count">找到 ${list.length} 個條目${list.length>40?'，先顯示前 40 筆':''}</p>`:'<p class="result-count">常用條目</p>')+(visible.length?visible.map(e=>`<a class="search-result" href="#${e.type==='character'?'character/'+e.en.toLowerCase():e.type==='connections'?'creation/connections':'entry/'+e.id}" ${e.type==='glossary'?`data-term="${e.id}" aria-haspopup="dialog"`:''}><span class="result-type">${types[e.type]}</span><strong>${esc(e.title.replace('〔負面〕',''))}</strong><span class="card-en">${esc(e.en||'')}</span><p>${esc(e.body.replace(/\n/g,' ').slice(0,100))}…</p></a>`).join(''):empty('找不到相關內容','請試試中文名稱、英文名稱，或效果中的關鍵字。'));
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.dataset.action==='search')openSearch();
    if(target.dataset.action==='menu')$('#nav-dialog').showModal();
    if(target.dataset.action==='close-detail')$('#detail-dialog').close();
    if(target.dataset.action==='random-name'){const [en,zh]=D.names[Math.floor(Math.random()*D.names.length)];toast(`${en} · ${zh}`);}
    if(target.dataset.favorite) {
      const id=target.dataset.favorite;if(favorites.has(id))favorites.delete(id);else favorites.add(id);saveFavorites();
      document.querySelectorAll(`[data-favorite="${id}"]`).forEach(el=>{el.classList.toggle('saved',favorites.has(id));el.textContent=favorites.has(id)?'★':'☆';el.setAttribute('aria-pressed',favorites.has(id));el.setAttribute('aria-label',(favorites.has(id)?'取消收藏':'收藏')+byId.get(id).title);});
      if(location.hash==='#favorites')render();
    }
    if(target.dataset.copy){const url=new URL(location.href);url.hash='entry/'+target.dataset.copy;try{await navigator.clipboard.writeText(url.href);toast('已複製條目連結');}catch(_){toast('可從網址列複製此條目的連結');location.hash=url.hash;}}
    if(target.dataset.term){event.preventDefault();openTerm(target.dataset.term);return;}
    if(target.dataset.action==='close-term')$('#term-dialog').close();
    if(target.dataset.detail) {const entry=byId.get(target.dataset.detail);$('#detail-content').innerHTML=`<h2 id="detail-title" class="sr-only">${esc(entry.title)}</h2>`+card(entry,true);annotateTerms($('#detail-content'));$('#detail-dialog').showModal();}
    if(target.dataset.filter) {currentFilter=target.dataset.filter;currentQuery='';const route=(location.hash.slice(1)||'home').split('/')[0];if(['moves','equipment'].includes(route)){const next=`#${route}/${currentFilter}`;if(location.hash!==next)location.hash=next;else updateLocalResults();}else updateLocalResults();}
    if(target.closest('#search-results'))$('#search-dialog').close();
  });
  document.addEventListener('input',event=>{if(event.target.id==='name-filter')$('#name-results').innerHTML=nameList(event.target.value);if(event.target.id==='global-search')search(event.target.value);if(event.target.id==='local-filter'){currentQuery=event.target.value;updateLocalResults();}});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)&&!$('#detail-dialog').open){event.preventDefault();openSearch();}});
  ['search-dialog','detail-dialog','term-dialog'].forEach(id=>{$('#'+id).addEventListener('click',event=>{if(event.target===$('#'+id)){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});});
  window.addEventListener('hashchange',render);render();
  window.ROOT_REFERENCE_DEBUG={entries:entries.length,categories:Object.fromEntries(Object.keys(types).map(type=>[type,entries.filter(e=>e.type===type).length]))};
})();
