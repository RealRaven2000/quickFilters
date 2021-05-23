var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-filterEditor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

async function onLoad(activatedWhileWindowOpen) {
    let layout2 = WL.injectCSS("chrome://quickfilters/content/filterWidgets.css");
 
    WL.injectElements(`
    
	<dialog id="FilterEditor"
	  ondialogaccept = "{ return quickFilters.Util.acceptEditFilter(window); }" >
		
		<hbox id="quickFilters-CustomTemplate" collapsed="true" >
			<img src="chrome:///quickfilters/content/skin/proFeature24.png" id="customLogo" />
			<spacer flex="1" />
			<label id="quickFilters-CustomTitle"
			       value="__MSG_quickfilters.customTemplate.title__"/>
			<spacer flex="1" />
		</hbox>
		
		<label id="quickFilters-templateName"
		       value="__MSG_quickfilters.customTemplate.name__"
					 control="filterName"
					 collapsed="true"/>
		
		<hbox id="quickFilters-CustomVars"
		      collapsed="true">
			<label id="quickFilters-variablePicker-label" 
			       value="__MSG_quickfilters.customVariable.label__"
						 collapsed="true" />
			<toolbarbutton type="menu" 
			          id="quickFilters-variablePicker"
			          label="__MSG_quickfilters.customVariable.label__"
								tooltiptext="__MSG_quickfilters.customVariable.tooltip__"
								sizetopopup="none" 
								oncommand="quickFilters.FilterEditor.selectCustomHeader(this,event);">
				<menupopup>
				  <menu label="__MSG_quickfilters.customHeader.From__">
						<menupopup>
							<menuitem label="__MSG_quickfilters.customHeader.From__" value="%from%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Email__" value="%from(mail)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Domain__" value="%from(domain)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.NamePart__" value="%from(name)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.FirstName__" value="%from(firstname)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.LastName__" value="%from(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="__MSG_quickfilters.customHeader.To__">
						<menupopup>
							<menuitem label="__MSG_quickfilters.customHeader.To__" value="%to%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Email__" value="%to(mail)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Domain__" value="%to(domain)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.NamePart__" value="%to(name)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.FirstName__" value="%to(firstname)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.LastName__" value="%to(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="__MSG_quickfilters.customHeader.CarbonCopy__">
						<menupopup>
							<menuitem label="__MSG_quickfilters.customHeader.CarbonCopy__" value="%cc%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Email__" value="%cc(mail)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Domain__" value="%cc(domain)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.NamePart__" value="%cc(name)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.FirstName__" value="%cc(firstname)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.LastName__" value="%cc(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="__MSG_quickfilters.customHeader.BlindCarbonCopy__">
						<menupopup>
							<menuitem label="__MSG_quickfilters.customHeader.BlindCarbonCopy__" value="%bcc%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Email__" value="%bcc(mail)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Domain__" value="%bcc(domain)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.NamePart__" value="%bcc(name)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.FirstName__" value="%bcc(firstname)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.LastName__" value="%bcc(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="__MSG_quickfilters.customHeader.ReplyTo__">
						<menupopup>
							<menuitem label="__MSG_quickfilters.customHeader.ReplyTo__" value="%reply-to%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Email__" value="%reply-to(mail)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.Domain__" value="%reply-to(domain)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.NamePart__" value="%reply-to(name)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.FirstName__" value="%reply-to(firstname)%"/>
							<menuitem label="__MSG_quickfilters.customHeader.LastName__" value="%reply-to(lastname)%"/>
						</menupopup>
					</menu>
					<menuitem label="__MSG_quickfilters.customHeader.Subject__" value="%subject%" />
					<menuitem label="__MSG_quickfilters.customHeader.SubjectRegex__" value="%subjectRegex()%" />
					<menuitem label="__MSG_quickfilters.customHeader.ListId__" value="%list-id%" />
					<menuitem label="__MSG_quickfilters.customHeader.ListPost__" value="%list-post%" />
					<menuitem label="__MSG_quickfilters.customHeader.Newsgroups__" value="%newsgroups%" />
				</menupopup>
			</toolbarbutton>
		  
		</hbox>
		

	</dialog>
    
    `);
    
  let filterName = document.getElementById("filterName");
  // append a toolbar to the right of the filter name (there is some space here!)
  if (filterName) {
    let toolbar = document.createXULElement("toolbar");
    toolbar.id = "quickFiltersEditorTools";
    filterName.parentNode.appendChild(toolbar);
    toolbar.setAttribute("mode", "full");
    toolbar.classList.add("inline-toolbar");
    toolbar.classList.add("chromeclass-toolbar");
    WL.injectElements(`    
      <toolbar id="quickFiltersEditorTools">
        <toolbarbutton id="quickFiltersBtnSort"
          class = "toolbarbutton-1" 
          label = "__MSG_quickfilters.sort__"
          tooltiptext = "__MSG_quickfilters.sort.tooltip__"
          oncommand = "quickFilters.FilterEditor.sortConditions(gFilter);"
          />
      </toolbar>
    `);    
  }
  
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
    
  if (!activatedWhileWindowOpen) {
    window.quickFilters.FilterEditor.onLoad();
  }

}

function onUnload(isAddOnShutDown) {
  
}
