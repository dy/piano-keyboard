/**
 * @module piano-keyboard
 */

var Emitter = require('events');
var inherit = require('inherits');
var extend = require('xtend/mutable');
var key = require('piano-key');
var doc = document;
var domify = require('domify');
var on = require('emmy/on');
var emit = require('emmy/emit');
var delegate = require('emmy/delegate');
var off = require('emmy/off');
var getUid = require('get-uid');
var isString = require('mutype/is-string');
var isArray = require('mutype/is-array');
var isNumber = require('mutype/is-number');
var selection = require('mucss/selection');
var css = require('mucss/css');
var isBetween = require('mumath/is-between');
var getClientCoords = require('get-client-xy');
var findTouch = getClientCoords.findTouch;
var slice = require('sliced');


/**
 * Takes element, context and options
 *
 * @constructor
 */
function Keyboard (options) {
	var self = this;

	if (!(self instanceof Keyboard)) {
		return new Keyboard(element, context, options);
	}

	extend(self, options);

	if (!self.element) {
		self.element = document.createElement('div');
	}

	selection.disable(self.element);
	self.element.classList.add('piano-keyboard');

	self.element.classList.add('piano-keyboard-' + self.orientation);

	if (!self.context) {
		self.context = require('audio-context');
	}

	self.id = getUid();

	self.createKeys();

	//stack of pressed keys
	self.activeKeys = [];

	self.enable();
}

inherit(Keyboard, Emitter);


var proto = Keyboard.prototype;


/**
 * Create keyboard based of number of keys passed
 */
proto.createKeys = function (number, startWith) {
	var self = this;

	if (!number) {
		number = self.numberOfKeys;
	}

	if (!startWith) {
		startWith = self.firstKey;
	}

	if (isString(startWith)) {
		startWith = key.getNumber(startWith);
	}

	var srcKeyEl = domify('<div class="piano-keyboard-key" tabindex="1" data-key></div>');

	for (var i = 0; i < number; i++) {
		var keyEl = srcKeyEl.cloneNode();
		var keyNumber = startWith + i;

		keyEl.setAttribute('data-key', keyNumber);
		keyEl.setAttribute('title', key.getName(keyNumber));

		if (key.isBlack(keyNumber)) {
			keyEl.setAttribute('data-key-black', true);
			keyEl.classList.add('piano-keyboard-key-black');
		}

		self.element.appendChild(keyEl);
	}

	return self;
}


/** Default key number: 25, 44, 49, 61, 76, 88, 92, 97 */
proto.numberOfKeys = 61;


/** First key in a keyboard */
proto.firstKey = 'C1';


/** Use to detune frequency */
proto.detune = 0;


/** Bind keyboard */
proto.keyboardEvents = false;


/** Orientation */
proto.orientation = 'horizontal';


