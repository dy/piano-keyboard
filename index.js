/**
 * @module piano-keyboard
 */

import extend from 'xtend/mutable';
import key from 'piano-key';
import domify from 'domify';
import on from 'emmy/on';
import emit from 'emmy/emit';
import delegate from 'emmy/delegate';
import off from 'emmy/off';
import getUid from 'get-uid';
import isString from 'mutype/is-string';
import isArray from 'mutype/is-array';
import isNumber from 'mutype/is-number';
import selection from 'mucss/selection';
import css from 'mucss/css';
import isBetween from 'mumath/is-between';
import {findTouch} from 'get-client-xy';
import slice from 'sliced';
import {Duplex} from 'stream';
import QwertyKeys from 'midi-qwerty-keys';


var doc = document;


/**
 * Takes element, context and options
 *
 * @constructor
 */
class Keyboard extends Duplex {
	constructor (options) {
		super();

		var self = this;

		extend(self, options);

		//create element
		if (!self.element) {
			self.element = document.createElement('div');
		}

		selection.disable(self.element);
		self.element.classList.add('piano-keyboard');

		//ensure context
		if (!self.context) {
			self.context = require('audio-context');
		}

		//to track events
		self.id = getUid();

		//create number of keys according to the range
		self.createKeys(self.range);

		//stack of pressed keys
		self.activeNotes = [];

		self.enable();
	}


	/**
	 * Create keyboard based of number of keys passed
	 */
	createKeys (range) {
		var self = this;

		var number = Math.abs(
			(isString(self.range[1]) ? key.getNumber(self.range[1]) : self.range[1]) -
			(isString(self.range[0]) ? key.getNumber(self.range[0]) : self.range[0])
		);

		var startWith = self.range[0];

		if (isString(startWith)) {
			startWith = key.getNumber(startWith);
		}

		var srcKeyEl = domify('<div class="piano-keyboard-key" tabindex="1" data-key></div>');

		var prevWhiteKeyEl;

		for (var i = 0; i < number; i++) {
			var keyEl = srcKeyEl.cloneNode();
			var keyNumber = startWith + i;
			var keyNote = key.getNote(keyNumber);

			keyEl.setAttribute('data-key', keyNumber);
			keyEl.setAttribute('title', key.getName(keyNumber));
			keyEl.classList.add('piano-keyboard-key-' + keyNote.toLowerCase().replace('#', '-sharp'));

			if (key.isBlack(keyNumber)) {
				keyEl.setAttribute('data-key-black', true);
				keyEl.classList.add('piano-keyboard-key-black');

				//put blacks into white keys - the only way to implement flex sizing
				if (prevWhiteKeyEl) {
					prevWhiteKeyEl.appendChild(keyEl);
				}
			}
			else {
				keyEl.classList.add('piano-keyboard-key-white');
				self.element.appendChild(keyEl);
				prevWhiteKeyEl = keyEl;
			}
		}

		return self;
	}


