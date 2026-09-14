# Diagnóstico CI (run 34836149245)
```
== checkout ==
== estado do checkout (runner) ==
/home/runner/work/PR2/PR2
ls: cannot access 'desktop': No such file or directory
ls: cannot access 'desktop/app': No such file or directory
ls: cannot access 'desktop/build': No such file or directory
== git status ==
?? checkout.log
== arquivos do desktop no index do git ==
game-extracted/desktop/.gitignore
game-extracted/desktop/app/main.js
game-extracted/desktop/app/package.json
game-extracted/desktop/build/icon.ico
game-extracted/desktop/build/icon.png
game-extracted/desktop/package-lock.json
game-extracted/desktop/package.json
== npm ==
== antes do npm ==
total 16
drwxr-xr-x 3 runner runner 4096 Sep 14 11:04 .
drwxr-xr-x 6 runner runner 4096 Sep 14 11:04 ..
drwxr-xr-x 3 runner runner 4096 Sep 14 11:04 app
-rw-r--r-- 1 runner runner   19 Sep 14 11:04 npmci.log
== npm install ==

up to date in 183ms
== depois do npm ==
== portable (electron-packager) ==
/home/runner/work/_temp/6c5297cb-a8b5-4202-8c06-d62f08076048.sh: line 1: ./node_modules/.bin/electron-packager: No such file or directory
== instalador (electron-builder) ==
(sem eb.log)
```
total 8
drwxr-xr-x 2 runner runner 4096 Sep 14 11:04 .
drwxr-xr-x 4 runner runner 4096 Sep 14 11:04 ..
