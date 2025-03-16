var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite,
    robotstxtjs = require('../src/robotstxt.js'),
    robotstxt = robotstxtjs.robotstxt

module.exports = suite
