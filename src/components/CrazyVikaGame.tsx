'use client';

import { useEffect, useRef, useState } from 'react';

type GameStatus = 'menu' | 'playing' | 'lost' | 'level_won' | 'game_won';
type Platform = { x: number; y: number; w: number };
type Level = {
  id: number;
  name: string;
  start: { x: number; y: number };
  castle: { x: number; y: number };
  platforms: Platform[];
  spikes: Array<{ x: number; y: number }>;
};

const LEVELS: Level[] = [
  { id: 1, name: 'Castle Yard', start: { x: 38, y: 484 }, castle: { x: 318, y: 84 }, platforms: [{ x: 180, y: 548, w: 360 }, { x: 82, y: 474, w: 110 }, { x: 190, y: 406, w: 112 }, { x: 300, y: 336, w: 102 }, { x: 256, y: 250, w: 108 }, { x: 315, y: 170, w: 88 }], spikes: [{ x: 228, y: 528 }, { x: 330, y: 528 }] },
  { id: 2, name: 'Moon Bridge', start: { x: 38, y: 484 }, castle: { x: 318, y: 84 }, platforms: [{ x: 180, y: 548, w: 360 }, { x: 290, y: 472, w: 105 }, { x: 112, y: 405, w: 106 }, { x: 278, y: 335, w: 104 }, { x: 98, y: 266, w: 96 }, { x: 238, y: 196, w: 96 }, { x: 318, y: 138, w: 82 }], spikes: [{ x: 155, y: 528 }, { x: 195, y: 528 }, { x: 238, y: 528 }] },
  { id: 3, name: 'Crazy Tower', start: { x: 38, y: 484 }, castle: { x: 316, y: 84 }, platforms: [{ x: 180, y: 548, w: 360 }, { x: 82, y: 478, w: 96 }, { x: 172, y: 418, w: 102 }, { x: 264, y: 358, w: 92 }, { x: 182, y: 296, w: 92 }, { x: 104, y: 236, w: 90 }, { x: 202, y: 182, w: 88 }, { x: 304, y: 136, w: 82 }], spikes: [{ x: 198, y: 528 }, { x: 234, y: 528 }] },
];

