#!/bin/sh
# One-command rebuild of the Miami film and the silent hero loop.
LIB=/c/Users/keval/lemo-opuscar
cd "$(dirname "$0")" || exit 1
set -e

PY=/c/Users/keval/AppData/Local/Programs/Python/Python310/python.exe
"$PY" score.py

grade_day="eq=saturation=0.86:contrast=1.05:gamma=0.98,colorbalance=rh=0.06:bh=-0.05:rs=0.02:bs=-0.03,curves=all='0/0.028 0.5/0.52 1/0.98',vignette=PI/5,noise=alls=4:allf=t"
grade_night="eq=saturation=0.92:contrast=1.08:brightness=0.015,vignette=PI/6,noise=alls=4:allf=t"

shot() {
  name=$1; src=$2; ss=$3; frames=$4; push=$5; grade=$6; extra=$7
  ffmpeg -y -hide_banner -loglevel error -ss "$ss" -t 12 -i "raw/$src.mp4" \
    -vf "fps=30,${extra}scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='1+${push}*on/$((frames-1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,${grade},format=yuv420p" \
    -frames:v "$frames" -an -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "build/$name.mp4"
}

mkdir -p build
shot coast coast 1.0 144 0.06 "$grade_day" ""
shot street palmroad 0.4 144 0.05 "$grade_day" "tmix=frames=3:weights='1 2 1',"
shot towers brickell 0.8 144 0.06 "$grade_day" ""
shot water water 0.5 288 0.02 "$grade_day" ""
shot night baynight 0.6 216 0.05 "$grade_night" ""

{
  echo "file 'coast.mp4'"
  echo "file 'street.mp4'"
  echo "file 'towers.mp4'"
  echo "file 'water.mp4'"
  echo "file 'night.mp4'"
} > build/picture.txt

ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i build/picture.txt -c copy build/picture.mp4
ffmpeg -y -hide_banner -loglevel error -f lavfi -i color=c=black:s=1920x1080:r=30:d=0.27 \
  -frames:v 8 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p build/black.mp4
printf "file 'picture.mp4'\nfile 'black.mp4'\n" > build/film.txt
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i build/film.txt -c copy build/silent.mp4

ffmpeg -y -hide_banner -loglevel error -i build/silent.mp4 -i score.wav \
  -filter:a loudnorm=I=-14:TP=-1.2:LRA=11 \
  -c:v copy -c:a aac -b:a 192k -shortest miami-vacation.mp4

ffmpeg -y -hide_banner -loglevel error -i build/picture.mp4 -an -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart miami-hero.mp4
ffmpeg -y -hide_banner -loglevel error -ss 1.2 -i build/picture.mp4 -frames:v 1 -q:v 2 poster.jpg
ffmpeg -y -hide_banner -loglevel error -ss 1.2 -i build/picture.mp4 -frames:v 1 -q:v 3 miami-hero.jpg

cp -f miami-hero.mp4 ../apps/web/public/miami-hero.mp4
cp -f miami-hero.jpg ../apps/web/public/miami-hero.jpg
echo "built miami-vacation.mp4 and apps/web/public/miami-hero.mp4"
