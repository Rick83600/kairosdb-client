kairosdb-client
===============

A simple kairosdb client.

# Installation
```bash
$ npm i kairosdb-client -S
```

# Tested with

* node v9.4.0
* npm v5.6.0

# ENV
```bash
$ export KAIROSDB_HOST="http://localhost:5858"
```

# start
```bash
$ npm start
```

# build
```bash
$ npm run build
```

# test
```bash
$ npm test
```
# absolute example from / to
```javascript
import moment from 'moment';
import Kairosdb from '../index';

const kdb = new Kairosdb({
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`
});

const metric = 'my.test.1';
const metric2 = 'my.test.2';

kdb
  .absolute()
  .from(moment().subtract(1, 'minutes').unix())
  .to(moment().unix())
  .metric(metric)
  .metric(metric2)
  .get((err, data) => {
    if (err) {
      return console.error('error', error);
    }
    // Get your data
    console.log(data);
  });
```

# relative example from 5 minutes
```javascript
import moment from 'moment';
import Kairosdb from '../index';

const kdb = new Kairosdb({
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`
});

const metric = 'my.test.1';

kdb
  .relative()
  .from('5m')
  .metric(metric)
  .get((err, data) => {
    if (err) {
      return console.error('error', error);
    }
    // Get your data
    console.log(data);
  });
```

# TODO
* add tests.
* add documentation.
* support du group_by.

# Author
* subk

# contributors
* r!ckl3mer
