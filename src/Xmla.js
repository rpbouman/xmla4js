/*
    Copyright 2009, Roland Bouman (Roland.Bouman@gmail.com, http://rpbouman.blogspot.com/)
    
    Note: some portions of the API documentation were adopted from the original XML/A specification. 
    I believe that this constitutes fair use, 
    but if you have reason to believe that the documentation violates any copyright, 
    or is otherwise incompatible with the LGPL license please contact me.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/    

(function (){

var _soap = "http://schemas.xmlsoap.org/soap/",
    _xmlnsSOAPenvelope = _soap + "envelope/",
    _xmlnsSOAPenvelopePrefix = "SOAP-ENV",
    _xmlnsIsSOAPenvelope = "xmlns:" + _xmlnsSOAPenvelopePrefix + "=\"" + _xmlnsSOAPenvelope + "\"",
    _SOAPencodingStyle = _xmlnsSOAPenvelopePrefix + ":encodingStyle=\"" + _soap + "encoding/\"",
    _ms = "urn:schemas-microsoft-com:",
    _xmlnsXmla = _ms + "xml-analysis",
    _xmlnsIsXmla = "xmlns=\"" + _xmlnsXmla + "\"",
    _xmlnsSQLPrefix = "sql",
    _xmlnsSQL = _ms + "xml-sql",
    _xmlnsSchemaPrefix = "xsd", 
    _xmlnsSchema = "http://www.w3.org/2001/XMLSchema",
    _xmlnsRowset = _xmlnsXmla + ":rowset",
    _useAX = window.ActiveXObject? true : false
;    

/**
*   Xmla implements a XML for Analysis (XML/A) client in javascript.
*   Using this utility you can communicate with XML/A enabled OLAP servers 
*   to obtain metadata and to issue MDX queries.
*   @module xmla
*   @title Xmla utility
*/

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

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

var _getElementsByTagNameNS = function(node, ns, prefix, tagName){
    if (_isFunction(node.getElementsByTagNameNS)){
        return node.getElementsByTagNameNS(ns, tagName);
    }
    else    
    //the clusterfuck below tries to avoid failing fatally due to IE lack of getElementsByTagNameNS
    if (prefix){        
        return node.getElementsByTagName(prefix + ":" + tagName);
    }
    else {
        return node.getElementsByTagName(tagName);
    }
};

