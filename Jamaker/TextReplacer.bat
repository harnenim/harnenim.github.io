@echo off
start /D"C:\Program Files\Google\Chrome\Application\" chrome.exe ^
--disable-web-security ^
--allow-file-access-from-files ^
--user-data-dir=C:/ProgramData/ssh/temp ^
--disable-popup-blocking ^
--lang=kr ^
--app=file:///C:/eGovFrameDev-3.8.0-64bit/workspace/krhome/src/main/webapp/sub/tool/se/TextReplacer.html ^
--new-window ^
--app-window-size=800,800