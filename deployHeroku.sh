#!/bin/bash

if [ -z $1 ]
then
  echo "Give a heroku app name."
  exit 1
fi

heroku login
grunt heroku
current=$(pwd)
herokuDir="$current-heroku"
rm -rf $herokuDir
mkdir $herokuDir
cd $herokuDir
heroku git:clone -a $1 .
heroku ps:scale web=0
cd $current
cp -r ./heroku/* $herokuDir
cd $herokuDir
commitMess=`date +"%D %T"`
git add .
git commit -m "v $commitMess"
heroku config:set NPM_CONFIG_PRODUCTION=false
git push heroku master
heroku ps:scale web=1