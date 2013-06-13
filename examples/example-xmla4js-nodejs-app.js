/*
    Copyright 2012 Roland Bouman.
    contact: Roland.Bouman@gmail.com ~ http://rpbouman.blogspot.com/ ~ http://code.google.com/p/xmla4js
    twitter: @rolandbouman

    This is REST-for-analysis - a sample xmla4js application for node.js
    This script turns node.js into a REST-ful proxy for an existing XML/A server.

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
var port = 8124,
    http = require("http"),
    url = require("url"),
    xmla = require('xmla4js'),
    X = xmla.Xmla
    discoverRequestTypes = [
        null,
        {name: X.DISCOVER_DATASOURCES, key: "DataSourceName", property: X.PROP_DATASOURCEINFO},
        {name: X.DBSCHEMA_CATALOGS, key: "CATALOG_NAME", property: X.PROP_CATALOG},
        {name: X.MDSCHEMA_CUBES, key: "CUBE_NAME", property: X.PROP_CUBE},
        {name: X.MDSCHEMA_DIMENSIONS, key: "DIMENSION_UNIQUE_NAME"},
        {name: X.MDSCHEMA_HIERARCHIES, key: "HIERARCHY_UNIQUE_NAME"},
        {name: X.MDSCHEMA_LEVELS, key: "LEVEL_UNIQUE_NAME"},
        {name: X.MDSCHEMA_MEMBERS, key: "MEMBER_UNIQUE_NAME"},
        {name: X.MDSCHEMA_PROPERTIES}
    ]
;

function rowsetToCsv(xmlaRowset) {
    var i, n = xmlaRowset.fieldCount(), text = "",
        linesep = "\r\n", fieldsep = ",", value, row
    ;
    for (i = 0; i < n; i++) {
        if (i) text += fieldsep;
        text += xmlaRowset.fieldName(i);
    }
    text += linesep;
    while (row = xmlaRowset.fetchAsArray()){
        for (i = 0; i < n; i++) {
            if (i) text += fieldsep;
            value = row[i];
            if (value === null) text += "";
            else
            if (typeof(value)==="string") text += "\"" +  value.replace(/"/g, "\"\"") +"\""
            else text += value
            ;
        }
        text += linesep;
    }
    return text;
}

function datasetToCsv(dataset) {
}

function toCsv(xmla, xmlaRequest, xmlaResponse, requestUrl){
    var text;
    if (xmlaResponse instanceof X.Rowset) {
        text = rowsetToCsv(xmlaResponse);
    }
    else
    if (xmlaResponse instanceof X.Dataset) {
        text = datasetToCsv(xmlaResponse);
    }
    return text;
}

function discoverRowsetToHtml(xmla, xmlaRequest, xmlaRowset, requestUrl) {
    var thead = "", tbody = "", i, n, row, href, links = "",
        fieldName, keyIndex = -1, keyValue,
        search = requestUrl.search.replace(/&/g, "&amp;"),
        fragments = requestUrl.fragments,
        decodedFragments = requestUrl.decodedFragments,
        numFragments = fragments.length,
        requestTypeIndex, requestType
    ;
    requestTypeIndex = (numFragments === 2) && (fragments[1] === "") ? 1 : numFragments;
    requestType = discoverRequestTypes[requestTypeIndex];
    n = xmlaRowset.fieldCount();
    for (i = 0; i < n; i++) {
        fieldName = xmlaRowset.fieldName(i);
        if (fieldName === requestType.key) keyIndex = i;
        thead += "<th>" + xmlaRowset.fieldDef(fieldName).label + "</th>";
    }
    links = (numFragments === 2) && (fragments[1] === "") ? "" : fragments.join("/");
    while (row = xmlaRowset.fetchAsArray()) {
        if (keyIndex!==-1) {
            keyValue = row[keyIndex];
            row[keyIndex] = "<a rel=\"next\"" +
                              " title=\"" + discoverRequestTypes[numFragments + 1].name + "\"" +
                              " href=\"" + links + "/" + encodeURIComponent(keyValue) + search + "\">" +
                              keyValue +
                              "</a>"
            ;
        }
        tbody += "<tr>\n<td>" + row.join("</td>\n<td>") + "</td>\n</tr>";
    }
    links = "";
    for (i = 2; i <= numFragments; i++) {
        links += "\n<li><a title=\"" + discoverRequestTypes[i].name + "\"" +
                   " href=\"" + fragments.slice(0, i).join("/") + search + "\">" +
                 decodedFragments[i-1] +
                 "</a></li>"
        ;
    }
    links = "<ul><li><a title=\"" + discoverRequestTypes[1].name + "\" rel=\"prev\" href=\"/" + search + "\">/</a></li>" + links + "</ul>";
    return {
        title: requestType.name,
        heading: requestType.name,
        links: links,
        data: [
          "<table border=\"1\">",
            "<caption>",
            "</caption>",
            "<thead>",
              "<tr>",
                thead,
              "</tr>",
            "</thead>",
            "<tbody>",
              tbody,
            "</tbody>",
          "</table>"
        ].join("\n")
    };
}

function toHtml(xmla, xmlaRequest, xmlaResponse, requestUrl){
    var rendition;
    switch (xmlaRequest.method) {
        case X.METHOD_EXECUTE:
            heading = xmlaRequest.method;
            break;
        case X.METHOD_DISCOVER:
            rendition = discoverRowsetToHtml(xmla, xmlaRequest, xmlaResponse, requestUrl);
            break;
        default:
            throw "Invalid method " + xmlaRequest.method;
    }
    var html = [
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">",
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">",
          "<head>",
            "<meta http-equiv=\"content-type\" content=\"application/xhtml+xml;charset=UTF-8\" />",
            "<title>",
              rendition.title,
            "</title>",
            "<style type=\"text/css\">",
            "td {white-space:nowrap;}",
            "ul {margin: 0; padding: 0;}",
            "ul li {display: inline;}",
            "ul li:before {content: \"\\0020 \\00BB \\0020\";}",
            "</style>",
          "</head>",
          "<body>",
            rendition.links,
            "<h1>",
              rendition.heading,
            "</h1>",
            rendition.data,
          "</body>",
        "</html>"
    ];
    return html.join("\r\n");
}

function toXml(xmla, xmlaRequest, xmlaResponse, requestUrl){
    return xmla.responseText;
}

function toJson(xmla, xmlaRequest, xmlaResponse, requestUrl){
    var obj;
    switch (xmlaRequest.method) {
        case X.METHOD_EXECUTE:
            obj = xmlaResponse.fetchAsObject();
            break;
        case X.METHOD_DISCOVER:
            obj = xmlaResponse.fetchAllAsObject();
            break;
        default:
            throw "Invalid method " + xmlaRequest.method;
    }
    return JSON.stringify(obj);
}

function toJavaScript(xmla, xmlaRequest, xmlaResponse, requestUrl){
    var json = toJson(xmla, xmlaRequest, xmlaResponse, requestUrl),
        callback = requestUrl.query["callback"] || "callback"
    ;
    return callback + "(" + json + ")";
}

function httpError(response, errorCode, message){
    response.writeHead(errorCode, message, {"Content-Type": "text/plain"});
    if (message) response.write(message);
    response.end();
}

function decodeFragments(fragments) {
    var decodedFragments = [], i, n = fragments.length;
    for (i = 0; i < n; i++) {
        decodedFragments.push(decodeURIComponent(fragments[i]));
    }
    return decodedFragments;
}

function getOutputHandler(request, requestUrl, response){
    var accept = request.headers["accept"],
        i, n, outputHandler,
        contentType,
        outputHandlers = ({
            "text/csv": toCsv,
            "text/plain": toCsv,
            "text/html": toHtml,
            "application/xhtml+xml": toHtml,
            "text/xml": toXml,
            "application/xml": toXml,
            "text/json": toJson,
            "application/json": toJson,
            "text/javascript": toJavaScript,
            "application/javascript": toJavaScript
        })
    ;
    if (requestUrl.query.format && outputHandlers[requestUrl.query.format]) {
        contentType = requestUrl.query.format;
    }
    else
    if (accept) {
        accept = accept.split(";")[0].split(",");
        n = accept.length;
        for (i = 0; i < n; i++){
            contentType = accept[i];
            if (outputHandlers[contentType]) {
                response.setHeader("Vary", "Accept");
                break;
            }
        }
    }
    if (outputHandler = outputHandlers[contentType]) {
        response.setHeader("Content-Type", contentType);
    }
    return outputHandler;
}

http.createServer(function (request, response) {
    //Check http method
    var httpMethod = request.method;
    if (!({
        "GET": true,
        "HEAD": true
    })[httpMethod]) {
        httpError(response, 405, "Method must be GET or HEAD");
        return;
    }

    //Analyze request
    var requestUrl = url.parse(request.url, true),
        query = requestUrl.query,
        xmlaUrl = query.url,
        outputHandler
    ;
    if (typeof(xmlaUrl) === "undefined") {
        httpError(response, 400, "Missing parameter \"url\"");
        return;
    }

    outputHandler = getOutputHandler(request, requestUrl, response);

    if (typeof(outputHandler)!=="function") {
        httpError(response, 406);
        return;
    }

    console.log("\nnode Request url:");
    console.log(requestUrl);

    //Everything looking good so far
    response.writeHead(200);

    //Map the path of the original request url to a xmla request
    var fragments = requestUrl.pathname.split("/"),
        decodedFragments = decodeFragments(fragments),
        numFragments = fragments.length
        properties = {},
        restrictions = {},
        discoverRequestType = discoverRequestTypes[numFragments],
        xmlaRequest = {
            async: true,
            url: xmlaUrl,
            success: function(xmla, xmlaRequest, xmlaResponse) {
                //It worked, call the content handler to write the data to the response
                console.log("\nResponse:");
                console.log(xmla.responseText);
                var output = outputHandler.call(null, xmla, xmlaRequest, xmlaResponse, requestUrl);
                response.write(output);
            },
            error: function(xmla, xmlaRequest, exception) {
                //It failed, lets write the error to the response.
                console.log("error");
                console.log(exception.message);
                console.log(xmla.responseText);
                response.write("error!!");
            },
            callback: function(){
                //callback gets always called after either success or error,
                //use it to conclude the response.
                response.end();
            }
        }
    ;
    requestUrl.fragments = fragments;
    requestUrl.decodedFragments = decodedFragments;
    switch (numFragments) {
        case 8:
            restrictions[discoverRequestTypes[7].key] = decodedFragments[7];
        case 7:
            restrictions[discoverRequestTypes[6].key] = decodedFragments[6];
        case 6:
            restrictions[discoverRequestTypes[5].key] = decodedFragments[5];
        case 5:
            restrictions[discoverRequestTypes[4].key] = decodedFragments[4];
        case 4:
            if (numFragments === 4) {
                //check if we need to output cube metadata or a mdx query result
                if (typeof(query.mdx) !== "undefined") {
                    xmlaRequest.method = X.METHOD_EXECUTE;
                    xmlaRequest.statement = query.mdx;
                    properties[X.PROP_FORMAT] = query.resultformat || (contentType === "text/csv" ? Xmla.PROP_FORMAT_TABULAR : X.PROP_FORMAT_MULTIDIMENSIONAL)
                }
            }
            restrictions[discoverRequestTypes[3].key] = properties[discoverRequestTypes[3].property] = decodedFragments[3];
        case 3:
            restrictions[discoverRequestTypes[2].key] = properties[discoverRequestTypes[2].property] = decodedFragments[2];
            xmlaRequest.restrictions = restrictions;
        case 2:
            //check if we need to output datasoures or catalog metadata for a particular datasource
            if (fragments[1] !== "") {
                properties[discoverRequestTypes[1].property] = decodedFragments[1];
                xmlaRequest.properties = properties;
            }
            if (!xmlaRequest.method) {
                xmlaRequest.method = X.METHOD_DISCOVER;
                if (fragments[1] === "") {
                    xmlaRequest.requestType = X.DISCOVER_DATASOURCES;
                }
                else {
                    xmlaRequest.requestType = discoverRequestType.name;
                    xmlaRequest.restrictions = restrictions;
                }
            }
    }

    //do the xmla request, log the messages
    var x = new xmla.Xmla();
    console.log("\nxmla4js Request:");
    console.log(xmlaRequest);
    x.request(xmlaRequest);
    console.log("\nSOAP message:");
    console.log(x.soapMessage);
}).listen(port);

console.log('Server running at http://127.0.0.1:8124/');