export class AudioManager {
    static instance: AudioManager;

    // Constants - Replace these paths when you add real files!
    static readonly BGM_PATH = 'assets/audio/replace_me_bgm.txt';
    static readonly HIT_PATH = 'assets/audio/replace_me_hit.txt';

    bgmAudio: HTMLAudioElement | null = null;
    hitAudio: HTMLAudioElement | null = null;

    isMuted: boolean = false;
    volume: number = 0.5;

    constructor() {
        if (typeof window !== 'undefined') {
            this.bgmAudio = new Audio(AudioManager.BGM_PATH);
            this.bgmAudio.loop = true;

            this.hitAudio = new Audio(AudioManager.HIT_PATH);

            this.updateVolume();

            // Keyboard listeners for volume
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'm') {
                    this.toggleMute();
                } else if (e.key === '-' || e.key === '_') {
                    this.adjustVolume(-0.1);
                } else if (e.key === '=' || e.key === '+') {
                    this.adjustVolume(0.1);
                }
            });

            // Start BGM (might require user interaction first)
            this.tryPlayBgm();
            document.addEventListener('click', () => this.tryPlayBgm(), { once: true });
            document.addEventListener('keydown', () => this.tryPlayBgm(), { once: true });
        }
    }

    static getInstance() {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    tryPlayBgm() {
        if (this.bgmAudio && this.bgmAudio.paused) {
            this.bgmAudio.play().catch(e => {
                console.log("Audio play failed (waiting for interaction):", e);
            });
        }
    }

    playHit() {
        if (this.isMuted || !this.hitAudio) return;

        // Clone for overlapping sounds
        const sound = this.hitAudio.cloneNode() as HTMLAudioElement;
        sound.volume = this.volume;
        sound.play().catch(e => console.error("SFX error:", e));
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateVolume();
        console.log("Muted:", this.isMuted);
    }

    adjustVolume(delta: number) {
        this.volume = Math.max(0, Math.min(1, this.volume + delta));
        this.updateVolume();
        console.log("Volume:", this.volume);
    }

    updateVolume() {
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.isMuted ? 0 : this.volume;
        }
        // Hit sounds update on play, but we can update the template
        if (this.hitAudio) {
            this.hitAudio.volume = this.isMuted ? 0 : this.volume;
        }
    }
}
