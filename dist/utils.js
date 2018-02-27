'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 *  helpers ....
 */
function parse_sampling_unit(str) {
  var regex = /(milliseconds?|ms|Ms|MS)|(seconds?|s|S)|(minutes?|m$)|(hours?|h|H)|(days?|d|D)|(weeks?|w|W)|(months?|M)|(years?|y|Y)/;
  var matches = regex.exec(str);
  if (matches && matches.length) {
    var unit = matches[0];
    if (unit !== 'M') {
      unit = unit.toLowerCase();
    }
    switch (unit) {
      case 'ms':
        unit = 'milliseconds';
        break;
      case 's':
        unit = 'seconds';
        break;
      case 'm':
        unit = 'minutes';
        break;
      case 'h':
        unit = 'hours';
        break;
      case 'd':
        unit = 'days';
        break;
      case 'w':
        unit = 'weeks';
        break;
      case 'M':
        unit = 'months';
        break;
      case 'y':
        unit = 'years';
        break;
    }
    if (unit.charAt(unit.length - 1) !== 's') {
      unit += 's';
    }
    return unit;
  } else {
    throw new Error('unknown time unit');
  }
}

function parse_sampling_value(str) {
  var value = parseInt(str);
  if (isNaN(value)) {
    throw new Error('bad sampling value');
  }
  return value;
}

function parse_sampling(str) {
  return {
    value: parse_sampling_value(str),
    unit: parse_sampling_unit(str)
  };
}

function parse_aggregator_args() {
  var ret = {
    strings: [],
    numbers: [],
    booleans: [],
    objects: []
  };
  for (var i = 0; i < arguments.length; i++) {
    switch (_typeof(arguments[i])) {
      case 'string':
        ret.strings.push(arguments[i]);
        break;
      case 'number':
        ret.numbers.push(arguments[i]);
        break;
      case 'boolean':
        ret.booleans.push(arguments[i]);
        break;
      case 'object':
        ret.objects.push(arguments[i]);
        break;
    }
  }
  return ret;
}

function parse_timerange(mixed_arg, moment_format) {
  var ret = void 0;
  if (this.options.mode === 'relative') {
    ret = parse_sampling(mixed_arg);
  } else {
    if (typeof mixed_arg === 'number') {
      // support unix timestamp in seconds
      if (mixed_arg.toString().length < 13) {
        mixed_arg *= 1000;
      }
      ret = mixed_arg;
    } else {
      ret = moment(mixed_arg, moment_format).valueOf();
    }
  }
  return ret;
}

function object_to_array(o) {
  var r = [];
  for (var k in o) {
    r.push(o[k]);
  }
  return r;
}

function add_classic_sampling_aggregator() {
  var argv = object_to_array(arguments);
  var name = argv.shift();
  var agg_args = parse_aggregator_args.apply(this, argv);
  var sampling = parse_sampling(agg_args.strings.shift());
  this.currentReadMetric().aggregators.push({
    name: name,
    sampling: sampling,
    align_sampling: agg_args.booleans.shift() || true
  });
  return this;
}

exports.parse_sampling_unit = parse_sampling_unit;
exports.parse_sampling_value = parse_sampling_value;
exports.parse_sampling = parse_sampling;
exports.parse_aggregator_args = parse_aggregator_args;
exports.parse_timerange = parse_timerange;
exports.object_to_array = object_to_array;
exports.add_classic_sampling_aggregator = add_classic_sampling_aggregator;