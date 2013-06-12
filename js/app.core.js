/*global  */
/**
 * @fileOverview This file defines the Application core.
 * @author <a href="mailto:timothy.mcduffie@gmail.com">Tim McDuffie</a>
 * @version 1.0
 */
var APPNS = (function(){
    "use strict";

    /**
     * App Constructor
     */
    function App() {

        var self = this;

        this.api = {
            store: this.store,
            implement: this.implement,
            retrieve: this.retrieve
        };

        this.obj = {};

        this.store = function store(classObject){
            classObject = classObject || this;
            return (self.obj[classObject.name] = classObject);
        };

        this.retrieve = function retrieve(name){
            return self.obj[name];
        };

        this.implement = function implement(interfaceObj, namespace){
            var obj = this;

            if (namespace) {
                this[namespace] = this.hasOwnProperty(namespace) ? this[namespace] : {};
                obj = this[namespace];
            }

            interfaceObj.call(obj);
        };

        this.routes = function routes(){
            var defaultRoute = ["global"];
            var dataRoutesStringValue = document.body.getAttribute("data-routes");
            var routes = dataRoutesStringValue.split(/,?\s+/);

            if (dataRoutesStringValue.indexOf(defaultRoute[0]) === -1) {
                routes = defaultRoute.concat(routes);
            }

            this.routes = function (){
                return routes;
            };

            return routes;
        };

        this.init = function init() {
            var i, numRoutes, routes, route;
            var calledRoutes = [];

            routes = this.routes();
            numRoutes = routes.length; // push returns the new length of the array

            for (i = 0; i < numRoutes; i++) {
                route = this.obj[routes[i] + "Controller"];
                if (typeof route === "object" && typeof route.init === "function") {
                    calledRoutes.push(routes[i]);
                    route.init.call(route);
                }
            }

            return calledRoutes;
        };

        return this;
    }

    // assign the NS back to the global object
    return new App();

}());