(function(){

Xmla.Dataset.AxisMember = function(){
    this.axisHierarchyLevel = null;
    this.tuples = null;
    this.parent = null;
    this.children = null;    
}

Xmla.Dataset.Tuple = function(){
    this.axisMembers = null;
}

Xmla.Dataset.Level = function(){
    this.axisHierarchy = null;
    this.axisMembers = null;
}

Xmla.Dataset.Hierarchy = function(){
    this.cubeHierarchy = null;
    this.levels = null;
    this.axisMembers = null;
}

Xmla.Dataset.Axis = function(){
    this.tuples = null;
    this.axisHierarchies = null;
    return this;
}

Xmla.Dataset = function(){
    this.cubeName = null;
    this.dimensions = null;
    this.measures = null;
    this.axes = null;
    this.cells = null;
    return this;
};

Xmla.Dataset.prototype = {
};

})();