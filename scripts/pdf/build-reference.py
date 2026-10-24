from pathlib import Path
import json,itertools
src=Path('website/root-rpg-player-reference/scripts/pdf/build-playbooks.py').read_text(encoding='utf8')
exec(src[:src.index('def footer')])
exec(src[src.index('def frame('):src.index('def reputation(')])
B=Path('tmp/player-reference');D=json.loads(Path('website/root-rpg-player-reference/scripts/reference.json').read_text(encoding='utf8'));D['premade']=[e for e in D['premade'] if e['en'] in ['Chainmail', 'Dagger', 'Leather Armor', 'Mousefolk Short Sword', 'Plate Armor', 'Shortbow']];TOTAL=10
OUTFILE=OUT/'Root-RPG-玩家參考資料-A4列印版.pdf'
C=canvas.Canvas(str(OUTFILE),pagesize=(W,H),initialFontName='ZH',pageCompression=1)
C.setTitle('Root RPG 玩家參考資料｜繁體中文校訂版');C.setAuthor('非官方繁體中文參考整理')
def start(title,sub):
 global PAGE
 PAGE+=1;C.bookmarkPage(str(PAGE));C.addOutlineEntry(title,str(PAGE),0,False)
 text(34,26,title,29,'ZTitle');text(35,66,sub,9,'ZH',GREY);rule(34,88,527)
def finish(source):
 rule(34,816,527,LIGHT,.5)
 text(34,828,'Root © Leder Games · Text & design © Magpie Games · 非官方繁體中文校訂參考版',6.3,'ZH',GREY)
 text(519,826,f'{PAGE:02d} / {TOTAL}',7,'ZH',GREY);C.showPage()
def section(t,x,y,w):return heading(t,x,y,w,17)
def items(arr,x,y,w,size=11,gap=12,draw=True):
 for a in arr:
  y+=para(a['title'],x,y,w,14,17,font='ZS',draw=draw)
  if a.get('en'):y+=para(a['en'],x,y,w,8,10,color=GREY,draw=draw)
  y+=4
  y+=para(a['body'],x,y,w,size,size*1.4,draw=draw)+gap
 return y

def columns(arr,y=108,bottom=788,n=3,size=11,gap=13):
 w=(527-gap*(n-1))/n
 cuts=list(itertools.combinations(range(1,len(arr)),n-1)) if len(arr)>=n else []
 best=None
 for c in cuts:
  bounds=(0,)+c+(len(arr),);groups=[arr[bounds[i]:bounds[i+1]] for i in range(n)]
  ends=[items(g,0,y,w,size,draw=False) for g in groups]
  score=max(ends)+.03*(max(ends)-min(ends))
  if best is None or score<best[0]:best=(score,groups,ends)
 if not best:raise ValueError('no partitions')
 if max(best[2])>bottom:raise ValueError(('overflow',PAGE,max(best[2]),bottom,size))
 for i,g in enumerate(best[1]):items(g,34+i*(w+gap),y,w,size)
 return max(best[2])
def table(headers,rows,x,y,widths,size=10):
 xx=x
 for h,w in zip(headers,widths):para(h,xx+5,y+6,w-10,size,size*1.35,font='ZHB');xx+=w
 y+=max(para(h,0,0,w-10,size,size*1.35,draw=False) for h,w in zip(headers,widths))+12
 rule(x,y,sum(widths),OLIVE,.8)
 for row in rows:
  hh=max(para(str(t),0,0,w-10,size,size*1.4,draw=False) for t,w in zip(row,widths))+12
  xx=x
  for t,w in zip(row,widths):para(str(t),xx+5,y+6,w-10,size,size*1.4);xx+=w
  y+=hh;rule(x,y,sum(widths),LIGHT,.4)
 if y>793:raise ValueError(('table overflow',PAGE,y))
 return y

