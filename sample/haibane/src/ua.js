var ua = navigator.userAgent;
var apName = navigator.appName;
var apVer  = navigator.appVersion;

function isWin() {
	if (ua.indexOf("Win") != -1) { return true; }
	else { return false; }
}

function getPlatForm() {
	p = '';// p‚Í3•¶Žš‚Å
	if (ua.indexOf("Win") != -1) { p = "win"; }
	else if (ua.indexOf("Mac") != -1) { p = "mac" }
	return p;
}

function getUaForCss() {
	b = '';
	if (apName.indexOf("Internet Explorer") != -1) {
		if(apVer.charAt(0)>=4){ b="ie"; }
		if(ua.indexOf("MSIE 4")>0) { b=""; } //MacIE4‚ÍNN‚Æ“¯‚¶ˆµ‚¢‚É
	}
	else if(ua.indexOf("Gecko") != -1) { b="gc" }
	else if(apName.indexOf("Netscape") != -1) { 
		if(apVer.charAt(0)==4){ b=""; }
	}
	pt = getPlatForm();
	if (navigator.platform.indexOf("UNIX") != -1) { pt = "win"; }
	else if (navigator.platform.indexOf("Linux") != -1) { pt="win"; }
	b= pt + b;
	return b;
}