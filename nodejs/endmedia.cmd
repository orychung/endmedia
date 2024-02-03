(node quick/main.js | tee -a ../.log/endmedia.log)  3>&1 1>&2 2>&3 | tee -a ../.log/endmedia.log
exit /b
