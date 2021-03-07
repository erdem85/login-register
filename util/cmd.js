var colors = require('colors');

module.exports = {
  info: (message, cid) => console.log(colors.cyan('[INFO]'), message, colors.gray(`[${cid}]`)),
  error: (message, cid) => console.log(colors.red('[ERROR]'), message, colors.gray(`[${cid}]`)),
  success: (message, cid) => console.log(colors.green('[SUCCESS]'), message, colors.gray(`[${cid}]`)),
  auth: (message, cid) => console.log(colors.yellow('[AUTH]'), message, colors.gray(`[${cid}]`))
}