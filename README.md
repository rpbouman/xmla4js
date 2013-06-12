xmla4js
=======

Xmla4js is a standalone javascript library that provides basic XML for Analysis (XML/A) capabilities, allowing javascript developers to access data and metadata from OLAP provides for use in rich (web) applications. Xmla4js can be used inside a webpage or in a server environment like node.js

XML/A is an industry standard protocol to communicate with OLAP servers over HTTP. It defines a SOAP webservice that allows clients to obtain metadata and to execute MDX (multi-dimensional expressions) queries. XML is used as the data exchange format.

Xmla4js handles all details of the SOAP protocol by offering a comprehensive JavaScript API. However, Xmla4js still allows you complete control over the request and response. Xmla4js does not unnecessarily lock down or abstract away the XML/A semantics itself.

Features
========
XMLa4js support synchronous as well as asynchronous requests, and offers access to the response through a javascrip API, DOMDocument, and raw XML. The objective is to offer maximum flexibility to XML/A web clients while making normal tasks easy, and hard things doable.

Currently, Xmla4js does not offer any abstraction of the MDX queries. You need to be familiar with MDX and multidimensional data sets to build meaningful applications on top of XML/A. But you won't need to forge XML SOAP messages and handle server communication and javascript to XML marshalling/demarshalling - that's what Xmla4js is for.

Developer resources
===================
For effective usage of Xmla4js, some background knowledge of the XML/A protocol is recommended, but not required. A growing set of samples (including a dynamic pivot table with drillup/drilldown and a YUI charts integration example) makes Xmla4js accessible to web developers that lack XML/A background knowledge.

![Pivot Table Small](https://raw.github.com/latinojoel/xmla4js/master/samples/pivot-table-small.png)
![YUI Chart Wizard Small](https://raw.github.com/latinojoel/xmla4js/master/samples/yui-chart-wizard-small.png)

For more advanced scenario's, full API documentation is available based on the the YUI Doc system.
