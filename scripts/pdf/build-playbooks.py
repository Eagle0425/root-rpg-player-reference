# -*- coding: utf-8 -*-
from pathlib import Path
import json,math,html,re
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor,Color,white
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image
B=Path('tmp/zh-playbooks');OUT=Path('output/pdf');OUT.mkdir(parents=True,exist_ok=True)
BOOKS=json.loads(Path('website/root-rpg-player-reference/scripts/reference.json').read_text(encoding='utf-8'))['books']
FONTROOT=Path('翻譯/字體/JasonHandWritingFonts')
for name,f in [('ZH','JasonHandwriting2-Regular.ttf'),('ZHB','JasonHandwriting2-SemiBold.ttf'),('ZS','JasonHandwriting1-Medium.ttf'),('ZTitle','JasonHandwriting1-SemiBold.ttf')]:pdfmetrics.registerFont(TTFont(name,str(FONTROOT/f)))
pdfmetrics.registerFontFamily('ZH',normal='ZH',bold='ZHB',italic='ZH',boldItalic='ZHB')
W,H=595.276,841.89
INK=HexColor('#303b35');OLIVE=HexColor('#77794e');GREY=HexColor('#5e625a');LIGHT=HexColor('#d6d6c7');PALE=HexColor('#fafaf6')
C=None;AUDIT=[];PAGE=0;TOTAL=38

BLANK=re.compile(r'[＿_]{2,}')
LINE_AUDIT=[];BLANK_AUDIT=[]
def inline(s,x,y,size,font,color):
 C.setFont(font,size);C.setFillColor(color);cursor=x
 for part in re.split(r'([＿_]{2,})',str(s)):
  if not part:continue
  if BLANK.fullmatch(part):
   width=len(part)*size*.9
   C.setStrokeColor(color);C.setLineWidth(.55);C.setDash()
   C.line(cursor,y-1.2,cursor+width,y-1.2)
   BLANK_AUDIT.append(dict(page=PAGE,x=cursor,y=y,width=width))
  else:
   C.drawString(cursor,y,part);width=pdfmetrics.stringWidth(part,font,size)
  cursor+=width
 return cursor-x

def text(x,y,s,size=10,font='ZH',color=INK):
 inline(s,x,H-y-size*.86,size,font,color)

def rule(x,y,w,color=OLIVE,lw=.6):
 C.setStrokeColor(color);C.setLineWidth(lw);C.line(x,H-y,x+w,H-y)
def rect(x,y,w,h,color=OLIVE,lw=.6,fill=None):
 C.setStrokeColor(color);C.setLineWidth(lw)
 if fill:C.setFillColor(fill)
 C.rect(x,H-y-h,w,h,stroke=1,fill=bool(fill))
def check(x,y,on=False,size=8):
 rect(x,y,size,size,INK,.6)
 if on:
  C.setLineWidth(1);C.setStrokeColor(INK);C.line(x+1.5,H-y-size*.5,x+size*.43,H-y-size+1.5);C.line(x+size*.43,H-y-size+1.5,x+size-1.1,H-y-1.2)
CLOSE=set('、，。；：！？）」』】》〉〕］｝,.!?;:%')
OPEN=set('（「『【《〈〔［｛(•□')
TOKEN=re.compile(r'(?:[\u4e00-\u9fff]{1,8}[：:])?[＿_]{2,}|[A-Za-z]+(?:[’\'-][A-Za-z]+)*|[+-]?\d+(?:[.-]\d+)*(?:\+|%)?|[^\n]')
def width_of(s,font,size):
 return sum(len(t)*size*.9 if BLANK.fullmatch(t) else pdfmetrics.stringWidth(t,font,size) for t in re.split(r'([＿_]{2,})',s) if t)
def wrap_lines(s,w,font,size):
 lines=[]
 for hard in str(s).split('\n'):
  if not hard:lines.append('');continue
  units=[];pending=''
  for tok in TOKEN.findall(hard):
   if tok in OPEN:pending+=tok;continue
   if tok.isspace() and pending:pending+=tok;continue
   tok=pending+tok;pending=''
   if tok and tok[0] in CLOSE and units:units[-1]+=tok
   else:units.append(tok)
  if pending:
   if units:units[-1]+=pending
   else:units.append(pending)
  line=''
  for unit in units:
   if unit.isspace() and not line:continue
   if line and width_of(line+unit,font,size)>w+.01:
    lines.append(line.rstrip());line=unit.lstrip()
   else:line+=unit
  lines.append(line.rstrip())
 return lines

