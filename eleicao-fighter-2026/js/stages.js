// Cenários do jogo — todos são lugares (sem pessoas reais), em pixel art 16-bit.
export const STAGES = {
  congresso: {
    name: 'Congresso Nacional',
    file: 'assets/stages/congresso.jpg',
    floorY: 0.86
  },
  planalto: {
    name: 'Palácio do Planalto',
    file: 'assets/stages/planalto.jpg',
    floorY: 0.86
  },
  tse: {
    name: 'Depósito de Urnas do TSE',
    file: 'assets/stages/tse.jpg',
    floorY: 0.86
  },
  comicio: {
    name: 'Comício de Campanha',
    file: 'assets/stages/comicio.jpg',
    floorY: 0.86
  },
  debate: {
    name: 'Estúdio do Debate',
    file: 'assets/stages/debate.jpg',
    floorY: 0.86
  }
};

export const STAGE_LIST = Object.keys(STAGES);
