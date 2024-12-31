class MovieLogDAO extends DAO {}

MovieLogDAO.prototype.getPlaceLists = function(groups=[]) {
	var ps = this.DB.prepare(
			'SELECT place, COUNT(*) cnt '
		+	'  FROM watch               '
		+	' WHERE `group` = $group    '
		+	' GROUP BY place            '
		+	' ORDER BY cnt DESC         '
		+	'        , place ASC        '
	);
	var result = {};
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		var list = [];
		
		ps.bind({ $group: group });
		while (ps.step()) {
			list.push(ps.getAsObject().place);
		}
		result[group] = list;
	}
	return result;
}
MovieLogDAO.prototype.getScreenLists = function(groups=[]) {
	var ps = this.DB.prepare(
			'SELECT screen, COUNT(*) cnt '
		+	'  FROM watch                '
		+	' WHERE `group` = $group     '
		+	' GROUP BY screen            '
		+	' ORDER BY cnt DESC          '
		+	'        , screen ASC        '
	);
	var result = {};
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		var list = [];
		
		ps.bind({ $group: group });
		while (ps.step()) {
			list.push(ps.getAsObject().screen);
		}
		result[group] = list;
	}
	return result;
}
MovieLogDAO.prototype.getWatchList = function(param={}) {
	if (!param.order) param.order = 'date,time/DESC';
	
	var list = [];

	var sql = 'SELECT _, date, time, `group`, place, screen, movie, movieCd FROM watch WHERE 1=1';
	if (param.year) {
		sql += ' AND date > $by AND date < $ey';
		param.$by = (param.year + '0000');
		param.$ey = (param.year + '9999');
	}
	if (param.month) {
		sql += ' AND date > $bm AND date < $em';
		param.$bm = (param.month + '00');
		param.$em = (param.month + '99');
	}
	if (param.group) {
		if (param.group == 'other') {
			sql += ' AND `group` NOT IN ("CGV", "메가박스", "롯데시네마")';
		} else {
			sql += ' AND "group" = $group';
			param.$group = param.group;
		}
	}
	sql += DAO.makeSearchQuery(param);
	
	var ps = this.DB.prepare(sql);
	ps.bind(param);
	while (ps.step()) {
		var item = ps.getAsObject();
		var date = '' + item.date;
		var time = ('' + (item.time + 10000)).substring(1);
		item.date = date.substring(0, 4) + '.' + date.substring(4, 6) + '.' + date.substring(6) + '.';
		item.time = time.substring(0, 2) + ':' + time.substring(2);
		list.push(item);
	}
	
	return list;
}

MovieLogDAO.Stat = function(DB, groups) {
	this.DB = DB;
	this.groups = groups;
	this.years = [];
	this.yMap = [];
	this.mMap = [];
}
MovieLogDAO.Stat.prototype.addYear = function(item) {
	this.years.push(item.Y);
	this.yMap[item.Y] = {};
	this.setValues(item, 'total');
}
MovieLogDAO.Stat.prototype.setValues = function(item, name, where="") {
	this.yMap[item.Y][name] = item.CNT;
	
	var ps = this.DB.prepare(
				'SELECT M, COUNT(*) CNT    '
			+	'  FROM (SELECT SUBSTR(date, 1, 6) AS M '
			+	'          FROM watch      '
			+	'         WHERE date > $d1 '
			+	'           AND date < $d2 ' + where
			+	'       )                  '
			+	' GROUP BY M               '
			+	' ORDER BY M DESC          '
	);
	ps.bind({
			$d1: item.Y + "0000"
		,	$d2: item.Y + "9999"
	});
	while (ps.step()) {
		var item = ps.getAsObject();
		var mItem = this.mMap[item.M];
		if (mItem == null) {
			this.mMap[item.M] = mItem = {};
		}
		mItem[name] = item.CNT;
	}
}
MovieLogDAO.Stat.QUERY
	=	'SELECT Y, COUNT(*) CNT '
	+	'  FROM (SELECT SUBSTR(date, 1, 4) AS Y '
	+	'          FROM {TABLE} '
	+	'        {WHERE}        '
	+	'       )               '
	+	' GROUP BY Y            '
	+	' ORDER BY Y DESC       ';
