REM  create a new build for quickFilters - hybrid build supports 60 legacy and 68 wx environment
set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1
pwsh -Command "(gc -en UTF8NoBOM manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip manifest.json _locales scripts chrome popup qFi-background.* license.txt release-notes.html`
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi ..\..\..\_Test\5.5.4
pwsh -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-wx-5.5.4pre%quickFiltersWebRev%.xpi