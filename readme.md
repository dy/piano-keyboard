Visualize piano in DOM. [Demo](http://dfcreative.github.io/piano-keyboard).

[![npm install piano-keyboard](https://nodei.co/npm/piano-keyboard.png?mini=true)](https://nodei.co/npm/piano-keyboard/)


```js
var Keyboard = require('piano-keyboard');

//options
var keyboad = new Keyboard({
	element: document.querySelector('.my-piano'), //if omitted, element is created
	range: ['c4', 'c#6'], //notes range, numbers or names
	a11y: false //focusable & keyboard interactions
});

//events
keyboard
	.on('noteOn', function ({which, volume}) {})
	.on('noteOff', function ({which, volume}) {});

//API
keyboard.noteOn(['a4', 'c2', 'c3'], [127, 80, 80]);
keyboard.activeNotes; // Set <49, 16, 28>
keyboard.noteOff(['a4', 'c2']);

//pipe to midi
keyboard.pipe(require('web-midi')('Launchpad'));

//pipe from midi
var midiIn = require('midi-qwerty-keys')({
	mode: 'piano',
	offset: keyboard.range[0]
});
midiIn.pipe(keyboard);

//pipe to simple synthesizer WIP
keyboard.pipe(require('synthesizer'));

//change orientation to vertical
keyboard.element.classList.add('piano-keyboard-vertical');
keyboard.element.classList.remove('piano-keyboard-vertical');

//call on changing orientation, resize etc
keyboard.update();
```

## Analogs

* [qwerty-hancock](https://github.com/stuartmemo/qwerty-hancock)