def para(s,x,y,w,size=10,leading=None,color=INK,font='ZH',draw=True):
 lead=leading or size*1.38;lines=wrap_lines(s,w,font,size);ph=len(lines)*lead
 if draw:
  for i,line in enumerate(lines):
   inline(line,x,H-y-i*lead-size*.86,size,font,color)
   LINE_AUDIT.append(dict(page=PAGE,text=line,x=x,y=y+i*lead,w=w,size=size,font=font,actual_width=width_of(line,font,size)))
  AUDIT.append({'page':PAGE,'x':x,'y':y,'w':w,'h':ph,'size':size,'text':s})
 return ph

def heading(s,x,y,w,size=16):
 text(x,y,s,size,'ZS');rule(x,y+size+6,w);return y+size+14

def blocks(items,x,y,w,maxh,size=10,minsize=9.2,gap=9,heading_size=12.3,boxed=False):
 # items are (heading, body, checkbox, checked), with responsive font only within the assigned region.
 def measure(sz):
  hs=heading_size*(sz/size);lead=sz*1.38
  return sum(para(a,x,0,w-(14 if cb else 0),hs,hs*1.25,font='ZHB',draw=False)+para(b,x,0,w,sz,lead,draw=False)+gap*(sz/size) for a,b,cb,on in items)
 chosen=size
 while measure(chosen)>maxh and chosen>minsize:chosen=round(chosen-.1,2)
 if measure(chosen)>maxh+.2:raise ValueError(('BLOCK OVERFLOW',PAGE,round(measure(chosen)),maxh,items[0][0],chosen))
 start=y;hs=heading_size*(chosen/size)
 for title,body,cb,on in items:
  if cb:check(x,y+2,on,8);tx=x+14
  else:tx=x
  y+=para(title,tx,y,w-(14 if cb else 0),hs,hs*1.25,font='ZHB')
  y+=para(body,x,y,w,chosen,chosen*1.38)
  y+=gap*(chosen/size)
 return y,chosen

def footer(b,side):
 rule(34,816,527,LIGHT,.45)
 text(34,822,'Root © Leder Games · Text & design © Magpie Games · 原繪 Kyle Ferrin · 非官方繁體中文參考版',6.1,'ZH',GREY)
 C.setFont('ZH',6.8);C.setFillColor(GREY);C.drawRightString(561,H-829,f'{PAGE:02d} / {TOTAL}  ·  {b["zh"]}  {side}/2')

def frame(x,y,w,h):
 # Stepped double border echoes the print-friendly playbook's ornamental frames.
 for inset,lw in [(0,.7),(3,.4)]:
  xx=x+inset;yy=y+inset;ww=w-2*inset;hh=h-2*inset;k=8
  p=C.beginPath();p.moveTo(xx+k,H-yy);p.lineTo(xx+ww-k,H-yy);p.curveTo(xx+ww-k,H-yy-k,xx+ww,H-yy-k,xx+ww,H-yy-k)
  p.lineTo(xx+ww,H-yy-hh+k);p.curveTo(xx+ww-k,H-yy-hh+k,xx+ww-k,H-yy-hh,xx+ww-k,H-yy-hh)
  p.lineTo(xx+k,H-yy-hh);p.curveTo(xx+k,H-yy-hh+k,xx,H-yy-hh+k,xx,H-yy-hh+k)
  p.lineTo(xx,H-yy-k);p.curveTo(xx+k,H-yy-k,xx+k,H-yy,xx+k,H-yy);p.close()
  C.setLineWidth(lw);C.setStrokeColor(OLIVE);C.drawPath(p)

def reputation():
 text(34,715,'你的名聲',13,'ZS')
 # Center labels on the actual writing rules and negative/positive checkbox regions.
 for label,center in [('陣營名稱',69),('惡名 ←',195.2),('→ 威望',378.2)]:
  text(center-pdfmetrics.stringWidth(label,'ZH',8)/2,731,label,8,'ZH',GREY)
 for row in range(5):
  y=743+row*13.2;rule(34,y+9,70,GREY,.4);x=115
  for lab,count in [('-3',3),('-2',3),('-1',3),('+0',5),('+1',5),('+2',5),('+3',0)]:
   text(x,y,lab,7.3,'ZH',GREY);x+=15
   for _ in range(count):check(x,y+.6,False,8.4);x+=11.5
 text(34,810,'每個陣營分開記錄名聲、惡名與威望；數字是名聲階段，方格用於標記。',6.8,'ZH',GREY)