var _getAttributeNS = function(element, ns, prefix, attributeName){
    if (_isFunction(element.getAttributeNS)){
        return element.getAttributeNS(ns, attributeName);
    }
    else
    if (prefix) {
        return element.getAttribute(prefix + ":" + attributeName);
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
    msg += "<" + _xmlnsSOAPenvelopePrefix + ":Envelope " + _xmlnsIsSOAPenvelope + " " + _SOAPencodingStyle + ">" + 
    "<" + _xmlnsSOAPenvelopePrefix + ":Body>" + 
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
                msg += "<" + _xmlRequestType + ">" + options.requestType + "</" + _xmlRequestType + ">" + 
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
        "</" + _xmlnsSOAPenvelopePrefix + ":Body>" + 
        "</" + _xmlnsSOAPenvelopePrefix + ":Envelope>"
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

/**
*   <p>
*   The Xmla class provides a javascript API to communicate XML for Analysis (XML/A) over HTTP.
*   XML/A is an industry standard protocol that allows webclients to work with OLAP servers.
*   To fully understand the scope and purpose of this utility, it is highly recommended
*   to read <a href="http://xmla.org/xmla1.1.doc">the XML/A specification</a> 
*   (MS Word format. For other formats, 
*   see: <a href="http://code.google.com/p/xmla4js/source/browse/#svn/trunk/doc/xmla1.1 specification">http://code.google.com/p/xmla4js/source/browse/#svn/trunk/doc/xmla1.1 specification</a>). 
*   </p>
*   @class Xmla
*   @constructor
*   @param {Object} options
*/
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

/**
*   Can be used as value for the method option in the options object passed to the 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server. 
*   Instead of explicitly setting the method yourself, consider using the <code><a href="#method_request">discover()</a></code> method.
*   The <code>discover()</code> method automatically sets the method option to <code>METHOD_DISCOVER</code>.
*   @property METHOD_DISCOVER
*   @static
*   @final
*   @type string
*   @default <code>Discover</code>
*/
Xmla.METHOD_DISCOVER = "Discover";
/**
*   Can be used as value for the method option property in the options objecct passed to the 
*   <code><a href="#method_request">request()</code></a> method to invoke the XML/A Execute method on the server. 
*   Instead of explicitly setting the method yourself, consider using the <code><a href="#method_execute">execute()</a></code> method.
*   The <code>execute()</code> method automatically sets the method option to <code>METHOD_EXECUTE</code>.
*   @property METHOD_EXECUTE
*   @static
*   @final
*   @type string
*   @default <code>Discover</code>
*/
Xmla.METHOD_EXECUTE = "Execute";

var _xmlRequestType = "RequestType";
var _xmlaDISCOVER = "DISCOVER_";
var _xmlaMDSCHEMA = "MDSCHEMA_";
var _xmlaDBSCHEMA = "DBSCHEMA_";

/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_DATASOURCES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this constant as requestType yourself, consider calling the <code><a href="#method_discoverDataSources">discoverDataSources()</a></code> method. 
*   The <code>discoverDataSources()</code> method passes <code>DISCOVER_DATASOURCES</code> automatically as requestType for Discover requests.
*
*   @property DISCOVER_DATASOURCES
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_DATASOURCES</code>
*/
Xmla.DISCOVER_DATASOURCES =     _xmlaDISCOVER + "DATASOURCES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_PROPERTIES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverProperties">discoverProperties()</a></code> method. 
*   The <code>discoverProperties()</code> method passes <code>DISCOVER_PROPERTIES</code> automatically as requestType for Discover requests.
*
*   @property DISCOVER_PROPERTIES
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_PROPERTIES</code>
*/
Xmla.DISCOVER_PROPERTIES =      _xmlaDISCOVER + "PROPERTIES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_SCHEMA_ROWSETS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverSchemaRowsets">discoverSchemaRowsets()</a></code> method. 
*   The <code>discoverProperties()</code> method passes <code>DISCOVER_PROPERTIES</code> automatically as requestType for Discover requests.
*
*   @property DISCOVER_SCHEMA_ROWSETS
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_SCHEMA_ROWSETS</code>
*/
Xmla.DISCOVER_SCHEMA_ROWSETS =  _xmlaDISCOVER + "SCHEMA_ROWSETS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_ENUMERATORS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverEnumerators">discoverEnumerators()</a></code> method. 
*   The <code>discoverSchemaRowsets()</code> method issues a request to invoke the Discover method using <code>DISCOVER_SCHEMA_ROWSETS</code> as requestType.
*
*   @property DISCOVER_ENUMERATORS
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_ENUMERATORS</code>
*/
Xmla.DISCOVER_ENUMERATORS =     _xmlaDISCOVER + "ENUMERATORS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_KEYWORDS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this requestType yourself, consider calling the <code><a href="#method_discoverLiterals">discoverKeywords()</a></code> method. 
*   The <code>discoverKeywords()</code> method issues a request to invoke the Discover method using DISCOVER_KEYWORDS as requestType.
*
*   @property DISCOVER_KEYWORDS
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_KEYWORDS</code>
*/
Xmla.DISCOVER_KEYWORDS =        _xmlaDISCOVER + "KEYWORDS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DISCOVER_LITERALS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverLiterals">discoverLiterals()</a></code> method. 
*   The <code>discoverLiterals()</code> method issues a request to invoke the Discover method using DISCOVER_LITERALS as requestType.
*
*   @property DISCOVER_LITERALS
*   @static
*   @final
*   @type string
*   @default <code>DISCOVER_LITERALS</code>
*/
Xmla.DISCOVER_LITERALS =        _xmlaDISCOVER + "LITERALS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_CATALOGS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverDBCatalogs">discoverDBCatalogs()</a></code> method. 
*   The <code>discoverDBCatalogs()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_CATALOGS</code> as requestType.
*
*   @property DBSCHEMA_CATALOGS
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_CATALOGS</code>
*/
Xmla.DBSCHEMA_CATALOGS =       _xmlaDBSCHEMA + "CATALOGS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_COLUMNS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverDBColumns">discoverDBColumns()</a></code> method. 
*   The <code>discoverDBColumns()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_COLUMNS</code> as requestType.
*
*   @property DBSCHEMA_COLUMNS
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_COLUMNS</code>
*/
Xmla.DBSCHEMA_COLUMNS =        _xmlaDBSCHEMA + "COLUMNS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_PROVIDER_TYPES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverDBProviderTypes">discoverDBProviderTypes()</a></code> method. 
*   The <code>discoverDBProviderTypes()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_PROVIDER_TYPES</code> as requestType.
*
*   @property DBSCHEMA_PROVIDER_TYPES
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_PROVIDER_TYPES</code>
*/
Xmla.DBSCHEMA_PROVIDER_TYPES = _xmlaDBSCHEMA + "PROVIDER_TYPES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_SCHEMATA</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverDBProviderTypes">discoverDBColumns()</a></code> method. 
*   The <code>discoverDBColumns()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_SCHEMATA</code> as requestType.
*
*   @property DBSCHEMA_SCHEMATA
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_SCHEMATA</code>
*/
Xmla.DBSCHEMA_SCHEMATA =       _xmlaDBSCHEMA + "SCHEMATA";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_TABLES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the <code><a href="#method_discoverDBTables">discoverDBColumns()</a></code> method. 
*   The <code>discoverDBColumns()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_TABLES</code> as requestType.
*
*   @property DBSCHEMA_TABLES
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_TABLES</code>
*/
Xmla.DBSCHEMA_TABLES =         _xmlaDBSCHEMA + "TABLES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>DBSCHEMA_TABLES_INFO</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverDBTablesInfo">discoverDBTablesInfo()</a></code> method. 
*   The <code>discoverDBTablesInfo()</code> method issues a request to invoke the Discover method using <code>DBSCHEMA_TABLES_INFO</code> as requestType.
*
*   @property DBSCHEMA_TABLES_INFO
*   @static
*   @final
*   @type string
*   @default <code>DBSCHEMA_TABLES_INFO</code>
*/
Xmla.DBSCHEMA_TABLES_INFO =    _xmlaDBSCHEMA + "TABLES_INFO";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the <code>MDSCHEMA_ACTIONS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDActions">discoverMDActions()</a></code> method. 
*   The <code>discoverMDActions()</code> method issues a request to invoke the Discover method using <code>MDSCHEMA_ACTIONS</code> as requestType.
*
*   @property MDSCHEMA_ACTIONS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_ACTIONS</code>
*/
Xmla.MDSCHEMA_ACTIONS =        _xmlaMDSCHEMA + "ACTIONS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_CUBES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDCubes">discoverMDCubes()</a></code> method. 
*   The <code>discoverMDCubes()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_CUBES</code> as requestType.
*
*   @property MDSCHEMA_CUBES
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_CUBES</code>
*/
Xmla.MDSCHEMA_CUBES =          _xmlaMDSCHEMA + "CUBES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_DIMENSIONS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDDimensions">discoverMDCubes()</a></code> method. 
*   The <code>discoverMDDimensions()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_DIMENSIONS</code> as requestType.
*
*   @property MDSCHEMA_DIMENSIONS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_DIMENSIONS</code>
*/
Xmla.MDSCHEMA_DIMENSIONS =     _xmlaMDSCHEMA + "DIMENSIONS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_FUNCTIONS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDFunctions">discoverMDFunctions()</a></code> method. 
*   The <code>discoverMDFunctions()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_FUNCTIONS</code> as requestType.
*
*   @property MDSCHEMA_FUNCTIONS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_FUNCTIONS</code>
*/
Xmla.MDSCHEMA_FUNCTIONS =      _xmlaMDSCHEMA + "FUNCTIONS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_HIERARCHIES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDHierarchies">discoverMDHierarchies()</a></code> method. 
*   The <code>discoverMDHierarchies()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_HIERARCHIES</code> as requestType.
*
*   @property MDSCHEMA_HIERARCHIES
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_HIERARCHIES</code>
*/
Xmla.MDSCHEMA_HIERARCHIES =    _xmlaMDSCHEMA + "HIERARCHIES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_LEVELS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDLevels">discoverMDLevels()</a></code> method. 
*   The <code>discoverMDLevels()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_LEVELS</code> as requestType.
*
*   @property MDSCHEMA_LEVELS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_LEVELS</code>
*/
Xmla.MDSCHEMA_LEVELS =         _xmlaMDSCHEMA + "LEVELS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_MEASURES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDMeasures">discoverMDMeasures()</a></code> method. 
*   The <code>discoverMDMeasures()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_MEASURES</code> as requestType.
*
*   @property MDSCHEMA_MEASURES
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_MEASURES</code>
*/
Xmla.MDSCHEMA_MEASURES =       _xmlaMDSCHEMA + "MEASURES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_MEMBERS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDMembers">discoverMDMembers()</a></code> method. 
*   The <code>discoverMDMembers()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_MEMBERS</code> as requestType.
*
*   @property MDSCHEMA_MEMBERS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_MEMBERS</code>
*/
Xmla.MDSCHEMA_MEMBERS =        _xmlaMDSCHEMA + "MEMBERS";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_PROPERTIES</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDProperties">discoverMDProperties()</a></code> method. 
*   The <code>discoverMDProperties()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_PROPERTIES</code> as requestType.
*
*   @property MDSCHEMA_PROPERTIES
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_PROPERTIES</code>
*/
Xmla.MDSCHEMA_PROPERTIES =     _xmlaMDSCHEMA + "PROPERTIES";
/**
*   Can be used as value for the <code>requestType</code> option in the options object passed to the to 
*   <code><a href="#method_request">request()</a></code> method to invoke the XML/A Discover method on the server to return the 
*   <code>MDSCHEMA_SETS</code> schema rowset.
*   The <code>requestType</code> option applies only to Discover requests.
*   Instead of passing this <code>requestType</code> yourself, consider calling the 
*   <code><a href="#method_discoverMDSets">discoverMDSets()</a></code> method. 
*   The <code>discoverMDSets()</code> method issues a request to invoke the Discover method using
*   <code>MDSCHEMA_SETS</code> as requestType.
*
*   @property MDSCHEMA_SETS
*   @static
*   @final
*   @type string
*   @default <code>MDSCHEMA_SETS</code>
*/
Xmla.MDSCHEMA_SETS =           _xmlaMDSCHEMA + "SETS";
/**
*   Indicates the <code>request</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>request</code> event is the first event that is fired before submitting a request 
*   (see: <code><a href="#method_request">request()</a></code>)
*   to the server, and before firing the method-specific request events 
*   (see <code><a href="#property_EVENT_EXECUTE">EVENT_EXECUTE</a></code> 
*   and <code><a href="#property_EVENT_DISCOVER">EVENT_DISCOVER</a></code>). 
*   The <code>request</code> event itself is not method-specific, and fires for <code>Execute</code> as well as <code>Discover</code> requests.
*
*   @property EVENT_REQUEST
*   @static
*   @final
*   @type string
*   @default <code>request</code>
*/
Xmla.EVENT_REQUEST = "request";
/**
*   Indicates the <code>success</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>success</code> event  is the last event that is fired after receiving and processing a normal response 
*   (that is, a response that does not contain an XML/A <code>SoapFault</code>),
*   after firing the method-specific success events 
*   (see <code><a href="#property_EVENT_EXECUTE_SUCCESS">EVENT_EXECUTE_SUCCESS</a></code> 
*   and <code><a href="#property_EVENT_DISCOVER_SUCCESS">EVENT_DISCOVER_SUCCESS</a></code>). 
*   The <code>success</code> event is not method-specific, and fires for <code>Execute</code> as well as <code>Discover</code> responses.
*
*   @property EVENT_SUCCESS
*   @static
*   @final
*   @type string
*   @default <code>success</code>
*/
Xmla.EVENT_SUCCESS = "success";
/**
*   Indicates the <code>error</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>error</code> is fired when an error occurs while sending a request or receiving a response.
*   The <code>error</code> event is not method-specific, and fires for errors encountered during both <code>Execute</code> as well as <code>Discover</code> method invocations.
*
*   @property EVENT_ERROR
*   @static
*   @final
*   @type string
*   @default <code>error</code>
*/
Xmla.EVENT_ERROR = "error";

/**
*   Indicates the <code>execute</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>execute</code> event is method-specific, and is fired before submitting an <code>Execute</code> request
*   (see: <code><a href="#method_execute">execute()</a></code>)
*   to the server, but after firing the <code>request</code> event
*   (see: <code><a href="#property_EVENT_REQUEST">EVENT_REQUEST</a></code>).
*
*   @property EVENT_EXECUTE
*   @static
*   @final
*   @type string
*   @default <code>execute</code>
*/
Xmla.EVENT_EXECUTE = "execute";
/**
*   Indicates the <code>executesuccess</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>executesuccess</code> event is method-specific and fired only after receiving and processing a normal response 
*   (that is, a response that does not contain a <code>SoapFault</code>)
*   to an incovation of the XML/A <code>Execute</code> method
*   (see: <code><a href="#method_execute">execute()</a></code>).
*
*   @property EVENT_EXECUTE_SUCCESS
*   @static
*   @final
*   @type string
*   @default <code>executesuccess</code>
*/
Xmla.EVENT_EXECUTE_SUCCESS = "executesuccess";
/**
*   Indicates the <code>executeerror</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>executeerror</code> event is method-specific and fired when an error occurs while sending an <code>Execute</code> request, or receiving a response to an <code>Execute</code method.
*   (see: <code><a href="#method_execute">execute()</a></code>).
*
*   @property EVENT_EXECUTE_ERROR
*   @static
*   @final
*   @type string
*   @default <code>executeerror</code>
*/
Xmla.EVENT_EXECUTE_ERROR = "executeerror";

/**
*   Indicates the <code>discover</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>discover</code> event is method-specific, and is fired before submitting a <code>Discover</code> request
*   (see: <code><a href="#method_discover">discover()</a></code>)
*   to the server, but after firing the <code>request</code> event
*   (see: <code><a href="#property_EVENT_DISCOVER">EVENT_DISCOVER</a></code>).
*
*   @property EVENT_DISCOVER
*   @static
*   @final
*   @type string
*   @default <code>discover</code>
*/
Xmla.EVENT_DISCOVER = "discover";
/**
*   Indicates the <code>discoversuccess</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>discoversuccess</code> event is method-specific and fired only after receiving and processing a normal response 
*   (that is, a response that does not contain a <code>SoapFault</code>)
*   to an incovation of the XML/A <code>Discover</code> method
*   (see: <code><a href="#method_discover">discover()</a></code>).
*
*   @property EVENT_DISCOVER_SUCCESS
*   @static
*   @final
*   @type string
*   @default <code>discoversuccess</code>
*/
Xmla.EVENT_DISCOVER_SUCCESS = "discoversuccess";
/**
*   Indicates the <code>discovererror</code> event. 
*   This constant can be used as en entry in the events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*   The <code>discovererror</code> is method-specific and fired when an error occurs while sending an <code>Discover</code> request, 
*   or receiving a response to an <code>Discover</code method.
*   (see: <code><a href="#method_discover">discover()</a></code>).
*
*   @property EVENT_DISCOVER_ERROR
*   @static
*   @final
*   @type string
*   @default <code>discovererror</code>
*/
Xmla.EVENT_DISCOVER_ERROR = "discovererror";

/**
*   Unifies all general events, that is, all events that are not method-specific.
*   This constant can be used as events array argument for the <code><a href="#method_addListener">addListener()</a></code> method,
*   or you can use array concatenation to combine it with other arrays of <code>EVENT_XXX</code> constants.
*   This constant is especially intended for asyncronous handling of Schema rowset data.
*
*   @property EVENT_GENERAL
*   @static
*   @final
*   @type string[]
*   @default <code>[EVENT_REQUEST,EVENT_SUCCESS,EVENT_ERROR]</code>
*/
Xmla.EVENT_GENERAL = [
    Xmla.EVENT_REQUEST,
    Xmla.EVENT_SUCCESS,
    Xmla.EVENT_ERROR
];

/**
*   Unifies all events specific for the <code>Discover</code> method.
*   This constant can be used as events array argument for the <code><a href="#method_addListener">addListener()</a></code> method,
*   or you can use array concatenation to combine it with other arrays of <code>EVENT_XXX</code> constants.
*
*   @property EVENT_DISCOVER_ALL
*   @static
*   @final
*   @type string[]
*   @default <code>[EVENT_DISCOVER,EVENT_DISCOVER_SUCCESS,EVENT_DISCOVER_ERROR]</code>
*/
Xmla.EVENT_DISCOVER_ALL = [
    Xmla.EVENT_DISCOVER,
    Xmla.EVENT_DISCOVER_SUCCESS,
    Xmla.EVENT_DISCOVER_ERROR
];

/**
*   Unifies all events specific for the <code>Execute</code> method.
*   This constant can be used as events array argument for the <code><a href="#method_addListener">addListener()</a></code> method,
*   or you can use array concatenation to combine it with other arrays of <code>EVENT_XXX</code> constants.
*
*   @property EVENT_EXECUTE_ALL
*   @static
*   @final
*   @type string[]
*   @default <code>[EVENT_EXECUTE,EVENT_EXECUTE_SUCCESS,EVENT_EXECUTE_ERROR]</code>
*/
Xmla.EVENT_EXECUTE_ALL = [
    Xmla.EVENT_EXECUTE,
    Xmla.EVENT_EXECUTE_SUCCESS,
    Xmla.EVENT_EXECUTE_ERROR
];

/**
*   Unifies all method-specific and non method-specific events.
*   This constant can be used as events array argument for the <code><a href="#method_addListener">addListener()</a></code> method.
*
*   @property EVENT_ALL
*   @static
*   @final
*   @type string[]
*   @default <code>[].concat(Xmla.EVENT_GENERAL, Xmla.EVENT_DISCOVER_ALL, Xmla.EVENT_EXECUTE_ALL)</code>
*/
Xmla.EVENT_ALL = [].concat(
    Xmla.EVENT_GENERAL,
    Xmla.EVENT_DISCOVER_ALL,
    Xmla.EVENT_EXECUTE_ALL
);

Xmla.PROP_DATASOURCEINFO = "DataSourceInfo";
Xmla.PROP_CATALOG = "Catalog";
Xmla.PROP_CUBE = "Cube";

Xmla.PROP_FORMAT = "Format";
Xmla.PROP_FORMAT_TABULAR = "Tabular";
Xmla.PROP_FORMAT_MULTIDIMENSIONAL = "Multidimensional";

/**
*   Can be used as key in the <code>properties</code> member of the <code>options</code> object 
*   passed to the <code><a href="#method_request">execute()</a></code> method 
*   to specify the XML/A <code>AxisFormat</code> property.
*   The XML/A <code>AxisFormat</code> property specifies how the client wants to receive the multi-dimensional resultset of a MDX query.
*   Valid values for the <code>AxisFormat</code> property are available as the static final properties 
*   <code><a href="#property_PROP_AXISFORMAT_TUPLE">PROP_AXISFORMAT_TUPLE</a></code>, 
*   <code><a href="#property_PROP_AXISFORMAT_CLUSTER">PROP_AXISFORMAT_CLUSTER</a></code>,
*   <code><a href="#property_PROP_AXISFORMAT_CUSTOM">PROP_AXISFORMAT_CUSTOM</a></code>.
*
*   @property PROP_AXISFORMAT
*   @static
*   @final
*   @type string
*   @default <code>AxisFormat</code>
*/
Xmla.PROP_AXISFORMAT = "AxisFormat";
/**
*   Can be used as value for the <code>AxisFormat</code> XML/A property 
*   (see: <code><a href="#property_PROP_AXISFORMAT">PROP_AXISFORMAT</a></code>) 
*   in invocations of the <code>Execute</code> method 
*   (see: <code><a href="#method_request">execute()</a></code>).
*
*   @property PROP_AXISFORMAT_TUPLE
*   @static
*   @final
*   @type string
*   @default <code>TupleFormat</code>
*/
Xmla.PROP_AXISFORMAT_TUPLE = "TupleFormat";
/**
*   Can be used as value for the <code>AxisFormat</code> XML/A property 
*   (see: <code><a href="#property_PROP_AXISFORMAT">PROP_AXISFORMAT</a></code>) 
*   in invocations of the <code>Execute</code> method 
*   (see: <code><a href="#method_request">execute()</a></code>).
*
*   @property PROP_AXISFORMAT_CLUSTER
*   @static
*   @final
*   @type string
*   @default <code>ClusterFormat</code>
*/
Xmla.PROP_AXISFORMAT_CLUSTER = "ClusterFormat";
/**
*   Can be used as value for the <code>AxisFormat</code> XML/A property 
*   (see: <code><a href="#property_PROP_AXISFORMAT">PROP_AXISFORMAT</a></code>) 
*   in invocations of the <code>Execute</code> method 
*   (see: <code><a href="#method_request">execute()</a></code>).
*
*   @property PROP_AXISFORMAT_CUSTOM
*   @static
*   @final
*   @type string
*   @default <code>CustomFormat</code>
*/
Xmla.PROP_AXISFORMAT_CUSTOM = "CustomFormat";

/**
*   Can be used as key in the <code>properties</code> member of the <code>options</code> object 
*   passed to the <code><a href="#method_request">request()</a></code> method 
*   to specify the XML/A <code>Content</code> property.
*   The XML/A <code>Content</code> property specifies whether to return data and/or XML Schema metadata by the <code>Discover</code> and <code>Execute</code> invocations.
*   Valid values for the <code>Content</code> property are available as the static final properties 
*   <code><a href="#property_PROP_CONTENT_DATA">PROP_CONTENT_DATA</a></code>, 
*   <code><a href="#property_PROP_CONTENT_NONE">PROP_CONTENT_NONE</a></code>, 
*   <code><a href="#property_PROP_CONTENT_SCHEMA">PROP_CONTENT_SCHEMA</a></code>, 
*   <code><a href="#property_PROP_CONTENT_SCHEMADATA">PROP_CONTENT_SCHEMADATA</a></code>.
*
*   Note: This key is primarily intended for clients that use the low-level <code><a href="#method_request">request()</a></code> method.
*   You should not set this property when calling the <code><a href="#method_request">discover()</a></code> method, 
*   the <code><a href="#method_execute">execute()</a></code> method, 
*   or any of the <code>discoverXXX()</code> methods. 
*
*   @property PROP_CONTENT
*   @static
*   @final
*   @type string
*   @default <code>Content</code>
*/
Xmla.PROP_CONTENT = "Content";
/**
*   Can be used as value for the XML/A <code>Content</code> property 
*   (see: <code><a href="#property_PROP_CONTENT">PROP_CONTENT</a></code>).
*   This value specifies that the response should contain only data, but no XML Schema metadata.
*
*   As the <code>Xmla</code> class relies on the XML Schema metadata to construct Rowset and Resultset instances,
*   this option is primarily useful if you know how to process the XML response directly.
*
*   @property PROP_CONTENT_DATA
*   @static
*   @final
*   @type string
*   @default <code>Data</code>
*/
Xmla.PROP_CONTENT_DATA = "Data";
/**
*   Can be used as value for the XML/A <code>Content</code> property 
*   (see: <code><a href="#property_PROP_CONTENT">PROP_CONTENT</a></code>).
*   This value specifies that the response should contain neither data nor XML Schema metadata.
*   This is useful to check the validity of the request.
*
*   @property PROP_CONTENT_NONE
*   @static
*   @final
*   @type string
*   @default <code>None</code>
*/
Xmla.PROP_CONTENT_NONE = "None";
/**
*   Can be used as value for the XML/A <code>Content</code> property 
*   (see: <code><a href="#property_PROP_CONTENT">PROP_CONTENT</a></code>).
*   This value specifies that the response should only return XML Schema metadata, but no data.
*
*   @property PROP_CONTENT_SCHEMA
*   @static
*   @final
*   @type string
*   @default <code>Schema</code>
*/
Xmla.PROP_CONTENT_SCHEMA = "Schema";
/**
*   Can be used as value for the XML/A <code>Content</code> property 
*   (see: <code><a href="#property_PROP_CONTENT">PROP_CONTENT</a></code>).
*   This value specifies that the response should return both data as well as XML Schema metadata.
*
*   @property PROP_CONTENT_SCHEMADATA
*   @static
*   @final
*   @type string
*   @default <code>SchemaData</code>
*/
Xmla.PROP_CONTENT_SCHEMADATA = "SchemaData";

Xmla.prototype = {
/**
*   This object stores listeners.
*   Each key is a listener type (see the static final <code>EVENT_XXX</code> constants), 
*   each value is an array of listener objects that are subscribed to that particular event.
*
*   @property listeners
*   @protected
*   @type Object
*   @default <pre>
{
&nbsp;     "request": []
&nbsp;,   "succss": []
&nbsp;,   "error": []
&nbsp;,   "discover": []
&nbsp;,   "discoversuccss": []
&nbsp;,   "discovererror": []
&nbsp;,   "execute": []
&nbsp;,   "executesuccss": []
&nbsp;,   "executeerror": []
}</pre>
*/
    listeners: null,
/**
*   This property is set to <code>null</code> right before sending an XML/A request.
*   When a successfull response is received, it is processed and the response object is assigned to this property.
*   The response object is either a 
*   <code><a href="Rowset.html#class_Rowset">Rowset</a></code> (after a successful invocation of XML/A <code>Discover</code> method, see: <code><a href="method_discover">discover()</a></code>) or a
*   <code><a href="Resultset.html#class_Resultset">Resultset</a></code> (after a successful invocation of the XML/A <code>Execute</code> method, see: <code><a href="method_execute">executte()</a></code>) 
*   instance. 
*
*   If you are interested in processing the raw response XML, see 
*   <code><a href="#property_responseXML">responseXML</a></code> and 
*   <code><a href="#property_responseText">responseText</a></code>.
*
*   Note that it is not safe to read this property immediately after doing an asynchronous request.
*   For asynchronous requests, you can read this property by the time the <code>XXX_SUCCESS</code> event handlers are notified (until it is set to <code>null</code> again by a subsequent request).
*
*   @property response
*   @type Xmla.Rowset|Xmla.Resultset
*   @default <code>null</code>
*/
    response: null,
/**
*   This property is set to <code>null</code> right before sending an XML/A request.
*   When a successfull response is received, the XML response is stored to this property as plain text.
*
*   If you are interested in processing a DOM document rather than the raw XML text, see the 
*   <code><a href="#property_responseXML">responseXML</a></code> property.
*
*   If you are interested in traversing the dataset returned in the XML/A response, see the
*   <code><a href="#property_response">response</a></code> property.
*
*   Note that it is not safe to read this property immediately after doing an asynchronous request.
*   For asynchronous requests, you can read this property by the time the <code>XXX_SUCCESS</code> event handlers are notified (until it is set to <code>null</code> again by a subsequent request).
*
*   @property responseText
*   @type {string}
*   @default <code>null</code>
*/
    responseText: null,
/**
*   This property is set to <code>null</code> right before sending an XML/A request.
*   When a successfull response is received, the XML response is stored to this property as a DOM Document.
*
*   If you are interested in processing the raw XML text rather than a DOM document, see the 
*   <code><a href="#property_responseText">responseText</a></code> property.
*
*   If you are interested in traversing the dataset returned in the XML/A response, see the
*   <code><a href="#property_response">response</a></code> property.
*
*   Note that it is not safe to read this property immediately after doing an asynchronous request.
*   For asynchronous requests, you can read this property by the time the <code>XXX_SUCCESS</code> event handlers are notified (until it is set to <code>null</code> again by a subsequent request).
*
*   @property responseXml
*   @type {DOMDocument}
*   @default <code>null</code>
*/
    responseXml: null,
    setOptions: function(options){
        _applyProperties(
            this.options,
            options,
            true
        );
    },
/**
*   This method can be used to register a listener to one or more events.
*   The <code>listener</code> argument should have the following structure: <pre>{
*       events: [...event names...],
*       handler: function() {...code to run upon notification...},
*       scope: object
*   }</pre>
*   <dl>
*       <dt><code>events</code></dt>
*       <dd>string[] REQUIRED. This must be an array containing final static <code>EVENT_XXX</code> string constant values. 
*       You can also use one of the predefined <code>EVENT_XXX</code> array constant values, 
*       or use array concatenation and compose a custom list of event names.
*       </dd>
*       <dt><code>handler</code></dt>
*       <dd>function REQUIRED. This function will be called and notified whenever one of the specified events occurs.
*       The function is called in scope of the <code>scope</code> property, otherwise a global function (= <code>window</code> scope) is assumed.
*       </dd>
*       <dt><code>scope</code></dt>
*       <dd>Object. When specified, this object is used as the <code>this</code> object when calling the handler.
*           When not specified, the global <code>window</code> is used.
*       </dd>
*   </dl>
*   @method addListener
*   @param {Object} listener An object that defines the events and the notification function to be called.
*/    
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
/**
*   Sends a request to the XML/A server.
*   This method is rather low-level and allows full control over the request 
*   by passing an options object. General properties of the options object are:
*   <ul>
*       <li><code>method</code> {string} REQUIRED the XML/A method to invoke. This should be one of the following constants:
*           <dl>
*               <dt><code><a href="#property_METHOD_DISCOVER">METHOD_DISCOVER</a></code></dt>
*               <dd>
*                   <p>
*                   This method is used to obtain metadata from the XML/A service or XML/A provider. 
*                   Metadata is returned in a tabular format called Schema Rowsets, which are represented by an instance of the 
*                   <code><a href="Xmla.Rowset.html#class_Xmla.Rowset">Xmla.Rowset</a></code> class.
*                   For these types of requests, you must pass the <code>requestType</code> option to specify which schema rowset you want to obtain.
*                   In addition, you can specify a <code>restrictions</code> object that is used as filter criteria to restrict which rows will be returned in the rowset.
*                   </p>
*                   <p>
*                   Instead of explicitly passing <code>METHOD_DISCOVER</code> as the <code>requestType</code>, you can also call the 
*                   <code><a href="#method_discover">discover()</a></code> method (which requires you to explictly pass a <code>requestType</code> option).
*                   Finally, you can also call one of the <code>discoverXXX()</code> methods in order to request a particular schema rowset.
*                   </p>
*               </dd>
*               <dt><code><a href="#property_METHOD_EXECUTE">METHOD_EXECUTE</a></code></dt>
*               <dd>
*                   <p>
*                   This method is used to send an MDX quey to the XML/A provider. 
*                   Query results are returned in a multidimentsional format which is represented by an instance of the 
*                   <code><a href="Xmla.Resultset.html#class_Xmla.Resultset">Xmla.Resultset</a></code> class.
*                   For these types of requests, you must pass the <code>statement</code> option to specify the MDX query.
*                   </p>
*                   <p>
*                   Instead of explicitly passing <code>METHOD_EXECUTE</code> as the <code>requestType</code>, you can also call the 
*                   <code><a href="#method_execute">execute()</a></code> method.
*                   </p>
*               </dd>
*           </dl>
*       </li>
*       <li><code>url</code> {string} REQUIRED the URL of XML/A service, or of a XML/A datasource. 
*           Typically, you first use the URL of a XML/A service (like <code>http://your.pentaho.server:8080/pentaho/Xmla?userid=joe&amp;password=password</code>) 
*           and use that to retrieve the <code>DISCOVER_DATASOURCES</code> rowset. 
*           Then, you can connect to a XML/A datasource using the value returned by the <code>URL</code> column of the <code>DISCOVER_DATASOURCES</code> rowset 
*           (typically, you also have to set a <code>DataSourceInfo</code> property using the value found in the <code>DataSourceInfo</code> column of the <code>DISCOVER_DATASOURCES</code> rowset).
*       </li>
*       <li>
*           <code>properties</code> {Object} XML/A properties. 
*           The appropriate types and values of XML/A properties are dependent upon the specific method and requestType.
*           The XML/A standard defines a set of pre-defined properties. 
*           The <code>Xmla</code> class defines a static final property for each of these (see the <code>PROP_XXX</code> constants).
*           The list of all valid properties can be obtained from the <code>DISCOVER_PROPERTIES</code> schema rowset 
*           (see <code><a href="#method_discoverProperties()">discoverProperties()</a></code>). 
*           Each javascript property of the <code>properties</code> object is mapped literally to a XML/A property.
*       </li>
*       <li><code>async</code> {boolean} 
*           Determines how the request is performed:<ul>
*               <li><code>true</code>: The request is performed asynchronously: the call to <code>request()</code> will not block and return immediately.
*               In this case, the return value of the <code>request()</code> method is not defined, 
*               and the response must be received by registering a listener 
*               (see <code><a href="#method_addListener">addListener()</a></code>).
*               </li>
*               <li><code>false</code>: The request is performed synchronously: the call to <code>request()</code> will block until it receives a response from the XML/A server or times out.
*               In this case, the <code>request()</code> method returns 
*               a <code>Rowset</code> (for <code>Discover</code> requests) or 
*               a <code>Resultset</code> (for <code>Execute</code> requests).
*               If you registered any listeners (see <code><a href="#method_addListener">addListener()</a></code>), 
*               then these will still be notified of any events (such as receiving the response).
*               </li>
*           </ul>
*       </li>
*   </ul>
*   Other parts of the <code>options</code> object are method-specific.
*   <ul>
*       <li>The following options are applicable in case the <code>method</code> is <code>METHOD_DISCOVER</code>:
*           <ul>
*               <li><code>requestType</code> - {string} Applies to the Discover method and indicates the kind of schema rowset to retrieve.
*                   You can use one of the <code>DISCOVER_XXX</code>, <code>DBSCHEMA_XXX</code> or <code>MDSCHEMA_XXX</code> constants for this property.
*                   You can also dymically discover which values for <code>requestType</code> are supported by the XML/A provider using the 
*                   <code>DISCOVER_SCHEMA_ROWSETS</code> rowset (see: <code><a href="method_discoverMDSchemaRowsets">discoverMDSchemaRowsets()</a></code>).
*                   See the <code><a href="#method_discover">discover()</a></code> method for more information.
*               </li>
*               <li>
*                   <code>restrictions</code> {Object} XML/A restrictions are used to filter the requested schema rowset. 
*                   For more information on restrictions, see the <code><a href="#method_discover">discover()</a></code> method.
*               </li>
*           </ul>
*       </li>
*       <li>The following options are applicable in case the <code>method</code> is <code>METHOD_EXECUTE</code>:
*           <ul>
*               <li><code>statement</code> - {string} Applies to the Execute method and specifies the MDX query to send to the server.
*               </li>
*           </ul>
*       </li>
*   </ul>
*   Instead of calling this method directly, consider calling 
*   <code><a href="#method_discover">discover()</a></code> (to obtain a schema rowset),
*   <code><a href="#method_execute">execute()</a></code> (to issue a MDX query), 
*   or one of the specialized <code>discoverXXX()</code> methods (to obtain a particular schema rowset).
*   @method request
*   @param {Object} options An object whose properties convey the options for the request. 
*   @return {Xmla.Rowset|Xmla.Resultset} The result of the invoking the XML/A method. For an asynchronous request, the return value is not defined. For synchronous requests, <code>Discover</code> requests return an instance of a <code>Xmla.Rowset</code>, and <code>Execute</code> results return an instance of a <code>Xmla.Resultset</code>.
*/
    request: function(options){
        var xmla = this;

        if (this.response){
            this.response.close();
        }
        this.response = null;
        this.responseText = null;
        this.responseXml = null;
        
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
            complete: function(xhr, textStatus){
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
        
        var soapFault = _getElementsByTagNameNS(this.responseXML, _xmlnsSOAPenvelope, _xmlnsSOAPenvelopePrefix, "Fault");
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
                    var rowset = new Xmla.Rowset(this.responseXML, request.requestType);
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
/**
*   Sends an MDX query to a XML/A DataSource to invoke the XML/A <code>Execute</code> method and obtain the multi-dimensional resultset.
*   Options are passed using a generic <code>options</code> object.
*   Applicable properties of the <code>options</code> object are:
*   <ul>
*       <li><code>url</code> {string} REQUIRED the URL of a XML/A datasource. 
*           This should be a value obtained from the <code>URL</code> column of the <code>DISCOVER_DATASOURCES</code> rowset
*           (see: <code><a href="method_discoverDataSources">discoverDataSources()</a></code>).
*       </li>
*       <li><code>statement</code> - {string} The MDX query to send to the server.
*       </li>
*       <li>
*           <code>properties</code> {Object} XML/A properties. 
*           The list of all valid properties can be obtained from the <code>DISCOVER_PROPERTIES</code> schema rowset 
*           (see <code><a href="#method_discoverProperties()">discoverProperties()</a></code>). 
*           Typically, <code>execute()</code> requires these properties:<dl>
*               <dt><code>DataSourceInfo</code> property</dt>
*               <dd>Identifies a data source managed by the XML/A server.
*                   To specify this property, you can use the static final constant
*                   <code><a href="#property_PROP_DATASOURCEINFO">PROP_DATASOURCEINFO</a></code>
*                   as key in the <code>properties</code> object of the <code>options</code> object passed to the <code>execute()</code> method.
*                   Valid values for this property should be obtained from the <code>DataSourceInfo</code> column 
*                   of the <code>DISCOVER_DATASOURCES</code> schema rowset (see: <code><a href="#method_discoverDataSources">discoverDataSources()</a></code>).
*                   Note that the values for the <code>DataSourceInfo</code> property and the <code>url</code> must both be taken from the same row of the <code>DISCOVER_DATASOURCES</code> schema rowset.
*               </dd>
*               <dt><code>Catalog</code> property</dt>
*               <dd>Identifies a catalog applicable for the datasource.
*                   To specify this property, you can use the static final constant
*                   <code><a href="#property_PROP_CATALOG">PROP_CATALOG</a></code>
*                   as key in the <code>properties</code> object of the <code>options</code> object passed to the <code>execute()</code> method.
*                   Valid values for this property should be obtained from the <code>CATALOG_NAME</code> column 
*                   of the <code>DBSCHEMA_CATALOGS</code> schema rowset (see: <code><a href="#method_discoverDBCatalogs">discoverDBCatalogs()</a></code>).
*               </dd>
*           </dl>
*       </li>
*       <li><code>async</code> {boolean} 
*           Determines how the request is performed:<ul>
*               <li><code>true</code>: The request is performed asynchronously: the call to <code>request()</code> will not block and return immediately.
*               In this case, the return value of the <code>request()</code> method is not defined, 
*               and the response must be received by registering a listener 
*               (see <code><a href="#method_addListener">addListener()</a></code>).
*               </li>
*               <li><code>false</code>: The request is performed synchronously: the call to <code>execute()</code> will block until it receives a response from the XML/A server or times out.
*               In this case, a <code>Resultset</code> is returned that represents the multi-dimensional data set.
*               If you registered any <code>REQUEST_XXX</code> and/or <code>EXECUTE_XXX</code> listeners (see <code><a href="#method_addListener">addListener()</a></code>), 
*               then these will still be notified.
*               </li>
*           </ul>
*       </li>
*   </ul>
*   @method execute
*   @param {Object} options An object whose properties convey the options for the XML/A <code>Execute</code> request. 
*   @return {Xmla.Resultset} The result of the invoking the XML/A <code>Execute</code> method. For an asynchronous request, the return value is not defined. For synchronous requests, an instance of a <code>Xmla.Resultset</code> that represents the multi-dimensional result set of the MDX query.
*/
    execute: function(options) {
        var errorObject, properties = options.properties;
        if (_isUndefined(properties)){
            properties = {};
            options.properties = properties;
        }
        if (_isUndefined(properties[Xmla.PROP_CONTENT])){
            properties[Xmla.PROP_CONTENT] = Xmla.PROP_CONTENT_SCHEMADATA;
        }
        if (_isUndefined(properties[Xmla.PROP_FORMAT])){
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
/**
*   Sends a request to invoke the XML/A <code>Discover</code> method and returns a schema rowset specified by the <code>requestType</code> option.
*   Options are passed using a generic <code>options</code> object.
*   Applicable properties of the <code>options</code> object are:
*   <ul>
*       <li><code>requestType</code> - {string} Indicates the kind of schema rowset to retrieve.
*           You can use one of the following predefined XML for Analysis Schema Rowset constants:
*           <ul>
*               <li><code><a href="#property_DISCOVER_DATASOURCES">DISCOVER_DATASOURCES</a></code></li>
*               <li><code><a href="#property_DISCOVER_ENUMERATORS">DISCOVER_ENUMERATORS</a></code></li>
*               <li><code><a href="#property_DISCOVER_KEYWORDS">DISCOVER_KEYWORDS</a></code></li>
*               <li><code><a href="#property_DISCOVER_LITERALS">DISCOVER_LITERALS</a></code></li>
*               <li><code><a href="#property_DISCOVER_PROPERTIES">DISCOVER_PROPERTIES</a></code></li>
*               <li><code><a href="#property_DISCOVER_SCHEMA_ROWSETS">DISCOVER_SCHEMA_ROWSETS</a></code></li>
*           </ul>
*           Or one of the applicable OLE DB Schema Rowset constants: 
*           <ul>
*               <li><code><a href="#property_DBSCHEMA_CATALOGS">DBSCHEMA_CATALOGS</a></code></li>
*               <li><code><a href="#property_DBSCHEMA_COLUMNS">DBSCHEMA_COLUMNS</a></code></li>
*               <li><code><a href="#property_DBSCHEMA_PROVIDER_TYPES">DBSCHEMA_PROVIDER_TYPES</a></code></li>
*               <li><code><a href="#property_DBSCHEMA_SCHEMATA">DBSCHEMA_SCHEMATA</a></code></li>
*               <li><code><a href="#property_DBSCHEMA_TABLES">DBSCHEMA_TABLES</a></code></li>
*               <li><code><a href="#property_DBSCHEMA_TABLES_INFO">DBSCHEMA_TABLES_INFO</a></code></li>
*           </ul>
*           Or one of the applicable OLE DB for OLAP Schema Rowset constants: 
*           <ul>
*               <li><code><a href="#property_MDSCHEMA_ACTIONS">MDSCHEMA_ACTIONS</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_CUBES">MDSCHEMA_CUBES</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_DIMENSIONS">MDSCHEMA_DIMENSIONS</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_FUNCTIONS">MDSCHEMA_FUNCTIONS</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_HIERARCHIES">MDSCHEMA_HIERARCHIES</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_MEASURES">MDSCHEMA_MEASURES</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_MEMBERS">MDSCHEMA_MEMBERS</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_PROPERTIES">MDSCHEMA_PROPERTIES</a></code></li>
*               <li><code><a href="#property_MDSCHEMA_SETS">MDSCHEMA_SETS</a></code></li>
*           </ul>
*           You can also dymically discover which values for <code>requestType</code> are supported by the XML/A provider.
*           To do that, refer to the <code>SchemaName</code> column of the <code>DISCOVER_SCHEMA_ROWSETS</code> rowset
*           (see: <code><a href="method_discoverMDSchemaRowsets">discoverMDSchemaRowsets()</a></code>).
*       </li>
*       <li><code>url</code> {string} REQUIRED the url of the XML/A service or XML/A datasource.        
*           If the value for the <code>requestType</code> option is one of the predefined XML/A <code><a href="">DISCOVER_XXX</a></code> constants, 
*           then this should be the url of the XML/A service.
*       </li>
*       <li>
*           <code>properties</code> {Object} XML/A properties. 
*           The appropriate types and values of XML/A properties are dependent upon the value passed as <code>requestType</code>.
*           The XML/A standard defines a set of pre-defined properties. 
*           The <code>Xmla</code> class defines a static final property for each of these (see the <code>PROP_XXX</code> constants).
*           The list of all valid properties can be obtained from the <code>DISCOVER_PROPERTIES</code> schema rowset 
*           (see <code><a href="#method_discoverProperties()">discoverProperties()</a></code>). 
*           Each javascript property of the <code>properties</code> object is mapped literally to a XML/A property.
*       </li>
*       <li>
*           <code>restrictions</code> {Object} XML/A restrictions.
*           These are used to specify a filter that will be applied to the data in the schema rowset.
*           Each javascript property of the <code>restrictions</code> object is mapped to a column of the requested schema rowset.
*           The value for the restriction is sent with the request, and processed by the XML/A server to only return matching rows from the requested schema dataset.
*           The name, types and values of the restrictions are dependent upon which schema rowset is requested.
*           The available restrictions are specified by the <code>Restrictions</code> column of the <code>DISCOVER_SCHEMA_ROWSETS</code> schema rowset.
*           For a number of schema rowsets, the available restrictions are pre-defined. 
*           These are documented together with each particular <code>discoverXXX()</code> method.
*       </li>
*       <li><code>async</code> {boolean} 
*           Determines how the request is performed:<ul>
*               <li><code>true</code>: The request is performed asynchronously: the call to <code>request()</code> will not block and return immediately.
*               In this case, the return value of the <code>request()</code> method is not defined, 
*               and the response must be received by registering a listener 
*               (see <code><a href="#method_addListener">addListener()</a></code>).
*               </li>
*               <li><code>false</code>: The request is performed synchronously: the call to <code>execute()</code> will block until it receives a response from the XML/A server or times out.
*               In this case, a <code>Resultset</code> is returned that represents the multi-dimensional data set.
*               If you registered any <code>REQUEST_XXX</code> and/or <code>EXECUTE_XXX</code> listeners (see <code><a href="#method_addListener">addListener()</a></code>), 
*               then these will still be notified.
*               </li>
*           </ul>
*       </li>
*   </ul>
*   Instead of calling this method directly, consider calling 
*   or one of the specialized <code>discoverXXX()</code> methods to obtain a particular schema rowset.
*   @method discover
*   @param {Object} options An object whose properties convey the options for the XML/A <code>Discover</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the requested schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_DATASOURCES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_DATASOURCES</code> schema rowset. 
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>
*               DataSourceName
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               A name that identifies this data source.
*           </td>
*           <td>
*               Yes
*           </td>
*           <td>
*               No
*           </td>
*       </tr>
*       <tr>
*           <td>
*               DataSourceDescription
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               Human readable description of the datasource 
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               URL
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               URL to use to submit requests to this provider.
*           </td>
*           <td>
*               Yes
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               DataSourceInfo
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               Connectstring
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               ProviderName
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               A name indicating the product providing the XML/A implementation
*           </td>
*           <td>
*               Yes
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               ProviderType
*           </td>
*           <td>
*               string[]
*           </td>
*           <td>
*               The kind of data sets supported by this provider. 
*               The following values are defined by the XML/A specification:
*               <dl>
*                   <dt>TDP</dt><dd>tabular data provider.</dd>
*                   <dt>MDP</dt><dd>multidimensiona data provider.</dd>
*                   <dt>DMP</dt><dd>data mining provider.</dd>
*               </dl>
*               Note: multiple values are possible.
*           </td>
*           <td>
*               Yes
*           </td>
*           <td>
*               No
*           </td>
*       </tr>
*       <tr>
*           <td>
*               AuthenticationMode
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               Type of security offered by the provider
*               The following values are defined by the XML/A specification:
*               <dl>
*                   <dt>Unauthenticated</dt><dd>no user ID or password needs to be sent.</dd>
*                   <dt>Authenticated</dt><dd>User ID and password must be included in the information required for the connection.</dd>
*                   <dt>Integrated</dt><dd> the data source uses the underlying security to determine authorization</dd>
*               </dl>
*           </td>
*           <td>
*               Yes
*           </td>
*           <td>
*               No
*           </td>
*       </tr>
*   </table>
*   
*   @method discoverDataSources
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_DATASOURCES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_DATASOURCES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_PROPERTIES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_PROPERTIES</code> schema rowset. 
*   This rowset provides information on the properties that are supported by the XML/A provider.
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>
*               PropertyName
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               The name of the property
*           </td>
*           <td>
*               Yes (array)
*           </td>
*           <td>
*               No
*           </td>
*       </tr>
*       <tr>
*           <td>
*               PropertyDescription
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               Human readable description of the property
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               PropertyType
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               The property's datatype (as an XML Schema data type)
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               PropertyAccessType
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               How the property may be accessed. Values defined by the XML/A spec are:
*               <ul>
*                   <li>Read</li>
*                   <li>Write</li>
*                   <li>ReadWrite</li>
*               </ul>
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               No
*           </td>
*       </tr>
*       <tr>
*           <td>
*               IsRequired
*           </td>
*           <td>
*               boolean
*           </td>
*           <td>
*               <code>true</code> if the property is required, <code>false</code> if not.
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*       <tr>
*           <td>
*               Value
*           </td>
*           <td>
*               string
*           </td>
*           <td>
*               The property's current value.
*           </td>
*           <td>
*               No
*           </td>
*           <td>
*               Yes
*           </td>
*       </tr>
*   </table>
*   
*   @method discoverProperties
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_DATASOURCES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_DATASOURCES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_SCHEMA_ROWSETS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_SCHEMA_ROWSETS</code> schema rowset. 
*   This rowset lists all possible request types supported by this provider.
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>SchemaName</td>
*           <td>string</td>
*           <td>The requestType. </td>
*           <td>Yes</td>
*           <td>No</td>
*       </tr>
*       <tr>
*           <td>Restrictions</td>
*           <td>array</td>
*           <td>A list of columns that may be used to filter the schema rowset.</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>Description</td>
*           <td>string</td>
*           <td>A human readable description of the schema rowset that is returned when using this requestType</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*   </table>
*
*   @method discoverSchemaRowsets
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_SCHEMA_ROWSETS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_DATASOURCES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_ENUMERATORS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_ENUMERATORS</code> schema rowset. 
*   This rowset lists the names, data types, and enumeration values of enumerators supported by the XMLA Provider for a specific data source.
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>EnumName</td>
*           <td>string</td>
*           <td>Name of the enumerator. </td>
*           <td>Yes (array)</td>
*           <td>No</td>
*       </tr>
*       <tr>
*           <td>EnumDescription</td>
*           <td>string</td>
*           <td>A human readable description of the enumerator</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>EnumType</td>
*           <td>string</td>
*           <td>The XML Schema data type of this enumerator</td>
*           <td>No</td>
*           <td>No</td>
*       </tr>
*       <tr>
*           <td>ElementName</td>
*           <td>string</td>
*           <td>The name of the enumerator entry</td>
*           <td>No</td>
*           <td>No</td>
*       </tr>
*       <tr>
*           <td>ElementDescription</td>
*           <td>string</td>
*           <td>A human readable description of this enumerator entry</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>ElementValue</td>
*           <td>string</td>
*           <td>The value of this enumerator entry</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*   </table>
*
*   @method discoverEnumerators
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_ENUMERATORS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_ENUMERATORS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_KEYWORDS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_KEYWORDS</code> schema rowset. 
*   This rowset is a list of reserved words for this XML/A provider.
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>Keyword</td>
*           <td>string</td>
*           <td>Name of the enumerator. </td>
*           <td>Yes (array)</td>
*           <td>No</td>
*       </tr>
*   </table>
*
*   @method discoverKeywords
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_KEYWORDS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_ENUMERATORS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using <code><a href="#property_DISCOVER_LITERALS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DISCOVER_LITERALS</code> schema rowset. 
*   This rowset is a list of reserved words for this XML/A provider.
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*       <tr>
*           <td>LiteralName</td>
*           <td>string</td>
*           <td>Name of the literal. </td>
*           <td>Yes (array)</td>
*           <td>No</td>
*       </tr>
*       <tr>
*           <td>LiteralValue</td>
*           <td>string</td>
*           <td>The actual literal value. </td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>LiteralInvalidChars</td>
*           <td>string</td>
*           <td>Characters that may not appear in the literal </td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>LiteralInvalidStartingChars</td>
*           <td>string</td>
*           <td>Characters that may not appear as first character in the literal </td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*       <tr>
*           <td>LiteralMaxLength</td>
*           <td>int</td>
*           <td>maximum number of characters for this literal, or -1 in case there is no maximum, or the maximum is unknown</td>
*           <td>No</td>
*           <td>Yes</td>
*       </tr>
*   </table>
*
*   @method discoverLiterals
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DISCOVER_LITERALS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DISCOVER_LITERALS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/    
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_CATALOGS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_CATALOGS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBCatalogs
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_CATALOGS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_CATALOGS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_COLUMNS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_COLUMNS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBColumns
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_COLUMNS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_COLUMNS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_PROVIDER_TYPES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_PROVIDER_TYPES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBProviderTypes
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_PROVIDER_TYPES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_PROVIDER_TYPES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_SCHEMATA"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_SCHEMATA</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBSchemata
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_SCHEMATA</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_SCHEMATA</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_TABLES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_TABLES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBTables
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_TABLES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_TABLES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_DBSCHEMA_TABLES_INFO"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>DBSCHEMA_TABLES_INFO</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverDBTablesInfo
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>DBSCHEMA_TABLES_INFO</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>DBSCHEMA_TABLES_INFO</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_ACTIONS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_ACTIONS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDActions
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_ACTIONS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_ACTIONS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_CUBES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_CUBES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDCubes
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_CUBES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_CUBES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_DIMENSIONS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_DIMENSIONS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDDimensions
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_DIMENSIONS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_DIMENSIONS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_FUNCTIONS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_FUNCTIONS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDFunctions
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_FUNCTIONS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_FUNCTIONS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_HIERARCHIES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_HIERARCHIES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDHierarchies
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_HIERARCHIES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_HIERARCHIES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_LEVELS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_LEVELS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDLevels
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_LEVELS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_LEVELS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_MEASURES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_MEASURES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDMeasures
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_MEASURES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_MEASURES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_MEMBERS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_MEMBERS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDMembers
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_MEMBERS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_MEMBERS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_PROPERTIES"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_PROPERTIES</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDProperties
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_PROPERTIES</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_PROPERTIES</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
/**
*   Invokes the <code><a href="#method_discover">discover()</a></code> method using 
*   <code><a href="#property_MDSCHEMA_SETS"></a></code> as value for the <code>requestType</code>, 
*   and retrieves the <code>MDSCHEMA_SETS</code> schema rowset. 
*   ...todo...
*   The rowset has the following columns:
*   <table border="1" class="schema-rowset">
*       <tr>
*           <th>Column Name</th>
*           <th>Type</th>
*           <th>Description</th>
*           <th>Restriction</th>
*           <th>Nullable</th>
*       </tr>
*   </table>
*   @method discoverMDSets
*   @param {Object} options An object whose properties convey the options for the XML/A a <code>MDSCHEMA_SETS</code> request. 
*   @return {Xmla.Rowset} The result of the invoking the XML/A <code>Discover</code> method. For synchronous requests, an instance of a <code><a href="Xmla.Rowset.html#Xmla.Rowset">Xmla.Rowset</a></code> that represents the <code>MDSCHEMA_SETS</code> schema rowset. For an asynchronous request, the return value is not defined: you should add a listener (see: <code><a href="#method_addListener">addListener()</a></code>) and listen for the <code>success</code> (see: <code><a href="#property_EVENT_SUCCESS">EVENT_SUCCESS</a></code>) or <code>discoversuccess</code> (see: <code><a href="#property_EVENT_DISCOVER_SUCCESS">SUCCESS</a></code>) events. 
*/        
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
    var types = _getElementsByTagNameNS(xmlDoc, _xmlnsSchema, _xmlnsSchemaPrefix, "complexType"), 
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

/**
*   <p>
*   This class implements an XML/A Rowset object.
*   </p>
*   <p>
*   You do not need to instantiate objects of this class yourself. 
*   Rather, the <code><a href="Xmla.html#class_Xmla">Xmla</a></code> class will instantiate this class to convey the result of any of the various <code>discoverXXX()</code> methods
*   (see <code><a href="Xmla.html#method_discover">discover()</a></code>).
*   </p>
*   <p>
*   The <code>discoverXXX()</code> methods return the <code>Xmla.Rowset</code> instance when doing a synchronous request. 
*   In addition, the rowset is available in the eventdata passed to any registered listeners
*   (see <code><a href="Xmla.html#method_addListener">addListener()</a></code>).
*   </p>
*   
*   @class Xmla.Rowset
*   @constructor
*   @param {DOMDocument} node The responseXML result returned by server in response to a <code>Discover</code> request. 
*   @param {string} requestTtype The requestType identifying the particular schema rowset to construct. This facilitates implementing field getters for a few complex types.
*/
Xmla.Rowset = function (node, requestType){
    this.rows = _getElementsByTagNameNS(node, _xmlnsRowset, null, "row");
    this.numRows = this.rows? this.rows.length : 0;
    this.rowIndex = 0;
    this.row = (this.hasMoreRows()) ? this.rows.item(this.rowIndex) : null;
    this.fieldOrder = [];
    this.fields = {};
    this._fieldCount = 0;
    var rowSchema = _getRowSchema(node);
    if (rowSchema){    
        var seq = _getElementsByTagNameNS(rowSchema, _xmlnsSchema, _xmlnsSchemaPrefix, "sequence").item(0),
            seqChildren = seq.childNodes, numChildren = seqChildren.length, seqChild,
            fieldLabel, fieldName, minOccurs, maxOccurs, type;
        for (var i=0; i<numChildren; i++){
            seqChild = seqChildren.item(i);
            if (seqChild.nodeType!=1) {
                continue;
            }
            fieldLabel = _getAttributeNS(seqChild, _xmlnsSQL, _xmlnsSQLPrefix, "field");
            fieldName = seqChild.getAttribute("name");
            type = seqChild.getAttribute("type");
            if (!type && requestType==Xmla.DISCOVER_SCHEMA_ROWSETS && fieldName=="Restrictions") {
                type = "Restrictions";
            }
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

Xmla.Rowset.prototype = {
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
    _restrictionsConverter: function(val){
        return val;
    },
    _arrayConverter: function(nodes, valueConverter){
        var arr = [],
            numNodes = nodes.length,
            node
        ;
        for (var i=0; i<numNodes; i++){
            node = nodes.item(i);
            arr.push(valueConverter(this._elementText(node)));
        }
        return arr;
    },
    _elementText: function(el){
        if (el.innerText) {         //ie
            return el.innerText;
        }
        else 
        if (el.textContent) {       //ff
            return el.textContent;
        }
        else {                      //generic
            var text = "",
                childNodes = el.childNodes,
                numChildNodes = childNodes.length
            ;
            for (var i=0; i<numChildNodes; i++){
                text += childNodes.item(i).data;
            }
            return text;
        }
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
            case "Restrictions":
                valueConverter = me._restrictionsConverter;
                break;
            default:
                valueConverter = me._textConverter;
                break;
        }
        var getter;
        if (maxOccurs==="1") {
            if(minOccurs==="1") {
                getter = function(){
                    var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, null, fieldName);
                    return valueConverter(me._elementText(els.item(0)));
                };
            }
            else 
            if(minOccurs==="0") {
                getter = function(){
                    var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, null, fieldName);
                    if (!els.length) {
                        return null;
                    }
                    else {
                        return valueConverter(me._elementText(els.item(0)));
                    }
                };
            }
        }
        else 
        if(minOccurs==="1") {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, null, fieldName);
                return me._arrayConverter(els, valueConverter);
            };
        }
        else 
        if(minOccurs==="0") {
            getter = function(){
                var els = _getElementsByTagNameNS (this.row, _xmlnsRowset, null, fieldName);
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
/**
*   Retrieve an array of <code>fieldDef</code> objects that describes the fields of the rows in this rowset.
*   The position of the <code>fieldDef</code> objects in the array corresponds to the column order of the rowset.
*   For a description of the <code>fieldDef</code> object, see the 
*   <code><a href="#method_fieldDef">fieldDef()</a></code> method.
*
*   @method getFields
*   @return <code>fieldDef[]</code> An (ordered) array of field definition objects. 
*/    
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
/**
*   Indicates wheter the rowset that can be traversed.
*   You can use this method together with the 
*   <code><a href="#method_next">next()</a></code> method
*   to drive a <code>while</code> loop to traverse all rows in the rowset, like so:
    <pre>
&nbsp;while(rowset.hasMoreRows()){
&nbsp;    ...process row...
&nbsp;    rowsete.next();
&nbsp;}
    </pre>
*   @method hasMoreRows
*   @return {bool} true in case there are more rows to traverse. false if all rows have been traversed.
*/    
    hasMoreRows: function(){
        return this.numRows > this.rowIndex;
    },
/**
*   Moves the internal row index to the next row.
*   You can use this method together with the 
*   <code><a href="#method_next">hasMoreRows()</a></code> method
*   to drive a <code>while</code> loop to traverse all rows in the rowset.
*
*   @method next
*/    
    next: function(){
        this.row = this.rows.item(++this.rowIndex);
    },
/**
*   Retrieves a <code>fieldDef</code> object by name.
*   A fieldDef describes a field (column). It has the following properties:
*   <dl>
*       <dt>label</dt><dd>string. This is the human readable name for this field. You should use this name for display purposes and for building restrictions. This is also the name used for matching againstt the <code>name</code> argument passed to the <code>fieldDef()</code> method.</dd>
*       <dt>name</dt><dd>string. This is the (possibly escaped) name of the field as it appears in the XML document</dd>
*       <dt>index</dt><dd>int. The ordinal position of this field. Fields are numbered starting from 0.</dd>
*       <dt>type</dt><dd>string. The name of the XML data type for the values that appear in this column</dd>
*       <dt>minOccurs</dt><dd>string. The minimal number of occurrences of a value. "0" means the field is optional.</dd>
*       <dt>maxOccurs</dt><dd>string. If this is parseable as an integer, that integer specifies the number of times a value can appear in this column. "unbounded" means there is no declared limit.</dd>
*       <dt>getter</dt><dd>function. This function is used to extract a value from the XML document for this field.</dd>
*   </dl>
*   @method fieldDef
*   @param {string} name The name of the field to retrieve.
*   @return {fieldDef} The <code>fieldDef</code> object that matches the argument.
*/    
    fieldDef: function(name){
        var field = this.fields[name];
        if (_isUndefined(field)){
            throw "No such field: \"" + name + "\"";
        }
        return field;
    },
/**
*   Retrieves the index of a field by name.
*   Field indexes start at 0.
*   @method fieldIndex
*   @param {string} name The name of the field for which you want to retrieve the index.
*   @return {int} The ordinal position (starting at 0) of the field that matches the argument.
*/    
    fieldIndex: function(name){
        var fieldDef = this.fieldDef(name);
        return fieldDef.index;
    },
/**
*   Retrieves the name of a field by field Index.
*   Field indexes start at 0.
*   @method fieldName
*   @param {string} name The name of the field for which you want to retrieve the index.
*   @return {int} The ordinal position (starting at 0) of the field that matches the argument.
*/    
    fieldName: function(index){
        return this.fieldOrder[index];
    },
/**
*   Retrieves a value from the current row for the field having the name specified by the argument.
*   @method fieldVal
*   @param {string} name The name of the field for which you want to retrieve the value.
*   @return {array|boolean|float|int|string} From the current row, the value of the field that matches the argument.
*/    
    fieldVal: function(name){
        if (_isNumber(name)){
            name = this.fieldName(name);
        }
        var field = this.fieldDef(name);
        return field.getter.call(this);
    },
/**
*   Returns the number of fields in this rowset.
*   @method fieldCount
*   @return {int} The number of fields in this rowset.
*/    
    fieldCount: function(){
        return this._fieldCount;
    },
/**
*   Releases references to the DomDocument passed to the Rowset constructor.
*   This should facilitate automatic garbage collection by the browser.
*   @method close
*/    
    close: function(){
        this.row = null;
        this.rows = null;
    },
/**
*   Fetch all values from all fields from the current row, and return it in an array.
*   The position of the values in the array corresponds to the column order of the rowset.
*   The internal row pointer is also increased so the next call will read the next row.
*   The method returns false when there are no more rows to traverse. 
*   You can use this method to drive a loop to travere all rows in the Rowset: 
<pre>
while (rowArray = rowset.fetchAsArray()){
&nbsp;   ...process array...
}
</pre>
*   @method fetchAsArray 
*   @return {array}
*/    
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
/**
*   Fetch all values from all fields from the current row, and return it in an Object literal.
*   The property names of the returned object correspond to the fieldName (actually the fieldLabel), and the field value is assigned to its respective property.
*   The internal row pointer is also increased so the next call will read the next row.
*   The method returns false when there are no more rows to traverse. 
*   You can use this method to drive a loop to travere all rows in the Rowset: 
<pre>
while (rowObject = rowset.fetchAsObject()){
&nbsp;   ...process object...
}
</pre>
*   @method fetchAsObject 
*   @return {Object|boolean}
*/    
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
/**
*   Fetch all values from all fields from all rows, and return it as an array of arrays.
*   See <code><a href="#method_fetchAsArray">fetchAsArray()</a></code>.
*   @method fetchAllAsArray 
*   @return array[]
*/    
    fetchAllAsArray: function(){
        var row, rows = [];
        while((row = this.fetchAsArray())){
            rows.push(row);
        }
        return rows;
    },
/**
*   Fetch all values from all fields from all rows, and return it as an array of objects.
*   See <code><a href="#method_fetchAsObject">fetchAsObject()</a></code>.
*   @method fetchAllAsObject 
*   @return array[]
*/    
    fetchAllAsObject: function(){
        var row, rows = [];
        while((row = this.fetchAsObject())){
            rows.push(row);
        }
        return rows;
    }    
};

}());