/**
 * @fileoverview Base Object for search interfaces.
 * @author Tim McDuffie (tmcduffie@hugeinc.com)
 */

goog.provide('app.search.Core');

goog.require('goog.Uri');
goog.require('goog.Uri.QueryData');
goog.require('goog.array');
goog.require('app.analytics.Track');
goog.require('app.pubsub.PubSub');
goog.require('app.search.Api');
goog.require('app.search.QueryManager');
goog.require('app.search.Results');



/**
 * Core of the Search object
 * @param {Object} config Configuration object.
 *     Contains properties:
 *       pubSubNS {string} PubSub namespace for related events.
 * @constructor
 */
app.search.Core = function(config) {
  /**
   * Instance of Analytics tracking object
   * @type {Object}
   *    Contains Property:
   *      pubSubNS {?string} Namespace for PubSub events
   * @private
   */
  this.config_ = {
    'pubSubNS': null
  };

  if (goog.isObject(config)) {
    goog.object.extend(this.config_, config);
  }


  /**
   * Instance of the Search Query Manager
   * @type {app.search.QueryManager}
   */
  this.queryManager = new app.search.QueryManager();


  /**
   * Instance of the Search API object
   * @type {app.search.Api}
   * @private
   */
  this.api_ = new app.search.Api(app.search.Core.API_URL,
      app.search.Core.API_KEY, app.search.Core.CSE_ID);


  /**
   * Instance of the Search Results object
   * @type {app.search.Results}
   */
  this.resultsObject = new app.search.Results();


  /**
   * Instance of Analytics tracking object
   * @type {app.analytics.Track}
   * @private
   */
  this.ga_ = app.analytics.Track.getInstance();


  /**
   * Instance of PubSub object
   * @type {app.pubsub.PubSub}
   */
  this.pubsub = app.pubsub.PubSub.getInstance();


  /**
   * Starting index for search queries
   * @type {number}
   * @private
   */
  this.offset_ = 1;


  /**
   * Flag for enabling Term tracking in analytics and URL history
   * @type {app.analytics.Track}
   * @private
   */
  this.isTrackingTerms_ = false;


  this.api_.setParam('start', this.offset_);

  if (this.config_['pubSubNS']) {
    this.setPubSubNS(this.config_['pubSubNS']);
  }
};

/**
 * URl for the CSE API
 * @type {string}
 */
app.search.Core.API_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Id for Google Custom Search engine.
 * @type {string}
 */
app.search.Core.CSE_ID = '014703211769038569089:jr3gthq6iuq';

/**
 * API key for Google Custom Search api.
 * @type {string}
 */
app.search.Core.API_KEY = 'AIzaSyCWFXMPr5YxL8TkcLrVGDhLlVrQC4wYUqI';

/**
 * Search page url
 * @type {string}
 */
app.search.Core.SEARCH_PAGE_PATH = '/think/search.html';

/**
 * Search related PubSubEvent Prefix
 * @type {string}
 */
app.search.Core.PUBSUB_PREFIX = 'search.';

/**
 * Submit the current query to the API.
 * @private
 */
app.search.Core.prototype.submitQuery_ = function() {
  var queryString = this.queryManager.getQueryString();
  this.api_.query(queryString, this.resultsObject);
};

/**
 * Adds the term for the current search
 * @param {string} group Group to apply the filter.
 * @param {string} filter Filter to add to the current search.
 */
app.search.Core.prototype.addFilter = function(group, filter) {
  this.queryManager.add(group, filter);
  this.submitQuery_();
};

/**
 * Pass through method allowing external mods access to the api queryFromIndex
 * method.
 * @param {number} offset Numerical value for the query start index.
 */
app.search.Core.prototype.queryFromIndex = function(offset) {
  this.api.queryFromIndex(offset);
};

/**
 * Setter method to set the sort order and data key to sort on.
 * @param {string} key Data field to sort on. Should be
 *                     more:pagemap:publication-date.
 * @param {string} direction Description for sort order. Should be either asc
 *                           or desc. Descedning is the default order.
 */
app.search.Core.prototype.setSort = function(key, direction) {
  var dir = (direction !== 'asc') ? 'd' : 'a';
  this.api_.setParam('sort', key + ':' + dir);
};

/**
 * Removes the filter from the current search
 * @param {string} group Group to apply the filter.
 * @param {string} filter Filter to add to the current search.
 */
app.search.Core.prototype.removeFilter = function(group, filter) {
  this.queryManager.remove(group, filter);
  this.submitQuery_();
};

/**
 * Sets the term for the current search
 * @param {string} term Term to search for.
 */
app.search.Core.prototype.setSearchTerm = function(term) {
  var queryUri, pageUri;

  this.queryManager.setTerm(term);
  this.resultsObject.setQueriedTerm(term);

  if (this.isTrackingTerms_) {
    queryUri = new goog.Uri();
    queryUri.setParameterValue(app.search.Api.QUERY_PARAM_KEY, term);
    pageUri = goog.string.buildString(app.search.Core.SEARCH_PAGE_PATH, '?',
        queryUri.getDecodedQuery());
    this.ga_.trackPage(pageUri);
  }

  this.submitQuery_();
};

/**
 * Turn tracking on or off
 * @param {boolean} isEnabled Boolean to enable or disable tracking.
 */
app.search.Core.prototype.enableTracking = function(isEnabled) {
  this.isTrackingTerms_ = isEnabled;
};

/**
 * Set the value for the PubSub namespace and subscribe to events.
 * @param {string} ns Namespace string.
 */
app.search.Core.prototype.setPubSubNS = function(ns) {
  var self = this;

  this.config_['pubSubNS'] = app.search.Core.PUBSUB_PREFIX + ns;
  this.resultsObject.setPubSubNS(this.config_['pubSubNS']);

  this.pubsub.subscribe(
    this.config_['pubSubNS'] + '.setTerm',
    function(term) {
      self.setSearchTerm(term);
    }
  );

  this.pubsub.subscribe(
    this.config_['pubSubNS'] + '.addFilter',
    function(group, filter) {
      self.addFilter(group, filter);
    }
  );

  this.pubsub.subscribe(
    this.config_['pubSubNS'] + '.removeFilter',
    function(group, filter) {
      self.removeFilter(group, filter);
    }
  );

  this.pubsub.subscribe(
    this.config_['pubSubNS'] + '.loadMore',
    function(index) {
      self.api_.queryFromIndex(index);
    }
  );
};

goog.exportSymbol('app.search.Core', app.search.Core);