def pairs(arr):return [dict(title=t,en='',body=b) for t,b in arr]
start('基本動作、專長與風險','BASIC MOVES & ROGUISH FEATS · 擲 2d6 ＋ 指定能力值')
def compact_moves(arr,x,y,w,size=9.6,draw=True):
 for v in arr:
  y+=para(v['title'],x,y,w,12.5,15,font='ZS',draw=draw)
  y+=para(v['en'],x,y,w,7,9,color=GREY,draw=draw)
  y+=para(v['body'],x,y+2,w,size,12.8,draw=draw)+7
 return y
w=(527-28)/3
best=None
for a in range(1,8):
 for b in range(a+1,9):
  groups=[D['basic'][:a],D['basic'][a:b],D['basic'][b:]]
  ends=[compact_moves(g,0,103,w,draw=False) for g in groups]
  if best is None or max(ends)<best[0]:best=(max(ends),groups)
for i,g in enumerate(best[1]):compact_moves(g,34+i*(w+14),103,w)
lx=34+2*(w+14);ly=compact_moves(best[1][2],0,103,w,draw=False)+5
rule(lx,ly,w,LIGHT,.4)
ly+=7
legend='10+：依動作取得較佳結果。7-9：依動作面對代價、限制或選擇。6 以下：失敗，由 GM 推進局勢；個別動作若另有失敗效果，依該動作處理。'
ly+=para(legend,lx,ly,w,8.7,11.5,color=GREY)
y=max(best[0],ly)+5
rule(34,y,527,OLIVE,.7)
y+=9
text(34,y,'遊俠專長',14,'ZS');text(396,y,'風險',14,'ZS');y+=22
# Risk numbers connect the feat list to the definitions in the right column.
risk_index={v['title']:i+1 for i,v in enumerate(D['risks'])}
fy=y
for zh,en,use,risks in D['feats']:
 text(34,fy,zh,10,'ZHB');text(94,fy+1,en,7.1,'ZH',GREY)
 fy+=13
 codes=risks
 fy+=para(use+'；風險 '+codes,34,fy,347,9,12)+5
 rule(34,fy-2,347,LIGHT,.35)
ry=y
for i,v in enumerate(D['risks'],1):
 ry+=para(str(i)+' '+v['title'],396,ry,165,9.3,12,font='ZHB')
 ry+=para(v['body'],396,ry,165,8.8,11.8)+4
if max(fy,ry)>793:raise ValueError(('combined overflow',fy,ry,best[0]))
finish('')
start('武器動作','WEAPON MOVES · 距離：貼身 intimate ／ 近距 close ／ 遠距 far')
para('【特殊】動作須先掌握對應武器技能，或由裝備等效果允許使用。武裝攻擊預設造成 1 點創傷；空手通常造成 1 點疲勞，實際依動作與情境調整。',34,101,527,10,14)
weapon_display=[]
for move in D['weapons']:
 display=dict(move)
 if display['body'].startswith('【特殊】'):
  display['title']+='【特殊】'
  display['body']=display['body'][4:]
 weapon_display.append(display)
