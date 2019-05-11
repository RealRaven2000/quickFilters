REM  create a new build for quickFilters
set /P quickFiltersRev=<revision.txt
set /a oldQuickFiltersRev=%quickFiltersRev%
set /a quickFiltersRev+=1
pwsh -Command "(gc -en UTF8NoBOM manifest.json) -replace 'pre%oldQuickFiltersRev%', 'pre%quickFiltersRev%' | Out-File manifest.json"
pwsh -Command "(gc -en UTF8NoBOM install.rdf) -replace 'pre%oldQuickFiltersRev%', 'pre%quickFiltersRev%' | Out-File install.rdf"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFiltersWeb.zip install.rdf chrome.manifest chrome defaults license.txt
echo %quickFiltersRev% > revision.txt
move quickFilters*.xpi ..\..\_Test\3.12
pwsh -Command "Start-Sleep -m 50"
rename quickFiltersWeb.zip quickFilters-3.12pre%quickFiltersRev%.xpi
rename quickFiltersWeb.zip quickFilters-m-3.12pre%quickFiltersRev%.xpi