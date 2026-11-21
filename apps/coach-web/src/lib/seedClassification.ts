// The base library, classified by hand: main pattern, other patterns, main
// muscles (up to 3, the most worked) and secondary ones. Keyed by the
// Portuguese name of seedData.ts. Names must be in the catalogs of movement.ts
// (a test checks it). Only the base library; the coach's own go by CSV.
// Line: "Name | main pattern; other patterns | main muscles | secondary muscles"

const TABLE = `
Peso morto romeno unilateral com carga | dobradiça da anca | glúteo máximo, isquiotibiais | glúteo médio, eretores da espinha, adutores
Prancha lateral com perna elevada | anti-flexão lateral; abdução da anca | glúteo médio, glúteo mínimo, oblíquo externo | oblíquo interno, quadrado lombar, adutores
Passada lateral com elástico | abdução da anca | glúteo médio, glúteo mínimo | tensor da fáscia lata, glúteo máximo
Elevação da anca (pélvis) | abdução da anca | glúteo médio, glúteo mínimo | quadrado lombar
Agachamento unilateral | afundo / unilateral; agachamento | quadríceps, glúteo máximo, glúteo médio | glúteo mínimo, adutores, gémeos
Hip thrust unilateral | elevação pélvica | glúteo máximo, glúteo médio | isquiotibiais, eretores da espinha
Agachamento dividido com carga | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, adutores, isquiotibiais
Hip thrust lateral | elevação pélvica; abdução da anca | glúteo máximo, glúteo médio | glúteo mínimo, isquiotibiais
Abdução de anca deitado de lado | abdução da anca | glúteo médio, glúteo mínimo | tensor da fáscia lata
Agachamento dividido | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, adutores
Elevação de gémeos | flexão plantar | gémeos | sóleo
Elevação de gémeos em posição encurtada | flexão plantar | gémeos, sóleo | fibulares
Elevação de gémeos em défice | flexão plantar | gémeos | sóleo
Prancha Copenhaga | adução da anca; anti-flexão lateral | adutores | oblíquo externo, oblíquo interno, quadrado lombar
Flexão lateral de adutores | adução da anca; flexão lateral do tronco | adutores | oblíquo externo, oblíquo interno
Flexão da anca | flexão da anca | ílio-psoas | quadríceps, tensor da fáscia lata
Flexão da anca em cadeia fechada com apoio | flexão da anca | ílio-psoas | quadríceps, reto do abdómen
Super-homem | extensão do tronco | eretores da espinha, multífidos | glúteo máximo, deltoides
Jefferson curl | flexão do tronco; mobilidade / controlo motor | eretores da espinha, isquiotibiais | reto do abdómen
Rotação externa 90/90 | rotação do ombro | coifa dos rotadores | deltoides, trapézio
Press KB em meio-ajoelhado para windmill | empurrar vertical; anti-flexão lateral | deltoides, oblíquo externo, oblíquo interno | tríceps braquial, quadrado lombar, glúteo médio, serrátil anterior
Descida do step | afundo / unilateral | quadríceps, glúteo médio | glúteo máximo, tibial anterior
Agachamento goblet com calcanhar flutuante | agachamento | quadríceps | glúteo máximo, adutores, transverso do abdómen
Exercício de coifa dos rotadores | rotação do ombro | coifa dos rotadores | deltoides
Elevações | puxar vertical | grande dorsal, bíceps braquial | redondo maior, romboides, trapézio, braquial, flexores do antebraço
Remada com arranque do chão | puxar horizontal; dobradiça da anca | grande dorsal, romboides, trapézio | bíceps braquial, deltoides, eretores da espinha
Remada renegada | puxar horizontal; anti-rotação | grande dorsal, romboides, oblíquo externo | oblíquo interno, transverso do abdómen, bíceps braquial, deltoides
Remada unilateral na polia de cima para baixo | puxar vertical; puxar horizontal | grande dorsal | romboides, bíceps braquial, redondo maior
Arremesso de bola medicinal ao chão | salto / pliometria; flexão do tronco | grande dorsal, reto do abdómen | tríceps braquial, oblíquo externo, oblíquo interno
Remada curvada | puxar horizontal | grande dorsal, romboides, trapézio | bíceps braquial, deltoides, eretores da espinha
Aberturas invertidas | puxar horizontal | deltoides, romboides, trapézio | coifa dos rotadores
Puxada à frente | puxar vertical | grande dorsal | bíceps braquial, redondo maior, romboides
Exercício de respiração | mobilidade / controlo motor | transverso do abdómen | reto do abdómen, escalenos
Alongamento da linha lateral | mobilidade / controlo motor | quadrado lombar, grande dorsal | oblíquo externo, oblíquo interno
Passar a agulha | mobilidade / controlo motor; rotação do tronco | romboides, trapézio | oblíquo externo, oblíquo interno
Cobra para cão a olhar para baixo | mobilidade / controlo motor | isquiotibiais, gémeos | eretores da espinha, deltoides
Lagarta para cobra | mobilidade / controlo motor | isquiotibiais | deltoides, transverso do abdómen, reto do abdómen
Agachamento dividido ATG | afundo / unilateral; mobilidade / controlo motor | quadríceps, glúteo máximo | ílio-psoas, adutores
Afundo Spiderman com rotação | mobilidade / controlo motor; afundo / unilateral; rotação do tronco | ílio-psoas, adutores | glúteo máximo, oblíquo externo, oblíquo interno
Alongamento do sofá | mobilidade / controlo motor | ílio-psoas, quadríceps |
Troca de anca 90/90 | mobilidade / controlo motor; rotação interna da anca; rotação externa da anca | glúteo médio, glúteo máximo | adutores, ílio-psoas
Mobilização do tornozelo em meio-ajoelhado | dorsiflexão; mobilidade / controlo motor | gémeos, sóleo | tibial anterior
CARs de ombro | mobilidade / controlo motor; rotação do ombro | deltoides, coifa dos rotadores | trapézio, serrátil anterior
Acenos de cabeça | mobilidade / controlo motor | esternocleidomastóideo, escalenos | esplénio
Rotações do pescoço | mobilidade / controlo motor | esternocleidomastóideo, esplénio | escalenos, trapézio
Afundo a andar com rotação | afundo / unilateral; rotação do tronco | quadríceps, glúteo máximo, oblíquo externo | oblíquo interno, glúteo médio
Toques no ombro com joelhos fora do chão | anti-rotação; anti-extensão | transverso do abdómen, oblíquo externo | oblíquo interno, deltoides, serrátil anterior
Bird dog com joelhos fora do chão | anti-rotação; anti-extensão | transverso do abdómen, multífidos | oblíquo externo, oblíquo interno, glúteo máximo, deltoides
Abdominal bicicleta | rotação do tronco; flexão do tronco | oblíquo externo, oblíquo interno, reto do abdómen | ílio-psoas
Rotação russa | rotação do tronco | oblíquo externo, oblíquo interno | reto do abdómen, ílio-psoas
Rotação sentado | rotação do tronco | oblíquo externo, oblíquo interno | reto do abdómen
Chop em rotação de pé | rotação do tronco | oblíquo externo, oblíquo interno | transverso do abdómen, deltoides, glúteo máximo
Chop diagonal | rotação do tronco | oblíquo externo, oblíquo interno | transverso do abdómen, deltoides
Afundo atrás com rotação | afundo / unilateral; rotação do tronco | quadríceps, glúteo máximo, oblíquo externo | oblíquo interno, glúteo médio
Dig & chop | rotação do tronco; agachamento | oblíquo externo, oblíquo interno | quadríceps, glúteo máximo, deltoides
Rotação na polia (cima/baixo) | rotação do tronco | oblíquo externo, oblíquo interno | transverso do abdómen
Lançamento rotacional de bola medicinal | rotação do tronco; salto / pliometria | oblíquo externo, oblíquo interno | glúteo máximo, peitoral maior, deltoides
Rotação na landmine | rotação do tronco | oblíquo externo, oblíquo interno | deltoides, transverso do abdómen
Pallof press | anti-rotação | oblíquo externo, oblíquo interno, transverso do abdómen | reto do abdómen
Dead bug com pallof | anti-rotação; anti-extensão | transverso do abdómen, oblíquo externo, oblíquo interno | reto do abdómen
Remada em A | puxar horizontal; anti-rotação | grande dorsal, romboides | oblíquo externo, oblíquo interno, bíceps braquial
Prancha com um braço | anti-rotação; anti-extensão | transverso do abdómen, oblíquo externo, oblíquo interno | reto do abdómen, deltoides
Prancha com arrasto de kettlebell | anti-rotação; anti-extensão | oblíquo externo, oblíquo interno, transverso do abdómen | reto do abdómen, deltoides, grande dorsal
Prancha alta com joelho à bola medicinal | anti-extensão; anti-rotação | reto do abdómen, transverso do abdómen | oblíquo externo, oblíquo interno, ílio-psoas, serrátil anterior
Rotação de joelho + pallof press + KB | anti-rotação; rotação do tronco | oblíquo externo, oblíquo interno | transverso do abdómen, glúteo médio
Bird dog com resistência | anti-rotação; anti-extensão | transverso do abdómen, multífidos | glúteo máximo, deltoides, oblíquo externo
Toques nos calcanhares (oblíquos) | flexão lateral do tronco | oblíquo externo, oblíquo interno | reto do abdómen
Flexão lateral | flexão lateral do tronco | oblíquo externo, oblíquo interno, quadrado lombar |
Crunch lateral ajoelhado com braços acima | flexão lateral do tronco | oblíquo externo, oblíquo interno | quadrado lombar, reto do abdómen
Prancha lateral com descida da anca | flexão lateral do tronco; anti-flexão lateral | oblíquo externo, oblíquo interno, quadrado lombar | glúteo médio
Prancha lateral com elevação do joelho | anti-flexão lateral | oblíquo externo, oblíquo interno, quadrado lombar | ílio-psoas, glúteo médio
Prancha lateral | anti-flexão lateral | oblíquo externo, oblíquo interno, quadrado lombar | glúteo médio
Marcha com mala | transporte; anti-flexão lateral | quadrado lombar, oblíquo externo, oblíquo interno | glúteo médio, flexores do antebraço, trapézio
Windmill ajoelhado | anti-flexão lateral; rotação do tronco | oblíquo externo, oblíquo interno, quadrado lombar | deltoides, glúteo médio
Transporte de mala | transporte; anti-flexão lateral | quadrado lombar, oblíquo externo, oblíquo interno | flexores do antebraço, trapézio, glúteo médio
Transporte de agricultor assimétrico | transporte; anti-flexão lateral | quadrado lombar, flexores do antebraço, trapézio | oblíquo externo, oblíquo interno, glúteo médio
Transporte de empregado de mesa | transporte; anti-flexão lateral | deltoides, coifa dos rotadores, serrátil anterior | trapézio, oblíquo externo, oblíquo interno
Super-homem alternado | extensão do tronco; anti-rotação | eretores da espinha, multífidos | glúteo máximo, deltoides
Extensão lombar | extensão do tronco; dobradiça da anca | eretores da espinha | glúteo máximo, isquiotibiais, multífidos
Extensão lombar no banco | extensão do tronco; dobradiça da anca | eretores da espinha | glúteo máximo, isquiotibiais
Hiperextensão invertida | elevação pélvica; extensão do tronco | glúteo máximo, isquiotibiais | eretores da espinha
Isometria Sorensen | extensão do tronco | eretores da espinha, multífidos | glúteo máximo, isquiotibiais
Dead bug na parede | anti-extensão | transverso do abdómen, reto do abdómen | oblíquo externo, oblíquo interno
Dead bug | anti-extensão | transverso do abdómen, reto do abdómen | oblíquo externo, oblíquo interno, ílio-psoas
Prancha | anti-extensão | reto do abdómen, transverso do abdómen | oblíquo externo, oblíquo interno, serrátil anterior
Dead bug com bola suíça | anti-extensão | transverso do abdómen, reto do abdómen | oblíquo externo, oblíquo interno
Dead bug sentado | anti-extensão | transverso do abdómen, reto do abdómen | ílio-psoas
Gatinhar de urso | anti-extensão; anti-rotação; locomoção / cardio | transverso do abdómen, deltoides | serrátil anterior, quadríceps, oblíquo externo
Roda abdominal | anti-extensão | reto do abdómen, transverso do abdómen | grande dorsal, oblíquo externo, serrátil anterior
Dragon flag | anti-extensão; flexão do tronco | reto do abdómen, transverso do abdómen | grande dorsal, ílio-psoas
Serrote | anti-extensão | reto do abdómen, transverso do abdómen | grande dorsal, serrátil anterior
Isometria hollow body | anti-extensão | reto do abdómen, transverso do abdómen | ílio-psoas, oblíquo externo
Abdominal crunch | flexão do tronco | reto do abdómen | oblíquo externo, oblíquo interno
Abdominal invertido | flexão do tronco | reto do abdómen | ílio-psoas, oblíquo externo
Abdominal completo | flexão do tronco | reto do abdómen | ílio-psoas, oblíquo externo
Abdominal de velocista | flexão do tronco; flexão da anca | reto do abdómen, ílio-psoas | oblíquo externo, oblíquo interno
Elevação de joelhos | flexão do tronco; flexão da anca | reto do abdómen, ílio-psoas | flexores do antebraço, grande dorsal
Elevação de pernas em suspensão | flexão do tronco; flexão da anca | reto do abdómen, ílio-psoas | oblíquo externo, flexores do antebraço, grande dorsal
Abdominal em V | flexão do tronco; flexão da anca | reto do abdómen, ílio-psoas | oblíquo externo
Pés à barra | flexão do tronco; flexão da anca | reto do abdómen, ílio-psoas | grande dorsal, flexores do antebraço, oblíquo externo
Good morning | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha, adutores
Peso morto romeno | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha, adutores, flexores do antebraço
Remada em estrela | puxar horizontal; anti-rotação | grande dorsal, romboides | oblíquo externo, oblíquo interno, bíceps braquial
Isometria de dobradiça da anca | dobradiça da anca | isquiotibiais, glúteo máximo, eretores da espinha |
Elevação de gémeos com apoio na parede | flexão plantar; salto / pliometria | gémeos | sóleo
Elevação de gémeos rápida | flexão plantar; salto / pliometria | gémeos | sóleo
Saltos pogo | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps
Saltos pogo com maior amplitude | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, glúteo máximo
Saltos pogo frente/trás | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, tibial anterior
Saltos pogo laterais | salto / pliometria; flexão plantar | gémeos, sóleo | fibulares, glúteo médio, adutores
Saltos pogo desfasados | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps
Saltos pogo desfasados frente/trás | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, tibial anterior
Saltos pogo desfasados laterais | salto / pliometria; flexão plantar | gémeos, sóleo | fibulares, glúteo médio
Saltos pogo unilaterais | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, glúteo médio, fibulares
Saltos pogo unilaterais frente/trás | salto / pliometria; flexão plantar | gémeos, sóleo | glúteo médio, tibial anterior
Saltos pogo unilaterais laterais | salto / pliometria; flexão plantar | gémeos, sóleo | glúteo médio, fibulares, adutores
Saltos pogo para plataforma | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, glúteo máximo
Saltos pogo unilaterais para plataforma | salto / pliometria; flexão plantar | gémeos, sóleo | quadríceps, glúteo médio
Elevação de gémeos para salto | flexão plantar; salto / pliometria | gémeos, sóleo | quadríceps
Salto pequeno para step | salto / pliometria | quadríceps, glúteo máximo, gémeos | isquiotibiais
Salto para caixa baixa | salto / pliometria | quadríceps, glúteo máximo, gémeos | isquiotibiais
Salto para a caixa | salto / pliometria | quadríceps, glúteo máximo, gémeos | isquiotibiais, ílio-psoas
Salto para caixa alta | salto / pliometria | quadríceps, glúteo máximo, gémeos | isquiotibiais, ílio-psoas
Agachamento com salto | salto / pliometria; agachamento | quadríceps, glúteo máximo, gémeos | isquiotibiais
Salto com joelhos ao peito | salto / pliometria | quadríceps, glúteo máximo, ílio-psoas | gémeos, reto do abdómen
Elevação do joelho em posição dividida | salto / pliometria; afundo / unilateral | ílio-psoas, quadríceps, glúteo máximo | gémeos, glúteo médio
Power skip parado | salto / pliometria; afundo / unilateral | glúteo máximo, gémeos, ílio-psoas | quadríceps, glúteo médio
Afundo atrás com elevação do joelho | afundo / unilateral | quadríceps, glúteo máximo, ílio-psoas | glúteo médio, gémeos
Afundo atrás com elevação explosiva do joelho | afundo / unilateral; salto / pliometria | quadríceps, glúteo máximo, ílio-psoas | glúteo médio, gémeos
Afundo atrás em défice com elevação do joelho | afundo / unilateral | quadríceps, glúteo máximo, ílio-psoas | glúteo médio, adutores
Afundo em défice com elevação do joelho + skip | afundo / unilateral; salto / pliometria | quadríceps, glúteo máximo, ílio-psoas | gémeos, glúteo médio
Deslize lateral | agilidade / mudança de direção | adutores, glúteo médio, quadríceps | glúteo máximo, gémeos
Deslocamento lateral | agilidade / mudança de direção | glúteo médio, adutores, quadríceps | gémeos, fibulares
Patinador com receção estável | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, gémeos, fibulares
Patinador curta distância | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, gémeos
Patinador contínuo | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, gémeos
Patinador longa distância | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, gémeos
Patinador com carga | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, gémeos
Patinador com bola medicinal | salto / pliometria; agilidade / mudança de direção | glúteo médio, glúteo máximo, quadríceps | adutores, oblíquo externo, gémeos
Salto lateral | salto / pliometria; agilidade / mudança de direção | glúteo médio, quadríceps, gémeos | adutores, fibulares
Salto lateral sobre disco | salto / pliometria; agilidade / mudança de direção | glúteo médio, quadríceps, gémeos | adutores, fibulares
Salto em comprimento pequeno | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais
Salto em comprimento curta distância | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais
Salto em comprimento | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais, eretores da espinha
Saltos em comprimento contínuos | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais
Salto em comprimento máximo | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais, eretores da espinha
Saltos em comprimento repetidos | salto / pliometria | glúteo máximo, quadríceps, gémeos | isquiotibiais
Salto horizontal alternado | salto / pliometria; afundo / unilateral | glúteo máximo, quadríceps, gémeos | isquiotibiais, glúteo médio
Multissaltos | salto / pliometria; afundo / unilateral | glúteo máximo, gémeos, quadríceps | isquiotibiais, ílio-psoas, glúteo médio
Salto em profundidade | salto / pliometria | quadríceps, glúteo máximo, gémeos | sóleo, isquiotibiais
Flexão pliométrica | empurrar horizontal; salto / pliometria | peitoral maior, tríceps braquial | deltoides, serrátil anterior, reto do abdómen
Push press | empurrar vertical; salto / pliometria | deltoides, tríceps braquial | quadríceps, glúteo máximo, trapézio
Lançamento de bola medicinal ao peito | empurrar horizontal; salto / pliometria | peitoral maior, tríceps braquial | deltoides, serrátil anterior
Peso morto búlgaro unilateral | dobradiça da anca; afundo / unilateral | glúteo máximo, isquiotibiais | glúteo médio, quadríceps, adutores
Curl de posteriores na bola suíça | flexão do joelho; elevação pélvica | isquiotibiais | glúteo máximo, gémeos
Nórdico | flexão do joelho | isquiotibiais | gémeos, glúteo máximo
Agachamento goblet | agachamento | quadríceps, glúteo máximo | adutores, eretores da espinha, transverso do abdómen
Ponte de glúteos | elevação pélvica | glúteo máximo | isquiotibiais, glúteo médio
Hip thrust com kettlebell | elevação pélvica | glúteo máximo | isquiotibiais, glúteo médio, quadríceps
Hip thrust | elevação pélvica | glúteo máximo | isquiotibiais, glúteo médio, quadríceps
Extensão lombar na bola suíça | extensão do tronco | eretores da espinha | glúteo máximo, isquiotibiais
Good morning com peso corporal | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha
Peso morto com kettlebell | dobradiça da anca | glúteo máximo, isquiotibiais | quadríceps, eretores da espinha, flexores do antebraço
Pull through na polia | dobradiça da anca | glúteo máximo, isquiotibiais | eretores da espinha
Subida ao step | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, gémeos, adutores
Peso morto romeno unilateral | dobradiça da anca | isquiotibiais, glúteo máximo | glúteo médio, eretores da espinha, adutores
Hip thrust com barra | elevação pélvica | glúteo máximo | isquiotibiais, glúteo médio, quadríceps
Peso morto romeno com halteres | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha, flexores do antebraço
Agachamento búlgaro | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, adutores, isquiotibiais
Afundo atrás | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, adutores, isquiotibiais
Afundo a andar | afundo / unilateral | quadríceps, glúteo máximo | glúteo médio, adutores, gémeos
Curl de posteriores com sliders | flexão do joelho; elevação pélvica | isquiotibiais | glúteo máximo, gémeos
Nórdico assistido | flexão do joelho | isquiotibiais | gémeos
Extensão lombar a 45° | extensão do tronco; dobradiça da anca | eretores da espinha, glúteo máximo | isquiotibiais
Swing com kettlebell | dobradiça da anca | glúteo máximo, isquiotibiais | eretores da espinha, deltoides, flexores do antebraço
Peso morto romeno com barra | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha, flexores do antebraço, trapézio
Afundo atrás em défice | afundo / unilateral | glúteo máximo, quadríceps | adutores, isquiotibiais, glúteo médio
Agachamento dividido com pé da frente elevado | afundo / unilateral | quadríceps, glúteo máximo | adutores, glúteo médio
Good morning com barra | dobradiça da anca | isquiotibiais, glúteo máximo | eretores da espinha
Swing pesado com kettlebell | dobradiça da anca | glúteo máximo, isquiotibiais | eretores da espinha, flexores do antebraço
Glute-ham raise | flexão do joelho | isquiotibiais, glúteo máximo | gémeos, eretores da espinha
Razor curl | flexão do joelho | isquiotibiais | glúteo máximo, gémeos
Curl de posteriores unilateral com slider | flexão do joelho; elevação pélvica | isquiotibiais | glúteo máximo, glúteo médio
Extensão lombar a 45° com carga | extensão do tronco; dobradiça da anca | eretores da espinha, glúteo máximo | isquiotibiais
Agachamento com barra | agachamento | quadríceps, glúteo máximo | adutores, eretores da espinha, sóleo
Agachamento frontal | agachamento | quadríceps | glúteo máximo, eretores da espinha, reto do abdómen
Extensão de pernas | extensão do joelho | quadríceps |
Peso morto | dobradiça da anca | glúteo máximo, isquiotibiais, eretores da espinha | quadríceps, trapézio, flexores do antebraço, grande dorsal
Peso morto com trap bar | dobradiça da anca; agachamento | glúteo máximo, quadríceps, isquiotibiais | eretores da espinha, trapézio, flexores do antebraço
Curl de pernas | flexão do joelho | isquiotibiais | gémeos
Supino | empurrar horizontal | peitoral maior, tríceps braquial | deltoides
Press militar | empurrar vertical | deltoides, tríceps braquial | trapézio, serrátil anterior
Chop na polia | rotação do tronco; anti-rotação | oblíquo externo, oblíquo interno | transverso do abdómen, deltoides
Clean com kettlebell | dobradiça da anca | glúteo máximo, isquiotibiais | trapézio, deltoides, flexores do antebraço, eretores da espinha
Snatch com kettlebell | dobradiça da anca; empurrar vertical | glúteo máximo, isquiotibiais, deltoides | trapézio, eretores da espinha, flexores do antebraço
Press com kettlebell | empurrar vertical | deltoides, tríceps braquial | trapézio, serrátil anterior, oblíquo externo
Bicicleta | locomoção / cardio | quadríceps | glúteo máximo, isquiotibiais, gémeos
Remo | locomoção / cardio; puxar horizontal | quadríceps, grande dorsal, glúteo máximo | romboides, isquiotibiais, bíceps braquial, eretores da espinha
Caminhada inclinada | locomoção / cardio | glúteo máximo, gémeos | quadríceps, isquiotibiais, sóleo
Corrida | locomoção / cardio | quadríceps, gémeos, glúteo máximo | isquiotibiais, sóleo, ílio-psoas
`;

export interface Classification {
  primaryPattern: string;
  patterns: string[]; // all, the main one first
  primaryMuscles: string[];
  muscles: string[]; // all, the main ones first
}

const list = (s: string | undefined) =>
  (s ?? "")
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Portuguese name (lower case) → classification. */
export const SEED_CLASSIFICATION: Map<string, Classification> = new Map(
  TABLE.trim()
    .split("\n")
    .map((line) => {
      const [name, patterns, primary, secondary] = line.split("|").map((x) => x.trim());
      const p = list(patterns);
      const m = list(primary);
      return [name.toLowerCase(), { primaryPattern: p[0], patterns: p, primaryMuscles: m, muscles: [...m, ...list(secondary).filter((x) => !m.includes(x))] }];
    }),
);
