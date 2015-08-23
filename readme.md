Visualize piano in DOM. [Demo](http://dfcreative.github.io/piano-keyboard).

[![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)


[![npm install piano-keyboard](https://nodei.co/npm/piano-keyboard.png?mini=true)](https://nodei.co/npm/piano-keyboard/)


```js
var Keyboard = require('piano-keyboard');


//init with options
var keyboad = new Keyboard({
	element: document.querySelector('.my-piano'), //if omitted, element is created
	context: audioContext, //if omitted the `audio-context` module is used
	range: ['c4', 'c#6'], //notes range
	qwerty: true, //qwerty emulation, pass string to specify type: 'grid' or 'piano'.
	a11y: false //focusable & keyboard interactions
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


//play notes
keyboard.noteOn(['a4', 'c2', 'c3']);
keyboard.activeNotes; // Set(49, 16, 28)
keyboard.noteOff(['a4', 'c2']);


//pipe to web-midi output
keyboard.pipe(require('web-midi')('Launchpad'));


//change orientation to vertical
keyboard.element.classList.add('piano-keyboard-vertical');
keyboard.element.classList.remove('piano-keyboard-vertical');


//call on changing orientation, resize etc
keyboard.update();
```

## Notes

Don't forget to include `index.css`.

To ensure work:

```html
<script type="text/javascript" src="https://cdn.polyfill.io/v1/polyfill.js?features=default,Set,Element.prototype.matches"></script>
```
