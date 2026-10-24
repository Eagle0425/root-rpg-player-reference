from pathlib import Path
import io,json,re,struct
from pypdf import PdfReader,PdfWriter
from pypdf.generic import DictionaryObject as Dict,NameObject as N,ArrayObject as Arr,NumberObject as Num,FloatObject as Fl,TextStringObject as Str,BooleanObject as Bool,DecodedStreamObject,ByteStringObject
src=Path('website/root-rpg-player-reference/scripts/pdf/build-playbooks.py').read_text(encoding='utf8')
layout_src=src[:src.index("\npath=OUT/")].replace("Image.open(B/(b['en']+'.png'))","Image.new('RGBA',(163,202),(255,255,255,255))")
exec(layout_src)
# Reuse the exact existing layout to locate every drawn checkbox and fill-in line.
GEOMETRY=[];CURRENT='';serial=0
original_check=check;original_inline=inline;original_para=para

def capture_para(s,x,y,w,size=10,leading=None,color=INK,font='ZH',draw=True):
 global CURRENT
 old=CURRENT
 if draw:CURRENT=str(s)
 result=original_para(s,x,y,w,size,leading,color,font,draw)
 CURRENT=old
 return result

def capture_check(x,y,on=False,size=8):
 GEOMETRY.append(dict(page=PAGE,kind='checkbox',rect=[x,H-y-size,x+size,H-y],value=bool(on),tip=CURRENT or '勾選項目'))
 return original_check(x,y,on,size)

def capture_inline(s,x,y,size,font,color):
 cursor=x
 for part in re.split(r'([＿_]{2,})',str(s)):
  if not part:continue
  if BLANK.fullmatch(part):
   width=len(part)*size*.9
   GEOMETRY.append(dict(page=PAGE,kind='text',rect=[cursor,y-2.7,cursor+width,y+size*.98],tip=CURRENT or str(s),size=min(size,10)))
  else:
   for i,ch in enumerate(part):
    if ch=='□':
     xx=cursor+pdfmetrics.stringWidth(part[:i],font,size)
     side=min(pdfmetrics.stringWidth(ch,font,size),size*.88)
     GEOMETRY.append(dict(page=PAGE,kind='checkbox',rect=[xx,y-.5,xx+side,y-.5+side],value=False,tip=CURRENT or str(s)))
   width=pdfmetrics.stringWidth(part,font,size)
  cursor+=width
 return original_inline(s,x,y,size,font,color)
para=capture_para;check=capture_check;inline=capture_inline
C=canvas.Canvas(io.BytesIO(),pagesize=(W,H),initialFontName='ZH')
for i,b in enumerate(BOOKS):first(b,i);second(b,i)
C.save()
# Unlabelled writing areas use the same coordinates as the printed card.
for i,b in enumerate(BOOKS):
 odd=2*i+1;even=odd+1
 GEOMETRY.append(dict(page=odd,kind='text',rect=[69,H-121,202,H-103],tip='角色名字',size=12))
 for row in range(5):
  top=743+row*13.2
  GEOMETRY.append(dict(page=odd,kind='text',rect=[34,H-top-10,104,H-top+2],tip=f'陣營 {row+1} 名稱',size=8.5))
 for j,stat in enumerate(['魅力','狡猾','靈巧','幸運','力量']):
  top=86+j*37
  GEOMETRY.append(dict(page=even,kind='text',rect=[38,H-top-23,60,H-top-3],tip=stat+'：請輸入最終能力值',size=13,align=1))
 for row,track in enumerate(['創傷','疲勞','消耗']):
  top=327+row*21
  for col in [4,5]:
   xx=42+col*17
   GEOMETRY.append(dict(page=even,kind='checkbox',rect=[xx,H-top-11,xx+11,H-top],value=False,dashed=True,tip=track+'額外格（取得後使用）'))
 for row,top in enumerate([756,775,794]):
  GEOMETRY.append(dict(page=even,kind='text',rect=[41,H-top-9,395,H-top+8],tip=f'裝備第 {row+1} 列：物品、射程及標籤',size=10.5))
  GEOMETRY.append(dict(page=even,kind='text',rect=[485,H-top-9,553,H-top+8],tip=f'裝備第 {row+1} 列：重量／價值',size=10))
# Add full Unicode font support for text typed after the PDF was generated.
face=pdfmetrics.getFont('ZH').face
writer=PdfWriter();writer.clone_document_from_reader(PdfReader('output/pdf/Root-RPG-中文角色卡-19種-A4列印版.pdf'))
assert not writer.get_fields()

def ref(obj):return writer._add_object(obj)
def stream(data,extra=None):
 st=DecodedStreamObject();st.set_data(data)
 if extra:st.update(extra)
 return ref(st.flate_encode())
fontfile=stream(face._ttf_data,{N('/Length1'):Num(len(face._ttf_data))})
fd=ref(Dict({N('/Type'):N('/FontDescriptor'),N('/FontName'):N('/JasonHandwritingForm'),N('/Flags'):Num(4),N('/FontBBox'):Arr([Fl(v) for v in face.bbox]),N('/ItalicAngle'):Num(0),N('/Ascent'):Fl(face.ascent),N('/Descent'):Fl(face.descent),N('/CapHeight'):Fl(getattr(face,'capHeight',face.ascent)),N('/StemV'):Num(80),N('/FontFile2'):fontfile}))
cidmap=bytearray(65536*2)
for code,gid in face.charToGlyph.items():
 if code<65536:struct.pack_into('>H',cidmap,code*2,gid)
widths=Arr()
# Most CJK characters are full-width; only encode exceptions to the default.
for code,width in sorted(face.charWidths.items()):
 if code<65536 and abs(width-1000)>.1:widths.extend([Num(code),Arr([Fl(width)])])
