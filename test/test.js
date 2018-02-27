import { expect } from 'chai';
import KairosClient from '../src/index';
import moment from 'moment';

const options = {
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`,
};

describe('kairosdb-client', function() {
  this.timeout(process.env.MOCHA_TIMEOUT || 15000);

  let client;
  const metric = 'data.ieece.54006e72ee2cbf4d3d5ad85e';

  before(done => {
    client = new KairosClient(options);
    done();
  });

  describe('#global', function() {
    it('should be an instanceof', () => {
      expect(client).to.be.an.instanceof(KairosClient);
    });
  });

  describe('#basic example', function() {
    it(`should return some data from ${metric} absolute mode`, done => {
      client
        .absolute()
        .from(
          moment()
            .subtract(1, 'minutes')
            .unix()
        )
        .to(moment().unix())
        .metric(metric)
        .get((err, data) => {
          expect(err).to.be.null;
          expect(data).to.exist;
          expect(data).to.be.an('array');
          expect(data[0].name).to.equal(metric);
          const values = data[0].values;
          expect(values).to.be.an('array').that.is.not.empty;
          done();
        });
    });

    it(`should return some data from ${metric} relative mode`, done => {
      client
        .relative()
        .from('5m')
        .metric(metric)
        .get((err, data) => {
          expect(err).to.be.null;
          expect(data).to.exist;
          expect(data).to.be.an('array');
          expect(data[0].name).to.equal(metric);
          const values = data[0].values;
          expect(values).to.be.an('array').that.is.not.empty;
          done();
        });
    });
  });
});
