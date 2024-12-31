var dao = null;

function initDatalist(groups=[]) {
	var datalists = $("#datalists");
	var groupList = datalists.find("#groupList").empty();
	
	var placeLists  = dao.getPlaceLists (groups);
	var screenLists = dao.getScreenLists(groups);
	
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		groupList.append($("<option>").val(group));
		
		var list = placeLists[group];
		var datalist = datalists.find("#place" + group);
		if (datalist.length) {
			datalist.empty();
		} else {
			datalists.append(datalist = $("<datalist>").attr({ id: "place" + group }));
		}
		for (var j = 0; j < list.length; j++) {
			datalist.append($("<option>").val(list[j]));
		}
		
		list = screenLists[group];
		var datalist = datalists.find("#screen" + group);
		if (datalist.length) {
			datalist.empty();
		} else {
			datalists.append(datalist = $("<datalist>").attr({ id: "screen" + group }));
		}
		for (var j = 0; j < list.length; j++) {
			datalist.append($("<option>").val(list[j]));
		}
	}
}

function refreshList(param={}) {
	var list = dao.getWatchList(param);
	
	var key = $("body").hasClass("edit") ? $("input[name=_]").val() : 0;
	
	var tab = $("#tab_watch");
	var st = tab.data("st");
	
	var tbody = $("#tab_watch .tb-list > tbody").empty();
	var last = null;
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var tr = $("<tr>").data(item);
		if (item._ == key) {
			tr.addClass("on");
		}
		if (last) {
			if (last.month != item.month) {
				tr.addClass("month");
			} else if (last.date == item.date) {
				tr.addClass("multi")
			}
		}
		last = item;
		
		tr.append($("<td>").text(item.date + " " + item.time));
		tr.append($("<td>").text((item.group == "other" ? "" : item.group) + " " + item.place));
		tr.append($("<td>").text(item.screen));
		tr.append($("<td>").text(item.movie));
		tr.append($("<td>").text(item.movieCd));
		tr.append($("<td>").append($("<button type='button'>").text("×")));
		tbody.append(tr);
	}
}

function getValue(item, key) {
	if (!item) return "";
	var value = item[key];
	return value ? value : "";
}
function refreshStat(table, col, groups, after) {
	var stat = dao.getStat(table, col, groups, after);
	
	var table = $("#tbStat");
	var tbHead = table.find(".tb-head > table").empty();
	var tbBody = table.find(".tb-body > table").empty();
	
	var colgroup = $("<colgroup>"), col;
	colgroup.append(col = $("<col>").css("width", "60px"));
	colgroup.append(col = $("<col>").css("width", "50px"));
	colgroup.append(col = $("<col>"));
	for (var i = 0; i < stat.groups.length; i++) {
		colgroup.append(col = document.createElement("col"));
	}
	colgroup.append(col = document.createElement("col"));
	tbHead.append(colgroup);
	tbBody.append(colgroup.clone());
	
	var thead = $("<thead>");
	var tr = $("<tr>"), th;
	tr.append(th = $("<th>"));
	tr.append(th = $("<th>").text("월"));
	tr.append(th = $("<th>").text("전체"));
	for (var i = 0; i < stat.groups.length; i++) {
		tr.append(th = $("<th>").text(stat.groups[i]));
	}
	tr.append(th = $("<th>").text("기타"));
	thead.append(tr);
	tbHead.append(thead);
	
	var tbody = $("<tbody>");
	for (var i = 0; i < stat.years.length; i++) {
		var year = stat.years[i];
		var yItem = stat.yMap[year];
		tbody.append(tr = $("<tr>").addClass("ny"));
		tr.append($("<td>").text(year).attr("rowspan", 13));
		tr.append($("<td>").text("연간"));
		tr.append($("<td>").append(    $("<a>").text(getValue(yItem,"total")).attr("href", "javascript:showList(" + year + ")")));
		for (var j = 0; j < stat.groups.length; j++) {
			var group = stat.groups[j];
			tr.append($("<td>").append($("<a>").text(getValue(yItem, group )).attr("href", "javascript:showList(" + year + ", '" + group + "')")));
		}
		tr.append(    $("<td>").append($("<a>").text(getValue(yItem,"other")).attr("href", "javascript:showList(" + year + ", 'other')")));
		
		for (var month = 12; month > 0; month--) {
			var ym = year * 100 + month;
			var mItem = stat.mMap[ym];
			tbody.append(tr = $("<tr>"));
			tr.append($("<td>").text(month + "월"));
			tr.append($("<td>").append(    $("<a>").text(getValue(mItem,"total")).attr("href", "javascript:showList(" + year + ")")));
			for (var j = 0; j < stat.groups.length; j++) {
				var group = stat.groups[j];
				tr.append($("<td>").append($("<a>").text(getValue(mItem, group )).attr("href", "javascript:showList(" + year + ", '" + group + "')")));
			}
			tr.append(    $("<td>").append($("<a>").text(getValue(mItem,"other")).attr("href", "javascript:showList(" + year + ", 'other')")));
		}
	}
	tbBody.append(tbody);
}
function showList(year, group) {
	var list = dao.getWatchList({ year: year, group: group});
	
	var popup = $("#tbPopup");
	var tbody = popup.find(".tb-list tbody").empty();
	if (list) {
		var last = null;
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var tr = $("<tr>");
			if (last) {
				if (last.month != item.month) {
					tr.addClass("month");
				} else if (last.date == item.date) {
					tr.addClass("multi")
				}
			}
			last = item;
			
			tr.append($("<td>").text(item.date + " " + item.time));
			tr.append($("<td>").text((item.group == "other" ? "" : item.group) + " " + item.place));
			tr.append($("<td>").text(item.screen));
			tr.append($("<td>").text(item.movie));
			tbody.append(tr);
		}
	}
	popup.show();
	popup.find(".tb-body").scrollTop(0).scrollLeft(0);
}

