'use strict'

const fs = require('fs')
const chalk = require('chalk')
const reader = require('./ace3_reader')

const dir = process.argv.slice(2)[0]
if (!dir) throw new Error('Argument must be ace3 root folder')

console.time('Get ACE3 documentation')
reader.getFunctions(dir, (e, functions) => {
  if (e) throw e

  let k = Object.keys(functions)
  let amountFn = k.map(v => functions[v].length).reduce((a, b) => a + b, 0)

  console.log(chalk.green(`\nFound ${k.length} components, read ${amountFn} functions files`))
  console.timeEnd('Get ACE3 documentation')

  fs.writeFile('./ace3_docs.json', JSON.stringify(functions, null, 2))
})
