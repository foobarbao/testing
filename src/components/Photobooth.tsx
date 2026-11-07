import { useEffect, useRef, useState } from 'react';
import { useSound } from '../lib/sound';

const SIZE = 192;

/** Recadre une image (vidéo ou photo) au centre, en carré de 192 px, en JPEG léger. */
function squareJpeg(source: CanvasImageSource, w: number, h: number, mirror: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const side = Math.min(w, h);
  if (mirror) {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.75);
}

interface Props {
  onPhoto: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Photomaton : la caméra s'affiche en direct, l'enfant appuie, 3-2-1, flash !
 * Si la caméra en direct n'est pas disponible, le bouton ouvre l'appareil photo du téléphone.
 */
export default function Photobooth({ onPhoto, onCancel }: Props) {
  const play = useSound();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'starting' | 'live' | 'file'>('starting');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  const start = async () => {
    setPreview(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('pas de caméra');
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setMode('live');
    } catch {
      setMode('file');
    }
  };

  useEffect(() => {
    void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoot = () => {
    if (count) return;
    let n = 3;
    setCount(n);
    play('pop');
    const id = window.setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        play('pop');
        return;
      }
      window.clearInterval(id);
      setCount(0);
      const v = video.current;
      if (!v || !v.videoWidth) return setMode('file');
      setFlash(true);
      play('click');
      window.setTimeout(() => setFlash(false), 350);
      setPreview(squareJpeg(v, v.videoWidth, v.videoHeight, true));
    }, 800);
  };

  const fromFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPreview(squareJpeg(img, img.naturalWidth, img.naturalHeight, false));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const keep = () => {
    if (!preview) return;
    stop();
    onPhoto(preview);
  };

  return (
    <div className="booth" role="dialog" aria-label="Prendre une photo">
      <div className="booth-frame">
        <video ref={video} className={`booth-video ${mode === 'live' && !preview ? 'on' : ''}`} playsInline muted />
        {preview && <img src={preview} className="booth-preview" alt="Ta photo" />}
        {mode === 'starting' && !preview && <span className="booth-wait">…</span>}
        {mode === 'file' && !preview && (
          <svg className="booth-cam" viewBox="0 0 48 40" aria-hidden="true">
            <rect x="3" y="9" width="42" height="28" rx="6" />
            <path d="M16 9l3-5h10l3 5" />
            <circle cx="24" cy="23" r="8" />
          </svg>
        )}
        {count > 0 && (
          <span key={count} className="booth-count">
            {count}
          </span>
        )}
        {flash && <span className="booth-flash" />}
      </div>

      {preview ? (
        <div className="row-2">
          <button
            className="btn"
            onClick={() => {
              setPreview(null);
              if (mode === 'live' && !stream.current) void start();
            }}
          >
            Encore
          </button>
          <button className="btn primary" onClick={keep}>
            Super !
          </button>
        </div>
      ) : mode === 'live' ? (
        <button className="btn primary big-shot" onClick={shoot} disabled={count > 0}>
          Photo !
        </button>
      ) : (
        <label className="btn primary big-shot file-shot">
          Prendre la photo
          <input type="file" accept="image/*" capture="user" onChange={(e) => fromFile(e.target.files?.[0])} />
        </label>
      )}
      <button
        className="btn slim"
        onClick={() => {
          stop();
          onCancel();
        }}
      >
        Plus tard
      </button>
    </div>
  );
}
