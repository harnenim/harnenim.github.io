﻿let time = 0;

const tabs = [];
let tab = 0;
let closingTab = null;
let tabToCloseAfterRun = null;

let autoSaveTemp = null;

let autoFindSync = false;

// C# 쪽에서 호출
function refreshTime(now, fr) {
	if (time != now) {
		time = now;
		if (autoFindSync && tabs.length && tabs[tab]) {
			tabs[tab].holds[tabs[tab].hold].findSync();
		}
	}
	if (!SmiEditor.video.isAudio && fr) {
		if (fr == 23975) {
			fr = 23975.7; // 일부 영상 버그
		}
		SmiEditor.video.FL = 1000000 / (SmiEditor.video.FR = fr);
		if (showFps == null) {
			showFps = $("#showFps");
		}
		showFps.text((Math.floor(fr*10+0.5)/10000) + " fps");
	}
}
let showFps = null;

window.Tab = function(text, path) {
	this.holdSelector = $("<div class='hold-selector'>");
	this.holdArea = $("<div class='holds'>");
	this.area = $("<div class='tab'>").append(this.holdSelector).append(this.holdArea);
	this.holds = [];
	this.hold = 0;
	this.lastHold = 1;
	this.path = path;
	
	{	const holds = Subtitle.SmiFile.textToHolds(text);
		for (let i = 0; i < holds.length; i++) {
			this.addHold(holds[i], i == 0, i == 0);
		}
	}
	this.savedHolds = this.holds.slice(0);
	
	const tab = this;
	this.holdSelector.on("click", ".selector", function() {
		tab.selectHold($(this).data("hold"));
		
	}).on("dblclick", ".hold-name", function(e) {
		e.stopPropagation();
		$(this).parents(".selector").data("hold").rename();
		
	}).on("click", ".btn-hold-remove", function(e) {
		e.stopPropagation();
		const hold = $(this).parents(".selector").data("hold");
		confirm("삭제하시겠습니까?", () => {
			const index = tab.holds.indexOf(hold);
			
			if (tab.hold == index) {
				// 선택된 걸 삭제하는 경우 메인 홀드로 먼저 이동
				//tab.holds[0].selector.click();
				tab.selectHold(tab.holds[0]);
			} else if (tab.hold > index) {
				// 선택된 게 삭제 대상보다 뒤에 있을 경우 번호 당김
				tab.hold--;
			}
			
			tab.holds.splice(index, 1);
			hold.selector.remove();
			hold.area.remove();
			delete hold;
			
			tab.holdEdited = true;
			tab.updateHoldSelector();
			tab.onChangeSaved();
			SmiEditor.Viewer.refresh();
		});
		
	}).on("click", ".btn-hold-upper", function(e) {
		e.stopPropagation();
		const hold = $(this).parents(".selector").data("hold");
		if (hold.pos == -1) {
			hold.pos = 1;
		} else {
			hold.pos++;
		}
		tab.updateHoldSelector();
		hold.afterChangeSaved(hold.isSaved());
		SmiEditor.Viewer.refresh();
		
	}).on("click", ".btn-hold-lower", function(e) {
		e.stopPropagation();
		const hold = $(this).parents(".selector").data("hold");
		if (hold.pos == 1) {
			hold.pos = -1;
		} else {
			hold.pos--;
		}
		tab.updateHoldSelector();
		hold.afterChangeSaved(hold.isSaved());
		SmiEditor.Viewer.refresh();
	});
	
	this.area.on("click", ".btn-hold-style", function(e) {
		const hold = $(this).data("hold");
		hold.styleArea.show();
		hold.inputPreset.focus();
	});
};
Tab.prototype.addHold = function(info, isMain=false, asActive=true) {
	if (!info) {
		info = {
				name: "새 홀드"
			,	text: ""
			,	pos: 1
		}
	}
	const hold = new SmiEditor(info.text);
	this.holds.push(hold);
	this.holdSelector.append(hold.selector = $("<div class='selector'>").data({ hold: hold }));
	hold.selector.append($("<div class='hold-name'>").append($("<span>").text(hold.name = hold.savedName = info.name)));
	hold.selector.attr({ title: hold.name });
	hold.owner = this;
	hold.pos   = hold.savedPos   = info.pos;
	hold.style = hold.savedStyle = (info.style ? info.style : "");
	hold.tempSavedText = info.text;
	hold.updateTimeRange();
	
	if (isMain) {
		hold.selector.addClass("selected");
		
	} else {
		const btnArea = $("<div class='area-btn-hold'>");
		hold.selector.append(btnArea);
		btnArea.append($("<button type='button' class='btn-hold-remove' title='삭제'>"));
		btnArea.append($("<button type='button' class='btn-hold-upper'  title='위로(Ctrl+Alt+↑)'>"));
		btnArea.append($("<button type='button' class='btn-hold-lower'  title='아래로(Ctrl+Alt+↓)'>"));
		// 홀드 생성 직후에 숨기면 스크롤바 렌더링이 문제 생김
		// 최초 로딩 시 메인 홀드만 보이는 상태에서 사용상 문제는 없음
		//hold.area.hide();
		
		hold.area.append($("<button type='button' class='btn-hold-style' title='홀드 공통 스타일 설정'>").data({ hold: hold }));
		hold.area.append(hold.styleArea = $("<div class='hold-style-area'>"));
		const area = $("<div>");
		hold.styleArea.append(area);
		
		hold.inputPreset = $("<input type='text' spellcheck='false' class='input-hold-preset' placeholder='홀드 공통 스타일 태그 입력' />");
		const inputEnd = $("<input type='text' spellcheck=false' class='input-hold-preset-end' placeholder='종료 태그는 자동으로 생성됩니다.' disabled />");
		const btnClose = $("<button type='button' class='btn-close-preset'>");
		area.append(hold.inputPreset).append(inputEnd).append(btnClose);
		
		hold.inputPreset.on("input propertychange", function() {
			hold.style = $(this).val();
			hold.afterChangeSaved(hold.isSaved());

			let presetEnd = "";
			let tags = hold.style.split("<");
			for (let j = 1; j < tags.length; j++) {
				const tag = tags[j];
				if (tag.indexOf(">") > 0) {
					const inTag = tag.substring(0, tag.indexOf(">"));
					const tagName = inTag.split(" ")[0].split("\t")[0];
					presetEnd = "</" + tagName + ">" + presetEnd;
				}
			}
			inputEnd.val(presetEnd);
		}).on("keydown", function(e) {
			if (e.keyCode == 27 // Esc
			 || e.keyCode == 13 // Enter
			) {
				btnClose.click();
			}
		}).val(hold.style).trigger("input");
		
		btnClose.on("click", function() {
			hold.styleArea.hide();
		});
	}
	
	this.holdArea.append(hold.area);
	this.updateHoldSelector();
	if (asActive) {
		this.selectHold(hold);
	}
	this.onChangeSaved();
}
Tab.prototype.updateHoldSelector = function() {
	if (this.holds.length <= 1) {
		this.area.removeClass("with-hold");
		refreshPaddingBottom();
		return;
	}
	this.area.addClass("with-hold");
	refreshPaddingBottom();
	
	let BEGIN = 1;
	let END = -1;
	
	const timers = []; // 각 홀드의 시작/종료 시간을 정렬한 객체
	for (let i = 0; i < this.holds.length; i++) {
		const hold = this.holds[i];
		if (i > 0) {
			hold.selector.find(".hold-name span").text(i + "." + hold.name);
		}
		timers.push({ time: hold.start, holds: [{ index: i, type: BEGIN }] });
		timers.push({ time: hold.end  , holds: [{ index: i, type: END   }] });
	}
	timers[0].time = timers[0].rate = 0; // 메인 홀드는 시작 시간 0으로 출력
	timers.sort((a, b) => {
		if (a.time < b.time)
			return -1;
		if (a.time > b.time)
			return 1;
		return 0;
	});
	
	for (let i = 0; i < timers.length - 1; i++) {
		if (timers[i].time == timers[i+1].time) {
			timers[i].holds.push(timers[i+1].holds[0]);
			timers.splice(i + 1, 1);
			i--;
		}
	}
	
	let add = 0; // 홀드 시작/종료 위치 개수에 대한 추가 보정값
	{	const begins = []; // 각 홀드의 시작 위치를 기록한 객체
		for (let i= 0; i < timers.length; i++) {
			const timer = timers[i];
			
			for (let j = 0; j < timer.holds.length; j++) {
				if (timer.holds[j].type == END) {
					// 홀드 종료 위치가 시작 위치와 4칸 이상 떨어져야 함
					const min = begins[timer.holds[j].index] + 4;
					if (i + add < min) {
						// 4칸 안 될 경우 보정값에 추가
						add = min - i;
					}
				}
			}
			timer.rate = i + add;
			
			for (let j = 0; j < timer.holds.length; j++) {
				if (timer.holds[j].type == BEGIN) {
					// 현재 위치에서 시작하는 홀드 위치 기억
					begins[timer.holds[j].index] = timer.rate;
				}
			}
		}
	}
	
	const posStatus = {};
	for (let i = 0; i < timers.length; i++) {
		const timer = timers[i];
		const rate = (timer.rate / (timers.length + add - 1) * 100);
		for (let j = 0; j < timer.holds.length; j++) {
			const selector = timer.holds[j];
			const hold = this.holds[selector.index];
			if (selector.type == BEGIN) {
				// 홀드 시작
				hold.selector.css({ left: rate + "%" });
				
				// 홀드끼리 영역 겹칠 경우 보완 필요
				let pos = hold.pos;
				if (pos > 0) {
					while (posStatus[pos] && posStatus[pos].length) {
						posStatus[pos++].push(hold);
					}
				} else {
					while (posStatus[pos] && posStatus[pos].length) {
						posStatus[pos--].push(hold);
					}
				}
				posStatus[pos] = [hold];
				hold.viewPos = pos;
				
				let top = 30;
				if (pos > 0) {
					for (let k = 0; k < pos; k++) {
						top /= 2;
					}
				} else if (hold.pos < 0) {
					for (let k = 0; k < -pos; k++) {
						top /= 2;
					}
					top = 60 - top;
				}
				hold.selector.css({ top: top + "%" });
				
			} else {
				// 홀드 끝
				hold.selector.css({ right: (100 - rate) + "%" });
				
				// 홀드 위치 사용 중 해제
				for (let pos in posStatus) {
					const posHolds = posStatus[pos];
					const index = posHolds.indexOf(hold);
					if (index >= 0) {
						posHolds.splice(index, 1);
					}
				}
			}
		}
	}
}
Tab.prototype.selectHold = function(hold) {
	let index = hold;
	if (isFinite(hold)) {
		if (!(hold = this.holds[hold])) {
			return;
		}
	} else {
		index = this.holds.indexOf(hold);
	}
	SmiEditor.selected = hold;

	this.holdSelector.find(".selector").removeClass("selected");
	this.holdArea.find(".hold").hide();
	hold.selector.addClass("selected");
	hold.area.show();
	hold.input.focus().scroll();
	if ((this.hold = index) > 0) {
		this.lastHold = this.hold;
	}
	SmiEditor.Viewer.refresh();
}
Tab.prototype.selectLastHold = function() {
	if (this.holds.length == 0) {
		return;
	}
	if (this.hold > 0) {
		this.selectHold(0);
		return;
	}
	if (this.lastHold && this.holds[this.lastHold]) {
		this.selectHold(this.lastHold);
	} else {
		this.selectHold(1);
	}
}
Tab.prototype.replaceBeforeSave = function() {
	for (let i = 0; i < this.holds.length; i++) {
		let text = this.holds[i].input.val(); // .text 동기화 실패 가능성 고려, 현재 값 다시 불러옴
		let changed = false;
		
		// 커서 기준 3개로 나눠서 치환
		let cursor = this.holds[i].getCursor();
		text = [text.substring(0, cursor[0]), text.substring(cursor[0], cursor[1]), text.substring(cursor[1])];
		for (let j = 0; j < setting.replace.length; j++) {
			const item = setting.replace[j];
			if (item.use) {
				if (text[0].indexOf(item.from) >= 0) { text[0] = text[0].split(item.from).join(item.to); changed = true; }
				if (text[1].indexOf(item.from) >= 0) { text[1] = text[1].split(item.from).join(item.to); changed = true; }
				if (text[2].indexOf(item.from) >= 0) { text[2] = text[2].split(item.from).join(item.to); changed = true; }
			}
		}
		cursor = [text[0].length, text[0].length + text[1].length];
		
		if (text[0].length > 0 && text[1].length > 0) {
			// 시작 커서 전후 치환
			text = [text[0] + text[1], text[2]];
			for (let j = 0; j < setting.replace.length; j++) {
				const item = setting.replace[j];
				if (item.use) {
					const index = text[0].indexOf(item.from);
					if (index >= 0) {
						text[0] = text[0].split(item.from).join(item.to);
						cursor[0] = index + item.to.length;
						cursor[1] += item.to.length - item.from.length;
						changed = true;
					}
				}
			}
		} else {
			text = [text[0] + text[1], text[2]];
		}
		
		// 종료 커서 전후 치환
		if (text[1].length > 0) {
			text = text[0] + text[1];
			for (let j = 0; j < setting.replace.length; j++) {
				const item = setting.replace[j];
				if (item.use) {
					const index = text.indexOf(item.from);
					if (index >= 0) {
						text = text.split(item.from).join(item.to);
						cursor[1] = index;
						changed = true;
					}
				}
			}
		} else {
			text = text[0];
		}
		
		// 바뀐 게 있으면 적용
		if (changed) {
			this.holds[i].setText(text, cursor);
		}
	}
}
Tab.prototype.getSaveText = function(withCombine=true, withComment=true) {
	return Subtitle.SmiFile.holdsToText(this.holds, setting.saveWithNormalize, withCombine, withComment, SmiEditor.video.FR / 1000);
}
Tab.prototype.onChangeSaved = function(hold) {
	if (this.isSaved()) {
		this.area.removeClass("tmp-saved").removeClass("not-saved");
		for (let i = 0; i < this.holds.length; i++) {
			this.holds[i].selector.removeClass("not-saved");
		}
	} else {
		this.area.removeClass("tmp-saved").addClass("not-saved");
	}
	
	if (hold) {
		// 홀드 수정에 따른 갱신
		hold.updateTimeRange();
		this.updateHoldSelector();
	}
}
Tab.prototype.isSaved = function() {
	if (this.savedHolds && (this.savedHolds.length != this.holds.length)) {
		return false;
	}
	
	for (let i = 0; i < this.holds.length; i++) {
		if (!this.holds[i].isSaved()) {
			return false;
		}
	}
	
	return true;
}

