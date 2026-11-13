"""Découpe et raccorde les ambiances originales pour l’usage privé de la soirée.

Sources et crédits : src/web/theme/sons/ambiances.json. Aucune acquisition automatique.
Usage : python3 scripts/preparer-ambiances.py /dossier/des/originaux --ffmpeg ffmpeg
"""
import argparse
from array import array
import hashlib
import json
from math import cos, pi, sin
from pathlib import Path
import re
import subprocess
import tempfile

arguments = argparse.ArgumentParser(description="Préparer les boucles musicales hors ligne")
arguments.add_argument("sources", type=Path)
arguments.add_argument("--ffmpeg", default="ffmpeg")
arguments.add_argument("--skins", nargs="+", help="Ne préparer que ces univers")
options = arguments.parse_args()
sortie = Path(__file__).resolve().parents[1] / "src/web/theme/sons"
ambiances = json.loads((sortie / "ambiances.json").read_text())
rapport = []


def executer(*commande, octets=None):
    resultat = subprocess.run([options.ffmpeg, "-hide_banner", "-y", *commande], input=octets, capture_output=True)
    if resultat.returncode:
        raise RuntimeError(resultat.stderr.decode(errors="replace")[-3000:])
    return resultat


for ambiance in ambiances:
    if options.skins and ambiance["skin"] not in options.skins:
        continue
    original = options.sources / ambiance["original"]
    pcm = array("f")
    pcm.frombytes(executer("-i", str(original), "-af", f"atrim=start={ambiance['debut']}:duration={ambiance['duree']},asetpts=PTS-STARTPTS", "-f", "f32le", "-ar", "48000", "-ac", "2", "-").stdout)
    frames = len(pcm) // 2
    attendu = round(ambiance["duree"] * 48000)
    if abs(frames - attendu) > 1:
        raise ValueError(f"{original.name} : extrait incomplet ({frames / 48000:.2f} s)")
    raccord = round(ambiance["raccord"] * 48000)
    melange = array("f")
    for i in range(raccord):
        angle = i / (raccord - 1) * pi / 2
        for canal in range(2):
            melange.append(pcm[(frames - raccord + i) * 2 + canal] * cos(angle) + pcm[i * 2 + canal] * sin(angle))
    boucle = pcm[raccord * 2:(frames - raccord) * 2]
    boucle.extend(melange)
    with tempfile.TemporaryDirectory(prefix="nouvel-an-ambiance-") as temporaire:
        wav = Path(temporaire) / "boucle.wav"
        executer("-f", "f32le", "-ar", "48000", "-ac", "2", "-i", "pipe:0", str(wav), octets=boucle.tobytes())
        norme = "loudnorm=I=-24:TP=-2:LRA=9"
        log = executer("-i", str(wav), "-af", norme + ":print_format=json", "-f", "null", "-").stderr.decode()
        mesure = json.loads(re.findall(r"\{[^{}]+\}", log, re.S)[-1])
        parametres = ":".join(f"{cle}={mesure[valeur]}" for cle, valeur in [("measured_I", "input_i"), ("measured_TP", "input_tp"), ("measured_LRA", "input_lra"), ("measured_thresh", "input_thresh"), ("offset", "target_offset")])
        fichier = sortie / ambiance["fichier"]
        executer("-i", str(wav), "-af", norme + ":" + parametres + ":linear=true", "-ar", "48000", "-ac", "2", "-c:a", "libvorbis", "-b:a", "96k", str(fichier))
    rapport.append({**ambiance, "cible_lufs": -24, "duree_boucle": len(boucle) / 2 / 48000, "mesure_source": mesure, "octets": fichier.stat().st_size, "sha256_original": hashlib.sha256(original.read_bytes()).hexdigest(), "sha256": hashlib.sha256(fichier.read_bytes()).hexdigest()})
    print(ambiance["skin"], fichier.name, fichier.stat().st_size, flush=True)

(options.sources / "traitement-ambiances.json").write_text(json.dumps(rapport, ensure_ascii=False, indent=2) + "\n")