	/** Bind events */
	enable () {
		var self = this;

		//get start note number
		var startWith = self.range[0];

		if (isString(startWith)) {
			startWith = key.getNumber(startWith);
		}

		self.element.removeAttribute('disabled');

		self.update();

		//keep rectangles updated
		on(window, 'resize.' + self.id, function () {
			self.update();
		});

		//key element per event
		on(self.element, 'mousedown.' + self.id + ' touchstart.' + self.id, function (e) {
			e.preventDefault();
			updateKeys(e.touches || [0], e);

			//don’t bind more than once
			if (self.isActive) {
				return;
			}
			self.isActive = true;

			on(doc, 'mousemove.' + self.id, function (e) {
				e.preventDefault();
				updateKeys([0], e);
			});
			on(doc, 'touchmove.' + self.id, function (e) {
				e.preventDefault();
				updateKeys(e.touches, e);
			});
			on(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id, function (e) {
				e.preventDefault();
				updateKeys([]);
			});
			on(doc, 'touchend.' + self.id, function (e) {
				e.preventDefault();
				// updateKeys(e.changedTouches, e);
				updateKeys(e.touches, e);
			});
		});

		on(window, 'blur.' + self.id, function (e) {
			updateKeys([], e);
		});

		//just walk the list of touches, for each touch activate the key
		//pass empty touches list to unbind all
		function updateKeys (touches, e) {
			var rects = self.rectangles;
			var keys = self.keys;

			touches = slice(touches);

			var unbindKeys = slice(self.activeNotes);
			var bindKeys = [];
			var blackTouches = [];

			//for all keys - find ones to turn on and ones to turn off
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
			if (!self.activeNotes.length) {
				self.isActive = false;
				off(doc, '.' + self.id);
			}
		}


		//enable keyboard interactions
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


		//enable keys emulation
		if (self.qwerty) {
			self.noteStream = QwertyKeys({
				mode: self.qwerty === true ? 'piano' : self.qwerty,
				offset: startWith
			});

			self.noteStream.on('data', function ([code, note, value]) {
				//handle noteoffs
				if (code === 128 || (code === 144 && value === 0)) {
					self.noteOff(note);
				}
				//handle noteons
				else if (code === 144) {
					self.noteOn(note, value);
				}
			});
		}

		return self;
	}


	/** Update view */
	update () {
		var self = this;

		//specially sorted array of keys (blacks first)
		self.keys = slice(self.element.querySelectorAll('[data-key]')).sort(function (a, b) {
			if (a.hasAttribute('data-key-black')) return -1;
			return 1;
		});

		self.rectangles = self.keys.map(function (el) {
			return el.getBoundingClientRect();
		});

		return self;
	}


	/** Parse note number from any arg */
	parseNote (note) {
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
	noteOn (note, value) {
		var self = this;

		if (value === undefined) {
			value = 127;
		}

		if (isArray(note)) {
			slice(note).forEach(function (note, i) {
				self.noteOn(note, value[i] !== undefined ? value[i] : value );
			});
			return self;
		}

		note = self.parseNote(note);

		if (note === undefined) {
			return self;
		}

		var keyEl = self.element.querySelector('[data-key="' + note + '"]');

		if (!keyEl) {
			// throw Error(key.getName(note) + ' does not exist');
			return;
		}

		//don’t trigger twice
		if (self.activeNotes.indexOf(keyEl) >= 0) {
			return self;
		}

		//save active key
		self.activeNotes.push(keyEl);

		//send on note
		emit(self, 'noteOn', {
			which: note,
			value: value
		});

		keyEl.classList.add('active');
		keyEl.setAttribute('data-key-active', true);

		return self;
	}


	/** Disable note or all notes */
	noteOff (note) {
		var self = this, keyEl;

		//disable all active notes
		if (note === undefined) {
			slice(self.activeNotes).forEach(self.noteOff, self);
			return self;
		}

		note = self.parseNote(note);

		if (note === undefined) {
			return self;
		}

		var keyEl = self.element.querySelector('[data-key="' + note + '"]');

		if (!keyEl) {
			// throw Error(key.getName(note) + ' does not exist');
			return;
		}

		//save active key
		var keyIdx = self.activeNotes.indexOf(keyEl);
		if (keyIdx < 0) {
			return self;
		}

		//forget key
		self.activeNotes.splice(keyIdx, 1);

		//send off note
		emit(self, 'noteOff', {
			which: note,
			value: 0
		});

		keyEl.classList.remove('active');
		keyEl.removeAttribute('data-key-active');

		return self;
	}


	/** Carefully clean up */
	disable () {
		var self = this;

		self.element.setAttribute('disabled', true);

		off(self.element, '.' + self.id);
		off(window, '.' + self.id);

		return self;
	}
}




var proto = Keyboard.prototype;


/** Keys range to display */
proto.range = ['C3', 'C4'];


/** Use to detune frequency */
proto.detune = 0;


/** Bind keyboard */
proto.keyboardEvents = false;


/** Emulate keys via qwerty */
proto.qwerty = true;


module.exports = Keyboard;