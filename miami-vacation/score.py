"""Original score for the Miami film. Soft organ pad, one chord per bar, 100 BPM.
No sampled library: the tones are generated here. Dry signal ends on the black breath.
"""
import math
import struct
import wave
from pathlib import Path

SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
# 13 bars of picture (31.2 s). Black breath is 8 frames at 30 fps.
BARS = 13
PICTURE = BARS * BAR
BLACK = 8 / 30
TOTAL = PICTURE + BLACK

CYCLE = [
    [57, 60, 64, 67],
    [53, 57, 60, 64, 69],
    [48, 52, 55, 59, 64],
    [55, 60, 62, 67],
]
CHORDS = [CYCLE[i % 4] for i in range(BARS)]


def midi_hz(n):
    return 440.0 * (2 ** ((n - 69) / 12))


def env(t, dur, attack=0.35, release=0.45):
    if t < 0 or t > dur:
        return 0.0
    a = min(1.0, t / attack)
    r = min(1.0, (dur - t) / release)
    return a * r


def main():
    n = int(TOTAL * SR)
    samples = [0.0] * n
    # Organ pad: fundamental plus two harmonics, slight detune, one chord per bar.
    for i, notes in enumerate(CHORDS):
        start = int(i * BAR * SR)
        dur = BAR
        length = int(dur * SR)
        for note in notes:
            hz = midi_hz(note - 12)
            for k in range(length):
                idx = start + k
                if idx >= n:
                    break
                t = k / SR
                e = env(t, dur)
                # Cross the black breath by dying in the last 15 ms of the picture.
                if idx / SR > PICTURE - 0.015:
                    e *= max(0.0, (PICTURE - idx / SR) / 0.015)
                ph = 2 * math.pi * hz * t
                tone = (
                    math.sin(ph)
                    + 0.35 * math.sin(ph * 2.003)
                    + 0.12 * math.sin(ph * 3.01)
                )
                samples[idx] += tone * e * 0.045
        # A quiet quarter-note figure on the top note, bars 0-7 only.
        if i < 6 or i >= 10:
            top = midi_hz(notes[-1] + 12)
            for beat in range(4):
                b0 = int((i * BAR + beat * BEAT) * SR)
                bl = int(BEAT * 0.55 * SR)
                for k in range(bl):
                    idx = b0 + k
                    if idx >= n:
                        break
                    t = k / SR
                    e = env(t, BEAT * 0.55, 0.04, 0.12)
                    samples[idx] += math.sin(2 * math.pi * top * t) * e * 0.03

    peak = max(abs(s) for s in samples) or 1
    gain = 0.7 / peak
    path = Path(__file__).with_name("score.wav")
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(s * gain * 32767)))) for s in samples)
        w.writeframes(frames)
    print(path, f"{TOTAL:.2f}s")


if __name__ == "__main__":
    main()
