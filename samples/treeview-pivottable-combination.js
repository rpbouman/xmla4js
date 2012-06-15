(function(){

var win = window,
    doc = document,
    body = doc.body
;
function clearBrowserSelection() {
    if (win.getSelection){
        win.getSelection().removeAllRanges();
    }
    else
    if (doc.selection) {
        doc.selection.clear();
    }
}

function merge(dst, src, mode){
    var p,v;
    mode = parseInt(mode, 10);
    mode = mode ? mode : 0;
    if (!iObj(dst)) {
        dst = {};
    }
    for (p in src) {
        o = src[p]
        if (((o===null) && (mode & merge.DELETE_IF_NULL)) || (mode & merge.DELETE)) {
            delete dst[p];
        }
        else
        if (iUnd(dst[p]) || (mode & merge.OVERWRITE)) {
            dst[p] = o;
        }
    }
    return dst;
}

merge.MERGE = 0;
merge.OVERWRITE = 1;
merge.DELETE_IF_NULL = 2;
merge.DELETE = 4;

function iFun(a){return typeof(a) === "function";}
function iUnd(a){return typeof(a) === "undefined";}
function iNum(a){return typeof(a) === "number";}
function iStr(a){return typeof(a) === "string";}
function iInt(a){return parseInt(a) === a;}
function iArr(a){return a && a.constructor === Array;}
function iObj(a){return a!==null && typeof(a) === "object";}
function iNod(a){return iObj(el) && el.nodeType===1;}
function gEl(id) {
    if (iStr(id)) id = doc.getElementById(id);
    return id;
}
function gEls(node, tag, idx){
    var node = node.getElementsByTagName(tag);
    if (node && iInt(idx)) {
        node = node.item(idx);
    }
    return node;
}
function sAtts(e, atts){
    e = gEl(e);
    var name, val;
    for (name in atts) {
        val = atts[name];
        if (iArr(val)) {
            val = val.join(" ");
        }
        else
        if (iObj(val)) {
            if (name === "style"){
                var p, s = "";
                for (p in val) {
                    s += p + ": " + val[p] + ";";
                }
                val = s;
            }
            else {
                val = val.toString();
            }
        }
        e.setAttribute(name, val);
    }
}

function gAtt(e, att){
    return gEl(e).getAttribute(att);
}

function sAtt(e, att, val){
    gEl(e).setAttribute(att, val);
}

function rAtt(e, att){
    gEl(e).removeAttribute(att);
}

function aCh(e, chs) {
    var m;
    e = gEl(e);
    if (!iArr(chs)){
        chs = [chs];
    }
    for (var i = 0, n = chs.length, c; i < n; i++){
        c = chs[i];
        if (iStr(c)) {
            c = doc.createTextNode(c);
        }
        e.appendChild(c);
    }
}

function cEl(tag, atts, chs, p){
    var el = doc.createElement(tag);
    if (atts) {
        sAtts(el, atts);
    }
    if (chs) {
        aCh(el, chs);
    }
    if (p) {
        aCh(p, el)
    }
    return el;
}

function dEl(el) {
    var el = gEl(el);
    el.parentNode.removeChild(el);
}

function pos(e1, e2){
    var left = 0, top = 0;
    e1 = gEl(e1);
    do {
        left += e1.offsetLeft;
        top += e1.offsetTop;
    } while (e1 = e1.offsetParent);

    if (e2) {
        var p = pos(e2);
        left -= p.left;
        top -= p.top;
    }

    return {
        left: left,
        top: top
    };
}
/***************************************************************
*
*   TreeNode
*
***************************************************************/
var TreeNode;
(TreeNode = function(conf){
    this.conf = conf;
    this.id = ++TreeNode.id;
    TreeNode.instances[this.getId()] = this;
    if (conf.parentTreeNode) {
        TreeNode.getInstance(conf.parentTreeNode).appendTreeNode(this);
    }
    else
    if (conf.parentElement) {
        this.appendToElement(gEl(conf.parentElement));
    }
}).prototype = {
    getConf: function() {
        return this.conf;
    },
    appendToElement: function(el) {
        aCh(el, this.getDom());
    },
    appendTreeNode: function(treeNode){
        aCh(this.getDomBody(), treeNode.getDom());
    },
    getId: function(){
        return TreeNode.prefix + this.id;
    },
    getState: function(){
        return this.conf.state || TreeNode.states.collapsed;
    },
    getCustomClass: function(){
        return this.conf.customClass;
    },
    getTitle: function(){
        return this.conf.title;
    },
    getDom: function() {
        var dom;
        if (!(dom = gEl(this.getId()))){
            dom = this.initDom();
        }
        return dom;
    },
    getDomBody: function() {
        return gEls(this.getDom(), "DIV", 1);
    },
    toggle: function() {
        var state = this.getState();
        switch (state) {
            case TreeNode.states.collapsed:
                state = TreeNode.states.expanded;
                break;
            case TreeNode.states.expanded:
                state = TreeNode.states.collapsed;
                break;
        }
        this.setState(state);
    },
    setState: function(state){
        this.conf.state = state;
        this.initClass(this.getDom());
        if (state === TreeNode.STATE_COLLAPSED || gEls(this.getDomBody(), "DIV").length) return;
        this.loadChildren();
    },
    loadChildren: function() {
        var me = this, loader = me.conf.loadChildren;
        if (loader) {
            var ajaxLoader = cEl("IMG", {
                src: "ajax-loader-small.gif"
            }, null, me.getDomBody()),
            f = function(){
                loader.call(me, function(){
                    dEl(ajaxLoader);
                });
            }
            setTimeout(f, 1);
        }
    },
    initClass: function(dom) {
        dom.className = TreeNode.prefix +
                    " " + this.getState() +
                    " " + this.getCustomClass()
        ;
    },
    initDom: function() {
        var dom = cEl("DIV", {
            id: this.getId()
        }, [
            cEl("DIV", {
                "class": "head",
                title: this.conf.tooltip || this.conf.title
            }, [
                cEl("SPAN", {
                    "class": "toggle"
                }),
                cEl("SPAN", {
                    "class": "label"
                }, this.getTitle())
            ]),
            cEl("DIV", {
                "class": "body"
            })
        ]);
        ;
        this.initClass(dom);
        return dom;
    },
    eachChild: function() {
    }
};
TreeNode.states = {
    collapsed: "collapsed",
    expanded: "expanded",
    leaf: "leaf"
};
TreeNode.id = 0;
TreeNode.prefix = "node";
TreeNode.instances = {};
TreeNode.getInstance = function(id){
    if (iInt(id)) id = TreeNode.prefix + id;
    return TreeNode.instances[id];
};
TreeNode.lookupTreeNode = function(el){
    while (el && el.className.indexOf(TreeNode.prefix)) {
        if ((el = el.parentNode) === doc) return null;
    }
    return TreeNode.getInstance(el.id);
};

/***************************************************************
*
*   Event
*
***************************************************************/
var Event;
(Event = function(e) {
    if (!e) {
        e = win.event;
    }
    this.browserEvent = e;
    return this;
}).prototype = {
    getTarget: function(){
        var browserEvent = this.browserEvent;
        if (browserEvent.target) {
            target = browserEvent.target;
        }
        else
        if (browserEvent.srcElement) {
            target = browserEvent.srcElement
        }
        else {
            target = null;
        }
        return target;
    },
    getButton: function(){
        if (doc.addEventListener) {
            return this.browserEvent.button;
        }
        else
        if (doc.attachEvent) {
            switch (this.browserEvent.button) {
                case 1:
                    return 0;
                case 2:
                    return 2;
                case 4:
                    return 1;
            }
        }
        return null;
    },
    getKeyCode: function(){
        return this.browserEvent.keyCode;
    },
    getShiftKey: function(){
        return this.browserEvent.shiftKey;
    },
    getCtrlKey: function(){
        return this.browserEvent.ctrlKey;
    },
    getXY: function(){
        //var p = pos(this.getTarget());
        return {
            x: this.browserEvent.clientX,
            y: this.browserEvent.clientY
        }
    },
    preventDefault: function() {
        this.browserEvent.preventDefault();
    },
    save: function(){
        var proto = Event.prototype, savedEvent = new Event.Saved(), property;
        for (property in proto) {
            if (property.indexOf("get")===0 && iFun(proto[property])) {
                savedEvent[
                    property.substr(3,1).toLowerCase() + property.substr(4)
                ] = this[property]();
            }
        }
        return savedEvent;
    }
};

(Event.Saved = function() {
}).prototype = {
    destroy: function(){
        for (var p in this) {
            if (this.hasOwnProperty(p)){
                delete this.p;
            }
        }
    }
};

for (property in Event.prototype) {
    if (property.indexOf("get")===0 && iFun(Event.prototype[property])) {
        Event.Saved.prototype[property] = new Function(
            "return this." + property.substr(3,1).toLowerCase() + property.substr(4) + ";"
        )
    }
}

var GlobalEvent = new Event(null);

Event.get = function(e) {
    if (!e) {
        e = win.event;
    }
    GlobalEvent.browserEvent = e;
    return GlobalEvent;
};

function listen(node, type, listener, scope) {
    if (!scope) {
        scope = win;
    }
    node = gEl(node);
    if (node.addEventListener) {
        node.addEventListener(type, function(e){
            listener.call(scope, Event.get(e));
        }, true);
    }
    else
    if (node.attachEvent){
        node.attachEvent("on" + type, function(){
            listener.call(scope, Event.get(win.event));
        });
    }
}
/***************************************************************
*
*   DDHandler
*
***************************************************************/
var DDHandler;
(DDHandler = function (config) {
    config = merge(config, {
        node: doc.body
    });
    var me = this;
    me.listeners = [];
    me.endDragListeners = null;
    me.whileDragListeners = null;
    me.node = (node = gEl(config.node));
    me.mousedown = false;
    me.initdrag = false;
    if (config.dragProxy!==false) {
        if (!(me.dragProxy = gEl(config.dragProxy))) {
            me.dragProxy = cEl("DIV", null, null, node);
        }
    }
    if (config.dropProxy!==false) {
        if (!(me.dropProxy = gEl(config.dropProxy))) {
            me.dropProxy = cEl("DIV", null, null, node);
        }
    }
    me.startDragEvent = null;
    listen(this.node, "mousedown", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseDown(e);
        }
    }, this);
    listen(this.node, "mouseup", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseUp(e);
        }
    }, this);
    listen(this.node, "mousemove", function(e){
        me.event = e;
        me.handleMouseMove(e);
    }, this);
}).prototype = {
    listen: function(listener){
        if (!listener.scope) {
            listener.scope = win;
        }
        this.listeners.push(listener);
    },
    handleMouseDown: function(e) {
        var me = this;
        me.mousedown = true;
        if (!me.initdrag) {
            me.initdrag = true;
            me.startDrag(e);
        }
    },
    handleMouseUp: function(e){
        var me = this;
        if (me.mousedown) {
            if (me.initdrag) {
                me.initdrag = false;
                me.endDrag(e);
            }
            me.mousedown = false;
        }
    },
    handleMouseMove: function(e) {
        var me = this;
        if (me.mousedown) {
            if (!me.initdrag) {
                me.initdrag = true;
                me.startDrag(e);
            }
            else {
                me.whileDrag(e);
            }
        }
    },
    startDrag: function(e) {
        var me = this, i,
            listeners = me.listeners,
            n = listeners.length,
            listener
        ;
        me.endDragListeners = [];
        me.whileDragListeners = [];
        me.startDragEvent = e.save();
        for (i = 0; i < n; i++) {
            listener = listeners[i];
            if (listener.startDrag.call(listener.scope, e, me)!==true) continue;
            if (iFun(listener.endDrag)) me.endDragListeners.push(listener);
            if (iFun(listener.whileDrag)) me.whileDragListeners.push(listener);
        }
    },
    endDrag: function(e) {
        var me = this, i, listeners, listener, n;
        if (me.startDragEvent) {
            listeners = me.listeners;
            n = listeners.length;
            for (i = 0; i < n; i++) {
                listener = listeners[i];
                listener.endDrag.call(listener.scope, e, me)
            }
            me.startDragEvent.destroy();
            me.startDragEvent = null;
        }
        me.endDragListeners = null;
        me.whileDragListeners = null;
    },
    whileDrag: function(e) {
        var me = this, i, n, listeners, listener;
        if (me.startDragEvent) {
            listeners = me.listeners;
            n = listeners.length;
            for (i = 0; i < n; i++) {
                listener = listeners[i];
                listener.whileDrag.call(listener.scope, e, me);
            }
            clearBrowserSelection();
        }
    }
};

