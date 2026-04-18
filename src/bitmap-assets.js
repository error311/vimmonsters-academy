const TRAINER_ORDER = ["down", "left", "right", "up"];

const TRAINER_SPECS = {
  player: { src: "../assets/sprites/player.png", frameWidth: 96, frameHeight: 112, cols: 3 },
  mentor: { src: "../assets/sprites/mentor.png", frameWidth: 96, frameHeight: 112, cols: 3 },
  coach: { src: "../assets/sprites/coach.png", frameWidth: 96, frameHeight: 112, cols: 3 },
  sage: { src: "../assets/sprites/sage.png", frameWidth: 96, frameHeight: 112, cols: 3 },
  scout: { src: "../assets/sprites/scout.png", frameWidth: 96, frameHeight: 112, cols: 3 },
  scribe: { src: "../assets/sprites/scribe.png", frameWidth: 96, frameHeight: 112, cols: 3 },
};

const MONSTER_SPECS = {
  pebbLit: { src: "../assets/sprites/pebbLit.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  sproutle: { src: "../assets/sprites/sproutle.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  fizzbat: { src: "../assets/sprites/fizzbat.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  tabbit: { src: "../assets/sprites/tabbit.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  glyphowl: { src: "../assets/sprites/glyphowl.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  slashram: { src: "../assets/sprites/slashram.png", frameWidth: 80, frameHeight: 80, cols: 3 },
  macrobat: { src: "../assets/sprites/macrobat.png", frameWidth: 96, frameHeight: 96, cols: 3 },
};

const UI_SPECS = {
  battleHpBox: { src: "../assets/ui/battle-hp-box.png" },
  battleDialogueBox: { src: "../assets/ui/battle-dialogue-box.png" },
  battleCommandBox: { src: "../assets/ui/battle-command-box.png" },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

async function loadGroup(specs) {
  const entries = await Promise.all(
    Object.entries(specs).map(async ([id, spec]) => {
      const image = await loadImage(spec.src);
      return [id, Object.assign({}, spec, { image })];
    })
  );
  return Object.fromEntries(entries);
}

export async function loadBitmapAssets() {
  const [trainers, monsters, ui] = await Promise.all([
    loadGroup(TRAINER_SPECS),
    loadGroup(MONSTER_SPECS),
    loadGroup(UI_SPECS),
  ]);

  return {
    trainerOrder: TRAINER_ORDER.slice(),
    trainers,
    monsters,
    ui,
  };
}
