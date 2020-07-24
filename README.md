# Lambda XLSX function

## Export package to AWS

```
  zip function.zip index.js
  aws lambda update-function-code --function-name my-function --zip-file fileb://function.zip
```
