REM  create a new build for quickFilters
set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1
pwsh -Command "(gc -en UTF8NoBOM manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json"
pwsh -Command "(gc -en UTF8NoBOM install.rdf) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File install.rdf"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip manifest.json install.rdf chrome.manifest chrome defaults license.txt
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi ..\..\_Test\3.13
pwsh -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-m-3.13pre%quickFiltersWebRev%.xpi