cid=ref(Dict({N('/Type'):N('/Font'),N('/Subtype'):N('/CIDFontType2'),N('/BaseFont'):N('/JasonHandwritingForm'),N('/CIDSystemInfo'):Dict({N('/Registry'):Str('Adobe'),N('/Ordering'):Str('Identity'),N('/Supplement'):Num(0)}),N('/FontDescriptor'):fd,N('/DW'):Num(1000),N('/W'):widths,N('/CIDToGIDMap'):stream(bytes(cidmap))}))
cmap=b'''/CIDInit /ProcSet findresource begin
12 dict begin begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /FormZH-UCS def /CMapType 2 def
1 begincodespacerange <0000> <FFFF> endcodespacerange
2 beginbfrange <0000> <D7FF> <0000> <E000> <FFFF> <E000> endbfrange
endcmap CMapName currentdict /CMap defineresource pop end end'''
formfont=ref(Dict({N('/Type'):N('/Font'),N('/Subtype'):N('/Type0'),N('/BaseFont'):N('/JasonHandwritingForm'),N('/Encoding'):N('/Identity-H'),N('/DescendantFonts'):Arr([cid]),N('/ToUnicode'):stream(cmap)}))
dr=Dict({N('/Font'):Dict({N('/FormZH'):formfont})})
fields=Arr();acro=Dict({N('/Fields'):fields,N('/DR'):dr,N('/DA'):Str('/FormZH 10 Tf 0.188 0.231 0.208 rg'),N('/NeedAppearances'):Bool(False)})
writer._root_object[N('/AcroForm')]=ref(acro)
apcache={};blankcache={}

def form_stream(data,w,h):return stream(data,{N('/Type'):N('/XObject'),N('/Subtype'):N('/Form'),N('/FormType'):Num(1),N('/BBox'):Arr([Num(0),Num(0),Fl(w),Fl(h)]),N('/Resources'):Dict()})
def checkbox_ap(w,h,dashed=False):
 key=(round(w,3),round(h,3),dashed)
 if key not in apcache:
  dash='[1 1] 0 d' if dashed else '[] 0 d'
  base=f'q 1 1 1 rg 0 0 {w} {h} re f 0.188 0.231 0.208 RG 0.6 w {dash} .3 .3 {w-.6} {h-.6} re S '
  tick=f'[] 0 d 1.1 w {w*.18} {h*.49} m {w*.42} {h*.2} l {w*.86} {h*.82} l S '
  apcache[key]=Dict({N('/Off'):form_stream((base+'Q').encode(),w,h),N('/Yes'):form_stream((base+tick+'Q').encode(),w,h)})
 return apcache[key]
manifest=[];seen=set()
for page_num in range(1,39):
 page=writer.pages[page_num-1];page[N('/Tabs')]=N('/S')
 page_annots=Arr();page[N('/Annots')]=page_annots
 entries=sorted([g for g in GEOMETRY if g['page']==page_num],key=lambda g:(-g['rect'][3],g['rect'][0]))
 count={'text':0,'checkbox':0}
 for g in entries:
  x0,y0,x1,y1=g['rect'];key=(page_num,g['kind'],tuple(round(v,2) for v in g['rect']))
  if key in seen:continue
  seen.add(key);count[g['kind']]+=1
  role=BOOKS[(page_num-1)//2]['en'].lower()
  name=f'{role}_p{page_num:02d}_{g["kind"]}_{count[g["kind"]]:03d}'
  tip=BOOKS[(page_num-1)//2]['zh']+'｜'+re.sub(r'\s+',' ',g['tip'])[:180]
  obj=Dict({N('/Type'):N('/Annot'),N('/Subtype'):N('/Widget'),N('/T'):Str(name),N('/TU'):Str(tip),N('/Rect'):Arr([Fl(v) for v in g['rect']]),N('/F'):Num(4),N('/Ff'):Num(0),N('/P'):page.indirect_reference})
  if g['kind']=='checkbox':
   state=N('/Yes' if g['value'] else '/Off');obj.update({N('/FT'):N('/Btn'),N('/V'):state,N('/DV'):state,N('/AS'):state,N('/AP'):Dict({N('/N'):checkbox_ap(x1-x0,y1-y0,g.get('dashed',False))})})
  else:
   bk=(round(x1-x0,3),round(y1-y0,3))
   blank_ap=form_stream(b'q Q',*bk)
   obj.update({N('/FT'):N('/Tx'),N('/V'):Str(''),N('/DV'):Str(''),N('/Q'):Num(g.get('align',0)),N('/DA'):Str(f'/FormZH {g.get("size",10)} Tf 0.188 0.231 0.208 rg'),N('/BS'):Dict({N('/W'):Num(0)}),N('/AP'):Dict({N('/N'):blank_ap})})
  fieldref=ref(obj);fields.append(fieldref);page_annots.append(fieldref)
  manifest.append(dict(name=name,page=page_num,kind=g['kind'],rect=g['rect'],tip=tip,default=g.get('value','')))
output=Path('output/pdf/Root-RPG-中文角色卡-19種-A4可填寫版.pdf')
writer.add_metadata({'/Title':'Root RPG｜19 種中文角色卡｜可填寫表單版','/Subject':'可輸入中文、可勾選方塊；保留 A4 列印版面'})
writer.write(str(output))
Path('tmp/zh-playbooks/form-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Created',len(manifest),'fields: text',sum(g['kind']=='text' for g in manifest),'checkbox',sum(g['kind']=='checkbox' for g in manifest),'pages',len(writer.pages),'bytes',output.stat().st_size)
