Visualize piano in DOM. [Demo](http://dfcreative.github.io/piano-keyboard). [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

[![npm install piano-keyboard](https://nodei.co/npm/piano-keyboard.png?mini=true)](https://nodei.co/npm/piano-keyboard/)


```js
var Keyboard = require('piano-keyboard');


//init options
var keyboad = new Keyboard({
	element: document.querySelector('.my-piano'),
	context: audioContext,
	range: ['c1', 'c6'],
	qwerty: true,
	//multiple: true,
	//continuous: true
});


//bind events
keyboard
	.on('noteOn', function (data) {
		console.log(data.which, data.volume);
		this.activeKeys; //list of active keys
	})
	.on('noteOff', function (data) {
		console.log(data.which, data.volume);
	});


//play keys
keyboard.noteOn(['c1', 'c2', 'c3']);
keyboard.activeNotes; // ['c1', 'c2', 'c3']
keyboard.noteOff(['c1', 'c2']);


//pipe to web-midi output
keyboard.pipe(require('web-midi')('Launchpad'));
```