/***************************************************************
*
*   QueryDesigner
*
***************************************************************/
var QueryDesigner;

(QueryDesigner = function(conf) {
    this.id = QueryDesigner.id++;
    this.conf = conf;
    this.axes = {};
    this.createAxes();
}).prototype = {
    setCube: function(cube) {
        this.cube = cube;
    },
    reset: function() {
        for (var p in this.axes) {
            this.axes[p].reset();
        }
        this.dimensions = {};
        this.render();
    },
    addDimension: function(dimension, axis) {
        this.dimensions[dimension] = axis;
    },
    createAxis: function(conf) {
        conf = merge(conf, {
            queryDesigner: this
        });
        this.axes[conf.id] = new QueryDesignerAxis(conf);
    },
    createAxes: function() {
        this.createAxis({id: Xmla.Dataset.AXIS_COLUMNS});
        this.createAxis({id: Xmla.Dataset.AXIS_ROWS});
        this.createAxis({id: Xmla.Dataset.AXIS_PAGES});
    },
    getAxis: function(id) {
        return this.axes[id];
    },
    getAxisForHierarchy: function(hierarchyUniqueName) {
        var axis;
        if ((axis = this.getAxis(Xmla.Dataset.AXIS_COLUMNS)).hasHierarchy(hierarchyUniqueName)) return axis;
        if ((axis = this.getAxis(Xmla.Dataset.AXIS_ROWS)).hasHierarchy(hierarchyUniqueName)) return axis;
        if ((axis = this.getAxis(Xmla.Dataset.AXIS_PAGES)).hasHierarchy(hierarchyUniqueName)) return axis;
        return null;
    },
    getId: function() {
        return QueryDesigner.prefix + QueryDesigner.id;
    },
    createDom: function() {
        var id = this.getId(),
            dom = this.dom = cEl("TABLE", {
                id: id,
                "class": "query-designer",
                cellspacing: 0
            }),
            r, c
        ;
        r = dom.insertRow(dom.rows.length);
        c = r.insertCell(r.cells.length);
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_PAGES).getDom());

        r = dom.insertRow(dom.rows.length);
        c = r.insertCell(r.cells.length);
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_ROWS).getDom());

        c = r.insertCell(r.cells.length);
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_COLUMNS).getDom());

        return dom;
    },
    getDom: function() {
        var el = gEl(this.getId());
        if (!el) {
            el = this.createDom();
        }
        return el;
    },
    render: function() {
        var container = this.getContainer();
        container.innerHTML = "";
        aCh(container, this.getDom());
        this.horizontalDragProxy = cEl("DIV", {"class": "query-designer-horizontal-drag-proxy"}, null, container);
        this.verticalDragProxy = cEl("DIV", {"class": "query-designer-vertical-drag-proxy"}, null, container);
    },
    hideProxies: function() {
        if (this.horizontalDragProxy) this.horizontalDragProxy.style.display = "none";
        if (this.verticalDragProxy) this.verticalDragProxy.style.display = "none";
    },
    getContainer: function() {
        return gEl(this.conf.container);
    },
    getMdx: function() {
        var mdx = "", axis, axisMdx;
        if ((axisMdx = this.getAxis(Xmla.Dataset.AXIS_COLUMNS).getMdx()).length) {
            mdx += " " + axisMdx;
            if ((axisMdx = this.getAxis(Xmla.Dataset.AXIS_ROWS).getMdx()).length) {
                mdx += "\n,      " + axisMdx;
                if ((axisMdx = this.getAxis(Xmla.Dataset.AXIS_PAGES).getMdx()).length) {
                    mdx += "\n,      " + axisMdx;
                }
            }
        }
        if (mdx.length) {
            mdx = "SELECT" + mdx +
                "\nFROM   [" + this.cube.cube.CUBE_NAME + "]"
            ;
        }
        return mdx;
    },
    axisChanged: function(axis) {
        if (iFun(this.queryChanged)){
            this.queryChanged(this);
        }
    }
};
QueryDesigner.id = 0;
QueryDesigner.prefix = "query-designer";

