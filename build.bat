REM  create a new build for quickFilters
set /P quickFiltersRev=<revision.txt
set /a oldRev=%quickFiltersRev%
set /a quickFiltersRev+=1
pwsh -Command "(gc -en UTF8NoBOM install.rdf) -replace 'pre%oldRev%', 'pre%quickFiltersRev%' | Out-File install.rdf"
"C:\Program Files\7-Zip\7z" a -xr!.svn quickFilters.zip install.rdf chrome.manifest chrome defaults license.txt
echo %quickFiltersRev% > revision.txt
move *.xpi ..\..\_Test\3.11\
pwsh -Command "Start-Sleep -m 50"
rename quickFilters.zip quickFilters-tb-pb-sm-3.11pre%quickFiltersRev%.xpi