MovieLogDAO.prototype.getStat = function(table, col, groups) {
	
	var stat = new MovieLogDAO.Stat(this.DB, groups);
	
	var query = MovieLogDAO.Stat.QUERY.split('{TABLE}').join(table);
	
	var ps = this.DB.prepare(query.split('{WHERE}').join(''));
	while (ps.step()) {
		stat.addYear(ps.getAsObject());
	}
	
	var without = '';
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		var where =  (' AND `{COL}` LIKE "{group}"').split('{COL}').join(col).split('{group}').join(group);
		ps = this.DB.prepare(query.split('{WHERE}').join(' WHERE 1=1' + where));
		while (ps.step()) {
			stat.setValues(ps.getAsObject(), group, where);
		}
		without += ' AND `{COL}` NOT LIKE "{group}"'.split('{COL}').join(col).split('{group}').join(group);
	}
	
	ps = this.DB.prepare(query.split('{WHERE}').join(' WHERE 1=1' + without));
	while (ps.step()) {
		stat.setValues(ps.getAsObject(), 'other', where);
	}
	
	return stat;
}

MovieLogDAO.prototype.getCalendar = function() {
	var begin = null;
	var dateMap = {};
	
	var ps = this.DB.prepare(
			'SELECT _, date, time, `group`, place, screen, movie '
		+	'  FROM watch         '
		+	' ORDER BY date, time '
	);
	while (ps.step()) {
		var item = ps.getAsObject();
		var date = "" + item.date;
		if (begin == null) {
			begin = new Date();
			begin.setDate(1);
			begin.setFullYear(    date.substring(0,4));
			begin.setMonth(Number(date.substring(4,6)) - 1);
			begin.setDate (Number(date.substring(6,8)));
			begin.setTime(begin.getTime() - (((begin.getDay() + 6) % 7) * 86400000));
		}
		var time = pad(item.time, 4);
		item.date = date = date.substring(0, 4) + '.' + date.substring(4, 6) + '.' + date.substring(6) + '.';
		item.time = time.substring(0, 2) + ':' + time.substring(2);
		item.month = ("" + item.date).substring(0, 6);

		var list = dateMap[date];
		if (list == null) {
			dateMap[date] = list = [];
		}
		list.push(item);
	}
	
	return {
			begin: (begin == null ? 9 : begin.getTime())
		,	dateMap: dateMap
	};
}

MovieLogDAO.prototype.getMovieList = function(param={}) {
	if (!param.order) param.order = "movieNm";

	var list = [];
	
	var sql
		=	'SELECT movieCd, movieNm, movieNmEn, prdtYear, openDt, typeNm, prdtStatNm '
		+	'     , nationAlt, genreAlt, repNationnm, repGenreNm, directors           '
		+	'     , peopleNm, companys, companyCd, companyNm, count                   '
		+	'  FROM movie WHERE 1=1                                                   ';
	sql += DAO.makeSearchQuery(param);
	
	var ps = this.DB.prepare(sql);
	ps.bind(param);
	while (ps.step()) {
		list.push(ps.getAsObject());
	}
	
	return list;
}

MovieLogDAO.prototype.insertOrUpdate = function(item) {
	var status = 0;

	// 필수값 체크
	var required = ["date", "time", "movie"];
	for (var i = 0; i < required.length; i++) {
		if (!item[required[i]]) {
			status = 1;
			break;
		}
	}
	
	if (status == 0) {
		if (item.date.length == 8 && item.time.length == 4) {
			var ps = this.DB.prepare(TABLE_WATCH[item._ ? "preparedUpdate" : "preparedInsert"]());
			ps.bind({
					$_      : item._
				,	$date   : Number(item.date)
				,	$time   : Number(item.time)
				,	$group  : item.group
				,	$place  : item.place
				,	$screen : item.screen
				,	$movie  : item.movie
				,	$movieCd: item.movieCd
			});
			if (!ps.run()) {
				status = 2;
			}
			
		} else {
			status = 3;
		}
	}
	
	return status;
}

function pad(value, length) {
	var result = "" + value;
	while (result.length < length) {
		result = "0" + result;
	}
	return result;
}