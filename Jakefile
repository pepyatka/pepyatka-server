var exec = require('child_process').exec;

task('default', ['test'])

desc('Runs all of the test files in the test directories.')
task('test', function (params) {
  var proc = exec('NODE_ENV=test mocha');
  proc.on('exit', process.exit);
  proc.stdout.pipe(process.stdout, { end: false });
  proc.stderr.pipe(process.stderr, { end: false });
}, {async: true})