Tab.prototype.toAss = function() {
	// Default 설정 있어야 함
	// Style: Default,맑은 고딕,80,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,64,64,40,1
	
	// 각 홀드 헤더에 스타일 설정 있으면 가져오기, 없으면 기본값 넣기
	// 홀드명이 같은데 스타일이 다른 경우 경고 후 해당 홀드에 번호 붙여서 수정
	/*
	 * <!-- Ass-Styles
	 * 
	 * -->
	 */
	for (let h = 0; h < this.holds.length; h++) {
		const hold = this.holds[h];
		const input = hold.body ? hold : new Subtitle.SmiFile(hold.text);
		const syncs = input.toSync();
		console.log(syncs);
		const ass = new Subtitle.AssFile2().fromSync(syncs, hold.name);
		// 타이핑 효과 등 normalize 필요
		console.log(ass);
		/*
		hold.style = 
		
		
		*/
	}
	
	/*
	 * SMI-ASS 대응
	 * 
	 * 1:0 (보통 이런 경우는 잘 없음
	 * <Font replace="">SMI 전용 대사</Font>
	 * 
	 * 1:1 (이게 일반적)
	 * <Font ass="\fs100"></Font>공통 대사, ASS만의 스타일 추가
	 * 
	 * 1:1에 내용 추가
	 * <Font ass="\fs100"></Font>공통 대사<Font replace="ASS만의 내용 추가"></Font>
	 * 
	 * 1:n (동일 싱크의 ASS 자막 여러 개로 분화)
	 * <Font add="{\fs100}추가 대사"></Font>
	 * <Font ass="\fs100"></Font>공통 대사, ASS만의 스타일 추가
	 * 
	 * 0:n (SMI에 아예 없는 싱크에 대사 추가)
	 * 홀드에 산입? 비산입?
	 * <!-- Ass-Events
	 * (그대로 가져오기)
	 * -->
	 * 
	 */
}
Tab.prototype.getAssText = function() {
	this.toAss();
}