/** Bind events */
proto.enable = function () {
	var self = this;

	self.element.removeAttribute('disabled');

	//specially sorted array of keys (blacks first)
	var keys = slice(self.element.childNodes).sort(function (a, b) {
		if (a.hasAttribute('data-key-black')) return -1;
		return 1;
	});

	//save bounding rects
	var rects = keys.map(function (el) {
		return el.getBoundingClientRect();
	});

	//key element per event
	on(self.element, 'mousedown.' + self.id + ' touchstart.' + self.id, function (e) {
		e.preventDefault();
		updateKeys(e.touches || 0, e);

		//don’t bind more than once
		if (self.isActive) {
			return;
		}
		self.isActive = true;

		on(doc, 'mousemove.' + self.id, function (e) {
			e.preventDefault();
			updateKeys(0, e);
		});
		on(doc, 'touchmove.' + self.id, function (e) {
			e.preventDefault();
			updateKeys(e.touches, e);
		});
		on(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id, function (e) {
			e.preventDefault();
			updateKeys(0, e);
		});
		on(doc, 'touchend.' + self.id, function (e) {
			e.preventDefault();
			updateKeys(e.changedTouches, e);
			updateKeys(e.touches, e);
		});
	});

	on(window, 'blur', function (e) {
		self.noteOff();
	});

	//just walk the list of touches, for each touch activate the key
	function updateKeys (touches, e) {
		touches = slice(touches);

		var unbindKeys = slice(self.activeKeys);
		var bindKeys = [];
		var blackTouches = [];

		//find keys need to be turned on
		for (var i = 0; i < keys.length; i++) {
			touches.forEach(function (touchId) {
				if (touchId.identifier !== undefined) {
					touchId = touchId.identifier;
				};

				var touch = findTouch(touches, touchId);
				var clientXY;
				if (touch) {
					clientXY = [touch.clientX, touch.clientY]
				}
				else {
					clientXY = [e.clientX, e.clientY]
				}

				if (isBetween(clientXY[0], rects[i].left, rects[i].right) && isBetween(clientXY[1], rects[i].top, rects[i].bottom)) {
					// log(clientXY)
					if (blackTouches.indexOf(touchId) >= 0) {
						return;
					}

					//add to binds & reserve touch to avoid double-note pressing
					if (bindKeys.indexOf(keys[i]) < 0) {
						bindKeys.push(keys[i]);
						if (keys[i].hasAttribute('data-key-black')) {
							blackTouches.push(touchId);
						}
					}

					//remove from unbinds
					var unbindIdx = unbindKeys.indexOf(keys[i]);
					if (unbindIdx >= 0) {
						unbindKeys.splice(unbindIdx, 1);
					}

				}
			});
		}

		//unbind/bind keys
		unbindKeys.forEach(self.noteOff, self);
		bindKeys.forEach(self.noteOn, self);

		//check whether there are left keys
		if (!self.activeKeys.length) {
			self.isActive = false;
			off(doc, '.' + self.id);
		}
	}


	if (self.keyboardEvents) {
		delegate(self.element, 'keydown', '[data-key]', function (e) {
			// console.log(e.which)
			var keyEl = e.delegateTarget;
			var note = self.parseNote(keyEl);

			if (note === undefined) {
				return;
			}

			//space instantly presses the note
			if (e.which === 32) {
				self.noteOn(note);
			}

			//arrows moves key left/right
			if (e.which === 39) {
				var nextEl = keyEl.nextSibling;
				if (!nextEl) {
					return;
				}
				nextEl.focus();
			}
			if (e.which === 37) {
				var nextEl = keyEl.previousSibling;
				if (!nextEl) {
					return;
				}
				nextEl.focus();
			}


			//tab or shift + arrow moves for an octave
		});
		delegate(self.element, 'keyup', '[data-key]', function (e) {
			var keyEl = e.delegateTarget;
			var note = self.parseNote(keyEl);

			if (note === undefined) {
				return;
			}

			//space instantly stops note
			if (e.which === 32) {
				self.noteOff(note);
			}
		});
	}

	return self;
};


/** Parse note number from any arg */
proto.parseNote = function (note) {
	if (isString(note)) {
		return key.getNumber(note);
	}

	else if (isNumber(note)) {
		return note;
	}

	else if (note instanceof HTMLElement) {
		//ignore not keys
		if (!note.hasAttribute('data-key')) {
			return;
		}

		return parseInt(note.getAttribute('data-key'));
	}
}


/** Set active note */
proto.noteOn = function noteOn (note) {
	var self = this;

	if (isArray(note)) {
		slice(note).forEach(noteOn, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

	//don’t trigger twice
	if (self.activeKeys.indexOf(keyEl) >= 0) {
		return self;
	}

	//save active key
	self.activeKeys.push(keyEl);

	//send on note
	emit(self, 'noteon', {
		which: note,
		value: 127
	});

	keyEl.classList.add('active');
	keyEl.setAttribute('data-key-active', true);

	return self;
};


/** Disable note or all notes */
proto.noteOff = function noteOff (note) {
	var self = this, keyEl;

	//disable all active notes
	if (note === undefined) {
		slice(self.activeKeys).forEach(noteOff, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

	//save active key
	var keyIdx = self.activeKeys.indexOf(keyEl);
	if (keyIdx < 0) {
		return self;
	}

	//forget key
	self.activeKeys.splice(keyIdx, 1);

	//send off note
	emit(self, 'noteoff', {
		which: note,
		value: 0
	});

	keyEl.classList.remove('active');
	keyEl.removeAttribute('data-key-active');

	return self;
};


proto.disable = function () {
	var self = this;

	self.element.setAttribute('disabled', true);

	off(self.element, '.' + self.id);

	return self;
};



module.exports = Keyboard;