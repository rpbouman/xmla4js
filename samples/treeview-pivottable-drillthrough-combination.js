/*
  Copyright 2014 Roland Bouman

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
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
function iNod(a){return iObj(a) && a.nodeType===1;}
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
        (e === doc ? body : e).appendChild(c);
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
        if (this.target) return this.target;
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
    if (!e) e = win.event;
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
        node: doc
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
        return false;
    }, this);
    listen(this.node, "mouseup", function(e){
        me.event = e;
        if (e.getButton()===0) {
            me.handleMouseUp(e);
        }
        return false;
    }, this);
    listen(this.node, "mousemove", function(e){
        me.event = e;
        me.handleMouseMove(e);
        return false;
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
            me.node.focus();
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
        me.mouseMoveEvent = null;
    },
    whileDrag: function(e) {
        var me = this, i, n, listeners, listener;
        if (!me.startDragEvent) return;
        listeners = me.listeners;
        n = listeners.length;
        for (i = 0; i < n; i++) {
            listener = listeners[i];
            listener.whileDrag.call(listener.scope, e, me);
        }
        clearBrowserSelection();
    }
};
/***************************************************************
*
*   TreeNode
*
***************************************************************/
var TreeNode;
(TreeNode = function(conf){
    this.conf = conf;
    this.id = conf.id ? conf.id : ++TreeNode.id;
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
        return TreeNode.prefix + ":" + this.id;
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
TreeNode.lookup = function(el){
    while (el && el.className.indexOf(TreeNode.prefix)) {
        if ((el = el.parentNode) === doc) return null;
    }
    return TreeNode.getInstance(el.id);
};

//scrollbar dimensions:
cEl("div", {
  id: "_scrollbars1",
  style:  {
    "background-color": "blue",
    position: "absolute",
    overflow: "auto",
    width: "50px",
    height: "50px",
    left: "-50px",
    top: "-50px"
  }
}, cEl("div", {
  id: "_scrollbars2",
  style: {
    "background-color": "red",
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100px",
    height: "100px"
  }
}), body);
var _scrollbars1 = gEl("_scrollbars1");
var scrollbarWidth = (_scrollbars1.offsetWidth - _scrollbars1.clientWidth) + 2;
var scrollbarHeight = (_scrollbars1.offsetHeight - _scrollbars1.clientHeight) + 2;

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
    QueryDesigner.instances[this.getId()] = this;
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
    moveHierarchy: function(hierarchyName, fromAxis, toAxis, toIndex) {
        toAxis.importHierarchy(fromAxis, hierarchyName, toIndex);
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
        c.setAttribute("colspan", "100%");
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_PAGES).getDom());

        r = dom.insertRow(dom.rows.length);
        c = r.insertCell(r.cells.length);
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_ROWS).getDom());
        c.rowSpan = 2;

        c = r.insertCell(r.cells.length);
        c.appendChild(this.getAxis(Xmla.Dataset.AXIS_COLUMNS).getDom());

        r = dom.insertRow(dom.rows.length);
        c = r.insertCell(r.cells.length);
        c.setAttribute("colspan", "100%");
        cEl("IMG", {
            id: "ajax-spinner",
            src: "ajax-loader.gif",
            style: {
                visibility: "hidden"
            }
        }, null, c);
        return dom;
    },
    busy: function(busy) {
        var spinner = gEl("ajax-spinner");
        spinner.style.visibility = busy ? "" : "hidden";
    },
    getDom: function() {
        var el = gEl(this.getId());
        if (!el) el = this.createDom();
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
QueryDesigner.instances = {};
QueryDesigner.getInstance = function(id){
    return QueryDesigner.instances[id];
};

QueryDesigner.lookup = function(el){
    while (el && el.className.indexOf(QueryDesigner.prefix + " ")) {
        if ((el = el.parentNode) === doc) return null;
    }
    return QueryDesigner.getInstance(el.id);
};

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
                "class": QueryDesignerAxis.prefix + " query-designer-axis" + this.conf.id
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
        switch (this.getLayout()) {
            case "horizontal":
                break;
            case "vertical":
                dom.insertRow(1);
                dom.insertRow(2);
                break;
        }
        return dom;
    },
    updateDom: function() {
        switch (this.getLayout()) {
            case "vertical":
                this.updateDomVertical();
                break;
            case "horizontal":
                this.updateDomHorizontal();
                break;
        }
    },
    updateDomSetDefs: function(hierarchyName, c) {
        var hierarchySetDefs = this.setDefs[hierarchyName],
            j, m = hierarchySetDefs.length, setDef
        ;
        for (j = 0; j < m; j++) {
            setDef = hierarchySetDefs[j];
            var el = cEl("SPAN", {
                "class": setDef.type,
                title: setDef.expression,
                id: setDef.expression
            }, setDef.caption, c);
        }
    },
    updateDomVertical: function() {
        var hierarchies = this.hierarchies,
            hierarchy, hierarchyName,
            i, n = hierarchies.length,
            setDefs = this.setDefs, setDef,
            j, m,
            dom = this.getDom(),
            rows = dom.rows,
            r1 = rows[1], r2 = rows[2],
            c
        ;

        while (r1.cells.length) {
            r1.deleteCell(0);
            r2.deleteCell(0);
        }
        for (i = 0; i < n; i++) {
            hierarchy = hierarchies[i];
            hierarchyName = this.getHierarchyName(hierarchy);

            c = r1.insertCell(r1.cells.length);
            c.id = hierarchyName;
            c.innerHTML = this.getHierarchyCaption(hierarchy);
            c.className = "MDSCHEMA_HIERARCHIES";
            c = r2.insertCell(r2.cells.length);

            this.updateDomSetDefs(hierarchyName, c);
        }
    },
    updateDomHorizontal: function() {
        var hierarchies = this.hierarchies,
            hierarchy, hierarchyName,
            i, n = hierarchies.length,
            setDefs = this.setDefs, setDef,
            j, m,
            dom = this.getDom(),
            rows = dom.rows,
            r, c
        ;
        while (rows.length > 1) dom.deleteRow(rows.length - 1);
        for (i = 0; i < n; i++) {
            hierarchy = hierarchies[i];
            hierarchyName = this.getHierarchyName(hierarchy);

            r = dom.insertRow(rows.length);
            c = r.insertCell(0);
            c.id = hierarchyName;
            c.innerHTML = this.getHierarchyCaption(hierarchy);
            c.className = "MDSCHEMA_HIERARCHIES";

            c = r.insertCell(1);
            this.updateDomSetDefs(hierarchyName, c);
        }
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
        var dimensionName = this.getDimensionName(metadata),
            hierarchyName = this.getHierarchyName(metadata),
            axis
        ;
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
                axis = this.getQueryDesigner().getAxisForHierarchy(hierarchyName);
                if (axis && axis !== this) return false;
                break;
            default:
                return false;
        }
        return true;
    },
    getMemberExpression: function(metadata) {
        if (metadata.MEMBER_UNIQUE_NAME) return metadata.MEMBER_UNIQUE_NAME;
        if (metadata.MEASURE_UNIQUE_NAME) return metadata.MEASURE_UNIQUE_NAME;
        if (metadata.LEVEL_UNIQUE_NAME) return metadata.LEVEL_UNIQUE_NAME + ".Members";
        if (metadata.DEFAULT_MEMBER) return metadata.DEFAULT_MEMBER;
        if (metadata.DEFAULT_MEASURE) return metadata.DEFAULT_MEASURE;
        return null;
    },
    getDefaultMemberCaption: function(hierarchy) {
        var defaultMember = hierarchy.DEFAULT_MEMBER;
        if (!defaultMember || !defaultMember.indexOf(hierarchy.HIERARCHY_UNIQUE_NAME) + ".") {
            defaultMember = defaultMember.substr(hierarchy.HIERARCHY_UNIQUE_NAME.length + 1);
        }
        if (defaultMember[0]==="[" && defaultMember[defaultMember.length-1]==="]") {
            defaultMember = defaultMember.substr(1, defaultMember.length-2);
        }
        return defaultMember;
    },
    getMemberCaption: function(metadata) {
        if (metadata.MEMBER_CAPTION) return metadata.MEMBER_CAPTION;
        if (metadata.MEASURE_CAPTION) return metadata.MEASURE_CAPTION;
        if (metadata.LEVEL_CAPTION) return metadata.LEVEL_CAPTION;
        var caption;
        if (metadata.DEFAULT_MEMBER) {
            caption = metadata.DEFAULT_MEMBER.substr(metadata.HIERARCHY_UNIQUE_NAME.length + 1);
            if (caption[0] === "[") caption = caption.substr(1, caption.length - 2);
            return caption;
        }
        return null;
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
        var hierarchy, hierarchySetDefs, setDefs = this.setDefs, i, n, setDef;
        for (hierarchy in setDefs) {
            hierarchySetDefs = setDefs[hierarchy];
            n = hierarchySetDefs.length;
            for (i = 0; i < n; i++){
                setDef = hierarchySetDefs[i];
                if (setDef.expression === expression) return {
                    hierarchy: hierarchy,
                    setDef: setDef,
                    index: i
                };
            }
        }
        return null;
    },
    getHierarchyCount: function(){
        return this.hierarchies.length;
    },
    _removeHierarchy: function(item){
        if (iObj(item)) item = this.getHierarchyName(item);
        if (iStr(item)) item = this.getHierarchyIndex(item);
        if (!iNum(item) || item === -1) return false;
        var hierarchy = this.getHierarchyByIndex(item);
        if (!hierarchy) return false;
        var hierarchyName = this.getHierarchyName(hierarchy);
        this.hierarchies.splice(item, 1);
        delete this.setDefs[hierarchyName];
        var dimension, dimensions = this.dimensions;
        for (dimension in dimensions) {
            if (dimensions[dimension] === hierarchyName) {
                delete dimensions[dimension];
                break;
            }
        }
        this.updateDom();
        return true;
    },
    removeHierarchy: function(item){
        var change = this._removeHierarchy(item);
        if (change) this.notifyAxisChanged();
        return change;
    },
    getMember: function(item) {
        if (iObj(item)) item = this.getMemberExpression(item);
        if (!iStr(item)) return false;
        return this.getMemberByExpression(item);
    },
    _removeMember: function(item){
        var member = this.getMember(item);
        if (!member) return false;
        var metadata = member.setDef.metadata;
        var setDefs = this.setDefs[member.hierarchy];
        setDefs.splice(member.index, 1);
        var hierarchyIndex = this.getHierarchyIndex(member.hierarchy);
        if (!setDefs.length) return this.removeHierarchy(hierarchyIndex);
        this.updateDom();
        return true;
    },
    removeMember: function(item) {
        var change = this._removeMember(item);
        if (change) this.notifyAxisChanged();
        return change;
    },
    getMemberInfo: function(requestType, metadata){
        var expression = this.getMemberExpression(metadata), caption;
        switch (requestType) {
            case "MDSCHEMA_HIERARCHIES":
                caption = this.getMemberCaption(metadata);
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
    _addMember: function(memberIndex, requestType, metadata) {
        var memberInfo = this.getMemberInfo(requestType, metadata),
            hierarchyName = this.getHierarchyName(metadata),
            hierarchyIndex = this.getHierarchyIndex(hierarchyName),
            layout = this.getLayout(),
            dom = this.getDom(),
            r,c,memberList
        ;
        if (hierarchyIndex === -1) throw "Hierarchy not present in this axis";
        this.setDefs[hierarchyName].splice(memberIndex + 1, 0, memberInfo);
        this.updateDom();
    },
    addMember: function(memberIndex, requestType, metadata) {
        this._addMember(memberIndex, requestType, metadata);
        this.notifyAxisChanged();
    },
    _addHierarchy: function(hierarchyIndex, metadata) {
        var hierarchyName = this.getHierarchyName(metadata),
            layout = this.getLayout()
        ;
        if (hierarchyIndex === -1) {
            hierarchyIndex = 0;
        }
        this.hierarchies.splice(hierarchyIndex, 0, metadata);
        this.dimensions[this.getDimensionName(metadata)] = hierarchyName;
        this.setDefs[hierarchyName] = [];
    },
    addHierarchy: function(hierarchyIndex, requestType, metadata) {
        this._addHierarchy(hierarchyIndex, metadata);
        return this.addMember(-1, requestType, metadata);
    },
    importHierarchy: function(axis, hierarchyName, targetIndex){
        if (axis === this) throw "Can't import to itself";
        var hierarchy = axis.getHierarchyByName(hierarchyName),
            setDefs = axis.setDefs[hierarchyName]
        ;
        if (!hierarchy) throw "Hierarchy not found";
        axis._removeHierarchy(hierarchyName);
        this._addHierarchy(targetIndex, hierarchy);
        this.setDefs[hierarchyName] = setDefs;
        this.updateDom();
        this.notifyAxisChanged();
    },
    _moveMember: function(member, toIndex) {
        if (member.index === toIndex) return false;
        var setDefs = this.setDefs[member.hierarchy];
        setDefs.splice(member.index, 1);
        setDefs.splice(toIndex, 0, member.setDef);
        this.updateDom();
        return true;
    },
    moveMember: function(member, toIndex) {
        var change = this._moveMember(member, toIndex);
        if (change) this.notifyAxisChanged();
    },
    _moveHierarchy: function(hierarchyName, newIndex) {
        var oldIndex = this.getHierarchyIndex(hierarchyName);
        if (oldIndex === newIndex) return false;
        var hierarchies = this.hierarchies,
            hierarchy = this.getHierarchyByIndex(oldIndex)
        ;
        hierarchies.splice(oldIndex, 1);
        if (oldIndex < newIndex) newIndex--;
        hierarchies.splice(newIndex, 0, hierarchy);
        this.updateDom();
        return true;
    },
    moveHierarchy: function(hierarchyName, index) {
        if (this._moveHierarchy(hierarchyName, index)) this.notifyAxisChanged();
    },
    notifyAxisChanged: function(){
        this.getQueryDesigner().axisChanged(this);
    },
    itemDropped: function(target, requestType, metadata) {
        var hierarchyName = this.getHierarchyName(metadata),
            hierarchyIndex = this.getHierarchyIndex(hierarchyName),
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
            var member = this.getMember(metadata);
            if (!member) {
                this.addMember(dropMemberIndex, requestType, metadata);
            }
            else {
                this.moveMember(member, dropMemberIndex);
            }
        }
    },
    getMdx: function() {
        var hierarchies = this.hierarchies, i, n = hierarchies.length,
            hierarchy, hierarchyName, minLevel, maxLevel,
            setDefs = this.setDefs, setDef, member, members, drilldownLevel,
            mdx = "";
        ;
        for (i = 0; i < n; i++) {
            minLevel = null, maxLevel = null;
            hierarchy = hierarchies[i];
            drilldownLevel = hierarchy.drilldownLevel;
            hierarchyName = this.getHierarchyName(hierarchy);
            setDef = setDefs[hierarchyName];
            for (j = 0, m = setDef.length, members = ""; j < m; j++) {
                if (members.length) members += ", ";
                members += setDef[j].expression;
            }
            setDef = "{" + members + "}";
            if (hierarchyName !== "Measures") {
                if (drilldownLevel) {
                    setDef = "DrilldownLevel(" + setDef + ")";
                }
                setDef = "Hierarchize(" + setDef + ")";
            }
            mdx = mdx ? "NonEmpty(CrossJoin(" + mdx + ", " + setDef + "))" : setDef;
        }
        if (mdx.length) mdx = mdx + " ON Axis(" + this.conf.id + ")";
        return mdx;
    }
};
QueryDesignerAxis.prefix = "query-designer-axis";
QueryDesignerAxis.instances = {};
QueryDesignerAxis.getInstance = function(id){
    return QueryDesignerAxis.instances[id];
};

