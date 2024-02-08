_alert = alert;
_confirm = confirm;
_prompt = prompt;

var main = {};
main.hwnd = window;
main.getHwnd = function(name) {
	if (name == this.window.contentWindow.windowName) {
		return this.hwnd;
	} else if (name == "addon") {
		return this.window.contentWindow.addon;
	}
	return null;
}
main.focusWindow = function(target) {
	WinAPI.SetForegroundWindow(this.getHwnd(target));
}

main.script = function(names, p) {
	var func = eval("this.window.contentWindow." + names);
	if (p) {
		return func(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]);
	} else {
		return func();
	}
}
main.alert = function(target, msg) {
	this.getHwnd(target)._alert(msg);
}
main.confirm = function(target, msg) {
	if (confirm(msg)) {
		this.window.contentWindow.afterConfirmYes();
	} else {
		this.window.contentWindow.afterConfirmNo();
	}
}
main.prompt = function(target, msg) {
	this.window.contentWindow.afterPrompt(this.getHwnd(target)._prompt(msg));
}

main.dropLayer = $("<div>").css({
		position: "fixed"
	,	top: 0
	,	left: 0
	,	right: 0
	,	bottom: 0
	,	background: "rgba(127,127,127,0)"
	,	padding: 80
	,	textAlign: "center"
	,	fontSize: 20
}).hide();
main.showDragging = function(id) {
	this.dropLayer.show();
	this.script("showDragging");
}
main.hideDragging = function() {
	this.dropLayer.hide();
	this.script("hideDragging");
}
main.droppedFiles = null;
main.drop = function(x, y) {
	this.script("drop", [ x, y ]);
}
$(function() {	
	$("body").append(main.dropLayer);
	
	document.addEventListener("dragenter", function(e) {
		e.preventDefault();
		main.showDragging();
	});
	var dropLayer = main.dropLayer[0];
	dropLayer.addEventListener("dragleave", function(e) {
		e.preventDefault();
		main.hideDragging();
	});
	dropLayer.addEventListener("dragover", function(e) {
		e.preventDefault();
		main.script("dragover", [ e.offsetX, e.offsetY ]);
	});
	dropLayer.addEventListener("drop", async function(e) {
		e.preventDefault();
		if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
			main.droppedFiles = e.dataTransfer.files;
		}
		main.hideDragging();
		await main.drop(e.offsetX, e.offsetY);
	});
});

function WebForm() {
	this.hwnd = window;
	this.dropLayer = $("<div>").css({
		position: "fixed"
		,	top: 0
		,	left: 0
		,	right: 0
		,	bottom: 0
		,	background: "rgba(127,127,127,0)"
		,	padding: 80
		,	textAlign: "center"
		,	fontSize: 20
	}).hide();
	var self = this;
	
	$(function() {	
		$("body").append(self.dropLayer);
		
		document.addEventListener("dragenter", function(e) {
			e.preventDefault();
			self.showDragging();
		});
		var dropLayer = self.dropLayer[0];
		dropLayer.addEventListener("dragleave", function(e) {
			e.preventDefault();
			self.hideDragging();
		});
		dropLayer.addEventListener("dragover", function(e) {
			e.preventDefault();
			self.script("dragover", [ e.offsetX, e.offsetY ]);
		});
		dropLayer.addEventListener("drop", async function(e) {
			e.preventDefault();
			if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
				self.droppedFiles = e.dataTransfer.files;
			}
			self.hideDragging();
			await self.drop(e.offsetX, e.offsetY);
		});
	});
}
WebForm.prototype.getHwnd = function(name) {
	if (name == this.window.contentWindow.windowName) {
		return this.hwnd;
	} else if (name == "addon") {
		return this.window.contentWindow.addon;
	}
	return null;
}
WebForm.prototype.focusWindow = function(target) {
	WinAPI.SetForegroundWindow(this.getHwnd(target));
}

WebForm.prototype.script = function(names, p) {
	var func = eval("this.window.contentWindow." + names);
	if (p) {
		return func(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]);
	} else {
		return func();
	}
}
WebForm.prototype.alert = function(target, msg) {
	this.getHwnd(target)._alert(msg);
}
WebForm.prototype.confirm = function(target, msg) {
	if (confirm(msg)) {
		this.window.contentWindow.afterConfirmYes();
	} else {
		this.window.contentWindow.afterConfirmNo();
	}
}
WebForm.prototype.prompt = function(target, msg) {
	this.window.contentWindow.afterPrompt(this.getHwnd(target)._prompt(msg));
}

WebForm.prototype.showDragging = function(id) {
	this.dropLayer.show();
	this.script("showDragging");
}
WebForm.prototype.hideDragging = function() {
	this.dropLayer.hide();
	this.script("hideDragging");
}
WebForm.prototype.droppedFiles = null;
WebForm.prototype.drop = function(x, y) {
	this.script("drop", [ x, y ]);
}