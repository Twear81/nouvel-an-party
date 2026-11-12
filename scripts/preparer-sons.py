# Prépare les sons hors ligne ; origines et licences dans src/web/theme/sons/provenance.json.
# Nommer les téléchargements Freesound <id>.mp3, le piano piano.ogg et la musique lobby.mp3.
# Conserver le nom des fichiers Oculus ; final.wav et lobby-boucle.wav sont créés ici.
from pathlib import Path
import subprocess,json,re
import argparse
parser=argparse.ArgumentParser(description="Normaliser les sources libres du catalogue TV")
parser.add_argument("sources",type=Path,help="Dossier des originaux nommés comme dans provenance.json")
parser.add_argument("--ffmpeg",default="ffmpeg")
parser.add_argument("--ffprobe",default="ffprobe")
args=parser.parse_args()
src=args.sources;out=Path(__file__).resolve().parent.parent/'src/web/theme/sons';ff=args.ffmpeg
rapport=[]
def executer(args):
 r=subprocess.run([ff,'-hide_banner','-y',*args],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr[-2500:])
 return r.stderr
def son(dest,source,filtre='',lufs=-16,duree=None,boucle=False):
 p=src/source
 # On élimine seulement le silence initial ; pas de découpe des silences internes.
 filt=('' if boucle else 'silenceremove=start_periods=1:start_duration=0.002:start_threshold=-48dB,')+filtre
 if filtre:filt+=','
 filt+=('anull' if boucle else 'afade=t=in:d=0.004')
 if duree:filt+=f',atrim=duration={duree},afade=t=out:st={max(0,duree-.06)}:d=0.06'
 wav=src/(dest+'.wav');executer(['-i',str(p),'-af',filt,'-ar','48000','-ac','2',str(wav)])
 norme=f'loudnorm=I={lufs}:TP=-2:LRA=9'
 log=executer(['-i',str(wav),'-af','apad=pad_dur=0.5,'+norme+':print_format=json','-f','null','-'])
 stats=json.loads(re.findall(r'\{[^{}]+\}',log,re.S)[-1]);params=':'.join(f'{k}={stats[v]}' for k,v in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
 executer(['-i',str(wav),'-af','apad=pad_dur=0.5,'+norme+':'+params+':linear=true'+f',atrim=duration={float(subprocess.check_output([args.ffprobe,"-v","quiet","-show_entries","format=duration","-of","csv=p=0",str(wav)]))}','-ar','48000','-ac','2','-c:a','libvorbis','-b:a','128k',str(out/dest)])
 rapport.append(dict(fichier=dest,source=source,filtre=filtre,cible_lufs=lufs,mesure_source=stats,octets=(out/dest).stat().st_size))
 print(dest,flush=True)
son('rejoint.ogg','UIClick_MagicalOpen_OS_01.ogg',lufs=-20,duree=1.1)
son('quitte.ogg','UIClick_CasualPopsBack_OS_01.ogg',lufs=-24,duree=.32)
son('lancement.ogg','MUSCStngr_VictoryOrchestral_OS_02.ogg',duree=3.85)
son('intro.ogg','397354.mp3',lufs=-16,duree=1.72)
son('pop.ogg','245646.mp3','lowpass=f=6500',lufs=-26,duree=.23)
son('complet.ogg','UIClick_MagicalConfirm_OS_01.ogg',lufs=-21,duree=1.15)
son('tic.ogg','171041.mp3','atrim=start=1:duration=0.26,asetpts=PTS-STARTPTS',lufs=-25,duree=.24)
son('gong.ogg','54047.mp3',lufs=-18,duree=1.15)
son('temps-ajoute.ogg','UIMisc_BelltreeUp_OS_01.ogg','atempo=1.4',lufs=-24,duree=1.4)
son('pause.ogg','UIClick_CasualPopsClose_OS_01.ogg',lufs=-25,duree=.7)
son('reprise.ogg','UIClick_MagicalOpen_OS_01.ogg',lufs=-25,duree=1.1)
son('resultats.ogg','MUSCStngr_VictoryMallet_OS_01.ogg',lufs=-20,duree=2.8)
son('points.ogg','OBJCoin_CoinsUI_LOOP_01.ogg',lufs=-23,duree=1.6)
# Fanfare puis public : cuivres et chaleur d’une salle, sans couvrir toute la révélation.
executer(['-i',str(src/'MUSCStngr_VictoryOrchestral_OS_03.ogg'),'-i',str(src/'196094.mp3'),'-filter_complex','[0:a]volume=1[a];[1:a]atrim=2:9,asetpts=PTS-STARTPTS,volume=0.32,afade=t=in:d=0.15,afade=t=out:st=4:d=3,adelay=800|800[b];[a][b]amix=inputs=2:normalize=0','-ar','48000','-ac','2',str(src/'final.wav')])
son('fanfare.ogg','final.wav',lufs=-15,duree=7.8)
son('whoosh-entree.ogg','SWSH_Swoosh_OS_02.ogg',lufs=-23,duree=.67)
son('whoosh-sortie.ogg','SWSH_Swoosh_OS_04.ogg',lufs=-23,duree=.69)
son('clic.ogg','UIClick_CasualPopsConfirm_OS_01.ogg',lufs=-28,duree=.26)
son('bravo.ogg','piano.ogg','asetrate=96000,aresample=48000,aecho=0.8:0.6:90:0.25',lufs=-19,duree=1.1)
son('rate.ogg','54047.mp3',lufs=-22,duree=.55)
# Deux secondes : contrat des révélations existantes (leurs vitesses se calent sur cette durée).
son('roulement.ogg','201211.mp3','atrim=start=5:duration=2,asetpts=PTS-STARTPTS',lufs=-21,duree=2)
son('pfc-choc.ogg','177242.mp3',lufs=-20,duree=.65)
son('pfc-egalite.ogg','UIAlert_MagicalError_OS_01.ogg',lufs=-23,duree=1.2)
son('simon-note.ogg','piano.ogg',lufs=-22,duree=.65)
son('simon-rate.ogg','UIAlert_MagicalError_OS_01.ogg',lufs=-24,duree=.7)
son('carte.ogg','PAPRImpt_PaperBallDrop_OS_01.ogg',lufs=-26,duree=.32)
son('jeton.ogg','CERMImpt_CeramicSmallImpact_OS_01.ogg',lufs=-25,duree=.28)
son('boum.ogg','177242.mp3',lufs=-16,duree=2.4)
son('applaudissements.ogg','196094.mp3','atrim=start=2:duration=3.2,asetpts=PTS-STARTPTS',lufs=-21,duree=3.1)
son('trombone.ogg','175409.mp3',lufs=-21,duree=4.7)
son('tension.ogg','177242.mp3','atrim=duration=2,areverse,afade=t=in:d=0.6',lufs=-23,duree=2)
# Extrait de 64 s : raccord par fondu croisé d’une seconde, puis rotation du segment.
# Raccord à l’échantillon près : ffmpeg décode, puis réencode les segments raccordés.
from array import array
from math import sin, cos, pi
pcm=array('f');pcm.frombytes(subprocess.check_output([ff,'-v','error','-i',str(src/'lobby.mp3'),'-f','f32le','-ar','48000','-ac','2','-']))
bloc=pcm[8*48000*2:72*48000*2]
assert len(bloc)==64*48000*2
raccord=array('f')
for i in range(48000):
 angle=i/47999*pi/2
 for c in range(2): raccord.append(bloc[63*48000*2+i*2+c]*cos(angle)+bloc[i*2+c]*sin(angle))
boucle=bloc[48000*2:63*48000*2];boucle.extend(raccord)
subprocess.run([ff,'-v','error','-y','-f','f32le','-ar','48000','-ac','2','-i','pipe:0',str(src/'lobby-boucle.wav')],input=boucle.tobytes(),check=True)

# Pas de suppression de silence ni de fondu aux extrémités d’une boucle déjà raccordée.
son('lobby.ogg','lobby-boucle.wav',lufs=-24,boucle=True)
(src/'traitement.json').write_text(json.dumps(rapport,indent=2)+'\n')
