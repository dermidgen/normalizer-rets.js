/**
 * RETSr.io rets.js RETS Client
 * @module RETS
 * @license MIT
 * @author Danny Graham
 *
 * @see {@link http://usejsdoc.org/}
 *
 */

var debug = require('debug')('rets.js:bodyparse');
var RETSError = require('./error');

var bufferTag = null;

function noop(){}

function buffer(tag) {
     bufferTag = tag;
}
function clearBuffer(tagName) {
     bufferTag = null;
}

var bodyparser = {};
bodyparser.open = {
    "RETS": function(tag){
          this.replyCode = tag.attributes.REPLYCODE;
          this.replyText = tag.attributes.REPLYTEXT;

          if (this.replyCode !== '0') {
               this.emit('error', new RETSError(this.replyCode));
          }
    },
    "RETS-RESPONSE": buffer,
    "RETS-STATUS": noop,
    "COLUMNS": buffer,
    "COUNT": function(tag){
          this.count = tag.attributes.RECORDS;
          // debug('discovered %s records', this.count);
    },
    "DATA": buffer,
    "DELIMITER": noop,
    "MAXROWS": function(tag){
          // debug('maxrows hit at record %s of %s records',this.records, this.count);
    },
};

bodyparser.close = {
    "RETS": noop,
    "RETS-RESPONSE": clearBuffer,
    "RETS-STATUS": noop,
    "COLUMNS": clearBuffer,
    "COUNT": noop,
    "DATA": clearBuffer,
    "DELIMITER": noop,
    "MAXROWS": noop,
};

bodyparser.text = function(text) {
    if (bufferTag === null) return;

    var self = this;
    switch(bufferTag.name) {
          case "RETS-RESPONSE":
             /**
              * key-value-body
              * ::= <RETS-RESPONSE>CRLF
              * *(key = value CRLF)
              *  </RETS-RESPONSE>
              */
               var lines = text.split("\n");
               lines.forEach(function(line){

                    var split   =  line.split( '=' );
                    var key     =  split[0].replace(/^\s+|\s+$/g, '' );
                    var value   =  split[1].replace(/^\s+|\s+$/g, '' );
                    if (/^\//.test(value)) { //todo: test for FQDN URLs vs site-root relative links
                         self.emit('capability', key, value);
                    } else {
                         self.emit('setting', key, value);
                    }
               });

          break;
          case "COLUMNS":
               this.columns = text.split("\t");
               self.emit('columns', this.columns);
          break;
          case "DATA":
               var record = text.split("\t");
               this.records++;
               // debug(record);
          break;
    }
};


module.exports = bodyparser;