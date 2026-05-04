'use client';

import { useEffect, useRef, useState } from 'react';

type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export function CrazyVikaGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (status !== 'playing' || !containerRef.current || gameRef.current) return;

    const WIDTH = 960;
    const HEIGHT = 540;
    let cancelled = false;

    (async () => {
      const Phaser = await import('phaser');
      if (cancelled || !containerRef.current) return;

      class MainScene extends Phaser.Scene {
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private vika!: Phaser.Physics.Arcade.Sprite;

        constructor() {
          super('main');
        }

        preload() {
          const gfx = this.add.graphics();

          gfx.fillStyle(0xff4fa0, 1);
          gfx.fillRoundedRect(0, 0, 44, 56, 12);
          gfx.generateTexture('vika', 44, 56);
          gfx.clear();

          gfx.fillStyle(0x5eead4, 1);
          gfx.fillRect(0, 0, 300, 22);
          gfx.generateTexture('platform', 300, 22);
          gfx.clear();

          gfx.fillStyle(0x22d3ee, 1);
          gfx.fillTriangle(0, 34, 16, 0, 32, 34);
          gfx.generateTexture('spike', 32, 34);
          gfx.clear();

          gfx.fillStyle(0xfde047, 1);
          gfx.fillRect(0, 0, 70, 110);
          gfx.generateTexture('castle', 70, 110);
          gfx.destroy();
        }

        create() {
          this.cameras.main.setBackgroundColor('#0b0820');

          this.add
            .text(20, 16, 'Crazy Vika - Save Georgiy', {
              color: '#e9d5ff',
              fontSize: '24px',
              fontStyle: 'bold',
            })
            .setScrollFactor(0);
          this.add
            .text(20, 48, '← → move | ↑ jump | Reach the castle', {
              color: '#93c5fd',
              fontSize: '15px',
            })
            .setScrollFactor(0);

          const platforms = this.physics.add.staticGroup();
          platforms.create(480, 535, 'platform').refreshBody();
          platforms.create(220, 420, 'platform');
          platforms.create(560, 350, 'platform');
          platforms.create(800, 280, 'platform');
          platforms.create(650, 470, 'platform');
          platforms.create(360, 270, 'platform');

          this.vika = this.physics.add.sprite(80, 480, 'vika');
          this.vika.setCollideWorldBounds(true);
          this.vika.setBounce(0.1);
          this.vika.setDragX(800);
          this.vika.setMaxVelocity(260, 500);

          this.physics.add.collider(this.vika, platforms);

          const spikes = this.physics.add.staticGroup();
          spikes.create(300, 518, 'spike');
          spikes.create(468, 518, 'spike');
          spikes.create(745, 253, 'spike');

          this.physics.add.overlap(this.vika, spikes, () => {
            setStatus('lost');
          });

          const castle = this.physics.add.staticSprite(905, 200, 'castle');
          this.add.rectangle(905, 118, 64, 38, 0x111827, 0.95);
          this.add
            .text(905, 118, 'Georgiy', {
              color: '#fde047',
              fontSize: '15px',
              fontStyle: 'bold',
            })
            .setOrigin(0.5);

          this.physics.add.overlap(this.vika, castle, () => {
            setStatus('won');
          });

          this.cursors = this.input.keyboard!.createCursorKeys();
        }

        update() {
          if (status !== 'playing') return;
          const speed = 220;
          const body = this.vika.body as Phaser.Physics.Arcade.Body | null;
          if (!body) return;

          if (this.cursors.left?.isDown) {
            this.vika.setVelocityX(-speed);
          } else if (this.cursors.right?.isDown) {
            this.vika.setVelocityX(speed);
          } else {
            this.vika.setVelocityX(0);
          }

          if (this.cursors.up?.isDown && body.blocked.down) {
            this.vika.setVelocityY(-430);
          }

          if (this.vika.y > HEIGHT + 20) {
            setStatus('lost');
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent: containerRef.current,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 1000, x: 0 },
            debug: false,
          },
        },
        scene: [MainScene],
      });

      gameRef.current = game;
    })();
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [status]);

  useEffect(() => {
    if (status === 'lost' || status === 'won') {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    }
  }, [status]);

  const startGame = () => {
    setAttempts((prev) => prev + 1);
    setStatus('playing');
  };

  return (
    <section className="w-full max-w-6xl rounded-3xl border border-white/15 bg-black/40 p-4 shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      {status !== 'playing' ? (
        <div className="flex min-h-[540px] flex-col items-center justify-center gap-6 rounded-2xl bg-gradient-to-b from-purple-950/90 via-indigo-950/90 to-black text-center">
          <h1 className="text-4xl font-black text-fuchsia-200 md:text-6xl">Crazy Vika - Save Georgiy</h1>
          <p className="max-w-2xl text-base text-cyan-100/90 md:text-lg">
            Vika is racing through traps and platforms to reach Georgiy&apos;s castle.
            Help her survive the madness and complete the chase.
          </p>
          {status === 'won' && <p className="text-2xl font-bold text-emerald-300">You reached Georgiy! Victory!</p>}
          {status === 'lost' && <p className="text-2xl font-bold text-rose-300">Oops! Vika failed this attempt.</p>}
          <button
            onClick={startGame}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-10 py-4 text-2xl font-black text-white shadow-[0_0_35px_rgba(217,70,239,0.45)] transition hover:scale-[1.03]"
          >
            {status === 'idle' ? 'Play now' : 'Try again'}
          </button>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/75">Attempts: {attempts}</p>
        </div>
      ) : (
        <div ref={containerRef} className="overflow-hidden rounded-2xl border border-cyan-300/40" />
      )}
    </section>
  );
}