def first(b,idx):
 global PAGE
 PAGE=idx*2+1
 C.bookmarkPage(b['en']);C.addOutlineEntry(b['zh']+' / '+b['en'],b['en'],0,False)
 text(34,25,b['zh'],32,'ZTitle');text(36,64,'THE '+b['en'].upper(),10.2,'ZH',OLIVE)
 para(b['description'],310,28,251,9.6,13.3)
 rule(34,89,527)
 # Identity column
 x=34;w=168;y=104
 text(x,y,'名字',12,'ZS');rule(x+35,y+16,w-35,GREY,.4);y+=33
 for label,body in [('種族','、'.join(b['species'])+'；其他：＿＿＿＿'),('細節','男、女、中性、流動\n'+'、'.join(b['details'][:4])+'\n'+'、'.join(b['details'][4:])),('言行舉止','、'.join(b['demeanor']))]:
  text(x,y,label,11.5,'ZHB');y+=17;y+=para(body,x,y,w,9.7,13.6)+10
 # Background framed panel fills remaining column.
 top=max(313,y+3);bottom=708;frame(x-5,top,w+10,bottom-top)
 by=heading('背景',x+5,top+12,w-10,15)
 bi=[]
 if not b.get('no_home'):bi.append(('你住在哪裡？','□ ＿＿＿＿領地\n□ 森林　□ 遙遠的地方',False,False))
 for title,opts in b.get('extra_background',[]):bi.append((title,'\n'.join('□ '+s for s in opts.split('|')),False,False))
 if b.get('background_why') and b['background_why']!=['']:bi.append(('你為什麼成為神秘遊俠？','\n'.join('□ '+s for s in b['background_why']),False,False))
 if b.get('background_who'):bi.append((b.get('who_question','你把誰留在身後？'),'\n'.join('□ '+s for s in b['background_who']),False,False))
 for title,body in b.get('reputation_background',[['你為哪個陣營服務最多？','對其標記 2 點威望。'],['與哪個陣營結下特殊仇怨？','對其標記 1 點惡名。']]):bi.append((title,body+'\n陣營：＿＿＿＿＿＿',False,False))
 blocks(bi,x+5,by,w-10,bottom-by-8,9.3,8.7,7,10.1)
 # Art portrait and drives: same central placement as source template.
 ax=220;aw=163;ay=106;ah=202;frame(ax,ay,aw,ah)
 im=Image.open(B/(b['en']+'.png'));iw,ih=im.size;scale=min((aw-12)/iw,(ah-12)/ih);dw,dh=iw*scale,ih*scale
 bbox=im.getchannel('A').getbbox() if im.mode=='RGBA' else (0,0,iw,ih)
 left=ax+aw/2-(bbox[0]+bbox[2])*scale/2
 top=ay+ah/2-(bbox[1]+bbox[3])*scale/2
 C.drawImage(ImageReader(im),left,H-top-dh,dw,dh,mask='auto')
 text(ax+40,312,'原書角色示意圖',7,'ZH',GREY)
 dy=heading('你的動機',ax,337,aw,17);text(ax,dy,'選擇兩項；每項每場最多成長一次',7.6,'ZH',OLIVE);dy+=22
 di=[(t,s,True,False) for t,s in b['drives_full']]
 blocks(di,ax,dy,aw,708-dy,10,9.5,12,13)
 # Natures and connections on the right.
 nx=403;nw=158;ny=104
 ny=heading('選擇你的天性',nx,ny,nw,16)
 ni=[(b['nature'][0],b['nature'][1],True,False),(b['nature'][2],b['nature'][3],True,False)]
 blocks(ni,nx,ny,nw,179,10,9.5,17,13)
 cy=heading('你的關係',nx,337,nw,17)
 ci=[]
 for (title,prompt),effect in zip(b['connections'],b['connection_effects']):ci.append((title,prompt+'\n\n'+effect,False,False))
 blocks(ci,nx,cy,nw,708-cy,9.7,9.1,17,13)
 reputation();footer(b,1);C.showPage()

