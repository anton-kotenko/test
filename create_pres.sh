#!/usr/local/bin/bash
#generate list of presentations 
#presentation is folder with images. One image --one page from presentation
OUT_BASE=./www/images
for pres in {1..10}; do 
  mkdir -p $OUT_BASE/$pres;
  for file in {1..10}; do
  convert example.png  -size 200x200 -background none  -fill green -gravity Center -pointsize 24 label:"Presentation $pres" -geometry +0+0 -compose over  -composite  -size 400x400 -background none  -fill blue -pointsize 20 -gravity SouthWest caption:"PAGE $file" -geometry +0+0  -compose over -composite $OUT_BASE/$pres/$file.png
  done;
done;
