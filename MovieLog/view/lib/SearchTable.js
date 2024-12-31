function onlyNumber(value) {
	if (isFinite(value)) {
		return value;
	}
	var result = "";
	for (var i = 0; i < value.length; i++) {
		var c = value[i];
		if (isFinite(c)) {
			result += c;
		}
	}
	return result;
}
/**
 * 검색 기능 포함 테이블
 * @param $area
 * @returns
 */
function SearchTable($area) {
	this.area = $area;
	this.id = SearchTable.list.length;
	SearchTable.list.push(this);
	
	this.func = $area.data("func");
	this.where = null;
	this.orderBy = null;
	this.direction = null;
	
	$area.find("form").attr("onsubmit", "return SearchTable.list[" + this.id + "].search();").on("click", "th", function() {
		var th = $(this);
		var order = th.data("order");
		if (!order) {
			return;
		}
		
		var area = th.parents(".table-with-search");
		var st = area.data("st");
		area.find("th").removeClass("asc").removeClass("desc");
		
		if (order) {
			if (st.orderBy == order) {
				st.direction = (st.direction == "ASC") ? "DESC" : "ASC";
			} else {
				st.orderBy = order;
				st.direction = "ASC";
			}
		} else {
			st.orderBy = null;
			st.direction = null;
		}
		th.addClass(st.direction.toLowerCase());
		st.search();
	});
}
SearchTable.list = [];
SearchTable.prototype.search = function() {
	window[this.func]({ where: this.getWhere(), order: this.getOrder() });
	return false;
};
SearchTable.prototype.getWhere = function() {
	var where = [];
	var cols = [];
	this.area.find("tr:eq(0) th").each(function(i) {
		cols[i] = $(this).data("order");
	});
	
	this.area.find("input").each(function(i) {
		var input = $(this);
		var value = input.val();
		if (value) {
			var col = cols[i];
			if (col && value) {
				var isNumberOnly = col.split("$").length > 1;
				if (isNumberOnly) {
					where.push(col.split("$").join("") + "=" + onlyNumber(value));
				} else {
					where.push(col + "=" + value);
				}
			}
		}
	});
	
	return where.join("/");
}
SearchTable.prototype.getOrder = function() {
	return this.orderBy ? (this.orderBy.split("$").join("") + (this.direction ? "/" + this.direction : "")) : null;
}