columns(weapon_display,147,bottom=793,size=10.2)
finish('英文參考第 20 頁 · 「技巧射擊」7-9 選兩項；「貼身搏鬥」同時選擇')
start('裝備','EQUIPMENT · 先決定物品，再選磨損、射程、技能與標籤')
y=103;y+=para(D['equipment_intro'],34,y,527,11,16)
y=table(['建立裝備的項目','價值計算'],D['equipment_cost'],34,y+17,[205,322],10.5)
y+=17;y+=para('標籤必須符合物品特性，並由 GM 同意；例如弓不適合長柄，盾不適合短肢。裝備可以有 0 格磨損，但一旦承受磨損便立刻毀壞。約大型匕首／短劍大小的物品，預設占 1 重量；更小的物品不占重量，更大的物品以沉重等標籤增加重量。負重門檻為 4＋力量，攜帶上限為門檻的兩倍。',34,y,527,10.5,15)
y=section('六件範例裝備',34,y+21,527)
columns(D['premade'],y,bottom=792,n=2,size=10.5)
finish('英文參考第 25 頁 · 補齊六件範例裝備及標籤合理性、預設重量說明')
positive_tags=[t for t in D['tags'] if '〔負面〕' not in t['title']]
negative_tags=[t for t in D['tags'] if '〔負面〕' in t['title']]
start('裝備標籤','EQUIPMENT TAGS · 35 個正面標籤 ＋ 10 個負面標籤')
def dense_tags(arr,x,y,w,draw=True):
 for v in arr:
  title=v['title'].replace('〔負面〕','')
  units=[(title+' ','ZHB',10.7,INK),(v['en']+' ','ZH',7.2,GREY)]
  bodyunits=[];pending=''
  for tok in TOKEN.findall(v['body']):
   if tok in OPEN:pending+=tok;continue
   tok=pending+tok;pending=''
   if tok in CLOSE and bodyunits:bodyunits[-1]+=tok
   else:bodyunits.append(tok)
  units += [(t,'ZH',9.8,INK) for t in bodyunits]
  lines=[];line=[];used=0
  for u in units:
   uw=width_of(u[0],u[1],u[2])
   if line and used+uw>w:
    lines.append(line);line=[];used=0
   if not line and u[0].isspace():continue
   line.append(u);used+=uw
  if line:lines.append(line)
  if draw:
   for row,runs in enumerate(lines):
    cx=x;line_text=''
    for value,font,size,color in runs:
     inline(value,cx,H-y-row*12.9-9.8*.86,size,font,color)
     cx+=width_of(value,font,size);line_text+=value
    LINE_AUDIT.append(dict(page=PAGE,text=line_text,x=x,y=y+row*12.9,w=w,size=10.7,font='ZH',actual_width=cx-x))
   AUDIT.append(dict(page=PAGE,x=x,y=y,w=w,h=len(lines)*12.9,size=9.8,text=title+' '+v['en']+' '+v['body']))
  y+=len(lines)*12.9+6
 return y
# Inline names and effects allow larger body type within four columns.
left=26;w=128.25;gap=10
text(left,101,'正面：每個增加 1 價值',11,'ZS')
text(left+3*(w+gap),101,'負面：返還 1 價值',10.5,'ZS')
rule(left,118,3*w+2*gap,LIGHT,.5)
rule(left+3*(w+gap),118,w,OLIVE,.7)
best=None
for a in range(1,len(positive_tags)-1):
 for b in range(a+1,len(positive_tags)):
  gs=[positive_tags[:a],positive_tags[a:b],positive_tags[b:]]
  height=max(dense_tags(g,0,128,w,False) for g in gs)
  if best is None or height<best[0]:best=(height,gs)
