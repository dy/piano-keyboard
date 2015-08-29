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


var doc = document;


/**
 * Takes element and options
 *
 * @constructor
 */
class Keyboard extends Duplex {
	constructor (options) {
		super({
			objectMode: true
		});

		var self = this;

		extend(self, options);

		//create element
		if (!self.element) {
			self.element = document.createElement('div');
		}

		selection.disable(self.element);
		self.element.classList.add('piano-keyboard');

		//to track events
		self.id = getUid();

		//transform range to numbers
		self.range = self.range.map(function (value) {
			return isString(value) ? key.getNumber(value) : value
		});

		//create number of keys according to the range
		self.createKeys(self.range);

		//set of active notes
		self.activeNotes = new Set();

		//set of pressed midi-keys, to manage shift mode
		self._pressedKeys = new Set();

		self.enable();
	}


	/**
	 * Read is called whenever the consumer wants to read more.
	 * To form a stack of data to read, call self.push(chunk)
	 */
	_read () {
		//FIXME: it is considered to be always active right now, so if there is a case when it needs to be stopped - implement it
	}


	/**
	 * Write is called whenever there is a note to display
	 */
	_write ([code, note, value], encoding, callback) {
		var self = this;

		//handle noteoffs
		if (code === 128 || (code === 144 && value === 0)) {
			self._pressedKeys.delete(note);
			self.noteOff(note);
		}
		//handle noteons
		else if (code === 144) {
			self._pressedKeys.add(note);
			self.noteOn(note, value);
		}

		callback();
	}


