window.addEventListener('message', function (e) {
	let frame = document.getElementById('contentIframe');
	if (e.origin === "null" && e.source === frame.contentWindow) {
		frame.height = `${e.data}px`;
	}
});

function rerenderIframe(postContent) {
	let htmlClass = "";
	if (document.getElementsByTagName('html')[0].classList.contains('dark-mode')) {
		htmlClass = 'dark-mode';
	}
	let frame = document.getElementById('contentIframe');
	let content = `<!DOCTYPE html>
	<html class="${htmlClass}">
		<head>
			<link rel="stylesheet" href="/assets/style.css">
		</head>
		<body onload="parent.postMessage(document.body.scrollHeight, '*');">
			${postContent}
		</body>
		<script>
			// Change links to target parent

			var links = document.getElementsByTagName("a");
			for (var i = 0; i < links.length; i++) {
				if (links[i].href) {
					links[i].target = "_parent";
				}
			}
		</script>
	</html>`;

	frame.setAttribute("srcdoc", content);
}