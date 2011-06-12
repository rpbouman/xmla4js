var Xmla = Xmla || {};  //monkey patch existing Xmla singleton or create another empty object
Xmla.prototype.getSources = function(filter, callback) {

	var _sources = [], each, that = this;
	if (arguments.length == 1 && typeof filter == 'function' ) { //if filter not supplied just ignore
		callback = filter;
		filter = null;
	} else {
	}

	//set this up so it can be checked later
	if (typeof callback !== 'function') {
		callback = false;
	}

	this.sources = this.sources || [];
	try {
	if (this.sources.length > 0) {
		_sources = Xmla.Filter.apply(this.sources, [filter, callback]);
	} else {
		//TODO first check local storage, before going to server
		this.discoverSources(
			function (source) {
				if (Xmla.Filter.apply(source, [filter, callback])) {
					_sources.push(source);
				}
			}
		);
	}
	} catch(e) {console.log(e)}
	
	if (_sources.length == 1) {
		return _sources[0];
	} else {
		return _sources;
	}
	
}
Xmla.prototype.discoverSources = function(callback) {

	var that = this, raw_sources;
	//TODO add async support
	raw_sources = this.discoverDataSources();
	while (source = raw_sources.fetchAsObject()) {
		that.addSource(source, callback);
	}
	raw_sources.close();
	delete raw_sources;
	return this.sources;
}
Xmla.prototype.addSource = function(source, callback) {
	var ds = new Xmla.Datasource(source, this);
	this.sources.push(ds);
	if (callback && typeof callback == 'function') {
		callback(ds);
	}
	return ds;
}

/* Xmla.Datasource
*   <p>
*   This object provides pure JS constructs to create and use OLAP Datasources
*   </p>
*   <p>
*   You do not need to instantiate objects of this class yourself. YOu can use <code>Xmla.discoverSources()</code> or <code>Xmla.getSources({}, function(source) {/nconsole.log(source);})</code>
*	</p>
*   @class Xmla.Datasource
*   @constructor
*   @param {Object} source JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla} xmla The Xmla instance to be used to communicate with the server
*/
Xmla.Datasource = function Datasource(source, $x) {
	this.DataSourceDescription = source.DataSourceDescription || "";
	this.DataSourceName        = source.DataSourceName || "";
	this.DataSourceInfo        = source.DataSourceInfo || "";
	this.ProviderName          = source.Providername   || "";
	this.URL                   = source.URL            || "";
	this.catalogs              = source.catalogs       || [];
	this.xmla                  = $x || {};
}
Xmla.Datasource.prototype.getCatalogs = function getCatalogs(filter, callback) {

	var properties = {}, rowset, catalog, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this[Xmla.PROP_DATASOURCEINFO];
	rowset = this.xmla.discoverDBCatalogs({
		properties: properties
	});
	if (rowset.hasMoreRows()) {
		while (catalog = rowset.fetchAsObject()){
			this.addCatalog(catalog, callback);
		}
	} 

}
Xmla.Datasource.prototype.addCatalog = function addCatalog(catalog, callback) {
	var cat = new Xmla.Catalog(catalog, this);
	this.catalogs.push(cat);
	if (typeof callback == 'function') {
		callback(cat);
	}
	else {
		console.log('no callback in addCatalog');
	}
	return cat;
	
}