FEATS=['雜技','暗算','偽造','拆除裝置','隱藏','扒竊','潛行','開鎖','巧手']
SKILLS=['劈開護甲','迷惑感官','解除武裝','擾亂團體','製作武器','招架','快速射擊','突襲團體','技巧射擊','兇惡打擊']
def second(b,idx):
 global PAGE
 PAGE=idx*2+2
 text(34,27,b['zh'],23,'ZTitle');text(34,56,'THE '+b['en'].upper()+' · 能力與裝備',8.4,'ZH',OLIVE)
 # Stats with large writable circles and printed starting numbers.
 for i,(zh,en,v) in enumerate(zip(['魅力','狡猾','靈巧','幸運','力量'],['Charm','Cunning','Finesse','Luck','Might'],b['stats'])):
  y=86+i*37;C.setStrokeColor(OLIVE);C.setLineWidth(.9);C.circle(49,H-y-13,14,stroke=1,fill=0)
  text(72,y,zh,15,'ZS');text(111,y+4,en,8.5,'ZH',GREY);text(193,y+2,f'[{v:+}]',11,'ZHB',OLIVE)
 para('任選一項能力值 +1；創角此步上限 +2。\n把最後數值寫進左側圓圈。',34,276,195,8.4,12)
 frame(30,312,205,87)
 for i,t in enumerate(['創傷','疲勞','消耗']):
  y=327+i*21
  for j in range(4):check(42+j*17,y,False,11)
  for j in range(2):
   C.setDash(1,1);rect(42+(j+4)*17,y,11,11,LIGHT,.4);C.setDash()
  text(151,y,t,11,'ZHB')
 text(40,402,'虛線格僅在取得額外傷害格後啟用。',7,'ZH',GREY)
 fy=heading('遊俠專長',34,425,195,16);text(34,fy,b['feat_instruction'],8,'ZH',OLIVE);fy+=21
 # Source order preserved columnwise.
 for j,t in enumerate(FEATS):
  col=0 if j<5 else 1;row=j if j<5 else j-5;xx=34+col*103;yy=fy+row*17
  check(xx,yy+1,j in b['feats']);text(xx+14,yy,t,9.6)
 sy=heading('武器技能',34,561,195,16);text(34,sy,'起始從 ★ 標示項目選擇 1 項',8,'ZH',OLIVE);sy+=20
 for j,t in enumerate(SKILLS):
  col=0 if j<5 else 1;row=j if j<5 else j-5;xx=34+col*103;yy=sy+row*16
  check(xx,yy+1,False);text(xx+14,yy,t,9.1,'ZHB' if j in b['skills'] else 'ZH')
  if j in b['skills']:text(xx+14+pdfmetrics.stringWidth(t,'ZHB',9.1)+3,yy+1,'★',7.8,'ZH',OLIVE)
 # Moves occupy right column with consistent typography.
 mx=253;mw=308;my=heading('你的動作',mx,27,mw,21)
 if b['required']:
  req='、'.join(b['moves'][i]['title'] for i in b['required']);remaining=1 if b['en'] in ('Tinker','Champion','Heretic','Pirate','Prince') else 2
  ins='已有「'+req+'」，再選 '+str(remaining)+' 項。'
 else:ins='選擇 3 項動作。'
 my+=para(ins,mx,my,mw,9.2,12.4,color=OLIVE)+13
 items=[]
 for i,m in enumerate(b['moves']):items.append((m['title'],m['body'],True,i in b['required']))
 end,sz=blocks(items,mx,my,mw,686-my,10.1,9.0,9,12.7)
 # Writing area is shared by both columns, always unobstructed.
 frame(30,704,535,103);text(41,713,'裝備',16,'ZS')
 text(96,718,'起始價值 '+str(b['value'])+'　攜帶：＿＿　負重門檻（4＋力量）：＿＿　上限（門檻×2）：＿＿',7.9,'ZH',GREY)
 text(41,738,'物品／射程／標籤',7.2,'ZH',GREY);text(403,738,'磨損',7.2,'ZH',GREY);text(485,738,'重量／價值',7.2,'ZH',GREY)
 for y in [756,775,794]:
  rule(41,y+9,512,LIGHT,.4)
  for j in range(6):check(403+j*12,y,False,7)
 if b['en']=='Pirate':text(253,693,'關係「家人」的效果依此英文版保留，與一般家人不同。',6.7,'ZH',GREY)
 footer(b,2);C.showPage()

path=OUT/'Root-RPG-中文角色卡-19種-A4列印版.pdf'
C=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1,initialFontName='ZH')
C.setTitle('茂林源記 Root RPG | 19 種繁體中文角色卡');C.setAuthor('非官方中文整編；既有翻譯參考 Mori、空空、阿羊');C.setSubject('依 2022 英文 Playbooks 校對；A4 白底列印；19 種角色各兩頁')
for i,b in enumerate(BOOKS):first(b,i);second(b,i)
C.save()
# Verify every measured body lies within the printable content boundaries.
errors=[a for a in AUDIT if a['x']<28 or a['x']+a['w']>567 or a['y']<20 or a['y']+a['h']>813]
if errors:raise ValueError(('OUT OF BOUNDS',errors))
(B/'layout-audit.json').write_text(json.dumps(AUDIT,ensure_ascii=False,indent=2),encoding='utf-8')
print(str(path));print('pages',PAGE,'paragraphs',len(AUDIT),'minimum body font',min(a['size'] for a in AUDIT))

(B/'line-audit.json').write_text(json.dumps(LINE_AUDIT,ensure_ascii=False,indent=2),encoding='utf-8')
(B/'blank-audit.json').write_text(json.dumps(BLANK_AUDIT,ensure_ascii=False,indent=2),encoding='utf-8')