for i,g in enumerate(best[1]):dense_tags(g,left+i*(w+gap),128,w)
neg_end=dense_tags(negative_tags,left+3*(w+gap),128,w)
if max(best[0],neg_end)>799:raise ValueError(('dense tag overflow',best[0],neg_end))
C.setStrokeColor(LIGHT);C.setLineWidth(.5);C.line(left+3*(w+gap)-5,H-100,left+3*(w+gap)-5,H-800)
finish('')
PAGE+=1
C.bookmarkPage(str(PAGE));C.addOutlineEntry('旅行動作與名聲動作',str(PAGE),0,False)
lx=26;lw=253;rx=295;rw=274
ly=section('旅行動作',lx,30,lw)
ly+=para('由全體玩家共同決定旅行方式，並推派其中一人擲骰。「全隊共同負擔」可由玩家協商要怎麼共同分攤或由一位角色承受全部。',lx,ly,lw,10.4,13.8)
ly=heading('穿越森林',lx,ly+12,lw,13)
forestrows=[[mode+'\n擲骰 '+mod,person,shared] for mode,person,shared,mod in D['travel_forest']]
ly=table(['方式／擲骰修正','個人效果','全隊共同負擔'],forestrows,lx,ly,[85,76,92],9.6)
ly+=10
ly+=para('從領地穿越森林到另一塊領地時，依上表擲骰。成功：抵達森林另一側的任一領地。途中有人發現有趣地點，留下標記，便於旅程後返回。\n10+：大致安全。7-9：森林裡某個東西尾隨你們；讓它跟著，或每名遊俠標記疲勞以甩掉它。失敗：途中遭遇森林的危險且難以脫身；必須先解決，才能到達另一側領地。',lx,ly,lw,10.4,13.8)
ly=heading('沿道路旅行',lx,ly+13,lw,13)
pathrows=[[mode+'\n擲骰 '+mod,person,shared] for mode,person,shared,mod in D['travel_path']]
ly=table(['方式／擲骰修正','個人效果','全隊共同負擔'],pathrows,lx,ly,[85,76,92],9.6)
ly+=10
ly+=para('沿道路從領地到領地時，依上表擲骰。成功：及時抵達下一塊領地。10+：路途快速且不受打擾。7-9：遇見值得注意的事物，例如商隊、戰場或途經的奇異事物。失敗：抵達前捲入危險局勢。',lx,ly,lw,10.4,13.8)
ry=section('名聲動作',rx,30,rw)
ry+=para('名聲代表陣營整體如何看待你。下列動作使用對應陣營的名聲值進行擲骰；有門檻者須先符合門檻。',rx,ry,rw,10.4,13.8)+13
cw=(rw-14)/2
repends=[]
for i,group in enumerate([D['reputation'][:3],D['reputation'][3:]]):
 x=rx+i*(cw+14);yy=ry
 for v in group:
  yy+=para(v['title'],x,yy,cw,12.2,15,font='ZHB')
  yy+=para(v['en'],x,yy,cw,7.5,9.5,color=GREY)+3
  yy+=para(v['body'],x,yy,cw,10.4,13.8)+10
 repends.append(yy)
