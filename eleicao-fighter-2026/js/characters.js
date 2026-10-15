// =============================================================
// ELEIÇÃO FIGHTER 2026 — dados do elenco (paródia / fã-game)
// Baseado na lista oficial de 12 candidaturas à Presidência do
// Brasil homologadas pelo TSE para as eleições de 2026.
// Os retratos são ilustrações de caricatura 100% originais e
// geradas digitalmente, no estilo clássico de charge de jornal
// (cartum editorial exagerado e cômico) — não são fotos reais.
// =============================================================

export const ROSTER = [
  {
    id: 'lula',
    portrait: 'assets/portraits/lula.png',
    name: 'Lula',
    full: 'Luiz Inácio Lula da Silva',
    party: 'PT',
    number: 13,
    vice: 'Geraldo Alckmin',
    tagline: 'O veterano de seis eleições',
    bio: 'Sindicalista e ex-presidente, disputa a reeleição pela sexta vez nas urnas.',
    home: 'Caetés (PE)',
    stage: 'planalto',
    stats: { power: 3, speed: 3, defense: 4, special: 3 },
    visual: {
      skin: '#c88a5e', hair: '#d7d7d7', hairStyle: 'short', facial: 'beard',
      suit: '#8a1515', suitShadow: '#5c0d0d', shirt: '#f2f2f2', tie: '#ffffff',
      accent: '#ffce00', accessory: 'sash', build: 1.0
    },
    moves: {
      special1: { name: 'Caneta da Reforma', desc: 'Arremessa uma caneta giratória que atordoa o rival.' },
      special2: { name: 'Palanque Avante', desc: 'Avança com um chute de palanque, empurrando o oponente.' },
      super: { name: 'Discurso do Planalto', desc: 'Onda sonora de discurso que atinge toda a tela.' }
    }
  },
  {
    id: 'flavio',
    portrait: 'assets/portraits/flavio.png',
    name: 'Flávio Bolsonaro',
    full: 'Flávio Nantes Bolsonaro',
    party: 'PL',
    number: 22,
    vice: 'Alfredo Gaspar',
    tagline: 'O senador que virou cabeça de chapa',
    bio: 'Senador pelo Rio de Janeiro, disputa a Presidência pela primeira vez.',
    home: 'Rio de Janeiro (RJ)',
    stage: 'comicio',
    stats: { power: 3, speed: 3, defense: 4, special: 3 },
    visual: {
      skin: '#e8b48a', hair: '#2b2b2b', hairStyle: 'side', facial: 'none',
      suit: '#0b3d91', suitShadow: '#07265c', shirt: '#f2f2f2', tie: '#0b7a3b',
      accent: '#ffd400', accessory: 'flagpin', build: 1.0
    },
    moves: {
      special1: { name: 'Motociata Power', desc: 'Investida em alta velocidade estilo motociata.' },
      special2: { name: 'Megafone Supremo', desc: 'Grito amplificado que empurra o oponente para trás.' },
      super: { name: 'Carreata Final', desc: 'Atropela a tela inteira com uma buzinaço de faixa amarela.' }
    }
  },
  {
    id: 'caiado',
    portrait: 'assets/portraits/caiado.png',
    name: 'Ronaldo Caiado',
    full: 'Ronaldo Caiado',
    party: 'PSD',
    number: 55,
    vice: 'Gilberto Kassab',
    tagline: 'O governador do Cerrado',
    bio: 'Médico e governador de Goiás, reeleito antes de tentar o Planalto.',
    home: 'Goiás',
    stage: 'congresso',
    stats: { power: 5, speed: 2, defense: 5, special: 2 },
    visual: {
      skin: '#d79a68', hair: '#b7b7b7', hairStyle: 'short', facial: 'mustache',
      suit: '#1b5e20', suitShadow: '#0e3812', shirt: '#eadfc4', tie: '#6d4c2a',
      accent: '#c9a227', accessory: 'hat', build: 1.08
    },
    moves: {
      special1: { name: 'Trator Fúria', desc: 'Carga de ombro com a força de um trator agrícola.' },
      special2: { name: 'Laço do Cerrado', desc: 'Puxa o oponente para perto com um laço de boiadeiro.' },
      super: { name: 'Grito do Agro', desc: 'Berro que ecoa pelo Cerrado e atordoa a arena inteira.' }
    }
  },
  {
    id: 'zema',
    portrait: 'assets/portraits/zema.png',
    name: 'Romeu Zema',
    full: 'Romeu Zema Neto',
    party: 'Novo',
    number: 30,
    vice: 'Eduardo Girão',
    tagline: 'O empresário liberal de Minas',
    bio: 'Empresário e governador de Minas Gerais, eleito duas vezes seguidas.',
    home: 'Minas Gerais',
    stage: 'debate',
    stats: { power: 2, speed: 5, defense: 2, special: 5 },
    visual: {
      skin: '#e3b088', hair: '#5a3a22', hairStyle: 'short', facial: 'none',
      suit: '#f57c00', suitShadow: '#b85600', shirt: '#ffffff', tie: '#2b2b2b',
      accent: '#ffffff', accessory: 'glasses', build: 0.95
    },
    moves: {
      special1: { name: 'Corte de Gastos', desc: 'Golpe de tesoura que corta o avanço do rival.' },
      special2: { name: 'Privatização Relâmpago', desc: 'Investida rápida de um extremo a outro da tela.' },
      super: { name: 'Leilão Total', desc: 'Chuva de martelos de leiloeiro cai sobre o adversário.' }
    }
  },
  {
    id: 'renan',
    portrait: 'assets/portraits/renan.png',
    name: 'Renan Santos',
    full: 'Renan Santos',
    party: 'Missão',
    number: 14,
    vice: 'Coronel Medina',
    tagline: 'O guitarrista fundador do MBL',
    bio: 'Ativista, músico e fundador do Movimento Brasil Livre, estreia nas urnas.',
    home: 'Vinhedo (SP)',
    stage: 'comicio',
    stats: { power: 3, speed: 4, defense: 3, special: 4 },
    visual: {
      skin: '#e3b088', hair: '#3b2a1a', hairStyle: 'long', facial: 'goatee',
      suit: '#6a1b9a', suitShadow: '#3d0f5c', shirt: '#101010', tie: '#101010',
      accent: '#ff2d95', accessory: 'guitar', build: 0.98
    },
    moves: {
      special1: { name: 'Riff Liberal', desc: 'Power chord de guitarra vira onda de choque.' },
      special2: { name: 'Panelaço Sônico', desc: 'Bate panelas que atordoam em área.' },
      super: { name: 'Solo das Ruas', desc: 'Solo de guitarra que convoca um coro de apoiadores.' }
    }
  },
  {
    id: 'cury',
    portrait: 'assets/portraits/cury.png',
    name: 'Augusto Cury',
    full: 'Augusto Jorge Cury',
    party: 'Avante',
    number: 70,
    vice: 'Júlio Delgado',
    tagline: 'O psiquiatra escritor best-seller',
    bio: 'Médico psiquiatra e um dos autores mais lidos do Brasil, estreia na política.',
    home: 'Londrina (PR)',
    stage: 'debate',
    stats: { power: 2, speed: 3, defense: 3, special: 5 },
    visual: {
      skin: '#d79a68', hair: '#1f1f1f', hairStyle: 'short', facial: 'none',
      suit: '#00796b', suitShadow: '#00453d', shirt: '#eaf2f1', tie: '#c9a227',
      accent: '#80cbc4', accessory: 'book', build: 1.0
    },
    moves: {
      special1: { name: 'Página Motivacional', desc: 'Arremessa um livro giratório como projétil.' },
      special2: { name: 'Análise da Mente', desc: 'Onda psíquica que confunde o rival por um instante.' },
      super: { name: 'Blindagem Emocional', desc: 'Escudo mental que reflete o próximo golpe recebido.' }
    }
  },
  {
    id: 'samara',
    portrait: 'assets/portraits/samara.png',
    name: 'Samara Martins',
    full: 'Samara Martins',
    party: 'UP',
    number: 80,
    vice: 'Raquel Brício',
    tagline: 'A dentista do SUS e sindicalista',
    bio: 'Dentista do SUS e coordenadora de movimentos populares no Rio Grande do Norte.',
    home: 'Rio Grande do Norte',
    stage: 'congresso',
    stats: { power: 4, speed: 4, defense: 3, special: 3 },
    visual: {
      skin: '#8a5a3c', hair: '#141414', hairStyle: 'ponytail', facial: 'none',
      suit: '#c62828', suitShadow: '#8e1515', shirt: '#ffffff', tie: '#ffd400',
      accent: '#ffd400', accessory: 'headband', build: 0.95
    },
    moves: {
      special1: { name: 'Punho Popular', desc: 'Soco em avanço com força de assembleia.' },
      special2: { name: 'Bandeira Vermelha', desc: 'Golpe com a bandeira que empurra o rival para trás.' },
      super: { name: 'Mutirão Final', desc: 'Convoca uma sequência coletiva de golpes.' }
    }
  },
  {
    id: 'pimenta',
    portrait: 'assets/portraits/pimenta.png',
    name: 'Rui Costa Pimenta',
    full: 'Rui Costa Pimenta',
    party: 'PCO',
    number: 29,
    vice: 'Antônio Carlos',
    tagline: 'O orador de palanque inflamado',
    bio: 'Candidato histórico do PCO, conhecido pelos discursos inflamados de campanha.',
    home: 'São Paulo (SP)',
    stage: 'comicio',
    stats: { power: 3, speed: 3, defense: 2, special: 5 },
    visual: {
      skin: '#d79a68', hair: '#2b2b2b', hairStyle: 'short', facial: 'mustache',
      suit: '#7a0e0e', suitShadow: '#4a0808', shirt: '#f2f2f2', tie: '#101010',
      accent: '#ffffff', accessory: 'megaphone', build: 1.0
    },
    moves: {
      special1: { name: 'Panfletaço', desc: 'Arremessa uma rajada de panfletos de campanha.' },
      special2: { name: 'Discurso Inflamado', desc: 'Grito de palanque que empurra o oponente.' },
      super: { name: 'Palavra de Ordem', desc: 'Megafone no talo: onda sonora cobre a arena inteira.' }
    }
  },
  {
    id: 'edmilson',
    portrait: 'assets/portraits/edmilson.png',
    name: 'Edmilson Costa',
    full: 'Edmilson Costa',
    party: 'PCB',
    number: 21,
    vice: 'Cleusa Santos',
    tagline: 'O economista doutor pela Unicamp',
    bio: 'Economista com doutorado pela Unicamp, secretário-geral do PCB.',
    home: 'Maranhão',
    stage: 'tse',
    stats: { power: 3, speed: 2, defense: 5, special: 3 },
    visual: {
      skin: '#c88a5e', hair: '#c9c9c9', hairStyle: 'bald', facial: 'beard',
      suit: '#8e0e0e', suitShadow: '#5a0808', shirt: '#eaeaea', tie: '#101010',
      accent: '#ffce00', accessory: 'briefcase', build: 1.02
    },
    moves: {
      special1: { name: 'Martelo e Foice', desc: 'Golpe duplo rápido de punho fechado.' },
      special2: { name: 'Manifesto Shock', desc: 'Solta um raio de pasta cheia de panfletos.' },
      super: { name: 'Reforma Agrária', desc: 'Faz tremer o chão da arena, desequilibrando o rival.' }
    }
  },
  {
    id: 'hertz',
    portrait: 'assets/portraits/hertz.png',
    name: 'Hertz Dias',
    full: 'Hertz Dias',
    party: 'PSTU',
    number: 16,
    vice: 'Vanessa Portugal',
    tagline: 'O professor de História grevista',
    bio: 'Professor de História e militante do PSTU desde 2010.',
    home: 'São José de Ribamar (MA)',
    stage: 'tse',
    stats: { power: 3, speed: 4, defense: 2, special: 4 },
    visual: {
      skin: '#c88a5e', hair: '#1a1a1a', hairStyle: 'short', facial: 'beard',
      suit: '#b71c1c', suitShadow: '#7a1010', shirt: '#ffffff', tie: '#101010',
      accent: '#ffffff', accessory: 'flag', build: 0.97
    },
    moves: {
      special1: { name: 'Greve Geral', desc: 'Paralisa o rival por um instante com um apito.' },
      special2: { name: 'Lição de História', desc: 'Golpe de giz relâmpago que avança no chão.' },
      super: { name: 'Bandeira Operária', desc: 'Hasteia a bandeira e convoca um ataque em massa.' }
    }
  },
  {
    id: 'clariana',
    name: 'Clariana Barão',
    full: 'Clariana Barão',
    party: 'DC',
    number: 27,
    vice: 'Fabiana Torquato',
    tagline: 'A advogada de Mato Grosso',
    bio: 'Advogada formada em Direito Administrativo, preside o diretório estadual do DC.',
    home: 'Mato Grosso',
    stage: 'tse',
    portrait: 'assets/portraits/clariana.png',
    stats: { power: 2, speed: 4, defense: 4, special: 4 },
    visual: {
      skin: '#e3b088', hair: '#3b1f0f', hairStyle: 'long', facial: 'none',
      suit: '#1565c0', suitShadow: '#0d3e82', shirt: '#ffffff', tie: '#90caf9',
      accent: '#ffffff', accessory: 'gavel', build: 0.93
    },
    moves: {
      special1: { name: 'Toga da Justiça', desc: 'Giro de toga que repele ataques próximos.' },
      special2: { name: 'Voto de Confiança', desc: 'Investida protegida por um escudo jurídico.' },
      super: { name: 'Sentença Final', desc: 'Martelada de juíza que sacode toda a arena.' }
    }
  },
  {
    id: 'grassi',
    name: 'Wilson Grassi',
    full: 'Wilson Grassi',
    party: 'Democrata',
    number: 35,
    vice: 'Suêd Haidar',
    tagline: 'O veterinário do interior',
    bio: 'Médico veterinário, candidato pelo Democrata com foco na área rural.',
    home: 'Interior do Brasil',
    stage: 'planalto',
    portrait: 'assets/portraits/grassi.png',
    stats: { power: 3, speed: 3, defense: 4, special: 3 },
    visual: {
      skin: '#d79a68', hair: '#8a8a8a', hairStyle: 'short', facial: 'mustache',
      suit: '#f2f2f2', suitShadow: '#c9c9c9', shirt: '#2e7d32', tie: '#2e7d32',
      accent: '#2e7d32', accessory: 'stethoscope', build: 1.0
    },
    moves: {
      special1: { name: 'Vacina Giratória', desc: 'Seringa giratória que atordoa o oponente.' },
      special2: { name: 'Faro Clínico', desc: 'Avanço rápido de diagnóstico certeiro.' },
      super: { name: 'Pronto-Socorro Rural', desc: 'Cura parte da própria energia e contra-ataca.' }
    }
  }
];

export function getFighterById(id) {
  return ROSTER.find((f) => f.id === id);
}
