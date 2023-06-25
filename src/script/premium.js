
var sales_end = new Date("2023-06-10");

/* functions that remove elements depending on the user type (from user=pro querystring ) */

var removableItems = [
	"quickFiltersFreeUser",
	"quickFiltersProRenew"
];
var removedItems = [];


/* functions that remove elements depending on the user type (from user=pro querystring ) */

	function getQueryVariable(variable)	{
		var query = window.location.search.substring(1),
				vars = query.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			if (pair[0] == variable) 
				return pair[1];
		}
		return(null);
	}

	function removeClassItems(name, replaceItem) {
		var dbuttons = document.getElementsByClassName(name);
		for (var i=dbuttons.length-1; i>=0; i--) {
			// dbuttons[i].style.display='none';
			if (replaceItem) {
				var renewButton = document.createElement("a");
				renewButton.setAttribute("href", "https://sites.fastspring.com/quickfolders/instant/quickfiltersrenew&referrer=quickfilters-site");
				renewButton.className = "renewButton";
				renewButton.innerHTML = "Renew License";
				dbuttons[i].parentNode.replaceWith(renewButton); // replace anchor tag (containing donate button)
			}
			else
				dbuttons[i].parentNode.removeChild(dbuttons[i]);
		}
	}
	
	document.addEventListener("DOMContentLoaded", function(event) { 
		var user = getQueryVariable("user");
		if (typeof user!='undefined') {
			// propagate user type to all internal links
			if (user) {
				var navMenu = document.getElementsByClassName('navigation-list');
				if (navMenu.length) {
					var links = navMenu[0].children;
					for (var i=0; i<links.length; i++) {
						var href = links[i].getAttribute("href");
						if (href && href.indexOf("user="==-1))
							links[i].setAttribute("href", href + "?user=" + user);
					}
				}
			}
			
			switch (user) {
				case 'pro':
					removeClassItems('donateButton');
					removeClassItems('quickFiltersFreeUser');
				  removeClassItems('quickFiltersProRenew');
					break;
				case 'proRenew':
					removeClassItems('donateButton', true);
					// add renewal link
					removeClassItems('quickFiltersFreeUser');
				  removeClassItems('quickFiltersProUser');
				  break;
				default:
				  removeClassItems('quickFiltersProRenew');
				  removeClassItems('quickFiltersProUser');
			}
		};

		// remove sales stuff
		if (sales_end && new Date() > sales_end) {
			removableItems.forEach(
				(e) => {
					if (!removedItems.includes(e)) {
						removeClassItems(e);
						removedItems.push(e);
					}
				}
			);
		}

	});
	
	

	