/* Xmla.Catalog
*   <p>
*   Wrapper for OLAP Catalogs
*   </p>
*   @class Xmla.Catalog
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Datasource} source The Xmla.Datasource that this catalog belongs to
*/
Xmla.Catalog = function Catalog(catalog, $s) {
	this.CATALOG_NAME  = catalog.CATALOG_NAME  || "";
	this.DATE_MODIFIED = catalog.DATE_MODIFIED || "";
	this.DESCRIPTION   = catalog.DESCRIPTION   || "";
	this.ROLES         = catalog.ROLES         || [];
	this.cubes         = catalog.cubes         || [];
	this.datasource    = $s;
}
Xmla.Catalog.prototype.getCubes = function getCubes(filter, callback) {

	var properties = {}, rowset, cube, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.CATALOG_NAME;
	rowset = this.datasource.xmla.discoverMDCubes({
		url: that.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (cube = rowset.fetchAsObject()){
			this.addCube(cube, callback);
		}                        
	} 

}
Xmla.Catalog.prototype.addCube = function addCube(cube, callback) {
	var cub = new Xmla.Cube(cube, this);
	this.cubes.push(cub);
	if (typeof callback == 'function') {
		callback(cub);
	}
	return cub;
}

/* Xmla.Cube
*   <p>
*   Wrapper for OLAP Cubes
*   </p>
*   @class Xmla.Cube
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Catalog} catalog The Xmla.Catalog that this Cube belongs to
*/
Xmla.Cube = function Cube(cube, $cat) {
	this.CUBE_NAME   = cube.CUBE_NAME || "";
	this.CUBE_TYPE   = cube.CUBE_TYPE || "CUBE";
	this.DESCRIPTION = cube.DESCRIPTION || "";
	this.IS_DRILLTHROUGH_ENABLED = cube.IS_DRILLTHROUGH_ENABLED == 'true' ? true : false;
	this.IS_LINKABLE = cube.IS_LINKABLE           == 'true' ? true : false;
	this.IS_SQL_ENABLED = cube.IS_SQL_ENABLED     == 'true' ? true : false;
	this.IS_WRITE_ENABLED = cube.IS_WRITE_ENABLED == 'true' ? true : false;
	this.LAST_SCHEMA_UPDATE = cube.LAST_SCHEMA_UPDATE || "";
	this.sets       = [];
	this.measures   = [];
	this.dimensions = [];
	this.catalog    = $cat;
}
Xmla.Cube.prototype.getDimensions = function getDimensions(filter, callback) {

	var properties = {}, rowset, obj, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.catalog.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.catalog.CATALOG_NAME;
    restrictions["CUBE_NAME"]    = this.CUBE_NAME;	
	rowset = this.catalog.datasource.xmla.discoverMDDimensions({
		url: that.catalog.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (obj= rowset.fetchAsObject()){
			this.addDimension(obj, callback);
		}                        
	} 
}
Xmla.Cube.prototype.addDimension = function addDimension(dimension, callback) {
	var dim = new Xmla.Dimension(dimension, this);
	this.dimensions.push(dim);
	if (typeof callback == 'function') {
		callback(dim);
	} else {
		console.error('no callback for addDimension');
	}
	return dim;
}
Xmla.Cube.prototype.getMeasures = function getMeasures(filter, callback) {

	var properties = {}, rowset, obj, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.catalog.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.catalog.CATALOG_NAME;
    restrictions["CUBE_NAME"]    = this.CUBE_NAME;	
	rowset = this.catalog.datasource.xmla.discoverMDMeasures({
		url: that.catalog.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (obj= rowset.fetchAsObject()){
			this.addMeasure(obj, callback);
		}                        
	} 
}
Xmla.Cube.prototype.addMeasure = function addMeasure(measure, callback) {
	var msr = new Xmla.Measure(measure, this);
	this.measures.push(msr);
	if (typeof callback == 'function') {
		callback(msr);
	} else {
		console.error('no callback for addMeasure');
	}
	return msr;
}

/* Xmla.Measure
*   <p>
*   Wrapper for OLAP Measures
*   </p>
*   @class Xmla.Measure
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Cube} cube The Xmla.Cube that this Measure belongs to
*/ 
Xmla.Measure = function Measure(measure, $cube) {
	this.DATA_TYPE = measure.DATA_TYPE || 0;
	this.DEFAULT_FORMAT_STRING = measure.DEFAULT_FORMAT_STRING || ""
	this.DESCRIPTION = measure.DESCRIPTION || "";
	this.MEASURE_AGGREGATOR = measure.MEASURE_AGGREGATOR || 0;
	this.MEASURE_IS_VISIBLE = measure.MEASURE_IS_VISIBLE || false;
	this.MEASURE_NAME       = measure.MEASURE_NAME || "";
	this.MEASURE_UNIQUE_NAME= measure.MEASURE_UNIQUE_NAME || "";
	this.cube = $cube
}

/* Xmla.Dimension
*   <p>
*   Wrapper for OLAP Dimensions
*   </p>
*   @class Xmla.Dimension
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Cube} cube The Xmla.Cube that this Dimension belongs to
*/
Xmla.Dimension = function(dim, $cube) {
	this.DEFAULT_HIERARCHY = dim.DEFAULT_HIERARCHY || "";
	this.DESCRIPTION       = dim.DESCRIPTION       || "";
	this.DIMENSION_CAPTION = dim.DIMENSION_CAPTION || "";
	this.DIMENSION_CARDINALITY = dim.DIMENSION_CARDINALITY || 0;
	this.DIMENSION_GUID = dim.DIMENSION_GUID || "";
	this.DIMENSION_IS_VISIBLE = dim.DIMENSION_IS_VISIBLE == 'true' ? true : false;
	this.DIMENSION_NAME       = dim.DIMENSION_NAME || "";
	this.DIMENSION_ORDINAL    = dim.DIMENSION_ORDINAL || 0;
	this.DIMENSION_TYPE       = dim.DIMENSION_TYPE    || 0;
	/*
*					<li>MD_DIMTYPE_UNKNOWN (0)</li>
*					<li>MD_DIMTYPE_TIME (1)</li>
*					<li>MD_DIMTYPE_MEASURE (2)</li>
*					<li>MD_DIMTYPE_OTHER (3)</li>
*					<li>MD_DIMTYPE_QUANTITATIVE (5)</li>
*					<li>MD_DIMTYPE_ACCOUNTS (6)</li>
*					<li>MD_DIMTYPE_CUSTOMERS (7)</li>
*					<li>MD_DIMTYPE_PRODUCTS (8)</li>
*					<li>MD_DIMTYPE_SCENARIO (9)</li>
*					<li>MD_DIMTYPE_UTILIY (10)</li>
*					<li>MD_DIMTYPE_CURRENCY (11)</li>
*					<li>MD_DIMTYPE_RATES (12)</li>
*					<li>MD_DIMTYPE_CHANNEL (13)</li>
*					<li>MD_DIMTYPE_PROMOTION (14)</li>
*					<li>MD_DIMTYPE_ORGANIZATION (15)</li>
*					<li>MD_DIMTYPE_BILL_OF_MATERIALS (16)</li>
*					<li>MD_DIMTYPE_GEOGRAPHY (17)</li>	
	*/
	this.DIMENSION_UNIQUE_NAME = dim.DIMENSION_UNIQUE_NAME || "";
	this.DIMENSION_UNIQUE_SETTINGS = dim.DIMENSION_UNIQUE_SETTINGS || 0;
	this.IS_VIRTUAL = dim.IS_VIRTUAL == 'true' ? true : false;
	this.IS_READWRITE = dim.IS_READWRITE == 'true' ? true : false;
	this.hierarchies = [];
	this.cube = $cube
}
Xmla.Dimension.prototype.getHierarchies = function getHierarchies(filter, callback) {
	var properties = {}, rowset, hierarchy, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.cube.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.cube.catalog.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.cube.catalog.CATALOG_NAME;
    restrictions["CUBE_NAME"]    = this.cube.CUBE_NAME;	
	restrictions["DIMENSION_UNIQUE_NAME"] = this.DIMENSION_UNIQUE_NAME;	
	rowset = this.cube.catalog.datasource.xmla.discoverMDHierarchies({
		url: that.cube.catalog.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (hierarchy = rowset.fetchAsObject()){
			this.addHierarchy(hierarchy, callback);
		}                        
	} 

}
Xmla.Dimension.prototype.addHierarchy = function addHierarchy(hierarchy, callback) {
	var hier = new Xmla.Hierarchy(hierarchy, this);
	this.hierarchies.push(hier);
	if (typeof callback == 'function') {
		callback(hier);
	}
	return hier;
}

/* Xmla.Hierarchy
*   <p>
*   Wrapper for OLAP Hierarchies
*   </p>
*   @class Xmla.Hierarchy
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Dimension} dimension The Xmla.Dimension that this Hierarchy belongs to
*/
Xmla.Hierarchy =function(hierarchy, $dim){
	this.ALL_MEMBER = hierarchy.ALL_MEMBER || "";
	this.DEFAULT_MEMBER = hierarchy.DEFAULT_MEMBER || "";
	this.DESCRIPTION    = hierarchy.DESCRIPTION || "";
	this.HIERARCHY_CAPTION = hierarchy.HIERARCHY_CAPTION || "";
	this.HIERARCHY_CARDINALITY = hierarchy.HIERARCHY_CARDINALITY || "";
	this.HIERARCHY_NAME        = hierarchy.HIERARCHY_NAME || "";
	this.HIERARCHY_ORDINAL     = hierarchy.HIERARCHY_ORDINAL || 0;
	this.HIERARCHY_UNIQUE_NAME = hierarchy.HIERARCHY_UNIQUE_NAME || "";
	this.PARENT_CHILD          = hierarchy.PARENT_CHILD == 'true' ? true : false;
	this.STRUCTURE             = hierarchy.STRUCTURE || 0;
	this.levels                = [];
	this.dimension = $dim;
}
Xmla.Hierarchy.prototype.getLevels = function getLevels(filter, callback) {
	var properties = {}, rowset, obj, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.dimension.cube.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.dimension.cube.catalog.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.dimension.cube.catalog.CATALOG_NAME;
    restrictions["CUBE_NAME"]    = this.dimension.cube.CUBE_NAME;	
	restrictions["DIMENSION_UNIQUE_NAME"] = this.dimension.DIMENSION_UNIQUE_NAME;	
	restrictions["HIERARCHY_UNIQUE_NAME"] = this.HIERARCHY_UNIQUE_NAME;
	rowset = this.dimension.cube.catalog.datasource.xmla.discoverMDLevels({
		url: that.dimension.cube.catalog.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (obj = rowset.fetchAsObject()){
			this.addLevel(obj, callback);
		}                        
	} 

}
Xmla.Hierarchy.prototype.addLevel = function addLevel(level, callback) {
	var lvl = new Xmla.Level(level, this);
	this.levels.push(lvl);
	if (typeof callback == 'function') {
		callback(lvl);
	}
	return lvl;
}

/* Xmla.Level
*   <p>
*   Wrapper for OLAP Levels
*   </p>
*   @class Xmla.Level
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Hierarchy} hierarchy The Xmla.Hierarchy that this Level belongs to
*/
Xmla.Level = function(level, $hier) {
	this.LEVEL_UNIQUE_NAME = level.LEVEL_UNIQUE_NAME;
	this.LEVEL_NAME        = level.LEVEL_NAME;
	this.LEVEL_CAPTION     = level.LEVEL_CAPTION;
	this.DESCRIPTION       = level.DESCRIPTION;
	this.CUSTOM_ROLLUP_SETTINGS = level.CUSTOM_ROLLUP_SETTINGS;
	this.LEVEL_CARDINALITY = level.LEVEL_CARDINALITY;
	this.LEVEL_NUMBER      = level.LEVEL_NUMBER;
	this.LEVEL_TYPE        = level.LEVEL_TYPE || 0;
	this.members   = [];
	// this is done because a plain $hier is just an object literal
	if ($hier instanceof Xmla.Hierarchy) {
		this.hierarchy = $hier;
	} else {
		if ($hier instanceof Object) {
			this.hierarchy = new Xmla.Hierarchy($hier);
		} else {
			if (level.hierarchy instanceof Object) {
				this.hierarchy = new Xmla.Hierarchy(level.hierarchy);
			} else {
				throw new Error('hierarchy of level is not a valid object' + $hier.toString());
			}
		}
	}
}
Xmla.Level.prototype.getMembers = function getMembers(filter, callback) {
	var properties = {}, rowset, obj, that=this;
	properties[Xmla.PROP_DATASOURCEINFO] = this.hierarchy.dimension.cube.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
    properties[Xmla.PROP_CATALOG] = this.hierarchy.dimension.cube.catalog.CATALOG_NAME;
	var restrictions = {};
	restrictions["CATALOG_NAME"] = this.hierarchy.dimension.cube.catalog.CATALOG_NAME;
    restrictions["CUBE_NAME"]    = this.hierarchy.dimension.cube.CUBE_NAME;	
	restrictions["DIMENSION_UNIQUE_NAME"] = this.hierarchy.dimension.DIMENSION_UNIQUE_NAME;	
	restrictions["HIERARCHY_UNIQUE_NAME"] = this.hierarchy.HIERARCHY_UNIQUE_NAME;
	restrictions["LEVEL_UNIQUE_NAME"]          = this.LEVEL_UNIQUE_NAME;
	rowset = this.hierarchy.dimension.cube.catalog.datasource.xmla.discoverMDMembers({
		url: that.hierarchy.dimension.cube.catalog.datasource.URL,
		properties: properties,
		restrictions: restrictions
	});
	if (rowset.hasMoreRows()) {
		while (obj = rowset.fetchAsObject()){
			this.addMember(obj, callback);
		}                        
	} 

}
Xmla.Level.prototype.addMember = function addLevel(member, callback) {
	var mem = new Xmla.Member(member, this);
	this.members.push(mem);
	if (typeof callback == 'function') {
		callback(mem);
	}
	return mem;
}

/* Xmla.Member
*   <p>
*   Wrapper for OLAP Members
*   </p>
*   @class Xmla.Member
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Level} level The Xmla.Level that this Member belongs to
*/
Xmla.Member = function(member, $level) {
	this.MEMBER_UNIQUE_NAME = member.MEMBER_UNIQUE_NAME;
	this.MEMBER_NAME        = member.MEMBER_NAME;
	this.MEMBER_TYPE        = member.MEMBER_TYPE;
	this.MEMBER_ORDINAL     = member.MEMBER_ORDINAL
	//TODO put member properties here
	//this.properties   = [];
	this.level = $level;
}

/* Xmla.Query
*   <p>
*   Wrapper for OLAP Queries
*   </p>
*   @class Xmla.Query
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Cube} cube The Xmla.Cube that this Query belongs to
*/
Xmla.Query = function(query, $cube) {
    this.cube    = $cube || {};
	//TODO add parameter support
	//this.parameters = query.parameters || [];
	this.sets    = query.sets    || []; //sets are Named Sets that are represented in WITH statement
	this.members = query.members || []; //members are calculated members that are represented in WITH statement
	this.columns = query.columns || []; //columns represent a set or array in JavaScript
	this.rows    = query.rows    || []; //rows represent a set or array in JavaScript
	this.slicer  = query.slicer  || []; //a slicer is a single tuple or object in JavaScript
	this.text    = query.text    || '';
}
Xmla.Query.prototype.add2Axis = function(obj, axis, callback) {
	if (obj instanceof Xmla.Level || obj instanceof Xmla.Measure) {
		switch (axis) {
			case 'ROW':
				this.rows.push(obj);
				break;
			case 'COLUMN':
				this.columns.push(obj);
				break;
			case 'SLICER':
				this.slicer.push(obj);
				break;
			default:
				throw new Error('Unknow axis specified');
		}
	} else {
		throw new Error('Axis members must be Xmla.Level or measure objects');
	}
}
Xmla.Query.prototype.getMDX = function() {
	var mdx = 'SELECT ', i=0,j=this.rows.length, lvl={};
	if (j>1) {
		mdx += 'non empty crossjoin(';
	}
	for (i=0;i<j;i++){
		lvl = this.rows[i];
		if (lvl.LEVEL_NUMBER == 0) {//root level, must be all
			mdx += lvl.hierarchy.ALL_MEMBER;
		} else {
			mdx += lvl.LEVEL_UNIQUE_NAME + '.members';
		}
		if (i != j-1 && i < j-1) {
			mdx += ', '
		}
	}
	if (j>1) {
		mdx += ')';
	}
	
	mdx += ' ON ROWS, ';
	if (this.columns.length >1){
		//mdx += ' non empty crossjoin(';
		mdx += ' {';
	}
	for (i=0,j=this.columns.length;i<j;i++){
		var col = this.columns[i];
		if (this.col instanceof Xmla.Level) {
			mdx += this.columns[i].LEVEL_UNIQUE_NAME + '.members';
		} else { //must be a measure
			mdx += this.columns[i].MEASURE_UNIQUE_NAME;
		}
		if (i != j-1 && i < j-1) {
			mdx += ', '
		}
	}
	if (j>1) {
		mdx += '}';
	}
	mdx += ' ON COLUMNS ';
	mdx += ' FROM [' + this.cube.CUBE_NAME + ']';
	return mdx;
}
Xmla.Query.prototype.execute = function(callback) {
	var that=this, properties = {}, mdx, tab_results;
	properties[Xmla.PROP_DATASOURCEINFO] = this.cube.catalog.datasource[Xmla.PROP_DATASOURCEINFO];
	properties[Xmla.PROP_CATALOG]        = this.cube.catalog.CATALOG_NAME;
	properties[Xmla.PROP_FORMAT]         = 'Tabular';
	//TODO support MD result sets
	//properties[Xmla.PROP_FORMAT]         = 'Multidimensional';
	
	mdx = this.getMDX();
	//TODO Add asynch capability
	try {
		res = this.cube.catalog.datasource.xmla.executeTabular({
		//var res = this.cube.catalog.datasource.xmla.executeMultiDimensional({
			statement: mdx,
			properties: properties
			});
		tab_results = new Xmla.Results.Tabular({columns:res.getFields(), data:res.fetchAllAsArray()}, this)
		} catch(e) {
			//console.log(res);
			alert(e);
			return;
		}
		delete res;
	if (typeof callback == 'function') {
		callback.call(this, tab_results);
		delete tab_results;
	} else {
		return tab_results;
	}
}

Xmla.Results = {};
/* Xmla.Results
*   <p>
*   Wrapper for OLAP Query Results
*   </p>
*   @class Xmla.Results.Tabular
*   @constructor
*   @param {Object} JS object representing object properties.  Often used to rehydrate objects after external persistence
*   @param {Xmla.Query} cube The Xmla.Query that this Results belongs to
*/
Xmla.Results.Tabular = function(results, $query) {
	this.query  = $query || {};
	this.columns = results.columns || [];
	//no rows in tabular result sets
	this.data    = results.data    || [];
}

Xmla.Results.Dimensional = function(results, $query) {
	this.query  = $query || {};
	this.columns = results.columns || [];
	this.rows    = results.rows    || [];
	this.data    = results.data    || [];
}

/* Xmla.Filter
	//TODO could use underscore.js
   Xmla.Filter will filter an object or array of objects base on
   filter.property, filter.value and filter.type
   where filter.type is in ('equal', 'gt', 'lt')
   this function can be called for any object with properties using this as scope
   sample usage:
		var a = [], obj;
		a.push({id:1, val:"One", descr:"Hey"});
		a.push({id:2, val:"Two", descr:"Hey"});
		a.push({id:3, val:"Three", descr:"Nope"});
		var display = function(val) {
			console.log("Matched");
			console.log(val);
		};
		Xmla.Filter.apply(a, [
				{property:"id", value:"2", type:"equal"}, 
				display
		]);
*/
Xmla.Filter = function(filter, callback) {
	//console.log("this");console.log(this);
	//console.log("filter");console.log(filter);
	var _sources = [], _source;
	//if we are processing an array, then loop through each for filtering
	if (this instanceof Array) {
		//console.log('filter an array');console.log(this);
		for (var i=0,j=this.length;i<j;i++) {
			_source = Xmla.Filter.apply(this[i], [filter, callback]);
			if (_source) {
				_sources.push(_source);
			}
		}
		//after processing each piece of the array, stop processing the array itself.
		return _sources;
	} else {
		//this is not an array, so continue with filter
	}

	//if filter not supplied then use filter arg as callback arg
	if (arguments.length == 1 && typeof filter == 'function' ) {
		callback = filter;
		filter = null;
	}
	//make an empty function so that future calls just go through
	if (typeof callback !== 'function') {
		callback = function(){};
	}

	var i=0,j=0;
	//if no filter then return this
	if (filter == null ) {
		callback(this);
		return this;
	} else {
		//some filter was supplied, try to see if there is a match for equality
		//TODO add other conditions: contains, starts, ends
		try {
			switch (filter.type) {
				case 'gt':
					if (this[filter.property] > filter.value) {
						callback(this);
						return this;
					} else {
						//console.log('no match for:' + this[filter.property] + ':' + filter.value);
						return null;
					}
					break;
				case 'lt':
					if (this[filter.property] < filter.value) {
						callback(this);
						return this;
					} else {
						//console.log('no match for:' + this[filter.property] + ':' + filter.value);
						return null;
					}
					break;
				case 'equal':
					//letting equal fall through to default
				default:
					if (this[filter.property] == filter.value) {
						//console.log('found match');console.log(this);
						callback(this);
						return this;
					} else {
						//console.log('no match for:' + this[filter.property] + ':' + filter.value);
						return null;
					}
			}
		} catch(e) {
			//just move on to next
			return null;
		}
	}
}
