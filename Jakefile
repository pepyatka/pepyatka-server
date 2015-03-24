var exec = require('child_process').exec;

task('default', ['test'])

desc('Runs all of the test files in the test directories.')
task('test', function (params, b) {
  var proc = exec('NODE_ENV=test ./node_modules/mocha/bin/mocha')
  proc.on('exit', process.exit)
  proc.stdout.pipe(process.stdout, { end: false })
  proc.stderr.pipe(process.stderr, { end: false })
}, {async: true})

desc('Calculates test coverage of the test files in the test directories.')
task('coverage', function (params, b) {
  var proc = exec('NODE_ENV=test ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha -- -R spec');
  proc.on('exit', process.exit)
  proc.stdout.pipe(process.stdout, { end: false })
  proc.stderr.pipe(process.stderr, { end: false })
}, {async: true})
