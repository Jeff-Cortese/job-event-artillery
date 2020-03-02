const SQS = require('aws-sdk').SQS;
const debug = require('debug')('engine:sns');
const Async = require('async');
const _ = require('lodash');
const uuid = require('uuid').v4;

process.env.AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1;

function SNSEngine(script, ee, helpers) {
  this.script = script;
  this.ee = ee;
  this.helpers = helpers;

  return this;
}

SNSEngine.prototype.createScenario = function createScenario(scenarioSpec, ee) {
  const tasks = scenarioSpec.flow.map(rs => this.step(rs, ee));

  return this.compile(tasks, scenarioSpec.flow, ee);
};

SNSEngine.prototype.step = function step(rs, ee) {
  const self = this;

  if (rs.loop) {
    const steps = rs.loop.map(loopStep => this.step(loopStep, ee));

    return this.helpers.createLoopWithCount(rs.count || -1, steps,{
      loopValue: rs.loopValue || '$loopCount',
      overValues: rs.over,
      whileTrue: self.script.config.processor
        ? self.script.config.processor[rs.whileTrue] : undefined
    });
  }

  if (rs.log) {
    return function log(context, callback) {
      return process.nextTick(function () {
        callback(null, context);
      });
    };
  }

  if (rs.think) {
    return this.helpers.createThink(rs, _.get(self.config, 'defaults.think', {}));
  }

  if (rs.function) {
    return function (context, callback) {
      let func = self.config.processor[rs.function];
      if (!func) {
        return process.nextTick(function () {
          callback(null, context);
        });
      }

      return func(context, ee, function () {
        return callback(null, context);
      });
    };
  }

  if (rs.publish) {
    return function publish(context, callback) {
      const params = {
        MessageGroupId: `group-${context.id}`,
        MessageDeduplicationId: `m-${uuid()}`,
        MessageBody: rs.publish.data,
        QueueUrl: self.script.config.fifo.queueUrl
      };

      ee.emit('request');
      const startedAt = process.hrtime();

      context.sqs.sendMessage(params, function (err, data) {
        if (err) {
          debug(err);
          ee.emit('error', err);
          return callback(err, context);
        }

        const endedAt = process.hrtime(startedAt);
        const delta = (endedAt[0] * 1e9) + endedAt[1];
        ee.emit('response', delta, 'successful', context._uid);
        debug(data);
        return callback(null, context);
      });
    };
  }

  return function (context, callback) {
    return callback(null, context);
  };
};

SNSEngine.prototype.compile = function compile(tasks, scenarioSpec, ee) {
  const self = this;
  const sqs = new SQS({region: self.script.config.fifo.region || 'us-west-2'});

  return function scenario(initialContext, callback) {
    const init = function init(next) {
      initialContext.sqs = sqs;
      initialContext.id = uuid();
      ee.emit('started');
      return next(null, initialContext);
    };

    let steps = [init].concat(tasks);

    Async.waterfall(
      steps,
      function done(err, context) {
        if (err) {
          debug(err);
        }

        return callback(err, context);
      });
  };
};

module.exports = SNSEngine;
