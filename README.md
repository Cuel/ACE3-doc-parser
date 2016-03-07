# ace3-functions-reader
Parses ACE3 addons folders and functions files for documentation

Can return only comments or entire function files, with function names resolved

## Usage
```javascript
var ace3reader = require('ace3-functions-reader')
let ace3RootDir = 'C:/ace3'
ace3reader.getFunctions(ace3RootDir, function (e, functions) {
  console.log(functions)
})
```

### Options
Second argument
```javascript
{
  onlyComments: false // default true
}
```

### Output
Example:
```json
{
  "component_name": [
    {
      "name": "ACE_component_fnc_function",
      "text": "Entire file or only comments"
    }
  ],
  "component_name2": [
    {
      "name": "ACE_component2_fnc_function",
      "text": "Entire file or only comments"
    }
  ]
}
```

## License
ISC
