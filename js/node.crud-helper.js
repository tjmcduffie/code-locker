var Response = require(process.cwd() + '/lib/Response');

module.exports = {
  /**
   * Creates a new instance in the database via the mongoose object's save method.
   * @param  {Object} obj Mongoose model instance.
   * @param  {Object} res Server response object.
   */
  create: function(obj, res) {
    obj.save(function(err, data) {
      var response = new Response(err, data);
      res.json(response.getCode(), response.getData());
    });
  },

  /**
   * Reads a single object from the database based on supplied params.
   * @param  {Objet} obj Mongoose model.
   * @param  {Objet} res Server response object.
   * @param  {String} id Id of the item to look up.
   * @param  {Objet} options Mongo query options.
   * @param  {Objet.<string>} options.populate A string of space separated subdocumets to populate.
   */
  readOne: function(obj, res, id, options) {
    var results = obj.findById(id);

    if (typeof id === 'undefined') {
      throw new Error('The readOne operation requires an id as the third parameter');
    }

    if (options) {
      if(options.populate) {
        results.populate(options.populate);
      }
    }

    results.exec(function(err, data) {
      var response = new Response(err, data);
      res.json(response.getCode(), response.getData());
    });
  },

  /**
   * Reads multiple object from the database based on supplied params.
   * @param  {Objet} obj Mongoose model.
   * @param  {Objet} res Server response object.
   * @param  {Objet} options Mongo query options.
   * @param  {Objet.<number>} options.populate The number of items to offset query results.
   * @param  {Objet.<number>} options.populate The number of items to return.
   * @param  {Objet.<Object>} options.select A hash of schema fields to either enable or disable. A value of 1
   *                                         enables the field, allowing for its return. A value of 0 disables
   *                                         the field.
   * @param  {Objet.<string>} options.populate A string of space separated subdocumets to populate.
   */
  readMany: function(obj, res, options) {
    var results = obj.find();

    // set options if they exist
    if (options) {
      if (options.skip) {
        // console.log('skipping')
        results.skip(options.skip);
      }

      if (options.limit) {
        // console.log('limiting')
        results.limit(options.limit);
      }

      if (options.select) {
        // console.log('selecting')
        results.select(options.select);
      }

      if (options.populate) {
        // console.log('populating')
        results.populate(options.populate);
      }
    }

    // execute the query
    // console.log('executing')
    results.exec(function(err, data) {
      if (err) {
        console.log(err);
      }
      var response = new Response(err, data);
      // console.log('responding')
      res.json(response.getCode(), response.getData());
    });
  },

  /**
   * Updates a single object in the database based on the supplied values.
   * @param  {Objet} obj Mongoose model.
   * @param  {Objet} res Server response object.
   * @param  {String} id Id of the item to update.
   * @param  {Objet} options Mongo query options.
   * @param  {Objet.<Object>} options.receivedData Hash of data values to update
   */
  update: function(obj, res, id, options) {
    var key = null;
    var updates = {
      $set: {},
      $push: {}
    };

    var updateIterator = function(element) {
      if (typeof element === 'string' && typeof options.receivedData[element] !== 'undefined') {
        updates[key][element] = options.receivedData[element];
      } else if (typeof element === 'object' && element.key && typeof element.value  !== 'undefined') {
        updates[key][element.key] = element.value;
      }
    };

    if (typeof res === 'undefined') {
      throw new Error('The update operation requires a response object as the second parameter');
    }

    if (typeof id === 'undefined') {
      throw new Error('The update operation requires an id as the third parameter');
    }

    if (!options || !options.receivedData) {
      throw new Error('The update operation requires an options object with a populated receivedData prop');
    }

    for (var opt in options) {
      // console.log('checking for ' + opt);
      if (options.hasOwnProperty(opt) && updates.hasOwnProperty(opt)) {
        key = opt;
        options[opt].forEach(updateIterator);
      }
    }

    obj.findByIdAndUpdate(id, updates, function(err, data) {
      var response = new Response(err, data);
      res.json(response.getCode(), response.getData());
    });

  },

  /**
   * Deletes an item from the database.
   * @param  {Objet} obj Mongoose model.
   * @param  {Objet} res Server response object.
   * @param  {String} id Id of the item to update.
   */
  del: function(obj, res, id) {
    if (typeof id === 'undefined') {
      throw new Error('The delete operation requires an id as the third parameter');
    }
    obj.findOneAndRemove({_id: id}, function(err, data) {
      data.remove();
      var response = new Response(err, data);
      res.json(response.getCode(), response.getData());
    });
  }
};