/***************************************************************
*
*   QueryDesignerAxis
*
***************************************************************/
var QueryDesignerAxis;
(QueryDesignerAxis = function(conf){
    this.conf = conf;
    this.dimensions = null;
    this.hierarchies = null;
    this.setDefs = null;
    QueryDesignerAxis.instances[this.getId()] = this;
}).prototype = {
    getQueryDesigner: function() {
        return this.conf.queryDesigner;
    },
    reset: function() {
        this.hierarchies = [];
        this.dimensions = {};
        this.setDefs = {};
    },
    getLayout: function() {
        return (this.conf.id === Xmla.Dataset.AXIS_ROWS ? "vertical" : "horizontal");
    },
    getId: function(){
        return this.conf.queryDesigner.getId() + "-axis" + this.conf.id;
    },
    createDom: function() {
        var dom = this.dom = cEl("TABLE", {
                id: this.getId(),
                "class": QueryDesignerAxis.prefix + " query-designer-axis" + this.conf.id,
                cellspacing: 5
            }),
            r = dom.insertRow(0),
            c = r.insertCell(0),
            t
        ;
        c.className = "query-designer-axis-header";
        switch (this.conf.id) {
            case 0: t = "Columns"; break;
            case 1: t = "Rows"; break;
            case 2: t = "Pages"; break;
        }
        c.innerHTML = t;
        return dom;
    },
    getDom: function() {
        var el = gEl(this.getId());
        if (!el) {
            el = this.createDom();
        }
        return el;
    },
    hasHierarchy: function(hierarchy) {
        return this.getHierarchyIndex(hierarchy)!==-1;
    },
    getHierarchyIndex: function(name) {
        for (var h = this.hierarchies, i = 0, n = h.length; i < n; i++){
            if (this.getHierarchyName(h[i]) === name) return i;
        }
        return -1;
    },
    getHierarchyByName: function(name) {
        for (var h = this.hierarchies, i = 0, n = h.length; i < n; i++){
            if (this.getHierarchyName(h[i]) === name) return h[i];
        }
        return null;
    },
    getHierarchyByIndex: function(index) {
        return this.hierarchies[index];
    },
    getHierarchyIndexForTd: function(td) {
        switch (this.getLayout()) {
            case "horizontal":
                return Math.floor(td.parentNode.rowIndex -1);
                break;
            case "vertical":
                if (td.className === "query-designer-axis-header") return -1;
                return Math.floor(td.cellIndex);
                break;
            default:
                return null;
        }
    },
    getMemberIndexForSpan: function(span) {
        var td = span.parentNode;
        if (td.tagName !== "TD") return null;
        var i, spans = gEls(td, "SPAN"), n = spans.length;
        for (i = 0; i < n; i++) {
            if (span === spans.item(i)) return i;
        }
        return -1;
    },
    getIndexesForTableCell: function(td) {
        var hierarchyIndex, tupleIndex;
        switch (this.getLayout()) {
            case "horizontal":
                hierarchyIndex = Math.floor(td.parentNode.rowIndex -1);
                tupleIndex = Math.floor((td.cellIndex - 2));
                break;
            case "vertical":
                hierarchyIndex = Math.floor(td.cellIndex);
                tupleIndex = Math.floor((td.parentNode.rowIndex - 2));
                break;
            default:
                return null;
        }
        return {
            hierarchyIndex: hierarchyIndex,
            tupleIndex: tupleIndex
        };
    },
    canDropItem: function(target, requestType, metadata) {
        //if (target.tagName !== "TD") return;
        var dimensionName = metadata.DIMENSION_UNIQUE_NAME,
            hierarchyName = metadata.HIERARCHY_UNIQUE_NAME,
            axis
        ;
        //if this hierarchy was already used on another axis, then we can't drop this item on this axis.
        if ((axis = this.conf.queryDesigner.getAxisForHierarchy(hierarchyName)) && axis !== this) return false;
        switch (requestType) {
            case "MDSCHEMA_HIERARCHIES":
                //if this axis already has this hierarchy then we can't drop it again.
                if (this.hasHierarchy(hierarchyName)) return false;
                //if this axis already has a hierarchy with this dimension, then we can only replace
                if (this.dimensions[dimensionName] && target.className.indexOf("MDSCHEMA_HIERARCHIES")) return false;
                break;
            case "MDSCHEMA_LEVELS":
            case "MDSCHEMA_MEMBERS":
            case "MDSCHEMA_MEASURES":

                break;
            default:
                return false;
        }
        return true;
    },
    getDefaultMemberExpression: function(metadata) {
        if (metadata.MEMBER_UNIQUE_NAME) return metadata.MEMBER_UNIQUE_NAME;
        if (metadata.MEASURE_UNIQUE_NAME) return metadata.MEASURE_UNIQUE_NAME;
        if (metadata.LEVEL_UNIQUE_NAME) return metadata.LEVEL_UNIQUE_NAME + ".Members";
        if (metadata.DEFAULT_MEMBER) return metadata.DEFAULT_MEMBER;
        if (metadata.DEFAULT_MEASURE) return metadata.DEFAULT_MEASURE;
        return null;
    },
    getDefaultMemberCaption: function(hierarchy) {
        var defaultMember = hierarchy.DEFAULT_MEMBER;
        if (!defaultMember.indexOf(hierarchy.HIERARCHY_UNIQUE_NAME) + ".") {
            defaultMember = defaultMember.substr(hierarchy.HIERARCHY_UNIQUE_NAME.length + 1);
        }
        if (defaultMember[0]==="[" && defaultMember[defaultMember.length-1]==="]") {
            defaultMember = defaultMember.substr(1, defaultMember.length-2);
        }
        return defaultMember;
    },
    getHierarchyCaption: function(hierarchy) {
        return hierarchy.HIERARCHY_CAPTION ? hierarchy.HIERARCHY_CAPTION : "Measures";
    },
    getHierarchyName: function(hierarchy) {
        return hierarchy.HIERARCHY_UNIQUE_NAME ? hierarchy.HIERARCHY_UNIQUE_NAME : "Measures";
    },
    getDimensionName: function(hierarchy) {
        return hierarchy.DIMENSION_UNIQUE_NAME ? hierarchy.DIMENSION_UNIQUE_NAME : "Measures";
    },
    getHierarchyByIndex: function(index) {
        return this.hierarchies[index];
    },
    getHierarchyByName: function(name) {
        var hierarchies = this.hierarchies,
            i, n = hierarchies.length, hierarchy
        ;
        for (i = 0; i < n; i++) {
            hierarchy = hierarchies[i];
            if (this.getHierarchyName(hierarchy) === name) return hierarchy;
        }
        return null;
    },
    getMemberByExpression: function(expression){
        var hierarchy, setDefs = this.setDefs, i, n, setDef;
        for (hierarchy in setDefs) {
            hierarchy = setDefs[hierarchy];
            n = hierarchy.length;
            for (i = 0; i < n; i++){
                setDef = hierarchy[i];
                if (setDef.expression === expression) return setDef;
            }
        }
        return null;
    },
    getHierarchyCount: function(){
        return this.hierarchies.length;
    },
    removeHierarchy: function(item){
        if (iObj(item)) item = this.getHierarchyName(item);
        if (iStr(item)) item = this.getHierarchyIndex(item);
        if (!iNum(item) || item === -1) return false;
        var hierarchy = this.getHierarchyByIndex(item);
        if (!hierarchy) return false;
        var hierarchyName = this.getHierarchyName(hierarchy);
        this.hierarchies.splice(item, 1);
        delete this.setDefs[hierarchyName];
        var dom = this.getDom();
        switch (this.getLayout()) {
            case "horizontal":
                dom.deleteRow(item + 1);
                break;
            case "vertical":
                var rows = dom.rows, n = rows.length, i;
                for (i = 1; i < n; i++) {
                    rows[i].deleteCell(item + 1);
                }
                break;
        }
        this.getQueryDesigner().axisChanged(this);
        return true;
    },
    removeMember: function(item) {
        if (iObj(item)) item = this.getDefaultMemberExpression(item);
        if (!iStr(item)) return false;
        var member = this.getMemberByExpression(item);
        if (!member) return false;
        var metadata = member.metadata;
        var hierarchyName = this.getHierarchyName(metadata);
        var setDefs = this.setDefs[hierarchyName];
        if (!setDefs) return false;
        var i, n = setDefs.length, setDef;
        for (i = 0; i < n; i ++) {
            setDef = setDefs[i];
            if (setDef.expression === item) break;
        }
        if (i === n) return false;
        setDefs.splice(i, 1);
        var hierarchyIndex = this.getHierarchyIndex(hierarchyName);
        if (!setDefs.length) return this.removeHierarchy(hierarchyIndex);
        var dom = this.getDom(), parent;
        switch (this.getLayout()) {
            case "horizontal":
                parent = dom.rows[hierarchyIndex + 1].cells[1];
                parent.removeChild(parent.childNodes[i]);
                break;
            case "vertical":
                parent = dom.rows[1].cells[hierarchyIndex + 1];
                parent.removeChild(parent.childNodes[i]);
                break;
        }
        this.getQueryDesigner().axisChanged(this);
        return true;
    },
    getMemberInfo: function(requestType, metadata){
        var expression = this.getDefaultMemberExpression(metadata), caption;
        switch (requestType) {
            case "MDSCHEMA_HIERARCHIES":
                caption = this.getDefaultMemberCaption(metadata);
                requestType = "MDSCHEMA_MEMBERS";
                break;
            case "MDSCHEMA_LEVELS":
                caption = metadata.LEVEL_CAPTION;
                break;
            case "MDSCHEMA_MEMBERS":
                caption = metadata.MEMBER_CAPTION;
                break;
            case "MDSCHEMA_MEASURES":
                caption = metadata.MEASURE_CAPTION;
                break;
        }
        return {
            expression: expression,
            caption: caption,
            type: requestType,
            metadata: metadata
        };
    },
    addMember: function(memberIndex, requestType, metadata) {
        var memberInfo = this.getMemberInfo(requestType, metadata),
            hierarchyName = this.getHierarchyName(metadata),
            hierarchyIndex = this.getHierarchyIndex(hierarchyName),
            layout = this.getLayout(),
            dom = this.getDom(),
            r,c,memberList
        ;
        if (hierarchyIndex === -1) throw "Hierarchy not present in this axis";
        switch(layout) {
            case "horizontal":
                r = dom.rows.item(1 + hierarchyIndex);
                c = r.cells.item(1);
                break;
            case "vertical":
                r = dom.rows.item(2);
                c = r.cells.item(hierarchyIndex);
                break;
        }
        if (!c) {
            debugger; //trace stack, we should never have arrived here!
        };
        var el = cEl("SPAN", {
            "class": memberInfo.type,
            title: memberInfo.expression,
            id: memberInfo.expression
        }, memberInfo.caption);
        c.insertBefore(el, c.childNodes.item(memberIndex + 1));
        this.setDefs[hierarchyName].splice(memberIndex + 1, 0, memberInfo);
        this.getQueryDesigner().axisChanged(this);
    },
    addHierarchy: function(hierarchyIndex, requestType, metadata) {
        var hierarchyName = this.getHierarchyName(metadata),
            layout = this.getLayout()
        ;
        if (hierarchyIndex === -1) {
            hierarchyIndex = 0;
        }
        this.hierarchies.splice(hierarchyIndex, 0, metadata);
        this.dimensions[this.getDimensionName(metadata)] = hierarchyName;
        this.setDefs[hierarchyName] = [];
        var dom = this.getDom(), r1, r, c,
            hierarchyCaption = this.getHierarchyCaption(metadata),
            hierarchyClassName = "MDSCHEMA_HIERARCHIES",
            memberList = "";
        ;

        switch(layout) {
            case "horizontal":
                r = dom.insertRow(1 + hierarchyIndex);
                c = r.insertCell(0);
                c.id = hierarchyName;
                c.innerHTML = hierarchyCaption;
                c.className = hierarchyClassName;
                c = r.insertCell(1);
                c.innerHTML = memberList;
                break;
            case "vertical":
                if ((r = dom.rows.item(1))) {
                    r1 = dom.rows.item(2);
                }
                else {
                    r1 = dom.insertRow(1);
                    r = dom.insertRow(1);
                }
                c = r.insertCell(hierarchyIndex);
                c.id = hierarchyName;
                c.innerHTML = hierarchyCaption;
                c.className = hierarchyClassName;
                c = r1.insertCell(hierarchyIndex);
                c.innerHTML = memberList;
                break;
        }
        this.addMember(-1, requestType, metadata);
    },
    itemDropped: function(target, requestType, metadata) {
        var hierarchyName = this.getHierarchyName(metadata),
            hierarchyIndex = this.getHierarchyIndex(hierarchyName),
            layout = this.getLayout(),
            dropIndexes, dropHierarchyName,
            memberType, memberExpression, memberCaption,
            dropMemberIndex, dropHierarchyIndex
        ;
        if (target.tagName === "SPAN") {
            dropMemberIndex = this.getMemberIndexForSpan(target);
            target = target.parentNode;
        }
        else {
            dropMemberIndex = -1;
        }
        if (target.tagName === "TD") {
            dropHierarchyIndex = this.getHierarchyIndexForTd(target);
        }
        if (typeof(dropHierarchyIndex)==="undefined") return;
        if (hierarchyIndex === -1) {
            //if the hierarchy was not already in this axis, add it.
            this.addHierarchy(dropHierarchyIndex+1, requestType, metadata);
        }
        else {
            //if the hierarchy is already present, add the member expression to the member list.
            this.addMember(dropMemberIndex, requestType, metadata);
        }
    },
    getMdx: function() {
        var hierarchies = this.hierarchies, i, n = hierarchies.length,
            hierarchy, hierarchyName,
            setDefs = this.setDefs, setDef, member, members
            mdx = "";
        ;
        for (i = 0; i < n; i++) {
            hierarchy = hierarchies[i];
            hierarchyName = this.getHierarchyName(hierarchy);
            setDef = setDefs[hierarchyName];
            for (j = 0, m = setDef.length, members = ""; j < m; j++) {
                if (members.length) members += ", ";
                members += setDef[j].expression;
            }
            setDef = "{" + members + "}";
            mdx = mdx ? "CrossJoin(" + mdx + ", " + setDef + ")" : setDef;
        }
        if (mdx.length) mdx  = "Hierarchize(" + mdx + ") ON Axis(" + this.conf.id + ")";
        return mdx;
    }
};
QueryDesignerAxis.prefix = "query-designer-axis";
QueryDesignerAxis.instances = {};
QueryDesignerAxis.getInstance = function(id){
    return QueryDesignerAxis.instances[id];
};

