/*
* Parses an ACE3 folder for functions and more
* procudes json format output
*
* Takes 2 command line arguments:
* -p <path> - The path for ACE3
* -o <path> - A full path including filename for output file in json format. [Default: this folder + "ace3_docs.json"]
*/

'use strict'

var path = require('path')
var fs = require('fs')
var newLine = require('os').EOL

var now = require('performance-now')
var chalk = require('chalk')
var LineReader = require('line-by-line')

var start = now()
var argv = require('minimist')(process.argv.slice(2))
var folder = argv['p']

if (!folder) throw new Error('Enter ACE3 path with "-p <path>"')
if (!fs.existsSync(folder)) throw new Error('Invalid ACE3 directory: %s', folder)

var addonsRoot = path.join(folder, 'addons')
if (!fs.existsSync(addonsRoot)) throw new Error('Could not find addons folder inside: %s', folder)

var output = argv['o']
if (!output) {
  output = path.join(__dirname, ('ace3_docs.json'))
  console.info(chalk.grey('INFO: -o output argument missing, using %s'), output)
}

var MAIN_PREFIX = 'ACE'
var ret = {}
var parsedDirs = 0
var totalDirs = 0
var amountFunctions = 0

fs.readdir(addonsRoot, function (err, dirs) {
  if (err) throw err
  if (dirs.length === 0) throw new Error('No directories found in \addons')

  dirs.forEach(parseComponentFolder)
})

function parseComponentFolder (componentDir) {
  fs.stat(path.join(addonsRoot, componentDir), function (err, stat) {
    if (err) throw err

    if (stat.isDirectory()) {
      totalDirs++

      getComponentPrefix(componentDir, function (err, prefix) {
        if (err) throw err

        var component = ret[prefix] = {}
        parseFunctionsDir(componentDir, prefix, function (err, functions) {
          if (err) throw err
          component.functions = functions

          if (++parsedDirs === totalDirs) {
            fs.writeFile(output, JSON.stringify(ret, null, 2), function (err) {
              if (err) throw err

              console.log(chalk.green('\nTraversed %d/%d folders, parsed %d functions'), parsedDirs, totalDirs, amountFunctions)
              console.log(chalk.green('Done, %d seconds'), ((now() - start) / 1000).toFixed(2))
            })
          }
        })
      })
    }
  })
}

var regComponent = /\bdefine COMPONENT(.*)/i
function getComponentPrefix (dir, callback) {
  var scriptComponentFile = path.join(addonsRoot, dir, 'script_component.hpp')
  fs.readFile(scriptComponentFile, 'utf8', function (err, data) {
    var prefix = ((data.match(regComponent) || [null, ''])[1]).trim().toLowerCase()
    if (err || !prefix) return callback(err || new Error('Could not find component name in: ' + dir))

    callback(null, prefix)
  })
}

function parseFunctionsDir (componentDir, componentPrefix, callback) {
  var dir = path.join(addonsRoot, componentDir, 'functions')
  fs.readdir(dir, function (err, files) {
    // enoent - folder doesnt exist, ignore
    if (err && err.code === 'ENOENT') return callback(null, [])
    if (err) return callback(err)
    if (files.length === 0) return callback(null, [])

    var totFiles = 0
    var filesParsed = 0
    var funcs = []

    files.forEach(function (fileName) {
      if (/fnc_/i.test(fileName) && path.extname(fileName).substr(1) === 'sqf') {
        amountFunctions++
        totFiles++
        parseFunctionFile(path.join(dir, fileName), function (err, data) {
          if (err) throw err

          funcs.push({
            name: (MAIN_PREFIX + '_' + componentPrefix + '_' + fileName.split('.').slice(0, 1)).trim(),
            info: data
          })
          if (++filesParsed === totFiles) callback(null, funcs)
        })
      }
    })

    // if totFiles didn't increase there's no functions
    if (filesParsed === totFiles) callback(null, funcs)
  })
}

function parseFunctionFile (filePath, callback) {
  var lr = new LineReader(filePath, {skipEmptyLines: true})
  var read = ''
  var start = false

  lr.on('error', function (err) {
    lr.close()
    return callback(err)
  })

  lr.on('end', function () {
    if (!start) {
      console.warn(chalk.yellow('File missing documentation? (%s)'), filePath)
      return callback(null, '')
    }
  })

  lr.on('line', function (line) {
    lr.pause()
    line = line.trim()

    // start comment
    if (!start && /(^\/\*)/.test(line)) {
      start = true
      lr.resume()
      return
    }

    // end comment
    if (/(\*\/)$/.test(line)) {
      lr.close()
      return callback(null, read)
    }

    if (start) read = read + (line.substr(line.indexOf('*') + 1)) + newLine
    lr.resume()
  })
}
