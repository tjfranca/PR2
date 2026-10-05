#!/usr/bin/env python3
"""Insere as imagens extraídas (_fotos_rebeca) nos arquivos s*.txt via marcador <<IMG:arquivo;largura_cm>>."""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# (arquivo, tipo, chave, nth, imagens)  tipo: after | after_cont | replace_line | replace_sub
SPEC = [
    # ---- 02 ficha / carta / autorização ----
    ('s02_ficha_carta_autoriz.txt', 'after', 'Atenciosamente,', 1,
     [('image27.png', 10.8)]),
    ('s02_ficha_carta_autoriz.txt', 'after', '| __/__/__ | 30h pesquisa (avaliação) | Estagiária |', 1,
     [('image34.png', 15)]),
    ('s02_ficha_carta_autoriz.txt', 'replace_sub', '**[ANEXO: scan da autorização ASSINADA — copiar do original]**', 1,
     [('image32.png', 13)]),
    # ---- 03 anamnese: scans manuscritos + ajuste da resolução ----
    ('s03_anamnese.txt', 'replace_sub',
     'mantida UMA versão apenas (a digitada), com linha de visto por página e espaços de assinatura — conforme a orientação acima. Falta apenas colher os vistos/assinaturas da genitora.', 1,
     ['TEXT:a transcrição digitada segue como texto principal, com linha de visto por página e espaços de assinatura; as FOLHAS MANUSCRITAS originais ficam anexadas logo abaixo, para colher o visto/assinatura da responsável em todas elas. **Confirmar com a professora qual versão fica definitiva — ela exigiu apenas UMA na pasta.**']),
    ('s03_anamnese.txt', 'after',
     'a transcrição digitada segue como texto principal, com linha de visto por página e espaços de assinatura; as FOLHAS MANUSCRITAS originais ficam anexadas logo abaixo, para colher o visto/assinatura da responsável em todas elas. **Confirmar com a professora qual versão fica definitiva — ela exigiu apenas UMA na pasta.**', 1,
     ['TEXT:**ANEXO — FOLHAS MANUSCRITAS DA ANAMNESE (do original):**',
      ('image35.png', 15), ('image33.png', 15), ('image39.png', 15), ('image38.png', 15)]),
    # ---- 06 sessão 1 (EOCA) + projetivas ----
    ('s06_sessoes_av_1_2.txt', 'after_cont', 'poderia ser feito diferente.', 1,
     [('image56.jpg', 8.4), ('image54.jpg', 6), ('image18.jpg', 8.4)]),
    ('s06_sessoes_av_1_2.txt', 'after_cont', 'preensão digital pronada.', 1,
     [('image13.png', 4), ('image53.png', 8), ('image57.jpg', 8), ('image61.jpg', 8)]),
    ('s06_sessoes_av_1_2.txt', 'replace_line', '**[ANEXO: desenho do Par Educativo — inserir do original]**', 1,
     [('image19.jpg', 7.9)]),
    ('s06_sessoes_av_1_2.txt', 'replace_line', '**[ANEXO: desenho da Família Educativa — inserir do original]**', 1,
     [('image11.jpg', 7.8)]),
    ('s06_sessoes_av_1_2.txt', 'replace_line', '**[ANEXO: desenho do Dia do Meu Aniversário — inserir do original]**', 1,
     [('image17.jpg', 7.6)]),
    # ---- 07 Capellini 3ª/4ª/5ª + PROADE 6ª ----
    ('s07_sessoes_av_3_6.txt', 'replace_line', '**[ANEXO: folhas do protocolo aplicadas e corrigidas — inserir do original]**', 1,
     [('image24.png', 15), ('image66.png', 6)]),
    ('s07_sessoes_av_3_6.txt', 'replace_line', '**[ANEXO: folhas do protocolo aplicadas e corrigidas — inserir do original]**', 1,
     [('image72.png', 7.4), ('image28.png', 4), ('image25.png', 5)]),
    ('s07_sessoes_av_3_6.txt', 'replace_sub', '**[ANEXO: folha do cálculo aplicada e corrigida — inserir do original]**', 1,
     [('image36.jpg', 15)]),
    ('s07_sessoes_av_3_6.txt', 'replace_line', '**[ANEXO: folhas do protocolo aplicadas e corrigidas — inserir do original]**', 1,
     [('image82.jpg', 13), ('image52.png', 12.1), ('image55.jpg', 6)]),
    ('s07_sessoes_av_3_6.txt', 'replace_line', '**[ANEXO: folhas do PROADE aplicadas e corrigidas — inserir do original]**', 1,
     [('image67.jpg', 15), ('image71.jpg', 12), ('image3.png', 11.9)]),
    # ---- 08 PROADE 7ª + IAR 8ª item a item + Hanói + POP-TT + SNAP ----
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'avalição... ', 0, []),  # placeholder no-op
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'demonstra avanços significativos.', 1,
     [('image10.jpg', 3.9)]),
    ('s08_sessoes_av_7_10.txt', 'after', '- Escrita por meio de figuras: **total de acertos: 21**', 1,
     [('image26.png', 15.5)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'Emília! Emília!', 1,
     [('image22.jpg', 6.3)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'o que significa mudo', 1,
     [('image12.png', 15)]),
    ('s08_sessoes_av_7_10.txt', 'replace_line', '**[ANEXO: folhas do PROADE aplicadas e corrigidas — inserir do original]**', 1,
     []),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'errou mais da metade).', 1,
     [('image30.png', 15)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'faz tudo com capricho."', 1,
     [('image9.jpg', 5.8)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'gosta de carro vermelho.', 1,
     [('image95.jpg', 8), ('image96.jpg', 7)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'mas não falou nada.', 1,
     [('image97.jpg', 7.5), ('image94.jpg', 7.5)]),
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folha — inserir do original]**', 1,
     [('image99.jpg', 7.5), ('image93.jpg', 7.5)]),          # IV – Direção
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folha — inserir do original]**', 1,
     [('image40.jpg', 9.7)]),                                  # V – Espaço
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folhas — inserir do original]**', 1,
     [('image68.jpg', 7.5), ('image63.jpg', 7.5), ('image2.jpg', 5.7)]),  # VI – Tamanho
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folha — inserir do original]**', 1,
     [('image4.jpg', 5.9)]),                                   # VII – Quantidade
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folha — inserir do original]**', 1,
     [('image6.jpg', 11.6)]),                                  # VIII – Forma
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folhas — inserir do original]**', 1,
     [('image84.jpg', 6), ('image81.jpg', 6), ('image83.jpg', 6)]),   # IX – Disc. Visual
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folhas — inserir do original]**', 1,
     [('image90.jpg', 6), ('image98.jpg', 6), ('image92.jpg', 6), ('image91.jpg', 6)]),  # X – Disc. Auditiva
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folha — inserir do original]**', 1,
     [('image15.jpg', 7.6)]),                                  # XI – Verbalização
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: folhas — inserir do original]**', 1,
     [('image60.jpg', 5.5), ('image62.jpg', 5.5), ('image64.jpg', 5.5), ('image65.jpg', 5.5)]),  # XII
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'e concluiu a atividade.', 1,
     [('image80.jpg', 7), ('image85.jpg', 7)]),               # fim da 8ª
    ('s08_sessoes_av_7_10.txt', 'replace_line', '**[ANEXO: fotos/registro da atividade sem rosto — inserir do original]**', 1,
     [('image7.png', 11.3), ('image74.jpg', 12.8), ('image14.png', 15.5), ('image31.png', 5.8), ('image20.png', 5.6)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'FRACO — não realiza.', 1,
     [('image41.png', 15), ('image1.png', 15.5)]),
    ('s08_sessoes_av_7_10.txt', 'replace_sub', '**[ANEXO: desenho e folhas do POP-TT — inserir do original]**', 1,
     [('image5.jpg', 5.3), ('image16.png', 4.7), ('image37.png', 4.7), ('image29.png', 4.6)]),
    ('s08_sessoes_av_7_10.txt', 'replace_line', '**[ANEXO: tabelas do SNAP-IV aplicadas — inserir do original]**', 1,
     [('image21.png', 12.7)]),
    ('s08_sessoes_av_7_10.txt', 'after_cont', 'SEM PRESENÇA DE TDAH TIPO DESATENTO.', 1,
     [('image8.png', 12.6)]),
    # ---- 10 intervenção: foto da 1ª sessão ----
    ('s10_intervencao_separador_roteiro.txt', 'replace_line',
     '**[ANEXO: FOTO da sessão sem rosto / atividade digitalizada — inserir do original]**', 1,
     [('image23.jpg', 7.1)]),
]

