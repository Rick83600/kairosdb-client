'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _needle = require('needle');

var _needle2 = _interopRequireDefault(_needle);

var _asyncCollections = require('./asyncCollections');

var _asyncCollections2 = _interopRequireDefault(_asyncCollections);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KairosClient = function () {
  function KairosClient(options, callback) {
    var _this = this;

    _classCallCheck(this, KairosClient);

    var self = this;
    if (!(this instanceof KairosClient)) {
      return new KairosClient(options, callback);
    }

    this.options = options || {};

    /**
     * http stuff
     */
    this.options.host = this.options.host || process.env.KAIROSDB_HOST;
    this.options.api = this.options.api || {
      datapoints: '/api/v1/datapoints',
      metricnames: '/api/v1/metricnames',
      version: '/api/v1/version',
      deletemetric: '/api/v1/metric/'
    };
    this.options.mode = this.options.mode || 'absolute';
    this.options.cache = this.options.cache || 0;
    this.options.needle = this.options.needle || {
      headers: {
        compressed: true,
        user_agent: 'wgkdb-client-' + new Date().getTime()
      },
      json: true
    };

    if (this.options.timeout) {
      _needle2.default.defaults({ timeout: this.options.timeout });
    }

    this.options.force_delete = this.options.force_delete || false;

    /**
     *  telnet write stream
     */
    if (this.options.telnet) {
      this.stream = ev.pause();
      this.stream.pause();
      this.startup = true;
      reconnect(function (s) {
        self.stream.pipe(s);
        self.stream.resume();
        if (self.startup) {
          self.startup = false;
          callback && callback(self.stream);
        }
      }).on('disconnect', function () {
        self.stream.pause();
      }).on('error', function () {
        self.stream.pause();
      }).connect(this.options.telnet.port, this.options.telnet.host);
    }

    /**
     *  init...
     */
    this.readQueries = [];
    this.writeQueries = [];

    /**
     *  register async collection methods
     */

    var _loop = function _loop(m) {
      _this[_asyncCollections2.default[m]] = function (callback, endCallback) {
        return self.async(_asyncCollections2.default[m], callback, endCallback);
      };
    };

    for (var m in _asyncCollections2.default) {
      _loop(m);
    }
  }

  _createClass(KairosClient, [{
    key: 'batch',
    value: function batch() {
      this.readQueries.push({
        metrics: [],
        cache_time: this.options.cache
      });
      return this;
    }
  }, {
    key: 'currentReadQuery',
    value: function currentReadQuery() {
      if (!this.readQueries.length) {
        this.readQueries.push({
          metrics: [],
          cache_time: this.options.cache
        });
      }
      return this.readQueries[this.readQueries.length - 1];
    }
  }, {
    key: 'currentWriteQuery',
    value: function currentWriteQuery() {
      if (!this.writeQueries.length) {
        this.writeQueries.push([]);
      }
      return this.writeQueries[this.writeQueries.length - 1];
    }
  }, {
    key: 'currentReadMetric',
    value: function currentReadMetric() {
      var query = this.currentReadQuery();
      return query.metrics[query.metrics.length - 1];
    }
  }, {
    key: 'currentWriteMetric',
    value: function currentWriteMetric() {
      var query = this.currentWriteQuery();
      if (!query.length) {
        query.push({
          name: '',
          datapoints: [],
          tags: { add: 'tag' }
        });
      }
      return query[query.length - 1];
    }
  }, {
    key: 'dump',
    value: function dump() {
      console.log(this.writeQueries);
      return this;
    }
  }, {
    key: 'cache',
    value: function cache(ms) {
      this.options.cache = this.currentReadQuery().cache_time = ms;
      return this;
    }
  }, {
    key: 'relative',
    value: function relative(from) {
      this.options.mode = 'relative';
      if (from) {
        this.from(from);
      }
      return this;
    }
  }, {
    key: 'absolute',
    value: function absolute(from, to) {
      this.options.mode = 'absolute';
      if (from) {
        this.from(from);
      }
      if (to) {
        this.to(to);
      }
      return this;
    }
  }, {
    key: 'from',
    value: function from(mixed_arg, moment_format) {
      var ret = _utils.parse_timerange.apply(this, [mixed_arg, moment_format]);
      delete this.currentReadQuery().start_relative;
      delete this.currentReadQuery().start_absolute;
      this.options.mode === 'relative' ? this.currentReadQuery().start_relative = ret : this.currentReadQuery().start_absolute = ret;
      return this;
    }
  }, {
    key: 'to',
    value: function to(mixed_arg, moment_format) {
      var ret = _utils.parse_timerange.apply(this, [mixed_arg, moment_format]);
      delete this.currentReadQuery().end_relative;
      delete this.currentReadQuery().end_absolute;
      this.options.mode === 'relative' ? this.currentReadQuery().end_relative = ret : this.currentReadQuery().end_absolute = ret;
      return this;
    }
  }, {
    key: 'range',
    value: function range(from, to, moment_format) {
      return this.from(from, moment_format).to(to, moment_format);
    }
  }, {
    key: 'metric',
    value: function metric(name) {
      this.currentWriteMetric().name = name;
      this.currentReadQuery().metrics.push({
        name: name,
        aggregators: [],
        tags: {}
      });
      return this;
    }
  }, {
    key: 'tags',
    value: function tags(tagname) {
      var metric = this.currentReadMetric();
      if (!metric.tags[tagname]) {
        metric.tags[tagname] = [];
      }
      var values = (0, _utils.object_to_array)(arguments);
      values.shift();
      metric.tags[tagname] = metric.tags[tagname].concat(values);
      return this;
    }
  }, {
    key: '_get',
    value: function _get(query, callback) {
      _needle2.default.post(this.options.host + this.options.api.datapoints + '/query', query, this.options.needle, function (err, response) {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body) {
          return callback(new Error('unknown error occured, please try again.'));
        }
        if (response.body.errors) {
          return callback(new Error(response.body.errors));
        }

        var count = response.body.queries.length;
        if (!count) {
          return callback(err, null);
        }

        var r = [];
        response.body.queries.forEach(function (rs) {
          r.push(rs.results[0]);
        });

        callback(null, r);
      });
    }
  }, {
    key: 'get',
    value: function get(callback) {
      if (!this.currentReadQuery().metrics.length) {
        throw new Error('missing metric');
      }
      var query = this.readQueries.pop();
      if (query) {
        this._get(query, callback);
      }

      return this;
    }
  }, {
    key: 'post',
    value: function post(callback) {
      var self = this;
      if (!this.currentWriteQuery().length) {
        throw new Error('missing metric');
      }
      var query = this.writeQueries.pop();
      if (query) {
        _needle2.default.post(this.options.host + this.options.api.datapoints, query, this.options.needle, function (err, response) {
          if (err) {
            return callback(err);
          }
          if (response.body && response.body.errors) {
            return callback(new Error(response.body.errors));
          }
          var r = response.body;
          callback(err, r);
        });
      }
    }
  }, {
    key: 'async',
    value: function (_async) {
      function async(_x, _x2, _x3) {
        return _async.apply(this, arguments);
      }

      async.toString = function () {
        return _async.toString();
      };

      return async;
    }(function (method, callback, endCallback) {
      var self = this;
      if (!this.currentReadQuery().metrics.length) {
        throw new Error('missing metric');
      }

      var query = this.readQueries.pop();
      self._get(query, function (err, results) {
        if (err) {
          return next(err);
        }
        async[method](results, callback, endCallback);
      });

      return this;
    })

    /**
     *  sampling aggregators...
     */

  }, {
    key: 'avg',
    value: function avg() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['avg'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'sum',
    value: function sum() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['sum'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'min',
    value: function min() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['min'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'max',
    value: function max() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['max'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'dev',
    value: function dev() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['dev'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'count',
    value: function count() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['count'].concat((0, _utils.object_to_array)(arguments)));
    }
  }, {
    key: 'least_squares',
    value: function least_squares() {
      return _utils.add_classic_sampling_aggregator.apply(this, ['least_squares'].concat((0, _utils.object_to_array)(arguments)));
    }

    /**
     *  divisor...
     */

  }, {
    key: 'div',
    value: function div() {
      var agg_args = _utils.parse_aggregator_args.apply(this, arguments);
      this.currentReadMetric().aggregators.push({
        name: 'div',
        divisor: '' + agg_args.numbers.shift()
      });
      return this;
    }

    /**
     *  scale...
     */

  }, {
    key: 'scale',
    value: function scale() {
      var agg_args = _utils.parse_aggregator_args.apply(this, arguments);
      this.currentReadMetric().aggregators.push({
        name: 'scale',
        factor: '' + agg_args.numbers.shift()
      });
      return this;
    }

    /**
     *  rate ...
     */

  }, {
    key: 'rate',
    value: function rate() {
      var agg_args = _utils.parse_aggregator_args.apply(this, arguments);
      this.currentReadMetric().aggregators.push({
        name: 'rate',
        unit: (0, _utils.parse_sampling_unit)(agg_args.strings.shift())
      });
      return this;
    }

    /**
     *  sampler ...
     */

  }, {
    key: 'sampler',
    value: function sampler() {
      var agg_args = _utils.parse_aggregator_args.apply(this, arguments);
      this.currentReadMetric().aggregators.push({
        name: 'sampler',
        unit: (0, _utils.parse_sampling_unit)(agg_args.strings.shift())
      });
      return this;
    }

    /**
     *  percentile ...
     */

  }, {
    key: 'percentile',
    value: function percentile() {
      var agg_args = _utils.parse_aggregator_args.apply(this, arguments);
      this.currentReadMetric().aggregators.push({
        name: 'percentile',
        sampling: (0, _utils.parse_sampling)(agg_args.strings.shift()),
        percentile: '' + agg_args.numbers.shift()
      });
      return this;
    }

    /**
     *  set data to write through POST
     */

  }, {
    key: 'data',
    value: function data(arrayOfarray) {
      this.currentWriteMetric().datapoints = arrayOfarray;
      return this;
    }

    /**
     *  set data type to write through POST
     */

  }, {
    key: 'type',
    value: function type(_type) {
      this.currentWriteMetric().type = _type;
      return this;
    }

    /**
     *  list metrics name
     */

  }, {
    key: 'metrics',
    value: function metrics() {
      var regex = arguments[0];
      var callback = arguments[1];

      if (typeof arguments[0] === 'function') {
        callback = arguments[0];
        regex = arguments[1];
      }

      _needle2.default.get(this.options.host + this.options.api.metricnames, function (err, response) {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body.results) {
          return callback(new Error('an error occured, please try again.'));
        }

        if (regex) {
          callback(err, response.body.results.filter(function (item) {
            return item.match(regex);
          }));
        } else {
          callback(err, response.body.results);
        }
      });
      return this;
    }

    /**
     *  get version
     */

  }, {
    key: 'version',
    value: function version(callback) {
      _needle2.default.get(this.options.host + this.options.api.version, function (err, response) {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body || !response.body.version) {
          return callback(new Error('an error occured, please try again.'));
        }
        callback(err, response.body.version);
      });
    }

    /**
     *  delete things !@#
     */

  }, {
    key: 'delete',
    value: function _delete(arg, callback) {
      // delete metrics
      if (arg instanceof RegExp) {
        var regex = arg;
        this.metrics(regex, function (err, metrics) {
          if (err) {
            return callback(err);
          }

          async.each(metrics, function (m, next) {
            // do forced delete
            console.log('deleting ' + m);
          }, callback);
        });
      } else if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object') {
        // evaluate as an object query, delete datapoints
      }
    }
  }]);

  return KairosClient;
}();

exports.default = KairosClient;