SmiEditor.prototype.isSaved = function() {
	return (this.savedName  == this.name )
		&& (this.savedPos   == this.pos  )
		&& (this.savedStyle == this.style)
		&& (this.saved == this.input.val());
};
SmiEditor.prototype.onChangeSaved = function(saved) {
	// 홀드 저장 여부 표시
	if (this.selector) {
		if (saved) {
			this.selector.removeClass("not-saved");
		} else {
			this.selector.addClass("not-saved");
		}
	}
	
	// 수정될 수 있는 건 열려있는 탭이므로
	if (!tabs.length) return;
	const currentTab = tabs[tab];
	if (!currentTab) return;
	currentTab.onChangeSaved(this);
};
SmiEditor.prototype.rename = function() {
	if (this == this.owner.holds[0]) {
		// 메인 홀드는 이름 변경 X
		return;
	}
	const hold = this;
	prompt("홀드 이름 변경", (input) => {
		if (!input) {
			alert("잘못된 입력입니다.");
			return;
		}
		hold.selector.find(".hold-name > span").text(hold.owner.holds.indexOf(hold) + "." + (hold.name = input));
		hold.selector.attr({ title: hold.name });
		hold.afterChangeSaved(hold.isSaved());
	}, hold.name);
}
SmiEditor.selectTab = function(index=-1) {
	const tabSelector = $("#tabSelector");
	if (index < 0) {
		const selectedTab = tabSelector.find(".selected").data("tab");
		if (selectedTab) {
			// 다음 탭 선택
			index = (tabs.indexOf(selectedTab) + 1) % tabs.length;
		} else {
			index = 0;
		}
	}
	
	const currentTab = tabs[tab = index];
	tabSelector.find(".selected").removeClass("selected");
	$(currentTab.th).addClass("selected").data("tab");
	
	$("#editor > .tab").hide();
	currentTab.area.show();
	if (_for_video_) { // 동영상 파일명으로 자막 파일을 연 경우 동영상 열기 불필요
		_for_video_ = false;
	} else if (currentTab.path && currentTab.path.length > 4 && binder) {
		binder.checkLoadVideoFile(currentTab.path);
	}
	SmiEditor.selected = currentTab.holds[currentTab.hold];
	SmiEditor.Viewer.refresh();
	SmiEditor.selected.input.focus();
	
	// 탭에 따라 홀드 여부 다를 수 있음
	refreshPaddingBottom();
}

function deepCopyObj(obj) {
	if (obj && typeof obj == "object") {
		if (Array.isArray(obj)) {
			return JSON.parse(JSON.stringify(obj));
		}
		
		const out = {};
		for (let key in obj) {
			out[key] = deepCopyObj(obj[key]);
		}
		return out;
		
	} else {
		return obj;
	}
}
function setDefault(target, dflt) {
	let count = 0; // 변동 개수... 쓸 일이 있으려나?
	for (let key in dflt) {
		if (typeof dflt[key] == "object") {
			if (Array.isArray(dflt[key])) {
				// 기본값이 배열
				if (Array.isArray(target[key])) {
					// 배열끼리는 덮어쓰지 않고 유지
				} else {
					// 기존에 배열이 아니었으면 오류로 간주
					target[key] = JSON.parse(JSON.stringify(dflt[key]));
					count++;
				}
			} else {
				// 기본값이 객체
				if (target[key] && (typeof target[key] == "object") && !Array.isArray(target[key])) {
					// 객체에서 객체로 기본값 복사
					count += setDefault(target[key], dflt[key]);
				} else {
					// 기존에 객체가 아니었으면 오류로 간주
					target[key] = deepCopyObj(dflt[key]);
					count++;
				}
			}
		} else {
			// 기본값이 기본형
			if (target[key] != null) {
				// 기존에 값 있으면 유지
			} else {
				// 기본값 복사
				target[key] = dflt[key];
				count++;
			}
		}
	}
	return count;
}

