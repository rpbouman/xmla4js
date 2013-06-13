REM
REM script: api-docs.bat
REM purpose: generates API documentation using YUI Doc
REM see: http://developer.yahoo.com/yui/yuidoc/
REM

REM Set the XMLA_HOME variable to the directory to which you checked out the xmla4js project directory 
SET XMLA_HOME=D:\Projects\xmla4js

REM Set the projectname variable 
SET projectname=xmla4js

REM Set the project url variable
SET projecturl=http://code.google.com/p/xmla4js/

REM The location of your yuidoc install
SET yuidoc_home=D:\Applications\yui\yuidoc_1.0.0b1

REM The location of the files to parse.  Parses subdirectories, but will fail if
REM there are duplicate file names in these directories.  You can specify multiple
REM source trees:
REM      SET parser_in="c:\home\www\yahoo.dev\src\js c:\home\www\Event.dev\src"
SET parser_in=%XMLA_HOME%\src

REM The location to output the parser data.  This output is a file containing a 
REM json string, and copies of the parsed files.
SET parser_out=D:\tmp\xmla4js_apidoc

REM The directory to put the html file outputted by the generator
SET generator_out=D:\tmp\xmla4js_apidoc

REM The location of the template files.  Any subdirectories here will be copied
REM verbatim to the destination directory.
SET template=%XMLA_HOME%\build\yuidoc-template

REM The project version that will be displayed in the documentation.
SET version="r85"

REM The version of YUI the project uses.
SET yuiversion="2"

rmdir /S /Q %parser_out%
mkdir %parser_out%

%yuidoc_home%\bin\yuidoc.py %parser_in% -p %parser_out% -o %generator_out% -t %template% -v %version% -m %projectname% -u %projecturl%

copy /Y %parser_out%\* %XMLA_HOME%\doc\api
copy /Y %parser_out%\assets\* %XMLA_HOME%\doc\api\assets
