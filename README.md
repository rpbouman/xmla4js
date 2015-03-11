xmla4js
=======

Xmla4js is a standalone javascript library that provides basic XML for Analysis (XML/A) capabilities, allowing javascript developers to access data and metadata from OLAP provides for use in rich (web) applications.

xmla4js is XML/A for javascript
===============================
XML/A is an industry standard protocol to communicate with OLAP servers over HTTP. It defines a SOAP webservice that allows clients to obtain metadata and to execute MDX (multi-dimensional expressions) queries. XML is used as the data exchange format.

Xmla4js handles all details of the SOAP protocol by offering a comprehensive JavaScript API. However, Xmla4js still allows you complete control over the request and response. Xmla4js does not unnecessarily lock down or abstract away the XML/A semantics itself.

Xmla4js can be used inside any webbrowser that supports javascript, or in a server environment like node.js

Features
========
XMLa4js support synchronous as well as asynchronous requests, and offers access to the response through a javascrip API, DOMDocument, and raw XML. The objective is to offer maximum flexibility to XML/A web clients while making normal tasks easy, and hard things doable.

Currently, Xmla4js does not offer any abstraction of the MDX queries. You need to be familiar with MDX and multidimensional data sets to build meaningful applications on top of XML/A. But you won't need to forge XML SOAP messages and handle server communication and javascript to XML marshalling/demarshalling - that's what Xmla4js is for.

Developer resources
===================
For effective usage of Xmla4js, some background knowledge of the XML/A protocol is recommended, but not required. A growing set of samples (including a dynamic pivot table with drillup/drilldown and a YUI charts integration example) makes Xmla4js accessible to web developers that lack XML/A background knowledge.

![Pivot Table Small](https://raw.github.com/latinojoel/xmla4js/master/samples/pivot-table-small.png)
![YUI Chart Wizard Small](https://raw.github.com/latinojoel/xmla4js/master/samples/yui-chart-wizard-small.png)

API documentation
=================
For more advanced scenario's, full API documentation is available based on the the YUI Doc system. You can find the documentation in the doc/api directory/index.html.

Notice
======
This project used to live on google code here: https://code.google.com/p/xmla4js/
As part of the move to github, the license changed from LGPL 3.0 to Apache 2.0
Should you be using an older, LGPL 3.0 licensed version of the code and you would like to use an Apache 2.0 licensed version then I would encourage you to use the newer version from github. This version is AFAIK functionally completely backwards compatible with the old version from google code. If you would like me to grant you the Apache 2.0  license for the older versions, please email me at roland.bouman@gmail.com.
