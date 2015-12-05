"C:\Program Files\7-Zip\7z" a -xr!.svn quickFilters.zip install.rdf chrome.manifest chrome defaults license.txt
set /P quickFiltersRev=<revision.txt
set /a quickFiltersRev+=1
echo %quickFiltersRev% > revision.txt
move *.xpi ..\..\_Test\3.0\
rename quickFilters.zip quickFilters-tb-pb-sm-3.0.2pre%quickFiltersRev%.xpi