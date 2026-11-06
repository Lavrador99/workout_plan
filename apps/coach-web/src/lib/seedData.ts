// Base exercise library: "English | Português | aliases, comma separated | extra tags".
// Groups give the tags; an exercise listed in several groups gets all of them.
// A "#1".."#4" suffix on a tag ranks the exercise for that muscle (1 = best).

export interface SeedGroup {
  tags: string[];
  items: string[];
}

export const SEED_GROUPS: SeedGroup[] = [
  // ── Glutes ────────────────────────────────────────────────────────────────
  { tags: ["glúteos", "glúteos: melhor geral"], items: ["Loaded Single Leg RDL | Peso morto romeno unilateral com carga"] },
  {
    tags: ["glúteos", "glúteo mínimo"],
    items: [
      "Side Plank w/ Elevated Leg | Prancha lateral com perna elevada | | glúteo mínimo #1",
      "Lateral Band Walk | Passada lateral com elástico | Band walks, Band walk | glúteo mínimo #2",
      "Hip Hike | Elevação da anca (pélvis) | | glúteo mínimo #2",
      "Single Leg Squat | Agachamento unilateral | | glúteo mínimo #2",
    ],
  },
  {
    tags: ["glúteos", "glúteo médio"],
    items: [
      "Side Plank w/ Elevated Leg | Prancha lateral com perna elevada | | glúteo médio #1",
      "Single Leg Squat | Agachamento unilateral | | glúteo médio #1",
      "Lateral Band Walk | Passada lateral com elástico | | glúteo médio #2",
      "Hip Hike | Elevação da anca (pélvis) | | glúteo médio #2",
      "Single Leg Hip Thrust | Hip thrust unilateral | | glúteo médio #2",
      "Loaded Split Squat | Agachamento dividido com carga | | glúteo médio #2",
      "Side Leg Hip Thrust | Hip thrust lateral | | glúteo médio #3",
      "Side Lying Lateral Raise | Abdução de anca deitado de lado | | glúteo médio #4",
      "Split Squat | Agachamento dividido | | glúteo médio #4",
    ],
  },
  {
    tags: ["glúteos", "glúteo máximo"],
    items: [
      "Side Leg Hip Thrust | Hip thrust lateral | | glúteo máximo #1",
      "Loaded Split Squat | Agachamento dividido com carga | | glúteo máximo #1",
      "Single Leg Squat | Agachamento unilateral | | glúteo máximo #2",
      "Single Leg Hip Thrust | Hip thrust unilateral | | glúteo máximo #2",
      "Lateral Band Walk | Passada lateral com elástico | | glúteo máximo #3",
      "Side Plank w/ Elevated Leg | Prancha lateral com perna elevada | | glúteo máximo #3",
      "Hip Hike | Elevação da anca (pélvis) | | glúteo máximo #4",
      "Side Lying Lateral Raise | Abdução de anca deitado de lado | | glúteo máximo #4",
    ],
  },

  // ── Prehab / accessories ──────────────────────────────────────────────────
  {
    tags: ["prehab"],
    items: [
      "Calf Raise | Elevação de gémeos | Gémeo, Gémeos",
      "Shortened Position Calf Raise | Elevação de gémeos em posição encurtada",
      "Deficit Calf Raise | Elevação de gémeos em défice",
      "Copenhagen Plank | Prancha Copenhaga | Copenhagen",
      "Adductor Side Bend | Flexão lateral de adutores",
      "Hip Flexion | Flexão da anca",
      "Closed Chain Rested Hip Flexion | Flexão da anca em cadeia fechada com apoio",
      "Superman | Super-homem | Supermans",
      "Jefferson Curl | Jefferson curl",
      "90/90 External Rotation | Rotação externa 90/90 | 90/90 position external rotation",
      "Open 1/2 Kneel KB Press to Windmill | Press KB em meio-ajoelhado para windmill",
      "Step Down | Descida do step | Step downs",
      "Goblet Floating Heel Squat | Agachamento goblet com calcanhar flutuante",
      "Rotator Cuff Drill | Exercício de coifa dos rotadores",
    ],
  },

  // ── Pull ──────────────────────────────────────────────────────────────────
  {
    tags: ["puxar"],
    items: [
      "Pull-up | Elevações | Pull up, Barra fixa",
      "Dead Start Row | Remada com arranque do chão",
      "Renegade Row | Remada renegada",
      "High to Low Cable Row (Unilateral) | Remada unilateral na polia de cima para baixo | High to low cable row uni",
      "Med Ball Slam | Arremesso de bola medicinal ao chão | Ball slam",
      "Bent-Over Row | Remada curvada",
      "Reverse Fly | Aberturas invertidas | Reverse flyes",
      "Lat Pulldown | Puxada à frente | Puxada alta",
    ],
  },

  // ── Mobility ──────────────────────────────────────────────────────────────
  {
    tags: ["mobilidade"],
    items: [
      "Breathing Drill | Exercício de respiração | Breathing, Respiração diafragmática",
      "Lateral Line Stretch | Alongamento da linha lateral",
      "Thread the Needle | Passar a agulha",
      "Cobra to Downward Dog | Cobra para cão a olhar para baixo",
      "Inchworm to Cobra | Lagarta para cobra | Inchworm",
      "ATG Split Squat | Agachamento dividido ATG",
      "Spiderman Lunge with Rotation | Afundo Spiderman com rotação | World's greatest stretch",
      "Couch Stretch | Alongamento do sofá",
      "90/90 Hip Switch | Troca de anca 90/90",
      "1/2 Kneeling Ankle Mobilization | Mobilização do tornozelo em meio-ajoelhado",
      "Shoulder CARs | CARs de ombro | Shoulders cars",
      "Neck Nods | Acenos de cabeça",
      "Neck Rotations | Rotações do pescoço",
      "Walking Lunge w/ Rotation | Afundo a andar com rotação | Walking lunge + rotation",
      "Off Knees Shoulder Taps | Toques no ombro com joelhos fora do chão",
      "Off Knees Bird Dog | Bird dog com joelhos fora do chão",
    ],
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  {
    tags: ["core", "core: rotação", "fácil"],
    items: ["Bicycle Crunch | Abdominal bicicleta | Bicycle", "Russian Twist | Rotação russa", "Seated Twist | Rotação sentado | Seated twists"],
  },
  {
    tags: ["core", "core: rotação", "médio"],
    items: [
      "Standing Rotation Chop | Chop em rotação de pé",
      "Diagonal Chop | Chop diagonal",
      "Reverse Lunge + Rotation | Afundo atrás com rotação",
      "Walking Lunge w/ Rotation | Afundo a andar com rotação",
      "Dig & Chop | Dig & chop",
    ],
  },
  {
    tags: ["core", "core: rotação", "difícil"],
    items: [
      "Cable Rotation (High/Low) | Rotação na polia (cima/baixo) | Polia rotation",
      "Med Ball Rotational Throw | Lançamento rotacional de bola medicinal",
      "Landmine Rotation | Rotação na landmine | Cable/Landmine rotation",
    ],
  },
  {
    tags: ["core", "core: anti-rotação", "fácil"],
    items: ["Pallof Press | Pallof press | Pallof", "Dead Bug + Pallof | Dead bug com pallof"],
  },
  {
    tags: ["core", "core: anti-rotação", "médio"],
    items: [
      "Renegade Row | Remada renegada",
      "A-Row | Remada em A | A-Rows",
      "Single Arm Plank | Prancha com um braço",
      "Plank KB Drag | Prancha com arrasto de kettlebell",
      "High Plank Med Ball Knee Drive | Prancha alta com joelho à bola medicinal",
    ],
  },
  {
    tags: ["core", "core: anti-rotação", "difícil"],
    items: ["Knee Rotation + Pallof Press + KB | Rotação de joelho + pallof press + KB", "Banded Bird Dog | Bird dog com resistência | Bird dog + resistência"],
  },
  { tags: ["core", "core: flexão lateral", "fácil"], items: ["Oblique Heel Taps | Toques nos calcanhares (oblíquos)", "Side Bend | Flexão lateral | Side bends"] },
  {
    tags: ["core", "core: flexão lateral", "médio"],
    items: ["Kneeling Overhead Side Crunch | Crunch lateral ajoelhado com braços acima", "Side Plank Dip | Prancha lateral com descida da anca", "Side Plank Knee Drive | Prancha lateral com elevação do joelho"],
  },
  { tags: ["core", "core: anti-flexão lateral", "fácil"], items: ["Side Plank | Prancha lateral"] },
  { tags: ["core", "core: anti-flexão lateral", "médio"], items: ["Suitcase March | Marcha com mala", "Kneeling Windmill | Windmill ajoelhado"] },
  {
    tags: ["core", "core: anti-flexão lateral", "difícil"],
    items: ["Suitcase Carry | Transporte de mala", "Offset Farmer Carry | Transporte de agricultor assimétrico", "Waiter's Carry | Transporte de empregado de mesa"],
  },
  { tags: ["core", "core: extensão", "fácil"], items: ["Superman | Super-homem", "Alternating Superman | Super-homem alternado | Alternative superman"] },
  { tags: ["core", "core: extensão", "médio"], items: ["Back Extension | Extensão lombar", "Bench Back Extension | Extensão lombar no banco"] },
  { tags: ["core", "core: extensão", "difícil"], items: ["Reverse Hyper | Hiperextensão invertida", "Sorensen Hold | Isometria Sorensen"] },
  {
    tags: ["core", "core: anti-extensão", "fácil"],
    items: ["Wall Dead Bug | Dead bug na parede", "Dead Bug | Dead bug | Inseto morto", "Plank | Prancha"],
  },
  {
    tags: ["core", "core: anti-extensão", "médio"],
    items: [
      "Stability Ball Dead Bug | Dead bug com bola suíça",
      "Seated Dead Bug | Dead bug sentado",
      "Bear Crawl | Gatinhar de urso",
      "High Plank Med Ball Knee Drive | Prancha alta com joelho à bola medicinal",
    ],
  },
  {
    tags: ["core", "core: anti-extensão", "difícil"],
    items: ["Ab Rollout | Roda abdominal | Ab wheel", "Dragonfly | Dragon flag", "Body Saw | Serrote", "Hollow Body Hold | Isometria hollow body | Hollow hold"],
  },
  { tags: ["core", "core: flexão", "fácil"], items: ["Crunch | Abdominal crunch", "Reverse Crunch | Abdominal invertido"] },
  { tags: ["core", "core: flexão", "médio"], items: ["Sit-up | Abdominal completo | Sit ups", "Sprinter Sit-up | Abdominal de velocista", "Knee Raise | Elevação de joelhos"] },
  { tags: ["core", "core: flexão", "difícil"], items: ["Hanging Leg Raise | Elevação de pernas em suspensão", "V-Up | Abdominal em V | V ups", "Toes-to-Bar | Pés à barra | T2B"] },
  { tags: ["core", "core: anti-flexão", "fácil"], items: ["Good Morning | Good morning | Bom dia"] },
  { tags: ["core", "core: anti-flexão", "médio"], items: ["Romanian Deadlift | Peso morto romeno | RDL", "Star Row | Remada em estrela"] },
  { tags: ["core", "core: anti-flexão", "difícil"], items: ["Sorensen Hold | Isometria Sorensen", "Hip Hinge Isometric | Isometria de dobradiça da anca"] },

  // ── Plyometrics / power ───────────────────────────────────────────────────
  {
    tags: ["pliometria", "pogo", "fácil"],
    items: ["Wall Supported Calf Raise | Elevação de gémeos com apoio na parede", "Fast Calf Raise | Elevação de gémeos rápida", "Pogo Hops | Saltos pogo | Pogo"],
  },
  {
    tags: ["pliometria", "pogo", "médio"],
    items: [
      "Pogo Hops (Bigger Amplitude) | Saltos pogo com maior amplitude",
      "Pogo Hops Forward/Back | Saltos pogo frente/trás",
      "Lateral Pogo Hops | Saltos pogo laterais",
      "Staggered Pogo Hops | Saltos pogo desfasados",
      "Staggered Pogo Forward/Back | Saltos pogo desfasados frente/trás",
      "Staggered Lateral Pogo | Saltos pogo desfasados laterais",
    ],
  },
  {
    tags: ["pliometria", "pogo", "difícil"],
    items: [
      "Single Leg Pogo | Saltos pogo unilaterais",
      "Single Leg Pogo Forward/Back | Saltos pogo unilaterais frente/trás",
      "Single Leg Lateral Pogo | Saltos pogo unilaterais laterais",
      "Pogo to Platform | Saltos pogo para plataforma",
      "Single Leg Pogo to Platform | Saltos pogo unilaterais para plataforma",
    ],
  },
  {
    tags: ["pliometria", "potência vertical", "fácil"],
    items: ["Calf Raise to Jump | Elevação de gémeos para salto", "Small Step Jump | Salto pequeno para step | Bumper plate jump", "Low Box Jump | Salto para caixa baixa"],
  },
  { tags: ["pliometria", "potência vertical", "médio"], items: ["Box Jump | Salto para a caixa", "High Box Jump | Salto para caixa alta | Box jump maior altura", "Squat Jump | Agachamento com salto"] },
  { tags: ["pliometria", "potência vertical", "difícil"], items: ["High Box Jump | Salto para caixa alta", "Tuck Jump | Salto com joelhos ao peito"] },
  { tags: ["pliometria", "lunge → knee drive", "fácil"], items: ["Split Stance Knee Drive | Elevação do joelho em posição dividida", "Stationary Power Skip | Power skip parado"] },
  {
    tags: ["pliometria", "lunge → knee drive", "médio"],
    items: ["Reverse Lunge to Knee Drive | Afundo atrás com elevação do joelho", "Reverse Lunge to Explosive Knee Drive | Afundo atrás com elevação explosiva do joelho"],
  },
  {
    tags: ["pliometria", "lunge → knee drive", "difícil"],
    items: ["Deficit Reverse Lunge to Knee Drive | Afundo atrás em défice com elevação do joelho", "Deficit Lunge to Knee Drive + Skip | Afundo em défice com elevação do joelho + skip"],
  },
  { tags: ["pliometria", "potência lateral", "fácil"], items: ["Lateral Glide | Deslize lateral", "Lateral Shuffle | Deslocamento lateral"] },
  {
    tags: ["pliometria", "potência lateral", "médio"],
    items: [
      "Speed Skater (Stick Landing) | Patinador com receção estável",
      "Short Distance Speed Skater | Patinador curta distância",
      "Continuous Speed Skater | Patinador contínuo | Speed skater",
    ],
  },
  {
    tags: ["pliometria", "potência lateral", "difícil"],
    items: ["Long Distance Speed Skater | Patinador longa distância", "Weighted Speed Skater | Patinador com carga", "Med Ball Speed Skater | Patinador com bola medicinal"],
  },
  { tags: ["pliometria", "potência lateral"], items: ["Lateral Bound | Salto lateral", "Lateral Plate Hop | Salto lateral sobre disco"] },
  { tags: ["pliometria", "potência horizontal", "fácil"], items: ["Small Broad Jump | Salto em comprimento pequeno", "Short Distance Broad Jump | Salto em comprimento curta distância"] },
  { tags: ["pliometria", "potência horizontal", "médio"], items: ["Broad Jump | Salto em comprimento", "Continuous Broad Jump | Saltos em comprimento contínuos"] },
  { tags: ["pliometria", "potência horizontal", "difícil"], items: ["Max Distance Broad Jump | Salto em comprimento máximo", "Repeated Broad Jumps | Saltos em comprimento repetidos"] },
  { tags: ["pliometria", "potência horizontal"], items: ["Horizontal Bound | Salto horizontal alternado", "Bounding | Multissaltos", "Depth Jump | Salto em profundidade | Drop jump"] },
  {
    tags: ["pliometria", "potência superior"],
    items: ["Plyo Push-up | Flexão pliométrica | Clap push up", "Push Press | Push press", "Med Ball Chest Throw | Lançamento de bola medicinal ao peito | Med ball throw"],
  },

  // ── Hamstrings / posterior chain ──────────────────────────────────────────
  {
    tags: ["posteriores", "posteriores: big three"],
    items: ["Single Leg Bulgarian Deadlift | Peso morto búlgaro unilateral", "Swiss Ball Hamstring Curl | Curl de posteriores na bola suíça | Ball hamstring curl, Swiss ball leg curl", "Nordic Hamstring Curl | Nórdico | Nordic curl"],
  },
  {
    tags: ["posteriores", "fácil"],
    items: [
      "Goblet Squat | Agachamento goblet",
      "Glute Bridge | Ponte de glúteos",
      "Kettlebell Hip Thrust | Hip thrust com kettlebell",
      "Hip Thrust | Hip thrust | Elevação de anca",
      "Swiss Ball Hamstring Curl | Curl de posteriores na bola suíça",
      "Swiss Ball Back Extension | Extensão lombar na bola suíça",
      "Bodyweight Good Morning | Good morning com peso corporal",
      "Kettlebell Deadlift | Peso morto com kettlebell",
      "Cable Pull Through | Pull through na polia",
      "Step-Up | Subida ao step | Step up",
    ],
  },
  {
    tags: ["posteriores", "médio"],
    items: [
      "Romanian Deadlift | Peso morto romeno | RDL",
      "Single Leg RDL | Peso morto romeno unilateral | Single leg romanian deadlift, SL RDL",
      "Barbell Hip Thrust | Hip thrust com barra",
      "Dumbbell RDL | Peso morto romeno com halteres",
      "Good Morning | Good morning",
      "Bulgarian Split Squat | Agachamento búlgaro | Búlgaro",
      "Reverse Lunge | Afundo atrás",
      "Walking Lunge | Afundo a andar | Passadas",
      "Slider Leg Curl | Curl de posteriores com sliders",
      "Assisted Nordic | Nórdico assistido",
      "45° Back Extension | Extensão lombar a 45°",
      "Kettlebell Swing | Swing com kettlebell | KB swing",
    ],
  },
  {
    tags: ["posteriores", "difícil"],
    items: [
      "Nordic Hamstring Curl | Nórdico",
      "Barbell Romanian Deadlift | Peso morto romeno com barra",
      "Single Leg RDL | Peso morto romeno unilateral",
      "Deficit Reverse Lunge | Afundo atrás em défice",
      "Front Foot Elevated Split Squat | Agachamento dividido com pé da frente elevado | FFE split squat",
      "Single Leg Hip Thrust | Hip thrust unilateral",
      "Barbell Good Morning | Good morning com barra",
      "Heavy Kettlebell Swing | Swing pesado com kettlebell",
      "Glute-Ham Raise | Glute-ham raise | GHR",
      "Razor Curl | Razor curl",
      "Single Leg Slider Curl | Curl de posteriores unilateral com slider",
      "Weighted 45° Back Extension | Extensão lombar a 45° com carga",
    ],
  },

  // ── Strength (4-day template) ─────────────────────────────────────────────
  {
    tags: ["força: joelho dominante"],
    items: ["Back Squat | Agachamento com barra | Heavy bilateral squat", "Front Squat | Agachamento frontal", "Leg Extension | Extensão de pernas | Quad isolation"],
  },
  { tags: ["força: anca dominante"], items: ["Deadlift | Peso morto | Bilateral deadlift", "Trap Bar Deadlift | Peso morto com trap bar", "Leg Curl | Curl de pernas | Hamstring isolation"] },
  { tags: ["força: empurrar"], items: ["Bench Press | Supino | Heavy bench press, Supino plano", "Overhead Press | Press militar | OHP, Heavy OHP, Shoulder press"] },
  { tags: ["core", "core: anti-rotação"], items: ["Cable Chop | Chop na polia"] },
  {
    tags: ["kettlebell"],
    items: ["Kettlebell Clean | Clean com kettlebell | KB clean", "Kettlebell Snatch | Snatch com kettlebell | KB snatch", "Kettlebell Press | Press com kettlebell | KB press"],
  },
  { tags: ["cardio"], items: ["Bike | Bicicleta | Assault bike, Air bike", "Rower | Remo | Remo ergómetro", "Incline Walk | Caminhada inclinada | Passadeira inclinada", "Corrida | Corrida | Run, Running, Jogging, Corrida contínua | corrida"] },
];
