#!/bin/bash

for title in `cat $2`
do
	echo $title
	node gen.visual_diff.js --config $1 --title $title
done
