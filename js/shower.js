/*global define */
/**
 * @fileOverview This file defines the Shower presentation module.
 * @author <a href="mailto:timothy.mcduffie@gmail.com">Tim McDuffie</a>
 * @version 1.0
 *
 * This is an in-progress rewrite of Shower.JS, a JS slideshow objet that is cross browser
 * for only browsers that support CSS3 transitions and transformations. This rewrite will
 * expand support to include older browsers back to IE8, possibly IE7.
 *
 * The original object was written to be independent of normalization libraries, but to be
 * fully cross browser, dependency on normaliation libraries is introduced. Additionally,
 * the module was written to be compatible with RequireJS using he CommonJS AMD pattern.
 */
define(function(require, exports, module) {
    "use strict";

    var norm = require('normlizr');

    /**
     * Constructor for the Shower object.
     * @param {String} config:containerSelector CSS style selector for the slides container
     * @param {String} config:currentSlideClassName ClassName for currently active slide
     * @param {String} config:fullScreenClassName ClassName for full screen display
     * @param {String} config:listClassName ClassName for default list display
     * @param {String} config:slidesSelector CSS style selector for slide elements
     * @module shower
     * @constructor
     */
    function Shower(config) {
        var defaults = {
            "listClassName": "list",
            "fullScreenClassName": "full",
            "currentSlideClassName": "current",
            "slidesSelector": ".slide",
            "containerSelector": "#content-container"
        };

        /**
         * Instance configuration object. Extends the default options with those provided
         * to the constructor
         * @type {Object}
         */
        this.config = norm.extend(defaults, config);

        /**
         * Cached reference to the Window object as a jQuery or Zepto (Norm) object
         * @type {Element}
         */
        this.window = norm(window);

        /**
         * Cached reference to the Document object as a Norm object
         * @type {Element}
         */
        this.doc = norm(document);

        /**
         * Cached reference to the Body object as a Norm object
         * @type {Element}
         */
        this.body = norm(document.body);

        /**
         * Cached reference to the slides
         * @type {ElementCollection}
         */
        this.slides = this.doc.find(this.config.slidesSelector);

        /**
         * Cached reference to the slides container
         * @type {ElementCollection}
         */
        this.container = this.doc.find(this.config.containerSelector);

        /**
         * Current mode, uses values of the List className and full className
         * @type {String}
         */
        this.mode = this.config.listClassName;

        /**
         * Currently active slide number
         * @type {Number}
         */
        this.currentSlideNumber = null;

        /**
         * Currently active slide hash
         * @type {String}
         */
        this.currentSlideHash = null;

        this.handleResize();
        this.handleClick();
        this.handleKeyDown();
        this.handleHashChange();
        this.window.trigger("resize");
        this.window.trigger("hashchange");
    }

    // helpers

    /**
     * Helper method to retrieve the hash for a given slide based on the numerical index
     * @param {Number} index Numerical 0 based index of the slide
     */
    Shower.prototype.getSlideHashFromIndex = function getSlideHashFromIndex(index) {
        console.log("Getting slide hash from index");
        return this.slides[index].id;
    };

    /**
     * Helper method to retrieve the numerical index for a given slide based on the hash
     * @param {String} hash The hash from the URL which corresponds to the slide id
     */
    Shower.prototype.getSlideIndexFromHash = function getSlideIndexFromHash(hash) {
        console.log("Getting slide index from ");
        var index;
        var slide = this.slides.filter("#" + hash);
        this.slides.each(function(key, value) {
            if (slide[0].id == value.id) {
                index = key;
                return false;
            }
        });
        return index;
    };

    /**
     * Helper method to retrieve the raw hash value and parse it into the values for mode
     * and hash
     * @param {Number} index Numerical 0 based index of the slide
     * @returns {Object}
     */
    Shower.prototype.parseHash = function parseHash() {
        var urlHash = window.location.hash.replace("#", "").split("/");
        return {
            mode: urlHash[0] || this.mode,
            hash: urlHash[1] || this.slides[this.currentSlideNumber].id
        };
    };

    // modes

    /**
     * Handles the heavy lifting for entering a new mode based on the value of the instance
     * mode property
     */
    Shower.prototype.enterMode = function enterMode() {
        console.log("Entering " + this.mode + " mode");

        var find = (this.mode === this.config.listClassName) ? this.config.fullScreenClassName : this.config.listClassName;
        var replace = (this.mode === this.config.listClassName) ? this.config.listClassName : this.config.fullScreenClassName;
        var currentSlideOffset;

        this.container[0].className = this.container[0].className.replace(find, replace);

        if (this.container[0].className.indexOf(replace) === -1) {
            this.container[0].className = norm.trim(this.container[0].className + " " + replace);
        }

        if (this.isListMode()) {
            currentSlideOffset = this.slides.filter("#" + this.currentSlideHash).offset();
            window.scrollTo(0, currentSlideOffset.top);
        }
    };

    /**
     * Handles the heavy lifting for activating a slide based on the value of the instance
     * currentSlideHash property
     */
    Shower.prototype.enterSlide = function enterSlide() {
        console.log("Entering " + this.currentSlideHash + " slide");

        this.slides
          .removeClass(this.config.currentSlideClassName)
          .filter("#" + this.currentSlideHash)
          .addClass(this.config.currentSlideClassName)
          .focus();
        this.currentSlideNumber = this.getSlideIndexFromHash(this.currentSlideHash);
    };

    /**
     * Convenience method for checking whether the instance is in Full mode
     * @returns {Boolean}
     */
    Shower.prototype.isFullMode = function isFullMode() {
        console.log("Checking full mode");
        return (this.mode === this.config.fullScreenClassName);
    };

    /**
     * Convenience method for checking whether the instance is in List mode
     * @returns {Boolean}
     */
    Shower.prototype.isListMode = function isListMode() {
        console.log("Checking list mode");
        return (this.mode === this.config.listClassName);
    };

    // navigation

    /**
     * Up[dates the Mode portion of the Url with the passed value
     * @param {String} mode String value for the mode to enter
     */
    Shower.prototype.setModeUrl = function setModeUrl(mode) {
        console.log("Setting mode to " + mode);
        if (this.mode !== mode) {
            this.updateUrl(mode, this.currentSlideNumber);
        }
    };

    /**
     * Up[dates the Hash portion of the Url to the hash of the next slide
     */
    Shower.prototype.nextSlideUrl = function nextSlideUrl() {
        console.log("Moving to next slide");
        var nextSlideNumber = this.currentSlideNumber + 1;
        if (nextSlideNumber < this.slides.length) {
            this.updateUrl(this.mode, nextSlideNumber);
        }
    };

    /**
     * Up[dates the Hash portion of the Url to the hash of the previous slide
     */
    Shower.prototype.previousSlideUrl = function previousSlideUrl() {
        console.log("Moving to previous slide");
        var prevSlideNumber = this.currentSlideNumber - 1;
        if ((prevSlideNumber) >= 0) {
            this.updateUrl(this.mode, prevSlideNumber);
        }
    };

    /**
     * Up[dates the Hash portion of the Url to the provided hash
     * @param {String} hash Slide id used to update the hash
     */
    Shower.prototype.goToSlideUrl = function goToSlideUrl(hash) {
        console.log("Moving to slide " + hash);
        var slide = this.slides.filter("#" + hash);

        if (slide.length > 0) {
            this.updateUrl(this.mode, this.getSlideIndexFromHash(hash));
        }
    };

    /**
     * Authoritative mthod for updating both the mode and hash values in the URL based
     * on the provided values.
     * @param {String} mode Mode to set in the Url
     * @param {Number} index Numerical side index used to retrieve the slide id for the hash
     */
    Shower.prototype.updateUrl = function updateUrl(mode, index) {
        console.log("Updating URL");
        var hash = this.getSlideHashFromIndex(index);
        window.location.hash = mode + "/" + hash;
    };

    // events

    /**
     * Assigns an handler to the hashChange event. The hash change events causes the
     * application to update the displayed content.
     * @todo Add conditional for handling browsers that do not support hashchange
     */
    Shower.prototype.handleHashChange = function handleHashChange() {
        var self = this;
        this.window.on("hashchange", function(e) {
            var urlValues = self.parseHash();
            console.log(urlValues, self.mode, self.currentSlideHash, self.mode !== urlValues.mode, self.currentSlideHash !== urlValues.hash);
            if (self.mode !== urlValues.mode) {
                self.mode = urlValues.mode;
                self.enterMode();
            }

            if (self.currentSlideHash !== urlValues.hash) {
                self.currentSlideHash = urlValues.hash;
                self.enterSlide();
            }
        });
    };

    /**
     * Assigns a handler to the browser resize event. The event is tracked to keep
     * the current slide in view
     */
    Shower.prototype.handleResize = function handleResize() {
        var self = this;
        var currentSlideOffset;
        this.window.on("resize", function(e) {
            console.log("Window is resizing");
            if (self.isListMode() && self.currentSlideNumber > 0) {
                currentSlideOffset = self.slides.filter("#" + self.currentSlideHash).offset();
                window.scrollTo(0, currentSlideOffset.top);
            }
        });
    };

    /**
     * Assigns a handler for the click event on the document. When in list mode, a
     * detected click triggers Has no effect when in full mode.
     */
    Shower.prototype.handleClick = function handleClick() {
        var self = this;
        this.doc.on("click", this.config.slidesSelector, function(e) {
            if (self.isListMode()) {
                console.log("Handling click");
                self.updateUrl(self.config.fullScreenClassName, self.getSlideIndexFromHash(this.id));
            }
        });
    };

    /**
     * Assigns a handler for key events. Events are captured and used for internal
     * navigation and toggling between states.
     */
    Shower.prototype.handleKeyDown = function handleKeyDown() {
        var self = this;
        var firstHash = this.slides[0].id;
        var lastHash = this.slides[this.slides.length - 1].id;
        console.debug("debug: ",firstHash, lastHash);
        this.doc.on("keydown", function(e) {
            switch (e.which) {
                case 13: // Enter
                    console.log("Handling Enter");
                    self.setModeUrl(self.config.fullScreenClassName);
                    break;

                case 27: // Esc
                    console.log("Handling Escape");
                    self.setModeUrl(self.config.listClassName);
                    break;

                case 33: // PgUp
                case 38: // Up
                case 37: // Left
                //case 72: // h
                //case 75: // k
                    console.log("Handling keypress for PREV");
                    self.previousSlideUrl();
                    break;

                case 34: // PgDown
                case 40: // Down
                case 39: // Right
                //case 76: // l
                //case 74: // j
                    console.log("Handling keypress for NEXT");
                    self.nextSlideUrl();
                    break;

                case 36: // Home
                    console.log("Handling Home", firstHash);
                    self.goToSlideUrl(firstHash);
                    break;

                case 35: // End
                    console.log("Handling End", lastHash);
                    self.goToSlideUrl(lastHash);
                    break;

                case 32: // Space = +1; Shift + Space = -1
                    console.log("Handling space", e);
                    e.preventDefault();

                    if (!e.shiftKey) {
                        self.nextSlideUrl();
                    } else {
                        self.previousSlideUrl();
                    }
                    break;
            }
        });
    };

    return Shower;
});