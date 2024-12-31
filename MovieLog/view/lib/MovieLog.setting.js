var VERSION = "20240312v01";

var TABLE_WATCH = new Table("watch", [
		new Column("date"   , "INTEGER", true)
	,	new Column("time"   , "INTEGER")
	,	new Column("group"  , "TEXT", true)
	,	new Column("place"  , "TEXT")
	,	new Column("screen" , "TEXT")
	,	new Column("movie"  , "TEXT", true)
	,	new Column("movieCd", "TEXT", true)
]);

var GROUPS = ["CGV", "메가박스", "롯데시네마"];
