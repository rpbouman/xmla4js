REM Set the XMLA_HOME variable to the directory to which you checked out the xmla4js project directory 
SET XMLA_HOME="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js"

REM The location of your yuidoc install
SET yuidoc_home="D:\Applications\yui\yuidoc_1.0.0b1"

REM The location of the files to parse.  Parses subdirectories, but will fail if
REM there are duplicate file names in these directories.  You can specify multiple
REM source trees:
REM      SET parser_in="c:\home\www\yahoo.dev\src\js c:\home\www\Event.dev\src"
SET parser_in="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js\src"

REM The location to output the parser data.  This output is a file containing a 
REM json string, and copies of the parsed files.
SET parser_out="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js\doc\api"

REM The directory to put the html file outputted by the generator
SET generator_out="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js\doc\api"

REM The location of the template files.  Any subdirectories here will be copied
REM verbatim to the destination directory.
SET template="%yuidoc_home%\template"

REM The project version that will be displayed in the documentation.
SET version="r12"

REM The version of YUI the project uses.
SET yuiversion="2"

%yuidoc_home%\bin\yuidoc.py %parser_in% -p %parser_out% -o %generator_out% -t %template% -v %version%

