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

	//active touches indexes as keys and elements as values
	self.touches = {};

	//specially sorted array of keys (blacks first)
	var keys = [].slice.call(self.element.childNodes).sort(function (a, b) {
		if (a.hasAttribute('data-key-black')) return -1;
		return 1;
	});

	//key element per event
	on(self.element, 'mousedown.' + self.id + ' touchstart.' + self.id, function (e) {
		e.preventDefault();

		//save touch id
		var touchId = e.changedTouches ? e.changedTouches[0].identifier : 0;
		var eventId = self.id + '-' + touchId;

		self.touches[touchId] = e.target;
		self.noteOn(e.target, touchId);

		//each touchmove detects closest key and triggers it
		on(doc, 'mousemove.' + eventId + ' touchmove.' + eventId, function (e) {
			e.preventDefault();

			var clientXY = getClientCoords(e, touchId);

			//first - check whether key is still active
			if (self.touches[touchId]) {
				var rect = self.touches[touchId].getBoundingClientRect();
				if (!isBetween(clientXY[0], rect.left, rect.right) || !isBetween(clientXY[1], rect.top, rect.bottom)) {
					var offTarget = self.touches[touchId];
					self.touches[touchId] = null;
					if (!isTouched(offTarget)) {
						self.noteOff(offTarget, touchId);
						findActiveKeys(clientXY);
					}
				}
			}
			else {
				findActiveKeys(clientXY);
			}

		});

		on(doc, 'mouseup.' + eventId + ' mouseleave.' + eventId + ' touchend.' + eventId, function (e) {
			if (e.changedTouches) {
				if (e.changedTouches[0].identifier !== touchId) {
					return;
				}
			}

			off(doc, '.' + eventId);

			// if other touches are pointing to the key
			var offTarget = self.touches[touchId];
			self.touches[touchId] = null;

			if (!isTouched(offTarget)) {
				self.noteOff(offTarget, touchId);
			}
		});

		//check whether el is touched by someone else
		function isTouched (el) {
			for (var id in self.touches) {
				if (self.touches[id] === el) return true;
			}
			return false;
		}

		function findActiveKeys (clientXY) {
			//find a new key, if possible
			for (var i = 0; i < keys.length; i++) {
				var rect = keys[i].getBoundingClientRect();
				if (isBetween(clientXY[0], rect.left, rect.right) && isBetween(clientXY[1], rect.top, rect.bottom)) {
					self.touches[touchId] = keys[i];
					self.noteOn(keys[i], touchId);
					return;
				}
			}
		}
	});

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
proto.noteOn = function noteOn (note, touchId) {
	var self = this;

	if (isArray(note)) {
		[].slice.call(note).forEach(noteOn, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

	//don’t trigger twice
	if (keyEl.hasAttribute('data-key-active')) {
		return self;
	}

	//send on note
	emit(self, 'noteon', {
		which: note,
		value: 127,
		touch: touchId
	});

	keyEl.classList.add('active');
	keyEl.setAttribute('data-key-active', true);

	return self;
};


/** Disable note or all notes */
proto.noteOff = function noteOff (note, touchId) {
	var self = this, keyEl;

	//disable all active notes
	if (note === undefined) {
		[].slice.call(self.element.querySelectorAll('[data-key-active]')).forEach(noteOff, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

	//don’t trigger twice
	if (!keyEl.hasAttribute('data-key-active')) {
		return self;
	}

	//send off note
	emit(self, 'noteoff', {
		which: note,
		value: 0,
		touch: touchId
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