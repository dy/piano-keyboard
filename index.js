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


/** Bind keyboard */
proto.keyboardEvents = false;

/** Orientation */
proto.orientation = 'horizontal';

/** Bind events */
proto.enable = function () {
	var self = this;

	self.element.removeAttribute('disabled');

	on(self.element, 'mousedown.' + self.id + ' touchstart.' + self.id, function (e) {
		self.noteOn(e.target);

		/*
		on(self.element, 'mouseover.' + self.id, function (e) {
			self.noteOn(e.target);
		});
		on(self.element, 'mouseout.' + self.id, function (e) {
			self.noteOff();
		});
	*/

		on(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id + ' touchend.' + self.id, function (e) {

			self.noteOff();

			off(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id + ' touchend.' + self.id);
			off(self.element, 'mouseover.' + self.id);
			off(self.element, 'mouseout.' + self.id);
		});
	});

	if (self.keyboardEvents) {
		delegate(self.element, 'keydown', '[data-key]', function (e) {
			// if (e.which ===)
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
		[].slice.call(note).forEach(noteOn, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

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
		[].slice.call(self.element.querySelectorAll('[data-key-active]')).forEach(noteOff, self);
		return self;
	}

	note = self.parseNote(note);

	if (note === undefined) {
		return self;
	}

	var keyEl = self.element.querySelector('[data-key="' + note + '"]');

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