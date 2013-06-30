var Proto = require('uberproto');
var error = require('../errors');
var mongo = require('mongoskin');
var _ = require('underscore');

// TODO (EK): Does order matter for how these filters
// are applied? I think it does or at least it should.

var filters = {
  sort: function (values, param) {
    return _.sortBy(values, function (item) {
      return item[param];
    });
  },
  order: function (values) {
    return values.reverse();
  },
  skip: function (values, param) {
    return values.slice(param);
  },
  limit: function (values, param) {
    return values.slice(0, param);
  }
};

var MongoService = Proto.extend({

  // TODO (EK): How do we handle indexes?
  init: function (options) {
    options = options || {};

    this._id = options.idField || '_id';
    this.store = options.store || null;

    if (!this.store){
      this._connect(options);
    }
  },

  // NOTE (ek): We create a new database connection for every MongoService.
  // This may not be good but I think you could share connections by
  // passing the store as an option to the MongoService. The rational for this
  // design is because each user of a MongoService instance could be a separate
  // app residing on a totally different server.

  // TODO (EK): We need to handle replica sets.
  _connect: function(options){
    this.host = options.host || 'localhost';
    this.port = options.port || 27017;
    this.database = options.database || 'test';

    ackOptions = {
      w: options.w || 1,                 // write acknowledgment
      journal: options.journal || true,  // waits for journal before acknowledgment
      fsync: options.fsync || true       // waits for syncing to disk before acknowledgment
    };

    if (options.safe) {
      ackOptions = { safe: options.safe };
    }

    var connectionString = this.host + ':' + this.port + '/' + this.database;

    if (options.username && options.password){
      connectionString =+ options.username + ':' + options.password + '@';
    }

    if (options.reconnect) connectionString += '?auto_reconnect=true';

    this.store = mongo.db(connectionString, ackOptions);
  },

  find: function (params, cb) {
    var values = _.values(this.store);

    _.each(filters, function(handler, name) {
      values = params[name] ? handler(values, params[name]) : values;
    });

    cb(null, values);
  },

  // TODO: This should support more than id
  get: function (criteria, params, cb) {
    criteria = criteria || {};
    var id = criteria.id;

    if (id in this.store) {
      cb(null, this.store[id]);
      return;
    }
    cb(new error.NotFound('Could not find record', { id: id }));
  },

  create: function (data, params, cb) {
    var collection = params.collection;
    delete params.collection;

    if (!collection) return cb(new Error('No collection specified'));

    this.store.collection(collection).insert(data, params, cb);
  },

  update: function (id, data, cb) {
    var collection = params.collection;
    delete params.collection;

    if (!collection) return cb(new Error('No collection specified'));

    this.store.collection(collection).updateById(id, data, params, cb);
  },

  destroy: function (id, params, cb) {
    var collection = params.collection;
    delete params.collection;

    if (!collection) return cb(new Error('No collection specified'));

    this.store.collection(collection).removeById(id, data, params, cb);
  }
});

module.exports = MongoService;