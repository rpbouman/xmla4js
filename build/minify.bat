SET XMLA_HOME="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js"

SET YUI_COMPRESSOR="D:\Applications\yui\yuicompressor-2.4.2\build\yuicompressor-2.4.2.jar"

java -jar "%YUI_COMPRESSOR%" "%XMLA_HOME%/js/Xmla.js" -o "%XMLA_HOME%/js/Xmla-min.js" --charset utf-8 