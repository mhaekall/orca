const CryptoJS = require('crypto-js');
const encryptedText = Buffer.from('{"ct":"test"}').toString('base64');
const dataStr = CryptoJS.enc.Base64.parse(encryptedText).toString(CryptoJS.enc.Utf8);
console.log(dataStr);
