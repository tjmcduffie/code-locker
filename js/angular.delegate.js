/**
 * @fileoverview Allows you to delegate a custom behavior when a child element
 *               is the recipient of a browser event.
 *
 * @author tmcduffie@hugeinc.com (Tim McDuffie)
 */
'use strict';

goog.provide('partners.common.Delegate');

goog.require('partners.common.module');



/**
 * Constructor for Delegate directive.
 * @constructor
 */
partners.common.Delegate = function() {

};



/**
 * Proxy object for delegated events. Creates a new non-immutable 'event'
 * object that allows for target and srcElement props to be overwritten while
 * supplying passthrough methods to the event methods.
 * Code adapted from the Zepto createProxy method (zeptojs.com/license).
 * @param {Object} e Original event.
 * @constructor
 */
partners.common.Delegate.EventProxy = function(e) {
  var ignoredProps = /^([A-Z]|layer[XY]$)/;
  var eventMethods = {
    preventDefault: 'isDefaultPrevented',
    stopImmediatePropagation: 'isImmediatePropagationStopped',
    stopPropagation: 'isPropagationStopped'
  };
  var returnTrue = function() {
    return true;
  };
  var returnFalse = function() {
    return false;
  };

  this.originalEvent = e;

  for (var key in e) {
    if (!ignoredProps.test(key) && e[key] !== undefined) {
      this[key] = e[key];
    }
  }

  for (var method in eventMethods) {
    this[method] = (function(fn) {
      return function() {
        this[eventMethods[method]] = returnTrue;
        e[fn] = e[fn].apply(e, arguments);
        return e[fn];
      };
    }(method));
    this[eventMethods[method]] = returnFalse;
  }
};


/**
 * DOM attribute that instantiates directive.
 * @type {string}
 */
partners.common.Delegate.DIRECTIVE_NAME = 'parComDelegate';


/**
 * Compile function for delegate directive
 * @param {Function} $parse Angular parsing service for converting
 *     expression strings into functions.
 * @return {Function}
 */
partners.common.Delegate.compile = function($parse) {
  return function(scope, elem, attrs) {
    var parts = attrs[partners.common.Delegate.DIRECTIVE_NAME].split(',');
    var eventName = parts[0].replace(/^\s+|\s+$/g, '');
    var selector = parts[1].replace(/^\s+|\s+$/g, '');
    var method = $parse(parts[2].replace(/^\s+|\s+$/g, ''));

    elem.bind(angular.lowercase(eventName), function(e) {
      var trigger = e.target;
      var delEvent = new partners.common.Delegate.EventProxy(e);

      while (trigger !== null && angular.uppercase(trigger.nodeName) !==
          angular.uppercase(selector)) {
        trigger = trigger.parentNode;
      }

      if (trigger) {
        delEvent.target = trigger;
        delEvent.srcElement = trigger;
        scope.$apply(function() {
          scope.event = delEvent;
          method(scope, {$event: delEvent});
        });
      }
    });
  };
};


// Apply directive to common module
partners.common.module.directive(partners.common.Delegate.DIRECTIVE_NAME,
    ['$parse', partners.common.Delegate.compile]);
