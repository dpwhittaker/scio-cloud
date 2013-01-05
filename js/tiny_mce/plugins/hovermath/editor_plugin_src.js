/**
 * ASCIIMath Plugin for TinyMCE editor
 *   port of ASCIIMath plugin for HTMLArea written by 
 *   David Lippman & Peter Jipsen
 *
 * @author David Lippman
 * @copyright Copyright © 2008 David Lippman.
 *
 * Plugin format based on code that is:
 * @copyright Copyright © 2004-2008, Moxiecode Systems AB, All rights reserved.
 */

(function() {
	// Load plugin specific language pack
	tinymce.PluginManager.requireLangPack('hovermath');

	tinymce.create('tinymce.plugins.HovermathPlugin', {
		/**
		 * Initializes the plugin, this will be executed after the plugin has been created.
		 * This call is done before the editor instance has finished it's initialization so use the onInit event
		 * of the editor instance to intercept that event.
		 *
		 * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
		 * @param {string} url Absolute URL to where the plugin is located.
		 */
		init : function(ed, url) {
			var t = this;
			
			ed.onInit.add(function() {
				var doc = ed.contentDocument;
				var head = doc.getElementsByTagName('head')[0];
				
				var config = doc.createElement('script');
				config.type = 'text/x-mathjax-config';
				config[(window.opera ? "innerHTML" : "text")] = 'MathJax.Hub.Config({showProcessingMessages: false});';
				head.appendChild(config);
				
				var script = doc.createElement('script');
				script.src = '/js/mathjax/MathJax.js?config=AM_HTML';
				script.type = 'text/javascript';
				head.appendChild(script);
				
				script = doc.createElement('script');
				script.src = url + '/js/iframe.js';
				script.type = 'text/javascript';
				head.appendChild(script);
				
				ed.contentWindow.onload = function() {
					ed.contentWindow.init(ed);
				}
			});
			
			// Register the command so that it can be invoked by using tinyMCE.activeEditor.execCommand('mceAsciimath');
			ed.addCommand('mceAsciimath', function(ui, val) {
				ed.contentWindow.createJax(val);
			});
			
			ed.addCommand('mceAsciimathDlg', function() {
				ed.windowManager.open({
					file : url + '/amcharmap.htm',
					width : 630 + parseInt(ed.getLang('asciimathdlg.delta_width', 0)),
					height : 390 + parseInt(ed.getLang('asciimathdlg.delta_height', 0)),
					inline : 1
				});
				
			});
			
			ed.onKeyUp.add(function(ed, ev) {
				ed.contentWindow.updateJax();
			});
			
			// Register asciimath button
			ed.addButton('asciimath', {
				title : 'asciimath.desc',
				cmd : 'mceAsciimath',
				image : url + '/img/ed_mathformula2.gif'
			});
			
			ed.addButton('asciimathcharmap', {
				title : 'asciimathcharmap.desc',
				cmd : 'mceAsciimathDlg',
				image : url + '/img/ed_mathformula.gif'
			});

			ed.onPreProcess.add(function(ed,o) {
				if (o.get) {
					AMtags = ed.dom.select('span.AM', o.node);
					for (var i=0; i<AMtags.length; i++) {
						t.math2ascii(AMtags[i]); 
					}
					AMtags = ed.dom.select('span.AMedit', o.node);
					for (var i=0; i<AMtags.length; i++) {
						var myAM = AMtags[i].innerHTML;
						myAM = "`"+myAM.replace(/\`/g,"")+"`";
						AMtags[i].innerHTML = myAM;
						AMtags[i].className = "AM";
					}
				} 
				
				
			});

			
			ed.onLoadContent.add(function(ed,o) {
					AMtags = ed.dom.select('span.AM');
					for (var i=0; i<AMtags.length; i++) {
						t.nodeToAM(AMtags[i]);
					}
					t.loaded = true;
			});
			ed.onSetContent.add(function(ed,o) {
				if (t.loaded) {
					AMtags = ed.dom.select('span.AM');
					for (var i=0; i<AMtags.length; i++) {
						t.nodeToAM(AMtags[i]);
					}
				}
			});
			
			
			ed.onBeforeSetContent.add(function(ed,o) {
				o.content = o.content.replace(/(<span[^>]+AM.*?<\/span>)</, "$1 <");
				
			});
			ed.onBeforeExecCommand.add(function(ed,cmd) {
				if (cmd != 'mceAsciimath' && cmd != 'mceAsciimathDlg') {
					AMtags = ed.dom.select('span.AM');
					for (var i=0; i<AMtags.length; i++) {
						t.math2ascii(AMtags[i]);
						AMtags[i].className = "AMedit";
					}
				}
			});
			
			ed.onExecCommand.add(function(ed,cmd) {
				if (cmd != 'mceAsciimath' && cmd != 'mceAsciimathDlg') {
					AMtags = ed.dom.select('span.AMedit');
					for (var i=0; i<AMtags.length; i++) {
						t.nodeToAM(AMtags[i]);
						AMtags[i].className = "AM";
					}
				}
			});
			
			ed.onNodeChange.add(function(ed, cm, e) {
				var doprocessnode = true;
				if (t.testAMclass(e)) {
					p = e;
				} else {
					p = ed.dom.getParent(e,t.testAMclass);
				}
				cm.setDisabled('charmap', p!=null);
				cm.setDisabled('sub', p!=null);
				cm.setDisabled('sup', p!=null);
				if (p != null) {
					if (t.lastAMnode == p) {
						doprocessnode = false;
					} else {
						t.math2ascii(p); 
						p.className = 'AMedit';
						if (t.lastAMnode != null) { 
							t.nodeToAM(t.lastAMnode); 
							t.lastAMnode.className = 'AM';
						}
						if (p.parentNode.lastChild==p) {
							//not working 
							//p.parentNode.appendChild(document.createTextNode(" "));
						}
						if (t.justinserted==null) {
							ed.selection.setCursorLocation(p,0);
						}
						t.lastAMnode = p;
						doprocessnode = false;
					}
				}
				if (doprocessnode && (t.lastAMnode != null)) { //if not in AM node, process last
				     if (t.lastAMnode.innerHTML.match(/`(&nbsp;|\s|\u00a0|&#160;)*`/) || t.lastAMnode.innerHTML.match(/^(&nbsp;|\s|\u00a0|&#160;)*$/)) {
					     p = t.lastAMnode.parentNode;
					     p.removeChild(t.lastAMnode);
				     } else {
					     t.nodeToAM(t.lastAMnode);  
					     t.lastAMnode.className = 'AM'; 
				     }
				     t.lastAMnode = null;
			       }
					
			});
			ed.onDeactivate.add(function(ed) {
				if (t.lastAMnode != null) {
				     if (t.lastAMnode.innerHTML.match(/`(&nbsp;|\s)*`/)|| t.lastAMnode.innerHTML.match(/^(&nbsp;|\s|\u00a0|&#160;)*$/)) {
					     p = t.lastAMnode.parentNode;
					     p.removeChild(t.lastAMnode);
				     } else {
					     t.nodeToAM(t.lastAMnode);  
					     t.lastAMnode.className = 'AM'; 
				     }
				     t.lastAMnode = null;
				}
			});
			
			

		},

		/**
		 * Returns information about the plugin as a name/value array.
		 * The current keys are longname, author, authorurl, infourl and version.
		 *
		 * @return {Object} Name/value array containing information about the plugin.
		 */
		getInfo : function() {
			return {
				longname : 'Asciimath plugin',
				author : 'David Lippman',
				authorurl : 'http://www.pierce.ctc.edu/dlippman',
				infourl : '',
				version : "1.0"
			};
		},
		
		math2ascii : function(el) {
			var myAM = el.innerHTML;
			if (myAM.indexOf("`") == -1) {
				myAM = myAM.replace(/.+<script type="math\/asciimath"[^>]*>(.*?)<\/script>/g,"$1");
				myAM = myAM.replace(/>/g,"&gt;");
				myAM = myAM.replace(/</g,"&lt;");
				myAM = "`"+myAM.replace(/\`/g,"")+"`";
				el.innerHTML = myAM;
			}
		},
		
		nodeToAM : function(outnode) {
			var myAM = outnode.innerHTML.replace(/\`/g,"");
			var doc = tinymce.activeEditor.contentDocument;
			var script = doc.createElement('script');
			script.type = 'math/asciimath';
			script[(window.opera ? "innerHTML" : "text")] = myAM;
			while(outnode.hasChildNodes() ){
				outnode.removeChild(outnode.lastChild);
			}
			outnode.appendChild(script);
			tinymce.activeEditor.contentWindow.MathJax.Hub.Typeset(script);
			
		}, 
		
		lastAMnode : null,
		loaded : false,
		preventAMrender : false,
		
		testAMclass : function(el) {
			if ((el.className == 'AM') || (el.className == 'AMedit')) {
				return true;
			} else {
				return false;
			}
		}
	});

	// Register plugin
	tinymce.PluginManager.add('hovermath', tinymce.plugins.HovermathPlugin);
})();