// C# 쪽에서 호출
function init(jsonSetting, isBackup=true) {
	try {
		setting = JSON.parse(jsonSetting);
		if (typeof setting != "object") {
			if (!isBackup) {
				binder.repairSetting();
				return;
			}
		}
		
		const notified = checkVersion(setting.version);
		
		if (notified.style) {
			// 스타일 기본값이 바뀌었을 경우
			const css = setting.viewer.css.split("/*");
			
			// 주석 분리
			css[0] = [null, css[0]];
			for (let i = 1; i < css.length; i++) {
				const aCss = css[i].split("*/");
				css[i] = [aCss[0], aCss.slice(1).join("*/")];
			}
			
			// 내용 중 font-size 있으면 주석 처리
			for (let i = 0; i < css.length; i++) {
				const aCss =  css[i][1];
				const begin = aCss.indexOf("font-size");
				if (begin >= 0) {
					let end = aCss.indexOf(";", begin);
					if (end < 0) {
						end = aCss.length;
					} else {
						end++;
					}
					
					css[i][1] = aCss.substring(0, begin) + "/* " + aCss.substring(begin, end) + " font-size 비활성화 */" + aCss.substring(end);
				}
				css[i] = (css[i][0] ? ("/* " + css[i][0] + " */") : "") + css[i][1];
			}
			
			setting.viewer.css = css.join("");
		}
		
		// C#에서 보내준 세팅값 오류로 빠진 게 있으면 채워주기
		if (!Array.isArray(setting)) {
			let count = setDefault(setting, DEFAULT_SETTING);
			if (setting.version != DEFAULT_SETTING.version) {
				setting.version = DEFAULT_SETTING.version;
				count++;
				
				if (notified.menu) {
					// 메뉴 기본값이 바뀌었을 경우
					
					for (let di = 0; di < DEFAULT_SETTING.menu.length; di++) {
						let exist0 = false;
						
						const dMenu = DEFAULT_SETTING.menu[di];
						const dMenu0 = dMenu[0];
						const dMenu0name = dMenu0.split("(&")[0];
						
						for (let si = 0; si < setting.menu.length; si++) {
							const sMenu = setting.menu[si];
							const sMenu0 = sMenu[0];
							const sMenu0name = sMenu0.split("(&")[0];
							
							if (sMenu0name == dMenu0name) {
								// 이름이 같은 메뉴를 찾았을 경우
								exist0 = true;
								
								if (sMenu0.indexOf("(&") < 0 && dMenu0.indexOf("(&") > 0) {
									// 단축키가 추가된 경우
									sMenu[0] = dMenu0;
									count++;
								}
								
								for (let dj = 1; dj < dMenu.length; dj++) {
									let exist1 = false;
									
									const dMenu1 = dMenu[dj];
									const dMenu1name = dMenu1.split("|")[0].split("(&")[0];
									
									for (let sj = 1; sj < sMenu.length; sj++) {
										const sMenu1 = sMenu[sj];
										const sMenu1name = sMenu1.split("|")[0].split("(&")[0];
										
										if (sMenu1name == dMenu1name) {
											// 이름이 같은 메뉴를 찾았을 경우
											exist1 = true;
											let updated = false;
											
											const sLen = sMenu1.indexOf("|");
											const dLen = dMenu1.indexOf("|");
											let sMenuName = sMenu1.substring(0, sLen);
											let dMenuName = dMenu1.substring(0, dLen);
											if (sMenuName.indexOf("(&") < 0 && dMenuName.indexOf("(&") > 0) {
												// 단축키가 추가된 경우
												sMenuName = dMenuName;
												updated = true;
											}
											
											let sMenuFunc = sMenu1.substring(sLen + 1);
											let dMenuFunc = dMenu1.substring(dLen + 1);
											if (sMenuFunc != dMenuFunc) {
												// 기능이 바뀐 경우
												sMenuFunc = dMenuFunc + " /* " + DEFAULT_SETTING.version + " 이전: " + sMenuFunc.split("*/").join("*​/") + " */";
												updated = true;
											}
											if (updated) {
												sMenu[sj] = sMenuName + "|" + sMenuFunc;
												count++;
											}
											
											break;
										}
									}
									if (!exist1) {
										// 이름이 같은 메뉴를 못 찾았을 경우 - 메뉴 추가
										sMenu.push(dMenu1);
										count++;
									}
								}
								
								break;
							}
						}
						if (!exist0) {
							// 이름이 같은 메뉴를 못 찾았을 경우 - 메뉴 추가
							setting.menu.push(dMenu);
							count++;
						}
					}
				}
			}
			if (count) {
				saveSetting();
			}
		} else {
			setting = deepCopyObj(DEFAULT_SETTING);
			saveSetting();
		}
		
	} catch (e) {
		console.log(e);
		
		if (!isBackup) {
			binder.repairSetting();
			return;
		}
		
		setting = deepCopyObj(DEFAULT_SETTING);
		saveSetting();
	}
	
	const btnAddHold = $("#btnAddHold").on("click", function() {
		if (tabs.length == 0) return;
		tabs[tab].addHold();
	});
	const inputWeight = $("#inputWeight").on("input propertychange", function() {
		const weight = inputWeight.val();
		if (isFinite(weight)) {
			SmiEditor.sync.weight = setting.sync.weight = Number(weight);
		} else {
			alert("숫자를 입력하세요.");
			const cursor = inputWeight[0].selectionEnd - 1;
			inputWeight.val(SmiEditor.sync.weight);
			inputWeight[0].setSelectionRange(cursor, cursor);
		}
	});
	const inputUnit = $("#inputUnit").on("input propertychange", function() {
		const unit = inputUnit.val();
		if (isFinite(unit)) {
			SmiEditor.sync.unit = setting.sync.unit = Number(unit);
		} else {
			alert("숫자를 입력하세요.");
			const cursor = inputUnit[0].selectionEnd - 1;
			inputUnit.val(SmiEditor.sync.unit);
			inputUnit[0].setSelectionRange(cursor, cursor);
		}
	});
	const btnMoveToBack = $("#btnMoveToBack").on("click", function() {
		if (tabs.length == 0) return;
		tabs[tab].holds[tabs[tab].hold].moveSync(false);
		tabs[tab].holds[tabs[tab].hold].input.focus();
	});
	const btnMoveToForward = $("#btnMoveToForward").on("click", function() {
		if (tabs.length == 0) return;
		tabs[tab].holds[tabs[tab].hold].moveSync(true);
		tabs[tab].holds[tabs[tab].hold].input.focus();
	});
	
	const checkAutoFindSync = $("#checkAutoFindSync").on("click", function() {
		autoFindSync = $(this).prop("checked");
		if (tabs.length == 0) return;
		tabs[tab].holds[tabs[tab].hold].input.focus();
	});
	const checkTrustKeyframe = $("#checkTrustKeyframe").on("click", function() {
		if (SmiEditor.trustKeyFrame = $(this).prop("checked")) {
			$("#editor").addClass("trust-keyframe");
		} else {
			$("#editor").removeClass("trust-keyframe");
		}
		if (tabs.length == 0) return;
	});
	
	const btnNewTab = $("#btnNewTab").on("click", function() {
		openNewTab();
	});
	
	const tabSelector = $("#tabSelector").on("click", ".th:not(#btnNewTab)", function() {
		const th = $(this);
		if (th[0] == closingTab) {
			return;
		}
		
		const currentTab = th.data("tab");
		if (currentTab) {
			SmiEditor.selectTab(tabs.indexOf(currentTab));
		}
		
	}).on("click", ".btn-close-tab", function(e) {
		e.preventDefault();
		
		const th = $(this).parent();
		closingTab = th[0]; // 탭 선택 이벤트 방지... e.preventDefault()로 안 되네...
		
		let saved = true;
		{	const currentTab = th.data("tab");
			for (let i = 0; i < currentTab.holds.length; i++) {
				if (currentTab.holds[i].input.val() != currentTab.holds[i].saved) {
					saved = false;
					break;
				}
			}
		}
		confirm((!saved ? "저장되지 않았습니다.\n" : "") + "탭을 닫으시겠습니까?", () => {
			const index = closeTab(th);

			setTimeout(() => {
				if (tabs.length) {
					if ($("#tabSelector .th.selected").length == 0) {
						// 선택돼있던 탭을 닫았을 경우 다른 탭 선택
						tab = Math.min(index, tabs.length - 1);
					} else {
						// 비활성 탭을 닫았을 경우
						if (index < tab) {
							// 닫힌 탭보다 뒤면 1씩 당겨서 재선택
							tab--;
						}
					}
					$("#tabSelector .th:eq(" + tab + ")").click();
				}
				closingTab = null;
			}, 1);
			
		}, () => {
			setTimeout(() => {
				closingTab = null;
			}, 1);
		});
	});
	
	// ::-webkit-scrollbar에 대해 CefSharp에서 커서 모양이 안 바뀜
	// ... 라이브러리 버그? 업데이트하면 달라지나?
	$("body").on("mousemove", "textarea", function(e) {
		$(this).css({ cursor: ((this.clientWidth <= e.offsetX) || (this.clientHeight <= e.offsetY) ? "default" : "text") });
	});
	
	SmiEditor.activateKeyEvent();

	// Win+방향키 이벤트 직후 창 위치 초기화
	const winKeyStatus = [false, false];
	$(window).on("keydown", function (e) {
		if (e.keyCode == 91 || e.keyCode == 92) {
			// WinKey 최우선 처리
			winKeyStatus[e.keyCode - 91] = true;
			return;
		}
	}).on("keyup", function (e) {
		if (winKeyStatus[0] || winKeyStatus[1]) {
			switch (e.keyCode) {
				case 37: // ←
				case 38: // ↑
				case 39: // →
				{
					setTimeout(() => {
						moveWindowsToSetting();
					}, 1);
					break;
				}
				case 91: {
					winKeyStatus[0] = false;
					break;
				}
				case 92: {
					winKeyStatus[1] = false;
					break;
				}
			}
		}
	});
	
	setSetting(setting, true);
	SmiEditor.Viewer.open(); // 스타일 세팅 설정 완료 후에 실행
	moveWindowsToSetting();

	autoSaveTemp = setInterval(() => {
		saveTemp();
	}, setting.tempSave * 1000);
}

