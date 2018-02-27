import needle from 'needle';

import async_collections_fn from './asyncCollections';

import {
  parse_sampling_unit,
  parse_sampling_value,
  parse_sampling,
  parse_aggregator_args,
  parse_timerange,
  object_to_array,
  add_classic_sampling_aggregator,
} from './utils';

export default class KairosClient {
  constructor(options, callback) {
    const self = this;
    if (!(this instanceof KairosClient)) {
      return new KairosClient(options, callback);
    }

    this.options = options || {};

    /**
     * http stuff
     */
    this.options.host = this.options.host || `http://localhost:5858`;
    this.options.api = this.options.api || {
      datapoints: '/api/v1/datapoints',
      metricnames: '/api/v1/metricnames',
      version: '/api/v1/version',
      deletemetric: '/api/v1/metric/',
    };
    this.options.mode = this.options.mode || 'absolute';
    this.options.cache = this.options.cache || 0;
    this.options.needle = this.options.needle || {
      headers: {
        compressed: true,
        user_agent: 'wgkdb-client-' + new Date().getTime(),
      },
      json: true,
    };

    if (this.options.timeout) {
      needle.defaults({ timeout: this.options.timeout });
    }

    this.options.force_delete = this.options.force_delete || false;

    /**
     *  telnet write stream
     */
    if (this.options.telnet) {
      this.stream = ev.pause();
      this.stream.pause();
      this.startup = true;
      reconnect(s => {
        self.stream.pipe(s);
        self.stream.resume();
        if (self.startup) {
          self.startup = false;
          callback && callback(self.stream);
        }
      })
        .on('disconnect', () => {
          self.stream.pause();
        })
        .on('error', () => {
          self.stream.pause();
        })
        .connect(this.options.telnet.port, this.options.telnet.host);
    }

    /**
     *  init...
     */
    this.readQueries = [];
    this.writeQueries = [];

    /**
     *  register async collection methods
     */
    for (let m in async_collections_fn) {
      this[async_collections_fn[m]] = (callback, endCallback) => {
        return self.async(async_collections_fn[m], callback, endCallback);
      };
    }
  }

  batch() {
    this.readQueries.push({
      metrics: [],
      cache_time: this.options.cache,
    });
    return this;
  }

  currentReadQuery() {
    if (!this.readQueries.length) {
      this.readQueries.push({
        metrics: [],
        cache_time: this.options.cache,
      });
    }
    return this.readQueries[this.readQueries.length - 1];
  }

  currentWriteQuery() {
    if (!this.writeQueries.length) {
      this.writeQueries.push([]);
    }
    return this.writeQueries[this.writeQueries.length - 1];
  }

  currentReadMetric() {
    let query = this.currentReadQuery();
    return query.metrics[query.metrics.length - 1];
  }

  currentWriteMetric() {
    let query = this.currentWriteQuery();
    if (!query.length) {
      query.push({
        name: '',
        datapoints: [],
        tags: { add: 'tag' },
      });
    }
    return query[query.length - 1];
  }

  dump() {
    console.log(this.writeQueries);
    return this;
  }

  cache(ms) {
    this.options.cache = this.currentReadQuery().cache_time = ms;
    return this;
  }

  relative(from) {
    this.options.mode = 'relative';
    if (from) {
      this.from(from);
    }
    return this;
  }

  absolute(from, to) {
    this.options.mode = 'absolute';
    if (from) {
      this.from(from);
    }
    if (to) {
      this.to(to);
    }
    return this;
  }

  from(mixed_arg, moment_format) {
    let ret = parse_timerange.apply(this, [mixed_arg, moment_format]);
    delete this.currentReadQuery().start_relative;
    delete this.currentReadQuery().start_absolute;
    this.options.mode === 'relative'
      ? (this.currentReadQuery().start_relative = ret)
      : (this.currentReadQuery().start_absolute = ret);
    return this;
  }

  to(mixed_arg, moment_format) {
    let ret = parse_timerange.apply(this, [mixed_arg, moment_format]);
    delete this.currentReadQuery().end_relative;
    delete this.currentReadQuery().end_absolute;
    this.options.mode === 'relative'
      ? (this.currentReadQuery().end_relative = ret)
      : (this.currentReadQuery().end_absolute = ret);
    return this;
  }

  range(from, to, moment_format) {
    return this.from(from, moment_format).to(to, moment_format);
  }

  metric(name) {
    this.currentWriteMetric().name = name;
    this.currentReadQuery().metrics.push({
      name: name,
      aggregators: [],
      tags: {},
    });
    return this;
  }

  tags(tagname) {
    let metric = this.currentReadMetric();
    if (!metric.tags[tagname]) {
      metric.tags[tagname] = [];
    }
    let values = object_to_array(arguments);
    values.shift();
    metric.tags[tagname] = metric.tags[tagname].concat(values);
    return this;
  }