if max(ly,*repends)>799:raise ValueError(('travel rep overflow',ly,repends))
C.setStrokeColor(LIGHT);C.setLineWidth(.5);C.line(287,H-30,287,H-800)
finish('')
start('成長與聚會動作','ADVANCEMENT & SESSION MOVES · 遊戲中達成動機，聚會結束再次檢查')
y=section('取得成長',34,104,527)
y+=para('滿足一項動機的條件時，可立即選擇一項成長；不必等到聚會結束。每項動機每次聚會限成長一次。學會技能或專長時，想一想是誰教你、或經過什麼練習。若取得新裝備或其他故事變化，由GM安排合理的取得方式並盡快讓它在劇情中出現。',34,y,527,11,16)
y=table(['每次選一項成長','上限與計算方式'],[
 ['一項能力值 +1','此成長最高 +2；特定扮演書動作可使能力值達 +3。'],
 ['取得自身扮演書的一個新動作','自身扮演書動作最多 5 項，包含起始動作。'],
 ['取得其他扮演書的一個新動作','來自其他扮演書的動作最多共 2 項。'],
 ['取得最多兩項武器技能','總數最多 7 項，含起始技能；不計由扮演書動作取得者。'],
 ['取得最多兩項遊俠專長','總數最多 6 項，含起始專長；不計由扮演書動作取得者。'],
 ['一條傷害軌增加 1 格','創傷、疲勞或消耗，每條最多 6 格；扮演書動作額外給的格子不計。'],
 ['取得最多兩段新關係','總數最多 6 段。取得關係機制，無須沿用背景填空；可對同一遊俠建立不同關係。']
],34,y+15,[190,337],10.5)
y=section('聚會結束',34,y+22,527)
sessions=[dict(title='1　檢查動機與補領成長',en='Review Drives',body='每名玩家輪流大聲讀出自己的兩項動機。與其他玩家及 GM 討論本次聚會是否還有動機已達成條件但尚未提出？若確實有未討論過的動機，現在就取得成長。'),dict(title='2　更新角色的一項要素',en='Update Your Character',body='每名玩家輪流選擇是否更新，反映角色在故事中的改變，不觸發角色成長機制。要更新時，從以下三項擇一：\n• 以任一扮演書的動機替換一個舊動機。\n• 以任一扮演書的天性替換原有天性。\n• 以任一扮演書的關係替換一段舊關係，可改類型與對象。')]
ends=[]
for i,entry in enumerate(sessions):ends.append(items([entry],34+i*275,y,252,10.5,8))
finish('')
start('建立角色','CHARACTER CREATION · 依序完成；個別扮演書的特殊指示優先')
creation_details=[list(row) for row in D['creation']]
creation_details[1][1]='選擇名字、動物種族、外表與言行舉止；圈選合適選項，也可自訂。名字範例與中英音譯見下一頁。\n\n種族範例：'+D['species']+'。\n\n可選範例以外的動物，但該物種在現實中的體型不能大於狼，也不能選兩棲動物以外的純水生動物，例如魚。種族可能影響茂林居民對你的觀感，同時也可以保留現實中的部分特性，例如飛行、穴居等。'
creation_details[2][1]='在預設值上選一項 +1；創角此步不能超過 +2。五項能力值的意思如下：\n\n魅力 Charm：魅力衡量的是你的社交能力，使用言語及思想令別人折服於自己的能力。\n\n狡猾 Cunning：狡猾衡量你的思維敏銳程度，能注意到人或物的重要細節以及拐騙他人的能力。\n\n靈巧 Finesse：靈巧衡量你的手巧程度，以及依靠雙手執行複雜任務的能力。\n\n幸運 Luck：幸運衡量你是多麼幸運，將命運放到機會手中並脫穎而出的能力。\n\n力量 Might：力量衡量你有多麼強壯與堅韌，抵抗對手或以蠻力完成任務的能力。'
creation_details[4][1]='從扮演書的兩項天性選一項。天性是你內在的性格，也是紓解壓力的方式。實踐天性時清除整條疲勞軌；只要再次完成條件，就能再次觸發。你不必被迫遵從天性，應選擇自己有興趣扮演的選項。'
creation_details[5][1]='從扮演書的四項動機選兩項。動機表達你的深層願望與追求；滿足條件即可立即成長，每項動機每次聚會最多一次。覺得已達成時，主動向大家提出並與 GM 確認；聚會結束時再檢查遺漏。'
creation_details[10][1]='所有人完成前十步後，輪流介紹自己的角色。同時其他玩家、主持人也可以提出疑問，更了解你的角色。'
creation_details[11][1]='再輪一圈，每次填寫一段關係，寫入另一名遊俠的名字，建立彼此羈絆。各類關係的效果見下一頁；成長與聚會動作見第 6 頁。'
items(pairs(creation_details[:3]),34,105,254,10,11)
items(pairs(creation_details[3:]),309,105,252,10.5,11)
finish('')
start('名字與關係','NAMES & CONNECTIONS · 創角時查閱名字範例與關係效果')
y=section('名字靈感與中文音譯',34,102,527)
namepairs=json.loads((B/'names-zh.json').read_text(encoding='utf8'))
name_size=10.1;name_lead=14.5;cursor=34
for i,(en,zh) in enumerate(namepairs):
 unit=en+' '+zh;uw=width_of(unit,'ZH',name_size);sep=width_of(' · ','ZH',name_size)
 if cursor>34 and cursor+sep+uw>561:
  y+=name_lead;cursor=34
 if cursor>34:
  text(cursor,y,' · ',name_size,'ZH',GREY);cursor+=sep
 text(cursor,y,unit,name_size);cursor+=uw
 LINE_AUDIT.append(dict(page=PAGE,text=unit,x=cursor-uw,y=y,w=uw,size=name_size,font='ZH',actual_width=uw))