function loadCalendar() {
	var calendar = dao.getCalendar();
	
	var tbody = $("#tbCalendar tbody").empty();
	if (calendar.begin == 0) {
		return;
	}
	var now = new Date().getTime();
	var date = new Date(calendar.begin);
	var tr = $("<tr>");
	while (date.getTime() < now) {
		if (date.getDay() == 1) {
			tbody.append(tr = $("<tr>"));
		}
		var strDate = "" + (date.getFullYear() * 10000 + ((date.getMonth() + 1) * 100) + date.getDate());
		strDate = strDate.substring(0, 4) + '.' + strDate.substring(4, 6) + '.' + strDate.substring(6) + '.';
		var td = $("<td>").text(strDate);
		
		var list = calendar.dateMap[strDate];
		if (list) {
			for (var i = 0; i < list.length; i++) {
				var item = list[i];
				td.append($("<span>").data(item).text([item.time, item.movie].join(" ")));
			}
		}
		tr.append(td);
		
		date.setTime(date.getTime() + 86400000);
	}
}
function setEditForm(item) {
	$("#inputKey"    ).val(item._);
	$("#inputDate"   ).val(item.date.substring(0, 10).split(".").join("-"));
	$("#inputTime"   ).val(item.time   );
	$("#inputGroup"  ).val(item.group  ).change();
	$("#inputPlace"  ).val(item.place  );
	$("#inputScreen" ).val(item.screen );
	$("#inputMovie"  ).val(item.movie  );
	$("#inputMovieCd").val(item.movieCd);
}
function edit() {
	var $form = $("#form");
	var data = {};
	data._       = $form.find("input[name=_]"      ).val();
	data.date    = $form.find("input[name=date]"   ).val().split("-").join("");
	data.time    = $form.find("input[name=time]"   ).val().split(":").join("");
	data.group   = $form.find("input[name=group]"  ).val();
	data.place   = $form.find("input[name=place]"  ).val();
	data.screen  = $form.find("input[name=screen]" ).val();
	data.movie   = $form.find("input[name=movie]"  ).val();
	data.movieCd = $form.find("input[name=movieCd]").val();
	if (isFinite(data.time) && data.time < 10000) {
		var time = 10000 + Number(data.time) + "";
		$form.find("input[name=time]"   ).val(time.substring(1,3) + ":" + time.substring(3,5));
	} else {
		alert("잘못된 시간입니다");
		return false;
	}
	
	var status = dao.insertOrUpdate(data);
	if (status == 0) {
		if (data._) {
			alert("수정했습니다.");
		} else {
			alert("추가했습니다.");
			clearEdit(true);
		}
		refreshTab();
	} else {
		alert("실패");
	}
	
	return false;
}
function clearEdit(withTime) {
	$("body").removeClass("edit");
	$("#tab_watch .tb-list").find(".on").removeClass("on");
	
	var $form = $("#form");
	$form.find("input[name=_]").val("");
	
	if (withTime) {
		setTimeout(function() {
			var date = new Date();
			var y = date.getFullYear();
			var m = date.getMonth() + 1;
			var d = date.getDate();
			var hh = date.getHours();
			var mm = date.getMinutes();
			$form.find("input[name=date]").val(y + "-" + (m > 9 ? "" : "0") + m + "-" + (d > 9 ? "" : "0") + d);
			$form.find("input[name=time]").val((hh > 9 ? "" : "0") + hh + ":" + (mm > 9 ? "" : "0") + mm);
			$form.find("input[name=group]").change();
		}, 1);
	}
}
function searchMovieLocal(query) {
	var list = dao.getMovieList({ where: "movieNm=" + query });
	$("#inputMovie").data("obj").afterSearch(query, list);
}
function searchMovie() {
	var query = $("#popupSearchMovie input").val();
	//alert(1);
	afterSearchMovie();
	return false;
}
function afterSearchMovie(query, list) {
	var tbody = $("#popupSearchMovie tbody").empty();
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		tbody.append(
			$("<tr>").data(item)
				.append($("<td>").attr({ title: item.movieCd   }).text(item.movieCd  ))
				.append($("<td>").attr({ title: item.movieNm   }).text(item.movieNm  ))
				.append($("<td>").attr({ title: item.directors }).text(item.directors))
		);
	}
}
function refreshMovieList(param={}) {
	var list = dao.getMovieList(param);
	
	var tab = $("#tab_movie");

	var cols = [];
	tab.find("tr:eq(0) th").each(function(i) {
		cols[i] = $(this).data("order");
	});
	
	var tbody = tab.find(".tb-list > tbody").empty();
	var last = null;
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var tr = $("<tr>").data(item);
		for (var j = 0; j < cols.length; j++) {
			var col = cols[j];
			var value = col ? item[col] : "";
			tr.append($("<td>").attr("title", value).text(value));
		}
		tbody.append(tr);
	}
}

