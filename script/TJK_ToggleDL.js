// Copyright 2006 | Thierry Koblentz - www.TJKDesign.com All Rights reserved
// TJK_ToggleDL() Version 1.5.5 (the CSS file has changed from previous version) report bugs or errors to thierry@tjkdesign.com

if (document.getElementById && document.getElementsByTagName){			
document.write("<link href=\"script/TJK_ToggleDL.css\" type=\"text/css\" rel=\"stylesheet\" />")
document.write("<link href=\"script/TJK_ToggleDL_ie5mac.css\" type=\"text/css\" rel=\"stylesheet\" />")
}
function TJK_doToggleDL(x){
	var zDD=document.getElementById('TJK_DL').getElementsByTagName('dd');
	var zDT=document.getElementById('TJK_DL').getElementsByTagName('dt');	
		zDD[x].className=(zDD[x].className=='hideDD')?'showDD':'hideDD';
		zDT[x].className=(zDT[x].className=='DTplus')?'DTminus':'DTplus';	
}
function TJK_ToggleDLopen(){//we open all of them
	var zDD=document.getElementById('TJK_DL').getElementsByTagName('dd');
	var zDT=document.getElementById('TJK_DL').getElementsByTagName('dt');	
	for(var i=0;i<zDT.length;i++){
		zDD[i].className='showDD';
		zDT[i].className='DTminus';
	}
	return false;
}
function TJK_ToggleDLclose(){//we close all of them	
	var zDD=document.getElementById('TJK_DL').getElementsByTagName('dd');
	var zDT=document.getElementById('TJK_DL').getElementsByTagName('dt');	
	for(var i=0;i<zDT.length;i++){
		zDD[i].className='hideDD';
		zDT[i].className='DTplus';
	}
	return false;	
}
function TJK_ToggleDL(){
if (document.getElementById && document.getElementsByTagName){			
	var zDT=document.getElementById('TJK_DL').getElementsByTagName('dt');
	var zDD=document.getElementById('TJK_DL').getElementsByTagName('dd');
	var ToggleON = document.getElementById('TJK_ToggleON');
	var ToggleOFF = document.getElementById('TJK_ToggleOFF');	
	if (ToggleON && ToggleOFF){// Show All - Hide All "links"
		ToggleON.onclick = TJK_ToggleDLopen;
		ToggleON.title = "Show all answers";
		ToggleON.href = "#";		
		ToggleOFF.onclick = TJK_ToggleDLclose;	
		ToggleOFF.title = "Hide all answers";
		ToggleOFF.href = "#";		
	}
	for(var i=0;i<zDT.length;i++){
		var zContent = zDT[i].innerHTML;
		var zHref = "<a href='#' onclick=\"TJK_doToggleDL("+i+");return false\" title='Show/hide the answer'>";
		zDT[i].innerHTML = zHref + zContent + "</a>";
		zDD[i].className='hideDD';
		zDT[i].className='DTplus';
		}
	}
}
