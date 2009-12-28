SET CLOSURE_COMPILER="D:\Applications\closure-compiler\compiler-latest\compiler.jar"
SET XMLA_HOME="D:\Servers\biserver-ce-3.5.0.stable\biserver-ce\tomcat\webapps\xmla4js"

java -jar "%CLOSURE_COMPILER%" --js "%XMLA_HOME%/js/Xmla.js" --js_output_file "%XMLA_HOME%/js/Xmla-compiled.js