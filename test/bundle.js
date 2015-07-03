require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"audio-context":[function(require,module,exports){
var window = require('global/window');

var Context = window.AudioContext || window.webkitAudioContext;
if (Context) module.exports = new Context;

},{"global/window":1}],1:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Tests for browser support.
 */

var div = document.createElement('div');
// Setup
div.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
// Make sure that link elements get serialized correctly by innerHTML
// This requires a wrapper element in IE
var innerHTMLBug = !div.getElementsByTagName('link').length;
div = undefined;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  // for script/link/style tags to work in IE6-8, you have to wrap
  // in a div with a non-whitespace character in front, ha!
  _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.polyline =
map.ellipse =
map.polygon =
map.circle =
map.text =
map.line =
map.path =
map.rect =
map.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return a DOM Node instance, which could be a TextNode,
 * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
 * instance, depending on the contents of the `html` string.
 *
 * @param {String} html - HTML string to "domify"
 * @param {Document} doc - The `document` instance to create the Node for
 * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
 * @api private
 */

function parse(html, doc) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // default to the global `document` object
  if (!doc) doc = document;

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return doc.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = doc.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = doc.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = doc.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],3:[function(require,module,exports){
/**
 * @module  emmy/delegate
 */

module.exports = delegate;

var on = require('./on');
var isFn = require('is-function');
var isString = require('mutype/is-string');
var isArrayLike = require('mutype/is-array-like');


/**
 * Bind listener to a target
 * listening for all events from it’s children matching selector
 *
 *
 * @param {string} selector A selector to match against
 *
 * @return {function} A callback
 */
function delegate (target, evt, fn, selector) {
	return on(target, evt, delegate.wrap(target, evt, fn, selector));
}


delegate.wrap = function (container, evt, fn, selector) {
	//swap params, if needed
	if (isFn(selector)) {
		var tmp = selector;
		selector = fn;
		fn = tmp;
	}

	return on.wrap(container, evt, fn, function cb(e) {
		var srcEl = e.target;

		//deny self instantly
		if (srcEl === container) {
			return;
		}

		//wrap to detect list of selectors
		if (!isArrayLike(selector)) {
			selector = [selector];
		}

		return selector.some(function (selector) {
			var delegateTarget;
			if (!isString(selector)) {
				if (!selector.contains(srcEl)) return false;
				delegateTarget = selector;
			}
			//find at least one element in-between delegate target and event source
			else {
				delegateTarget = srcEl.closest(selector);
			}

			if (delegateTarget && container !== delegateTarget && container.contains(delegateTarget)) {
				//save source of event
				e.delegateTarget = delegateTarget;
				return true;
			}

			return false;
		});
	});
};
},{"./on":11,"is-function":7,"mutype/is-array-like":18,"mutype/is-string":25}],4:[function(require,module,exports){
/**
 * @module emmy/emit
 */
var icicle = require('icicle');
var slice = require('sliced');
var isString = require('mutype/is-string');
var isNode = require('mutype/is-node');
var isEvent = require('mutype/is-event');
var listeners = require('./listeners');


/**
 * A simple wrapper to handle stringy/plain events
 */
module.exports = function(target, evt){
	if (!target) return;

	var args = arguments;
	if (isString(evt)) {
		args = slice(arguments, 2);
		evt.split(/\s+/).forEach(function(evt){
			evt = evt.split('.')[0];

			emit.apply(this, [target, evt].concat(args));
		});
	} else {
		return emit.apply(this, args);
	}
};


/** detect env */
var $ = typeof jQuery === 'undefined' ? undefined : jQuery;
var doc = typeof document === 'undefined' ? undefined : document;
var win = typeof window === 'undefined' ? undefined : window;


/**
 * Emit an event, optionally with data or bubbling
 * Accept only single elements/events
 *
 * @param {string} eventName An event name, e. g. 'click'
 * @param {*} data Any data to pass to event.details (DOM) or event.data (elsewhere)
 * @param {bool} bubbles Whether to trigger bubbling event (DOM)
 *
 *
 * @return {target} a target
 */
function emit(target, eventName, data, bubbles){
	var emitMethod, evt = eventName;

	//Create proper event for DOM objects
	if (isNode(target) || target === win) {
		//NOTE: this doesnot bubble on off-DOM elements

		if (isEvent(eventName)) {
			evt = eventName;
		} else {
			//IE9-compliant constructor
			evt = doc.createEvent('CustomEvent');
			evt.initCustomEvent(eventName, bubbles, true, data);

			//a modern constructor would be:
			// var evt = new CustomEvent(eventName, { detail: data, bubbles: bubbles })
		}

		emitMethod = target.dispatchEvent;
	}

	//create event for jQuery object
	else if ($ && target instanceof $) {
		//TODO: decide how to pass data
		evt = $.Event( eventName, data );
		evt.detail = data;

		//FIXME: reference case where triggerHandler needed (something with multiple calls)
		emitMethod = bubbles ? targte.trigger : target.triggerHandler;
	}

	//detect target events
	else {
		//emit - default
		//trigger - jquery
		//dispatchEvent - DOM
		//raise - node-state
		//fire - ???
		emitMethod = target['dispatchEvent'] || target['emit'] || target['trigger'] || target['fire'] || target['raise'];
	}


	var args = slice(arguments, 2);


	//use locks to avoid self-recursion on objects wrapping this method
	if (emitMethod) {
		if (icicle.freeze(target, 'emit' + eventName)) {
			//use target event system, if possible
			emitMethod.apply(target, [evt].concat(args));
			icicle.unfreeze(target, 'emit' + eventName);

			return target;
		}

		//if event was frozen - probably it is emitter instance
		//so perform normal callback
	}


	//fall back to default event system
	var evtCallbacks = listeners(target, evt);

	//copy callbacks to fire because list can be changed by some callback (like `off`)
	var fireList = slice(evtCallbacks);
	for (var i = 0; i < fireList.length; i++ ) {
		fireList[i] && fireList[i].apply(target, args);
	}

	return target;
}
},{"./listeners":5,"icicle":6,"mutype/is-event":20,"mutype/is-node":22,"mutype/is-string":25,"sliced":8}],5:[function(require,module,exports){
/**
 * A storage of per-target callbacks.
 * WeakMap is the most safe solution.
 *
 * @module emmy/listeners
 */


/**
 * Property name to provide on targets.
 *
 * Can’t use global WeakMap -
 * it is impossible to provide singleton global cache of callbacks for targets
 * not polluting global scope. So it is better to pollute target scope than the global.
 *
 * Otherwise, each emmy instance will create it’s own cache, which leads to mess.
 *
 * Also can’t use `._events` property on targets, as it is done in `events` module,
 * because it is incompatible. Emmy targets universal events wrapper, not the native implementation.
 */
var cbPropName = '_callbacks';


/**
 * Get listeners for the target/evt (optionally).
 *
 * @param {object} target a target object
 * @param {string}? evt an evt name, if undefined - return object with events
 *
 * @return {(object|array)} List/set of listeners
 */
function listeners(target, evt, tags){
	var cbs = target[cbPropName];
	var result;

	if (!evt) {
		result = cbs || {};

		//filter cbs by tags
		if (tags) {
			var filteredResult = {};
			for (var evt in result) {
				filteredResult[evt] = result[evt].filter(function (cb) {
					return hasTags(cb, tags);
				});
			}
			result = filteredResult;
		}

		return result;
	}

	if (!cbs || !cbs[evt]) {
		return [];
	}

	result = cbs[evt];

	//if there are evt namespaces specified - filter callbacks
	if (tags && tags.length) {
		result = result.filter(function (cb) {
			return hasTags(cb, tags);
		});
	}

	return result;
}


/**
 * Remove listener, if any
 */
listeners.remove = function(target, evt, cb, tags){
	//get callbacks for the evt
	var evtCallbacks = target[cbPropName];
	if (!evtCallbacks || !evtCallbacks[evt]) return false;

	var callbacks = evtCallbacks[evt];

	//if tags are passed - make sure callback has some tags before removing
	if (tags && tags.length && !hasTags(cb, tags)) return false;

	//remove specific handler
	for (var i = 0; i < callbacks.length; i++) {
		//once method has original callback in .cb
		if (callbacks[i] === cb || callbacks[i].fn === cb) {
			callbacks.splice(i, 1);
			break;
		}
	}
};


/**
 * Add a new listener
 */
listeners.add = function(target, evt, cb, tags){
	if (!cb) return;

	var targetCallbacks = target[cbPropName];

	//ensure set of callbacks for the target exists
	if (!targetCallbacks) {
		targetCallbacks = {};
		Object.defineProperty(target, cbPropName, {
			value: targetCallbacks
		});
	}

	//save a new callback
	(targetCallbacks[evt] = targetCallbacks[evt] || []).push(cb);

	//save ns for a callback, if any
	if (tags && tags.length) {
		cb._ns = tags;
	}
};


/** Detect whether an cb has at least one tag from the list */
function hasTags(cb, tags){
	if (cb._ns) {
		//if cb is tagged with a ns and includes one of the ns passed - keep it
		for (var i = tags.length; i--;){
			if (cb._ns.indexOf(tags[i]) >= 0) return true;
		}
	}
}


module.exports = listeners;
},{}],6:[function(require,module,exports){
/**
 * @module Icicle
 */
module.exports = {
	freeze: lock,
	unfreeze: unlock,
	isFrozen: isLocked
};


/** Set of targets  */
var lockCache = new WeakMap;


/**
 * Set flag on target with the name passed
 *
 * @return {bool} Whether lock succeeded
 */
function lock(target, name){
	var locks = lockCache.get(target);
	if (locks && locks[name]) return false;

	//create lock set for a target, if none
	if (!locks) {
		locks = {};
		lockCache.set(target, locks);
	}

	//set a new lock
	locks[name] = true;

	//return success
	return true;
}


/**
 * Unset flag on the target with the name passed.
 *
 * Note that if to return new value from the lock/unlock,
 * then unlock will always return false and lock will always return true,
 * which is useless for the user, though maybe intuitive.
 *
 * @param {*} target Any object
 * @param {string} name A flag name
 *
 * @return {bool} Whether unlock failed.
 */
function unlock(target, name){
	var locks = lockCache.get(target);
	if (!locks || !locks[name]) return false;

	locks[name] = null;

	return true;
}


/**
 * Return whether flag is set
 *
 * @param {*} target Any object to associate lock with
 * @param {string} name A flag name
 *
 * @return {Boolean} Whether locked or not
 */
function isLocked(target, name){
	var locks = lockCache.get(target);
	return (locks && locks[name]);
}
},{}],7:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],8:[function(require,module,exports){
module.exports = exports = require('./lib/sliced');

},{"./lib/sliced":9}],9:[function(require,module,exports){

/**
 * An Array.prototype.slice.call(arguments) alternative
 *
 * @param {Object} args something with a length
 * @param {Number} slice
 * @param {Number} sliceEnd
 * @api public
 */

module.exports = function (args, slice, sliceEnd) {
  var ret = [];
  var len = args.length;

  if (0 === len) return ret;

  var start = slice < 0
    ? Math.max(0, slice + len)
    : slice || 0;

  if (sliceEnd !== undefined) {
    len = sliceEnd < 0
      ? sliceEnd + len
      : sliceEnd
  }

  while (len-- > start) {
    ret[len - start] = args[len];
  }

  return ret;
}


},{}],10:[function(require,module,exports){
/**
 * @module emmy/off
 */
module.exports = off;

var icicle = require('icicle');
var slice = require('sliced');
var listeners = require('./listeners');
var isArray = require('mutype/is-array');


/**
 * Remove listener[s] from the target
 *
 * @param {[type]} evt [description]
 * @param {Function} fn [description]
 *
 * @return {[type]} [description]
 */
function off(target, evt, fn) {
	if (!target) return target;

	var callbacks, i;

	//unbind all listeners if no fn specified
	if (fn === undefined) {
		var args = slice(arguments, 1);

		//try to use target removeAll method, if any
		var allOff = target['removeAll'] || target['removeAllListeners'];

		//call target removeAll
		if (allOff) {
			allOff.apply(target, args);
		}


		//then forget own callbacks, if any

		//unbind all evts
		if (!evt) {
			callbacks = listeners(target);
			for (evt in callbacks) {
				off(target, evt);
			}
		}
		//unbind all callbacks for an evt
		else {
			evt = '' + evt;

			//invoke method for each space-separated event from a list
			evt.split(/\s+/).forEach(function (evt) {
				var evtParts = evt.split('.');
				evt = evtParts.shift();
				callbacks = listeners(target, evt, evtParts);

				//returned array of callbacks (as event is defined)
				if (evt) {
					var obj = {};
					obj[evt] = callbacks;
					callbacks = obj;
				}

				//for each group of callbacks - unbind all
				for (var evtName in callbacks) {
					slice(callbacks[evtName]).forEach(function (cb) {
						off(target, evtName, cb);
					});
				}
			});
		}

		return target;
	}


	//target events (string notation to advanced_optimizations)
	var offMethod = target['removeEventListener'] || target['removeListener'] || target['detachEvent'] || target['off'];

	//invoke method for each space-separated event from a list
	evt.split(/\s+/).forEach(function (evt) {
		var evtParts = evt.split('.');
		evt = evtParts.shift();

		//use target `off`, if possible
		if (offMethod) {
			//avoid self-recursion from the outside
			if (icicle.freeze(target, 'off' + evt)) {
				offMethod.call(target, evt, fn);
				icicle.unfreeze(target, 'off' + evt);
			}

			//if it’s frozen - ignore call
			else {
				return target;
			}
		}

		if (fn.closedCall) fn.closedCall = false;

		//forget callback
		listeners.remove(target, evt, fn, evtParts);
	});


	return target;
}
},{"./listeners":5,"icicle":6,"mutype/is-array":19,"sliced":8}],11:[function(require,module,exports){
/**
 * @module emmy/on
 */


var icicle = require('icicle');
var listeners = require('./listeners');
var isObject = require('mutype/is-object');

module.exports = on;


/**
 * Bind fn to a target.
 *
 * @param {*} targte A single target to bind evt
 * @param {string} evt An event name
 * @param {Function} fn A callback
 * @param {Function}? condition An optional filtering fn for a callback
 *                              which accepts an event and returns callback
 *
 * @return {object} A target
 */
function on(target, evt, fn){
	if (!target) return target;

	//consider object of events
	if (isObject(evt)) {
		for(var evtName in evt) {
			on(target, evtName, evt[evtName]);
		}
		return target;
	}

	//get target `on` method, if any
	//prefer native-like method name
	//user may occasionally expose `on` to the global, in case of browserify
	//but it is unlikely one would replace native `addEventListener`
	var onMethod =  target['addEventListener'] || target['addListener'] || target['attachEvent'] || target['on'];

	var cb = fn;

	evt = '' + evt;

	//invoke method for each space-separated event from a list
	evt.split(/\s+/).forEach(function(evt){
		var evtParts = evt.split('.');
		evt = evtParts.shift();

		//use target event system, if possible
		if (onMethod) {
			//avoid self-recursions
			//if it’s frozen - ignore call
			if (icicle.freeze(target, 'on' + evt)){
				onMethod.call(target, evt, cb);
				icicle.unfreeze(target, 'on' + evt);
			}
			else {
				return target;
			}
		}

		//save the callback anyway
		listeners.add(target, evt, cb, evtParts);
	});

	return target;
}


/**
 * Wrap an fn with condition passing
 */
on.wrap = function(target, evt, fn, condition){
	var cb = function() {
		if (condition.apply(target, arguments)) {
			return fn.apply(target, arguments);
		}
	};

	cb.fn = fn;

	return cb;
};
},{"./listeners":5,"icicle":6,"mutype/is-object":24}],12:[function(require,module,exports){
/** generate unique id for selector */
var counter = Date.now() % 1e9;

module.exports = function getUid(){
	return (Math.random() * 1e9 >>> 0) + (counter++);
};
},{}],13:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],14:[function(require,module,exports){
/**
 * Get or set element’s style, prefix-agnostic.
 *
 * @module  mucss/css
 */
var fakeStyle = require('./fake-element').style;
var prefix = require('./prefix').lowercase;


/**
 * Apply styles to an element.
 *
 * @param    {Element}   el   An element to apply styles.
 * @param    {Object|string}   obj   Set of style rules or string to get style rule.
 */
module.exports = function(el, obj){
	if (!el || !obj) return;

	var name, value;

	//return value, if string passed
	if (typeof obj === 'string') {
		name = obj;

		//return value, if no value passed
		if (arguments.length < 3) {
			return el.style[prefixize(name)];
		}

		//set style, if value passed
		value = arguments[2] || '';
		obj = {};
		obj[name] = value;
	}

	for (name in obj){
		//convert numbers to px
		if (typeof obj[name] === 'number' && /left|right|bottom|top|width|height/i.test(name)) obj[name] += 'px';

		value = obj[name] || '';

		el.style[prefixize(name)] = value;
	}
};


/**
 * Return prefixized prop name, if needed.
 *
 * @param    {string}   name   A property name.
 * @return   {string}   Prefixed property name.
 */
function prefixize(name){
	var uName = name[0].toUpperCase() + name.slice(1);
	if (fakeStyle[name] !== undefined) return name;
	if (fakeStyle[prefix + uName] !== undefined) return prefix + uName;
	return '';
}

},{"./fake-element":15,"./prefix":16}],15:[function(require,module,exports){
/** Just a fake element to test styles
 * @module mucss/fake-element
 */

module.exports = document.createElement('div');
},{}],16:[function(require,module,exports){
/**
 * Vendor prefixes
 * Method of http://davidwalsh.name/vendor-prefix
 * @module mucss/prefix
 */

var styles = getComputedStyle(document.documentElement, '');

var pre = (Array.prototype.slice.call(styles)
	.join('')
	.match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
)[1];

dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];

module.exports = {
	dom: dom,
	lowercase: pre,
	css: '-' + pre + '-',
	js: pre[0].toUpperCase() + pre.substr(1)
};
},{}],17:[function(require,module,exports){
/**
 * Enable/disable selectability of an element
 * @module mucss/selection
 */
var css = require('./css');


/**
 * Disable or Enable any selection possibilities for an element.
 *
 * @param    {Element}   el   Target to make unselectable.
 */
exports.disable = function(el){
	css(el, {
		'user-select': 'none',
		'user-drag': 'none',
		'touch-callout': 'none'
	});
	el.setAttribute('unselectable', 'on');
	el.addEventListener('selectstart', pd);
};
exports.enable = function(el){
	css(el, {
		'user-select': null,
		'user-drag': null,
		'touch-callout': null
	});
	el.removeAttribute('unselectable');
	el.removeEventListener('selectstart', pd);
};


/** Prevent you know what. */
function pd(e){
	e.preventDefault();
}
},{"./css":14}],18:[function(require,module,exports){
var isString = require('./is-string');
var isArray = require('./is-array');
var isFn = require('./is-fn');

//FIXME: add tests from http://jsfiddle.net/ku9LS/1/
module.exports = function (a){
	return isArray(a) || (a && !isString(a) && !a.nodeType && (typeof window != 'undefined' ? a != window : true) && !isFn(a) && typeof a.length === 'number');
}
},{"./is-array":19,"./is-fn":21,"./is-string":25}],19:[function(require,module,exports){
module.exports = function(a){
	return a instanceof Array;
}
},{}],20:[function(require,module,exports){
module.exports = function(target){
	return typeof Event !== 'undefined' && target instanceof Event;
};
},{}],21:[function(require,module,exports){
module.exports = function(a){
	return !!(a && a.apply);
}
},{}],22:[function(require,module,exports){
module.exports = function(target){
	return typeof document !== 'undefined' && target instanceof Node;
};
},{}],23:[function(require,module,exports){
module.exports = function(a){
	return typeof a === 'number' || a instanceof Number;
}
},{}],24:[function(require,module,exports){
/**
 * @module mutype/is-object
 */

//TODO: add st8 tests

//isPlainObject indeed
module.exports = function(o){
	// return obj === Object(obj);
	return !!o && typeof o === 'object' && o.constructor === Object;
};

},{}],25:[function(require,module,exports){
module.exports = function(a){
	return typeof a === 'string' || a instanceof String;
}
},{}],26:[function(require,module,exports){
/**
 * @module  mumath/loop
 *
 * Looping function for any framesize
 */

module.exports = require('./wrap')(function (value, left, right) {
	//detect single-arg case, like mod-loop
	if (right === undefined) {
		right = left;
		left = 0;
	}

	//swap frame order
	if (left > right) {
		var tmp = right;
		right = left;
		left = tmp;
	}

	var frame = right - left;

	value = ((value + left) % frame) - left;
	if (value < left) value += frame;
	if (value > right) value -= frame;

	return value;
});
},{"./wrap":27}],27:[function(require,module,exports){
/**
 * Get fn wrapped with array/object attrs recognition
 *
 * @return {Function} Target function
 */
module.exports = function(fn){
	return function(a){
		var args = arguments;
		if (a instanceof Array) {
			var result = new Array(a.length), slice;
			for (var i = 0; i < a.length; i++){
				slice = [];
				for (var j = 0, l = args.length, val; j < l; j++){
					val = args[j] instanceof Array ? args[j][i] : args[j];
					val = val;
					slice.push(val);
				}
				result[i] = fn.apply(this, slice);
			}
			return result;
		}
		else if (typeof a === 'object') {
			var result = {}, slice;
			for (var i in a){
				slice = [];
				for (var j = 0, l = args.length, val; j < l; j++){
					val = typeof args[j] === 'object' ? args[j][i] : args[j];
					val = val;
					slice.push(val);
				}
				result[i] = fn.apply(this, slice);
			}
			return result;
		}
		else {
			return fn.apply(this, args);
		}
	};
};
},{}],28:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],29:[function(require,module,exports){
module.exports = extend

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],"piano-keyboard":[function(require,module,exports){
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
proto.firstKey = 'C2';


/** Bind keyboard */
proto.keyboard = false;


/** Bind events */
proto.enable = function () {
	var self = this;

	self.element.removeAttribute('disabled');

	on(self.element, 'mousedown.' + self.id + ' touchstart' + self.id, function (e) {

		self.noteOn(e.target);

		on(self.element, 'mouseover.' + self.id, function (e) {
			self.noteOn(e.target);
		});
		on(self.element, 'mouseout.' + self.id, function (e) {
			self.noteOff();
		});

		on(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id + ' touchend.' + self.id, function (e) {

			self.noteOff();

			off(doc, 'mouseup.' + self.id + ' mouseleave.' + self.id + ' touchend.' + self.id);
			off(self.element, 'mouseover.' + self.id);
			off(self.element, 'mouseout.' + self.id);
		});
	});

	return self;
};


/** Parse note number from any arg */
function parseNote (note) {
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

	note = parseNote(note);

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

	note = parseNote(note);

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
},{"audio-context":"audio-context","domify":2,"emmy/delegate":3,"emmy/emit":4,"emmy/off":10,"emmy/on":11,"events":28,"get-uid":12,"inherits":13,"mucss/css":14,"mucss/selection":17,"mutype/is-array":19,"mutype/is-number":23,"mutype/is-string":25,"piano-key":"piano-key","xtend/mutable":29}],"piano-key":[function(require,module,exports){
/**
 * List of frequencies for piano key
 * @module  piano-key
 */

var loop = require('mumath/loop')


/** Note frequencies dict */
var key = {};


/** Get name for a number */
key.getName = function (number) {
	return key.notes[loop(number - 4, 12)] + Math.round((number + 3) / 12);
};


/** Get frequency for a number */
key.getFrequency = function (number) {
	if (typeof number === 'string') {
		number = key.getNumberFromName(number);
	}

	return Math.pow(2, (number - 49) / 12) * 440;
};


/** Get number for a name */
key.getNumber = function (frequency) {
	if (typeof frequency === 'string') {
		return key.getNumberFromName(frequency);
	}

	return 12 * Math.log(frequency / 440) / Math.log(2) + 49;
};


/** Get note number from note name */
key.getNumberFromName = function (name) {
	var note = /[a-z#]+/i.exec(name);

	note = (note.length ? note[0] : 'A').toUpperCase();

	//default octave is 0
	var octave = key.getOctave(name);

	var noteIdx = key.notes.indexOf(note);

	if (noteIdx < 0) {
		throw Error('Unknown note ' + name);
	}

	var noteNumber = (octave - 1) * 12 + noteIdx + 4;

	return noteNumber;
};


/** Test whether key number passed is black */
key.isBlack = function (name) {
	if (typeof name === 'number') {
		name = key.getName(name);
	}

	return /#/.test(name);
};


/** Return key octave by key number */
key.getOctave = function (name) {
	if (typeof name === 'number') {
		name = key.getName(name);
	}

	var octave = /-?[0-9.]+/.exec(name);

	//let default octave be 0
	if (octave.length) {
		return parseFloat(octave[0]);
	}
	else {
		return 0;
	}
};


/** List of note names */
key.notes = 'C C# D D# E F F# G G# A A# B'.split(' ');


module.exports = key;
},{"mumath/loop":26}]},{},[])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYXVkaW8tY29udGV4dCIsIm5vZGVfbW9kdWxlcy9hdWRpby1jb250ZXh0L25vZGVfbW9kdWxlcy9nbG9iYWwvd2luZG93LmpzIiwibm9kZV9tb2R1bGVzL2RvbWlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbW15L2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2VtbXkvZW1pdC5qcyIsIm5vZGVfbW9kdWxlcy9lbW15L2xpc3RlbmVycy5qcyIsIm5vZGVfbW9kdWxlcy9lbW15L25vZGVfbW9kdWxlcy9pY2ljbGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZW1teS9ub2RlX21vZHVsZXMvaXMtZnVuY3Rpb24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvZW1teS9ub2RlX21vZHVsZXMvc2xpY2VkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2VtbXkvbm9kZV9tb2R1bGVzL3NsaWNlZC9saWIvc2xpY2VkLmpzIiwibm9kZV9tb2R1bGVzL2VtbXkvb2ZmLmpzIiwibm9kZV9tb2R1bGVzL2VtbXkvb24uanMiLCJub2RlX21vZHVsZXMvZ2V0LXVpZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL211Y3NzL2Nzcy5qcyIsIm5vZGVfbW9kdWxlcy9tdWNzcy9mYWtlLWVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMvbXVjc3MvcHJlZml4LmpzIiwibm9kZV9tb2R1bGVzL211Y3NzL3NlbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9tdXR5cGUvaXMtYXJyYXktbGlrZS5qcyIsIm5vZGVfbW9kdWxlcy9tdXR5cGUvaXMtYXJyYXkuanMiLCJub2RlX21vZHVsZXMvbXV0eXBlL2lzLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL211dHlwZS9pcy1mbi5qcyIsIm5vZGVfbW9kdWxlcy9tdXR5cGUvaXMtbm9kZS5qcyIsIm5vZGVfbW9kdWxlcy9tdXR5cGUvaXMtbnVtYmVyLmpzIiwibm9kZV9tb2R1bGVzL211dHlwZS9pcy1vYmplY3QuanMiLCJub2RlX21vZHVsZXMvbXV0eXBlL2lzLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9waWFuby1rZXkvbm9kZV9tb2R1bGVzL211bWF0aC9sb29wLmpzIiwibm9kZV9tb2R1bGVzL3BpYW5vLWtleS9ub2RlX21vZHVsZXMvbXVtYXRoL3dyYXAuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMveHRlbmQvbXV0YWJsZS5qcyIsImluZGV4LmpzIiwicGlhbm8ta2V5Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciB3aW5kb3cgPSByZXF1aXJlKCdnbG9iYWwvd2luZG93Jyk7XG5cbnZhciBDb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuaWYgKENvbnRleHQpIG1vZHVsZS5leHBvcnRzID0gbmV3IENvbnRleHQ7XG4iLCJpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWw7XG59IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge307XG59XG4iLCJcbi8qKlxuICogRXhwb3NlIGBwYXJzZWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcblxuLyoqXG4gKiBUZXN0cyBmb3IgYnJvd3NlciBzdXBwb3J0LlxuICovXG5cbnZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbi8vIFNldHVwXG5kaXYuaW5uZXJIVE1MID0gJyAgPGxpbmsvPjx0YWJsZT48L3RhYmxlPjxhIGhyZWY9XCIvYVwiPmE8L2E+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiLz4nO1xuLy8gTWFrZSBzdXJlIHRoYXQgbGluayBlbGVtZW50cyBnZXQgc2VyaWFsaXplZCBjb3JyZWN0bHkgYnkgaW5uZXJIVE1MXG4vLyBUaGlzIHJlcXVpcmVzIGEgd3JhcHBlciBlbGVtZW50IGluIElFXG52YXIgaW5uZXJIVE1MQnVnID0gIWRpdi5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbGluaycpLmxlbmd0aDtcbmRpdiA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBXcmFwIG1hcCBmcm9tIGpxdWVyeS5cbiAqL1xuXG52YXIgbWFwID0ge1xuICBsZWdlbmQ6IFsxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PiddLFxuICB0cjogWzIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+J10sXG4gIGNvbDogWzIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+J10sXG4gIC8vIGZvciBzY3JpcHQvbGluay9zdHlsZSB0YWdzIHRvIHdvcmsgaW4gSUU2LTgsIHlvdSBoYXZlIHRvIHdyYXBcbiAgLy8gaW4gYSBkaXYgd2l0aCBhIG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciBpbiBmcm9udCwgaGEhXG4gIF9kZWZhdWx0OiBpbm5lckhUTUxCdWcgPyBbMSwgJ1g8ZGl2PicsICc8L2Rpdj4nXSA6IFswLCAnJywgJyddXG59O1xuXG5tYXAudGQgPVxubWFwLnRoID0gWzMsICc8dGFibGU+PHRib2R5Pjx0cj4nLCAnPC90cj48L3Rib2R5PjwvdGFibGU+J107XG5cbm1hcC5vcHRpb24gPVxubWFwLm9wdGdyb3VwID0gWzEsICc8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj4nLCAnPC9zZWxlY3Q+J107XG5cbm1hcC50aGVhZCA9XG5tYXAudGJvZHkgPVxubWFwLmNvbGdyb3VwID1cbm1hcC5jYXB0aW9uID1cbm1hcC50Zm9vdCA9IFsxLCAnPHRhYmxlPicsICc8L3RhYmxlPiddO1xuXG5tYXAucG9seWxpbmUgPVxubWFwLmVsbGlwc2UgPVxubWFwLnBvbHlnb24gPVxubWFwLmNpcmNsZSA9XG5tYXAudGV4dCA9XG5tYXAubGluZSA9XG5tYXAucGF0aCA9XG5tYXAucmVjdCA9XG5tYXAuZyA9IFsxLCAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmVyc2lvbj1cIjEuMVwiPicsJzwvc3ZnPiddO1xuXG4vKipcbiAqIFBhcnNlIGBodG1sYCBhbmQgcmV0dXJuIGEgRE9NIE5vZGUgaW5zdGFuY2UsIHdoaWNoIGNvdWxkIGJlIGEgVGV4dE5vZGUsXG4gKiBIVE1MIERPTSBOb2RlIG9mIHNvbWUga2luZCAoPGRpdj4gZm9yIGV4YW1wbGUpLCBvciBhIERvY3VtZW50RnJhZ21lbnRcbiAqIGluc3RhbmNlLCBkZXBlbmRpbmcgb24gdGhlIGNvbnRlbnRzIG9mIHRoZSBgaHRtbGAgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBodG1sIC0gSFRNTCBzdHJpbmcgdG8gXCJkb21pZnlcIlxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIC0gVGhlIGBkb2N1bWVudGAgaW5zdGFuY2UgdG8gY3JlYXRlIHRoZSBOb2RlIGZvclxuICogQHJldHVybiB7RE9NTm9kZX0gdGhlIFRleHROb2RlLCBET00gTm9kZSwgb3IgRG9jdW1lbnRGcmFnbWVudCBpbnN0YW5jZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2UoaHRtbCwgZG9jKSB7XG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgaHRtbCkgdGhyb3cgbmV3IFR5cGVFcnJvcignU3RyaW5nIGV4cGVjdGVkJyk7XG5cbiAgLy8gZGVmYXVsdCB0byB0aGUgZ2xvYmFsIGBkb2N1bWVudGAgb2JqZWN0XG4gIGlmICghZG9jKSBkb2MgPSBkb2N1bWVudDtcblxuICAvLyB0YWcgbmFtZVxuICB2YXIgbSA9IC88KFtcXHc6XSspLy5leGVjKGh0bWwpO1xuICBpZiAoIW0pIHJldHVybiBkb2MuY3JlYXRlVGV4dE5vZGUoaHRtbCk7XG5cbiAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpOyAvLyBSZW1vdmUgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlXG5cbiAgdmFyIHRhZyA9IG1bMV07XG5cbiAgLy8gYm9keSBzdXBwb3J0XG4gIGlmICh0YWcgPT0gJ2JvZHknKSB7XG4gICAgdmFyIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2h0bWwnKTtcbiAgICBlbC5pbm5lckhUTUwgPSBodG1sO1xuICAgIHJldHVybiBlbC5yZW1vdmVDaGlsZChlbC5sYXN0Q2hpbGQpO1xuICB9XG5cbiAgLy8gd3JhcCBtYXBcbiAgdmFyIHdyYXAgPSBtYXBbdGFnXSB8fCBtYXAuX2RlZmF1bHQ7XG4gIHZhciBkZXB0aCA9IHdyYXBbMF07XG4gIHZhciBwcmVmaXggPSB3cmFwWzFdO1xuICB2YXIgc3VmZml4ID0gd3JhcFsyXTtcbiAgdmFyIGVsID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBlbC5pbm5lckhUTUwgPSBwcmVmaXggKyBodG1sICsgc3VmZml4O1xuICB3aGlsZSAoZGVwdGgtLSkgZWwgPSBlbC5sYXN0Q2hpbGQ7XG5cbiAgLy8gb25lIGVsZW1lbnRcbiAgaWYgKGVsLmZpcnN0Q2hpbGQgPT0gZWwubGFzdENoaWxkKSB7XG4gICAgcmV0dXJuIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgLy8gc2V2ZXJhbCBlbGVtZW50c1xuICB2YXIgZnJhZ21lbnQgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn1cbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBlbW15L2RlbGVnYXRlXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWxlZ2F0ZTtcclxuXHJcbnZhciBvbiA9IHJlcXVpcmUoJy4vb24nKTtcclxudmFyIGlzRm4gPSByZXF1aXJlKCdpcy1mdW5jdGlvbicpO1xyXG52YXIgaXNTdHJpbmcgPSByZXF1aXJlKCdtdXR5cGUvaXMtc3RyaW5nJyk7XHJcbnZhciBpc0FycmF5TGlrZSA9IHJlcXVpcmUoJ211dHlwZS9pcy1hcnJheS1saWtlJyk7XHJcblxyXG5cclxuLyoqXHJcbiAqIEJpbmQgbGlzdGVuZXIgdG8gYSB0YXJnZXRcclxuICogbGlzdGVuaW5nIGZvciBhbGwgZXZlbnRzIGZyb20gaXTigJlzIGNoaWxkcmVuIG1hdGNoaW5nIHNlbGVjdG9yXHJcbiAqXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciBBIHNlbGVjdG9yIHRvIG1hdGNoIGFnYWluc3RcclxuICpcclxuICogQHJldHVybiB7ZnVuY3Rpb259IEEgY2FsbGJhY2tcclxuICovXHJcbmZ1bmN0aW9uIGRlbGVnYXRlICh0YXJnZXQsIGV2dCwgZm4sIHNlbGVjdG9yKSB7XHJcblx0cmV0dXJuIG9uKHRhcmdldCwgZXZ0LCBkZWxlZ2F0ZS53cmFwKHRhcmdldCwgZXZ0LCBmbiwgc2VsZWN0b3IpKTtcclxufVxyXG5cclxuXHJcbmRlbGVnYXRlLndyYXAgPSBmdW5jdGlvbiAoY29udGFpbmVyLCBldnQsIGZuLCBzZWxlY3Rvcikge1xyXG5cdC8vc3dhcCBwYXJhbXMsIGlmIG5lZWRlZFxyXG5cdGlmIChpc0ZuKHNlbGVjdG9yKSkge1xyXG5cdFx0dmFyIHRtcCA9IHNlbGVjdG9yO1xyXG5cdFx0c2VsZWN0b3IgPSBmbjtcclxuXHRcdGZuID0gdG1wO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9uLndyYXAoY29udGFpbmVyLCBldnQsIGZuLCBmdW5jdGlvbiBjYihlKSB7XHJcblx0XHR2YXIgc3JjRWwgPSBlLnRhcmdldDtcclxuXHJcblx0XHQvL2Rlbnkgc2VsZiBpbnN0YW50bHlcclxuXHRcdGlmIChzcmNFbCA9PT0gY29udGFpbmVyKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvL3dyYXAgdG8gZGV0ZWN0IGxpc3Qgb2Ygc2VsZWN0b3JzXHJcblx0XHRpZiAoIWlzQXJyYXlMaWtlKHNlbGVjdG9yKSkge1xyXG5cdFx0XHRzZWxlY3RvciA9IFtzZWxlY3Rvcl07XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHNlbGVjdG9yLnNvbWUoZnVuY3Rpb24gKHNlbGVjdG9yKSB7XHJcblx0XHRcdHZhciBkZWxlZ2F0ZVRhcmdldDtcclxuXHRcdFx0aWYgKCFpc1N0cmluZyhzZWxlY3RvcikpIHtcclxuXHRcdFx0XHRpZiAoIXNlbGVjdG9yLmNvbnRhaW5zKHNyY0VsKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdGRlbGVnYXRlVGFyZ2V0ID0gc2VsZWN0b3I7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly9maW5kIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluLWJldHdlZW4gZGVsZWdhdGUgdGFyZ2V0IGFuZCBldmVudCBzb3VyY2VcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0ZGVsZWdhdGVUYXJnZXQgPSBzcmNFbC5jbG9zZXN0KHNlbGVjdG9yKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGRlbGVnYXRlVGFyZ2V0ICYmIGNvbnRhaW5lciAhPT0gZGVsZWdhdGVUYXJnZXQgJiYgY29udGFpbmVyLmNvbnRhaW5zKGRlbGVnYXRlVGFyZ2V0KSkge1xyXG5cdFx0XHRcdC8vc2F2ZSBzb3VyY2Ugb2YgZXZlbnRcclxuXHRcdFx0XHRlLmRlbGVnYXRlVGFyZ2V0ID0gZGVsZWdhdGVUYXJnZXQ7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59OyIsIi8qKlxyXG4gKiBAbW9kdWxlIGVtbXkvZW1pdFxyXG4gKi9cclxudmFyIGljaWNsZSA9IHJlcXVpcmUoJ2ljaWNsZScpO1xyXG52YXIgc2xpY2UgPSByZXF1aXJlKCdzbGljZWQnKTtcclxudmFyIGlzU3RyaW5nID0gcmVxdWlyZSgnbXV0eXBlL2lzLXN0cmluZycpO1xyXG52YXIgaXNOb2RlID0gcmVxdWlyZSgnbXV0eXBlL2lzLW5vZGUnKTtcclxudmFyIGlzRXZlbnQgPSByZXF1aXJlKCdtdXR5cGUvaXMtZXZlbnQnKTtcclxudmFyIGxpc3RlbmVycyA9IHJlcXVpcmUoJy4vbGlzdGVuZXJzJyk7XHJcblxyXG5cclxuLyoqXHJcbiAqIEEgc2ltcGxlIHdyYXBwZXIgdG8gaGFuZGxlIHN0cmluZ3kvcGxhaW4gZXZlbnRzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgZXZ0KXtcclxuXHRpZiAoIXRhcmdldCkgcmV0dXJuO1xyXG5cclxuXHR2YXIgYXJncyA9IGFyZ3VtZW50cztcclxuXHRpZiAoaXNTdHJpbmcoZXZ0KSkge1xyXG5cdFx0YXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMik7XHJcblx0XHRldnQuc3BsaXQoL1xccysvKS5mb3JFYWNoKGZ1bmN0aW9uKGV2dCl7XHJcblx0XHRcdGV2dCA9IGV2dC5zcGxpdCgnLicpWzBdO1xyXG5cclxuXHRcdFx0ZW1pdC5hcHBseSh0aGlzLCBbdGFyZ2V0LCBldnRdLmNvbmNhdChhcmdzKSk7XHJcblx0XHR9KTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0cmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJncyk7XHJcblx0fVxyXG59O1xyXG5cclxuXHJcbi8qKiBkZXRlY3QgZW52ICovXHJcbnZhciAkID0gdHlwZW9mIGpRdWVyeSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBqUXVlcnk7XHJcbnZhciBkb2MgPSB0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogZG9jdW1lbnQ7XHJcbnZhciB3aW4gPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHdpbmRvdztcclxuXHJcblxyXG4vKipcclxuICogRW1pdCBhbiBldmVudCwgb3B0aW9uYWxseSB3aXRoIGRhdGEgb3IgYnViYmxpbmdcclxuICogQWNjZXB0IG9ubHkgc2luZ2xlIGVsZW1lbnRzL2V2ZW50c1xyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lIEFuIGV2ZW50IG5hbWUsIGUuIGcuICdjbGljaydcclxuICogQHBhcmFtIHsqfSBkYXRhIEFueSBkYXRhIHRvIHBhc3MgdG8gZXZlbnQuZGV0YWlscyAoRE9NKSBvciBldmVudC5kYXRhIChlbHNld2hlcmUpXHJcbiAqIEBwYXJhbSB7Ym9vbH0gYnViYmxlcyBXaGV0aGVyIHRvIHRyaWdnZXIgYnViYmxpbmcgZXZlbnQgKERPTSlcclxuICpcclxuICpcclxuICogQHJldHVybiB7dGFyZ2V0fSBhIHRhcmdldFxyXG4gKi9cclxuZnVuY3Rpb24gZW1pdCh0YXJnZXQsIGV2ZW50TmFtZSwgZGF0YSwgYnViYmxlcyl7XHJcblx0dmFyIGVtaXRNZXRob2QsIGV2dCA9IGV2ZW50TmFtZTtcclxuXHJcblx0Ly9DcmVhdGUgcHJvcGVyIGV2ZW50IGZvciBET00gb2JqZWN0c1xyXG5cdGlmIChpc05vZGUodGFyZ2V0KSB8fCB0YXJnZXQgPT09IHdpbikge1xyXG5cdFx0Ly9OT1RFOiB0aGlzIGRvZXNub3QgYnViYmxlIG9uIG9mZi1ET00gZWxlbWVudHNcclxuXHJcblx0XHRpZiAoaXNFdmVudChldmVudE5hbWUpKSB7XHJcblx0XHRcdGV2dCA9IGV2ZW50TmFtZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vSUU5LWNvbXBsaWFudCBjb25zdHJ1Y3RvclxyXG5cdFx0XHRldnQgPSBkb2MuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XHJcblx0XHRcdGV2dC5pbml0Q3VzdG9tRXZlbnQoZXZlbnROYW1lLCBidWJibGVzLCB0cnVlLCBkYXRhKTtcclxuXHJcblx0XHRcdC8vYSBtb2Rlcm4gY29uc3RydWN0b3Igd291bGQgYmU6XHJcblx0XHRcdC8vIHZhciBldnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnROYW1lLCB7IGRldGFpbDogZGF0YSwgYnViYmxlczogYnViYmxlcyB9KVxyXG5cdFx0fVxyXG5cclxuXHRcdGVtaXRNZXRob2QgPSB0YXJnZXQuZGlzcGF0Y2hFdmVudDtcclxuXHR9XHJcblxyXG5cdC8vY3JlYXRlIGV2ZW50IGZvciBqUXVlcnkgb2JqZWN0XHJcblx0ZWxzZSBpZiAoJCAmJiB0YXJnZXQgaW5zdGFuY2VvZiAkKSB7XHJcblx0XHQvL1RPRE86IGRlY2lkZSBob3cgdG8gcGFzcyBkYXRhXHJcblx0XHRldnQgPSAkLkV2ZW50KCBldmVudE5hbWUsIGRhdGEgKTtcclxuXHRcdGV2dC5kZXRhaWwgPSBkYXRhO1xyXG5cclxuXHRcdC8vRklYTUU6IHJlZmVyZW5jZSBjYXNlIHdoZXJlIHRyaWdnZXJIYW5kbGVyIG5lZWRlZCAoc29tZXRoaW5nIHdpdGggbXVsdGlwbGUgY2FsbHMpXHJcblx0XHRlbWl0TWV0aG9kID0gYnViYmxlcyA/IHRhcmd0ZS50cmlnZ2VyIDogdGFyZ2V0LnRyaWdnZXJIYW5kbGVyO1xyXG5cdH1cclxuXHJcblx0Ly9kZXRlY3QgdGFyZ2V0IGV2ZW50c1xyXG5cdGVsc2Uge1xyXG5cdFx0Ly9lbWl0IC0gZGVmYXVsdFxyXG5cdFx0Ly90cmlnZ2VyIC0ganF1ZXJ5XHJcblx0XHQvL2Rpc3BhdGNoRXZlbnQgLSBET01cclxuXHRcdC8vcmFpc2UgLSBub2RlLXN0YXRlXHJcblx0XHQvL2ZpcmUgLSA/Pz9cclxuXHRcdGVtaXRNZXRob2QgPSB0YXJnZXRbJ2Rpc3BhdGNoRXZlbnQnXSB8fCB0YXJnZXRbJ2VtaXQnXSB8fCB0YXJnZXRbJ3RyaWdnZXInXSB8fCB0YXJnZXRbJ2ZpcmUnXSB8fCB0YXJnZXRbJ3JhaXNlJ107XHJcblx0fVxyXG5cclxuXHJcblx0dmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDIpO1xyXG5cclxuXHJcblx0Ly91c2UgbG9ja3MgdG8gYXZvaWQgc2VsZi1yZWN1cnNpb24gb24gb2JqZWN0cyB3cmFwcGluZyB0aGlzIG1ldGhvZFxyXG5cdGlmIChlbWl0TWV0aG9kKSB7XHJcblx0XHRpZiAoaWNpY2xlLmZyZWV6ZSh0YXJnZXQsICdlbWl0JyArIGV2ZW50TmFtZSkpIHtcclxuXHRcdFx0Ly91c2UgdGFyZ2V0IGV2ZW50IHN5c3RlbSwgaWYgcG9zc2libGVcclxuXHRcdFx0ZW1pdE1ldGhvZC5hcHBseSh0YXJnZXQsIFtldnRdLmNvbmNhdChhcmdzKSk7XHJcblx0XHRcdGljaWNsZS51bmZyZWV6ZSh0YXJnZXQsICdlbWl0JyArIGV2ZW50TmFtZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vaWYgZXZlbnQgd2FzIGZyb3plbiAtIHByb2JhYmx5IGl0IGlzIGVtaXR0ZXIgaW5zdGFuY2VcclxuXHRcdC8vc28gcGVyZm9ybSBub3JtYWwgY2FsbGJhY2tcclxuXHR9XHJcblxyXG5cclxuXHQvL2ZhbGwgYmFjayB0byBkZWZhdWx0IGV2ZW50IHN5c3RlbVxyXG5cdHZhciBldnRDYWxsYmFja3MgPSBsaXN0ZW5lcnModGFyZ2V0LCBldnQpO1xyXG5cclxuXHQvL2NvcHkgY2FsbGJhY2tzIHRvIGZpcmUgYmVjYXVzZSBsaXN0IGNhbiBiZSBjaGFuZ2VkIGJ5IHNvbWUgY2FsbGJhY2sgKGxpa2UgYG9mZmApXHJcblx0dmFyIGZpcmVMaXN0ID0gc2xpY2UoZXZ0Q2FsbGJhY2tzKTtcclxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGZpcmVMaXN0Lmxlbmd0aDsgaSsrICkge1xyXG5cdFx0ZmlyZUxpc3RbaV0gJiYgZmlyZUxpc3RbaV0uYXBwbHkodGFyZ2V0LCBhcmdzKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0YXJnZXQ7XHJcbn0iLCIvKipcclxuICogQSBzdG9yYWdlIG9mIHBlci10YXJnZXQgY2FsbGJhY2tzLlxyXG4gKiBXZWFrTWFwIGlzIHRoZSBtb3N0IHNhZmUgc29sdXRpb24uXHJcbiAqXHJcbiAqIEBtb2R1bGUgZW1teS9saXN0ZW5lcnNcclxuICovXHJcblxyXG5cclxuLyoqXHJcbiAqIFByb3BlcnR5IG5hbWUgdG8gcHJvdmlkZSBvbiB0YXJnZXRzLlxyXG4gKlxyXG4gKiBDYW7igJl0IHVzZSBnbG9iYWwgV2Vha01hcCAtXHJcbiAqIGl0IGlzIGltcG9zc2libGUgdG8gcHJvdmlkZSBzaW5nbGV0b24gZ2xvYmFsIGNhY2hlIG9mIGNhbGxiYWNrcyBmb3IgdGFyZ2V0c1xyXG4gKiBub3QgcG9sbHV0aW5nIGdsb2JhbCBzY29wZS4gU28gaXQgaXMgYmV0dGVyIHRvIHBvbGx1dGUgdGFyZ2V0IHNjb3BlIHRoYW4gdGhlIGdsb2JhbC5cclxuICpcclxuICogT3RoZXJ3aXNlLCBlYWNoIGVtbXkgaW5zdGFuY2Ugd2lsbCBjcmVhdGUgaXTigJlzIG93biBjYWNoZSwgd2hpY2ggbGVhZHMgdG8gbWVzcy5cclxuICpcclxuICogQWxzbyBjYW7igJl0IHVzZSBgLl9ldmVudHNgIHByb3BlcnR5IG9uIHRhcmdldHMsIGFzIGl0IGlzIGRvbmUgaW4gYGV2ZW50c2AgbW9kdWxlLFxyXG4gKiBiZWNhdXNlIGl0IGlzIGluY29tcGF0aWJsZS4gRW1teSB0YXJnZXRzIHVuaXZlcnNhbCBldmVudHMgd3JhcHBlciwgbm90IHRoZSBuYXRpdmUgaW1wbGVtZW50YXRpb24uXHJcbiAqL1xyXG52YXIgY2JQcm9wTmFtZSA9ICdfY2FsbGJhY2tzJztcclxuXHJcblxyXG4vKipcclxuICogR2V0IGxpc3RlbmVycyBmb3IgdGhlIHRhcmdldC9ldnQgKG9wdGlvbmFsbHkpLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IGEgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0ge3N0cmluZ30/IGV2dCBhbiBldnQgbmFtZSwgaWYgdW5kZWZpbmVkIC0gcmV0dXJuIG9iamVjdCB3aXRoIGV2ZW50c1xyXG4gKlxyXG4gKiBAcmV0dXJuIHsob2JqZWN0fGFycmF5KX0gTGlzdC9zZXQgb2YgbGlzdGVuZXJzXHJcbiAqL1xyXG5mdW5jdGlvbiBsaXN0ZW5lcnModGFyZ2V0LCBldnQsIHRhZ3Mpe1xyXG5cdHZhciBjYnMgPSB0YXJnZXRbY2JQcm9wTmFtZV07XHJcblx0dmFyIHJlc3VsdDtcclxuXHJcblx0aWYgKCFldnQpIHtcclxuXHRcdHJlc3VsdCA9IGNicyB8fCB7fTtcclxuXHJcblx0XHQvL2ZpbHRlciBjYnMgYnkgdGFnc1xyXG5cdFx0aWYgKHRhZ3MpIHtcclxuXHRcdFx0dmFyIGZpbHRlcmVkUmVzdWx0ID0ge307XHJcblx0XHRcdGZvciAodmFyIGV2dCBpbiByZXN1bHQpIHtcclxuXHRcdFx0XHRmaWx0ZXJlZFJlc3VsdFtldnRdID0gcmVzdWx0W2V2dF0uZmlsdGVyKGZ1bmN0aW9uIChjYikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGhhc1RhZ3MoY2IsIHRhZ3MpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJlc3VsdCA9IGZpbHRlcmVkUmVzdWx0O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHRpZiAoIWNicyB8fCAhY2JzW2V2dF0pIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdHJlc3VsdCA9IGNic1tldnRdO1xyXG5cclxuXHQvL2lmIHRoZXJlIGFyZSBldnQgbmFtZXNwYWNlcyBzcGVjaWZpZWQgLSBmaWx0ZXIgY2FsbGJhY2tzXHJcblx0aWYgKHRhZ3MgJiYgdGFncy5sZW5ndGgpIHtcclxuXHRcdHJlc3VsdCA9IHJlc3VsdC5maWx0ZXIoZnVuY3Rpb24gKGNiKSB7XHJcblx0XHRcdHJldHVybiBoYXNUYWdzKGNiLCB0YWdzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgbGlzdGVuZXIsIGlmIGFueVxyXG4gKi9cclxubGlzdGVuZXJzLnJlbW92ZSA9IGZ1bmN0aW9uKHRhcmdldCwgZXZ0LCBjYiwgdGFncyl7XHJcblx0Ly9nZXQgY2FsbGJhY2tzIGZvciB0aGUgZXZ0XHJcblx0dmFyIGV2dENhbGxiYWNrcyA9IHRhcmdldFtjYlByb3BOYW1lXTtcclxuXHRpZiAoIWV2dENhbGxiYWNrcyB8fCAhZXZ0Q2FsbGJhY2tzW2V2dF0pIHJldHVybiBmYWxzZTtcclxuXHJcblx0dmFyIGNhbGxiYWNrcyA9IGV2dENhbGxiYWNrc1tldnRdO1xyXG5cclxuXHQvL2lmIHRhZ3MgYXJlIHBhc3NlZCAtIG1ha2Ugc3VyZSBjYWxsYmFjayBoYXMgc29tZSB0YWdzIGJlZm9yZSByZW1vdmluZ1xyXG5cdGlmICh0YWdzICYmIHRhZ3MubGVuZ3RoICYmICFoYXNUYWdzKGNiLCB0YWdzKSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHQvL3JlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXHJcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdC8vb25jZSBtZXRob2QgaGFzIG9yaWdpbmFsIGNhbGxiYWNrIGluIC5jYlxyXG5cdFx0aWYgKGNhbGxiYWNrc1tpXSA9PT0gY2IgfHwgY2FsbGJhY2tzW2ldLmZuID09PSBjYikge1xyXG5cdFx0XHRjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIEFkZCBhIG5ldyBsaXN0ZW5lclxyXG4gKi9cclxubGlzdGVuZXJzLmFkZCA9IGZ1bmN0aW9uKHRhcmdldCwgZXZ0LCBjYiwgdGFncyl7XHJcblx0aWYgKCFjYikgcmV0dXJuO1xyXG5cclxuXHR2YXIgdGFyZ2V0Q2FsbGJhY2tzID0gdGFyZ2V0W2NiUHJvcE5hbWVdO1xyXG5cclxuXHQvL2Vuc3VyZSBzZXQgb2YgY2FsbGJhY2tzIGZvciB0aGUgdGFyZ2V0IGV4aXN0c1xyXG5cdGlmICghdGFyZ2V0Q2FsbGJhY2tzKSB7XHJcblx0XHR0YXJnZXRDYWxsYmFja3MgPSB7fTtcclxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGNiUHJvcE5hbWUsIHtcclxuXHRcdFx0dmFsdWU6IHRhcmdldENhbGxiYWNrc1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvL3NhdmUgYSBuZXcgY2FsbGJhY2tcclxuXHQodGFyZ2V0Q2FsbGJhY2tzW2V2dF0gPSB0YXJnZXRDYWxsYmFja3NbZXZ0XSB8fCBbXSkucHVzaChjYik7XHJcblxyXG5cdC8vc2F2ZSBucyBmb3IgYSBjYWxsYmFjaywgaWYgYW55XHJcblx0aWYgKHRhZ3MgJiYgdGFncy5sZW5ndGgpIHtcclxuXHRcdGNiLl9ucyA9IHRhZ3M7XHJcblx0fVxyXG59O1xyXG5cclxuXHJcbi8qKiBEZXRlY3Qgd2hldGhlciBhbiBjYiBoYXMgYXQgbGVhc3Qgb25lIHRhZyBmcm9tIHRoZSBsaXN0ICovXHJcbmZ1bmN0aW9uIGhhc1RhZ3MoY2IsIHRhZ3Mpe1xyXG5cdGlmIChjYi5fbnMpIHtcclxuXHRcdC8vaWYgY2IgaXMgdGFnZ2VkIHdpdGggYSBucyBhbmQgaW5jbHVkZXMgb25lIG9mIHRoZSBucyBwYXNzZWQgLSBrZWVwIGl0XHJcblx0XHRmb3IgKHZhciBpID0gdGFncy5sZW5ndGg7IGktLTspe1xyXG5cdFx0XHRpZiAoY2IuX25zLmluZGV4T2YodGFnc1tpXSkgPj0gMCkgcmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBsaXN0ZW5lcnM7IiwiLyoqXHJcbiAqIEBtb2R1bGUgSWNpY2xlXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRmcmVlemU6IGxvY2ssXHJcblx0dW5mcmVlemU6IHVubG9jayxcclxuXHRpc0Zyb3plbjogaXNMb2NrZWRcclxufTtcclxuXHJcblxyXG4vKiogU2V0IG9mIHRhcmdldHMgICovXHJcbnZhciBsb2NrQ2FjaGUgPSBuZXcgV2Vha01hcDtcclxuXHJcblxyXG4vKipcclxuICogU2V0IGZsYWcgb24gdGFyZ2V0IHdpdGggdGhlIG5hbWUgcGFzc2VkXHJcbiAqXHJcbiAqIEByZXR1cm4ge2Jvb2x9IFdoZXRoZXIgbG9jayBzdWNjZWVkZWRcclxuICovXHJcbmZ1bmN0aW9uIGxvY2sodGFyZ2V0LCBuYW1lKXtcclxuXHR2YXIgbG9ja3MgPSBsb2NrQ2FjaGUuZ2V0KHRhcmdldCk7XHJcblx0aWYgKGxvY2tzICYmIGxvY2tzW25hbWVdKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdC8vY3JlYXRlIGxvY2sgc2V0IGZvciBhIHRhcmdldCwgaWYgbm9uZVxyXG5cdGlmICghbG9ja3MpIHtcclxuXHRcdGxvY2tzID0ge307XHJcblx0XHRsb2NrQ2FjaGUuc2V0KHRhcmdldCwgbG9ja3MpO1xyXG5cdH1cclxuXHJcblx0Ly9zZXQgYSBuZXcgbG9ja1xyXG5cdGxvY2tzW25hbWVdID0gdHJ1ZTtcclxuXHJcblx0Ly9yZXR1cm4gc3VjY2Vzc1xyXG5cdHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIFVuc2V0IGZsYWcgb24gdGhlIHRhcmdldCB3aXRoIHRoZSBuYW1lIHBhc3NlZC5cclxuICpcclxuICogTm90ZSB0aGF0IGlmIHRvIHJldHVybiBuZXcgdmFsdWUgZnJvbSB0aGUgbG9jay91bmxvY2ssXHJcbiAqIHRoZW4gdW5sb2NrIHdpbGwgYWx3YXlzIHJldHVybiBmYWxzZSBhbmQgbG9jayB3aWxsIGFsd2F5cyByZXR1cm4gdHJ1ZSxcclxuICogd2hpY2ggaXMgdXNlbGVzcyBmb3IgdGhlIHVzZXIsIHRob3VnaCBtYXliZSBpbnR1aXRpdmUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gdGFyZ2V0IEFueSBvYmplY3RcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgQSBmbGFnIG5hbWVcclxuICpcclxuICogQHJldHVybiB7Ym9vbH0gV2hldGhlciB1bmxvY2sgZmFpbGVkLlxyXG4gKi9cclxuZnVuY3Rpb24gdW5sb2NrKHRhcmdldCwgbmFtZSl7XHJcblx0dmFyIGxvY2tzID0gbG9ja0NhY2hlLmdldCh0YXJnZXQpO1xyXG5cdGlmICghbG9ja3MgfHwgIWxvY2tzW25hbWVdKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdGxvY2tzW25hbWVdID0gbnVsbDtcclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogUmV0dXJuIHdoZXRoZXIgZmxhZyBpcyBzZXRcclxuICpcclxuICogQHBhcmFtIHsqfSB0YXJnZXQgQW55IG9iamVjdCB0byBhc3NvY2lhdGUgbG9jayB3aXRoXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEEgZmxhZyBuYW1lXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFdoZXRoZXIgbG9ja2VkIG9yIG5vdFxyXG4gKi9cclxuZnVuY3Rpb24gaXNMb2NrZWQodGFyZ2V0LCBuYW1lKXtcclxuXHR2YXIgbG9ja3MgPSBsb2NrQ2FjaGUuZ2V0KHRhcmdldCk7XHJcblx0cmV0dXJuIChsb2NrcyAmJiBsb2Nrc1tuYW1lXSk7XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb25cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uIChmbikge1xuICB2YXIgc3RyaW5nID0gdG9TdHJpbmcuY2FsbChmbilcbiAgcmV0dXJuIHN0cmluZyA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyB8fFxuICAgICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgJiYgc3RyaW5nICE9PSAnW29iamVjdCBSZWdFeHBdJykgfHxcbiAgICAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgLy8gSUU4IGFuZCBiZWxvd1xuICAgICAoZm4gPT09IHdpbmRvdy5zZXRUaW1lb3V0IHx8XG4gICAgICBmbiA9PT0gd2luZG93LmFsZXJ0IHx8XG4gICAgICBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHxcbiAgICAgIGZuID09PSB3aW5kb3cucHJvbXB0KSlcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9zbGljZWQnKTtcbiIsIlxuLyoqXG4gKiBBbiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpIGFsdGVybmF0aXZlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFyZ3Mgc29tZXRoaW5nIHdpdGggYSBsZW5ndGhcbiAqIEBwYXJhbSB7TnVtYmVyfSBzbGljZVxuICogQHBhcmFtIHtOdW1iZXJ9IHNsaWNlRW5kXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3MsIHNsaWNlLCBzbGljZUVuZCkge1xuICB2YXIgcmV0ID0gW107XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcblxuICBpZiAoMCA9PT0gbGVuKSByZXR1cm4gcmV0O1xuXG4gIHZhciBzdGFydCA9IHNsaWNlIDwgMFxuICAgID8gTWF0aC5tYXgoMCwgc2xpY2UgKyBsZW4pXG4gICAgOiBzbGljZSB8fCAwO1xuXG4gIGlmIChzbGljZUVuZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuID0gc2xpY2VFbmQgPCAwXG4gICAgICA/IHNsaWNlRW5kICsgbGVuXG4gICAgICA6IHNsaWNlRW5kXG4gIH1cblxuICB3aGlsZSAobGVuLS0gPiBzdGFydCkge1xuICAgIHJldFtsZW4gLSBzdGFydF0gPSBhcmdzW2xlbl07XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG4iLCIvKipcclxuICogQG1vZHVsZSBlbW15L29mZlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBvZmY7XHJcblxyXG52YXIgaWNpY2xlID0gcmVxdWlyZSgnaWNpY2xlJyk7XHJcbnZhciBzbGljZSA9IHJlcXVpcmUoJ3NsaWNlZCcpO1xyXG52YXIgbGlzdGVuZXJzID0gcmVxdWlyZSgnLi9saXN0ZW5lcnMnKTtcclxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdtdXR5cGUvaXMtYXJyYXknKTtcclxuXHJcblxyXG4vKipcclxuICogUmVtb3ZlIGxpc3RlbmVyW3NdIGZyb20gdGhlIHRhcmdldFxyXG4gKlxyXG4gKiBAcGFyYW0ge1t0eXBlXX0gZXZ0IFtkZXNjcmlwdGlvbl1cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gW2Rlc2NyaXB0aW9uXVxyXG4gKlxyXG4gKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cclxuICovXHJcbmZ1bmN0aW9uIG9mZih0YXJnZXQsIGV2dCwgZm4pIHtcclxuXHRpZiAoIXRhcmdldCkgcmV0dXJuIHRhcmdldDtcclxuXHJcblx0dmFyIGNhbGxiYWNrcywgaTtcclxuXHJcblx0Ly91bmJpbmQgYWxsIGxpc3RlbmVycyBpZiBubyBmbiBzcGVjaWZpZWRcclxuXHRpZiAoZm4gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0dmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xyXG5cclxuXHRcdC8vdHJ5IHRvIHVzZSB0YXJnZXQgcmVtb3ZlQWxsIG1ldGhvZCwgaWYgYW55XHJcblx0XHR2YXIgYWxsT2ZmID0gdGFyZ2V0WydyZW1vdmVBbGwnXSB8fCB0YXJnZXRbJ3JlbW92ZUFsbExpc3RlbmVycyddO1xyXG5cclxuXHRcdC8vY2FsbCB0YXJnZXQgcmVtb3ZlQWxsXHJcblx0XHRpZiAoYWxsT2ZmKSB7XHJcblx0XHRcdGFsbE9mZi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHQvL3RoZW4gZm9yZ2V0IG93biBjYWxsYmFja3MsIGlmIGFueVxyXG5cclxuXHRcdC8vdW5iaW5kIGFsbCBldnRzXHJcblx0XHRpZiAoIWV2dCkge1xyXG5cdFx0XHRjYWxsYmFja3MgPSBsaXN0ZW5lcnModGFyZ2V0KTtcclxuXHRcdFx0Zm9yIChldnQgaW4gY2FsbGJhY2tzKSB7XHJcblx0XHRcdFx0b2ZmKHRhcmdldCwgZXZ0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Ly91bmJpbmQgYWxsIGNhbGxiYWNrcyBmb3IgYW4gZXZ0XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZXZ0ID0gJycgKyBldnQ7XHJcblxyXG5cdFx0XHQvL2ludm9rZSBtZXRob2QgZm9yIGVhY2ggc3BhY2Utc2VwYXJhdGVkIGV2ZW50IGZyb20gYSBsaXN0XHJcblx0XHRcdGV2dC5zcGxpdCgvXFxzKy8pLmZvckVhY2goZnVuY3Rpb24gKGV2dCkge1xyXG5cdFx0XHRcdHZhciBldnRQYXJ0cyA9IGV2dC5zcGxpdCgnLicpO1xyXG5cdFx0XHRcdGV2dCA9IGV2dFBhcnRzLnNoaWZ0KCk7XHJcblx0XHRcdFx0Y2FsbGJhY2tzID0gbGlzdGVuZXJzKHRhcmdldCwgZXZ0LCBldnRQYXJ0cyk7XHJcblxyXG5cdFx0XHRcdC8vcmV0dXJuZWQgYXJyYXkgb2YgY2FsbGJhY2tzIChhcyBldmVudCBpcyBkZWZpbmVkKVxyXG5cdFx0XHRcdGlmIChldnQpIHtcclxuXHRcdFx0XHRcdHZhciBvYmogPSB7fTtcclxuXHRcdFx0XHRcdG9ialtldnRdID0gY2FsbGJhY2tzO1xyXG5cdFx0XHRcdFx0Y2FsbGJhY2tzID0gb2JqO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly9mb3IgZWFjaCBncm91cCBvZiBjYWxsYmFja3MgLSB1bmJpbmQgYWxsXHJcblx0XHRcdFx0Zm9yICh2YXIgZXZ0TmFtZSBpbiBjYWxsYmFja3MpIHtcclxuXHRcdFx0XHRcdHNsaWNlKGNhbGxiYWNrc1tldnROYW1lXSkuZm9yRWFjaChmdW5jdGlvbiAoY2IpIHtcclxuXHRcdFx0XHRcdFx0b2ZmKHRhcmdldCwgZXZ0TmFtZSwgY2IpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGFyZ2V0O1xyXG5cdH1cclxuXHJcblxyXG5cdC8vdGFyZ2V0IGV2ZW50cyAoc3RyaW5nIG5vdGF0aW9uIHRvIGFkdmFuY2VkX29wdGltaXphdGlvbnMpXHJcblx0dmFyIG9mZk1ldGhvZCA9IHRhcmdldFsncmVtb3ZlRXZlbnRMaXN0ZW5lciddIHx8IHRhcmdldFsncmVtb3ZlTGlzdGVuZXInXSB8fCB0YXJnZXRbJ2RldGFjaEV2ZW50J10gfHwgdGFyZ2V0WydvZmYnXTtcclxuXHJcblx0Ly9pbnZva2UgbWV0aG9kIGZvciBlYWNoIHNwYWNlLXNlcGFyYXRlZCBldmVudCBmcm9tIGEgbGlzdFxyXG5cdGV2dC5zcGxpdCgvXFxzKy8pLmZvckVhY2goZnVuY3Rpb24gKGV2dCkge1xyXG5cdFx0dmFyIGV2dFBhcnRzID0gZXZ0LnNwbGl0KCcuJyk7XHJcblx0XHRldnQgPSBldnRQYXJ0cy5zaGlmdCgpO1xyXG5cclxuXHRcdC8vdXNlIHRhcmdldCBgb2ZmYCwgaWYgcG9zc2libGVcclxuXHRcdGlmIChvZmZNZXRob2QpIHtcclxuXHRcdFx0Ly9hdm9pZCBzZWxmLXJlY3Vyc2lvbiBmcm9tIHRoZSBvdXRzaWRlXHJcblx0XHRcdGlmIChpY2ljbGUuZnJlZXplKHRhcmdldCwgJ29mZicgKyBldnQpKSB7XHJcblx0XHRcdFx0b2ZmTWV0aG9kLmNhbGwodGFyZ2V0LCBldnQsIGZuKTtcclxuXHRcdFx0XHRpY2ljbGUudW5mcmVlemUodGFyZ2V0LCAnb2ZmJyArIGV2dCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vaWYgaXTigJlzIGZyb3plbiAtIGlnbm9yZSBjYWxsXHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdHJldHVybiB0YXJnZXQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZm4uY2xvc2VkQ2FsbCkgZm4uY2xvc2VkQ2FsbCA9IGZhbHNlO1xyXG5cclxuXHRcdC8vZm9yZ2V0IGNhbGxiYWNrXHJcblx0XHRsaXN0ZW5lcnMucmVtb3ZlKHRhcmdldCwgZXZ0LCBmbiwgZXZ0UGFydHMpO1xyXG5cdH0pO1xyXG5cclxuXHJcblx0cmV0dXJuIHRhcmdldDtcclxufSIsIi8qKlxuICogQG1vZHVsZSBlbW15L29uXG4gKi9cblxuXG52YXIgaWNpY2xlID0gcmVxdWlyZSgnaWNpY2xlJyk7XG52YXIgbGlzdGVuZXJzID0gcmVxdWlyZSgnLi9saXN0ZW5lcnMnKTtcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJ211dHlwZS9pcy1vYmplY3QnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBvbjtcblxuXG4vKipcbiAqIEJpbmQgZm4gdG8gYSB0YXJnZXQuXG4gKlxuICogQHBhcmFtIHsqfSB0YXJndGUgQSBzaW5nbGUgdGFyZ2V0IHRvIGJpbmQgZXZ0XG4gKiBAcGFyYW0ge3N0cmluZ30gZXZ0IEFuIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEEgY2FsbGJhY2tcbiAqIEBwYXJhbSB7RnVuY3Rpb259PyBjb25kaXRpb24gQW4gb3B0aW9uYWwgZmlsdGVyaW5nIGZuIGZvciBhIGNhbGxiYWNrXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIGFjY2VwdHMgYW4gZXZlbnQgYW5kIHJldHVybnMgY2FsbGJhY2tcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IEEgdGFyZ2V0XG4gKi9cbmZ1bmN0aW9uIG9uKHRhcmdldCwgZXZ0LCBmbil7XG5cdGlmICghdGFyZ2V0KSByZXR1cm4gdGFyZ2V0O1xuXG5cdC8vY29uc2lkZXIgb2JqZWN0IG9mIGV2ZW50c1xuXHRpZiAoaXNPYmplY3QoZXZ0KSkge1xuXHRcdGZvcih2YXIgZXZ0TmFtZSBpbiBldnQpIHtcblx0XHRcdG9uKHRhcmdldCwgZXZ0TmFtZSwgZXZ0W2V2dE5hbWVdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRhcmdldDtcblx0fVxuXG5cdC8vZ2V0IHRhcmdldCBgb25gIG1ldGhvZCwgaWYgYW55XG5cdC8vcHJlZmVyIG5hdGl2ZS1saWtlIG1ldGhvZCBuYW1lXG5cdC8vdXNlciBtYXkgb2NjYXNpb25hbGx5IGV4cG9zZSBgb25gIHRvIHRoZSBnbG9iYWwsIGluIGNhc2Ugb2YgYnJvd3NlcmlmeVxuXHQvL2J1dCBpdCBpcyB1bmxpa2VseSBvbmUgd291bGQgcmVwbGFjZSBuYXRpdmUgYGFkZEV2ZW50TGlzdGVuZXJgXG5cdHZhciBvbk1ldGhvZCA9ICB0YXJnZXRbJ2FkZEV2ZW50TGlzdGVuZXInXSB8fCB0YXJnZXRbJ2FkZExpc3RlbmVyJ10gfHwgdGFyZ2V0WydhdHRhY2hFdmVudCddIHx8IHRhcmdldFsnb24nXTtcblxuXHR2YXIgY2IgPSBmbjtcblxuXHRldnQgPSAnJyArIGV2dDtcblxuXHQvL2ludm9rZSBtZXRob2QgZm9yIGVhY2ggc3BhY2Utc2VwYXJhdGVkIGV2ZW50IGZyb20gYSBsaXN0XG5cdGV2dC5zcGxpdCgvXFxzKy8pLmZvckVhY2goZnVuY3Rpb24oZXZ0KXtcblx0XHR2YXIgZXZ0UGFydHMgPSBldnQuc3BsaXQoJy4nKTtcblx0XHRldnQgPSBldnRQYXJ0cy5zaGlmdCgpO1xuXG5cdFx0Ly91c2UgdGFyZ2V0IGV2ZW50IHN5c3RlbSwgaWYgcG9zc2libGVcblx0XHRpZiAob25NZXRob2QpIHtcblx0XHRcdC8vYXZvaWQgc2VsZi1yZWN1cnNpb25zXG5cdFx0XHQvL2lmIGl04oCZcyBmcm96ZW4gLSBpZ25vcmUgY2FsbFxuXHRcdFx0aWYgKGljaWNsZS5mcmVlemUodGFyZ2V0LCAnb24nICsgZXZ0KSl7XG5cdFx0XHRcdG9uTWV0aG9kLmNhbGwodGFyZ2V0LCBldnQsIGNiKTtcblx0XHRcdFx0aWNpY2xlLnVuZnJlZXplKHRhcmdldCwgJ29uJyArIGV2dCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL3NhdmUgdGhlIGNhbGxiYWNrIGFueXdheVxuXHRcdGxpc3RlbmVycy5hZGQodGFyZ2V0LCBldnQsIGNiLCBldnRQYXJ0cyk7XG5cdH0pO1xuXG5cdHJldHVybiB0YXJnZXQ7XG59XG5cblxuLyoqXG4gKiBXcmFwIGFuIGZuIHdpdGggY29uZGl0aW9uIHBhc3NpbmdcbiAqL1xub24ud3JhcCA9IGZ1bmN0aW9uKHRhcmdldCwgZXZ0LCBmbiwgY29uZGl0aW9uKXtcblx0dmFyIGNiID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbmRpdGlvbi5hcHBseSh0YXJnZXQsIGFyZ3VtZW50cykpIHtcblx0XHRcdHJldHVybiBmbi5hcHBseSh0YXJnZXQsIGFyZ3VtZW50cyk7XG5cdFx0fVxuXHR9O1xuXG5cdGNiLmZuID0gZm47XG5cblx0cmV0dXJuIGNiO1xufTsiLCIvKiogZ2VuZXJhdGUgdW5pcXVlIGlkIGZvciBzZWxlY3RvciAqL1xyXG52YXIgY291bnRlciA9IERhdGUubm93KCkgJSAxZTk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFVpZCgpe1xyXG5cdHJldHVybiAoTWF0aC5yYW5kb20oKSAqIDFlOSA+Pj4gMCkgKyAoY291bnRlcisrKTtcclxufTsiLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8qKlxyXG4gKiBHZXQgb3Igc2V0IGVsZW1lbnTigJlzIHN0eWxlLCBwcmVmaXgtYWdub3N0aWMuXHJcbiAqXHJcbiAqIEBtb2R1bGUgIG11Y3NzL2Nzc1xyXG4gKi9cclxudmFyIGZha2VTdHlsZSA9IHJlcXVpcmUoJy4vZmFrZS1lbGVtZW50Jykuc3R5bGU7XHJcbnZhciBwcmVmaXggPSByZXF1aXJlKCcuL3ByZWZpeCcpLmxvd2VyY2FzZTtcclxuXHJcblxyXG4vKipcclxuICogQXBwbHkgc3R5bGVzIHRvIGFuIGVsZW1lbnQuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICB7RWxlbWVudH0gICBlbCAgIEFuIGVsZW1lbnQgdG8gYXBwbHkgc3R5bGVzLlxyXG4gKiBAcGFyYW0gICAge09iamVjdHxzdHJpbmd9ICAgb2JqICAgU2V0IG9mIHN0eWxlIHJ1bGVzIG9yIHN0cmluZyB0byBnZXQgc3R5bGUgcnVsZS5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWwsIG9iail7XHJcblx0aWYgKCFlbCB8fCAhb2JqKSByZXR1cm47XHJcblxyXG5cdHZhciBuYW1lLCB2YWx1ZTtcclxuXHJcblx0Ly9yZXR1cm4gdmFsdWUsIGlmIHN0cmluZyBwYXNzZWRcclxuXHRpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcclxuXHRcdG5hbWUgPSBvYmo7XHJcblxyXG5cdFx0Ly9yZXR1cm4gdmFsdWUsIGlmIG5vIHZhbHVlIHBhc3NlZFxyXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XHJcblx0XHRcdHJldHVybiBlbC5zdHlsZVtwcmVmaXhpemUobmFtZSldO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vc2V0IHN0eWxlLCBpZiB2YWx1ZSBwYXNzZWRcclxuXHRcdHZhbHVlID0gYXJndW1lbnRzWzJdIHx8ICcnO1xyXG5cdFx0b2JqID0ge307XHJcblx0XHRvYmpbbmFtZV0gPSB2YWx1ZTtcclxuXHR9XHJcblxyXG5cdGZvciAobmFtZSBpbiBvYmope1xyXG5cdFx0Ly9jb252ZXJ0IG51bWJlcnMgdG8gcHhcclxuXHRcdGlmICh0eXBlb2Ygb2JqW25hbWVdID09PSAnbnVtYmVyJyAmJiAvbGVmdHxyaWdodHxib3R0b218dG9wfHdpZHRofGhlaWdodC9pLnRlc3QobmFtZSkpIG9ialtuYW1lXSArPSAncHgnO1xyXG5cclxuXHRcdHZhbHVlID0gb2JqW25hbWVdIHx8ICcnO1xyXG5cclxuXHRcdGVsLnN0eWxlW3ByZWZpeGl6ZShuYW1lKV0gPSB2YWx1ZTtcclxuXHR9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFJldHVybiBwcmVmaXhpemVkIHByb3AgbmFtZSwgaWYgbmVlZGVkLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAge3N0cmluZ30gICBuYW1lICAgQSBwcm9wZXJ0eSBuYW1lLlxyXG4gKiBAcmV0dXJuICAge3N0cmluZ30gICBQcmVmaXhlZCBwcm9wZXJ0eSBuYW1lLlxyXG4gKi9cclxuZnVuY3Rpb24gcHJlZml4aXplKG5hbWUpe1xyXG5cdHZhciB1TmFtZSA9IG5hbWVbMF0udG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSk7XHJcblx0aWYgKGZha2VTdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gbmFtZTtcclxuXHRpZiAoZmFrZVN0eWxlW3ByZWZpeCArIHVOYW1lXSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcHJlZml4ICsgdU5hbWU7XHJcblx0cmV0dXJuICcnO1xyXG59XHJcbiIsIi8qKiBKdXN0IGEgZmFrZSBlbGVtZW50IHRvIHRlc3Qgc3R5bGVzXHJcbiAqIEBtb2R1bGUgbXVjc3MvZmFrZS1lbGVtZW50XHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsiLCIvKipcclxuICogVmVuZG9yIHByZWZpeGVzXHJcbiAqIE1ldGhvZCBvZiBodHRwOi8vZGF2aWR3YWxzaC5uYW1lL3ZlbmRvci1wcmVmaXhcclxuICogQG1vZHVsZSBtdWNzcy9wcmVmaXhcclxuICovXHJcblxyXG52YXIgc3R5bGVzID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICcnKTtcclxuXHJcbnZhciBwcmUgPSAoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoc3R5bGVzKVxyXG5cdC5qb2luKCcnKVxyXG5cdC5tYXRjaCgvLShtb3p8d2Via2l0fG1zKS0vKSB8fCAoc3R5bGVzLk9MaW5rID09PSAnJyAmJiBbJycsICdvJ10pXHJcbilbMV07XHJcblxyXG5kb20gPSAoJ1dlYktpdHxNb3p8TVN8TycpLm1hdGNoKG5ldyBSZWdFeHAoJygnICsgcHJlICsgJyknLCAnaScpKVsxXTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGRvbTogZG9tLFxyXG5cdGxvd2VyY2FzZTogcHJlLFxyXG5cdGNzczogJy0nICsgcHJlICsgJy0nLFxyXG5cdGpzOiBwcmVbMF0udG9VcHBlckNhc2UoKSArIHByZS5zdWJzdHIoMSlcclxufTsiLCIvKipcclxuICogRW5hYmxlL2Rpc2FibGUgc2VsZWN0YWJpbGl0eSBvZiBhbiBlbGVtZW50XHJcbiAqIEBtb2R1bGUgbXVjc3Mvc2VsZWN0aW9uXHJcbiAqL1xyXG52YXIgY3NzID0gcmVxdWlyZSgnLi9jc3MnKTtcclxuXHJcblxyXG4vKipcclxuICogRGlzYWJsZSBvciBFbmFibGUgYW55IHNlbGVjdGlvbiBwb3NzaWJpbGl0aWVzIGZvciBhbiBlbGVtZW50LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAge0VsZW1lbnR9ICAgZWwgICBUYXJnZXQgdG8gbWFrZSB1bnNlbGVjdGFibGUuXHJcbiAqL1xyXG5leHBvcnRzLmRpc2FibGUgPSBmdW5jdGlvbihlbCl7XHJcblx0Y3NzKGVsLCB7XHJcblx0XHQndXNlci1zZWxlY3QnOiAnbm9uZScsXHJcblx0XHQndXNlci1kcmFnJzogJ25vbmUnLFxyXG5cdFx0J3RvdWNoLWNhbGxvdXQnOiAnbm9uZSdcclxuXHR9KTtcclxuXHRlbC5zZXRBdHRyaWJ1dGUoJ3Vuc2VsZWN0YWJsZScsICdvbicpO1xyXG5cdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgcGQpO1xyXG59O1xyXG5leHBvcnRzLmVuYWJsZSA9IGZ1bmN0aW9uKGVsKXtcclxuXHRjc3MoZWwsIHtcclxuXHRcdCd1c2VyLXNlbGVjdCc6IG51bGwsXHJcblx0XHQndXNlci1kcmFnJzogbnVsbCxcclxuXHRcdCd0b3VjaC1jYWxsb3V0JzogbnVsbFxyXG5cdH0pO1xyXG5cdGVsLnJlbW92ZUF0dHJpYnV0ZSgndW5zZWxlY3RhYmxlJyk7XHJcblx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2VsZWN0c3RhcnQnLCBwZCk7XHJcbn07XHJcblxyXG5cclxuLyoqIFByZXZlbnQgeW91IGtub3cgd2hhdC4gKi9cclxuZnVuY3Rpb24gcGQoZSl7XHJcblx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59IiwidmFyIGlzU3RyaW5nID0gcmVxdWlyZSgnLi9pcy1zdHJpbmcnKTtcclxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCcuL2lzLWFycmF5Jyk7XHJcbnZhciBpc0ZuID0gcmVxdWlyZSgnLi9pcy1mbicpO1xyXG5cclxuLy9GSVhNRTogYWRkIHRlc3RzIGZyb20gaHR0cDovL2pzZmlkZGxlLm5ldC9rdTlMUy8xL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhKXtcclxuXHRyZXR1cm4gaXNBcnJheShhKSB8fCAoYSAmJiAhaXNTdHJpbmcoYSkgJiYgIWEubm9kZVR5cGUgJiYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyBhICE9IHdpbmRvdyA6IHRydWUpICYmICFpc0ZuKGEpICYmIHR5cGVvZiBhLmxlbmd0aCA9PT0gJ251bWJlcicpO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhKXtcclxuXHRyZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5O1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpe1xyXG5cdHJldHVybiB0eXBlb2YgRXZlbnQgIT09ICd1bmRlZmluZWQnICYmIHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50O1xyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYSl7XHJcblx0cmV0dXJuICEhKGEgJiYgYS5hcHBseSk7XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCl7XHJcblx0cmV0dXJuIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGFyZ2V0IGluc3RhbmNlb2YgTm9kZTtcclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGEpe1xyXG5cdHJldHVybiB0eXBlb2YgYSA9PT0gJ251bWJlcicgfHwgYSBpbnN0YW5jZW9mIE51bWJlcjtcclxufSIsIi8qKlxyXG4gKiBAbW9kdWxlIG11dHlwZS9pcy1vYmplY3RcclxuICovXHJcblxyXG4vL1RPRE86IGFkZCBzdDggdGVzdHNcclxuXHJcbi8vaXNQbGFpbk9iamVjdCBpbmRlZWRcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvKXtcclxuXHQvLyByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcclxuXHRyZXR1cm4gISFvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBvLmNvbnN0cnVjdG9yID09PSBPYmplY3Q7XHJcbn07XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYSl7XHJcblx0cmV0dXJuIHR5cGVvZiBhID09PSAnc3RyaW5nJyB8fCBhIGluc3RhbmNlb2YgU3RyaW5nO1xyXG59IiwiLyoqXHJcbiAqIEBtb2R1bGUgIG11bWF0aC9sb29wXHJcbiAqXHJcbiAqIExvb3BpbmcgZnVuY3Rpb24gZm9yIGFueSBmcmFtZXNpemVcclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vd3JhcCcpKGZ1bmN0aW9uICh2YWx1ZSwgbGVmdCwgcmlnaHQpIHtcclxuXHQvL2RldGVjdCBzaW5nbGUtYXJnIGNhc2UsIGxpa2UgbW9kLWxvb3BcclxuXHRpZiAocmlnaHQgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0cmlnaHQgPSBsZWZ0O1xyXG5cdFx0bGVmdCA9IDA7XHJcblx0fVxyXG5cclxuXHQvL3N3YXAgZnJhbWUgb3JkZXJcclxuXHRpZiAobGVmdCA+IHJpZ2h0KSB7XHJcblx0XHR2YXIgdG1wID0gcmlnaHQ7XHJcblx0XHRyaWdodCA9IGxlZnQ7XHJcblx0XHRsZWZ0ID0gdG1wO1xyXG5cdH1cclxuXHJcblx0dmFyIGZyYW1lID0gcmlnaHQgLSBsZWZ0O1xyXG5cclxuXHR2YWx1ZSA9ICgodmFsdWUgKyBsZWZ0KSAlIGZyYW1lKSAtIGxlZnQ7XHJcblx0aWYgKHZhbHVlIDwgbGVmdCkgdmFsdWUgKz0gZnJhbWU7XHJcblx0aWYgKHZhbHVlID4gcmlnaHQpIHZhbHVlIC09IGZyYW1lO1xyXG5cclxuXHRyZXR1cm4gdmFsdWU7XHJcbn0pOyIsIi8qKlxyXG4gKiBHZXQgZm4gd3JhcHBlZCB3aXRoIGFycmF5L29iamVjdCBhdHRycyByZWNvZ25pdGlvblxyXG4gKlxyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGFyZ2V0IGZ1bmN0aW9uXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKXtcclxuXHRyZXR1cm4gZnVuY3Rpb24oYSl7XHJcblx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcclxuXHRcdGlmIChhIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuXHRcdFx0dmFyIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCksIHNsaWNlO1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRcdHNsaWNlID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDAsIGwgPSBhcmdzLmxlbmd0aCwgdmFsOyBqIDwgbDsgaisrKXtcclxuXHRcdFx0XHRcdHZhbCA9IGFyZ3Nbal0gaW5zdGFuY2VvZiBBcnJheSA/IGFyZ3Nbal1baV0gOiBhcmdzW2pdO1xyXG5cdFx0XHRcdFx0dmFsID0gdmFsO1xyXG5cdFx0XHRcdFx0c2xpY2UucHVzaCh2YWwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXN1bHRbaV0gPSBmbi5hcHBseSh0aGlzLCBzbGljZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHR5cGVvZiBhID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHR2YXIgcmVzdWx0ID0ge30sIHNsaWNlO1xyXG5cdFx0XHRmb3IgKHZhciBpIGluIGEpe1xyXG5cdFx0XHRcdHNsaWNlID0gW107XHJcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDAsIGwgPSBhcmdzLmxlbmd0aCwgdmFsOyBqIDwgbDsgaisrKXtcclxuXHRcdFx0XHRcdHZhbCA9IHR5cGVvZiBhcmdzW2pdID09PSAnb2JqZWN0JyA/IGFyZ3Nbal1baV0gOiBhcmdzW2pdO1xyXG5cdFx0XHRcdFx0dmFsID0gdmFsO1xyXG5cdFx0XHRcdFx0c2xpY2UucHVzaCh2YWwpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXN1bHRbaV0gPSBmbi5hcHBseSh0aGlzLCBzbGljZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncyk7XHJcblx0XHR9XHJcblx0fTtcclxufTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQodGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIi8qKlxyXG4gKiBAbW9kdWxlIHBpYW5vLWtleWJvYXJkXHJcbiAqL1xyXG5cclxudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcclxudmFyIGluaGVyaXQgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQvbXV0YWJsZScpO1xyXG52YXIga2V5ID0gcmVxdWlyZSgncGlhbm8ta2V5Jyk7XHJcbnZhciBkb2MgPSBkb2N1bWVudDtcclxudmFyIGRvbWlmeSA9IHJlcXVpcmUoJ2RvbWlmeScpO1xyXG52YXIgb24gPSByZXF1aXJlKCdlbW15L29uJyk7XHJcbnZhciBlbWl0ID0gcmVxdWlyZSgnZW1teS9lbWl0Jyk7XHJcbnZhciBkZWxlZ2F0ZSA9IHJlcXVpcmUoJ2VtbXkvZGVsZWdhdGUnKTtcclxudmFyIG9mZiA9IHJlcXVpcmUoJ2VtbXkvb2ZmJyk7XHJcbnZhciBnZXRVaWQgPSByZXF1aXJlKCdnZXQtdWlkJyk7XHJcbnZhciBpc1N0cmluZyA9IHJlcXVpcmUoJ211dHlwZS9pcy1zdHJpbmcnKTtcclxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdtdXR5cGUvaXMtYXJyYXknKTtcclxudmFyIGlzTnVtYmVyID0gcmVxdWlyZSgnbXV0eXBlL2lzLW51bWJlcicpO1xyXG52YXIgc2VsZWN0aW9uID0gcmVxdWlyZSgnbXVjc3Mvc2VsZWN0aW9uJyk7XHJcbnZhciBjc3MgPSByZXF1aXJlKCdtdWNzcy9jc3MnKTtcclxuXHJcblxyXG4vKipcclxuICogVGFrZXMgZWxlbWVudCwgY29udGV4dCBhbmQgb3B0aW9uc1xyXG4gKlxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIEtleWJvYXJkIChvcHRpb25zKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRpZiAoIShzZWxmIGluc3RhbmNlb2YgS2V5Ym9hcmQpKSB7XHJcblx0XHRyZXR1cm4gbmV3IEtleWJvYXJkKGVsZW1lbnQsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG5cdH1cclxuXHJcblx0ZXh0ZW5kKHNlbGYsIG9wdGlvbnMpO1xyXG5cclxuXHRpZiAoIXNlbGYuZWxlbWVudCkge1xyXG5cdFx0c2VsZi5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcblx0fVxyXG5cclxuXHRzZWxlY3Rpb24uZGlzYWJsZShzZWxmLmVsZW1lbnQpO1xyXG5cdHNlbGYuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwaWFuby1rZXlib2FyZCcpO1xyXG5cclxuXHRpZiAoIXNlbGYuY29udGV4dCkge1xyXG5cdFx0c2VsZi5jb250ZXh0ID0gcmVxdWlyZSgnYXVkaW8tY29udGV4dCcpO1xyXG5cdH1cclxuXHJcblx0c2VsZi5pZCA9IGdldFVpZCgpO1xyXG5cdHNlbGYuY3JlYXRlS2V5cygpO1xyXG5cclxuXHRzZWxmLmVuYWJsZSgpO1xyXG59XHJcblxyXG5pbmhlcml0KEtleWJvYXJkLCBFbWl0dGVyKTtcclxuXHJcblxyXG52YXIgcHJvdG8gPSBLZXlib2FyZC5wcm90b3R5cGU7XHJcblxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBrZXlib2FyZCBiYXNlZCBvZiBudW1iZXIgb2Yga2V5cyBwYXNzZWRcclxuICovXHJcbnByb3RvLmNyZWF0ZUtleXMgPSBmdW5jdGlvbiAobnVtYmVyLCBzdGFydFdpdGgpIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG5cdGlmICghbnVtYmVyKSB7XHJcblx0XHRudW1iZXIgPSBzZWxmLm51bWJlck9mS2V5cztcclxuXHR9XHJcblxyXG5cdGlmICghc3RhcnRXaXRoKSB7XHJcblx0XHRzdGFydFdpdGggPSBzZWxmLmZpcnN0S2V5O1xyXG5cdH1cclxuXHJcblx0aWYgKGlzU3RyaW5nKHN0YXJ0V2l0aCkpIHtcclxuXHRcdHN0YXJ0V2l0aCA9IGtleS5nZXROdW1iZXIoc3RhcnRXaXRoKTtcclxuXHR9XHJcblxyXG5cdHZhciBzcmNLZXlFbCA9IGRvbWlmeSgnPGRpdiBjbGFzcz1cInBpYW5vLWtleWJvYXJkLWtleVwiIHRhYmluZGV4PVwiMVwiIGRhdGEta2V5PjwvZGl2PicpO1xyXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtYmVyOyBpKyspIHtcclxuXHRcdHZhciBrZXlFbCA9IHNyY0tleUVsLmNsb25lTm9kZSgpO1xyXG5cdFx0dmFyIGtleU51bWJlciA9IHN0YXJ0V2l0aCArIGk7XHJcblxyXG5cdFx0a2V5RWwuc2V0QXR0cmlidXRlKCdkYXRhLWtleScsIGtleU51bWJlcik7XHJcblx0XHRrZXlFbC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywga2V5LmdldE5hbWUoa2V5TnVtYmVyKSk7XHJcblxyXG5cdFx0aWYgKGtleS5pc0JsYWNrKGtleU51bWJlcikpIHtcclxuXHRcdFx0a2V5RWwuc2V0QXR0cmlidXRlKCdkYXRhLWtleS1ibGFjaycsIHRydWUpO1xyXG5cdFx0XHRrZXlFbC5jbGFzc0xpc3QuYWRkKCdwaWFuby1rZXlib2FyZC1rZXktYmxhY2snKTtcclxuXHRcdH1cclxuXHJcblx0XHRzZWxmLmVsZW1lbnQuYXBwZW5kQ2hpbGQoa2V5RWwpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcblxyXG4vKiogRGVmYXVsdCBrZXkgbnVtYmVyOiAyNSwgNDQsIDQ5LCA2MSwgNzYsIDg4LCA5MiwgOTcgKi9cclxucHJvdG8ubnVtYmVyT2ZLZXlzID0gNjE7XHJcblxyXG5cclxuLyoqIEZpcnN0IGtleSBpbiBhIGtleWJvYXJkICovXHJcbnByb3RvLmZpcnN0S2V5ID0gJ0MyJztcclxuXHJcblxyXG4vKiogQmluZCBrZXlib2FyZCAqL1xyXG5wcm90by5rZXlib2FyZCA9IGZhbHNlO1xyXG5cclxuXHJcbi8qKiBCaW5kIGV2ZW50cyAqL1xyXG5wcm90by5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRzZWxmLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xyXG5cclxuXHRvbihzZWxmLmVsZW1lbnQsICdtb3VzZWRvd24uJyArIHNlbGYuaWQgKyAnIHRvdWNoc3RhcnQnICsgc2VsZi5pZCwgZnVuY3Rpb24gKGUpIHtcclxuXHJcblx0XHRzZWxmLm5vdGVPbihlLnRhcmdldCk7XHJcblxyXG5cdFx0b24oc2VsZi5lbGVtZW50LCAnbW91c2VvdmVyLicgKyBzZWxmLmlkLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRzZWxmLm5vdGVPbihlLnRhcmdldCk7XHJcblx0XHR9KTtcclxuXHRcdG9uKHNlbGYuZWxlbWVudCwgJ21vdXNlb3V0LicgKyBzZWxmLmlkLCBmdW5jdGlvbiAoZSkge1xyXG5cdFx0XHRzZWxmLm5vdGVPZmYoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG9uKGRvYywgJ21vdXNldXAuJyArIHNlbGYuaWQgKyAnIG1vdXNlbGVhdmUuJyArIHNlbGYuaWQgKyAnIHRvdWNoZW5kLicgKyBzZWxmLmlkLCBmdW5jdGlvbiAoZSkge1xyXG5cclxuXHRcdFx0c2VsZi5ub3RlT2ZmKCk7XHJcblxyXG5cdFx0XHRvZmYoZG9jLCAnbW91c2V1cC4nICsgc2VsZi5pZCArICcgbW91c2VsZWF2ZS4nICsgc2VsZi5pZCArICcgdG91Y2hlbmQuJyArIHNlbGYuaWQpO1xyXG5cdFx0XHRvZmYoc2VsZi5lbGVtZW50LCAnbW91c2VvdmVyLicgKyBzZWxmLmlkKTtcclxuXHRcdFx0b2ZmKHNlbGYuZWxlbWVudCwgJ21vdXNlb3V0LicgKyBzZWxmLmlkKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4gc2VsZjtcclxufTtcclxuXHJcblxyXG4vKiogUGFyc2Ugbm90ZSBudW1iZXIgZnJvbSBhbnkgYXJnICovXHJcbmZ1bmN0aW9uIHBhcnNlTm90ZSAobm90ZSkge1xyXG5cdGlmIChpc1N0cmluZyhub3RlKSkge1xyXG5cdFx0cmV0dXJuIGtleS5nZXROdW1iZXIobm90ZSk7XHJcblx0fVxyXG5cclxuXHRlbHNlIGlmIChpc051bWJlcihub3RlKSkge1xyXG5cdFx0cmV0dXJuIG5vdGU7XHJcblx0fVxyXG5cclxuXHRlbHNlIGlmIChub3RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuXHRcdC8vaWdub3JlIG5vdCBrZXlzXHJcblx0XHRpZiAoIW5vdGUuaGFzQXR0cmlidXRlKCdkYXRhLWtleScpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcGFyc2VJbnQobm90ZS5nZXRBdHRyaWJ1dGUoJ2RhdGEta2V5JykpO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbi8qKiBTZXQgYWN0aXZlIG5vdGUgKi9cclxucHJvdG8ubm90ZU9uID0gZnVuY3Rpb24gbm90ZU9uIChub3RlKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRpZiAoaXNBcnJheShub3RlKSkge1xyXG5cdFx0W10uc2xpY2UuY2FsbChub3RlKS5mb3JFYWNoKG5vdGVPbiwgc2VsZik7XHJcblx0XHRyZXR1cm4gc2VsZjtcclxuXHR9XHJcblxyXG5cdG5vdGUgPSBwYXJzZU5vdGUobm90ZSk7XHJcblxyXG5cdGlmIChub3RlID09PSB1bmRlZmluZWQpIHtcclxuXHRcdHJldHVybiBzZWxmO1xyXG5cdH1cclxuXHJcblx0dmFyIGtleUVsID0gc2VsZi5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWtleT1cIicgKyBub3RlICsgJ1wiXScpO1xyXG5cclxuXHQvL3NlbmQgb24gbm90ZVxyXG5cdGVtaXQoc2VsZiwgJ25vdGVvbicsIHtcclxuXHRcdHdoaWNoOiBub3RlLFxyXG5cdFx0dmFsdWU6IDEyN1xyXG5cdH0pO1xyXG5cclxuXHRrZXlFbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcclxuXHRrZXlFbC5zZXRBdHRyaWJ1dGUoJ2RhdGEta2V5LWFjdGl2ZScsIHRydWUpO1xyXG5cclxuXHRyZXR1cm4gc2VsZjtcclxufTtcclxuXHJcblxyXG4vKiogRGlzYWJsZSBub3RlIG9yIGFsbCBub3RlcyAqL1xyXG5wcm90by5ub3RlT2ZmID0gZnVuY3Rpb24gbm90ZU9mZiAobm90ZSkge1xyXG5cdHZhciBzZWxmID0gdGhpcywga2V5RWw7XHJcblxyXG5cdC8vZGlzYWJsZSBhbGwgYWN0aXZlIG5vdGVzXHJcblx0aWYgKG5vdGUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0W10uc2xpY2UuY2FsbChzZWxmLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEta2V5LWFjdGl2ZV0nKSkuZm9yRWFjaChub3RlT2ZmLCBzZWxmKTtcclxuXHRcdHJldHVybiBzZWxmO1xyXG5cdH1cclxuXHJcblx0bm90ZSA9IHBhcnNlTm90ZShub3RlKTtcclxuXHJcblx0aWYgKG5vdGUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0cmV0dXJuIHNlbGY7XHJcblx0fVxyXG5cclxuXHR2YXIga2V5RWwgPSBzZWxmLmVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEta2V5PVwiJyArIG5vdGUgKyAnXCJdJyk7XHJcblxyXG5cdC8vc2VuZCBvZmYgbm90ZVxyXG5cdGVtaXQoc2VsZiwgJ25vdGVvZmYnLCB7XHJcblx0XHR3aGljaDogbm90ZSxcclxuXHRcdHZhbHVlOiAwXHJcblx0fSk7XHJcblxyXG5cdGtleUVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xyXG5cdGtleUVsLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1rZXktYWN0aXZlJyk7XHJcblxyXG5cdHJldHVybiBzZWxmO1xyXG59O1xyXG5cclxuXHJcbnByb3RvLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRzZWxmLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xyXG5cclxuXHRvZmYoc2VsZi5lbGVtZW50LCAnLicgKyBzZWxmLmlkKTtcclxuXHJcblx0cmV0dXJuIHNlbGY7XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmQ7IiwiLyoqXHJcbiAqIExpc3Qgb2YgZnJlcXVlbmNpZXMgZm9yIHBpYW5vIGtleVxyXG4gKiBAbW9kdWxlICBwaWFuby1rZXlcclxuICovXHJcblxyXG52YXIgbG9vcCA9IHJlcXVpcmUoJ211bWF0aC9sb29wJylcclxuXHJcblxyXG4vKiogTm90ZSBmcmVxdWVuY2llcyBkaWN0ICovXHJcbnZhciBrZXkgPSB7fTtcclxuXHJcblxyXG4vKiogR2V0IG5hbWUgZm9yIGEgbnVtYmVyICovXHJcbmtleS5nZXROYW1lID0gZnVuY3Rpb24gKG51bWJlcikge1xyXG5cdHJldHVybiBrZXkubm90ZXNbbG9vcChudW1iZXIgLSA0LCAxMildICsgTWF0aC5yb3VuZCgobnVtYmVyICsgMykgLyAxMik7XHJcbn07XHJcblxyXG5cclxuLyoqIEdldCBmcmVxdWVuY3kgZm9yIGEgbnVtYmVyICovXHJcbmtleS5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbiAobnVtYmVyKSB7XHJcblx0aWYgKHR5cGVvZiBudW1iZXIgPT09ICdzdHJpbmcnKSB7XHJcblx0XHRudW1iZXIgPSBrZXkuZ2V0TnVtYmVyRnJvbU5hbWUobnVtYmVyKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBNYXRoLnBvdygyLCAobnVtYmVyIC0gNDkpIC8gMTIpICogNDQwO1xyXG59O1xyXG5cclxuXHJcbi8qKiBHZXQgbnVtYmVyIGZvciBhIG5hbWUgKi9cclxua2V5LmdldE51bWJlciA9IGZ1bmN0aW9uIChmcmVxdWVuY3kpIHtcclxuXHRpZiAodHlwZW9mIGZyZXF1ZW5jeSA9PT0gJ3N0cmluZycpIHtcclxuXHRcdHJldHVybiBrZXkuZ2V0TnVtYmVyRnJvbU5hbWUoZnJlcXVlbmN5KTtcclxuXHR9XHJcblxyXG5cdHJldHVybiAxMiAqIE1hdGgubG9nKGZyZXF1ZW5jeSAvIDQ0MCkgLyBNYXRoLmxvZygyKSArIDQ5O1xyXG59O1xyXG5cclxuXHJcbi8qKiBHZXQgbm90ZSBudW1iZXIgZnJvbSBub3RlIG5hbWUgKi9cclxua2V5LmdldE51bWJlckZyb21OYW1lID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuXHR2YXIgbm90ZSA9IC9bYS16I10rL2kuZXhlYyhuYW1lKTtcclxuXHJcblx0bm90ZSA9IChub3RlLmxlbmd0aCA/IG5vdGVbMF0gOiAnQScpLnRvVXBwZXJDYXNlKCk7XHJcblxyXG5cdC8vZGVmYXVsdCBvY3RhdmUgaXMgMFxyXG5cdHZhciBvY3RhdmUgPSBrZXkuZ2V0T2N0YXZlKG5hbWUpO1xyXG5cclxuXHR2YXIgbm90ZUlkeCA9IGtleS5ub3Rlcy5pbmRleE9mKG5vdGUpO1xyXG5cclxuXHRpZiAobm90ZUlkeCA8IDApIHtcclxuXHRcdHRocm93IEVycm9yKCdVbmtub3duIG5vdGUgJyArIG5hbWUpO1xyXG5cdH1cclxuXHJcblx0dmFyIG5vdGVOdW1iZXIgPSAob2N0YXZlIC0gMSkgKiAxMiArIG5vdGVJZHggKyA0O1xyXG5cclxuXHRyZXR1cm4gbm90ZU51bWJlcjtcclxufTtcclxuXHJcblxyXG4vKiogVGVzdCB3aGV0aGVyIGtleSBudW1iZXIgcGFzc2VkIGlzIGJsYWNrICovXHJcbmtleS5pc0JsYWNrID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuXHRpZiAodHlwZW9mIG5hbWUgPT09ICdudW1iZXInKSB7XHJcblx0XHRuYW1lID0ga2V5LmdldE5hbWUobmFtZSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gLyMvLnRlc3QobmFtZSk7XHJcbn07XHJcblxyXG5cclxuLyoqIFJldHVybiBrZXkgb2N0YXZlIGJ5IGtleSBudW1iZXIgKi9cclxua2V5LmdldE9jdGF2ZSA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcblx0aWYgKHR5cGVvZiBuYW1lID09PSAnbnVtYmVyJykge1xyXG5cdFx0bmFtZSA9IGtleS5nZXROYW1lKG5hbWUpO1xyXG5cdH1cclxuXHJcblx0dmFyIG9jdGF2ZSA9IC8tP1swLTkuXSsvLmV4ZWMobmFtZSk7XHJcblxyXG5cdC8vbGV0IGRlZmF1bHQgb2N0YXZlIGJlIDBcclxuXHRpZiAob2N0YXZlLmxlbmd0aCkge1xyXG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQob2N0YXZlWzBdKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gMDtcclxuXHR9XHJcbn07XHJcblxyXG5cclxuLyoqIExpc3Qgb2Ygbm90ZSBuYW1lcyAqL1xyXG5rZXkubm90ZXMgPSAnQyBDIyBEIEQjIEUgRiBGIyBHIEcjIEEgQSMgQicuc3BsaXQoJyAnKTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGtleTsiXX0=
