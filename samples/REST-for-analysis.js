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
;
var window = {};

function toCsv(xmla, xmlaRequest, xmlaResponse, url){
}

function toHtml(xmla, xmlaRequest, xmlaResponse, url){
    var thead = "", tbody = "", i, n, row;
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

    function generateBreadCrumbs() {
        var prefix = url.protocol + url.auth + url.host;
    }

    var html = [
        "<!DOCTYPE html>",
        "<html>",
          "<head>",
            "<title></title>",
          "</head>",
          "<body>",
            "<h1>",
            "<a href=\"\">" +  +  "</a>",
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

function toXml(xmla, xmlaRequest, xmlaResponse, url){
    return xmla.responseText;
}

function toJson(xmla, xmlaRequest, xmlaResponse, url){
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

function toJavaScript(xmla, xmlaRequest, xmlaResponse, url){
    var json = toJson(xmla, xmlaRequest, xmlaResponse, url),
        callback = url.query["callback"] || "callback"
    ;
    return callback + "(" + json + ")";
}

function httpError(response, errorCode, message){
    response.writeHead(errorCode, {"Content-Type": "text/plain"});
    if (message) response.write(message);
    response.end();
}

http.createServer(function (request, response) {
  var httpMethod = request.method;
  if (!({
      "GET": true,
      "HEAD": true
  })[httpMethod]) {
      httpError(response, 405, "Method must be GET or HEAD");
      return;
  }

  var headers = request.headers,
      contentType = request.headers["Content-Type"] || "application/json",
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

  var requestUrl = url.parse(request.url, true);

  var query = requestUrl.query,
      xmlaUrl = query.url,
      fragments = requestUrl.pathname.split("/"),
      numFragments = fragments.length
  ;
  if (typeof(xmlaUrl) === "undefined") {
      httpError(response, 400, "Missing parameter \"url\"");
      return;
  }
  var x;

  response.writeHead(200, {"Content-Type": contentType});

  var xmlaRequest = {
          async: true,
          url: xmlaUrl,
          success: function(xmla, xmlaRequest, xmlaResponse) {
              console.log("\nResponse:");
              console.log(xmla.responseText);
              var output = outputHandler.call(null, xmla, xmlaRequest, xmlaResponse, requestUrl);
              response.write(output);
          },
          error: function(xmla, xmlaRequest, exception) {
              console.log("error");
              console.log(exception.message);
              console.log(xmla.responseText);
              response.write("error!!");
          },
          callback: function(){
              response.end();
          }
      },
      properties = {},
      restrictions = {},
      requestTypes = [
          null,
          X.DISCOVER_DATASOURCES,
          X.DBSCHEMA_CATALOGS,
          X.MDSCHEMA_CUBES,
          X.MDSCHEMA_DIMENSIONS,
          X.MDSCHEMA_HIERARCHIES,
          X.MDSCHEMA_LEVELS,
          X.MDSCHEMA_MEMBERS
      ]
  ;
  switch (numFragments) {
      case 7:
          restrictions["LEVEL_NUMBER"] = fragments[6];
      case 6:
          restrictions["HIERARCHY_UNIQUE_NAME"] = fragments[5];
      case 5:
          restrictions["DIMENSION_UNIQUE_NAME"] = fragments[4];
      case 4:
          if (numFragments === 4) {
              if (typeof(query.mdx) !== "undefined") {
                  xmlaRequest.method = X.METHOD_EXECUTE;
                  xmlaRequest.statement = query.mdx;
                  properties[X.PROP_FORMAT] = query.format || (contentType === "text/csv" ? Xmla.PROP_FORMAT_TABULAR : X.PROP_FORMAT_MULTIDIMENSIONAL)
              }
          }
          properties[X.PROP_CUBE] = restrictions["CUBE_NAME"] = fragments[3];
      case 3:
          restrictions["CATALOG_NAME"] = properties[X.PROP_CATALOG] = fragments[2];
          xmlaRequest.restrictions = restrictions;
      case 2:
          if (fragments[1] !== "") properties[X.PROP_DATASOURCEINFO] = fragments[1];
          xmlaRequest.properties = properties;
          if (!xmlaRequest.method) {
              xmlaRequest.restrictions = restrictions;
              xmlaRequest.method = X.METHOD_DISCOVER;
              xmlaRequest.requestType = (fragments[1] === "") ? X.DISCOVER_DATASOURCES : requestTypes[numFragments];
          }
  }

  x = new xmla.Xmla();
  console.log("\nRequest:");
  console.log(xmlaRequest);
  x.request(xmlaRequest);
  console.log("\nSOAP message:");
  console.log(x.soapMessage);
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');