QueryDesignerAxis.lookupQueryDesignerAxis = function(el){
    while (el && el.className.indexOf(QueryDesignerAxis.prefix)) {
        if ((el = el.parentNode) === doc) return null;
    }
    return QueryDesignerAxis.getInstance(el.id);
};
/***************************************************************
*
*   PivotTable
*
***************************************************************/
var PivotTable;

(PivotTable = function(conf){
    this.conf = conf || {};
    this.table = null;
}).prototype = {
    getContainer: function() {
        return gEl(this.conf.container);
    },
    getTupleName: function (tuple, hierarchy) {
        for (var mName = "", i = 0; i <= hierarchy.index; i++) {
            mName += tuple.members[i][Xmla.Dataset.Axis.MEMBER_UNIQUE_NAME];
        }
        return mName;
    },
    computeAxisLevels: function (axis) {
        var numLevels = 0,
            tuples = [],
            n = tuples.length, i,
            hierarchies = axis.getHierarchies(),
            m = axis.hierarchyCount(), j, hierarchy,
            level, levels, allLevels = {}
        ;
        axis.eachTuple(function(tuple){
            var member, members = tuple.members;
            tuples.push(tuple);
            for (j = 0; j < m; j++){
                member = members[j];
                if (!(levels = allLevels[member.hierarchy])){
                    allLevels[member.hierarchy] = levels = {};
                }
                levels[member.LNum] = true;
            }
        });
        axis.tuples = tuples;
        for (hierarchy in hierarchies){
            levels = allLevels[hierarchy];
            hierarchy = hierarchies[hierarchy];
            hierarchy.levels = [];
            for (level in levels) {
                hierarchy.levels.push(parseInt(level));
                numLevels++;
            }
            hierarchy.levels = hierarchy.levels.sort();
        }
        return numLevels;
    },
    getDom: function() {
        return gEl(this.conf.id);
    },
    renderAxisHorizontally: function(axis, table){
        var me = this;
        if (!table) table = me.table;
        axis.eachHierarchy(function(hierarchy){
            var i, levels = hierarchy.levels, n = levels.length;
            for (i = 0; i < levels.length; i++){
                var r = table.insertRow(table.rows.length),
                    cells = r.cells,
                    c = null,
                    level = -1,
                    prevTupleName = null
                ;
                var j, tuples = axis.tuples, m = tuples.length, tuple;
                for (var j = 0; j < m; j++){
                    tuple = tuples[j];
                    var member = tuple.members[hierarchy.index];
                    if (member.LNum === levels[i]) {
                        tupleName = me.getTupleName(tuple, hierarchy);
                        if (tupleName === prevTupleName) {
                            memberCell.colSpan++;
                        }
                        else {
                            memberCell = r.insertCell(cells.length);
                            memberCell.className = "th MDSCHEMA_MEMBERS";
                            memberCell.colSpan = 1;
                            memberCell.innerHTML = member.Caption;
                            c = null;
                        }
                        prevTupleName = tupleName;
                    }
                    else
                    if (member.LNum > levels[i]) {
                        memberCell.colSpan++;
                    }
                    else
                    if (member.LNum < levels[i]) {
                        if (level !== member.LNum || c === null) {
                            c = r.insertCell(cells.length);
                            c.className = "th";
                            c.innerHTML = "&#160;";
                            level = member.LNum;
                        }
                        else {
                            c.colSpan++;
                        }
                    }
                }
            }
        });
    },
    renderAxisVertically: function(axis, table) {
        var me = this;
        if (!table) table = me.table;
        var rows = table.rows,
            rowOffset = rows.length
        ;
        axis.eachHierarchy(function(hierarchy){
            var i, levels = hierarchy.levels, n = levels.length;
            for (i = 0; i < levels.length; i++){
                var c = null,
                    memberCell = null,
                    prevTupleName
                ;
                var j, tuples = axis.tuples, m = tuples.length, tuple;
                for (var j = 0; j < m; j++){
                    tuple = tuples[j];
                    var r = (!hierarchy.index && !i) ? table.insertRow(rows.length) : rows[rowOffset + tuple.index],
                        cells = r.cells,
                        member = tuple.members[hierarchy.index],
                        tupleName
                    ;
                    if (member.LNum === levels[i]) {
                        tupleName = me.getTupleName(tuple, hierarchy);
                        if (tupleName !== prevTupleName) {
                            memberCell = r.insertCell(r.cells.length);
                            memberCell.className = "th MDSCHEMA_MEMBERS";
                            memberCell.innerHTML = member.Caption;
                            c = null;
                        }
                        else {
                            memberCell.rowSpan++;
                        }
                        prevTupleName = tupleName;
                    }
                    else {
                        if (member.LNum < levels[i]) {
                            memberCell = cells.item(cells.length - 1);
                            if (memberCell && memberCell.className === "th MDSCHEMA_MEMBERS") memberCell.colSpan++;
                        }
                        else {
                            if (c === null) {
                                c = r.insertCell(cells.length);
                                c.className = "th";
                                c.innerHTML = "&#160;";
                                memberCell = null;
                            }
                            else {
                                c.rowSpan++;
                            }
                        }
                    }
                }
            }
        });
    },
    renderCells: function() {
        var rowOffset = this.getRowOffset(),
            dataset = this.dataset,
            rowAxis = dataset.hasRowAxis() ? dataset.getRowAxis() : null,
            columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
            table = this.table,
            rows = table.rows,
            r, c,
            i, n = columnAxis.tupleCount(), colTuples, colTuple,
            j, m, rowTuples, rowTuple
        ;
        if (rowAxis) {
            m = rowAxis.tupleCount();
            for (j = 0; j < m; j++){
                r = rows[rowOffset + j];
                for (i = 0; i < n; i++){
                    r.insertCell(r.cells.length).className = "td";
                }
            }
        }
        else {
            r = table.insertRow(rowOffset);
            for (i = 0; i < n; i++) {
                r.insertCell(r.cells.length).className = "td";
            }
        }
    },
    loadCells: function(columnAxis, rowAxis, pageAxis){
        var args = [],
            table = this.table,
            rows = table.rows,
            rowOffset = this.getRowOffset(),
            dataset = this.dataset,
            cellset = dataset.getCellset(),
            cell, cells, from, to,
            func = cellset.getByTupleIndexes,
            columnAxis = dataset.getColumnAxis(),
            axisCount = dataset.axisCount(),
            td,
            i, n = columnAxis.tupleCount(), colTuples, colTuple,
            j, m, rowTuples, rowTuple,
            k, l;
        ;
        if (dataset.hasPageAxis()) {
            args.push(dataset.getPageAxis().tupleIndex());
        }
        if (dataset.hasRowAxis()) {
            m = dataset.getRowAxis().tupleCount();

            args[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = 0;
            args[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = 0;
            from = cellset.cellOrdinalForTupleIndexes.apply(cellset, args);

            args[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = m - 1;
            args[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = n - 1;
            to = cellset.cellOrdinalForTupleIndexes.apply(cellset, args);

            cells = cellset.fetchRangeAsArray(from, to);
            cell = cells.length ? cells[0] : null;
            for (l = 0, j = 0, k=0; j < m; j++){
                r = rows[rowOffset + j];
                var columnOffset = -1;
                while (r.cells[++columnOffset].className.indexOf("th") !== -1);
                for (i = 0; i < n; i++, k++) {
                    td = r.cells[columnOffset + i];
                    if (cell && cell.ordinal === k) {
                        td.innerHTML = (typeof(cell["FmtValue"]) === "undefined") ? cell.Value : cell.FmtValue;
                        cell = cells[++l];
                    }
                    else {
                        td.innerHTML = "";
                    }
                }
            }
        }
        else
        if (dataset.hasColumnAxis()) {
            r = rows[rowOffset];
            from = cellset.cellOrdinalForTupleIndexes(0);
            to = cellset.cellOrdinalForTupleIndexes(n - 1);
            cells = cellset.fetchRangeAsArray(from, to);
            cell = cells.length ? cells[0] : null;
            for (i = 0, l = 0; i < n; i++) {
                args[0] = i;
                td = r.cells[i];
                if (cell && cell.ordinal === i) {
                    td.innerHTML = (typeof(cell["FmtValue"]) === "undefined") ? cell.Value : cell.FmtValue;
                    cell = cells[++l];
                }
                else {
                    td.innerHTML = "";
                }
            }
        }
    },
    getRowOffset: function() {
        return this.rowOffset;
    },
    getColumnOffset: function() {
        return this.columnOffset;
    },
    renderDataset: function (dataset) {
        var me = this,
            start,
            container = me.getContainer(),
            t = cEl("TABLE", {
                "class": "pivot-table",
                cellpadding: 0,
                cellspacing: 0
            }),
            rows = t.rows, c,
            columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
            rowAxis = dataset.hasRowAxis() ? dataset.getRowAxis() : null,
            pageAxis = dataset.hasPageAxis() ? dataset.getPageAxis() : null
        ;
        if (this.dataset) this.dataset.close();
        this.dataset = dataset;
        me.table = t;
        container.innerHTML = "";
        if (columnAxis) {
            log.print("Rendering column axis...");
            start = (new Date()).getTime();
            me.computeAxisLevels(columnAxis);
            me.renderAxisHorizontally(columnAxis);
            log.print("Column axis rendered in " + ((new Date()).getTime() - start));
        }
        this.rowOffset = rows.length;
        if (rowAxis) {
            log.print("Rendering row axis...");
            start = (new Date()).getTime();
            this.columnOffset = me.computeAxisLevels(rowAxis);
            c = rows[0].insertCell(0);
            c.colSpan = this.columnOffset;
            c.rowSpan = this.rowOffset;
            me.renderAxisVertically(rowAxis);
            log.print("Row axis rendered in " + ((new Date()).getTime() - start));
        }
        if (pageAxis) {
        }
        log.print("Rendering cells...");
        start = (new Date()).getTime();
        me.renderCells();
        log.print("Cells rendered in " + ((new Date()).getTime() - start));

        log.print("Loading cells...");
        start = (new Date()).getTime();
        me.loadCells();
        log.print("Cells loaded in " + ((new Date()).getTime() - start));

        log.print("Adding table to the dom...");
        start = (new Date()).getTime();
        container.appendChild(t);
        log.print("Dom updated in " + ((new Date()).getTime() - start));
    }
};
/***************************************************************
*
*   Log
*
***************************************************************/
var Log;
(Log = function(conf){
    this.conf = conf;
}).prototype = {
    getDom: function(){
        return gEl(this.conf.container || "log");
    },
    clear: function(){
        this.getDom().innerHTML = "";
    },
    print: function(message, type){
        cEl(
            "pre", {
                "class": type || "info"
            }, message, this.getDom()
        );
    }
};
/***************************************************************
*
*   Application
*
***************************************************************/
var log = new Log({
        container: "log"
    }),
    xmla = new Xmla({
        async: true,
        listeners: {
            request: function(eventName, eventData, xmla){
                xmla.start = (new Date()).getTime();
            },
            success: function(eventName, eventData, xmla){
                var end = (new Date()).getTime();
                log.print("Xmla success in " + (end - xmla.start) + "ms");
            },
            error: function(eventName, eventData, xmla){
                var end = (new Date()).getTime();
                log.print("Xmla error in " + (end - xmla.start) + "ms");
            }
        }
    }),
    ddHandler = new DDHandler({
        node: "workspace",
        dragProxy: "ddDragProxy"
    }),
    queryDesigner = new QueryDesigner({
        container: "query-designer"
    }),
    pivotTable = new PivotTable({
        container: "query-results"
    });
    cubeMetaData = null;
;
function showCube(show){
    gEl("cube").style.display = show ? "" : "none";
}
function toggleDataSources() {
    var body = gEl("datasources-body");
    showDataSources(body.style.display==="none" || (!gEls(body, "DIV").length));
}
function showDataSources(show){
    gEl("datasources-body").style.display = show ? "" : "none";
    gEl("cube-body").style.top = gEl("datasources").clientHeight + gEl("datasources-head").clientHeight + 5 + "px";
}
function clearCubeTree() {
    gEl("cube-body").innerHTML = "";
}
function initWorkarea() {
    queryDesigner.reset();
    gEl("query-text").innerHTML = "";
    gEl("query-results").innerHTML = "No results to display.";
}
function clearWorkarea() {
    gEl("query-designer").innerHTML = "";
    gEl("query-text").innerHTML = "";
    gEl("query-results").innerHTML = "";
}
function clearUI() {
    gEl("datasources-body").innerHTML = "";
    clearCubeTree();
}
function metadataClicked(e) {
    if (!e) e = win.event;
    var target = e.getTarget(),
        treeNode
    ;
    if (target.tagName === "DIV" && target.id === "datasources-head") toggleDataSources();
    else {
        treeNode = TreeNode.lookupTreeNode(target);
        if (!treeNode) return;
        if (target.tagName === "SPAN" && target.className === "toggle") treeNode.toggle();
        else
        if (treeNode.getCustomClass() === "MDSCHEMA_CUBES") selectCube(treeNode);
    }
}
function discoverClicked(){
    clearWorkarea();
    showCube(false);
    showDataSources(true);
    xmla.discoverDataSources({
        url: gEl("url").value,
        error: function(xmla, request, exception){
            alert("Snap, an error occurred:" + exception.toString());
        },
        success: function(xmla, req, resp){
            clearUI();
            resp.eachRow(function(row){
                var nodeId = (new TreeNode({
                    parentElement: "datasources-body",
                    customClass: req.requestType,
                    title: row.DataSourceDescription,
                    tooltip: row.DataSourceInfo,
                    state: TreeNode.states.expanded,
                    metadata: row
                })).getId();
                xmla.discoverDBCatalogs({
                    url: row.URL ? row.URL : req.url,
                    properties: {DataSourceInfo: row.DataSourceInfo},
                    nodeId: nodeId,
                    success: function(xmla, req, resp) {
                        resp.eachRow(function(row){
                            var properties = {
                                DataSourceInfo: req.properties.DataSourceInfo,
                                Catalog: row.CATALOG_NAME
                            },
                            nodeId = (new TreeNode({
                                parentTreeNode: req.nodeId,
                                customClass: req.requestType,
                                title: row.CATALOG_NAME,
                                tooltip: row.DESCRIPTION,
                                state: TreeNode.states.expanded,
                                metadata: row
                            })).getId();
                            xmla.discoverMDCubes({
                                url: req.url,
                                properties: properties,
                                restrictions: {CATALOG_NAME: row.CATALOG_NAME},
                                nodeId: nodeId,
                                success: function(xmla, req, resp) {
                                    resp.eachRow(function(row){
                                        var restrictions = {
                                            CATALOG_NAME: req.restrictions.CATALOG_NAME,
                                            CUBE_NAME: row.CUBE_NAME
                                        },
                                        nodeId = (new TreeNode({
                                            parentTreeNode: req.nodeId,
                                            customClass: req.requestType,
                                            title: row.CUBE_CAPTION,
                                            tooltip: row.DESCRIPTION,
                                            state: TreeNode.states.leaf,
                                            metadata: row,
                                            xmla: {
                                                url: req.url,
                                                properties: properties,
                                                restrictions: restrictions
                                            }
                                        })).getId();
                                    });
                                    resp.close();
                                }
                            });
                        });
                        resp.close();
                    }
                });
            });
            resp.close();
        }
    });
}

function selectCube(cubeTreeNode) {
    cubeMetaData = {
        cube: cubeTreeNode.conf.metadata,
        measures: {
        },
        hierarchies: {
        }
    };
    queryDesigner.setCube(cubeMetaData);
    clearCubeTree();
    initWorkarea();
    showCube(true);
    showDataSources(false);
    var conf = cubeTreeNode.getConf();
    xmla.options.url = conf.xmla.url;
    xmla.options.properties = conf.xmla.properties;
    gEl("cube-head").innerHTML = conf.title;
    xmla.discoverMDMeasures({
        url: conf.xmla.url,
        properties: conf.xmla.properties,
        restrictions: conf.xmla.restrictions,
        success: function(xml, req, resp) {
            resp.eachRow(function(row){
                cubeMetaData.measures[row.MEASURE_UNIQUE_NAME] = row;
                new TreeNode({
                    parentElement: "cube-body",
                    customClass: req.requestType,
                    title: row.MEASURE_CAPTION,
                    tooltip: row.MEASURE_UNIQUE_NAME,
                    state: TreeNode.states.leaf,
                    metadata: row
                });
            });
            resp.close();
            xmla.discoverMDHierarchies({
                url: req.url,
                properties: req.properties,
                restrictions: req.restrictions,
                success: function(xmla, req, resp) {
                    resp.eachRow(function(row){
                        if (row.DIMENSION_TYPE === Xmla.Rowset.MD_DIMTYPE_MEASURE) return;
                        cubeMetaData.hierarchies[row.HIERARCHY_UNIQUE_NAME] = row;
                        var restrictions = {
                            CATALOG_NAME: req.restrictions.CATALOG_NAME,
                            CUBE_NAME: req.restrictions.CUBE_NAME,
                            DIMENSION_UNIQUE_NAME: row.DIMENSION_UNIQUE_NAME,
                            HIERARCHY_UNIQUE_NAME: row.HIERARCHY_UNIQUE_NAME
                        },
                        nodeId = (new TreeNode({
                            parentElement: "cube-body",
                            customClass: req.requestType,
                            title: row.HIERARCHY_CAPTION,
                            tooltip: row.HIERARCHY_UNIQUE_NAME,
                            state: TreeNode.states.collapsed,
                            metadata: row,
                            loadChildren: function(callback) {
                                xmla.discoverMDLevels({
                                    url: req.url,
                                    metadata: row,
                                    properties: req.properties,
                                    restrictions: restrictions,
                                    nodeId: nodeId,
                                    success: function(xmla, req, resp) {
                                        resp.eachRow(function(row){
                                            var restrictions = {
                                                CATALOG_NAME: req.restrictions.CATALOG_NAME,
                                                CUBE_NAME: req.restrictions.CUBE_NAME,
                                                DIMENSION_UNIQUE_NAME: req.restrictions.DIMENSION_UNIQUE_NAME,
                                                HIERARCHY_UNIQUE_NAME: req.restrictions.HIERARCHY_UNIQUE_NAME,
                                                LEVEL_UNIQUE_NAME: row.LEVEL_UNIQUE_NAME
                                            },
                                            nodeId = (new TreeNode({
                                                parentTreeNode: req.nodeId,
                                                customClass: req.requestType,
                                                title: row.LEVEL_CAPTION,
                                                tooltip: row.LEVEL_UNIQUE_NAME,
                                                metadata: merge(row, req.metadata),
                                                loadChildren: function(callback){
                                                    xmla.discoverMDMembers({
                                                        url: req.url,
                                                        metadata: this.conf.metadata,
                                                        properties: req.properties,
                                                        restrictions: restrictions,
                                                        nodeId: this.getId(),
                                                        success: function(xmla, req, resp) {
                                                            var loadChildren = function(callback){
                                                                var conf = this.conf,
                                                                    metadata = conf.metadata,
                                                                    properties = {
                                                                    DataSourceInfo: req.properties.DataSourceInfo,
                                                                    Catalog: req.properties.Catalog,
                                                                    Format: "Multidimensional",
                                                                    AxisFormat: "TupleFormat"
                                                                },  mdx =   "WITH MEMBER [Measures].numChildren " +
                                                                            "AS " + metadata.HIERARCHY_UNIQUE_NAME  + ".CurrentMember.Children.Count " +
                                                                            "SELECT CrossJoin(" + metadata.MEMBER_UNIQUE_NAME + ".Children," +
                                                                                    "[Measures].numChildren) ON COLUMNS " +
                                                                            "FROM [" + metadata.CUBE_NAME + "]"
                                                                ;
                                                                xmla.execute({
                                                                    url: req.url,
                                                                    properties: properties,
                                                                    statement: mdx,
                                                                    cube: this.conf.CUBE_NAME,
                                                                    hierarchy: this.conf.HIERARCHY_UNIQUE_NAME,
                                                                    metadata: metadata,
                                                                    nodeId: this.getId(),
                                                                    requestType: req.requestType,
                                                                    success: function(xml, req, resp){
                                                                        var cellset = resp.getCellset();
                                                                        resp.getColumnAxis().eachTuple(function(tuple){
                                                                            cellset.nextCell();
                                                                            var childCount = cellset.cellValue(),
                                                                            metadata = req.metadata,
                                                                            member = tuple.members[0],
                                                                            memberUniqueName = member.UName,
                                                                            memberCaption = member.Caption,
                                                                            nodeId = (new TreeNode({
                                                                                parentTreeNode: req.nodeId,
                                                                                customClass: req.requestType,
                                                                                title: memberCaption,
                                                                                tooltip: memberUniqueName,
                                                                                state: childCount ? TreeNode.states.collapsed : TreeNode.states.leaf,
                                                                                metadata: merge({
                                                                                    MEMBER_UNIQUE_NAME: memberUniqueName,
                                                                                    MEMBER_CAPTION: memberCaption,
                                                                                    LEVEL_UNIQUE_NAME: member.LName,
                                                                                    LEVEL_NUMBER: member.LNum,
                                                                                    CHILDREN_CARDINALITY: childCount
                                                                                }, metadata),
                                                                                loadChildren: loadChildren
                                                                            })).getId();
                                                                        });
                                                                        resp.close();
                                                                        if (iFun(callback)) callback.call(win);
                                                                    }
                                                                });
                                                            }
                                                            resp.eachRow(function(row){
                                                                nodeId = (new TreeNode({
                                                                    parentTreeNode: req.nodeId,
                                                                    customClass: req.requestType,
                                                                    title: row.MEMBER_CAPTION,
                                                                    tooltip: row.MEMBER_UNIQUE_NAME,
                                                                    state: row.CHILDREN_CARDINALITY ? TreeNode.states.collapsed : TreeNode.states.leaf,
                                                                    metadata: merge(row, req.metadata),
                                                                    loadChildren: loadChildren
                                                                }).getId());
                                                            });
                                                            resp.close();
                                                            if (iFun(callback)) callback.call(win);
                                                        }
                                                    });
                                                }
                                            })).getId();
                                        });
                                        resp.close();
                                        if (iFun(callback)) callback.call(win);
                                    }
                                });
                            }
                        })).getId();
                    });
                    resp.close();
                }
            });
        }
    });
}

function init() {
    //set up listeners
    listen("discover", "click", discoverClicked);
    listen("metadata", "click", metadataClicked);
    ddHandler.listen({
        startDrag: function(event, ddHandler) {
            var target = event.getTarget(), startDragEvent,
                tagName = target.tagName, id,
                className = target.className,
                treeNode, title, queryAxis,
                type, data, dragProxy, xy
            ;
            gEl("workspace").className = "no-user-select";
            //if (tagName !== "SPAN" || tagName !== "TD" || className.indexOf("label")!==0) return;
            startDragEvent = ddHandler.startDragEvent;
            startDragEvent.item = null;
            if (treeNode = TreeNode.lookupTreeNode(target)) {
                type = treeNode.getCustomClass();
                switch (type) {
                    case "MDSCHEMA_MEASURES":
                    case "MDSCHEMA_HIERARCHIES":
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                        break;
                    default:
                        return;
                }
                data = treeNode.getConf().metadata;
            }
            else
            if (queryAxis = QueryDesignerAxis.lookupQueryDesignerAxis(target)){
                type = className;
                id = target.id;
                switch (type) {
                    case "MDSCHEMA_HIERARCHIES":
                        data = queryAxis.getHierarchyByName(id);
                        break;
                    case "MDSCHEMA_MEASURES":
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                        data = queryAxis.getMemberByExpression(id);
                        break;
                    default:
                        return;
                }
            }
            else {
                return;
            }
            startDragEvent.item = {
                data: data,
                type: type
            };
            xy = event.getXY();
            dragProxy = ddHandler.dragProxy;
            dragProxy.style.position = "absolute";
            dragProxy.className = type;
            //dragProxy.innerHTML = treeNode.getTitle();
            dragProxy.innerHTML = target.innerHTML;
            dragProxy.style.left = (xy.x) + "px";
            dragProxy.style.top = (xy.y) + "px";
            return true;
        },
        whileDrag: function(event, ddHandler) {
            var dragProxy = ddHandler.dragProxy,
                xy = event.getXY(),
                startDragEvent = ddHandler.startDragEvent,
                item = startDragEvent.item,
                customClass,
                dropTarget = event.getTarget(),
                tagName = dropTarget.tagName,
                className = target.className,
                axisTable
            ;
            if (!item) return;
            dragProxy.style.left = (xy.x + 2) + "px";
            dragProxy.style.top = (xy.y + 2) + "px";
            switch (tagName) {
                case "TD":
                    axisTable = dropTarget.parentNode.parentNode.parentNode;
                    break;
                case "TR":
                    axisTable = dropTarget.parentNode.parentNode;
                    break;
                case "TBODY":
                    axisTable = dropTarget.parentNode;
                    break;
                case "TABLE":
                    axisTable = dropTarget;
                    break;
            }
        },
        endDrag: function(event, ddHandler) {
            var dragProxy = ddHandler.dragProxy,
                startDragEvent = ddHandler.startDragEvent,
                origin = startDragEvent.getTarget(),
                item = startDragEvent.item,
                type,
                data,
                requestType, metadata, customClass,
                dropTarget = event.getTarget(),
                tagName = dropTarget.tagName,
                className = target.className,
                queryDesignerAxis, table
            ;
            if (!item) return;
            type = item.type;
            data = item.data;
            switch (tagName) {
                case "SPAN":
                    dropTarget = dropTarget.parentNode;
                case "TD":
                    dropTarget = dropTarget.parentNode;
                case "TR":
                    dropTarget = dropTarget.parentNode;
                case "TBODY":
                    dropTarget = dropTarget.parentNode;
                default:
            }
            if (dropTarget.tagName === "TABLE") table = dropTarget;
            if (table && !table.className.indexOf("query-designer-axis")){
                //Found a droptarget: lets add something to an axis.
                queryDesignerAxis = QueryDesignerAxis.getInstance(table.id);
                switch (type) {
                    case "MDSCHEMA_HIERARCHIES":
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                    case "MDSCHEMA_MEASURES":
                        if (queryDesignerAxis.canDropItem(target, type, data)) {
                            queryDesignerAxis.itemDropped(target, type, data);
                        }
                        break;
                    default:
                }
            }
            else
            if (queryDesignerAxis = QueryDesignerAxis.lookupQueryDesignerAxis(origin)) {
                //lets remove something from an axis.
                switch (type) {
                    case "MDSCHEMA_HIERARCHIES":
                        queryDesignerAxis.removeHierarchy(data);
                        break;
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                    case "MDSCHEMA_MEASURES":
                        queryDesignerAxis.removeMember(data.expression);
                        break;
                    default:
                }
            }
            if (queryDesigner) {
                queryDesigner.hideProxies();
            }
            dragProxy.className = "";
            dragProxy.innerHTML = "";
            gEl("workspace").className = "";
        }
    });
    queryDesigner.queryChanged = function(queryDesigner) {
        gEl("query-results").innerHTML = "<img src=\"../css/ajax-loader.gif\"/>";
        var mdx = queryDesigner.getMdx();
        gEl("query-text").innerHTML = mdx;
        if (!mdx.length) return;
        log.clear();
        log.print("About to execute Query...");
        var start = (new Date()).getTime();
        xmla.execute({
            async: true,
            statement: mdx,
            success: function(xmla, req, resp) {
                log.print("Succes executing mdx in " + ((new Date()).getTime() - start) + "ms");
                pivotTable.renderDataset(resp);
            },
            error: function(a, b, c) {
                log.print("Error executing mdx in " + ((new Date()).getTime() - start) + "ms");
                alert(c.toString());
            }
        });
    }
    //init the ui
    showCube(false);
    var search = window.location.search;
    if (search.length) {
        search = search.substr(1).split("&");
        for (var i=0, n = search.length, item; i < n; i++) {
            item = search[i].split("=");
            switch (item[0]) {
                case "url":
                    gEl("url").value = decodeURIComponent(item[1]);
                    gEl("discover").click();
                    break;
                default:

            }
        }
    }
}

init();

})();