def img_lines(images):
    out = []
    for it in images:
        if isinstance(it, str):
            out.append(it[5:] if it.startswith('TEXT:') else it)
        else:
            fname, w = it
            out.append('<<IMG:%s;%s>>' % (fname, w))
    return out

def main():
    filt = set(sys.argv[1:])
    used = set()
    by_file = {}
    for e in SPEC:
        if not filt or e[0] in filt:
            by_file.setdefault(e[0], []).append(e)
    for fname, entries in by_file.items():
        path = os.path.join(HERE, fname)
        lines = open(path, encoding='utf-8').read().splitlines()
        for _f, kind, key, nth, images in entries:
            if nth == 0:
                continue
            hits = []
            if kind in ('after', 'replace_line'):
                hits = [i for i, l in enumerate(lines) if l.strip() == key]
            else:
                hits = [i for i, l in enumerate(lines) if key in l]
            if len(hits) < nth:
                raise SystemExit('âncora não encontrada (%d/%d): %s | %s | %s' % (nth, len(hits), fname, kind, key[:60]))
            i = hits[nth - 1]
            new = img_lines(images)
            for it in images:
                if not isinstance(it, str):
                    used.add(it[0])
            if kind == 'replace_line':
                lines[i:i + 1] = new
            elif kind == 'replace_sub':
                lines[i] = lines[i].replace(key, '')
                lines[i + 1:i + 1] = new
            else:  # after
                lines[i + 1:i + 1] = new
        open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
        print('OK', fname)
    # confere cobertura total varrendo os s*.txt
    import glob
    used = set()
    for f in glob.glob(os.path.join(HERE, 's*.txt')):
        for m in re.finditer(r'<<IMG:([A-Za-z0-9_.\-]+);', open(f, encoding='utf-8').read()):
            used.add(m.group(1))
    allfiles = set(f for f in os.listdir(os.path.join(HERE, '_fotos_rebeca'))
                   if f.startswith('image'))
    skip = {'image51.png', 'image58.png', 'image73.png'}   # linha/icones decorativos
    missing = (allfiles - skip) - used
    extra = used - allfiles
    print('inseridas:', len(used), '| faltando:', sorted(missing), '| inexistentes:', sorted(extra))
    if missing or extra:
        sys.exit(1)

if __name__ == '__main__':
    main()