QueryDesignerAxis.lookup = function(el){
    while (el && el.className.indexOf(QueryDesignerAxis.prefix + " ")) {
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
    this.createDom();
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
        if (axis.tuples) return;
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
    getContainer: function(){
        return gEl(this.conf.id);
    },
    createDom: function() {
        var container = this.getContainer(),
            id = this.conf.id
        ;
        container.className = "pivot-table-widget";
        cEl("DIV", {
            "class": "pivot-table-axis pivot-table-axis-pages",
            id: id + "-pages"
        }, null, container);
        cEl("DIV", {
            "class": "pivot-table-axis pivot-table-axis-columns",
            id: id + "-columns"
        }, null, container);
        cEl("DIV", {
            "class": "pivot-table-axis pivot-table-axis-rows",
            id: id + "-rows"
        }, null, container);
        cEl("DIV", {
            "class": "pivot-table-message",
            id: id + "-message"
        }, null, container);
        var cells = cEl("DIV", {
            "class": "pivot-table-axis pivot-table-cells",
            id: id + "-cells"
        }, null, container);
        listen(cells, "scroll", this.scrollHandler, this);
    },
    scrollHandler: function(event) {
        var cells = this.getCellsDom(),
            rowsTable = this.getRowsTableDom(),
            colsTable = this.getColumnsTableDom()
        ;
        if (rowsTable) {
            rowsTable.style.top = (-cells.scrollTop) + "px";
        }
        if (colsTable) {
            colsTable.style.left = (-cells.scrollLeft) + "px";
        }
    },
    getPagesDom: function(){
        return gEl(this.conf.id + "-pages");
    },
    getRowsDom: function(){
        return gEl(this.conf.id + "-rows");
    },
    getColumnsDom: function(){
        return gEl(this.conf.id + "-columns");
    },
    getCellsDom: function(){
        return gEl(this.conf.id + "-cells");
    },
    getPagesTableDom: function(){
        return gEl(this.conf.id + "-pages-table");
    },
    getRowsTableDom: function(){
        return gEl(this.conf.id + "-rows-table");
    },
    getColumnsTableDom: function(){
        return gEl(this.conf.id + "-columns-table");
    },
    getCellsTableDom: function(){
        return gEl(this.conf.id + "-cells-table");
    },
    getMessageDom: function(){
        return gEl(this.conf.id + "-message");
    },
    getDom: function() {
        if (!this.dom) {
            this.createDom();
        }
        return this.dom;
    },
    addPositionableRow: function(table, n, last) {
        var c, i, r = table.insertRow(last ? table.rows.length : 0);
        r.className = "positioning-row";
        for (i = 0; i < n; i++){
            c = r.insertCell(i);
            c.innerHTML = "<div>&#160;</div>"
        }
    },
    doLayout: function() {
        var container = this.getContainer(),
            pages = this.getPagesDom(),
            pagesTable = this.getPagesTableDom(),
            pagesTableHeight = (pagesTable ? pagesTable.clientHeight + 20 : 0),
            rows = this.getRowsDom(),
            rowsTable = this.getRowsTableDom(),
            rowsTableWidth = (rowsTable ? rowsTable.clientWidth : 0),
            rowsTableHeight = (rowsTable ? rowsTable.clientHeight : 0),
            cols = this.getColumnsDom(),
            colsTable = this.getColumnsTableDom(),
            cells = this.getCellsDom(),
            cellsTable = this.getCellsTableDom(),
            width, height
        ;
        if (!colsTable) return;
        if (pagesTable) {
            width = Math.min(container.parentNode.clientWidth, pagesTable.clientWidth + 2);
            pages.style.width = width + "px";
            pages.style.height = pagesTable.clientHeight + ((pagesTable.clientWidth > (container.parentNode.clientWidth + 5)) ? 16 : 0) + "px";
        }

    //put the column axis table right beneath the pages axis table
        cols.style.top = pagesTableHeight + "px";

    rows.style.width = rowsTableWidth + "px";
        cells.style.left = cols.style.left = rows.style.width;

        rows.style.top = (pagesTableHeight + colsTable.clientHeight) + "px";
        cells.style.top = rows.style.top;

        cols.style.height = colsTable.clientHeight + "px";

        width = Math.min(container.parentNode.clientWidth - scrollbarWidth, rowsTableWidth + colsTable.clientWidth);
        container.style.width = width + "px";
        cols.style.width = (width - rows.clientWidth) + "px";

        height = Math.min(container.parentNode.clientHeight - (container.offsetTop + container.clientTop + scrollbarHeight), cellsTable.clientHeight + colsTable.clientHeight + pagesTableHeight);
        container.style.height = height + "px";
        rows.style.height = (height - (cols.clientHeight + pagesTableHeight)) + "px";
        cells.style.width = (cols.clientWidth + (cellsTable.clientHeight + colsTable.clientHeight > (height + 5) ? 16 : 0)) + "px";
        cells.style.height = ((rowsTable ? rows.clientHeight: cellsTable.clientHeight) + (cellsTable.clientWidth + cellsTable.clientLeft > (width + 5) ? 16 : 0)) + "px";
        cells.style.overflowX = (rowsTableWidth + colsTable.clientWidth < container.parentNode.clientWidth) ? "hidden" : "auto";
        cells.style.overflowY = (rowsTableHeight + colsTable.clientHeight < (container.parentNode.clientHeight - (container.offsetTop + container.clientTop))) ? "hidden" : "auto";
    },
    renderRowset: function (rowset) {
        var me = this,
            start,
            columnNames = (rowset.getFieldNames ) ? rowset.getFieldNames() : null,
            columns = [],
            data = [], indexStart, indexEnd
            ;
            log.print("Rendering drill through data...");
            start = (new Date()).getTime();
        if (columnNames) {
            columnNames.forEach(function (columnName) {
                indexStart = columnName.lastIndexOf('[');
                indexEnd = columnName.lastIndexOf(']');
                if (indexStart && indexEnd && indexEnd < columnName.length && (indexStart+1) < indexEnd) {
                    columnName = columnName.substring(indexStart+1, indexEnd);
                    indexEnd = columnName.indexOf('.');
                    if (columnName.startsWith('$') && indexEnd < columnName.length && indexEnd > 1) {
                        columnName = columnName.substring(1,indexEnd);
                    }
                }
                columns.push({title: columnName});
            });
        }

        if (rowset.fetchAsArray && rowset.hasMoreRows) {
            while (rowset.hasMoreRows()) {
                data.push(rowset.fetchAsArray())
            }

            $('#drillthrough-datatable').DataTable( {
                data: data,
                columns: columns,
                destroy: true
            } );

            $( "#drillthrough-dialog" ).dialog({
                modal: true,
                //draggable: false,
                //resizable: true,
                autoResize: true,
                //position: ['center', 'center'],
                show: 'blind',
                hide: 'blind',
                maxWidth: (window.innerWidth - 40),
                maxHeight: (window.innerHeight - 40),
                width: (window.innerWidth - 100) ,
                height: (window.innerHeight - 100),
                overflow: "scroll"
                //dialogClass: 'ui-dialog-osx',
            });
            log.print("Drill through data rendered in " + ((new Date()).getTime() - start));
        }
    },
    renderDataset: function (dataset) {
        var me = this,
            start,
            container = me.getContainer(),
            columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
            rowAxis = dataset.hasRowAxis() ? dataset.getRowAxis() : null,
            pageAxis = dataset.hasPageAxis() ? dataset.getPageAxis() : null,
            table
        ;
        if (this.dataset) this.dataset.close();
        this.dataset = dataset;
        this.clear("");
        if (columnAxis) {
            log.print("Rendering column axis...");
            start = (new Date()).getTime();
            me.computeAxisLevels(columnAxis);
            table = cEl("TABLE", {
                "class": "pivot-table",
                id: this.conf.id + "-columns-table",
                cellpadding: 0,
                cellspacing: 0
            }, [
                cEl("THEAD")
            ]);
            me.renderAxisHorizontally(columnAxis, table);
            this.getColumnsDom().innerHTML = "";
            this.getColumnsDom().appendChild(table);
            log.print("Column axis rendered in " + ((new Date()).getTime() - start));
        }
        if (rowAxis) {
            log.print("Rendering row axis...");
            start = (new Date()).getTime();
            table = cEl("TABLE", {
                "class": "pivot-table",
                id: this.conf.id + "-rows-table",
                cellpadding: 0,
                cellspacing: 0
            }, [
                cEl("THEAD")
            ]);
            this.columnOffset = me.computeAxisLevels(rowAxis);
            me.renderAxisVertically(rowAxis, table);
            this.getRowsDom().innerHTML = "";
            this.getRowsDom().appendChild(table);
            log.print("Row axis rendered in " + ((new Date()).getTime() - start));
        }
        if (pageAxis) {
            log.print("Rendering page axis...");
            start = (new Date()).getTime();
            me.computeAxisLevels(pageAxis);
            table = cEl("TABLE", {
                "class": "pivot-table",
                id: this.conf.id + "-pages-table",
                cellpadding: 0,
                cellspacing: 0
            }, [
                cEl("THEAD")
            ]);
            me.renderAxisHorizontally(pageAxis, table);
            this.getPagesDom().innerHTML = "";
            this.getPagesDom().appendChild(table);
            log.print("Column axis rendered in " + ((new Date()).getTime() - start));
        }
        log.print("Rendering cells...");
        start = (new Date()).getTime();
        me.renderCells();
        log.print("Cells rendered in " + ((new Date()).getTime() - start));

        log.print("Loading cells...");
        start = (new Date()).getTime();
        me.loadCells();
        log.print("Cells loaded in " + ((new Date()).getTime() - start));

        this.doLayout();
    },
    renderAxisHorizontally: function(axis, table){
        var me = this;
        var thead = table.tHead;
        if (!thead) {
            thead = table.createTHead();
        }
        axis.eachHierarchy(function(hierarchy){
            var i, levels = hierarchy.levels, n = levels.length;
            for (i = 0; i < levels.length; i++){
                var r = thead.insertRow(thead.rows.length),
                    cells = r.cells,
                    memberCell = null,
                    c = null,
                    level = levels[i], lnum,
                    prevTupleName = null,
                    j, tuples = axis.tuples, m = tuples.length, tuple,
                    member
                ;
                if (!i && !hierarchy.index) me.addPositionableRow(table, m);
                for (j = 0; j < m; j++){
                    tuple = tuples[j];
                    cells = r.cells;
                    member = tuple.members[hierarchy.index];
                    lnum = member.LNum;
                    tupleName = me.getTupleName(tuple, hierarchy);
                    if (lnum === level) {
                        if (tupleName === prevTupleName) {
                            memberCell.colSpan++;
                        }
                        else {
                            memberCell = r.insertCell(r.cells.length);
                            memberCell.className = "th MDSCHEMA_MEMBERS";
                            memberCell.title = member.UName;
                            memberCell.innerHTML = member.Caption;
                            c = null;
                        }
                        prevTupleName = tupleName;
                    }
                    else {
                        if (level > lnum || tupleName.indexOf(prevTupleName) || !(memberCell = cells.item(cells.length - 1))) {
                            memberCell = r.insertCell(cells.length);
                            memberCell.className = "thh";
                            memberCell.innerHTML = "&#160;";
                            var sep = "].[";
                            if (!prevTupleName) {
                                var split = tupleName.split(sep);
                                prevTupleName = split.slice(0, split.length-1).join(sep);
                            }
                            prevTupleName = tupleName.split(sep).slice(0, prevTupleName.split(sep).length - (level < lnum ? 0 : 1)).join(sep);
                            //prevTupleName = tupleName;
                        }
                        else {
                            memberCell.colSpan++;
                        }
                    }
                }
            }
        });
    },
    renderAxisVertically: function(axis, table) {
        var me = this;
        var tbody = table.tBodies[0] || cEl("TBODY", null, null, table),
            rows = tbody.rows
        ;
        axis.eachHierarchy(function(hierarchy){
            var i, levels = hierarchy.levels, n = levels.length;
            for (i = 0; i < levels.length; i++){
                var c = null,
                    memberCell = null,
                    prevTupleName,
                    level = levels[i],
                    j, tuples = axis.tuples,
                    m = tuples.length, tuple,
                    r, cells, member, tupleName,
                    lnum
                ;
                for (j = 0; j < m; j++){
                    if (!hierarchy.index && !i) {
                        r = tbody.insertRow(rows.length);
                    }
                    else {
                        r = rows[j];
                    }
                    tuple = tuples[j];
                    cells = r.cells;
                    member = tuple.members[hierarchy.index];
                    lnum = member.LNum;
                    if (lnum === level) {
                        tupleName = me.getTupleName(tuple, hierarchy);
                        if (tupleName === prevTupleName) {
                            memberCell.rowSpan++;
                        }
                        else {
                            memberCell = r.insertCell(r.cells.length);
                            memberCell.className = "th MDSCHEMA_MEMBERS";
                            memberCell.title = member.UName;
                            memberCell.innerHTML = member.Caption;
                            c = null;
                        }
                        prevTupleName = tupleName;
                    }
                    else {
                        if (lnum < level) {
                            memberCell = cells.item(cells.length - 1);
                            if (memberCell && memberCell.className === "th MDSCHEMA_MEMBERS") memberCell.colSpan++;
                        }
                        else {
//                            if (c === null) {
                                c = r.insertCell(cells.length);
                                c.className = "th";
                                c.innerHTML = "&#160;";
                                memberCell = null;
//                            }
//                            else {
//                                c.rowSpan++;
//                            }
                        }
                    }
                }
            }
        });
    },
    renderCells: function(table) {
        if (!table) {
            table = cEl("TABLE", {
                "class": "pivot-table",
                id: this.conf.id + "-cells-table",
                cellpadding: 0,
                cellspacing: 0
            }, [
                cEl("TBODY")
            ]);
        }
        var dataset = this.dataset,
            rowAxis = dataset.hasRowAxis() ? dataset.getRowAxis() : null,
            columnAxis = dataset.hasColumnAxis() ? dataset.getColumnAxis() : null,
            tbody = table.tBodies[0] || cEl("TBODY", null, null, table),
            rows = tbody.rows,
            r,
            i, n = columnAxis.tupleCount(), colTuples, colTuple,
            j, m, rowTuples, rowTuple
        ;
        if (rowAxis) {
            m = rowAxis.tupleCount();
            for (j = 0; j < m; j++){
                r = rows[j];
                if (!r) r = tbody.insertRow(j);
                for (i = 0; i < n; i++){
                    r.insertCell(r.cells.length).className = "td";
                }
            }
        }
        else {
            r = tbody.insertRow(0);
            for (i = 0; i < n; i++) {
                r.insertCell(r.cells.length).className = "td";
            }
        }
        this.addPositionableRow(table, n, true);
        this.getCellsDom().appendChild(table);
    },
    loadCells: function(columnAxis, rowAxis, pageAxis){
        var args = [],
            table = this.getCellsTableDom(),
            tbody = table.tBodies[0],
            rows = tbody.rows,
            dataset = this.dataset,
            cellset = dataset.getCellset(),
            cell, cells, from, to,
            func = cellset.getByTupleIndexes,
            columnAxis = dataset.getColumnAxis(),
            axisCount = dataset.axisCount(),
            i, n = columnAxis.tupleCount(), colTuples, colTuple,
            j, m, rowTuples, rowTuple,
            k, l,
            r, c, tds, r1, c1,
            columnsTable = this.getColumnsTableDom(),
            columnspositioningCells = columnsTable.rows[0].cells,
            positioningCells = rows[rows.length - 1].cells;
        ;
        if (dataset.hasPageAxis()) {
            args.push(dataset.getPageAxis().tupleIndex());
        }
        if (dataset.hasRowAxis()) {
            var rowsTableDom = this.getRowsTableDom();
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
                r = rows[j];
                tds = r.cells;
                var columnOffset = -1;
                while (tds[++columnOffset].className.indexOf("th") !== -1);
                for (i = 0; i < n; i++, k++) {
                    c = tds[columnOffset + i];
                    if (cell && cell.ordinal === k) {
                        c.innerHTML = (typeof(cell["FmtValue"]) === "undefined") ? cell.Value : cell.FmtValue;
                        cell = cells[++l];
                    }
                    else {
                        c.innerHTML = "";
                    }
                }
                r1 = rowsTableDom.rows[j];
                r.style.height = r1.style.height = (Math.max(r.clientHeight, r1.clientHeight)) + "px";
            }
        }
        else
        if (dataset.hasColumnAxis()) {
            r = rows[0];
            from = cellset.cellOrdinalForTupleIndexes(0);
            to = cellset.cellOrdinalForTupleIndexes(n - 1);
            cells = cellset.fetchRangeAsArray(from, to);
            cell = cells.length ? cells[0] : null;
            for (i = 0, l = 0; i < n; i++) {
                args[0] = i;
                c = r.cells[i];
                if (cell && cell.ordinal === i) {
                    c.innerHTML = (typeof(cell["FmtValue"]) === "undefined") ? cell.Value : cell.FmtValue;
                    cell = cells[++l];
                }
                else {
                    c.innerHTML = "";
                }
            }
        }
        for (i = 0; i < n; i++) {
            c = columnspositioningCells[i];
            c1 = positioningCells[i];
            c.firstChild.style.width = c1.firstChild.style.width = Math.max(c.clientWidth, c1.clientWidth) + "px";
        }
    },
    getColumnOffset: function() {
        return this.columnOffset;
    },
    clear: function(text){
        this.getRowsDom().innerHTML = "";
        this.getCellsDom().innerHTML = "";
        this.getColumnsDom().innerHTML = "";
        this.setMessage(typeof(text) === "undefined" ? "No results to display" : text);
    },
    setMessage: function(text) {
        this.getMessageDom().innerHTML = text;
    }
};
/***************************************************************
*
*   DatasetExporter
*
***************************************************************/
var DatasetExporter;
(DatasetExporter = function(){
}).prototype = {
    toODFSpreadSheet: function(dataset) {
        var axisCount = dataset.axisCount();
        if (axisCount > 3) throw "Can export only upto 3 axes, this data set has " + axisCount;
        var pageAxis = (axisCount === 3 ? dataset.getPageAxis() : null),
            rowAxis = (axisCount >= 2 ? dataset.getRowAxis() : null),
            rowTupleCount = (axisCount >= 2 ? rowAxis.tupleCount() : 0),
            rowHierarchyCount = (rowAxis ? rowAxis.hierarchyCount() : 0),
            columnAxis = (axisCount >= 1 ? dataset.getColumnAxis() : null),
            columnTupleCount = columnAxis.tupleCount(),
            cellset = dataset.getCellset(),
            lines = []
        ;

        var colHeaderLeader = "", columns = "";

        function toODFTable(pageTuple) {
            var name, members, member, i, n,
                ordinalArgs = [], from, to,
                cells, cell
            ;
            function writeMember(){
                lines.push('<table:table-cell>');
                lines.push('<text:p>');
                lines.push(member.Caption);
                lines.push('</text:p>');
                lines.push('</table:table-cell>');
            }
            function writeCell(ordinal) {
                var val, fmtVal;
                lines.push('<table:table-cell');
                if (cell && cell.ordinal === ordinal) {
                    val = cell.Value;
                    fmtVal = cell.FmtValue;
                    lines.push(' office:value="' + val + '"');
                    lines.push(' office:value-type="float"');
                    lines.push('>');
                    lines.push('<text:p>');
                    lines.push((typeof(fmtVal) === "undefined") ? val : fmtVal);
                    lines.push('</text:p>');
                    lines.push('</table:table-cell>');
                    cell = cells[++i];
                }
                else {
                    lines.push('/>');
                }
            }

            if (pageTuple) {
                ordinalArgs[0] = pageTuple.index;
                members =  pageTuple.members;
                n = members.length;
                name = "";
                for (i = 0; i < n; i++){
                    if (name.length) name += " / ";
                    name += members[i].Caption;
                }
            }
            else name = "Sheet1";

            if (!columns) {
                switch (rowHierarchyCount) {
                    case 0:
                        break;
                    default:
                        for (i = 0; i < rowHierarchyCount; i++) {
                            columns += '<table:table-column/>';
                            colHeaderLeader += '<table:table-cell/>';
                        }
                }
                for (i = 0; i < columnTupleCount; i++) {
                    columns += '<table:table-column/>';
                }
            }

            lines.push('<table:table table:name="' + name + '">');
            lines.push(columns);
            columnAxis.eachHierarchy(function(hierarchy){
                lines.push('<table:table-row>');
                lines.push(colHeaderLeader);
                columnAxis.eachTuple(function(tuple){
                    member = tuple.members[hierarchy.index];
                    writeMember();
                });
                lines.push('</table:table-row>');
            });
            if (rowAxis) {
                ordinalArgs[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = 0;
                ordinalArgs[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = 0;
                from = cellset.cellOrdinalForTupleIndexes.apply(cellset, ordinalArgs);

                ordinalArgs[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = rowTupleCount - 1;
                ordinalArgs[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = columnTupleCount - 1;
                to = cellset.cellOrdinalForTupleIndexes.apply(cellset, ordinalArgs);

                cells = cellset.fetchRangeAsArray(from, to);
                cell = cells.length ? cells[i = 0] : null;

                rowAxis.eachTuple(function(tuple){
                    lines.push('<table:table-row>');
                    ordinalArgs[axisCount - Xmla.Dataset.AXIS_ROWS - 1] = tuple.index;
                    rowAxis.eachHierarchy(function(hierarchy) {
                        member = tuple.members[hierarchy.index];
                        writeMember();
                    });
                    columnAxis.eachTuple(function (tuple) {
                        ordinalArgs[axisCount - Xmla.Dataset.AXIS_COLUMNS - 1] = tuple.index;
                        writeCell(cellset.cellOrdinalForTupleIndexes.apply(cellset, ordinalArgs));
                    });
                    lines.push('</table:table-row>');
                });
            }
            else {
                cells = cellset.fetchRangeAsArray(0, columnTupleCount - 1);
                cell = cells.length ? cells[i = 0] : null;

                lines.push('<table:table-row>');
                columnAxis.eachTuple(function (tuple) {
                    writeCell(tuple.index);
                });
                lines.push('</table:table-row>');
            }
            lines.push('</table:table>');
        }

        function toODFTables() {
            if (pageAxis) {
                pageAxis.eachTuple(function(tuple){
                    toODFTable(tuple);
                });
            }
            else {
                toODFTable();
            }
        }
        toODFTables(dataset);
        //see: http://docs.oasis-open.org/office/v1.2/os/OpenDocument-v1.2-os-part1.html
        //http://odf-validator.rhcloud.com/
        var jsZip = new JSZip(),
            date = new Date(),
            year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDate(),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            seconds = date.getSeconds(),
            mimetype = "application/vnd.oasis.opendocument.spreadsheet",
            xDecl = '<?xml version="1.0" encoding="UTF-8"?>',
            table = lines.join(""),
            content = [
              xDecl,
              '<office:document-content',
              ' xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
              ' xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
              ' xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
              ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
              ' xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
              ' xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
              ' office:version="1.2"',
              '>',
              ' <office:font-face-decls>',
              '  <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss" style:font-pitch="variable"/>',
              '  <style:font-face style:name="DejaVu Sans" svg:font-family="&apos;DejaVu Sans&apos;" style:font-family-generic="system" style:font-pitch="variable"/>',
              '  <style:font-face style:name="Lohit Hindi" svg:font-family="&apos;Lohit Hindi&apos;" style:font-family-generic="system" style:font-pitch="variable"/>',
              '  <style:font-face style:name="WenQuanYi Micro Hei" svg:font-family="&apos;WenQuanYi Micro Hei&apos;" style:font-family-generic="system" style:font-pitch="variable"/>',
              ' </office:font-face-decls>',
              ' <office:automatic-styles>',
              '  <style:style style:name="co1" style:family="table-column">',
              '   <style:table-column-properties fo:break-before="auto" style:column-width="0.889in"/>',
              '  </style:style>',
              '  <style:style style:name="ro1" style:family="table-row">',
              '   <style:table-row-properties style:row-height="0.1681in" fo:break-before="auto" style:use-optimal-row-height="true"/>',
              '  </style:style>',
              '  <style:style style:name="ro2" style:family="table-row">',
              '   <style:table-row-properties style:row-height="0.178in" fo:break-before="auto" style:use-optimal-row-height="true"/>',
              '  </style:style>',
              '  <style:style style:name="ta1" style:family="table" style:master-page-name="Default">',
              '   <style:table-properties table:display="true" style:writing-mode="lr-tb"/>',
              '  </style:style>',
              '  <style:style style:name="ce1" style:family="table-cell" style:parent-style-name="Default">',
              '   <style:table-cell-properties style:text-align-source="fix" style:repeat-content="false" style:vertical-align="middle"/>',
              '   <style:paragraph-properties fo:text-align="center"/>',
              '  </style:style>',
              ' </office:automatic-styles>',
              ' <office:body>',
              '  <office:spreadsheet>',
              table,
              '  </office:spreadsheet>',
              ' </office:body>',
              '</office:document-content>'
            ].join(""),
            meta = [
              xDecl,
              '<office:document-meta',
              ' xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
              ' xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
              ' office:version="1.2"',
              '>',
              '<office:meta>',
              '<meta:creation-date>',
                year                                   , "-",
                (month   > 9 ? month   : "0" + month)  , "-",
                (day     > 9 ? day     : "0" + day)    , "T",
                (hours   > 9 ? hours   : "0" + hours)  , ":",
                (minutes > 9 ? minutes : "0" + minutes), ":",
                (seconds > 9 ? seconds : "0" + seconds),
              '</meta:creation-date>',
              '<meta:generator>xmla4js</meta:generator>',
              '<meta:document-statistic meta:table-count="1" meta:cell-count="0" meta:object-count="0"/>',
              '</office:meta>',
              '</office:document-meta>'
            ].join(""),
            settings = [
              xDecl
            ].join(""),
            styles = [
              xDecl,
              '<office:document-styles',
              ' xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
              ' xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
              ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
              ' xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
              ' xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
              ' xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
              ' xmlns:xlink="http://www.w3.org/1999/xlink"',
              ' xmlns:dc="http://purl.org/dc/elements/1.1/"',
              ' xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
              ' xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"',
              ' xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"',
              ' xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
              ' xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"',
              ' xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0"',
              ' xmlns:math="http://www.w3.org/1998/Math/MathML"',
              ' xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"',
              ' xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0"',
              ' xmlns:ooo="http://openoffice.org/2004/office"',
              ' xmlns:ooow="http://openoffice.org/2004/writer"',
              ' xmlns:oooc="http://openoffice.org/2004/calc"',
              ' xmlns:dom="http://www.w3.org/2001/xml-events"',
              ' xmlns:rpt="http://openoffice.org/2005/report"',
              ' xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"',
              ' xmlns:xhtml="http://www.w3.org/1999/xhtml"',
              ' xmlns:grddl="http://www.w3.org/2003/g/data-view#"',
              ' xmlns:tableooo="http://openoffice.org/2009/table"',
              ' xmlns:css3t="http://www.w3.org/TR/css3-text/" office:version="1.2"',
              '>',
              '<office:font-face-decls>',
              '</office:font-face-decls>',
              '</office:document-styles>'
            ].join(""),
            manifest = [
              xDecl,
              '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">',
               '<manifest:file-entry manifest:media-type="' + mimetype + '" manifest:version="1.2" manifest:full-path="/"/>',
               '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>',
//               '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="settings.xml"/>',
               '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>',
//               '<manifest:file-entry manifest:media-type="image/png" manifest:full-path="Thumbnails/thumbnail.png"/>',
//               '<manifest:file-entry manifest:media-type="" manifest:full-path="Configurations2/accelerator/current.xml"/>',
//               '<manifest:file-entry manifest:media-type="application/vnd.sun.xml.ui.configuration" manifest:full-path="Configurations2/"/>',
               '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>',
              '</manifest:manifest>'
            ].join(""),
            metaInf, thumbnails
        ;
        jsZip.file("mimetype", mimetype);
        jsZip.file("meta.xml", meta);
        jsZip.file("styles.xml", styles);
        jsZip.file("content.xml", content);
        //jsZip.file("settings.xml", settings);
        metaInf = jsZip.folder("META-INF");
        metaInf.file("manifest.xml", manifest);
        //thumbnails = jsZip.folder("Thumbnails");
        return "data:" + mimetype + ";base64," + encodeURIComponent(jsZip.generate());
    }
};
listen(gEl("export"), "click", function(){
    var uri = new DatasetExporter().toODFSpreadSheet(pivotTable.dataset);
    window.open(uri);
});
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
*   Menu
*
***************************************************************/
var Menu;
(Menu = function(conf) {
    this.conf = conf;
    this.init();
}).prototype = {
    init: function(){
        var conf = this.conf,
            items = conf.items,
            popUpSource = conf.popUpSource
        ;
        listen(this.getContainer(), "click", this.containerClicked, this);
        if (iFun(conf.checkShowMenu)){
            this.checkShowMenu = conf.checkShowMenu;
        }
        if (iFun(conf.menuClicked)){
            this.menuClicked = conf.menuClicked;
        }
        this.createDom();
        if (items) this.addItems();
        this.hide();
    },
    getId: function(){
        return Menu.prefix + this.conf.id;
    },
    getContainer: function() {
        var container = this.conf.container;
        if (!container) return doc.body;
        if (iNod(container)) return container;
        if (iStr(container)) return gEl(container);
    },
    createDom: function(){
        var conf = this.conf,
            container = this.getContainer()
        ;
        var dom = cEl("div", {
            "class": "menu " + (conf.customClass ? conf.customClass : ""),
            id: this.getId()
        }, null, container);
        listen(dom, "click", this.menuClicked, this);
        return dom;
    },
    containerClicked: function(event) {
        if (iFun(this.checkShowMenu) && this.checkShowMenu(event) === true) {
            var container = this.getContainer(),
                p = pos(container),
                xy = event.getXY()
            ;
            this.show(xy.x - p.left, xy.y - p.top);
        }
        else this.hide();
    },
    menuClicked: function(event) {
        var target = event.getTarget();
    },
    getDom: function() {
        var el = gEl(this.getId());
        if (!el) {
            el = this.createDom();
            if (this.conf.items) this.addItems();
        }
        return el;
    },
    addItem: function(conf){
        var dom = this.getDom(),
            itemDom
        ;
        itemDom = cEl("div", {
            "class": "menu-item " + (conf.customClass ? conf.customClass : "")
        }, conf.text, dom);
    },
    addItems: function() {
        var conf = this.conf,
            items = conf.items,
            i, n = items.length
        ;
        for (i = 0; i < n; i++) {
            this.addItem(items[i]);
        }
    },
    show: function(x, y) {
        var dom = this.getDom();
        dom.style.left = x + "px";
        dom.style.top = y + "px";
        dom.style.display = "";
    },
    hide: function(){
        this.getDom().style.display = "none";
    }
};
Menu.prefix = "menu";

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
            },
            discover: function(eventName, eventData, xmla){
                gEl("url").className = "busy";
            },
            discoversuccess: function(eventName, eventData, xmla){
                gEl("url").className = "";
            },
            discovererror: function(eventName, eventData, xmla){
                gEl("url").className = "";
            }
        }
    }),
    ddHandler = new DDHandler({
        node: document.body,
        dragProxy: "ddDragProxy"
    }),
    queryDesigner = new QueryDesigner({
        container: "query-designer"
    }),
    pivotTable = new PivotTable({
        id: "query-results"
    }),
    queryDesignerMenu = new Menu({
        container: "query-designer",
        id: "-query-designer",
        popUpSource: null,
        items: [
            {text: "Drill down"}
        ],
        menuClicked: function(event) {
            var drillSource = null;
            if (this.popUpSource.id) {
                drillSource = queryDesigner.cube.hierarchies[this.popUpSource.id.replace('.[All]','')];
            }
            if (drillSource) {
                if (drillSource.drilldownLevel) {
                    drillSource.drilldownLevel = false;
                } else {
                    drillSource.drilldownLevel = true;
                }
            }
            queryDesigner.queryChanged(queryDesigner);
        },
        checkShowMenu: function(event) {
            var res = (QueryDesignerAxis.lookup(target)) ? true : false;
            if (res) {
                this.popUpSource = event.getTarget();
                var drillSource = queryDesigner.cube.hierarchies[this.popUpSource.id.replace('.[All]','')];
                this.getDom().firstElementChild.innerText = 'Drill ' + ((drillSource && drillSource.drilldownLevel) ? 'up' : 'down');
            }
            return res;
        }
    }),
    cellPivotMenu = new Menu({
        container: "query-results",
        id: "-query-results",
        popUpSource: null,
        items: [
            {text: "Drill through"}
        ],
        menuClicked: function(event) {
            var cellIndex = this.popUpSource.cellIndex,
                rowIndex = this.popUpSource.parentElement.rowIndex,
                rowHeaders = document.getElementById('query-results-rows-table').children[1],
                columnHeaders = document.getElementById('query-results-columns-table').firstElementChild.children,
                criteria = "", candidateRow, candidateColumn, index, lastFoundIndex, calculatedIndex;
            // collect row part of criteria
            while (rowIndex >= 0) {
                candidateRow = rowHeaders.children[rowIndex];
                if (!lastFoundIndex) {
                    lastFoundIndex = candidateRow.children.length;
                }
                index = lastFoundIndex -1;
                while (index >= 0 && (index >= candidateRow.children.length
                || !candidateRow.children[index].title)) {
                    index--;
                }
                if (index >= 0) {
                    lastFoundIndex = index;
                    if (!candidateRow.children[index].title.endsWith('.[All]')
                        && !candidateRow.children[index].title.endsWith('.&[]')
                        && !candidateRow.children[index].title.startsWith('[Measures].')
                    ) {
                        if (criteria.length > 0) {
                            criteria += ', ';
                        }
                        criteria += '{' + candidateRow.children[index].title + '}';
                    }
                }
                rowIndex--;
            }
            // collect column part of criteria
            for (var columnHeaderRow = columnHeaders.length -1; columnHeaderRow > 0; columnHeaderRow--) {
                index = 0;
                calculatedIndex = 0;
                while (calculatedIndex < cellIndex && index < columnHeaders[columnHeaderRow].children.length) {
                    if (columnHeaders[columnHeaderRow].children[index].getAttribute("colspan")) {
                        calculatedIndex += columnHeaders[columnHeaderRow].children[index].getAttribute("colspan");
                    } else {
                        calculatedIndex++;
                    }
                    index++;
                }
                if (calculatedIndex >= cellIndex) {
                    if (calculatedIndex > cellIndex) {
                        index--;
                    }
                    if (columnHeaders[columnHeaderRow].children[index].title
                        && !columnHeaders[columnHeaderRow].children[index].title.endsWith('.[All]')
                        && !columnHeaders[columnHeaderRow].children[index].title.endsWith('.&[]')
                        && !columnHeaders[columnHeaderRow].children[index].title.startsWith('[Measures].')) {
                        if (criteria.length > 0) {
                            criteria += ', ';
                        }
                        criteria += '{' + columnHeaders[columnHeaderRow].children[index].title + '}';
                    }

                }
            }
            var mdx = 'DRILLTHROUGH SELECT FROM [' + queryDesigner.cube.cube.CUBE_NAME + '] WHERE (' + criteria + ')';
            executeDrillThrough(mdx);
        },
        checkShowMenu: function(event) {
            var eventTarget = event.getTarget();
            var res =  (eventTarget.nodeType == 1 && eventTarget.tagName== 'TD'
                && eventTarget.parentElement.tagName == 'TR'
                && eventTarget.parentElement.parentElement.tagName == 'TBODY'
                && eventTarget.parentElement.parentElement.parentElement.tagName == 'TABLE'
                && eventTarget.parentElement.parentElement.parentElement.id == 'query-results-cells-table') ;
            if (res) {
                this.popUpSource = eventTarget;
            }
            return res;
        }
    });;
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
    pivotTable.clear();
}
function clearWorkarea() {
    gEl("query-designer").innerHTML = "";
    var queryText = gEl("query-text");
    if (queryText) queryText.innerHTML = "";
    pivotTable.clear();
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
    treeNode = TreeNode.lookup(target);
    if (treeNode) {
      if (target.tagName === "SPAN" && target.className === "toggle") treeNode.toggle();
      else
      if (treeNode.getCustomClass() === "MDSCHEMA_CUBES") selectCube(treeNode);
    }
    else {
      if (target.tagName === "SPAN") target = target.parentNode;
      if (target.tagName === "DIV" && target.id === "datasources-head") toggleDataSources();
    }
}
function showMdxClicked(){
    var el = gEl("show-mdx");
    gEl("query").style.display = el.checked ? "block" : "none";
    pivotTable.doLayout();
}

