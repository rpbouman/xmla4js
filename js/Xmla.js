(function (){

var _soap = "http://schemas.xmlsoap.org/soap/",
    _xmlnsSOAPenvelope = _soap + "envelope/",
    _xmlnsIsSOAPenvelope = "xmlns:SOAP-ENV=\"" + _xmlnsSOAPenvelope + "\"",
    _SOAPencodingStyle = "SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"",
    _ms = "urn:schemas-microsoft-com:",
    _xmlnsXmla = _ms + "xml-analysis",
    _xmlnsIsXmla = "xmlns=\"" + _xmlnsXmla + "\"",
    _xmlnsSQL = _ms + "xml-sql",
    _xmlnsSchema = "http://www.w3.org/2001/XMLSchema",
    _xmlnsRowset = _xmlnsXmla + ":rowset",
    _useAX = window.ActiveXObject? true : false
;    

function _ajax(options){
/*
    This is not a general ajax function, 
    just something that is good enough for Xmla.

    Requirement is that the responseXML can be used directly for XSLT.
    We cannot rely on jQuery using the right object out of the mess of msxml
    Also, since we found out that we cannot use jQuery css selectors to parse XMLA results in all browsers,
    we moved to straight dom traversal, leaving the ajax as only jQuery dependency. 
    We think we can end up with a leaner xmla lib if we can ditch the jQuery dependency
    
    options we need to support:
    
    async
    data: soapMessage
    error: callback
    complete: callback
    url: 
    type: (GET, POST)
*/
    var xhr;
    if (_useAX) {
        xhr = new ActiveXObject("MSXML2.XMLHTTP.3.0");
    } 
    else {
        xhr = new XMLHttpRequest();
    }
    xhr.open("POST", options.url, options.async);
    var handlerCalled = false;
    var handler = function(){
        handlerCalled = true;
        switch (xhr.readyState){
            case 0:
                options.aborted(xhr);                    
                break;
            case 4:
                if (xhr.status===200){
                    options.complete(xhr, "success");
                }
                else {
                    options.error(xhr, xhr.status, null);
                }
            break;
        }
    };
    xhr.onreadystatechange = handler;
    xhr.setRequestHeader("Content-Type", "text/xml");
    xhr.send(options.data);
    if (!options.async && !handlerCalled){
        handler.call(xhr);
    }        
    return xhr;
}

function _isUndefined(arg){
    return typeof(arg)==="undefined";
}
function _isFunction(arg){
    return typeof(arg)==="function";
}
function _isString(arg){
    return typeof(arg)==="string";
}
function _isNumber(arg){
    return typeof(arg)==="number";
}
function _isObject(arg){
    return typeof(arg)==="object";
}

function _xmlEncodeListEntry(value){
    return value.replace(/\&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

var _getElementsByTagNameNS = function(node, ns, tagName){
    if (_isFunction(node.getElementsByTagNameNS)){
        return node.getElementsByTagNameNS(ns, tagName);
    }
    else {
        return node.getElementsByTagName(tagName);
    }
};

var _getAttributeNS = function(element, ns, attributeName){
    if (_isFunction(element.getAttributeNS)){
        return element.getAttributeNS(ns, attributeName);
    }
    else {
        return element.getAttribute(attributeName);
    }
};


function _getXmlaSoapList(container, listType, items){
    var msg = "<" + container + ">";
    if (items) {
        var item;
        msg += "<" + listType + ">";
        for (var property in items){
            if (items.hasOwnProperty(property)) {
                item = items[property];
                msg += "<" + property + ">";
                if (typeof(item)==="array"){
                    for (var entry, i=0, numItems = item.length; i<numItems; i++){
                        entry = item[i];
                        msg += "<Value>" + _xmlEncodeListEntry(entry) + "</Value>";
                    }
                } else {
                    msg += _xmlEncodeListEntry(item);
                }
                msg += "</" + property + ">";
            }
        }
        msg += "</" + listType + ">";
    }
    msg += "</" + container + ">";
    return msg;
}

function _getXmlaSoapMessage(
    options
){
    var msg = "";
    var method = options.method;
    msg += "<SOAP-ENV:Envelope " + _xmlnsIsSOAPenvelope + " " + _SOAPencodingStyle + ">" + 
    "<SOAP-ENV:Body>" + 
    "<" + method + " " + _xmlnsIsXmla + " " + _SOAPencodingStyle + ">"
    ;
    var exception = null;
    switch(method){
        case Xmla.METHOD_DISCOVER:
            if (_isUndefined(options.requestType)) {
                exception = {
                    name: "Missing request type",
                    description: "Requests of the \"Discover\" method must specify a requestType."
                };
            }
            else {
                msg += "<" + Xmla.REQUESTTYPE + ">" + options.requestType + "</" + Xmla.REQUESTTYPE + ">" + 
                _getXmlaSoapList("Restrictions", "RestrictionList", options.restrictions) + 
                _getXmlaSoapList("Properties", "PropertyList", options.properties)
                ;
            }
            break;
        case Xmla.METHOD_EXECUTE:
            if (_isUndefined(options.statement)){
                exception = {
                    name: "Missing statement",
                    description: "Requests of the \"Execute\" method must specify an MDX statement."
                };
            }
            else {
                msg += "<Command><Statement>" + options.statement + "</Statement></Command>" + 
                _getXmlaSoapList("Properties", "PropertyList", options.properties)
                ;
            }
            break;
        default:
            exception = {
                name: "Invalid XMLA method",
                description: "The method must be either \"Discover\" or \"Execute\"."
            };
    }
    if (exception!==null){
        throw exception;
    }
    msg += "   </" + method + ">" + 
        "</SOAP-ENV:Body>" + 
        "</SOAP-ENV:Envelope>"
    ;
    return msg;
}

function _applyProperties(object, properties, overwrite){
    if (properties && (!object)) {
        object = {};
    }
    for (var property in properties){
        if (properties.hasOwnProperty(property)){
            if (overwrite || _isUndefined(object[property])) {
                object[property] = properties[property];
            }
        }
    }
    return object;
}

Xmla = function(options){

    this.listeners = {};
    this.listeners[Xmla.EVENT_REQUEST] = [];
    this.listeners[Xmla.EVENT_SUCCESS] = [];
    this.listeners[Xmla.EVENT_ERROR] = [];

    this.listeners[Xmla.EVENT_DISCOVER] = [];
    this.listeners[Xmla.EVENT_DISCOVER_SUCCESS] = [];
    this.listeners[Xmla.EVENT_DISCOVER_ERROR] = [];

    this.listeners[Xmla.EVENT_EXECUTE] = [];
    this.listeners[Xmla.EVENT_EXECUTE_SUCCESS] = [];
    this.listeners[Xmla.EVENT_EXECUTE_ERROR] = [];
    
    this.options = _applyProperties(
        _applyProperties(
            {},
            Xmla.defaultOptions,
            true
        ),
        options,
        true
    );
};

Xmla.defaultOptions = {
    requestTimeout: 30000,   //by default, we bail out after 30 seconds
    async: false            //by default, we do a synchronous request
};

Xmla.METHOD_DISCOVER = "Discover";
Xmla.METHOD_EXECUTE = "Execute";
Xmla.REQUESTTYPE = "RequestType";

var _xmlaDISCOVER = "DISCOVER_";
var _xmlaMDSCHEMA = "MDSCHEMA_";
var _xmlaDBSCHEMA = "DBSCHEMA_";

Xmla.DISCOVER_DATASOURCES =     _xmlaDISCOVER + "DATASOURCES";
Xmla.DISCOVER_PROPERTIES =      _xmlaDISCOVER + "PROPERTIES";
Xmla.DISCOVER_SCHEMA_ROWSETS =  _xmlaDISCOVER + "SCHEMA_ROWSETS";
Xmla.DISCOVER_ENUMERATORS =     _xmlaDISCOVER + "ENUMERATORS";
Xmla.DISCOVER_KEYWORDS =        _xmlaDISCOVER + "KEYWORDS";
Xmla.DISCOVER_LITERALS =        _xmlaDISCOVER + "LITERALS";

Xmla.DBSCHEMA_CATALOGS =       _xmlaDBSCHEMA + "CATALOGS";
Xmla.DBSCHEMA_COLUMNS =        _xmlaDBSCHEMA + "COLUMNS";
Xmla.DBSCHEMA_PROVIDER_TYPES = _xmlaDBSCHEMA + "PROVIDER_TYPES";
Xmla.DBSCHEMA_SCHEMATA =       _xmlaDBSCHEMA + "SCHEMATA";
Xmla.DBSCHEMA_TABLES =         _xmlaDBSCHEMA + "TABLES";
Xmla.DBSCHEMA_TABLES_INFO =    _xmlaDBSCHEMA + "TABLES_INFO";

Xmla.MDSCHEMA_ACTIONS =        _xmlaMDSCHEMA + "ACTIONS";
Xmla.MDSCHEMA_CUBES =          _xmlaMDSCHEMA + "CUBES";
Xmla.MDSCHEMA_DIMENSIONS =     _xmlaMDSCHEMA + "DIMENSIONS";
Xmla.MDSCHEMA_FUNCTIONS =      _xmlaMDSCHEMA + "FUNCTIONS";
Xmla.MDSCHEMA_HIERARCHIES =    _xmlaMDSCHEMA + "HIERARCHIES";
Xmla.MDSCHEMA_LEVELS =         _xmlaMDSCHEMA + "LEVELS";
Xmla.MDSCHEMA_MEASURES =       _xmlaMDSCHEMA + "MEASURES";
Xmla.MDSCHEMA_MEMBERS =        _xmlaMDSCHEMA + "MEMBERS";
Xmla.MDSCHEMA_PROPERTIES =     _xmlaMDSCHEMA + "PROPERTIES";
Xmla.MDSCHEMA_SETS =           _xmlaMDSCHEMA + "SETS";

Xmla.EVENT_REQUEST = "request";
Xmla.EVENT_SUCCESS = "success";
Xmla.EVENT_ERROR = "error";

Xmla.EVENT_EXECUTE = "execute";
Xmla.EVENT_EXECUTE_SUCCESS = "executesuccess";
Xmla.EVENT_EXECUTE_ERROR = "executeerror";

Xmla.EVENT_DISCOVER = "discover";
Xmla.EVENT_DISCOVER_SUCCESS = "discoversuccess";
Xmla.EVENT_DISCOVER_ERROR = "discovererror";

Xmla.EVENT_GENERAL = [
    Xmla.EVENT_REQUEST,
    Xmla.EVENT_SUCCESS,
    Xmla.EVENT_ERROR
];

Xmla.EVENT_DISCOVER_ALL = [
    Xmla.EVENT_DISCOVER,
    Xmla.EVENT_DISCOVER_SUCCESS,
    Xmla.EVENT_DISCOVER_ERROR
];

Xmla.EVENT_EXECUTE_ALL = [
    Xmla.EVENT_EXECUTE,
    Xmla.EVENT_EXECUTE_SUCCESS,
    Xmla.EVENT_EXECUTE_ERROR
];

Xmla.EVENT_ALL = [].concat(
    Xmla.EVENT_GENERAL,
    Xmla.EVENT_DISCOVER_ALL,
    Xmla.EVENT_EXECUTE_ALL
);

Xmla.PROP_DATASOURCEINFO = "DataSourceInfo";
Xmla.PROP_CATALOG = "Catalog";
Xmla.PROP_CUBE = "Cube";

Xmla.PROP_CONTENT = "Content";
Xmla.PROP_CONTENT_SCHEMA = "Schema";
Xmla.PROP_CONTENT_DATA = "Data";
Xmla.PROP_CONTENT_SCHEMADATA = "SchemaData";

Xmla.PROP_FORMAT = "Format";
Xmla.PROP_FORMAT_TABULAR = "Tabular";
Xmla.PROP_FORMAT_MULTIDIMENSIONAL = "Multidimensional";

Xmla.PROP_AXISFORMAT = "AxisFormat";
Xmla.PROP_AXISFORMAT_TUPLE = "TupleFormat";
Xmla.PROP_AXISFORMAT_CLUSTER = "ClusterFormat";
Xmla.PROP_AXISFORMAT_CUSTOM = "CustomFormat";

Xmla.prototype = {
    listeners: null,
    setOptions: function(options){
        _applyProperties(
            this.options,
            options,
            true
        );
    },
    addListener: function(listener){
        var events = listener.events;
        if (_isUndefined(events)){
            throw "No events specified"; 
        }
        if (_isString(events)){
            if (events==="all"){
                events = Xmla.EVENT_ALL;
            } else {
                events = events.split(",");
            }
        }
        if (!(events instanceof Array)){
            throw "Property \"events\" must be comma separated list string or array."; 
        }
        var numEvents = events.length;
        var eventName, myListeners;
        for (var i=0; i<numEvents; i++){
            eventName = events[i].replace(/\s+/g,"");
            myListeners = this.listeners[eventName];
            if (!myListeners) {
                throw "Event \"" + eventName + "\" is not defined."; 
            }
            if (_isFunction(listener.handler)){
                if (!_isObject(listener.scope)) {
                    listener.scope = window;
                }
                myListeners.push(listener);
            }
            else {
                throw "Invalid listener: handler is not a function"; 
            }
        }
    },    
    _fireEvent: function(eventName, eventData, cancelable){
        var listeners = this.listeners[eventName];
        if (!listeners) {
            throw "Event \"" + eventName + "\" is not defined."; 
        }
        var numListeners = listeners.length;
        var outcome = true;
        if (numListeners) {
            var listener, listenerResult;
            for (var i=0; i<numListeners; i++){
                listener = listeners[i];
                listenerResult = listener.handler.call(
                    listener.scope,
                    eventName,
                    eventData,
                    this
                );
                if (cancelable && listenerResult===false){
                    outcome = false;
                    break;
                }
            }
        }
        else 
        if (eventName==="error") {
            throw eventData;
        }
        return outcome;
    },
    request: function(options){
        var xmla = this;
        
        var soapMessage = _getXmlaSoapMessage(options);
        options.soapMessage = soapMessage;
        var myXhr;
        var ajaxOptions = {
            async: _isUndefined(options.async) ? this.options.async : options.async,
            timeout: this.options.requestTimeout,
            contentType: "text/xml",
            data: soapMessage,
            dataType: "xml",
            error: function(xhr, errorString, errorObject){
                xmla._requestError({
                    xmla: xmla,
                    request: options,
                    xhr: xhr,
                    error: {
                        errorCategory: "xhrError",
                        errorString: errorString,
                        errorObject: errorObject
                    }
                });
            },
            complete: function(xhr, textStatus){    //using complete rather than success f
                if (textStatus==="success"){
                    xmla._requestSuccess({
                        xmla: xmla,
                        request: options,
                        xhr: xhr,
                        status: status
                    });
                }
            },
            url: _isUndefined(options.url)? this.options.url : options.url,
            type: "POST"
        };
        
        if (options.username){
            ajaxOptions.username = options.username;
        }
        if (options.password){
            ajaxOptions.password = options.password;
        }

        this.response = null;
        if  (this._fireEvent(Xmla.EVENT_REQUEST, options, true) &&
                (
                    (options.method == Xmla.METHOD_DISCOVER && this._fireEvent(Xmla.EVENT_DISCOVER, options)) || 
                    (options.method == Xmla.METHOD_EXECUTE  && this._fireEvent(Xmla.EVENT_EXECUTE, options))
                ) 
        ) {
            myXhr = _ajax(ajaxOptions);
        }
        return this.response;
    },
    _requestError: function(obj) {
        obj.xmla = this;
        this._fireEvent("error", obj);
    },
    _requestSuccess: function(obj) {
        var xhr = obj.xhr;
        this.responseXML = xhr.responseXML;
        this.responseText = xhr.responseText;

        var request = obj.request; 
        var method = request.method;
        
        var soapFault = _getElementsByTagNameNS(this.responseXML, _xmlnsSOAPenvelope, "Fault");
        if (soapFault.length) {
            //TODO: extract error info
            soapFault = soapFault.item(0);
            var faultCode = soapFault.getElementsByTagName("faultcode").item(0).childNodes.item(0).data;
            var faultString = soapFault.getElementsByTagName("faultstring").item(0).childNodes.item(0).data;
            var soapFaultObject = {
                errorCategory: "soapFault",
                faultCode: faultCode,
                faultString: faultString
            };
            obj.error = soapFaultObject;
            switch(method){
                case Xmla.METHOD_DISCOVER:
                    this._fireEvent(Xmla.EVENT_DISCOVER_ERROR, obj);
                    break;
                case Xmla.METHOD_EXECUTE:
                    this._fireEvent(Xmla.EVENT_EXECUTE_ERROR, obj);
                    break;
            }
            this._fireEvent(Xmla.EVENT_ERROR, obj);
        }
        else {        
            switch(method){
                case Xmla.METHOD_DISCOVER:
                    var rowset = new Xmla.Rowset(this.responseXML);
                    obj.rowset = rowset;
                    this.response = rowset;
                    this._fireEvent(Xmla.EVENT_DISCOVER_SUCCESS, obj);
                    break;
                case Xmla.METHOD_EXECUTE:
                    var resultset;
                    var format = request.properties[Xmla.PROP_FORMAT];
                    switch(format){
                        case Xmla.PROP_FORMAT_TABULAR:
                            
                            break;
                        case Xmla.PROP_FORMAT_MULTIDIMENSIONAL:
                            break;
                    }                    
                    obj.resultset = resultset;
                    this.response = resultset;
                    this._fireEvent(Xmla.EVENT_EXECUTE_SUCCESS, obj);
                    break;
            }
            this._fireEvent(Xmla.EVENT_SUCCESS, obj);
        }
    },
    execute: function(options) {
        var properties = options.properties;
        if (_isUndefined(properties)){
            properties = {};
            options.properties = properties;
        }
        if (_isUndefined(options.properties[Xmla.PROP_FORMAT])){
            options.properties[Xmla.PROP_FORMAT] = Xmla.PROP_FORMAT_MULTIDIMENSIONAL;
        }
        var request = _applyProperties(
            options,
            {
                method: Xmla.METHOD_EXECUTE
            },
            true
        );
        return this.request(request);         
    },
    discover: function(options) {        
        var request = _applyProperties(
            options,
            {
                method: Xmla.METHOD_DISCOVER
            },
            true
        );
        return this.request(request);         
    },
    discoverDataSources: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DISCOVER_DATASOURCES
            },
            true
        );
        return this.discover(request);
    },
    discoverProperties: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DISCOVER_PROPERTIES
            },
            true
        );
        return this.discover(request);
    },
    discoverSchemaRowsets: function(options){
        var request = _applyProperties(
           options,
            {
                requestType: Xmla.DISCOVER_SCHEMA_ROWSETS
            },
            true
        );
        return this.discover(request);
    },
    discoverEnumerators: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DISCOVER_ENUMERATORS
            },
            true
        );
        return this.discover(request);
    },
    discoverKeywords: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DISCOVER_KEYWORDS
            },
            true
        );
        return this.discover(request);
    },
    discoverLiterals: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DISCOVER_LITERALS
            },
            true
        );
        return this.discover(request);
    }, 
    discoverDBCatalogs: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_CATALOGS
            },
            true
        );
        return this.discover(request);
    },
    discoverDBColumns: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_COLUMNS
            },
            true
        );
        return this.discover(request);
    },
    discoverDBProviderTypes: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_PROVIDER_TYPES
            },
            true
        );
        return this.discover(request);
    },
    discoverDBSchemata: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_SCHEMATA
            },
            true
        );
        return this.discover(request);
    },
    discoverDBTables: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_TABLES
            },
            true
        );
        return this.discover(request);
    },
    discoverDBTablesInfo: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.DBSCHEMA_TABLES_INFO
            },
            true
        );
        return this.discover(request);
    },
    discoverMDActions: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_ACTIONS
            },
            true
        );
        return this.discover(request);
    },
    discoverMDCubes: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_CUBES
            },
            true
        );
        return this.discover(request);
    },
    discoverMDDimensions: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_DIMENSIONS
            },
            true
        );
        return this.discover(request);
    },
    discoverMDFunctions: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_FUNCTIONS
            },
            true
        );
        return this.discover(request);
    },
    discoverMDHierarchies: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_HIERARCHIES
            },
            true
        );
        return this.discover(request);
    },
    discoverMDLevels: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_LEVELS
            },
            true
        );
        return this.discover(request);
    },
    discoverMDMeasures: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_MEASURES
            },
            true
        );
        return this.discover(request);
    },
    discoverMDMembers: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_MEMBERS
            },
            true
        );
        return this.discover(request);
    },
    discoverMDProperties: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_PROPERTIES
            },
            true
        );
        return this.discover(request);
    },
    discoverMDSets: function(options){
        var request = _applyProperties(
            options,
            {
                requestType: Xmla.MDSCHEMA_SETS
            },
            true    
        );
        return this.discover(request);
    }
};

