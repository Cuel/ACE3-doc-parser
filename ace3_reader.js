'use strict'

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const walk = require('walkdir')
const LineReader = require('line-by-line')

const getLast = arr => arr[arr.length - 1]

exports.read = (dir, options, callback) => {
  let folders = []
  let dirAddons = path.join(dir, 'addons')

  walk(dirAddons, { no_recurse: true })
  .on('error', (dir, e) => callback(e))
  .on('directory', f => folders.push(f))
  .on('end', () => {
    if (!folders.length) return callback(new Error('Found no addon folders'))
    console.info(chalk.green(`INFO: Found ${folders.length} folders`))

    readAllFolders(folders, options)
    .then(data => {
      let ret = {}
      let sorted = data.sort((a, b) => a.prefix.localeCompare(b.prefix))
      sorted.forEach(v => ret[v.prefix] = v.functions)

      callback(null, ret)
    })
    .catch(callback)
  })
}

function readAllFolders (folders, options) {
  return Promise.all(
    folders.map(f => parseComponent(f, options))
  )
}

function parseComponent (folderPath, options) {
  let prefix = getLast(folderPath.split(path.sep))
  let dirFn = path.join(folderPath, 'functions')
  let ret = { prefix }

  return new Promise((resolve, reject) => {
    readFunctionFiles(dirFn, prefix, options)
    .then(functions => {
      ret.functions = functions
      resolve(ret)
    })
    .catch(reject)
  })
}

function readFunctionFiles (dirFn, prefix, options) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirFn, (e, files) => {
      if (e || !files.length) {
        // function folder doesn't exist - thats ok
        if (e.code === 'ENOENT' || !files.length) return resolve([])
        reject(e)
      }

      Promise.all(
        files.filter(v => /^fn.*\.sqf$/i.test(v))
        .sort((a, b) => a.localeCompare(b))
        .map(v => path.resolve(dirFn, v))
        .map(v => {
          if (options.onlyComments) return getComments(v)
          return readFile(v)
        })
      )
      .then(functions => {
        resolve(functions.map(fnc => {
          // replace windows 2x backslash to /
          let file = fnc.filePath.split('addons')[1].replace(/\\/g, '/').substr(1)
          let fncName = path.basename(fnc.filePath)
          let endIdx = fncName.lastIndexOf('.sqf')
          let name = `ACE_${prefix}_${fncName.substring(0, endIdx)}`

          return { name, file, text: fnc.text }
        }))
      })
      .catch(reject)
    })
  })
}

function readFile (filePath) {
  let file = filePath.split('addons')[1].replace(/\\/g, '/').substr(1)
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (e, text) => {
      if (e) return reject(e)
      resolve({ filePath, text, file })
    })
  })
}

function getComments (filePath) {
  return new Promise((resolve, reject) => {
    getFunctionHeaderComments(filePath)
    .then(text => resolve({ filePath, text }))
    .catch(e => {
      console.error(chalk.yellow(e.message))
      resolve({filePath, text: ''})
    })
  })
}

function getFunctionHeaderComments (filePath) {
  var lr = new LineReader(filePath, {skipEmptyLines: true})
  var startParse = false
  var linesRead = 0
  var parsed = []

  return new Promise((resolve, reject) => {
    lr.on('error', e => {
      lr.close()
      reject(e)
    })

    lr.on(`end`, () => {
      if (linesRead < 2) return reject(new Error(`${path.basename(filePath)} - Empy file`))
      if (!parsed) return reject(new Error(`${path.basename(filePath)} - missing documentation?`))
    })

    lr.on(`line`, line => {
      linesRead++

      if (!startParse && linesRead >= 3) reject(new Error(`${filePath} - missing documentation?`))
      if (!startParse && /^\s*\/\*/.test(line)) {
        startParse = true
        return
      } else {
        if (/^\s*\*\/\s*$/.test(line)) {
          lr.close()
          resolve(parsed.join('\r\n'))
        }

        // remove any leading space or stars
        let match = line.match(/^[*\s]*(.*)/)
        if (!match || !match[1]) return

        let str = match[1].trim()
        if (str) parsed.push(str)
      }
    })
  })
}
