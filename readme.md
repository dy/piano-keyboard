Visualize keyboard component in DOM. Just an element and events, nothing more.

[![npm install piano-keyboard](https://nodei.co/npm/piano-keyboard.png?mini=true)](https://nodei.co/npm/piano-keyboard/)


```js
var Keyboard = require('piano-keyboard');

var keyboad = new Keyboard({
	element: document.querySelector('.my-piano'),
	context: audioContext,
	keyboardEvents: true,
	firstKey: 'c1',
	numberOfKeys: 61,
	orientation: 'horizontal'
});
```