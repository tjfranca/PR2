#!/usr/bin/env python3
"""Converte os arquivos s*.txt (markup simples) em um .docx (Arial 12).
Markup:
  # Título 1   ## Título 2   ### Título 3
  ^ linha centralizada
  - item de lista (vira bullet •)
  | a | b |     tabela (1a linha = cabeçalho; | --- | separador)
  **negrito**
  <<<PAGEBREAK>>>
  linhas normais = parágrafo comum
"""
import glob, os, re, html, sys, struct, zipfile
import xml.dom.minidom as minidom

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else "PASTA_DE_ESTAGIO_REBECA_ORGANIZADA.docx")
FOTOS = os.path.join(HERE, '_fotos_rebeca')
IMAGENS = []          # (rid, filename) — coletado durante build_body
_DOCPR = [1000]

def img_dims(path):
    d = open(path, 'rb').read(131072)
    if d[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', d[16:24]); return w, h
    if d[:2] == b'\xff\xd8':
        with open(path, 'rb') as f:
            f.read(2)
            while True:
                b = f.read(1)
                if not b: break
                if b != b'\xff': continue
                while b == b'\xff': b = f.read(1)
                m = b[0]
                if m in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
                    f.read(3); h, w = struct.unpack('>HH', f.read(4)); return w, h
                if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7: continue
                ln = struct.unpack('>H', f.read(2))[0]; f.seek(ln - 2, 1)
    raise ValueError('dimensões não lidas: ' + path)

def image_para(fname, width_cm):
    src = os.path.join(FOTOS, fname)
    px_w, px_h = img_dims(src)
    w_cm = min(float(width_cm), 15.5)
    cx = int(w_cm * 360000)
    cy = int(cx * px_h / px_w)
    if cy > int(23.0 * 360000):          # não estourar a página
        cy = int(23.0 * 360000); cx = int(cy * px_w / px_h)
    _DOCPR[0] += 1
    rid = 'rId%d' % (100 + len(IMAGENS))
    IMAGENS.append((rid, fname))
    return (
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        '<wp:extent cx="%d" cy="%d"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        '<wp:docPr id="%d" name="%s"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    ) % (cx, cy, _DOCPR[0], fname, fname, rid, cx, cy)

def esc(t):
    t = t.replace('\x00', '')
    return html.escape(t, quote=False)

def runs(text, bold_all=False, italic_all=False):
    out = []
    for p in re.split(r'(\*\*.+?\*\*)', text):
        if not p:
            continue
        bold = bold_all or (p.startswith('**') and p.endswith('**'))
        t = p[2:-2] if (p.startswith('**') and p.endswith('**')) else p
        rpr = ''
        if bold or italic_all:
            rpr = '<w:rPr>' + ('<w:b/>' if bold else '') + ('<w:i/>' if italic_all else '') + '</w:rPr>'
        out.append('<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, esc(t)))
    return ''.join(out)

def para(runs_xml, style=None, center=False, bullet=False, justify=False):
    ppr = ''
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    if center:
        ppr += '<w:jc w:val="center"/>'
    if justify:
        ppr += '<w:jc w:val="both"/>'
    if bullet:
        ppr += '<w:ind w:left="360" w:hanging="360"/>'
    ppr = '<w:pPr>%s</w:pPr>' % ppr if ppr else ''
    pre = '• ' if bullet else ''
    return '<w:p>%s%s%s</w:p>' % (ppr, runs(pre) if pre else '', runs_xml)

def table(rows):
    def cell(text, header=False, w=None):
        shd = '<w:shd w:val="clear" w:fill="D9D9D9"/>' if header else ''
        tcpr = '<w:tcPr><w:tcW w:type="dxa" w:w="%d"/>%s</w:tcPr>' % (w or 0, shd)
        body = para(runs(text, bold_all=header))
        return '<w:tc>%s%s</w:tc>' % (tcpr, body)
    n = max(len(r) for r in rows)
    w = int(9000 / n)
    borders = '<w:tblBorders>' + ''.join(
        '<w:%s w:val="single" w:sz="4" w:space="0" w:color="000000"/>' % s
        for s in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) + '</w:tblBorders>'
    xml = ['<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>%s</w:tblPr>' % borders]
    for i, r in enumerate(rows):
        xml.append('<w:tr>')
        for j in range(n):
            xml.append(cell(r[j] if j < len(r) else '', header=(i == 0), w=w))
        xml.append('</w:tr>')
    xml.append('</w:tbl>')
    return ''.join(xml)

def build_body():
    body = []
    files = sorted(glob.glob(os.path.join(HERE, 's*.txt')))
    if not files:
        raise SystemExit('nenhum arquivo s*.txt encontrado')
    for f in files:
        with open(f, encoding='utf-8') as fh:
            lines = fh.read().splitlines()
        table_buf = []
        def flush_table():
            nonlocal table_buf
            if table_buf:
                rows = [r for r in table_buf if not all(c.strip() in ('---', '') for c in r)]
                if rows:
                    body.append(table(rows))
                table_buf = []
        for raw in lines:
            line = raw.rstrip()
            stripped = line.strip()
            if not stripped:
                flush_table()
                continue
            if stripped.startswith('|'):
                cells = [c.strip() for c in stripped.strip('|').split('|')]
                table_buf.append(cells)
                continue
            flush_table()
            if stripped == '<<<PAGEBREAK>>>':
                body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
            elif re.fullmatch(r'<<IMG:[A-Za-z0-9_.\-]+;[\d.]+>>', stripped):
                m = re.fullmatch(r'<<IMG:([A-Za-z0-9_.\-]+);([\d.]+)>>', stripped)
                body.append(image_para(m.group(1), m.group(2)))
            elif stripped.startswith('### '):
                body.append(para(runs(stripped[4:]), style='H3'))
            elif stripped.startswith('## '):
                body.append(para(runs(stripped[3:]), style='H2'))
            elif stripped.startswith('# '):
                body.append(para(runs(stripped[2:]), style='H1'))
            elif stripped.startswith('^ '):
                body.append(para(runs(stripped[2:]), center=True))
            elif stripped.startswith('- '):
                body.append(para(runs(stripped[2:]), bullet=True))
            else:
                body.append(para(runs(stripped)))
        flush_table()
    return ''.join(body)

DOC = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>{body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>'''

STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR" w:eastAsia="pt-BR" w:bidi="ar-SA"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="H1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="H2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="H3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:i/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>'''

CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpg" ContentType="image/jpeg"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Default Extension="gif" ContentType="image/gif"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

def main():
    body = build_body()
    doc = DOC.format(body=body)
    minidom.parseString(doc)  # valida XML
    minidom.parseString(STYLES)
    doc_rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>']
    media = {}
    for rid, fname in IMAGENS:
        path = os.path.join(FOTOS, fname)
        if not os.path.exists(path):
            raise SystemExit('imagem ausente: ' + fname)
        media['word/media/' + fname] = open(path, 'rb').read()
        doc_rels.append('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/%s"/>'
                        % (rid, fname))
    doc_rels.append('</Relationships>')
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CT)
        z.writestr('_rels/.rels', RELS)
        z.writestr('word/_rels/document.xml.rels', ''.join(doc_rels))
        z.writestr('word/styles.xml', STYLES)
        z.writestr('word/document.xml', doc)
        for name, data in media.items():
            z.writestr(name, data, zipfile.ZIP_STORED)
    with zipfile.ZipFile(OUT) as z:
        assert z.testzip() is None
        for n in z.namelist():
            if n.endswith('.xml') or n.endswith('.rels'):
                minidom.parseString(z.read(n))
        n_img = len([n for n in z.namelist() if n.startswith('word/media/')])
    print('OK ->', OUT, os.path.getsize(OUT), 'bytes | imagens embutidas:', n_img)

if __name__ == '__main__':
    main()
