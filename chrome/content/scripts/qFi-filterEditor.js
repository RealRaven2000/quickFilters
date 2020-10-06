var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-filterEditor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
 //   let layout = WL.injectCSS("chrome://quickfilters/content/filterList.css");
//    let layout1 = WL.injectCSS("chrome://quickfilters/content/filterList.css");
    let layout2 = WL.injectCSS("chrome://quickfilters/content/filterWidgets.css");
 
    WL.injectElements(`
    
	<dialog id="FilterEditor"
	  ondialogaccept = "{ return quickFilters.Util.acceptEditFilter(window); }" >
		
		<hbox id="quickFilters-CustomTemplate" collapsed="true" >
			<img src="chrome:///quickfilters/content/skin/proFeature24.png" id="customLogo" />
			<spacer flex="1" />
			<label id="quickFilters-CustomTitle"
			       value="&quickfilters.customTemplate.title;"/>
			<spacer flex="1" />
		</hbox>
		
		<label id="quickFilters-templateName"
		       value="&quickfilters.customTemplate.name;"
					 control="filterName"
					 collapsed="true"/>
		
		<hbox id="quickFilters-CustomVars"
		      collapsed="true">
			<label id="quickFilters-variablePicker-label" 
			       value="&quickfilters.customVariable.label;"
						 collapsed="true" />
			<toolbarbutton type="menu" 
			          id="quickFilters-variablePicker"
			          label="&quickfilters.customVariable.label;"
								tooltiptext="&quickfilters.customVariable.tooltip;"
								sizetopopup="none" 
								oncommand="quickFilters.FilterEditor.selectCustomHeader(this,event);">
				<menupopup>
				  <menu label="&quickfilters.customHeader.From;">
						<menupopup>
							<menuitem label="&quickfilters.customHeader.From;" value="%from%"/>
							<menuitem label="&quickfilters.customHeader.Email;" value="%from(mail)%"/>
							<menuitem label="&quickfilters.customHeader.Domain;" value="%from(domain)%"/>
							<menuitem label="&quickfilters.customHeader.NamePart;" value="%from(name)%"/>
							<menuitem label="&quickfilters.customHeader.FirstName;" value="%from(firstname)%"/>
							<menuitem label="&quickfilters.customHeader.LastName;" value="%from(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="&quickfilters.customHeader.To;">
						<menupopup>
							<menuitem label="&quickfilters.customHeader.To;" value="%to%"/>
							<menuitem label="&quickfilters.customHeader.Email;" value="%to(mail)%"/>
							<menuitem label="&quickfilters.customHeader.Domain;" value="%to(domain)%"/>
							<menuitem label="&quickfilters.customHeader.NamePart;" value="%to(name)%"/>
							<menuitem label="&quickfilters.customHeader.FirstName;" value="%to(firstname)%"/>
							<menuitem label="&quickfilters.customHeader.LastName;" value="%to(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="&quickfilters.customHeader.CarbonCopy;">
						<menupopup>
							<menuitem label="&quickfilters.customHeader.CarbonCopy;" value="%cc%"/>
							<menuitem label="&quickfilters.customHeader.Email;" value="%cc(mail)%"/>
							<menuitem label="&quickfilters.customHeader.Domain;" value="%cc(domain)%"/>
							<menuitem label="&quickfilters.customHeader.NamePart;" value="%cc(name)%"/>
							<menuitem label="&quickfilters.customHeader.FirstName;" value="%cc(firstname)%"/>
							<menuitem label="&quickfilters.customHeader.LastName;" value="%cc(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="&quickfilters.customHeader.BlindCarbonCopy;">
						<menupopup>
							<menuitem label="&quickfilters.customHeader.BlindCarbonCopy;" value="%bcc%"/>
							<menuitem label="&quickfilters.customHeader.Email;" value="%bcc(mail)%"/>
							<menuitem label="&quickfilters.customHeader.Domain;" value="%bcc(domain)%"/>
							<menuitem label="&quickfilters.customHeader.NamePart;" value="%bcc(name)%"/>
							<menuitem label="&quickfilters.customHeader.FirstName;" value="%bcc(firstname)%"/>
							<menuitem label="&quickfilters.customHeader.LastName;" value="%bcc(lastname)%"/>
						</menupopup>
					</menu>
				  <menu label="&quickfilters.customHeader.ReplyTo;">
						<menupopup>
							<menuitem label="&quickfilters.customHeader.ReplyTo;" value="%reply-to%"/>
							<menuitem label="&quickfilters.customHeader.Email;" value="%reply-to(mail)%"/>
							<menuitem label="&quickfilters.customHeader.Domain;" value="%reply-to(domain)%"/>
							<menuitem label="&quickfilters.customHeader.NamePart;" value="%reply-to(name)%"/>
							<menuitem label="&quickfilters.customHeader.FirstName;" value="%reply-to(firstname)%"/>
							<menuitem label="&quickfilters.customHeader.LastName;" value="%reply-to(lastname)%"/>
						</menupopup>
					</menu>
					<menuitem label="&quickfilters.customHeader.Subject;" value="%subject%" />
					<menuitem label="&quickfilters.customHeader.SubjectRegex;" value="%subjectRegex()%" />
					<menuitem label="&quickfilters.customHeader.ListId;" value="%list-id%" />
					<menuitem label="&quickfilters.customHeader.ListPost;" value="%list-post%" />
					<menuitem label="&quickfilters.customHeader.Newsgroups;" value="%newsgroups%" />
				</menupopup>
			</toolbarbutton>
		  
		</hbox>
		

	</dialog>
    
    `, ["chrome://quickfilters/locale/filterRules.dtd"]);
    
  if (!activatedWhileWindowOpen) {
    window.quickFilters.FilterEditor.onLoad();
  }

}

function onUnload(isAddOnShutDown) {
  
}
