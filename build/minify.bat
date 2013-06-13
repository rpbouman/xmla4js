REM  
REM script: minify.bat
REM description: minifies Xmla.js using the YAHOO YUI compressor. 
REM see: http://developer.yahoo.com/yui/compressor/
REM 

REM Set the XMLA_HOME variable to the directory to which you checked out the xmla4js project directory 
SET XMLA_HOME="D:\Projects\xmla4js"

REM set the YUI_COMPRESSOR variable to the location of the YUI compressor jar file.
SET YUI_COMPRESSOR="D:\Applications\yui\yuicompressor-2.4.2\build\yuicompressor-2.4.2.jar"

java -jar "%YUI_COMPRESSOR%" "%XMLA_HOME%/src/Xmla.js" -o "%XMLA_HOME%/js/Xmla-min.js" --charset utf-8 