'use strict'

const chalk = require('chalk')
const ace3Reader = require('./ace3_reader')

const defaultOptions = {
  onlyComments: true
}

exports.getFunctions = function (ace3RootDir, options, callback) {
  if (!ace3RootDir || typeof ace3RootDir !== 'string') {
    return callback(new Error('Argument must be ace3 root folder'))
  }

  console.time('Get ACE3 documentation')
  let opts = defaultOptions
  if (typeof options === 'function') callback = options
  else opts = Object.assign(defaultOptions, options)

  ace3Reader.read(ace3RootDir, opts, (err, functions) => {
    if (err) return callback(err)

    let k = Object.keys(functions)
    let amountFn = k.map(v => functions[v].length).reduce((a, b) => a + b, 0)

    console.log(chalk.green(`\nFound ${k.length} components, read ${amountFn} functions files`))
    console.timeEnd('Get ACE3 documentation')

    callback(null, functions)
  })
}
