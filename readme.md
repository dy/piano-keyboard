Visualize keyboard component in DOM. Just an element and events, nothing more.

[![npm install piano-keyboard](https://nodei.co/npm/piano-keyboard.png?mini=true)](https://nodei.co/npm/piano-keyboard/)


```js
var Keyboard = require('piano-keyboard');

//init options
var keyboad = new Keyboard({
	element: document.querySelector('.my-piano'),
	context: audioContext,
	keyboardEvents: true,
	firstKey: 'c1',
	numberOfKeys: 61,
	orientation: 'vertical'
});

//bind events
keyboard
	.on('noteon', function (data) {
		console.log(data.which, data.volume);
	})
	.on('noteoff', function (data) {
		console.log(data.which, data.volume);
	});

//pipe to web-midi output (WIP)
keyboard.pipe(midiOut);
```