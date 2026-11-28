set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1 
powershell -Command "(gc -en UTF8 manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json -encoding utf8"
"C:\Program Files\7-Zip\7z" a -xr!.git quickFiltersWeb.zip manifest.json _locales scripts vendor chrome popup html qFi-background.* *.txt release-notes.* privacy-policy.md
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi E:\Dev\Mozilla\Dev\quickFilters\_Test\6.15\
powershell -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-6.15.2pre%quickFiltersWebRev%.xpi