function setSetting(setting, initial=false) {
	const oldSetting = window.setting;
	
	// 탭 on/off 먼저 해야 height값 계산 가능
	if (setting.useTab) {
		$("body").addClass("use-tab");
	} else {
		$("body").removeClass("use-tab");
	}
	
	SmiEditor.setSetting(setting);
	if (initial || (oldSetting.size != setting.size) || (JSON.stringify(oldSetting.color) != JSON.stringify(setting.color))) {
		// 스타일 바뀌었을 때만 재생성
		if (setting.css) {
			delete(setting.css);
		}
		
		// 스크롤바 버튼 새로 그려야 함
		let button = "";
		let disabled = "";
		{
			let canvas = SmiEditor.canvas;
			if (!canvas) canvas = SmiEditor.canvas = document.createElement("canvas");
			canvas.width = canvas.height = ((SB = (16 * setting.size)) + 1) * 2;

			const v1 = SB / 2;
			const v2 = SB + 1 + (SB / 2);
			const v15 = setting.size * 1.5;
			const v20 = setting.size * 2.0;
			const v35 = setting.size * 3.5;
			const c = canvas.getContext("2d");
			let x;
			let y;
			x = v1; y = v1; c.moveTo(x, y-v15); c.lineTo(x+v35, y+v20), c.lineTo(x-v35, y+v20); c.closePath();
			x = v1; y = v2; c.moveTo(x, y+v15); c.lineTo(x+v35, y-v20), c.lineTo(x-v35, y-v20); c.closePath();
			x = v2; y = v1; c.moveTo(x-v15, y); c.lineTo(x+v20, y-v35), c.lineTo(x+v20, y+v35); c.closePath();
			x = v2; y = v2; c.moveTo(x+v15, y); c.lineTo(x-v20, y+v35), c.lineTo(x-v20, y-v35); c.closePath();
			
			const r = Math.floor((Number("0x" + setting.color.border.substring(1,3)) + Number("0x" + setting.color.text.substring(1,3))) / 2);
			const g = Math.floor((Number("0x" + setting.color.border.substring(3,5)) + Number("0x" + setting.color.text.substring(3,5))) / 2);
			const b = Math.floor((Number("0x" + setting.color.border.substring(5,7)) + Number("0x" + setting.color.text.substring(5,7))) / 2);
			c.fillStyle = "#" + ((((r << 8) | g) << 8) + b).toString(16);
			c.fill();
			button = SmiEditor.canvas.toDataURL();
			
			c.fillStyle = setting.color.border;
			c.fill();
			disabled = SmiEditor.canvas.toDataURL();
		}
		$.ajax({url: "lib/SmiEditor.color.css?250531"
			,	dataType: "text"
			,	success: (preset) => {
					for (let name in setting.color) {
						preset = preset.split("[" + name + "]").join(setting.color[name]);
					}
					if (button) {
						preset = preset.split("[button]").join(button).split("[buttonDisabled]").join(disabled);
						$("body").addClass("custom-scrollbar");
					} else {
						$("body").removeClass("custom-scrollbar");
					}
					
					let $style = $("#styleColor");
					if (!$style.length) {
						$("head").append($style = $("<style id='styleColor'>"));
					}
					$style.html(preset);
				}
		});
		
		// 찾기/바꾸기 내재화했을 경우
		if (SmiEditor.Finder
		 && SmiEditor.Finder.window
		 && SmiEditor.Finder.window.iframe
		 && SmiEditor.Finder.window.iframe.contentWindow
		 && SmiEditor.Finder.window.iframe.contentWindow.setColor) {
			SmiEditor.Finder.window.iframe.contentWindow.setColor(setting.color);
		}
	}
	if (initial || (oldSetting.size != setting.size)) {
		$.ajax({url: "lib/SmiEditor.size.css?250531"
			,	dataType: "text"
				,	success: (preset) => {
					preset = preset.split("20px").join((LH = (20 * setting.size)) + "px");
					
					let $style = $("#styleSize");
					if (!$style.length) {
						$("head").append($style = $("<style id='styleSize'>"));
					}
					$style.html(preset);
					
					for (let i = 0; i < tabs.length; i++) {
						const holds = tabs[i].holds;
						for (let j = 0; j < holds.length; j++) {
							holds[j].input.scroll();
							if (holds[j].act) {
								holds[j].act.resize();
							}
						}
					}
				}
		});
		
		// 찾기/바꾸기 내재화했을 경우
		if (SmiEditor.Finder
		 && SmiEditor.Finder.window
		 && SmiEditor.Finder.window.iframe
		 && SmiEditor.Finder.window.iframe.contentWindow
		 && SmiEditor.Finder.window.iframe.contentWindow.setSize) {
			SmiEditor.Finder.window.iframe.contentWindow.setSize(setting.size);
			const w = 440 * setting.size;
			const h = 220 * setting.size;
			SmiEditor.Finder.window.frame.css({
					top: (window.innerHeight - h) / 2
				,	left: (window.innerWidth - w) / 2
				,	width: w
				,	height: h
			});
		}
	}
	if (initial || (JSON.stringify(oldSetting.highlight) != JSON.stringify(setting.highlight))) {
		// 문법 하이라이트 양식 바뀌었을 때만 재생성
		if (setting.useHighlight == false) {
			setting.highlight = { parser: "", style: "eclipse" };
			delete(setting.useHighlight);
		} else if (setting.useHighlight) {
			delete(setting.useHighlight);
		}
		// 문법 하이라이트 세팅 중에 내용이 바뀔 수 있어서
		// 에디터 목록을 만들어서 넘기지 않고, 함수 형태로 넘김
		SmiEditor.setHighlight(setting.highlight, () => {
			const editors = [];
			for (let i = 0; i < tabs.length; i++) {
				for (let j = 0; j < tabs[i].holds.length; j++) {
					editors.push(tabs[i].holds[j]);
				}
			}
			return editors;
		});
	}
	{
		if (setting.sync.kLimit == undefined) {
			setting.sync.kLimit = 200;
		}
		SmiEditor.followKeyFrame = setting.sync.kframe;
		SmiEditor.limitKeyFrame  = setting.sync.kLimit;
	}
	
	// 기본 단축키
	SmiEditor.withCtrls["N"] = newFile;
	SmiEditor.withCtrls["O"] = openFile;
	SmiEditor.withCtrls["S"] = saveFile;
	SmiEditor.withCtrls["s"] = closeCurrentTab; // Ctrl+F4
	SmiEditor.withCtrls.reserved += "NOSs";
	
	// 가중치 등
	$("#inputWeight").val(setting.sync.weight);
	$("#inputUnit"  ).val(setting.sync.unit  );
	if (setting.sync.frame) {
		$(".for-frame-sync").show();
	} else {
		$(".for-frame-sync").hide();
	}
	
	{
		const dll = setting.player.control.dll;
		if (dll) {
			const playerSetting = setting.player.control[dll];
			if (playerSetting) {
				binder.setPlayer(dll, playerSetting.path, playerSetting.withRun);
			}
		}
	}
	
	Combine.css = setting.viewer.css;
	
	binder.setMenus(setting.menu);
	
	window.setting = JSON.parse(JSON.stringify(setting));
	
	// 새 파일 양식은 세팅 로딩이 완료된 후에 갖춰짐
	if (!setting.useTab && !tabs.length) {
		// 탭 기능 껐을 땐 에디터 하나 열린 상태
		newFile();
	}
}
function moveWindowsToSetting() {
	binder.moveWindow("editor"
			, setting.window.x
			, setting.window.y
			, setting.window.width
			, setting.window.height
			, true);
	SmiEditor.Viewer.moveWindowToSetting();
	SmiEditor.Addon .moveWindowToSetting();
	if (setting.player.window.use) {
		binder.moveWindow("player"
				, setting.player.window.x
				, setting.player.window.y
				, setting.player.window.width
				, setting.player.window.height
				, true);
		// TODO: false->true일 때 플레이어 위치 다시 구하기?
	}
	binder.setFollowWindow(setting.window.follow);

	// 창 위치 초기화 후 호출
	setTimeout(() => {
		refreshPaddingBottom();
	}, 1);
}