export function CrazyVikaGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const controlsRef = useRef({ left: false, right: false, jump: false });
  const [status, setStatus] = useState<GameStatus>('menu');
  const [levelIndex, setLevelIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (status !== 'playing' || !containerRef.current || gameRef.current) return;
    const W = 360;
    const H = 560;
    const level = LEVELS[levelIndex];
    let cancelled = false;

    (async () => {
      const Phaser = await import('phaser');
      if (cancelled || !containerRef.current) return;

      class SceneMain extends Phaser.Scene {
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private vika!: Phaser.Physics.Arcade.Sprite;
        constructor() { super('main'); }
        preload() {
          const g = this.add.graphics();
          // Vika: white-haired girl sprite
          g.fillStyle(0xffffff).fillCircle(22, 12, 10);
          g.fillStyle(0xf5d0fe).fillCircle(22, 18, 8);
          g.fillStyle(0xff4fa0).fillRoundedRect(10, 24, 24, 28, 8);
          g.fillStyle(0xfff1f2).fillRect(10, 48, 8, 8).fillRect(26, 48, 8, 8);
          g.generateTexture('vika', 44, 56);
          g.clear();
          g.fillStyle(0x5eead4).fillRect(0, 0, 120, 16).generateTexture('platform', 120, 16).clear();
          g.fillStyle(0x22d3ee).fillTriangle(0, 34, 16, 0, 32, 34).generateTexture('spike', 32, 34).clear();
          g.fillStyle(0xfde047).fillRect(0, 0, 66, 100).generateTexture('castle', 66, 100).destroy();
          const p = this.add.graphics();
          // Georgiy: boy sprite
          p.fillStyle(0x111827).fillCircle(18, 9, 8);
          p.fillStyle(0xfde68a).fillCircle(18, 15, 7);
          p.fillStyle(0x38bdf8).fillRoundedRect(8, 22, 20, 20, 6);
          p.fillStyle(0xe2e8f0).fillRect(9, 40, 6, 8).fillRect(21, 40, 6, 8);
          p.generateTexture('georgiy', 36, 50);
          p.destroy();
        }
        create() {
          this.cameras.main.setBackgroundColor('#0b0820');
          for (let i = 0; i < 7; i++) {
            const dot = this.add.circle(22 + i * 48, 74 + (i % 2) * 12, 2, 0x67e8f9, 0.45);
            this.tweens.add({ targets: dot, alpha: 0.2, yoyo: true, repeat: -1, duration: 800 + i * 80 });
          }
          this.add.text(18, 14, `Level ${level.id} - Reach Georgiy`, { color: '#e9d5ff', fontSize: '18px', fontStyle: 'bold' });
          this.add.text(18, 36, 'Touch: Left / Jump / Right', { color: '#93c5fd', fontSize: '13px' });

          const platforms = this.physics.add.staticGroup();
          level.platforms.forEach((p) => {
            const body = platforms.create(p.x, p.y, 'platform');
            body.displayWidth = p.w;
            body.displayHeight = 16;
            body.refreshBody();
          });

          this.vika = this.physics.add.sprite(level.start.x, level.start.y, 'vika');
          this.vika.setCollideWorldBounds(true);
          this.vika.setDragX(850);
          this.vika.setMaxVelocity(250, 560);
          this.physics.add.collider(this.vika, platforms);
          this.tweens.add({ targets: this.vika, scaleY: 0.94, scaleX: 1.05, yoyo: true, repeat: -1, duration: 280 });

          const spikes = this.physics.add.staticGroup();
          level.spikes.forEach((s) => spikes.create(s.x, s.y, 'spike'));
          this.physics.add.overlap(this.vika, spikes, () => setStatus('lost'));

          const castle = this.physics.add.staticSprite(level.castle.x, level.castle.y, 'castle');
          const glow = this.add.circle(level.castle.x, level.castle.y + 6, 42, 0xfde047, 0.17);
          this.tweens.add({ targets: [castle, glow], y: '-=6', yoyo: true, repeat: -1, duration: 900 });
          this.add.image(level.castle.x, level.castle.y - 52, 'georgiy');
          this.add.text(level.castle.x, level.castle.y - 24, 'Georgiy', { color: '#fde047', fontSize: '11px', fontStyle: 'bold' }).setOrigin(0.5);
          this.physics.add.overlap(this.vika, castle, () => {
            setStatus(levelIndex < LEVELS.length - 1 ? 'level_won' : 'game_won');
          });

          this.cursors = this.input.keyboard!.createCursorKeys();
        }
        update() {
          const body = this.vika.body as Phaser.Physics.Arcade.Body | null;
          if (!body) return;
          const left = this.cursors.left?.isDown || controlsRef.current.left;
          const right = this.cursors.right?.isDown || controlsRef.current.right;
          const jump = this.cursors.up?.isDown || controlsRef.current.jump;
          if (left) this.vika.setVelocityX(-220);
          else if (right) this.vika.setVelocityX(220);
          else this.vika.setVelocityX(0);
          if (jump && body.blocked.down) {
            this.vika.setVelocityY(-520);
            controlsRef.current.jump = false;
          }
          if (this.vika.y > H + 24) setStatus('lost');
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: W,
        height: H,
        parent: containerRef.current,
        physics: { default: 'arcade', arcade: { gravity: { y: 920, x: 0 }, debug: false } },
        scene: [SceneMain],
      });
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [status, levelIndex]);

  useEffect(() => {
    if (status === 'lost' || status === 'level_won' || status === 'game_won') {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      controlsRef.current = { left: false, right: false, jump: false };
    }
  }, [status]);

  const startCurrentLevel = () => {
    setAttempts((v) => v + 1);
    setStatus('playing');
  };

  const nextLevel = () => {
    setLevelIndex((v) => Math.min(v + 1, LEVELS.length - 1));
    setStatus('menu');
  };

  return (
    <section className="w-full max-w-6xl rounded-3xl border border-white/15 bg-black/40 p-4 shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      {status !== 'playing' ? (
        <div className="flex min-h-[540px] flex-col items-center justify-center gap-5 rounded-2xl bg-gradient-to-b from-purple-950/90 via-indigo-950/90 to-black text-center">
          <h1 className="text-4xl font-black text-fuchsia-200 md:text-6xl">Crazy Vika - Save Georgiy</h1>
          <p className="max-w-2xl text-base text-cyan-100/90 md:text-lg">3 levels, touch controls, and finally a beatable route to the castle.</p>
          <p className="text-xl font-bold text-cyan-200">Current Level: {LEVELS[levelIndex].id} - {LEVELS[levelIndex].name}</p>
          {status === 'lost' && <p className="text-2xl font-bold text-rose-300">Vika failed this attempt.</p>}
          {status === 'level_won' && <p className="text-2xl font-bold text-emerald-300">Level cleared! Georgiy is still above.</p>}
          {status === 'game_won' && <p className="text-2xl font-bold text-emerald-300">All levels cleared! Georgiy is saved!</p>}
          <div className="flex gap-3">
            {status === 'level_won' ? (
              <button onClick={nextLevel} className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-xl font-black text-white">Next level</button>
            ) : (
              <button onClick={startCurrentLevel} className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-8 py-3 text-xl font-black text-white">
                {status === 'menu' ? 'Start level' : 'Try again'}
              </button>
            )}
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/75">Attempts: {attempts}</p>
        </div>
      ) : (
        <div className="relative">
          <div ref={containerRef} className="overflow-hidden rounded-2xl border border-cyan-300/40" style={{ touchAction: 'none' }} />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
            <button onPointerDown={() => (controlsRef.current.left = true)} onPointerUp={() => (controlsRef.current.left = false)} onPointerLeave={() => (controlsRef.current.left = false)} className="rounded-lg border border-cyan-300/40 bg-cyan-400/20 px-4 py-2 text-sm font-bold text-cyan-100">Left</button>
            <button onPointerDown={() => (controlsRef.current.jump = true)} className="rounded-lg border border-fuchsia-300/40 bg-fuchsia-400/20 px-4 py-2 text-sm font-bold text-fuchsia-100">Jump</button>
            <button onPointerDown={() => (controlsRef.current.right = true)} onPointerUp={() => (controlsRef.current.right = false)} onPointerLeave={() => (controlsRef.current.right = false)} className="rounded-lg border border-cyan-300/40 bg-cyan-400/20 px-4 py-2 text-sm font-bold text-cyan-100">Right</button>
          </div>
        </div>
      )}
    </section>
  );
}
