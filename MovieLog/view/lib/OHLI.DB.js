function Column(name, type, isIndex=false) {
	this.name = name;
	this.type = type;
	this.isIndex = isIndex;
}

function Table(name, columns, migrations=[]) {
	this.name = name;
	this.columns = columns;
	this.migrations = migrations;
}
Table.prototype.creations = function() {
	var sqls = [];
	sqls.push('');
	
	var cols = '';
	for (var i = 0; i < columns.length; i++) {
		var column = columns[i];
		cols += ', "' + column.name + '" ' + column.type;
		if (column.isIndex) {
			sqls.push('CREATE INDEX "index_{name}_{col}" ON "{name}" ("{col}")'.split('{name}').join(this.name).split('{col}').join(column.name));
		}
	}
	sqls[0] = 'CREATE TABLE IF NOT EXISTS "' + this.name + '" ("_" INTEGER PRIMARY KEY AUTOINCREMENT' + cols + ')';
	
	return sqls;
}
Table.prototype.preparedInsert = function() {
	var cols = [];
	for (var i = 0; i < this.columns.length; i++) {
		var column = this.columns[i];
		cols.push(column.name);
	}
	return 'INSERT INTO "' + this.name + '" ("' + cols.join('", "') + '") VALUES ($' + cols.join(', $') + ')';
}
Table.prototype.preparedUpdate = function() {
	var cols = [];
	for (var i = 0; i < this.columns.length; i++) {
		var column = this.columns[i];
		cols.push('"' + column.name + '"=$' + column.name);
	}
	return 'UPDATE "' + this.name + '" SET ' + cols.join(', ') + ' WHERE "_"=$_';
}
Table.prototype.preparedDelete = function() {
	return 'DELETE FROM "' + this.name + '" WHERE "_"=$_';
}

function DAO(url, afterLoadDB) {
	var self = this;
	initSqlJs().then(function(SQL) {
		var req = new XMLHttpRequest();
		req.open('GET', url);
		req.responseType = 'arraybuffer';
		req.onload = function(e) {
			var buffer = req.response;
			self.DB = new SQL.Database(new Uint8Array(buffer));
			if (afterLoadDB) {
				afterLoadDB();
			}
		}
		req.onerror = function(e) {
			alert('DB를 불러오지 못했습니다.');
		}
		req.send();
	});
}
DAO.makeSearchQuery = function(param) {
	var query = "";
	if (param.where) {
		var wheres = param.where.split('/');
		for (var i = 0; i < wheres.length; i++) {
			var key = '$w' + i;
			var item = wheres[i].split('=');
			var col = item[0].split(',').join("`||' '||`");
			param[key] = ("%" + item[1].split(" ").join("%") + "%");
		}
		query += ' AND `' + col + '` LIKE ' + key;
	}
	if (param.order) {
		var orders = param.order.split('/');
		var cols = orders[0].split(',');
		var direction = orders.length == 1 ? 'ASC' : orders[1];
		
		orders = [];
		for (var i = 0; i < cols.length; i++) {
			orders.push('`' + cols[i] + '` ' + direction);
		}
		query += ' ORDER BY ' + orders.join(", ");
	}
	return query;
}