// C# 쪽에서 호출
function setDpiBy(width) {
	// C#에서 보내준 창 크기와 js에서 구한 브라우저 크기의 불일치를 이용해 DPI 배율을 구함
	setTimeout(() => {
		DPI = (width + 8) / (window.outerWidth + 10);
	}, 1000); // 로딩 덜 됐을 수가 있어서 딜레이 줌
}

window.playerDlls = [];
window.highlights = [];
// C# 쪽에서 호출
function setPlayerDlls(dlls) {
	playerDlls = dlls.split("\n");
}
function setHighlights(list) {
	highlights = list.split("\n");
}

function openSetting() {
	SmiEditor.settingWindow = window.open("setting.html?250531", "setting", "scrollbars=no,location=no,resizable=no,width=1,height=1");
	binder.moveWindow("setting"
			, (setting.window.x < setting.player.window.x)
			  ? (setting.window.x + (40 * DPI))
			  : (setting.window.x + setting.window.width - (840 * DPI))
			, setting.window.y + (40 * DPI)
			, 800 * DPI
			, (600+30) * DPI
			, false);
	binder.focus("setting");
	return SmiEditor.settingWindow;
}
function saveSetting() {
	if (window.binder) {
		binder.saveSetting(stringify(setting));
	}
}
function refreshPaddingBottom() {
	// 에디터 하단 여백 재조정
	const holdTop = tabs.length ? Number(tabs[tab].area.find(".holds").css("top").split("px")[0]) : 0;
	const padding = $("#editor").height() - holdTop - LH;
	const append = "\n#editor textarea { padding-bottom: " + (padding - 2 - SB) + "px; }"
	             + "\n.hold > .col-sync > div:first-child { height: " + (padding - 1) + "px; }";
	let $style = $("#stylePaddingBottom");
	if (!$style.length) {
		$("head").append($style = $("<style id='stylePaddingBottom'>"));
	}
	$style.html(append);
	if (SmiEditor.selected) {
		SmiEditor.selected.input.scroll();
	}
}

function openHelp(name) {
	const url = (name.substring(0, 4) == "http") ? name : "help/" + name.split("..").join("").split(":").join("") + ".html?250531";
	SmiEditor.helpWindow = window.open(url, "help", "scrollbars=no,location=no,resizable=no,width=1,height=1");
	binder.moveWindow("help"
			, setting.window.x + (40 * DPI)
			, setting.window.y + (40 * DPI)
			, 800 * DPI
			, (600+30) * DPI
			, false);
	binder.focus("help");
}

function runIfCanOpenNewTab(func) {
	tabToCloseAfterRun = null;
	if (!setting.useTab) {
		// 탭 미사용 -> 현재 파일 닫기
		if (tabs.length) {
			const currentTab = tabs[0];
			for (let i = 0; i < currentTab.holds.length; i++) {
				if (!currentTab.isSaved()) {
					confirm("현재 파일을 닫을까요?", () => {
						tabToCloseAfterRun = $("#tabSelector > .th:not(#btnNewTab)");
						func();
					});
					return;
				}
			}
			tabToCloseAfterRun = $("#tabSelector > .th:not(#btnNewTab)");
		}
	}
	if (func) func();
}
function closeTab(th) {
	const targetTab = th.data("tab");
	const index = tabs.indexOf(targetTab);
	tabs.splice(index, 1);
	targetTab.area.remove();
	th.remove();
	delete targetTab;
	
	SmiEditor.selected = null;
	SmiEditor.Viewer.refresh();
	return index;
}
function closeCurrentTab() {
	if (setting.useTab && tabs.length && tabs[tab]) {
		$("#tabSelector .th:eq(" + tab + ") .btn-close-tab").click();
	}
}

function newFile() {
	runIfCanOpenNewTab(openNewTab);
}