function _getRowSchema(xmlDoc){
    var types = _getElementsByTagNameNS(xmlDoc, _xmlnsSchema, "complexType"), 
        numTypes = types.length,
        type,
        i;
    for (i=0; i<numTypes; i++){
        type = types.item(i);
        if (type.getAttribute("name")==="row"){
            return type;
        }
    }
    return null;
}

Xmla.Rowset = function(node){
    this.rows = _getElementsByTagNameNS(node, _xmlnsRowset, "row");
    this.numRows = this.rows? this.rows.length : 0;
    this.rowIndex = 0;
    this.row = (this.hasMoreRows()) ? this.rows.item(this.rowIndex) : null;
    this.fieldOrder = [];
    this.fields = {};
    this._fieldCount = 0;
    var rowSchema = _getRowSchema(node);
    if (rowSchema){    
        var seq = _getElementsByTagNameNS(rowSchema, _xmlnsSchema, "sequence").item(0);
        var seqChildren = seq.childNodes;
        var numChildren = seqChildren.length;
        var seqChild, fieldLabel, fieldName, minOccurs, maxOccurs, type;
        for (var i=0; i<numChildren; i++){
            seqChild = seqChildren.item(i);
            if (seqChild.nodeType!=1) {
                continue;
            }
            fieldLabel = _getAttributeNS(seqChild, _xmlnsSQL, "field");
            fieldName = seqChild.getAttribute("name");
            type = seqChild.getAttribute("type");
            minOccurs = seqChild.getAttribute("minOccurs");
            maxOccurs = seqChild.getAttribute("maxOccurs");

            this.fields[fieldLabel] = {
                name: fieldName,
                label: fieldLabel,
                index: this._fieldCount++,
                type: type,
                minOccurs: _isUndefined(minOccurs)? 1: minOccurs,
                maxOccurs: _isUndefined(maxOccurs)? 1: (maxOccurs==="unbounded"?Infinity:maxOccurs),
                getter: this._createFieldGetter(fieldName, type, minOccurs, maxOccurs)
            };            
            this.fieldOrder.push(fieldLabel);
        }        
    }
    else {
        throw "Couldn't parse XML schema while constructing resultset";
    }
};