  _get(query, callback) {
    needle.post(
      this.options.host + this.options.api.datapoints + '/query',
      query,
      this.options.needle,
      (err, response) => {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body) {
          return callback(
            new Error('unknown error occured, please try again.')
          );
        }
        if (response.body.errors) {
          return callback(new Error(response.body.errors));
        }

        let count = response.body.queries.length;
        if (!count) {
          return callback(err, null);
        }

        let r = [];
        response.body.queries.forEach(rs => {
          r.push(rs.results[0]);
        });

        callback(null, r);
      }
    );
  }

  get(callback) {
    if (!this.currentReadQuery().metrics.length) {
      throw new Error('missing metric');
    }
    let query = this.readQueries.pop();
    if (query) {
      this._get(query, callback);
    }

    return this;
  }

  post(callback) {
    let self = this;
    if (!this.currentWriteQuery().length) {
      throw new Error('missing metric');
    }
    let query = this.writeQueries.pop();
    if (query) {
      needle.post(
        this.options.host + this.options.api.datapoints,
        query,
        this.options.needle,
        (err, response) => {
          if (err) {
            return callback(err);
          }
          if (response.body && response.body.errors) {
            return callback(new Error(response.body.errors));
          }
          let r = response.body;
          callback(err, r);
        }
      );
    }
  }

  async(method, callback, endCallback) {
    let self = this;
    if (!this.currentReadQuery().metrics.length) {
      throw new Error('missing metric');
    }

    let query = this.readQueries.pop();
    self._get(query, (err, results) => {
      if (err) {
        return next(err);
      }
      async[method](results, callback, endCallback);
    });

    return this;
  }

  /**
   *  sampling aggregators...
   */

  avg() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['avg'].concat(object_to_array(arguments))
    );
  }

  sum() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['sum'].concat(object_to_array(arguments))
    );
  }

  min() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['min'].concat(object_to_array(arguments))
    );
  }

  max() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['max'].concat(object_to_array(arguments))
    );
  }

  dev() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['dev'].concat(object_to_array(arguments))
    );
  }

  count() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['count'].concat(object_to_array(arguments))
    );
  }

  least_squares() {
    return add_classic_sampling_aggregator.apply(
      this,
      ['least_squares'].concat(object_to_array(arguments))
    );
  }

  /**
   *  divisor...
   */
  div() {
    let agg_args = parse_aggregator_args.apply(this, arguments);
    this.currentReadMetric().aggregators.push({
      name: 'div',
      divisor: '' + agg_args.numbers.shift(),
    });
    return this;
  }

  /**
   *  scale...
   */
  scale() {
    let agg_args = parse_aggregator_args.apply(this, arguments);
    this.currentReadMetric().aggregators.push({
      name: 'scale',
      factor: '' + agg_args.numbers.shift(),
    });
    return this;
  }

  /**
   *  rate ...
   */
  rate() {
    let agg_args = parse_aggregator_args.apply(this, arguments);
    this.currentReadMetric().aggregators.push({
      name: 'rate',
      unit: parse_sampling_unit(agg_args.strings.shift()),
    });
    return this;
  }

  /**
   *  sampler ...
   */
  sampler() {
    let agg_args = parse_aggregator_args.apply(this, arguments);
    this.currentReadMetric().aggregators.push({
      name: 'sampler',
      unit: parse_sampling_unit(agg_args.strings.shift()),
    });
    return this;
  }

  /**
   *  percentile ...
   */
  percentile() {
    let agg_args = parse_aggregator_args.apply(this, arguments);
    this.currentReadMetric().aggregators.push({
      name: 'percentile',
      sampling: parse_sampling(agg_args.strings.shift()),
      percentile: '' + agg_args.numbers.shift(),
    });
    return this;
  }

  /**
   *  set data to write through POST
   */
  data(arrayOfarray) {
    this.currentWriteMetric().datapoints = arrayOfarray;
    return this;
  }

  /**
   *  set data type to write through POST
   */
  type(type) {
    this.currentWriteMetric().type = type;
    return this;
  }

  /**
   *  list metrics name
   */
  metrics() {
    let regex = arguments[0];
    let callback = arguments[1];

    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
      regex = arguments[1];
    }

    needle.get(
      this.options.host + this.options.api.metricnames,
      (err, response) => {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body.results) {
          return callback(new Error('an error occured, please try again.'));
        }

        if (regex) {
          callback(
            err,
            response.body.results.filter(item => {
              return item.match(regex);
            })
          );
        } else {
          callback(err, response.body.results);
        }
      }
    );
    return this;
  }

  /**
   *  get version
   */
  version(callback) {
    needle.get(
      this.options.host + this.options.api.version,
      (err, response) => {
        if (err) {
          return callback(err);
        }
        if (!response || !response.body || !response.body.version) {
          return callback(new Error('an error occured, please try again.'));
        }
        callback(err, response.body.version);
      }
    );
  }

  /**
   *  delete things !@#
   */
  delete(arg, callback) {
    // delete metrics
    if (arg instanceof RegExp) {
      let regex = arg;
      this.metrics(regex, (err, metrics) => {
        if (err) {
          return callback(err);
        }

        async.each(
          metrics,
          (m, next) => {
            // do forced delete
            console.log('deleting ' + m);
          },
          callback
        );
      });
    } else if (typeof arg === 'object') {
      // evaluate as an object query, delete datapoints
    }
  }
}
