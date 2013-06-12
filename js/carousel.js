/*global jQuery, Modernizr, Mustache, define */
/**
 * @fileOverview This file defines the Carousel UI module.
 * @author <a href="mailto:timothy.mcduffie@gmail.com">Tim McDuffie</a>
 * @version 1.0
 */
(function (NS, $) {
    "use strict";

    /**
     * Module: Carousel
     * @class Carousel
     * @classdesc The Carousel class creates a configurable an instance of a carousel UI element
     * @memberof API.module
     * @public
     */
    window[NS].define({
        name: "carousel",
        type: "module",
        value: function (api) {

            var _private = {

                /**
                 * Object containing the default configuration options.
                 * @memberof API.module.Carousel
                 * @name _private.defaults
                 * @private
                 */
                defaults : {
                    autostart: false,
                    delay: 5000,
                    maxSlidesToShow: 3,
                    nextPrev: true,
                    nav: true,
                    start: 1,
                    speed: "medium",
                    slideBuffer: 2
                },

                /**
                 * Carousel Setup function. Handles the heavy lifting to set up the carousel object including creation
                 * of the cache object, cloning necessary slides, caching of elements, initial dimension calculations,
                 * creation of controls, stage drawing, and selecting the default slide.
                 * @method
                 * @memberof API.module.Carousel
                 * @name _private.setup
                 * @param {jQuery Object} container jQuery object of the carousel container
                 * @param {Object} config Object containing the configuration values
                 * @returns {Object} cache
                 * @private
                 */
                setup: function setup(container, config, instance) {

                    var cache = {
                        calculations: {},
                        elems: {}
                    };

                    // find main elements elements and wrap carousel
                    cache.elems.slideContainer = container;
                    cache.elems.origSlides = container.find("div.carousel-item");

                    // verify that we have more than one slide. If not, a carousel isn't needed so we
                    // show the slide and return false
                    if (cache.elems.origSlides.length <= 1) {
                        cache.elems.origSlides.addClass('current');
                        return false;
                    }

                    // clone slides as necessary slides
                    cache.elems.origSlides.each(function(i){
                        if (i < config.slideBuffer){
                            $(this).clone().appendTo(cache.elems.slideContainer);
                        }
                        if (i > (cache.elems.origSlides.length - config.slideBuffer - 1)){
                            $(this).clone().insertBefore(cache.elems.origSlides.eq(0));
                        }
                    });

                    //cache.elems.clonedSlides = cache.elems.origSlides.clone(true);
                    cache.elems.allSlides = container.find("div.carousel-item");
                    cache.elems.viewport = container.wrap('<div class="carousel-viewport"></div>').parent();
                    cache.elems.container = cache.elems.viewport.wrap('<div class="carousel-container"></div>').parent();

                    // calculate dimensions that will not change on redraw
                    cache.calculations.singleSlideWidth = cache.elems.origSlides.eq(0).outerWidth();
                    cache.calculations.slidesWidth = cache.calculations.singleSlideWidth * cache.elems.origSlides.length;
                    cache.calculations.containerWidth = cache.calculations.singleSlideWidth * cache.elems.allSlides.length;
                    cache.calculations.viewportMaxWidth = cache.calculations.singleSlideWidth * config.maxSlidesToShow;

                    // set initial styles and duplicate elements as approprite
                    cache.elems.viewport.parent().css("position", "relative");
                    cache.elems.allSlides.css("display", "block");

                    cache = this.createControls(cache, config);
                    cache = this.draw(cache, config, instance);

                    this.selectCurrent(config.start, cache);

                    return cache;
                },

                /**
                 * Creates the Carousel UI controls based on the config parameters
                 * @method
                 * @memberof API.module.Carousel
                 * @name _private.createControls
                 * @param {Object} cache Object containing cached HTML elements as jQuery objects and cached measurements
                 * @param {Object} config Object containing the configuration values
                 * @returns {Object} cache
                 * @private
                 */
                createControls: function createControls(cache, config) {

                    var i;

                    if(typeof cache.elems === "undefined") {
                        throw new Error('_private.setup() must be called directly for the carousel to properly initialize');
                    }

                    var navContainer, navHtml, slideCount, i;

                    if (config.nextPrev) {
                        cache.elems.prev = $('<div class="carousel-previous"></div>').insertAfter(cache.elems.viewport);
                        cache.elems.next = $('<div class="carousel-next"></div>').insertAfter(cache.elems.viewport);
                    }

                    if (config.nav) {
                        navContainer = $('<ul class="carousel-nav"></ul>').insertAfter(cache.elems.viewport);
                        slideCount = cache.elems.origSlides.length;
                        navHtml = "";

                        // use a 1 based index for slide IDs
                        for ( i = 1; i <= slideCount; i += 1 ){
                            navHtml += '<li><a class="carousel-nav" data-slide="'+i+'"></a>';
                        }

                        cache.elems.nav = navContainer.append(navHtml);
                        cache.elems.navLinks = cache.elems.nav.find("a");
                    }

                    return cache;

                },

                /**
                 * Augment classes on slides and controls to identify the current slide
                 * @method
                 * @memberof API.module.Carousel
                 * @name _private.selectCurrent
                 * @param {Number} index Numerical value representing the slide to set as current. Index is 1 based.
                 * @param {Object} cache Object containing cached HTML elements as jQuery objects and cached measurements
                 * @returns {Void}
                 * @private
                 */
                selectCurrent: function selectCurrent(index, cache){
                    cache.elems.origSlides.removeClass('current').eq(index -1 ).addClass('current');
                    cache.elems.navLinks.removeClass('current').eq(index - 1).addClass('current');
                },

                /**
                 * Draws the UI for the viewport and positions the slides to place the starting slide in view
                 * @method
                 * @memberof API.module.Carousel
                 * @name _private.draw
                 * @param {Object} cache Object containing cached HTML elements as jQuery objects and cached measurements
                 * @param {Object} config Object containing the configuration values
                 * @throws Throws error if method is called before _private.setup() is called.
                 * @returns {Void}
                 * @private
                 */
                draw: function draw(cache, config, instance) {

                    if(typeof cache.elems === "undefined" || typeof cache.elems === "undefined"){
                        throw new Error('_private.setup() must be called directly for the carousel to properly initialize');
                    }

                    cache.calculations.windowWidth = api.cache.$window.width();
                    cache.calculations.viewportWidth = cache.calculations.viewportMaxWidth > cache.calculations.windowWidth ? cache.calculations.windowWidth : cache.calculations.viewportMaxWidth;
                    cache.calculations.viewportOffset = (cache.calculations.viewportWidth - cache.calculations.singleSlideWidth) / 2;
                    cache.calculations.rightLimit = (cache.calculations.singleSlideWidth * config.slideBuffer * -1) + cache.calculations.viewportOffset;
                    cache.calculations.leftLimit = (cache.calculations.slidesWidth - cache.calculations.singleSlideWidth) * -1 + cache.calculations.rightLimit;

                    cache.elems.viewport.width(cache.calculations.viewportWidth).css({
                        width: cache.calculations.viewportWidth,
                        marginLeft: "-" + cache.calculations.viewportOffset + "px"
                    });

                    cache.elems.slideContainer.css({
                        width: cache.calculations.containerWidth + "px",
                        left: cache.calculations.rightLimit - (cache.calculations.singleSlideWidth * (instance.currentSlide -1)) + "px"
                    });

                    return cache;

                },

                /**
                 * Draws the UI for the viewport and positions the slides to place the starting slide in view
                 * @method
                 * @memberof API.module.Carousel
                 * @name _private.animate
                 * @param {Number} distanceMultiplier Number representing the number of slides to animate between
                 * @param {Number} speed Milisecond value for animation to complete
                 * @param {Object} cache Object containing cached HTML elements as jQuery objects and cached measurements
                 * @param {Function} callback Callback function to execute after animation is complete.
                 * @throws Throws error if method is called before _private.setup() is called.
                 * @returns {Void}
                 * @private
                 */
                animate: function animate(distanceMultiplier, instance, currentSlide){

                    var distance = instance.cache.calculations.singleSlideWidth * distanceMultiplier;
                    var currentPosition = parseInt(instance.cache.elems.slideContainer.css("left"), 10);
                    var newPosition = currentPosition - distance;
                    var slideContainer = instance.cache.elems.slideContainer;
                    var len = instance.cache.elems.origSlides.length

                    if( $.data(slideContainer, "isAnimating") === "true"){
                        return false;
                    }
                    slideContainer.data("isAnimating", "true");

                    slideContainer.animate({"left": newPosition + "px", easing:'easeInOutCubic'}, instance.config.speed, function(){
                        if (currentSlide == 1) {
                            slideContainer.css("left", instance.cache.calculations.rightLimit + "px");
                        } else if (currentSlide == len ) {
                            slideContainer.css("left", instance.cache.calculations.leftLimit + "px");
                        }

                        slideContainer.data("isAnimating", "false");
                        if (typeof instance.config.callback === "function") {
                            instance.config.callback();
                        }
                    });

                }
            };

            return {
                /**
                 * Initializes the Carousel module based on the supplied configuration. Config options can either be passed to the
                 * constructor via an object or can be added as data attributes to the HTML container element.
                 * @memberof API.module.Carousel
                 * @param {String} config:elem jQuery object representing the carousel container element
                 * @param {Object} config:options Object of config values
                 * @param {Boolean} [config:options:autostart=false] Boolean option to allow or prevent the carousel animation on init
                 * @param {Number} [config:options:delay=5000] Delay in miliseconds between animations. Ignored is autostart is false
                 * @param {Number} [config:options:maxSlidesToShow=3] The maximum number of slides to display in the viewport. Used to
                 *                                                    determine the viewport width.
                 * @param {Boolean} [config:options:nextPrev=true] Boolean option to render the next/previous navigation link elements
                 * @param {Boolean} [config:options:nav=true] Boolean option to render a nav directly to each slide
                 * @param {Number} [config:options:start=3] 1 based index value representing the starting slide.
                 * @param {String|Number} [config:options:speed=3] Time in miliseconds required for the animation to complete. Can also
                 *                                                 be a string value recongnized by jQuery ("slow", "medium", "fast", etc..)
                 * @param {Number} [config:options:slideBuffer=2] Number of slides to clone before and after the carousel.
                 * @scope instance
                 * @returns {Void}
                 * @public
                 */
                init: function init(config) {
                    var self = this;

                    // Config the object based on the JS vars and HTML data attributes. HTML data attributes override settings
                    // in both the _private.defaults and JS vars.
                    this.config = $.extend({}, _private.defaults, config.options, config.elem.data());

                    this.currentSlide = this.config.start; // current slide is 1 based so is, config.start is 1 based

                    this.cache = _private.setup(config.elem, this.config, self);

                    // if setup fails don't do anything else
                    if (this.cache === false){
                        return;
                    }

                    this.bindControls();
                    this.bindRedraw();

                    // load data attributes on init so we can use the faster $.data() later
                    this.cache.elems.slideContainer.data("isAnimating", "false");

                    this.start();

                },

                /**
                 * Carousel config object. Should not be accessed or augmented outside the module.
                 * @memberof API.module.Carousel
                 * @scope instance
                 * @public
                 */
                config: {},

                /**
                 * Cache object. Should not be accessed or augmented outside the module.
                 * @memberof API.module.Carousel
                 * @scope instance
                 * @public
                 */
                cache: {},

                /**
                 * Binds the event handlers to the navigation objects
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                bindControls: function bindControls() {
                    var self = this;

                    this.cache.elems.container
                        .on("hover", function(e){
                            // check the event type to handle the mouse enter or leave events
                            if (e.type === "mouseenter"){
                                self.pause();
                                self.cache.elems.container.addClass("over");
                            }

                            if (e.type === "mouseleave"){
                                self.resume();
                                self.cache.elems.container.removeClass("over");
                            }
                        })
                        .delegate(".carousel-next", "click",function(e){
                            e.preventDefault();
                            self.stop();
                            self.next();
                        })
                        .delegate(".carousel-previous", "click",function(e){
                            e.preventDefault();
                            self.stop();
                            self.prev();
                        })
                        .delegate("a.carousel-nav", "click", function(e){
                            e.preventDefault();
                            self.stop();
                            self.navigateTo(this.getAttribute("data-slide"));
                        });
                },

                /**
                 * Redraws the Carousel UI after the browser is resized
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                bindRedraw: function bindRedraw(){
                    var self = this;
                    api.event.listen("window.resize.stop", function(){
                        _private.draw(self.cache, self.config, self);
                    });
                },

                /**
                 * Animates the carousel to the supplied index
                 * @memberof API.module.Carousel
                 * @param {Number} index 1 based index value representing the slide to display
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                navigateTo: function navigateTo(index) {
                    console.log("Carousel:navigteTo("+index+")");

                    var self = this;
                    var increment = (index > this.currentSlide) ? (index - this.currentSlide) : ((this.currentSlide - index) * -1);

                    // don't animate if an animation is already in progress
                    if( $.data(this.cache.elems.slideContainer[0], "isAnimating") === "true"){
                        return false;
                    }

                    this.currentSlide = index;

                    if (typeof this.config.before === "function") {
                        this.config.before.call(self);
                    }

                    _private.animate(increment, this);
                    _private.selectCurrent(this.currentSlide, this.cache);
                },

                /**
                 * Animates the carousel to the next index
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                next: function next() {
                    console.log("Carousel:next");

                    // don't animate if an animation is already in progress
                    if( $.data(this.cache.elems.slideContainer[0], "isAnimating") === "true"){
                        return false;
                    }

                    this.currentSlide = (this.currentSlide + 1) <= this.cache.elems.origSlides.length ? this.currentSlide + 1 : 1;
                    _private.animate(1, this, this.currentSlide );
                    _private.selectCurrent(this.currentSlide, this.cache);

                },

                /**
                 * Animates the carousel to the previous index
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                prev: function prev() {
                    console.log("Carousel:prev");

                    // don't animate if an animation is already in progress
                    if( $.data(this.cache.elems.slideContainer[0], "isAnimating") === "true"){
                        return false;
                    }

                    this.currentSlide = (this.currentSlide - 1) >= 1 ? this.currentSlide - 1 : this.cache.elems.origSlides.length;
                    _private.animate(-1, this, this.currentSlide);
                    _private.selectCurrent(this.currentSlide, this.cache);

                },

                /**
                 * Begins the carousel animation if allowed by the config
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                start: function start() {
                    var self = this;

                    if (this.config.autostart === true) {
                        this.animateInterval =  setInterval(function () {
                            self.next();
                        }, this.config.delay);
                    }

                },

                /**
                 * Stops the carousel animation
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                stop: function stop() {
                    clearInterval(this.animateInterval);
                },

                /**
                 * Pauses the carousel animation. Alias to stop()
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                pause: function pause() {
                    this.stop();
                },

                /**
                 * Starts the carousel animation. Alias to start()
                 * @memberof API.module.Carousel
                 * @returns {Void}
                 * @scope instance
                 * @public
                 */
                resume: function resume() {
                    this.start();
                }
            };
        }
    });

}('APPNS', jQuery));