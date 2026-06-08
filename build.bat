set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1 
powershell -Command "(gc -en UTF8 manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json -encoding utf8"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip manifest.json _locales scripts chrome popup html qFi-background.* *.txt release-notes.*
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi E:\Dev\Mozilla\Dev\quickFilters\_Test\6.12\
powershell -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-6.12.3pre%quickFiltersWebRev%.xpi