function openFile(path, text, forVideo) {
	// C#에서 파일 열 동안 canOpenNewTab 결과가 달라질 리는 없겠지만, 일단은 바깥에서 감싸주기
	runIfCanOpenNewTab(() => {
		if (text) {
			// 새 탭 열기
			openNewTab(text, path, forVideo);
		} else {
			// C#에서 파일 열기 대화상자 실행
			binder.openFile();
		}
	});
}
function openFileForVideo(path, text) {
	runIfCanOpenNewTab(() => {
		// C#에서 동영상의 자막 파일 탐색
		binder.openFileForVideo();
	});
}

let exporting = false;
function saveFile(asNew, isExport) {
	const currentTab = tabs[tab];
	let syncError = null;
	
	for (let i = 0; i < currentTab.holds.length; i++) {
		const hold = currentTab.holds[i];
		hold.history.log();
		
		if (!syncError) {
			for (let j = 0; j < hold.lines.length; j++) {
				const line = hold.lines[j];
				if (line.LEFT && (line.LEFT.hasClass("error") || line.LEFT.hasClass("equal"))) {
					syncError = [i, j];
					break;
				}
			}
		}
	}

	let path = currentTab.path;
	if (!path) {
		// 파일 경로가 없으면 다른 이름으로 저장 대화상자 필요
		asNew = true;
	}
	
	// 저장 전 일괄치환
	if (setting.replace.length > 0) {
		currentTab.replaceBeforeSave();
	}
	
	if (asNew) {
		path = "";
	} else if (isExport) {
		// 내보내기용 파일명 생성
		if (binder && !binder._) {
			const index = path.lastIndexOf("/");
			const prefix = "_"; // 설정 만들기?
			path = path.substring(0, index + 1) + prefix + path.substring(index + 1);
		} else {
			path = "";
			alert("웹버전에서는 파일명 지정이 필수입니다.");
		}
	}
	
	/* // 수정된 게 없어 보여도, 다른 프로그램에서 수정한 걸 덮어쓸 수도 있음
	if (text == currentTab.saved) {
		// 마지막 저장 이후 수정된 게 없음
		//return false;
	}
	*/
	
	let withAss = false;
	{
		const match = /<sami( [^>]*)*>/gi.exec(currentTab.holds[0].text);
		if (match && match[1]) {
			const attrs = match[1].toUpperCase().split(" ");
			for (let i = 0; i < attrs.length; i++) {
				if (attrs[i] == "ASS") {
					withAss = true;
					break;
				}
			}
		}
	}
	if (withAss) {
		const styles = {};
		for (let i = 1; i < currentTab.holds.length; i++) {
			const hold = currentTab.holds[i];
			if (hold.name.indexOf(",") >= 0) {
				alert("ASS 자막 변환을 하는 경우 홀드명에 ,(쉼표)가 들어갈 수 없습니다.");
				currentTab.selectHold(hold);
				return;
			}
			if (typeof styles[hold.name] == "string") {
				if (hold.style != styles[hold.name]) {
					alert("같은 이름의 홀드끼리 스타일이 일치하지 않습니다.\n임의로 이름을 변경합니다.");
					for (let j = 1; ; j++) {
						let holdName = hold.name + j;
						if (typeof styles[holdName] == "undefined") {
							hold.selector.find(".hold-name > span").text(hold.owner.holds.indexOf(hold) + "." + (hold.name = holdName));
							hold.selector.attr({ title: hold.name });
							hold.afterChangeSaved(hold.isSaved());
							styles[hold.name] = hold.style;
							break;
						}
					}
				}
			} else {
				styles[hold.name] = hold.style;
			}
		}
		
		// TODO: ASS 저장용 스타일 지정돼 있는지 확인 및 추가
	}
	
	if (syncError) {
		confirm("싱크 오류가 있습니다.\n저장하시겠습니까?", function() {
			binder.save(currentTab.getSaveText(true, !(exporting = isExport)), path, true);
			if (withAss) {
				currentTab.getAssText();
//				binder.save(currentTab.getAssText(), assPath, false);
			}
			
		}, function() {
			const hold = currentTab.holds[syncError[0]];
			currentTab.selectHold(hold);
			
			const lineNo = syncError[1];
			const cursor = (lineNo ? hold.text.split("\n").slice(0, lineNo).join("\n").length + 1 : 0);
			hold.setCursor(cursor);
			hold.scrollToCursor(lineNo);
		});
	} else {
		binder.save(currentTab.getSaveText(true, !(exporting = isExport)), path, true);
		if (withAss) {
			currentTab.getAssText();
//			binder.save(currentTab.getAssText(), assPath, false);
		}
	}
}

// 저장 후 C# 쪽에서 호출
function afterSaveFile(path) {
	const currentTab = tabs[tab];
	if (exporting) {
		// 내보내기 동작일 땐 상태 바꾸지 않음
		exporting = false;
		return;
	}
	for (let i = 0; i < currentTab.holds.length; i++) {
		// 최종 저장 여부는 탭 단위로 다뤄져야 해서 군더더기 작업이 됨
		// afterSave 재정의도 삭제
		// currentTab.holds[i].afterSave();
		const hold = currentTab.holds[i];
		hold.saved = hold.input.val();
		hold.savedPos = hold.pos;
		hold.savedName = hold.name;
		hold.savedStyle = hold.style;
	}
	currentTab.path = path;
	const title = path ? ((path.length > 14) ? ("..." + path.substring(path.length - 14, path.length - 4)) : path.substring(0, path.length - 4)) : "새 문서";
	$("#tabSelector .th:eq(" + tab + ") span").text(title).attr({ title: path });
	currentTab.holdEdited = false;
	currentTab.savedHolds = currentTab.holds.slice(0);
	
	// savedHolds가 교체된 후에 저장 여부 체크
	currentTab.onChangeSaved();
}

function saveTemp() {
	const currentTab = tabs[tab];
	if (!currentTab) {
		return;
	}

	// 마지막 임시 저장 이후 변경 사항 없으면 무시
	const texts = [];
	let isChanged = false;
	for (let i = 0; i < currentTab.holds.length; i++) {
		const text = texts[i] = currentTab.holds[i].input.val();
		if (text == currentTab.holds[i].tempSavedText) {
			continue;
		}
		isChanged = true;
	}
	
	if (isChanged) {
		const path = currentTab.path ? currentTab.path : "\\new.smi";
		binder.saveTemp(currentTab.getSaveText(false), path);
		for (let i = 0; i < currentTab.holds.length; i++) {
			currentTab.holds[i].tempSavedText = texts[i];
		}
		currentTab.area.addClass("tmp-saved");
	}
}