Xmla.Rowset.FETCH_ARRAY = 1;
Xmla.Rowset.FETCH_OBJECT = 2;

Xmla.Rowset.prototype = {
    node: null,
    _boolConverter: function(val){
        return val==="true"?true:false;
    },
    _intConverter: function(val){
        return parseInt(val, 10);
    },
    _floatConverter: function(val){
        return parseFloat(val, 10);
    },
    _textConverter: function(val){
        return val;
    },
    _arrayConverter: function(nodes, valueConverter){
// debugger;
        var arr = [],
            numNodes = nodes.length,
            node
        ;
        for (var i=0; i<numNodes; i++){
            node = nodes.item(i);
            arr.push(node.tagName);
        }
        return arr;
    },
    _elementText: function(el){
        var text = "",
            childNodes = el.childNodes,
            numChildNodes = childNodes.length
        ;
        for (var i=0; i<numChildNodes; i++){
            text += childNodes.item(i).data;
        }
        return text;
    },
    _createFieldGetter: function(fieldName, type, minOccurs, maxOccurs){
        if (minOccurs === null){
            minOccurs = "1" ;
        }
        if (maxOccurs === null){
            maxOccurs = "1";
        }
        var me = this;
        var valueConverter = null;        
        switch (type){
            case "xsd:boolean":
                valueConverter = me._boolConverter;
                break;
            case "xsd:decimal": //FIXME: not sure if you can use parseFloat for this.
            case "xsd:double":
            case "xsd:float":
                valueConverter = me._floatConverter;
                break;
            case "xsd:int":
            case "xsd:integer":
            case "xsd:nonPositiveInteger":
            case "xsd:negativeInteger":
            case "xsd:nonNegativeInteger":
            case "xsd:positiveInteger":
            case "xsd:short":
            case "xsd:byte":
            case "xsd:long":
            case "xsd:unsignedLong":
            case "xsd:unsignedInt":
            case "xsd:unsignedShort":
            case "xsd:unsignedByte":
                valueConverter = me._intConverter;
                break;
            case "xsd:string":
                valueConverter = me._textConverter;
                break;
            default:
                valueConverter = me._textConverter;
                break;
        }
        var getter;
        if(minOccurs==="1" && maxOccurs==="1") {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, fieldName);
                return valueConverter(me._elementText(els.item(0)));
            };
        }
        else 
        if(minOccurs==="0" && maxOccurs==="1") {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, fieldName);
                if (!els.length) {
                    return null;
                }
                else {
                    return valueConverter(me._elementText(els.item(0)));
                }
            };
        }
        else 
        if(minOccurs==="1" && (maxOccurs==="unbounded" || parseInt(maxOccurs, 10)>1)) {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, fieldName);
                return me._arrayConverter(els, valueConverter);
            };
        }
        else 
        if(minOccurs==="0" && (maxOccurs==="unbounded" || parseInt(maxOccurs, 10)>1)) {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, fieldName);
                if (!els.length) {
                    return null;
                }
                else {
                    return me._arrayConverter(els, valueConverter);
                }
            };
        }
        return getter;
    },
    getFields: function(){
        var f = [], 
            fieldCount = this._fieldCount,
            fieldOrder = this.fieldOrder
        ;
        for (var i=0; i<fieldCount; i++){
            f[i] = this.fieldDef(fieldOrder[i]);
        }
        return f;
    },
    hasMoreRows: function(){
        return this.numRows > this.rowIndex;
    },
    next: function(){
        this.row = this.rows.item(++this.rowIndex);
    },
    fieldDef: function(name){
        var field = this.fields[name];
        if (_isUndefined(field)){
            throw "No such field: \"" + name + "\"";
        }
        return field;
    },
    fieldIndex: function(name){
        var fieldDef = this.fieldDef(name);
        return fieldDef.index;
    },
    fieldName: function(index){
        return this.fieldOrder[index];
    },
    fieldVal: function(name){
        if (_isNumber(name)){
            name = this.fieldName(name);
        }
        var field = this.fieldDef(name);
        return field.getter.call(this);
    },
    fieldCount: function(){
        return this._fieldCount;
    },
    close: function(){
        this.row = null;
    },
    fetchAsArray: function(){
        var array, fields, fieldName, fieldDef;
        if (this.hasMoreRows()) {
            fields = this.fields; 
            array = [];
            for (fieldName in fields){
                if (fields.hasOwnProperty(fieldName)){
                    fieldDef = fields[fieldName];
                    array[fieldDef.index] = fieldDef.getter.call(this);
                }
            }
            this.next();
        } else {
            array = false;
        }
        return array;
    },
    fetchAsObject: function(){
        var object, fields, fieldName, fieldDef;
        if (this.hasMoreRows()){
            fields = this.fields; 
            object = {};
            for (fieldName in fields){
                if (fields.hasOwnProperty(fieldName)) {
                    fieldDef = fields[fieldName];
                    object[fieldName] = fieldDef.getter.call(this);
                }
            }
            this.next();
        } else {
            object = false;
        }
        return object;
    },
    fetchAllAsArray: function(){
        var row, rows = [];
        while((row = this.fetchAsArray())){
            rows.push(row);
        }
        return rows;
    },
    fetchAllAsObject: function(){
        var row, rows = [];
        while((row = this.fetchAsObject())){
            rows.push(row);
        }
        return rows;
    }    
};

}());