function refreshTab() {
	$(".tab-header > div.on").click();	
}

function init() {
	$(".tab-header > div").each(function(i) {
		$(this).data("index", i);
	})
	$(".tab-header").on("click", "div", function() {
		var tab = $(this);
		var index = tab.data("index");
		var header = tab.parent();
		var cover = header.parent();
		header.children().removeClass("on");
		cover.find(".tab-body > div").removeClass("on");
		tab.addClass("on");
		cover.find(".tab-body > div:eq(" + index + ")").addClass("on");
	});
	
	$("input[name=group]").on("input change propertychange", function() {
		var group = $(this).val();
		$("#form input[name=place]" ).attr("list", "place"  + group);
		$("#form input[name=screen]").attr("list", "screen" + ($("#screen" + group).length ? group : "기타"));
	});
	var ac = new OHLI.AutoComplete($("#form input[name=movie]"));
	ac.afterSelect = function() {
		$("#form input[name=movieCd]").val(this.input.data("key"));
	}
	$("#inputMovieCd").on("dblclick", function() {
		$("#popupSearchMovie").show();
		$("#popupSearchMovie input").val($("input[name=movie]").val()).focus();
	});
	$("#popupSearchMovie tbody").on("click", "tr", function() {
		var item = $(this).data();
		$("#form input[name=movieCd]").val(item.movieCd);
		$("#form input[name=movie]"  ).val(item.movieNm);
		$("#popupSearchMovie").hide();
		saveMovieInfo(item);
	});
	
	$("#tab_watch .tb-list").on("click", "tr button", function(e) {
		e.stopPropagation();
		var btn = $(this);
		var tr = btn.parents("tr");
		var key = tr.data("_");
		confirm("삭제하시겠습니까?", function() {
			deleteWatch(key);
		});
	}).on("click", "tbody tr", function() {
		var tr = $(this);
		clearEdit(false);
		$("body").addClass("edit");
		tr.addClass("on");
		setEditForm(tr.data());
	});
	$("#tbCalendar").on("click", "span", function() {
		setEditForm($(this).data());
	});
	
	$(".tab-header > div:eq(0)").on("click", function() {
		$("#tab_watch").data("st").search();
	});
	$(".tab-header > div:eq(1)").on("click", function() {
		refreshStat("watch", "group", GROUPS);
	});
	$(".tab-header > div:eq(2)").on("click", function() {
		loadCalendar();
	});
	$(".tab-header > div:eq(3)").on("click", function() {
		$("#tab_movie").data("st").search();
	});
	
	$(".tb-body").on("scroll", function() {
		var body = $(this);
		var head = body.prev();
		head.scrollLeft(body.scrollLeft());
	});
	
	$(".table-with-search").each(function() {
		var $form = $(this);
		$form.data("st", new SearchTable($form));
	});
	
	clearEdit(true);
	
	dao = new MovieLogDAO("../sqlite.db", function() {
		initDatalist(GROUPS);
		$(".tab-header > div:eq(0)").click();
	});
}