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
var http = require("http"),
    url = require("url"),
    xmla = require('../src/Xmla.js'),
    X = xmla.Xmla
    discoverRequestTypes = [
        null,
        {name: X.DISCOVER_DATASOURCES, key: "DataSourceName", property: X.PROP_DATASOURCEINFO},
        {name: X.DBSCHEMA_CATALOGS, key: "CATALOG_NAME", property: X.PROP_CATALOG},
        {name: X.MDSCHEMA_CUBES, key: "CUBE_NAME", property: X.PROP_CUBE},
        {name: X.MDSCHEMA_DIMENSIONS, key: "DIMENSION_UNIQUE_NAME"},
        {name: X.MDSCHEMA_HIERARCHIES, key: "HIERARCHY_UNIQUE_NAME"},
        {name: X.MDSCHEMA_LEVELS, key: "LEVEL_NUMBER"},
        {name: X.MDSCHEMA_MEMBERS}
    ]
;

function toCsv(xmla, xmlaRequest, xmlaResponse, requestUrl){
}

function toHtml(xmla, xmlaRequest, xmlaResponse, requestUrl){
    var thead = "", tbody = "", i, n, row, href;
    href = url.protocol + "//" + url.hostname;
    switch (xmlaRequest.method) {
        case X.METHOD_EXECUTE:
            break;
        case X.METHOD_DISCOVER:
            n = xmlaResponse.fieldCount();
            for (i = 0; i < n; i++) {
                thead += "<th>" + xmlaResponse.fieldDef(xmlaResponse.fieldName(i)).label + "</th>";
            }
            while (row = xmlaResponse.fetchAsArray()) {
                tbody += "<tr><td>" + row.join("</td><td>") + "</td></tr>";
                xmlaResponse.next();
            }
            break;
        default:
            throw "Invalid method " + xmlaRequest.method;
    }

    var html = [
        "<!DOCTYPE html>",
        "<html>",
          "<head>",
            "<title></title>",
          "</head>",
          "<body>",
            "<h1>",
            "<a href=\"" + href + "\">" + href +  "</a>",
            "</h1>",
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
            "</table>",
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
    response.writeHead(errorCode, {"Content-Type": "text/plain"});
    if (message) response.write(message);
    response.end();
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

    //Check content type and find an appropriate handler
    var headers = request.headers,
        contentType = request.headers["Content-Type"] || "text/html",
        outputHandler = ({
            "text/csv": toCsv,
            "text/plain": toCsv,
            "text/html": toHtml,
            "text/xml": toXml,
            "application/xml": toXml,
            "text/json": toJson,
            "application/json": toJson,
            "text/javascript": toJavaScript,
            "application/javascript": toJavaScript
        })[contentType]
    ;

    if (typeof(outputHandler)!=="function") {
        httpError(response, 406);
        return;
    }

    //Analyze request
    var requestUrl = url.parse(request.url, true);
    console.log("\nnode Request url:");
    console.log(requestUrl);

    var query = requestUrl.query,
        xmlaUrl = query.url,
        fragments = requestUrl.pathname.split("/"),
        numFragments = fragments.length
    ;
    requestUrl.fragments = fragments;
    if (typeof(xmlaUrl) === "undefined") {
        httpError(response, 400, "Missing parameter \"url\"");
        return;
    }

    //Everything looking good so far, commit to requested content type
    response.writeHead(200, {"Content-Type": contentType});

    //Set up a xmla4js request.
    var xmlaRequest = {
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
        },
        properties = {},
        restrictions = {},
        discoverRequestType = discoverRequestTypes[numFragments]
    ;

    //Map the path of the original request url to a xmla request
    switch (numFragments) {
        case 7:
            restrictions[discoverRequestTypes[6].key] = fragments[6];
        case 6:
            restrictions[discoverRequestTypes[5].key] = fragments[5];
        case 5:
            restrictions[discoverRequestTypes[4].key] = fragments[4];
        case 4:
            if (numFragments === 4) {
                //check if we need to output cube metadata or a mdx query result
                if (typeof(query.mdx) !== "undefined") {
                    xmlaRequest.method = X.METHOD_EXECUTE;
                    xmlaRequest.statement = query.mdx;
                    properties[X.PROP_FORMAT] = query.format || (contentType === "text/csv" ? Xmla.PROP_FORMAT_TABULAR : X.PROP_FORMAT_MULTIDIMENSIONAL)
                }
            }
            restrictions[discoverRequestTypes[3].key] = properties[discoverRequestTypes[3].property] = fragments[3];
        case 3:
            restrictions[discoverRequestTypes[2].key] = properties[discoverRequestTypes[2].property] = fragments[2];
            xmlaRequest.restrictions = restrictions;
        case 2:
            //check if we need to output datasoures or catalog metadata for a particular datasource
            if (fragments[1] !== "") {
                properties[discoverRequestTypes[1].property] = fragments[1];
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
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');