let _for_video_ = false;
function openNewTab(text, path, forVideo) {
	if (tabToCloseAfterRun) {
		closeTab(tabToCloseAfterRun);
		tabToCloseAfterRun = null;
	}
	if (tabs.length >= 4) {
		alert("탭은 4개까지 열 수 있습니다.");
		return;
	}
	
	const texts = [];
	if (path) {
		if (path.substring(path.length - 4).toUpperCase() == ".SRT") {
			// SRT 파일 불러왔을 경우 SMI로 변환
			path = path.substring(0, path.length - 4) + ".smi";
			texts.push(text = srt2smi(text));
		}
	}

	const title = path ? ((path.length > 14) ? ("..." + path.substring(path.length - 14, path.length - 4)) : path.substring(0, path.length - 4)) : "새 문서";
	
	const tab = new Tab(text ? text : setting.newFile, path);
	tabs.push(tab);
	$("#editor").append(tab.area);

	const th = $("<div class='th'>").append($("<span>").text(title)).attr({ title: path });
	th.append($("<button type='button' class='btn-close-tab'>").text("×"));
	$("#btnNewTab").before(th);
	
	_for_video_ = forVideo;
	(tab.th = th).data("tab", tab).click();
	
	if (path && path.indexOf(":")) { // 웹버전에선 온전한 파일 경로를 얻지 못해 콜론 없음
		let withAss = false;
		{
			const match = /<sami( [^>]*)*>/gi.exec(text);
			if (match && match[1]) {
				const attrs = match[1].toUpperCase().split(" ");
				for (let i = 0; i < attrs.length; i++) {
					if (attrs[i] == "ASS") {
						withAss = true;
						break;
					}
				}
			}
		}
		if (withAss) {
			let assPath = path + ".ass";
			if (path.toUpperCase().endsWith(".SMI")) {
				assPath = path.substring(0, path.length - 4) + ".ass";
			} else if (path.toUpperCase().endsWith(".SAMI")) {
				assPath = path.substring(0, path.length - 5) + ".ass";
			}
			binder.loadAssFile(assPath, tabs.length - 1);
		}
	}
	
	return tab;
}
// C# 쪽에서 호출
function confirmLoadVideo(path) {
	setTimeout(() => {
		confirm("동영상 파일을 같이 열까요?\n" + path, function() {
			binder.loadVideoFile(path);
		});	
	}, 1);
}

// C# 쪽에서 호출
function loadAssFile(path, text, target=-1) {
	if (target < 0) {
		// 탭이 지정 안 된 경우..는 없어야 맞음
		target = tab;
	}
	const currentTab = tabs[target];
	if (!currentTab) return;
	
	const loadedAssFile = new Subtitle.AssFile2(text);
	console.log(loadedAssFile);
	
	// TODO:
	// SMI->ASS 변환 결과 생성 및 비교
	// 불일치 부분 확인 및 보정
}

// C# 쪽에서 호출
function setVideo(path) {
	if (SmiEditor.video.path != path) {
		SmiEditor.video.path = path;
		SmiEditor.video.fs = [];
		SmiEditor.video.kfs = [];
		$("#forFrameSync").addClass("disabled");
		$("#checkTrustKeyframe").attr({ disabled: true });

		// 동영상 파일이 열려있을 때만 프레임 분석 진행
		const ext = path.toLowerCase();
		if (ext.endsWith(".avi")
		 || ext.endsWith(".mp4")
		 || ext.endsWith(".mkv")
		 || ext.endsWith(".ts")
		 || ext.endsWith(".m2ts")
		) {
			SmiEditor.video.isAudio = false;
			binder.requestFrames(path);
		} else {
			// 오디오 파일을 불러온 경우 ms 단위 싱크로 동작
			SmiEditor.video.isAudio = true;
			SmiEditor.video.FR = 1000000;
			SmiEditor.video.FL = 1;
		}
	}
}
// C# 쪽에서 호출
function loadFkf(fkfName) {
	// C# 파일 객체를 js 쪽에 전달할 수 없으므로, 정해진 경로의 파일을 ajax 형태로 가져옴
	const req = new XMLHttpRequest();
	req.open("GET", "../temp/" + fkfName);
	req.responseType = "arraybuffer";
	req.onload = (e) => {
		afterLoadFkfFile(req.response);
	}
	req.onerror = (e) => {
		// 실패했어도 프로그레스바는 없애줌
		Progress.set("#forFrameSync", 0);
	}
	req.send();
}
// 웹버전 샘플에서 fkf 파일 드래그로 열었을 경우
function loadFkfFile(file) {
	const fr = new FileReader();
	fr.onload = function(e) {
		afterLoadFkfFile(e.target.result);
	}
	fr.readAsArrayBuffer(file);
}
function afterLoadFkfFile(buffer) {
	const fkf = new Int32Array(buffer);
	const vfsLength = fkf[0];
	const kfsLength = fkf[1];
	
	const vfs = [];
	const kfs = [];
	
	let offset = 8;
	{	const view = new DataView(buffer.slice(offset, offset + (vfsLength * 4)));
		for (let i = 0; i < vfsLength; i++) {
			vfs.push(view.getInt32(i * 4, true));
		}
	}
	offset = offset + (vfsLength * 4);
	{	const view = new DataView(buffer.slice(offset, offset + (kfsLength * 4)));
		for (let i = 0; i < kfsLength; i++) {
			kfs.push(view.getInt32(i * 4, true));
		}
	}
	SmiEditor.video.fs  = vfs;
	SmiEditor.video.kfs = kfs;
	
	// 키프레임 신뢰 기능 활성화
	$("#forFrameSync").removeClass("disabled");
	$("#checkTrustKeyframe").attr({ disabled: false });
	Progress.set("#forFrameSync", 0);
	
	for (let i = 0; i < tabs.length; i++) {
		const holds = tabs[i].holds;
		for (let j = 0; j < holds.length; j++) {
			holds[j].refreshKeyframe();
		}
	}
}

// 종료 전 C# 쪽에서 호출
function beforeExit() {
	let saved = true;
	for (let i = 0; i < tabs.length; i++) {
		for (let j = 0; j < tabs[i].holds.length; j++) {
			if (tabs[i].holds[j].saved != tabs[i].holds[j].input.val()) {
				saved = false;
				break;
			}
		}
	}
	if (saved) {
		doExit(); // 그냥 꺼지는 게 맞는 것 같음
	} else {
		confirm("저장되지 않은 파일이 있습니다.\n종료하시겠습니까?", doExit);
	}
}
function doExit() {
	saveSetting(); // 창 위치 최신값으로 저장
	binder.doExit(setting.player.window.use
		, setting.player.control[setting.player.control.dll].withExit);
}

function srt2smi(text) {
	return new Subtitle.SmiFile().fromSync(new Subtitle.SrtFile(text).toSync()).toTxt();
}

/**
 * frameSyncOnly: 화면 싱크만 맞춰주기
 * add: 과거 반프레임 보정치 안 넣었던 것들을 위해 추가
 */
function fitSyncsToFrame(frameSyncOnly=false, add=0) {
	if (!SmiEditor.video.fs.length) {
		/*
		return;
		/*/
		// 테스트용 코드
		for (let s = 0; s < 2000000; s += 50) {
			SmiEditor.video.fs.push(s);
			if (s % 1000 == 0) {
				SmiEditor.video.kfs.push(s);
			}
		}
		
		// 키프레임 신뢰 기능 활성화
		$("#forFrameSync").removeClass("disabled");
		$("#checkTrustKeyframe").attr({ disabled: false });
		Progress.set("#forFrameSync", 0);
		
		for (let i = 0; i < tabs.length; i++) {
			const holds = tabs[i].holds;
			for (let j = 0; j < holds.length; j++) {
				holds[j].refreshKeyframe();
			}
		}
		//*/
	}

	if (!tabs.length) return;
	const holds = tabs[tab].holds;
	
	for (let i = 0; i < holds.length; i++) {
		holds[i].fitSyncsToFrame(frameSyncOnly, add);
	}
}