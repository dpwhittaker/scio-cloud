var container, input, script, activeJax, ed, containerID = 0;

function init(editor) {
	ed = editor;
}

function createJax(val) {
	existing = ed.selection.getContent();
	if (val) existing = val;
	if (existing.indexOf('class="MJ"') > -1) return;

	//strip out all existing html tags.
	existing = existing.replace(/<([^>]*)>/g,"");
	existing = existing.replace(/&(.*?);/g,"$1");

	containerID += 1;
	container = 'MathJax-Container-' + containerID;
	ed.selection.setContent('<span id="' + container + '" class="MJ" style="display:inline-block;"><script type="math/asciimath">' + existing + '</script></span>');

	MathJax.Hub.Queue(["Typeset", MathJax.Hub, container, function() {beginEdit(container);}]);
}

function beginEdit(container) {
	var c = document.getElementById(container);
	activeJax = MathJax.Hub.getAllJax(c)[0];
	var e = document.createElement('div');
	e.id = 'MathJax-Edit';
	e.innerText = activeJax.SourceElement()[(window.opera ? "innerText" : "text")];
	e.style.border = '1px solid black';
	e.onkeyup = updateJax;
	c.appendChild(e);
	e.focus();
	updateJax();
}

function endEdit() {
	document.getElementById('MathJax-Edit').removeNode(true);
}

function updateJax() {
	if (!activeJax) return;
	if (event.keyCode == 13) {
		endEdit();
		return false;
	}
	var e = document.getElementById('MathJax-Edit');
	var c = document.getElementById(container);
	activeJax.Text(e.innerText);
}