	/**
	 * Create keyboard based of number of keys passed
	 */
	createKeys (range) {
		var self = this;

		var number = Math.abs(self.range[1] - self.range[0]);

		var startWith = self.range[0];

		var srcKeyEl = domify('<div class="piano-keyboard-key" data-key></div>');

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

		//active touches
		var activeTouches = [];

		//last mouse coords
		var lastClientXY = [0,0];

		//get start note number
		var startWith = self.range[0];

		self.element.removeAttribute('disabled');

		//whether to block noteOn/noteOff
		self.isBlocked = false;

		self.update();

		//keep rectangles updated
		on(window, 'resize.' + self.id, function () {
			self.update();
		});

		//notes pressed simultaneously
		self.shiftGroupNotes = null;
		on(window, 'keydown.' + self.id, function (e) {
			//shift === 16
			if (e.which === 16 && !self.isShiftPressed) {
				self.shiftGroupNotes = new Set(self.activeNotes);
			}
		});
		on(window, 'keyup.' + self.id, function (e) {
			if (e.which === 16) {
				self.shiftGroupNotes = null;

				//update notes so to only the pressed ones remain
				updateNotes(activeTouches, null, self.pressedKeys);
			}
		});

		//enable note on mouse/touch
		var isMouseDown = false;

		on(self.element, 'mousedown.' + self.id + ' touchstart.' + self.id, function (e) {
			e.preventDefault();

			self.isBlocked = false;

			isMouseDown = true;

			updateNotes(e.touches || [0], e);

			//don’t bind more than once
			if (self.isActive) {
				return;
			}
			self.isActive = true;

			on(doc, 'mousemove.' + self.id, function (e) {
				if (!isMouseDown) return;

				e.preventDefault();
				updateNotes([0], e);
			});
			on(doc, 'touchmove.' + self.id, function (e) {
				e.preventDefault();
				updateNotes(e.touches, e);
			});
			on(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id, function (e) {
				e.preventDefault();
				updateNotes([]);
				self.isBlocked = false;
				isMouseDown = false;
			});
			on(doc, 'touchend.' + self.id, function (e) {
				e.preventDefault();
				// updateNotes(e.changedTouches, e);
				updateNotes(e.touches, e);
			});
		});

		//up keys on blur
		on(window, 'blur.' + self.id, function (e) {
			self.isBlocked = false;

			self.shiftGroupNotes = null;
			updateNotes([], e);
		});

		//walk the list of touches, for each touch activate the key
		//pass empty touches list to just off all notes
		function updateNotes (touches, e, ignoreNotes) {
			var rects = self.rectangles;
			var notes = self.notes;
			var noteEls = self.noteElements;

			touches = slice(touches);

			//save last touches as active
			activeTouches = touches;

			//FIXME: Safari doesn't know what's that
			// var notesOff = new Set(self.activeNotes);
			var notesOff = new Set();
			self.activeNotes.forEach(function (note) {
				notesOff.add(note);
			});

			var notesOn = new Set();
			var blackTouches = new Set();

			//for all notes - find ones to turn on and ones to turn off
			for (var i = 0; i < notes.length; i++) {
				touches.forEach(function (touchId) {
					if (touchId.identifier !== undefined) {
						touchId = touchId.identifier;
					};

					var touch = findTouch(touches, touchId);
					var clientXY;
					if (touch) {
						clientXY = [touch.clientX, touch.clientY]
					}
					else if (e) {
						clientXY = [e.clientX, e.clientY]
						//update last coords
						lastClientXY = clientXY;
					}
					else {
						clientXY = lastClientXY;
					}


					if (isBetween(clientXY[0], rects[i].left, rects[i].right) && isBetween(clientXY[1], rects[i].top, rects[i].bottom)) {
						if (blackTouches.has(touchId)) {
							return;
						}

						//add to on notes & reserve touch to avoid double-note pressing
						if (!notesOn.has(notes[i])) {
							notesOn.add(notes[i]);
							if (noteEls[i].hasAttribute('data-key-black')) {
								blackTouches.add(touchId);
							}
						}

						//remove from planned notes to off
						notesOff.delete(notes[i]);
					}
				});
			}

			//unbind/bind notes
			if (ignoreNotes) {
				ignoreNotes.forEach(function (note) {
					notesOff.delete(note)
				})
			}
			notesOff.forEach(self.noteOff, self);
			notesOn.forEach(self.noteOn, self);

			//check whether there are notes left
			if (!self.activeNotes.size) {
				self.isActive = false;
				off(doc, '.' + self.id);
			}
		}


		//enable a11y
		if (self.a11y) {
			//add tabindexes
			self.noteElements.forEach(function (noteEl) {
				noteEl.setAttribute('tabindex', 1);
			});

			//handle key/tab navigating
			delegate(self.element, 'keydown', '[data-key]', function (e) {
				var keyEl = e.delegateTarget;
				var note = self.parseNote(keyEl);

				if (note === undefined) {
					return;
				}

				//space instantly presses the note
				if (e.which === 32) {
					self.noteOn(note);
				}

				//arrows moves key left&bottom/right&top
				if (e.which === 39 || e.which === 38) {
					var nextEl = keyEl.querySelector('[data-key]') || (keyEl.parentNode.matches('[data-key]') && keyEl.parentNode.nextSibling) || keyEl.nextSibling;
					if (!nextEl) {
						return;
					}
					nextEl.focus();
				}
				if (e.which === 37 || e.which === 40) {
					var prevEl = (keyEl.parentNode.matches('[data-key]') && keyEl.parentNode) || (keyEl.previousSibling && keyEl.previousSibling.querySelector('[data-key]')) || keyEl.previousSibling;
					if (!prevEl) {
						return;
					}
					prevEl.focus();
				}
			});
			delegate(self.element, 'keyup', '[data-key]', function (e) {
				self.isBlocked = false;

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
	}


	/** Update view */
	update () {
		var self = this;

		//specially sorted array of keys (blacks first)
		self.noteElements = slice(self.element.querySelectorAll('[data-key]')).sort(function (a, b) {
			if (a.hasAttribute('data-key-black')) return -1;
			return 1;
		});

		self.rectangles = self.noteElements.map(function (el) {
			return el.getBoundingClientRect();
		});

		self.notes = self.noteElements.map(self.parseNote);

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

		if (self.isBlocked) return self;

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

		//save shift group, if any
		if (self.shiftGroupNotes) {
			//but if shiftGroup cointains the note - force trigger rather than on
			if (self.shiftGroupNotes.has(note)) {
				self.shiftGroupNotes.delete(note);
				self.noteOff(note);
				self.isBlocked = true;

				//focus on disabled note
				if (self.a11y) {
					keyEl.focus();
				}
				return self;
			}
			self.shiftGroupNotes.add(note);
			self.isBlocked = true;
		}

		//don’t trigger twice
		if (self.activeNotes.has(note)) {
			return self;
		}

		//save active key
		self.activeNotes.add(note);

		//send on note
		emit(self, 'noteOn', {
			target: keyEl,
			which: note,
			value: value
		});

		//send to stream
		self.push([144, note, value]);

		//reflect classes
		keyEl.classList.add('piano-keyboard-key-active');
		keyEl.setAttribute('data-key-active', true);

		if (self.a11y) {
			keyEl.focus();
		}

		return self;
	}


	/** Disable note or all notes */
	noteOff (note) {
		var self = this, keyEl;

		if (self.isBlocked) return self;

		//disable all active notes
		if (note === undefined) {
			self.activeNotes.forEach(self.noteOff, self);
			return self;
		}
		if (isArray(note)) {
			slice(note).forEach(function (note, i) {
				self.noteOff(note);
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
			return self;
		}

		//ignore inactive key
		if (!self.activeNotes.has(note)) {
			return self;
		}

		//ignore key if it is in the shift group
		if (self.shiftGroupNotes && self.shiftGroupNotes.has(note)) {
			return self;
		}

		//forget key
		self.activeNotes.delete(note);

		//send off note
		emit(self, 'noteOff', {
			target: keyEl,
			which: note,
			value: 0
		});

		keyEl.classList.remove('piano-keyboard-key-active');
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


/** Default notes range to display */
proto.range = ['C3', 'C4'];

/** Enable focusability, accessibility */
proto.a11y = false;


export default Keyboard;