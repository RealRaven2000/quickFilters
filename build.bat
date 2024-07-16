set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1
powershell -Command "(gc -en UTF8 manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json -encoding utf8"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip manifest.json _locales scripts chrome popup qFi-background.* license.txt revision.txt release-notes.html release-notes.md`
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi E:\Dev\Mozilla\Dev\quickFilters\_Test\6.5\
powershell -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-wx-6.5pre%quickFiltersWebRev%.xpi