y+=name_lead+6
text(34,y,'中文為參考音譯；架空名字可依桌上共識調整讀法。',8.5,'ZH',GREY)
y=section('關係效果',34,y+25,527)
columns(D['connections'],y,bottom=794,n=3,size=11,gap=15)
finish('')
start('GM 參考附錄','GM REFERENCE · 以目標決定方向，以原則帶領，以動作推進局勢')
para('使用時機：玩家擲出失敗、行動或忽略危險造成明顯機會，或場面停滯時。軟動作預告危險、留下反應機會；硬動作直接落實後果。依情境調整即時性與嚴重程度。',34,101,527,9.6,13)
G=json.loads((B/'gm-explanations.json').read_text(encoding='utf8'))
def gm_notes(arr,x,y,w):
 for title,body in arr:
  y+=para(title,x,y,w,10.8,13.5,font='ZHB')
  y+=para(body,x,y+2,w,9.5,12.5)+4
 return y
w=(527-28)/3;x1=34;x2=x1+w+14;x3=x2+w+14
one=section('你的目標',x1,155,w)
one=gm_notes(G['agendas'],x1,one,w)
one=section('你的原則',x1,one+10,w)
one=gm_notes(G['principles'][:5],x1,one,w)
two=section('你的原則〔續〕',x2,155,w)
two=gm_notes(G['principles'][5:],x2,two,w)
two=section('卡住時',x2,two+10,w)
two=items(D['gm_stuck'],x2,two,w,9.5,8)
three=section('你的動作',x3,155,w)
three=gm_notes(G['moves'],x3,three,w)
if max(one,two,three)>799:raise ValueError(('GM explained overflow',one,two,three))
finish('')
start('NPC 與傷害附錄','NPCs & HARM · NPC 的四條傷害軌：創傷、疲勞、磨損、士氣')
x=34;w=254;y=section('建立 NPC',x,105,w)
y+=para('賦予名字、含種族的描述、工作與動機。真正交戰或須標記傷害時，才設定傷害軌及攻擊。單一角色每條傷害軌為 1-5 格。武器須指定距離與傷害，至少造成 1 點創傷或疲勞；依致命、耗力或破壞裝備等特性調整。',x,y,w,10.5,15)
y=table(['範例','創傷','疲勞','磨損','士氣'],D['npc_tracks'],x,y+12,[106,37,37,37,37],9)
y=section('群體',x,y+18,w)
y=table(['規模','人數','各軌','傷害'],D['mobs'],x,y,[62,60,52,80],8.5)
y+=para('群體可作為一個 mob 處理。人數分界依原表保留；傷害以普通成員平均傷害乘上倍率。種族見第 7 頁，名字見第 8 頁。',x,y+12,w,9.5,13.5)+12
y=section('動機靈感',x,y+14,w);para(D['npc_drives'],x,y,w,9.8,14)
x=309;w=252;y=section('NPC 攻擊範例',x,105,w)
y=table(['武器／使用方式','傷害'],D['npc_attacks'],x,y,[147,105],9.8)
y=section('何時施加傷害',x,y+22,w)
y+=para('只要符合已建立的情境，GM 就可透過動作施加傷害。耗盡體力的經歷通常造成 1-2 點疲勞。從約 40 英尺高的樹上跳下，即使相信命運擲出 10+，最佳結果仍可能是標記 1 點創傷。\n\n傷害是呈現行動後果、讓茂林顯得真實的方式；不是懲罰，也不是用來阻止玩家行動。尊重其選擇，也讓危險保有分量。',x,y,w,10.5,15)
finish('英文參考第 24 頁 · 新補譯；NPC 使用士氣軌，不能直接套用玩家的三條軌')
C.save()
(B/'layout-audit.json').write_text(json.dumps(LINE_AUDIT,ensure_ascii=False,indent=2),encoding='utf8')
print(str(OUTFILE));print('pages',PAGE,'maxline',max(a['y']+a['size'] for a in LINE_AUDIT))