function executeClicked(){
    var el = gEl("query-text"),
        mdx = el.value
    ;
    execute(mdx);
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
                    id: req.requestType + ":" + row.DataSourceName,
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
                                id: req.requestType + ":" + row.CATALOG_NAME,
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
                                            id: req.requestType + ":" + row.CATALOG_NAME + "." + row.CUBE_NAME,
                                            parentTreeNode: req.nodeId,
                                            customClass: req.requestType,
                                            title: row.CUBE_CAPTION || row.CUBE_NAME,
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
                    id: req.requestType + ":" + row.MEASURE_UNIQUE_NAME,
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
                            id: req.requestType + ":" + row.HIERARCHY_UNIQUE_NAME,
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
                                                id: req.requestType + ":" + row.LEVEL_UNIQUE_NAME,
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
                                                                                nodeId
                                                                            ;
                                                                            nodeId = (new TreeNode({
                                                                                id: "MDSCHEMA_MEMBERS:" + memberUniqueName,
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
                                                                    id: "MDSCHEMA_MEMBERS:" + row.MEMBER_UNIQUE_NAME,
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

function workAreaResized(x){
    var splitter = gEl("vertical-splitter"),
        el, right, width
    ;
    splitter.style.left = x + "px";
    splitterLeft = splitter.offsetLeft + splitter.clientWidth;
    el = gEl("metadata");
    el.style.width = el.clientWidth + (splitter.offsetLeft - el.clientWidth - 4) + "px";
    el = gEl("workarea");
    right = el.offsetLeft + el.clientWidth + 4;
    width = right - splitterLeft - 8;
    el.style.left = splitterLeft + "px";
    el.style.width = width + "px";
    pivotTable.doLayout();
}

function workAreaResized(x){
    var splitter = gEl("vertical-splitter"),
        el, right, width
    ;
    if (iUnd(x)) {
      x = splitter.offsetLeft;
    }
    else {
      splitter.style.left = x + "px";
    }
    splitterLeft = splitter.offsetLeft + splitter.clientWidth;
    el = gEl("metadata");
    //el.style.width = el.clientWidth + (splitter.offsetLeft - el.clientWidth - 15) + "px";
    el.style.width = x + "px";
    el = gEl("workarea");
    //right = el.offsetLeft + el.clientWidth;
    el.style.left = (x + splitter.clientWidth) + "px";
    el.style.width = (el.parentNode.clientWidth - (x + splitter.clientWidth)) + "px"
    el.style.right = "0px";
    //width = right - splitterLeft;
    //el.style.left = splitterLeft + "px";
    //el.style.width = width + "px";
}

function execute(mdx) {
    if (!mdx.length) {
        pivotTable.clear();
        return;
    }
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
        },
        callback: function() {
            queryDesigner.busy(false);
        },
        properties: {
          Format: "Multidimensional",
          AxisFormat: "TupleFormat"
        }
    });
}

    function executeDrillThrough(mdx) {
        if (!mdx.length) {
            return;
        }
        log.print("About to execute Query...");
        var start = (new Date()).getTime();
        xmla.execute({
            async: true,
            statement: mdx,
            success: function(xmla, req, resp) {
                log.print("Succes executing mdx in " + ((new Date()).getTime() - start) + "ms");
                pivotTable.renderRowset(resp);
            },
            error: function(a, b, c) {
                log.print("Error executing mdx in " + ((new Date()).getTime() - start) + "ms");
                alert(c.toString());
            },
            callback: function() {
                queryDesigner.busy(false);
            },
            properties: {
                Format: "Tabular",
                AxisFormat: "CustomFormat"
            }
        });
    }

    function init() {
    //set up listeners
    listen("discover", "click", discoverClicked);
    listen("show-mdx", "click", showMdxClicked);
    listen("execute", "click", executeClicked);
    listen("metadata", "click", metadataClicked);
    listen(window, "resize", function(){
        pivotTable.doLayout();
    });
    var overflow;
    ddHandler.listen({
        startDrag: function(event, ddHandler) {
            var target = event.getTarget(), startDragEvent,
                tagName = target.tagName, id,
                className = target.className,
                treeNode, title, queryAxis,
                type, data, dragProxy, xy,
                dragProxy = ddHandler.dragProxy
            ;
            gEl("cube-body").style.overflowY = "hidden";
            gEl("workspace").className = "no-user-select";
            startDragEvent = ddHandler.startDragEvent;
            startDragEvent.item = null;
            xy = event.getXY();
            if (className === "vertical-splitter") {
                type = className;
                dragProxy.style.backgroundColor = "silver";
            }
            else
            if (treeNode = TreeNode.lookup(target)) {
                if (className !== "label") return;
                type = treeNode.getCustomClass();
                switch (type) {
                    case "MDSCHEMA_MEASURES":
                    case "MDSCHEMA_HIERARCHIES":
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                        break;
                    default:
                        return false;
                }
                data = treeNode.getConf().metadata;
            }
            else
            if (queryAxis = QueryDesignerAxis.lookup(target)){
                type = className;
                id = target.id;
                switch (type) {
                    case "MDSCHEMA_HIERARCHIES":
                        data = queryAxis.getHierarchyByName(id);
                        break;
                    case "MDSCHEMA_MEASURES":
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                        data = queryAxis.getMemberByExpression(id).setDef.metadata;
                        break;
                    default:
                        return false;
                }
            }
            else return false;

            var cubeBody = gEl("cube-body").style
            overflow = cubeBody.overflow;
            //cubeBody.overflow = "hidden";
            startDragEvent.item = {
                data: data,
                type: type
            };
            dragProxy.style.position = "absolute";
            dragProxy.className = type;
            dragProxy.innerHTML = target.innerHTML;
            dragProxy.style.left = (xy.x - 15) + "px";
            if (className === "vertical-splitter") {
                dragProxy.style.height = target.clientHeight + "px";
                dragProxy.style.top = target.clientTop + 40 + "px";
            }
            else {
                dragProxy.style.top = (xy.y) + "px";
            }
            return true;
        },
        whileDrag: function(event, ddHandler) {
            //event.browserEvent.stopPropagation();
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
            if (item.type !== "vertical-splitter") {
                dragProxy.style.top = (xy.y + 2) + "px";
            }
            dragProxy.style.left = (xy.x -5) + "px";
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
            gEl("cube-body").style.overflow = overflow;
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
            if (origin.className === "vertical-splitter") {
                workAreaResized(dragProxy.offsetLeft);
            }
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
                        var hierarchyName = queryDesignerAxis.getHierarchyName(data),
                            queryDesigner = queryDesignerAxis.getQueryDesigner(),
                            oldQueryDesignerAxis = queryDesigner.getAxisForHierarchy(hierarchyName)
                        ;
                        if (oldQueryDesignerAxis) {
                            if (oldQueryDesignerAxis === queryDesignerAxis) {
                                var index = queryDesignerAxis.getHierarchyIndexForTd(target);
                                queryDesignerAxis.moveHierarchy(
                                    hierarchyName,
                                    index + 1
                                );
                            }
                            else {
                                var index = queryDesignerAxis.getHierarchyIndexForTd(target);
                                queryDesigner.moveHierarchy(
                                    hierarchyName,
                                    oldQueryDesignerAxis,
                                    queryDesignerAxis,
                                    index + 1
                                );
                            }
                        }
                        else queryDesignerAxis.itemDropped(target, type, data);
                        break;
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
            if (queryDesignerAxis = QueryDesignerAxis.lookup(origin)) {
                //lets remove something from an axis.
                switch (type) {
                    case "MDSCHEMA_HIERARCHIES":
                        queryDesignerAxis.removeHierarchy(data);
                        break;
                    case "MDSCHEMA_LEVELS":
                    case "MDSCHEMA_MEMBERS":
                    case "MDSCHEMA_MEASURES":
                        queryDesignerAxis.removeMember(data);
                        break;
                    default:
                }
            }
            if (queryDesigner) {
                queryDesigner.hideProxies();
            }
            dragProxy.className = "";
            dragProxy.style.height = "";
            dragProxy.style.backgroundColor = "";
            dragProxy.innerHTML = "";
            gEl("workspace").className = "";
        }
    });
    queryDesigner.queryChanged = function(queryDesigner) {
        var me = this;
        me.busy(true);
        log.clear();
        var mdx = queryDesigner.getMdx();
        gEl("query-text").innerHTML = mdx;
        execute(mdx);
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
    //bug in gecko: mouseup event does not report correct target
    //in case overflow in anything but hidden.
    if (!(navigator.userAgent.indexOf("Gecko") && navigator.userAgent.indexOf("WebKit") === -1)) {
        gEl("cube-body").style.overflow = "auto";
    }
    workAreaResized(200);
}

init();

})();
