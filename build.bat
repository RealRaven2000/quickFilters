REM  create a new build for quickFilters - hybrid build supports 60 legacy and 68 wx environment
set /P quickFiltersWebRev=<revision.txt
set /a oldQIWebRev=%quickFiltersWebRev%
set /a quickFiltersWebRev+=1
pwsh -Command "(gc -en UTF8NoBOM manifest.json) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File manifest.json"
pwsh -Command "(gc -en UTF8NoBOM install.rdf) -replace 'pre%oldQIWebRev%', 'pre%quickFiltersWebRev%' | Out-File install.rdf"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip manifest.json install.rdf chrome.manifest chrome defaults license.txt
echo %quickFiltersWebRev% > revision.txt
move quickFilters*.xpi ..\..\_Test\4.5
pwsh -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-wx-4.5pre%quickFiltersWebRev%.xpi