/**
  Copyright 2014 Roland Bouman

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
(function (){

wsh = {};

wsh.WebShell = function(config){
    this.setConfig(config);
    this.hasFocus = false;
    this.insert = true;     //insert or overwrite mode
    this.lineLen = 0;
    this.lineNr = 0;
    this.colNr = 0;
    this.enabled =  true;
    this.eventQueue = [];
    this.caretInterval = null;  //this holds the id of the setInterval that makes the caret blink.
    this.listeners = {
        afteraddline: [],
        afterconfigure: [],
        afterkeydown: [],
        afterkeypress: [],
        afterrender: [],
        beforeaddline: [],
        beforeconfigure: [],
        beforekeydown: [],
        beforekeypress: [],
        beforerender: [],
        blur: [],
        enterline: [],
        focus: [],
    };
    this.dom = {};
};

//see http://blog.pothoven.net/2008/05/keydown-vs-keypress-in-javascript.html?keystrokes=
wsh.WebShell.defaultNonCharKeyHandlers = {
    "8":    function() {   //backspace
                var line = this.dom.line,
                    html = this.getLineText(line);
                if (this.lineLen) {
                    if (this.colNr) {
                        var tail = html.slice(this.colNr);
                        this.setLineText(
                            line,
                            html.slice(0, --this.colNr) +
                            tail
                        );
                    }
                }
            },
    "9":    true,          //tab
    "13":   function(){
                this.fireEvent("enterline", this.getLineText(this.dom.line));
                this.createLine(this.config.prompt);
            },
    "35":   function(){   //end
                this.colNr = this.lineLen;
            },
    "36":   function(){   //begin
                this.colNr = 0;
            },
    "37":   function(){ //left arrow
                if (this.colNr) {
                    this.colNr--;
                }
            },
    "39":   function(){   //right arrow
                if (this.colNr<this.lineLen){
                    this.colNr++;
                }
            },
    "38":   function(){ //arrow up
                var historyLine = this.dom.historyLine.previousSibling;
                if (!historyLine || historyLine===this.dom.line){
                    return;
                }
                this.dom.historyLine = historyLine;
                var text = this.getLineText(historyLine);
                this.setLineText(this.dom.line, text);
                this.colNr = this.lineLen;
            },
    "40":   function(){ //arrow down
                var historyLine = this.dom.historyLine.nextSibling;
                if (!historyLine || historyLine===this.dom.line){
                    return;
                }
                this.dom.historyLine = historyLine;
                var text = this.getLineText(historyLine);
                this.setLineText(this.dom.line, text);
                this.colNr = this.lineLen;
            },
    "45":   function(){ //insert
                this.insert = !this.insert;
                this.dom.caret.style.backgroundColor = this.insert ? this.config.bgCol : this.config.col;
            },
    "46":   function(){ //delete
                var line = this.dom.line,
                    html = this.getLineText(line);
                if (this.colNr < this.lineLen) {
                    this.setLineText(
                        line,
                        html.slice(0, this.colNr) +
                        html.slice(this.colNr + 1)
                    );
                }
            }
};

wsh.WebShell.defaultConfig = {
    el: document.body,
    bgCol: "black",
    col: "white",
    fontFamily: "monospace",
    prompt: "",
    caret: "_",
    fontSize: 16,
    blinkInterval: 500,
    nonCharKeyHandlers: wsh.WebShell.defaultNonCharKeyHandlers,
    lines: ["Welcome to the webshell."],
    hasFocus: false,
    enabled: true
};

wsh.WebShell.prototype = {
    setEnabled: function(enabled){
        this.config.enabled = enabled;
        if (enabled) {
            this.applyEvents();
        }
    },
    isEnabled: function(){
        return this.config.enabled;
    },
    queueEvent: function(evt) {
        this.eventQueue.push({
            type: evt.type,
            keyCode: evt.keyCode,
            charCode: evt.charCode
        });
    },
    applyEvents: function(){
        for (var i=0; i<this.eventQueue.length; i++){
            this.handleKeyEvent(this.eventQueue[i]);
        }
        this.eventQueue.length = 0;
    },
    makeListener: function(handler, scope, arg){
        return {
            handler: handler,
            scope: scope ? scope : window,
            arg: arg ? arg : null
        };
    },
    addListener: function(name, handler, scope, arg){
        var listeners = this.listeners[name];
        if (!listeners){
            throw "No such event";
        }
        listeners.push(this.makeListener(handler, scope, arg));
    },
    removeListener: function(name, handler, scope, arg){
        var listener, l = this.makeListener(handler, scope, arg)
        var listeners = this.listeners[name];
        if (!listeners){
            throw "No such event";
        }
        for (var i=0, numListeners = listeners.length; i<numListeners; i++){
            listener = listeners[i];
            if (listener.handler === l.handler &&
                listener.scope === l.scope &&
                listener.arg === l.arg
            ){
                this.listeners.name = listeners.splice(i,1);
                return true;
            }
        }
        return false;
    },
    fireEvent: function(name, data){
        var listeners = this.listeners[name],
            numListeners = listeners.length, i, listener;
        for (i=0; i<numListeners; i++){
            listener = listeners[i];
            if (listener.handler.call(listener.scope, name, this, data, listener.arg)===false){
                return false;
            }
        }
        return true;
    },
    render: function(){
        this.fireEvent("beforerender");
        var c = this.config,
            ed,
            me = this;
        ;
        switch(typeof(c.el)){
            case "string":
                ed = document.getElementById(c.el);
                break;
            case "object":
                ed = c.el;
                break;
            default:
                ed = wsh.WebShell.defaultConfig.el;
        }
        var id = ed.getAttribute("id");
        if (!id) {
            id = "wsh" + (Math.random()+"").slice(2);
            ed.setAttribute("id", id);
        }
        this.dom.editor = ed;

        var style = document.createElement("style");
        style.setAttribute("type", "text/css");
        this.dom.style = style;
        document.getElementsByTagName("head").item(0).appendChild(style);

        var textarea = this.dom.textarea = document.createElement("textarea");
        document.body.appendChild(textarea);
        var focusTextArea = function(){
            textarea.focus();
        };

        ed.onclick = focusTextArea;
        ed.onfocus = focusTextArea;
        textarea.onkeydown = function(e) {me.handleKeyEvent(e);};
        textarea.onkeypress = function(e) {me.handleKeyEvent(e);};
        textarea.onfocus = function(){
            me.fireEvent("focus");
            me.hasFocus = true;
        };
        textarea.onblur = function(){
            me.fireEvent("blur");
            me.hasFocus = false;
        };

        this.dom.linestart = document.createElement("span");
        this.dom.caret = document.createElement("span");
        this.dom.caret.className = "wshCaret";
        ed.appendChild(this.dom.caret);

        this.configure();
        this.createLine(this.config.lines);
        this.createLine(this.config.prompt);
        this.moveCaret();
        this.fireEvent("afterrender");
    },
    handleKeyEvent: function (e) {            //code taken from http://santrajan.blogspot.com/2007/03/cross-browser-keyboard-handler.html
        var evt = e || window.event, ch, handler;
        if (evt.type == "keydown") {
            ch = evt.keyCode;
            if  (
                (ch < 16) ||                     // non printables
                (ch > 16 && ch < 32) ||         // avoid shift
                (ch > 32 && ch < 41) ||         // navigation keys
                (ch > 44 && ch < 47) ||         // ins, Del
                (ch > 111 && ch < 124)               // function keys
            ){
                this.charKey = false;
                handler = this.handleNonCharKey;
            } else {
                this.charKey = true;
            }
        }
        else
        if (this.charKey) {                     // Already Handled on keydown
            ch = (evt.charCode) ? evt.charCode : evt.keyCode;
            if (ch > 31 && ch < 256) {          // safari and opera
                handler = this.handleCharKey;
            }
        }
        if (this.config.enabled){
            if (handler){
                handler.call(this, evt, ch);
            }
        }
        else  {
            this.queueEvent(evt);
        }
    },
    handleCharKey: function(evt, charCode){
        var ch = String.fromCharCode(charCode),
            line = this.dom.line,
            html = this.getLineText(line)
        ;
        this.setLineText(
            line,
            html.slice(0, this.colNr) + //piece before the caret
            ch +                        //character just typed
            html.slice(                 //piece after the caret
                this.colNr +            //starts at least here
                (this.insert ? 0 : 1)   //don't overwrite in insert mode
            )
        );
        //in insert mode, increase line length.
        //In overwrite mode, only increase line length when at end of line
        //this.lineLen += (this.insert ? 1 : (this.colNr===this.lineLen ? 1 : 0));
        this.colNr++;
        var me = this;
        var f = function(){
            me.moveCaret();
        };
        setTimeout(f, 0);
    },
    handleNonCharKey: function(evt, keyCode){
        var f = this.config.nonCharKeyHandlers[evt.keyCode.toString(10)];
        switch (typeof(f)){
            case "function":
                if (evt.preventDefault) {
                    evt.preventDefault();
                }
                if (evt.stopPropagation) {
                    evt.stopPropagation();
                }
                evt.cancelBubble = true;
                evt.returnValue = false;            // and stop it!
                f.call(this, evt);
                this.moveCaret();
                break;
            case "undefined":
            default:
        }
    },
    moveCaret: function moveCaret(){
        var caret = this.dom.caret, caretStyle = caret.style;
        var color = caretStyle.color;
        caretStyle.color = "black";
        caretStyle.left = ((((this.config.prompt.length + this.colNr)*this.config.fontSize)*(10/16)) + "px");
        if (this.dom.line){
            caretStyle.top = this.dom.line.offsetTop + 2 + "px";
            //this.dom.line.style.height = 17 + "pt";
        }
        caret.scrollIntoView(true);
        caretStyle.color = color;
    },
    setLineText: function(line, text){
        var textNode = document.createTextNode(text);
        //if there is text (lastChild), and the text is not the prompt (firstChild)
        if (line.lastChild && line.lastChild!==line.firstChild){
            line.removeChild(line.lastChild);
        }
        //if this is the current line, and there is already a prompt (firstChild)
        if (line===this.dom.line){
            var len = line.firstChild ? text.length : 0;
            this.lineLen =  len;
        }
        line.appendChild(textNode);
    },
    getLineText: function(line){
        if (line.lastChild && line.lastChild !==line.firstChild){
            return line.lastChild.data;
        }
        return "";
    },
    getLines: function(){
        return this.dom.editor.getElementsByTagName("div");
    },
    getLine: function(index){
        var line;
        if (typeof(index)==="undefined"){
            line = this.dom.line;
        }
        else {
            var lines = this.getLines();
            line = ines.item(index);
        }
        return line;
    },
    createLine: function(text){
        if (text instanceof Array) {
            for (var i=0; i<text.length; i++){
                this.createLine(text[i]);
            }
            return;
        }
        this.fireEvent("beforeaddline", text);
        var line = this.dom.historyLine = this.dom.line = document.createElement("div");
        var linestart = this.dom.linestart;
        line.appendChild(linestart);
        this.dom.editor.appendChild(line);
        line.removeChild(linestart);

        line.setAttribute("class", "wshLine");
        if (typeof(text)!=="undefined"){
            this.setLineText(line, text);
        }
        this.lineNr++;
        this.colNr = 0;
        this.moveCaret();
        this.fireEvent("afteraddline", text);
        window.scrollBy(-100, 0);
        return line;
    },
    getLineHeight: function(){
        return (typeof(this.config.lineHeight)==="undefined") ? this.config.fontSize : this.config.lineHeight;
    },
    focus: function(){
        this.dom.textarea.focus();
    },
    applyIf: function(obj, props){
        var p,v;
        for (p in props){
            v = obj[p];
            if (typeof(v)==="undefined" || v===null){
                obj[p] = props[p];
            }
        }
    },
    setConfig: function(config){
        var p,v, dc = wsh.WebShell.defaultConfig;
        if (!config){
            config = {};
        }
        this.applyIf(config, dc);
        this.config = config;
    },
    configure: function(conf){
        this.fireEvent("beforeconfigure", conf);
        if (typeof(conf)!=="undefined"){
            this.setConfig(conf);
        }
        var c = this.config,
            ed = this.dom.editor,
            edStyle = ed.style,
            caret = this.dom.caret,
            cStyle = caret.style,
            t = this.dom.textarea,
            tStyle = t.style,
            s = this.dom.style,
            me = this
        ;

        edStyle.position = "absolute";
        edStyle.fontFamily = c.fontFamily;
        edStyle.fontSize = c.fontSize + "px";
        edStyle.backgroundColor = c.bgCol;
        edStyle.color = c.col;
        edStyle.whiteSpace = "pre";
        edStyle.overflow = "auto";
        edStyle.zIndex = 1;

        tStyle.position = "absolute";
        tStyle.top = "-100px";
        tStyle.left = "-100px";

        var cssSelector = ".wshLine",
            cssProperties = "height: " + this.getLineHeight() + "px !important;",
            rule = cssSelector + "{" + cssProperties + "}";
        if (s.sheet) {  //chrome, opera, firefox
            if (s.sheet.cssRules.length){
                s.sheet.deleteRule(0);
            }
            s.sheet.insertRule(rule, s.sheet.cssRules.length);
        }
        else
        if (s.styleSheet) { //IE
            if (s.styleSheet.rules.length){
                s.styleSheet.removeRule(0);
            }
            s.styleSheet.addRule(cssSelector, cssProperties);
        }
        else {  //desperate
            s.innerHTML = rule;
        }

        //this works around an issue in opera.
        //when you assign el.style.color = "white" and then evalutate el.style.color, opera returns #ffffff
        //this fucks op our caret blinking which relies on comparing the style color with the configer color.
        c.bgCol = edStyle.backgroundColor;
        c.col = edStyle.color

        caret.innerHTML = this.config.caret.slice(0,1);
        cStyle.position = "absolute";
        cStyle.height = this.getLineHeight();

        if (this.caretInterval){
            clearInterval(this.caretInterval);
        }
        this.caretInterval = setInterval(function(){
            cStyle.color = cStyle.color===c.col? c.bgCol : c.col;
            cStyle.backgroundColor = me.insert ? "" : cStyle.color===c.col? cStyle.color : "";
        }, c.blinkInterval);
        this.moveCaret();

        if (c.hasFocus) {
            this.focus();
        }
        this.fireEvent("afterconfigure", conf);
    }
};

})();
